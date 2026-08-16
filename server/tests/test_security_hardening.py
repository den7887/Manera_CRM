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
                "id": "parent-1",
                "name": "Родитель Один",
                "phone": "+79990000001",
                "role": "parent",
                "access_level": "full",
                "account_status": "active",
                "portal_status": "activated",
                "portal_activated_at": now,
                "portal_blocked_at": None,
                "updated_at": now,
            },
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
        "userPinAuth": [
            {
                "id": "pin-parent-1",
                "parentUserId": "parent-1",
                "pinHash": main._hash_secret_pin("258147"),
                "pinSetAt": now,
                "failedAttempts": 0,
                "lockedUntil": None,
                "isDisabled": False,
                "createdAt": now,
                "updatedAt": now,
            }
        ],
        "tasks": [],
        "news": [],
        "documents": [],
        "notifications": [],
        "children": [],
        "clients": [],
        "paymentRecords": [],
        "paymentJournal": [],
        "subscriptionPlans": [],
        "payments": [],
        "subscriptions": [],
        "paymentRefSequence": {"year": 2026, "value": 0},
        "ownerPricingPlans": main._default_owner_pricing_plans(),
    }


@pytest.fixture
def client(tmp_path, monkeypatch):
    store_file = tmp_path / "store.json"
    monkeypatch.setattr(main, "DATA_FILE", store_file)
    monkeypatch.setenv("FRONTEND_BASE_URL", "https://maneradancestudio.ru")
    monkeypatch.setenv("PAYMENT_PROVIDER", "selfwork")
    monkeypatch.setenv("SELFWORK_API_KEY", "test-key")
    monkeypatch.setenv("SELFWORK_MERCHANT_ID", "0209088")
    monkeypatch.setenv("LOGIN_RATE_LIMIT_MAX_REQUESTS", "10")
    monkeypatch.setenv("PAYMENT_START_RATE_LIMIT_MAX_REQUESTS", "5")
    monkeypatch.setenv("RATE_LIMIT_WINDOW_MS", "60000")
    main.ACTIVE_TOKENS.clear()
    main.RATE_LIMIT_BUCKETS.clear()
    store_file.write_text(json.dumps(_make_store(), ensure_ascii=False, indent=2), encoding="utf-8")
    return TestClient(main.app, base_url="https://testserver")


def _csrf_headers(client: TestClient) -> dict[str, str]:
    response = client.get("/api/auth/csrf")
    assert response.status_code == 200
    token = client.cookies.get(main.CSRF_COOKIE_NAME)
    assert token
    return {"X-CSRF-Token": token}


def _login_headers(client: TestClient, phone: str = "+79990000001", pin: str = "258147") -> dict[str, str]:
    response = client.post("/api/auth/login-pin", json={"phone": phone, "pin": pin}, headers=_csrf_headers(client))
    assert response.status_code == 200
    assert client.cookies.get(main.SESSION_COOKIE_NAME)
    return _csrf_headers(client)


def test_auth_session_token_is_stored_hashed(client: TestClient):
    response = client.post(
        "/api/auth/login-pin",
        json={"phone": "+79990000001", "pin": "258147"},
        headers=_csrf_headers(client),
    )
    assert response.status_code == 200
    token = client.cookies.get(main.SESSION_COOKIE_NAME)
    assert token
    assert "httponly" in response.headers.get("set-cookie", "").lower()

    store = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    assert token not in store.get("activeTokens", {})
    assert main._hash_auth_token(token) in store.get("activeTokens", {})


def test_login_pin_rejects_missing_csrf(client: TestClient):
    response = client.post("/api/auth/login-pin", json={"phone": "+79990000001", "pin": "258147"})
    assert response.status_code == 403
    assert "CSRF" in response.json()["detail"]


def test_logout_accepts_cookie_session_with_csrf(client: TestClient):
    login = client.post(
        "/api/auth/login-pin",
        json={"phone": "+79990000001", "pin": "258147"},
        headers=_csrf_headers(client),
    )
    assert login.status_code == 200

    logout = client.post("/api/auth/logout", headers=_csrf_headers(client))
    assert logout.status_code == 200
    assert logout.json()["ok"] is True


def test_provider_create_rejects_foreign_redirect_origin(client: TestClient):
    headers = _login_headers(client)
    store = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    payment_id = "legacy-payment-1"
    store.setdefault("paymentRecords", []).append(
        {
            "id": payment_id,
            "parentUserId": "parent-1",
            "amount": 5000,
            "status": "pending",
            "subscriptionName": "Хобби",
            "createdAt": main._utc_now_iso(),
            "updatedAt": main._utc_now_iso(),
        }
    )
    main.DATA_FILE.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")

    response = client.post(
        "/api/payments/provider/create",
        json={
            "payment_id": payment_id,
            "success_url": "https://evil.example/success",
            "fail_url": "https://maneradancestudio.ru/pay/fail",
        },
        headers=headers,
    )
    assert response.status_code == 400
    assert "URL возврата" in response.json()["detail"]


def test_provider_create_rejects_foreign_payment(client: TestClient):
    """A signed-in parent must not be able to act on another family's invoice."""
    headers = _login_headers(client)
    store = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    foreign_payment_id = "payment-owned-by-someone-else"
    store.setdefault("paymentRecords", []).append(
        {
            "id": foreign_payment_id,
            "parentUserId": "parent-2",
            "amount": 5000,
            "status": "pending",
            "subscriptionName": "Хобби",
            "createdAt": main._utc_now_iso(),
            "updatedAt": main._utc_now_iso(),
        }
    )
    main.DATA_FILE.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")

    response = client.post(
        "/api/payments/provider/create",
        json={
            "payment_id": foreign_payment_id,
            "success_url": "https://maneradancestudio.ru/pay/success",
            "fail_url": "https://maneradancestudio.ru/pay/fail",
        },
        headers=headers,
    )
    # 404 rather than 403 so foreign payment ids cannot be probed.
    assert response.status_code == 404

    # The foreign record must be left untouched.
    store_after = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    foreign = next(item for item in store_after["paymentRecords"] if item["id"] == foreign_payment_id)
    assert "paymentUrl" not in foreign
    assert foreign["status"] == "pending"


def test_provider_webhook_requires_secret_when_configured(client: TestClient, monkeypatch):
    monkeypatch.setenv("PAYMENT_PROVIDER_WEBHOOK_SECRET", "super-secret")

    unauthorized = client.post(
        "/api/payments/provider/webhook",
        json={"payment_id": "missing", "status": "paid"},
    )
    assert unauthorized.status_code == 401

    authorized = client.post(
        "/api/payments/provider/webhook",
        json={"payment_id": "missing", "status": "paid"},
        headers={"X-Webhook-Secret": "super-secret"},
    )
    assert authorized.status_code == 404


def test_public_payment_start_rate_limited(client: TestClient, monkeypatch):
    monkeypatch.setenv("PAYMENT_START_RATE_LIMIT_MAX_REQUESTS", "1")
    main.RATE_LIMIT_BUCKETS.clear()

    first = client.post(
        "/api/public/payment/start",
        json={"phone": "+79995556677", "parent_name": "Тест", "child_name": "Ребёнок", "product_id": "hobby"},
        headers=_csrf_headers(client),
    )
    assert first.status_code == 200

    second = client.post(
        "/api/public/payment/start",
        json={"phone": "+79995556677", "parent_name": "Тест", "child_name": "Ребёнок", "product_id": "hobby"},
        headers=_csrf_headers(client),
    )
    assert second.status_code == 429
