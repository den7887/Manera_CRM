"""Paying an invoice must provision a subscription record (audit finding F-05):
before this, /api/subscriptions/my stayed empty forever regardless of how many
invoices were paid, because no code path ever wrote to store["subscriptions"].
"""
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
                "portal_status": "activated",
                "portal_activated_at": now,
                "portal_blocked_at": None,
                "updated_at": now,
            },
        ],
        "tasks": [],
        "news": [],
        "documents": [],
        "notifications": [],
        "children": [],
        "clients": [],
        "paymentRecords": [],
        "paymentJournal": [],
        "ownerGroups": [],
        "ownerPricingPlans": main._default_owner_pricing_plans(),
        "payments": [],
        "subscriptions": [],
        "subscriptionPlans": [],
    }


@pytest.fixture
def client(tmp_path, monkeypatch):
    store_file = tmp_path / "store.json"
    monkeypatch.setattr(main, "DATA_FILE", store_file)
    monkeypatch.setenv("TEST_MODE", "true")
    monkeypatch.setenv("TEST_OTP", "400001")
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:3000")

    main.ACTIVE_TOKENS.clear()
    main.OTP_CODES.clear()
    main.NOTIFICORE_OTP_SESSIONS.clear()
    store_file.write_text(json.dumps(_make_store(), ensure_ascii=False, indent=2), encoding="utf-8")
    return TestClient(main.app)


def _csrf_headers(http: TestClient) -> dict[str, str]:
    response = http.get("/api/auth/csrf")
    assert response.status_code == 200
    token = http.cookies.get(main.CSRF_COOKIE_NAME)
    assert token
    return {"X-CSRF-Token": token}


def _auth_client(phone: str, pin: str = "505255") -> tuple[TestClient, dict[str, str]]:
    store = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    user = next(item for item in store["users"] if str(item.get("phone")) == phone)
    now = main._utc_now_iso()
    records = [item for item in store.get("userPinAuth", []) if item.get("parentUserId") != user["id"]]
    records.append(
        {
            "id": f"pin-{user['id']}",
            "parentUserId": user["id"],
            "pinHash": main._hash_secret_pin(pin),
            "pinSetAt": now,
            "failedAttempts": 0,
            "lockedUntil": None,
            "isDisabled": False,
            "createdAt": now,
            "updatedAt": now,
        }
    )
    store["userPinAuth"] = records
    main.DATA_FILE.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")

    http = TestClient(main.app)
    login = http.post("/api/auth/login-pin", json={"phone": phone, "pin": pin}, headers=_csrf_headers(http))
    assert login.status_code == 200, login.text
    return http, _csrf_headers(http)


def test_cash_payment_for_class_counted_plan_creates_active_subscription(client: TestClient):
    owner, owner_headers = _auth_client(main.OWNER_PHONE)

    created = owner.post(
        "/api/admin/clients",
        json={
            "parent_full_name": "Иванова Анна",
            "child_full_name": "Иванова Маша",
            "child_birth_date": "2016-05-11",
            "parent_phone": "+79998887766",
            "subscription_name": "Хобби",
            "subscription_amount": 5000,
            "payment_method": "cash",
        },
        headers=owner_headers,
    )
    assert created.status_code == 200, created.text
    payment_id = created.json()["payment"]["id"]

    confirm = owner.post(
        f"/api/admin/payments/{payment_id}/confirm-cash",
        json={"paid_amount": 5000, "comment": "Оплачено наличными"},
        headers=owner_headers,
    )
    assert confirm.status_code == 200, confirm.text

    store = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    subs = store["subscriptions"]
    assert len(subs) == 1, "exactly one subscription should be provisioned for this payment"
    sub = subs[0]
    assert sub["status"] == "active"
    assert sub["payment_id"] == payment_id
    assert sub["total_lessons"] == 8  # Хобби is class-counted per _default_owner_pricing_plans
    assert sub["used_lessons"] == 0

    # Re-confirming the same (already-paid) payment must not create a second subscription.
    again = owner.post(
        f"/api/admin/payments/{payment_id}/confirm-cash",
        json={"paid_amount": 5000},
        headers=owner_headers,
    )
    assert again.status_code == 200
    store_after = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    assert len(store_after["subscriptions"]) == 1, "confirming an already-paid invoice must be idempotent"


def test_online_payment_for_unlimited_plan_creates_subscription_without_lesson_cap(client: TestClient):
    owner, owner_headers = _auth_client(main.OWNER_PHONE)

    created = owner.post(
        "/api/admin/clients",
        json={
            "parent_full_name": "Петрова Ольга",
            "child_full_name": "Петрова Лиза",
            "child_birth_date": "2015-02-10",
            "parent_phone": "+79997776655",
            "subscription_name": "Про",
            "subscription_amount": 7000,
            "payment_method": "online",
        },
        headers=owner_headers,
    )
    assert created.status_code == 200, created.text
    payment_id = created.json()["payment"]["id"]

    status_paid = owner.patch(
        f"/api/admin/payments/{payment_id}/status",
        json={"status": "paid", "comment": "Онлайн оплата подтверждена"},
        headers=owner_headers,
    )
    assert status_paid.status_code == 200, status_paid.text

    store = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    subs = store["subscriptions"]
    assert len(subs) == 1
    assert subs[0]["total_lessons"] is None  # Про is time-based, not class-counted

    # And the parent-facing endpoint the frontend actually reads must reflect it.
    from urllib.parse import urlparse

    link = owner.post(
        f"/api/admin/clients/{created.json()['client']['id']}/activation-link",
        json={"purpose": "after_cash_payment"},
        headers=owner_headers,
    )
    assert link.status_code == 200, link.text
    token = urlparse(link.json()["activation_url"]).path.rstrip("/").split("/")[-1]
    parent = TestClient(main.app)
    ph = _csrf_headers(parent)
    set_pin = parent.post(
        f"/api/auth/activation/{token}/set-pin",
        json={"pin": "258147", "pin_repeat": "258147"},
        headers=ph,
    )
    assert set_pin.status_code == 200, set_pin.text

    my_subscriptions = parent.get("/api/subscriptions/my", headers=_csrf_headers(parent))
    assert my_subscriptions.status_code == 200
    body = my_subscriptions.json()
    assert len(body) == 1
    assert body[0]["plan_title"] == "Про"
