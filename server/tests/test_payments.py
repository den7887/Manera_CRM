from __future__ import annotations

import json
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

import main

WEBHOOK_SECRET = "test-webhook-secret"
WEBHOOK_HEADERS = {"x-webhook-secret": WEBHOOK_SECRET}


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
    monkeypatch.setenv("PAYMENT_PROVIDER_WEBHOOK_SECRET", WEBHOOK_SECRET)

    main.ACTIVE_TOKENS.clear()
    main.OTP_CODES.clear()
    main.NOTIFICORE_OTP_SESSIONS.clear()
    store_file.write_text(json.dumps(_make_store(), ensure_ascii=False, indent=2), encoding="utf-8")
    return TestClient(main.app)


def _auth_headers(client: TestClient, phone: str) -> dict[str, str]:
    store = main._read_store()
    user = main._find_user_by_phone(store, phone)
    assert user is not None
    token = main._create_auth_session(store, user)
    main._write_store(store)
    client.cookies.set(main.SESSION_COOKIE_NAME, token)
    csrf_response = client.get("/api/auth/csrf")
    assert csrf_response.status_code == 200
    csrf_token = client.cookies.get(main.CSRF_COOKIE_NAME)
    assert csrf_token
    return {main.CSRF_HEADER_NAME: csrf_token}


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
    _auth_headers(client, "+79990000001")
    foreign_headers = _auth_headers(client, "+79990000002")
    owner_headers = _auth_headers(client, "+79990000001")
    payment = client.post("/api/payments/create", json={"subscription_plan_code": "pro", "child_id": None}, headers=owner_headers).json()
    payment_id = payment.get("payment_id") or payment.get("id")
    assert payment_id

    _auth_headers(client, "+79990000002")
    response = client.post(f"/api/payments/{payment_id}/confirm-user-paid", headers=foreign_headers)
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


def test_renewal_payment_extends_active_subscription_instead_of_granting_nothing(client: TestClient):
    headers = _auth_headers(client, "+79990000001")
    first_payment = client.post(
        "/api/payments/create", json={"subscription_plan_code": "hobby", "child_id": None}, headers=headers
    ).json()
    first_confirm = client.post(f"/api/payments/{first_payment['payment_id']}/confirm-user-paid", headers=headers)
    assert first_confirm.status_code == 200
    first_body = first_confirm.json()
    original_subscription_id = first_body["subscription"]["id"]
    original_expires_at = first_body["subscription"]["expires_at"]
    assert first_body["subscription"]["total_lessons"] == 8

    # The parent renews early, while the first subscription is still active
    # (no attendance consumed any lessons and nothing expired in between).
    second_payment = client.post(
        "/api/payments/create", json={"subscription_plan_code": "hobby", "child_id": None}, headers=headers
    ).json()
    second_confirm = client.post(f"/api/payments/{second_payment['payment_id']}/confirm-user-paid", headers=headers)
    assert second_confirm.status_code == 200
    second_body = second_confirm.json()

    # The renewal payment must be recorded as paid...
    assert second_body["payment"]["status"] == "paid"
    # ...and must actually grant something for the money: the *same*
    # subscription record is extended (no duplicate active subscription for
    # the same plan+child), with lesson credits topped up and expiry pushed
    # further out -- not silently reused unchanged.
    assert second_body["subscription"]["id"] == original_subscription_id
    assert second_body["subscription"]["total_lessons"] == 16
    assert second_body["subscription"]["expires_at"] > original_expires_at

    subscriptions = client.get("/api/subscriptions/my", headers=headers)
    assert subscriptions.status_code == 200
    active_subscriptions = [item for item in subscriptions.json() if item["status"] == "active"]
    assert len(active_subscriptions) == 1


def test_online_payment_is_confirmed_only_by_provider_webhook(client: TestClient, monkeypatch):
    monkeypatch.setenv("PAYMENT_METHOD", "online")
    monkeypatch.setenv("PAYMENT_PROVIDER", "internet_acquiring")
    headers = _auth_headers(client, "+79990000001")
    payment = client.post("/api/payments/create", json={"subscription_plan_code": "hobby", "child_id": None}, headers=headers).json()

    manual_confirm = client.post(f"/api/payments/{payment['payment_id']}/confirm-user-paid", headers=headers)
    assert manual_confirm.status_code == 409
    assert "automatically" in manual_confirm.json()["detail"]

    webhook = client.post(
        "/api/payments/provider/webhook",
        json={
            "payment_id": payment["payment_id"],
            "status": "paid",
            "provider_payment_id": "prov-123",
            "raw_payload": {"event": "payment.succeeded"},
        },
        headers=WEBHOOK_HEADERS,
    )
    assert webhook.status_code == 200
    body = webhook.json()
    assert body["payment"]["status"] == "paid"
    assert body["payment"]["confirmed_by"] == "provider"
    assert body["payment"]["provider_payment_id"] == "prov-123"
    assert body["subscription"]["status"] == "active"

    access = client.get("/api/parent/access", headers=headers)
    assert access.status_code == 200
    assert access.json()["canUseDashboard"] is False
    assert access.json()["portalStatus"] in {"paid_online_waiting_activation", "activation_link_created"}

    store = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    journal_entry = next(
        (item for item in store.get("paymentJournal", []) if item.get("paymentId") == payment["payment_id"]),
        None,
    )
    assert journal_entry is not None
    assert journal_entry["eventType"] == "payment.confirmed_online"
    assert journal_entry["newStatus"] == "paid"

    notification = next(
        (
            item
            for item in store.get("notifications", [])
            if str(item.get("userId")) == "parent-1"
            and str(item.get("metadata", {}).get("paymentId")) == payment["payment_id"]
            and str(item.get("metadata", {}).get("status")) == "paid"
        ),
        None,
    )
    assert notification is not None
    assert notification["title"] == "Оплата подтверждена"


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


def test_owner_can_set_service_start_date_on_invoice(client: TestClient):
    owner_headers = _auth_headers(client, main.OWNER_PHONE)
    created = _create_owner_client(client, owner_headers, phone="+79990001010", payment_method="cash")
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
            "due_date": "2026-12-31",
            "starts_at": "2026-06-01",
            "comment": "Июньский старт",
        },
        headers=owner_headers,
    )
    assert invoice.status_code == 200
    payment = invoice.json()["payment"]
    assert payment["serviceStartDate"] == "2026-06-01"


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


def test_owner_can_delete_unpaid_payment(client: TestClient):
    owner_headers = _auth_headers(client, main.OWNER_PHONE)
    created = _create_owner_client(client, owner_headers, phone="+79990001020", payment_method="online")
    payment_id = created["payment"]["id"]

    deleted = client.delete(f"/api/admin/payments/{payment_id}", headers=owner_headers)
    assert deleted.status_code == 200
    assert deleted.json()["ok"] is True

    payments = client.get("/api/admin/payments", headers=owner_headers)
    assert all(item["id"] != payment_id for item in payments.json())

    store = main._read_store()
    journal_entries = [item for item in store.get("paymentJournal", []) if str(item.get("paymentId")) == payment_id]
    assert any(str(item.get("eventType")) == "payment.deleted" for item in journal_entries)

    # Deleting an id that no longer exists is a clean 404, not a crash.
    repeat = client.delete(f"/api/admin/payments/{payment_id}", headers=owner_headers)
    assert repeat.status_code == 404


def test_owner_cannot_delete_paid_payment(client: TestClient):
    owner_headers = _auth_headers(client, main.OWNER_PHONE)
    created = _create_owner_client(client, owner_headers, phone="+79990001021", payment_method="online")
    payment_id = created["payment"]["id"]

    patch = client.patch(
        f"/api/admin/payments/{payment_id}/status",
        json={"status": "paid"},
        headers=owner_headers,
    )
    assert patch.status_code == 200

    deleted = client.delete(f"/api/admin/payments/{payment_id}", headers=owner_headers)
    assert deleted.status_code == 409

    payments = client.get("/api/admin/payments", headers=owner_headers)
    assert any(item["id"] == payment_id for item in payments.json())


def test_owner_can_switch_online_payment_to_cash_and_confirm(client: TestClient):
    owner_headers = _auth_headers(client, main.OWNER_PHONE)
    created = _create_owner_client(client, owner_headers, phone="+79990001005", payment_method="online")
    payment_id = created["payment"]["id"]

    change = client.post(
        f"/api/admin/payments/{payment_id}/change-method",
        json={
            "payment_method": "cash",
            "confirm_cash_immediately": True,
            "paid_amount": 5000,
            "comment": "Родитель оплатил наличными",
        },
        headers=owner_headers,
    )
    assert change.status_code == 200
    payment = change.json()["payment"]
    assert payment["paymentMethod"] == "cash"
    assert payment["status"] == "paid"
    assert payment["paidAt"] is not None

    store = main._read_store()
    journal_entries = [item for item in store.get("paymentJournal", []) if str(item.get("paymentId")) == payment_id]
    event_types = {str(item.get("eventType")) for item in journal_entries}
    assert "payment.method_changed" in event_types
    assert "payment.confirmed_cash" in event_types


def test_change_method_to_cash_invalidates_stale_online_link(client: TestClient, monkeypatch):
    monkeypatch.setenv("PAYMENT_METHOD", "online")
    monkeypatch.setenv("PAYMENT_PROVIDER", "selfwork")
    monkeypatch.setenv("SELFWORK_API_KEY", "test-selfwork-secret")
    owner_headers = _auth_headers(client, main.OWNER_PHONE)
    created = _create_owner_client(client, owner_headers, phone="+79990001006", payment_method="online")
    payment_id = created["payment"]["id"]

    link = client.post(
        "/api/payments/provider/create",
        json={
            "payment_id": payment_id,
            "success_url": "http://localhost:3000/?payment=success",
            "fail_url": "http://localhost:3000/?payment=fail",
        },
        headers=owner_headers,
    )
    assert link.status_code == 200
    payment_url = link.json()["payment_url"]

    still_online = client.get(payment_url)
    assert still_online.status_code == 200

    change = client.post(
        f"/api/admin/payments/{payment_id}/change-method",
        json={"payment_method": "cash", "comment": "Родитель хочет платить наличными"},
        headers=owner_headers,
    )
    assert change.status_code == 200
    payment = change.json()["payment"]
    assert payment["paymentMethod"] == "cash"
    assert payment.get("paymentUrl") is None
    assert payment.get("providerPaymentId") is None

    # The link a parent may already have (sent before the switch) must die --
    # otherwise they could still pay through it after staff started expecting
    # cash, producing a silent double payment.
    stale_link = client.get(payment_url)
    assert stale_link.status_code == 403


def test_webhook_paid_is_idempotent_for_admin_created_payment(client: TestClient):
    owner_headers = _auth_headers(client, main.OWNER_PHONE)
    created = _create_owner_client(client, owner_headers, phone="+79990001007", payment_method="online")
    payment_id = created["payment"]["id"]

    change = client.post(
        f"/api/admin/payments/{payment_id}/change-method",
        json={
            "payment_method": "cash",
            "confirm_cash_immediately": True,
            "paid_amount": 5000,
            "comment": "Родитель оплатил наличными",
        },
        headers=owner_headers,
    )
    assert change.status_code == 200
    paid_at = change.json()["payment"]["paidAt"]
    assert paid_at is not None

    store_before = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    journal_before = [item for item in store_before.get("paymentJournal", []) if str(item.get("paymentId")) == payment_id]

    # A parent who still had the old online link (from before the switch)
    # pays through it, and the provider fires its webhook for the same
    # payment_id after staff already settled it as cash in person.
    webhook = client.post(
        "/api/payments/provider/webhook",
        json={"payment_id": payment_id, "status": "paid", "provider_payment_id": "prov-stale-1"},
        headers=WEBHOOK_HEADERS,
    )
    assert webhook.status_code == 200
    body = webhook.json()
    assert body.get("idempotent") is True
    assert body["payment"]["paidAt"] == paid_at
    assert body["payment"]["paymentMethod"] == "cash"

    store_after = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    journal_after = [item for item in store_after.get("paymentJournal", []) if str(item.get("paymentId")) == payment_id]
    assert len(journal_after) == len(journal_before)


def test_webhook_paid_rejects_cancelled_payment(client: TestClient):
    owner_headers = _auth_headers(client, main.OWNER_PHONE)
    created = _create_owner_client(client, owner_headers, phone="+79990001008", payment_method="online")
    payment_id = created["payment"]["id"]

    cancel = client.patch(
        f"/api/admin/payments/{payment_id}/status",
        json={"status": "cancelled", "comment": "Клиент отказался"},
        headers=owner_headers,
    )
    assert cancel.status_code == 200
    assert cancel.json()["payment"]["status"] == "cancelled"

    webhook = client.post(
        "/api/payments/provider/webhook",
        json={"payment_id": payment_id, "status": "paid", "provider_payment_id": "prov-late-1"},
        headers=WEBHOOK_HEADERS,
    )
    assert webhook.status_code == 409


def test_selfwork_provider_create_returns_local_form(client: TestClient, monkeypatch):
    monkeypatch.setenv("PAYMENT_METHOD", "online")
    monkeypatch.setenv("PAYMENT_PROVIDER", "selfwork")
    monkeypatch.setenv("SELFWORK_API_KEY", "test-selfwork-secret")
    headers = _auth_headers(client, "+79990000001")
    payment = client.post("/api/payments/create", json={"subscription_plan_code": "hobby", "child_id": None}, headers=headers).json()
    payment_id = payment.get("payment_id") or payment.get("id")
    assert payment_id

    created = client.post(
        "/api/payments/provider/create",
        json={
            "payment_id": payment_id,
            "success_url": "http://localhost:3000/?payment=success",
            "fail_url": "http://localhost:3000/?payment=fail",
        },
        headers=headers,
    )
    assert created.status_code == 200
    payload = created.json()
    assert payload["payment_url"].startswith(f"http://testserver/api/payments/provider/selfwork/form/{payment['payment_id']}?token=")
    assert payload["provider_payment_id"] == payment["payment_reference"]

    form_response = client.get(payload["payment_url"])
    assert form_response.status_code == 200
    assert "https://pro.selfwork.ru/merchant/v1/init" in form_response.text
    assert 'name="order_id"' in form_response.text
    assert payment["payment_reference"] in form_response.text
    assert "manera_pending_provider_payment_id" in form_response.text

    # Regression: this page used to unconditionally auto-submit its redirect
    # form on every load. If the browser restored it from history/bfcache
    # after the user already went to Selfwork once (closing that tab, or
    # pressing back), the script re-ran and silently bounced them back to
    # Selfwork again. A sessionStorage guard must gate the auto-submit so it
    # only fires once per payment attempt.
    assert "sessionStorage" in form_response.text
    assert f"manera_selfwork_autosubmitted_{payment_id}" in form_response.text


def test_selfwork_status_sync_marks_parent_payment_paid(client: TestClient, monkeypatch):
    monkeypatch.setenv("PAYMENT_METHOD", "online")
    monkeypatch.setenv("PAYMENT_PROVIDER", "selfwork")
    monkeypatch.setenv("SELFWORK_API_KEY", "test-selfwork-secret")
    monkeypatch.setenv("SELFWORK_MERCHANT_ID", "merchant-1")
    headers = _auth_headers(client, "+79990000001")
    payment = client.post("/api/payments/create", json={"subscription_plan_code": "hobby", "child_id": None}, headers=headers).json()

    class _FakeResponse:
        def __init__(self, body: str):
            self._body = body.encode("utf-8")

        def read(self) -> bytes:
            return self._body

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    def _fake_urlopen(request, timeout=10):
        assert timeout == 10
        assert request.full_url.startswith("https://pro.selfwork.ru/merchant/v1/status?")
        return _FakeResponse(
            json.dumps(
                {
                    "order_id": payment["payment_reference"],
                    "status": "succeeded",
                    "amount": 500000,
                    "currency": "RUB",
                }
            )
        )

    monkeypatch.setattr(main, "urlopen", _fake_urlopen)

    sync = client.post(
        "/api/payments/provider/status-sync",
        json={"payment_id": payment["payment_id"]},
        headers=headers,
    )
    assert sync.status_code == 200
    body = sync.json()
    assert body["provider_status"] == "succeeded"
    assert body["synced"] is True
    assert body["result"]["payment"]["status"] == "paid"

    access = client.get("/api/parent/access", headers=headers)
    assert access.status_code == 200
    assert access.json()["canUseDashboard"] is False
    assert access.json()["portalStatus"] in {"paid_online_waiting_activation", "activation_link_created"}
