from __future__ import annotations

import json
from urllib.parse import urlparse

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
    monkeypatch.setenv("PAYMENT_PROVIDER", "selfwork")
    monkeypatch.setenv("SELFWORK_API_KEY", "test-key")
    monkeypatch.setenv("SELFWORK_MERCHANT_ID", "0209088")

    main.ACTIVE_TOKENS.clear()
    main.OTP_CODES.clear()
    main.NOTIFICORE_OTP_SESSIONS.clear()
    store_file.write_text(json.dumps(_make_store(), ensure_ascii=False, indent=2), encoding="utf-8")
    return TestClient(main.app)


def _csrf_headers(client: TestClient) -> dict[str, str]:
    response = client.get("/api/auth/csrf")
    assert response.status_code == 200
    token = client.cookies.get(main.CSRF_COOKIE_NAME)
    assert token
    return {"X-CSRF-Token": token}


def _auth_headers(client: TestClient, phone: str) -> dict[str, str]:
    store = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    user = next(item for item in store["users"] if str(item.get("phone")) == phone)
    store["userPinAuth"] = [
        {
            "id": f"pin-{user['id']}",
            "parentUserId": user["id"],
            "pinHash": main._hash_secret_pin("505255"),
            "pinSetAt": main._utc_now_iso(),
            "failedAttempts": 0,
            "lockedUntil": None,
            "isDisabled": False,
            "createdAt": main._utc_now_iso(),
            "updatedAt": main._utc_now_iso(),
        }
    ]
    main.DATA_FILE.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")
    verify = client.post("/api/auth/login-pin", json={"phone": phone, "pin": "505255"}, headers=_csrf_headers(client))
    assert verify.status_code == 200
    return _csrf_headers(client)


def _extract_last_path_segment(url: str) -> str:
    path = urlparse(url).path.rstrip("/")
    return path.split("/")[-1]


def test_cash_payment_creates_activation_and_pin_login(client: TestClient):
    owner_headers = _auth_headers(client, main.OWNER_PHONE)
    created = client.post(
        "/api/admin/clients",
        json={
            "parent_full_name": "Иванова Анна",
            "child_full_name": "Иванова Маша",
            "child_birth_date": "2016-05-11",
            "parent_phone": "+79991112233",
            "subscription_name": "Хобби",
            "subscription_amount": 5000,
            "payment_method": "cash",
        },
        headers=owner_headers,
    )
    assert created.status_code == 200
    client_id = created.json()["client"]["id"]

    cash = client.post(
        f"/api/admin/clients/{client_id}/cash-payment",
        json={"amount": 5000, "comment": "Оплачено наличными"},
        headers=owner_headers,
    )
    assert cash.status_code == 200
    payload = cash.json()
    assert payload["payment"]["status"] == "paid"
    assert payload["activation_url"].startswith("http://localhost:3000/activate/")

    activation_token = _extract_last_path_segment(payload["activation_url"])
    activation_info = client.get(f"/api/auth/activation/{activation_token}")
    assert activation_info.status_code == 200
    assert activation_info.json()["valid"] is True

    set_pin = client.post(
        f"/api/auth/activation/{activation_token}/set-pin",
        json={"pin": "258147", "pin_repeat": "258147"},
        headers=_csrf_headers(client),
    )
    assert set_pin.status_code == 200
    auth_payload = set_pin.json()
    assert auth_payload["role"] == "parent"

    reuse = client.get(f"/api/auth/activation/{activation_token}")
    assert reuse.status_code == 200
    assert reuse.json()["valid"] is False

    login = client.post(
        "/api/auth/login-pin",
        json={"phone": "+79991112233", "pin": "258147"},
        headers=_csrf_headers(client),
    )
    assert login.status_code == 200
    assert login.json()["role"] == "parent"


def test_public_payment_success_redirects_to_activation(client: TestClient):
    started = client.post(
        "/api/public/payment/start",
        json={
            "phone": "+79995556677",
            "parent_name": "Петрова Ольга",
            "child_name": "Петрова Лиза",
            "product_id": "hobby",
        },
        headers=_csrf_headers(client),
    )
    assert started.status_code == 200
    started_payload = started.json()
    session_token = _extract_last_path_segment(started_payload["payment_session_url"])

    session_response = client.get(f"/api/public/payment/session/{session_token}")
    assert session_response.status_code == 200
    assert session_response.json()["valid"] is True
    assert session_response.json()["payment_status"] == "pending"

    store = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    payment_id = started_payload["payment_id"]
    payment = next(item for item in store["paymentRecords"] if str(item.get("id")) == payment_id)
    payment["status"] = "paid"
    payment["paidAt"] = main._utc_now_iso()
    payment["statusUpdatedAt"] = main._utc_now_iso()
    main.DATA_FILE.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")

    success = client.get(f"/api/public/payment/success/{session_token}")
    assert success.status_code == 200
    success_payload = success.json()
    assert success_payload["status"] == "paid"
    assert success_payload["activation_url"].startswith("http://localhost:3000/activate/")

    activation_token = _extract_last_path_segment(success_payload["activation_url"])
    activation_info = client.get(f"/api/auth/activation/{activation_token}")
    assert activation_info.status_code == 200
    assert activation_info.json()["valid"] is True
