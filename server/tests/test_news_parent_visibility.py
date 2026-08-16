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
            {
                "id": "parent-1",
                "name": "Parent",
                "phone": "+79990001111",
                "role": "parent",
                "access_level": "full",
                "account_status": "active",
                "updated_at": now,
            },
        ],
        "tasks": [],
        "news": [],
        "documents": [],
        "notifications": [],
        "children": [],
        "events": [],
        "clients": [],
        "paymentRecords": [],
        "paymentJournal": [],
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


def _auth_client(phone: str, pin: str = "505255") -> tuple[TestClient, dict[str, str]]:
    """Return a client logged in as `phone` plus its CSRF headers.

    Sessions live in cookies, so each identity needs its own client to stay
    signed in while another role is acting.
    """
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

    client = TestClient(main.app)
    headers = _csrf_headers(client)
    login = client.post("/api/auth/login-pin", json={"phone": phone, "pin": pin}, headers=headers)
    assert login.status_code == 200, login.text
    return client, _csrf_headers(client)


def test_parent_sees_event_only_after_publish(client: TestClient):
    owner, owner_headers = _auth_client(main.OWNER_PHONE)
    parent, parent_headers = _auth_client("+79990001111")

    created = owner.post(
        "/api/news",
        json={
            "title": "Конкурс Весна",
            "content": "Описание события",
            "published": False,
            "isEvent": True,
            "eventDate": "2026-06-01T12:00:00+00:00",
            "eventLocation": "ДК Манера",
        },
        headers=owner_headers,
    )
    assert created.status_code == 200
    news_id = created.json()["id"]

    parent_news_before = parent.get("/api/news", headers=parent_headers)
    assert parent_news_before.status_code == 200
    assert all(str(item.get("id")) != news_id for item in parent_news_before.json())

    published = owner.patch(
        f"/api/news/{news_id}",
        json={"published": True},
        headers=owner_headers,
    )
    assert published.status_code == 200
    assert published.json()["published"] is True

    parent_news_after = parent.get("/api/news", headers=parent_headers)
    assert parent_news_after.status_code == 200
    assert any(str(item.get("id")) == news_id for item in parent_news_after.json())
