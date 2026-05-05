from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

import main


def _make_store() -> dict:
    now = main._utc_now_iso()
    return {
        "users": [
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
        "notifications": [],
        "landingLeads": [],
        "children": [],
        "clients": [],
        "paymentRecords": [],
        "paymentJournal": [],
        "ownerGroups": [],
        "ownerExpenses": [],
        "automationRules": [],
        "communicationChats": [],
        "communicationMessages": [],
        "activeTokens": {},
        "subscriptionPlans": [],
        "payments": [],
        "subscriptions": [],
        "ownerSettings": main._default_owner_settings(),
        "ownerLandingSettings": main._default_owner_landing_settings(),
        "ownerPricingPlans": main._default_owner_pricing_plans(),
        "paymentRefSequence": {"year": 2026, "value": 0},
        "invoiceSequence": {"year": 2026, "value": 0},
    }


@pytest.fixture
def client(tmp_path, monkeypatch):
    store_file = tmp_path / "store.json"
    monkeypatch.setattr(main, "DATA_FILE", store_file)
    monkeypatch.setenv("TEST_MODE", "true")
    monkeypatch.setenv("TEST_OTP", "400001")
    monkeypatch.setenv("PAYMENTS_MVP_ENABLED", "false")

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


def test_landing_to_online_payment_access_flow(client: TestClient):
    lead_response = client.post(
        "/api/landing/leads",
        json={
            "parent_full_name": "Иванова Анна",
            "phone": "+79998887766",
            "child_full_name": "Иванова Маша",
            "child_birth_date": "11.05.2016",
            "medical_restrictions": "Не рекомендуется высокая нагрузка на колени",
            "previous_activities": "Художественная гимнастика 1 год",
            "discovery_source": "Instagram",
            "consent": True,
        },
    )
    assert lead_response.status_code == 200

    owner_headers = _auth_headers(client, main.OWNER_PHONE)
    created = client.post(
        "/api/admin/clients",
        json={
            "parent_full_name": "Иванова Анна",
            "child_full_name": "Иванова Маша",
            "child_birth_date": "2016-05-11",
            "parent_phone": "+79998887766",
            "subscription_name": "Хобби",
            "subscription_amount": 5000,
            "payment_method": "online",
            "notes": "Тест бизнес-процесса",
        },
        headers=owner_headers,
    )
    assert created.status_code == 200
    payment_id = created.json()["payment"]["id"]

    parent_headers = _auth_headers(client, "+79998887766")
    parent_access_before = client.get("/api/parent/access", headers=parent_headers)
    assert parent_access_before.status_code == 200
    assert parent_access_before.json()["canUseDashboard"] is False

    status_paid = client.patch(
        f"/api/admin/payments/{payment_id}/status",
        json={"status": "paid", "comment": "Онлайн оплата подтверждена"},
        headers=owner_headers,
    )
    assert status_paid.status_code == 200

    parent_access_after = client.get("/api/parent/access", headers=parent_headers)
    assert parent_access_after.status_code == 200
    assert parent_access_after.json()["canUseDashboard"] is True

    owner_children = client.get("/api/admin/children", headers=owner_headers)
    assert owner_children.status_code == 200
    row = next(item for item in owner_children.json() if item["parentPhone"] == "+79998887766")
    assert row["landingLead"] is not None
    assert row["landingLead"]["discoverySource"] == "Instagram"
    assert row["profile"]["internalComment"] == "Тест бизнес-процесса"


def test_cash_payment_opens_access_after_confirm(client: TestClient):
    owner_headers = _auth_headers(client, main.OWNER_PHONE)
    created = client.post(
        "/api/admin/clients",
        json={
            "parent_full_name": "Петрова Ольга",
            "child_full_name": "Петрова Лиза",
            "child_birth_date": "2015-02-10",
            "parent_phone": "+79997776655",
            "subscription_name": "Про",
            "subscription_amount": 7000,
            "payment_method": "cash",
            "notes": "Ожидаем оплату наличными",
        },
        headers=owner_headers,
    )
    assert created.status_code == 200
    payment_id = created.json()["payment"]["id"]

    parent_headers = _auth_headers(client, "+79997776655")
    access_before = client.get("/api/parent/access", headers=parent_headers)
    assert access_before.status_code == 200
    assert access_before.json()["canUseDashboard"] is False

    confirm = client.post(
        f"/api/admin/payments/{payment_id}/confirm-cash",
        json={"paid_amount": 7000, "comment": "Наличные приняты"},
        headers=owner_headers,
    )
    assert confirm.status_code == 200

    access_after = client.get("/api/parent/access", headers=parent_headers)
    assert access_after.status_code == 200
    assert access_after.json()["canUseDashboard"] is True
