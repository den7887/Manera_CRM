"""Browser push notification plumbing: subscribe/unsubscribe endpoints, and that
creating an in-app notification (_append_notification) never breaks the calling
business action even when push isn't configured or delivery fails.
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
                "name": "Владелец",
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
        "pushSubscriptions": [],
    }


@pytest.fixture
def client(tmp_path, monkeypatch):
    store_file = tmp_path / "store.json"
    monkeypatch.setattr(main, "DATA_FILE", store_file)
    monkeypatch.setenv("TEST_MODE", "true")
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:3000")
    monkeypatch.delenv("VAPID_PUBLIC_KEY", raising=False)
    monkeypatch.delenv("VAPID_PRIVATE_KEY", raising=False)

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


def test_vapid_public_key_reports_not_configured_without_env(client: TestClient):
    response = client.get("/api/push/vapid-public-key")
    assert response.status_code == 200
    assert response.json() == {"publicKey": "", "configured": False}


def test_subscribe_requires_auth(client: TestClient):
    response = client.post(
        "/api/push/subscribe",
        json={"endpoint": "https://fcm.googleapis.com/x", "keys": {"p256dh": "a", "auth": "b"}},
    )
    assert response.status_code == 401


def test_subscribe_then_unsubscribe_round_trip(client: TestClient):
    owner, headers = _auth_client(main.OWNER_PHONE)

    subscribe = owner.post(
        "/api/push/subscribe",
        json={
            "endpoint": "https://fcm.googleapis.com/send/abc123",
            "keys": {"p256dh": "fake-p256dh-key", "auth": "fake-auth-secret"},
            "userAgent": "pytest",
        },
        headers=headers,
    )
    assert subscribe.status_code == 200, subscribe.text

    store = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    assert len(store["pushSubscriptions"]) == 1
    assert store["pushSubscriptions"][0]["userId"] == "owner-1"
    assert store["pushSubscriptions"][0]["endpoint"] == "https://fcm.googleapis.com/send/abc123"

    # Re-subscribing with the same endpoint (e.g. browser fires it again) must update, not duplicate.
    resubscribe = owner.post(
        "/api/push/subscribe",
        json={
            "endpoint": "https://fcm.googleapis.com/send/abc123",
            "keys": {"p256dh": "rotated-key", "auth": "fake-auth-secret"},
        },
        headers=headers,
    )
    assert resubscribe.status_code == 200
    store_after = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    assert len(store_after["pushSubscriptions"]) == 1
    assert store_after["pushSubscriptions"][0]["keys"]["p256dh"] == "rotated-key"

    unsubscribe = owner.post(
        "/api/push/unsubscribe",
        json={"endpoint": "https://fcm.googleapis.com/send/abc123"},
        headers=headers,
    )
    assert unsubscribe.status_code == 200
    assert unsubscribe.json()["removed"] is True
    store_final = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    assert store_final["pushSubscriptions"] == []


def test_creating_a_lead_notification_does_not_crash_without_vapid_configured(client: TestClient):
    """Landing leads notify every owner/admin via _append_notification, which now
    also tries to push. With no VAPID keys configured this must be a silent no-op,
    not a failure of the lead-creation request itself."""
    response = client.post(
        "/api/landing/leads",
        json={
            "parent_full_name": "Иванова Анна",
            "phone": "+79990001001",
            "child_full_name": "Иванова Маша",
            "child_birth_date": "11.05.2016",
            "discovery_source": "Instagram",
            "consent": True,
        },
    )
    assert response.status_code == 200, response.text

    store = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    owner_notifications = [n for n in store["notifications"] if n["userId"] == "owner-1" and n["type"] == "message" or n["type"] == "landing_lead"]
    assert any(n["type"] == "landing_lead" for n in owner_notifications)
    # No push subscription existed, so nothing should have been attempted or stored as stale.
    assert store["pushSubscriptions"] == []


def test_chat_messages_notify_the_recipient_in_both_directions(client: TestClient):
    """Before this, sending a message never created any notification at all —
    the recipient only found out by opening the Сообщения screen themselves."""
    from urllib.parse import urlparse

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
    client_id = created.json()["client"]["id"]

    link = owner.post(
        f"/api/admin/clients/{client_id}/activation-link",
        json={"purpose": "after_cash_payment"},
        headers=owner_headers,
    )
    assert link.status_code == 200, link.text
    token = urlparse(link.json()["activation_url"]).path.rstrip("/").split("/")[-1]
    parent = TestClient(main.app)
    parent_headers = _csrf_headers(parent)
    set_pin = parent.post(
        f"/api/auth/activation/{token}/set-pin",
        json={"pin": "258147", "pin_repeat": "258147"},
        headers=parent_headers,
    )
    assert set_pin.status_code == 200, set_pin.text
    parent_headers = _csrf_headers(parent)

    chat = parent.post("/api/parent/communications/chats", json={"employee_id": "owner-1"}, headers=parent_headers)
    assert chat.status_code == 200, chat.text
    chat_id = chat.json()["id"]

    parent_msg = parent.post(
        f"/api/parent/communications/chats/{chat_id}/messages",
        json={"text": "Добрый день! Как дела у Маши?"},
        headers=parent_headers,
    )
    assert parent_msg.status_code == 200, parent_msg.text

    store = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    owner_id = next(u["id"] for u in store["users"] if u["role"] == "owner")
    owner_msg_notifs = [n for n in store["notifications"] if n["userId"] == owner_id and n["type"] == "message"]
    assert len(owner_msg_notifs) == 1
    assert "Добрый день" in owner_msg_notifs[0]["message"]

    owner_reply = owner.post(
        f"/api/owner/communications/chats/{chat_id}/messages",
        json={"text": "Всё отлично, делает успехи!"},
        headers=owner_headers,
    )
    assert owner_reply.status_code == 200, owner_reply.text

    store_after = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    parent_id = next(u["id"] for u in store_after["users"] if u["phone"] == "+79998887766")
    parent_msg_notifs = [n for n in store_after["notifications"] if n["userId"] == parent_id and n["type"] == "message"]
    assert len(parent_msg_notifs) == 1
    assert "Всё отлично" in parent_msg_notifs[0]["message"]
