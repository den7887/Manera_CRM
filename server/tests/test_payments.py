from __future__ import annotations

import json
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

import main


def _make_store() -> dict:
    now = main._utc_now_iso()
    return {
        "users": [
            {
                "id": "parent-1",
                "name": "Родитель Один",
                "phone": "+79990000001",
                "role": "parent",
                "access_level": "payment_only",
                "account_status": "payment_pending",
                "updated_at": now,
            },
            {
                "id": "parent-2",
                "name": "Родитель Два",
                "phone": "+79990000002",
                "role": "parent",
                "access_level": "payment_only",
                "account_status": "payment_pending",
                "updated_at": now,
            },
            {
                "id": "owner-1",
                "name": "Owner",
                "phone": main.OWNER_PHONE,
                "role": "owner",
                "access_level": "full",
                "account_status": "active",
                "updated_at": now,
            },
        ],
        "tasks": [],
        "news": [],
        "documents": [],
        "children": [],
        "clients": [],
        "paymentRecords": [],
        "paymentJournal": [],
        "subscriptionPlans": [],
        "payments": [],
        "subscriptions": [],
        "paymentRefSequence": {"year": 2026, "value": 0},
    }


@pytest.fixture
def client(tmp_path, monkeypatch):
    store_file = tmp_path / "store.json"
    monkeypatch.setattr(main, "DATA_FILE", store_file)
    monkeypatch.setenv("TEST_MODE", "true")
    monkeypatch.setenv("TEST_OTP", "400001")
    monkeypatch.setenv("MANUAL_SBP_PAYMENT_URL", "https://sbp.local/pay")
    monkeypatch.setenv("MANUAL_SBP_RECEIVER_NAME", "ИП Манера")
    monkeypatch.setenv("MANUAL_SBP_RECEIVER_PHONE", "+79990001122")
    monkeypatch.setenv("PAYMENTS_AUTO_ACTIVATE_ON_USER_CONFIRM", "true")
    monkeypatch.setenv("PAYMENTS_MVP_ENABLED", "true")

    main.ACTIVE_TOKENS.clear()
    main.OTP_CODES.clear()
    main.NOTIFICORE_OTP_SESSIONS.clear()
    store_file.write_text(json.dumps(_make_store(), ensure_ascii=False, indent=2), encoding="utf-8")
    return TestClient(main.app)


def _auth_headers(client: TestClient, phone: str) -> dict[str, str]:
    start = client.post("/api/auth/otp/start", json={"phone": phone})
    assert start.status_code == 200
    verify = client.post("/api/auth/otp/verify", json={"phone": phone, "code": "400001"})
    assert verify.status_code == 200
    token = verify.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_owner_client(
    client: TestClient,
    headers: dict[str, str],
    *,
    phone: str = "+79990001000",
    payment_method: str = "online",
) -> dict:
    response = client.post(
        "/api/admin/clients",
        json={
            "parent_full_name": "Тест Родитель",
            "child_full_name": "Тест Ребенок",
            "child_birth_date": "2015-01-01",
            "parent_phone": phone,
            "subscription_name": "Хобби",
            "subscription_amount": 5000,
            "payment_method": payment_method,
            "notes": "",
        },
        headers=headers,
    )
    assert response.status_code == 200
    return response.json()


def test_create_payment_uses_plan_amount(client: TestClient):
    headers = _auth_headers(client, "+79990000001")
    response = client.post("/api/payments/create", json={"subscription_plan_code": "hobby", "child_id": None}, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["amount"] == 5000
    assert body["status"] == "pending"
    assert body["payment_reference"].startswith("MN-")


def test_payment_reference_unique(client: TestClient):
    headers = _auth_headers(client, "+79990000001")
    first = client.post("/api/payments/create", json={"subscription_plan_code": "hobby", "child_id": None}, headers=headers).json()
    second = client.post("/api/payments/create", json={"subscription_plan_code": "hobby", "child_id": None}, headers=headers).json()
    assert first["payment_reference"] != second["payment_reference"]


def test_cannot_confirm_foreign_payment(client: TestClient):
    owner_headers = _auth_headers(client, "+79990000001")
    foreign_headers = _auth_headers(client, "+79990000002")
    payment = client.post("/api/payments/create", json={"subscription_plan_code": "pro", "child_id": None}, headers=owner_headers).json()

    response = client.post(f"/api/payments/{payment['payment_id']}/confirm-user-paid", headers=foreign_headers)
    assert response.status_code == 403


def test_confirm_user_paid_moves_to_paid_and_creates_subscription(client: TestClient):
    headers = _auth_headers(client, "+79990000001")
    payment = client.post("/api/payments/create", json={"subscription_plan_code": "hobby", "child_id": None}, headers=headers).json()

    confirmed = client.post(f"/api/payments/{payment['payment_id']}/confirm-user-paid", headers=headers)
    assert confirmed.status_code == 200
    body = confirmed.json()
    assert body["payment"]["status"] == "paid"
    assert body["payment"]["confirmed_by"] == "user"
    assert body["subscription"]["status"] == "active"
    assert body["subscription"]["total_lessons"] == 8


def test_confirm_idempotent_no_duplicate_subscription(client: TestClient):
    headers = _auth_headers(client, "+79990000001")
    payment = client.post("/api/payments/create", json={"subscription_plan_code": "hobby", "child_id": None}, headers=headers).json()

    first = client.post(f"/api/payments/{payment['payment_id']}/confirm-user-paid", headers=headers)
    assert first.status_code == 200
    second = client.post(f"/api/payments/{payment['payment_id']}/confirm-user-paid", headers=headers)
    assert second.status_code == 200
    assert second.json().get("idempotent") is True

    subscriptions = client.get("/api/subscriptions/my", headers=headers)
    assert subscriptions.status_code == 200
    assert len(subscriptions.json()) == 1


def test_owner_can_create_invoice_after_paid_cycle(client: TestClient):
    owner_headers = _auth_headers(client, main.OWNER_PHONE)
    created = _create_owner_client(client, owner_headers, payment_method="cash")
    base_payment_id = created["payment"]["id"]
    confirm = client.post(
        f"/api/admin/payments/{base_payment_id}/confirm-cash",
        json={"paid_amount": 5000, "comment": "Оплачено"},
        headers=owner_headers,
    )
    assert confirm.status_code == 200

    invoice = client.post(
        "/api/admin/payments/invoices",
        json={
            "client_id": created["client"]["id"],
            "payment_method": "online",
            "due_date": "2026-12-31",
            "comment": "Новый период",
        },
        headers=owner_headers,
    )
    assert invoice.status_code == 200
    body = invoice.json()["payment"]
    assert body["status"] == "pending"
    assert body["invoiceNumber"].startswith("INV-")
    assert body["dueDate"] == "2026-12-31"


def test_owner_send_reminder_updates_payment_fields(client: TestClient):
    owner_headers = _auth_headers(client, main.OWNER_PHONE)
    created = _create_owner_client(client, owner_headers, phone="+79990001001", payment_method="online")
    payment_id = created["payment"]["id"]

    reminder = client.post(
        f"/api/admin/payments/{payment_id}/send-reminder",
        json={"message": "Пожалуйста, оплатите сегодня"},
        headers=owner_headers,
    )
    assert reminder.status_code == 200
    payment = reminder.json()["payment"]
    assert payment["reminderCount"] == 1
    assert payment["lastReminderAt"] is not None
    assert payment["reminderComment"] == "Пожалуйста, оплатите сегодня"


def test_owner_cannot_set_paid_payment_to_failed_via_status_patch(client: TestClient):
    owner_headers = _auth_headers(client, main.OWNER_PHONE)
    created = _create_owner_client(client, owner_headers, phone="+79990001002", payment_method="cash")
    payment_id = created["payment"]["id"]
    confirm = client.post(
        f"/api/admin/payments/{payment_id}/confirm-cash",
        json={"paid_amount": 5000},
        headers=owner_headers,
    )
    assert confirm.status_code == 200

    patch = client.patch(
        f"/api/admin/payments/{payment_id}/status",
        json={"status": "failed"},
        headers=owner_headers,
    )
    assert patch.status_code == 409


def test_owner_run_reminders_processes_open_payments(client: TestClient):
    owner_headers = _auth_headers(client, main.OWNER_PHONE)
    created = _create_owner_client(client, owner_headers, phone="+79990001003", payment_method="cash")
    confirm = client.post(
        f"/api/admin/payments/{created['payment']['id']}/confirm-cash",
        json={"paid_amount": 5000},
        headers=owner_headers,
    )
    assert confirm.status_code == 200
    invoice = client.post(
        "/api/admin/payments/invoices",
        json={
            "client_id": created["client"]["id"],
            "payment_method": "online",
            "due_date": datetime.now(timezone.utc).date().isoformat(),
        },
        headers=owner_headers,
    )
    assert invoice.status_code == 200
    payment_id = invoice.json()["payment"]["id"]

    run = client.post("/api/admin/payments/reminders/run", headers=owner_headers)
    assert run.status_code == 200
    payload = run.json()
    assert payload["processed"] >= 1
    processed_ids = {item["id"] for item in payload["payments"]}
    assert payment_id in processed_ids


def test_owner_can_mark_pending_payment_as_paid(client: TestClient):
    owner_headers = _auth_headers(client, main.OWNER_PHONE)
    created = _create_owner_client(client, owner_headers, phone="+79990001004", payment_method="online")
    payment_id = created["payment"]["id"]

    patch = client.patch(
        f"/api/admin/payments/{payment_id}/status",
        json={"status": "paid", "comment": "Ручная сверка"},
        headers=owner_headers,
    )
    assert patch.status_code == 200
    payment = patch.json()["payment"]
    assert payment["status"] == "paid"
    assert payment["paidAt"] is not None
