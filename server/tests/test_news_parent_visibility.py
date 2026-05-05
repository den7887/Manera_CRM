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


def _auth_headers(client: TestClient, phone: str) -> dict[str, str]:
    start = client.post("/api/auth/otp/start", json={"phone": phone})
    assert start.status_code == 200
    verify = client.post("/api/auth/otp/verify", json={"phone": phone, "code": "400001"})
    assert verify.status_code == 200
    token = verify.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_parent_sees_event_only_after_publish(client: TestClient):
    owner_headers = _auth_headers(client, main.OWNER_PHONE)
    parent_headers = _auth_headers(client, "+79990001111")

    created = client.post(
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

    parent_news_before = client.get("/api/news", headers=parent_headers)
    assert parent_news_before.status_code == 200
    assert all(str(item.get("id")) != news_id for item in parent_news_before.json())

    published = client.patch(
        f"/api/news/{news_id}",
        json={"published": True},
        headers=owner_headers,
    )
    assert published.status_code == 200
    assert published.json()["published"] is True

    parent_news_after = client.get("/api/news", headers=parent_headers)
    assert parent_news_after.status_code == 200
    assert any(str(item.get("id")) == news_id for item in parent_news_after.json())
