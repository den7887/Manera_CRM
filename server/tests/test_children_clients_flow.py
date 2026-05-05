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
        "children": [],
        "clients": [],
        "paymentRecords": [],
        "paymentJournal": [],
        "ownerGroups": [
            {
                "id": "group-1",
                "name": "Группа 1",
                "ageRange": "7-10",
                "teacherId": "",
                "teacherName": "",
                "schedule": "ПН,СР",
                "time": "18:00-19:00",
                "color": "#133C2A",
                "maxCapacity": 12,
                "studentCount": 0,
                "createdAt": now,
                "updatedAt": now,
            },
            {
                "id": "group-2",
                "name": "Группа 2",
                "ageRange": "10-13",
                "teacherId": "",
                "teacherName": "",
                "schedule": "ВТ,ЧТ",
                "time": "19:00-20:00",
                "color": "#D4AF37",
                "maxCapacity": 12,
                "studentCount": 0,
                "createdAt": now,
                "updatedAt": now,
            },
        ],
        "ownerPricingPlans": main._default_owner_pricing_plans(),
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


def test_create_client_assigns_group_and_exposes_child_row(client: TestClient):
    headers = _auth_headers(client, main.OWNER_PHONE)
    created = client.post(
        "/api/admin/clients",
        json={
            "parent_full_name": "Иванова Анна",
            "child_full_name": "Иванова Маша",
            "child_birth_date": "2016-05-11",
            "parent_phone": "+79991112233",
            "subscription_name": "Хобби",
            "subscription_amount": 5000,
            "payment_method": "online",
            "group_id": "group-1",
        },
        headers=headers,
    )
    assert created.status_code == 200

    children = client.get("/api/admin/children", headers=headers)
    assert children.status_code == 200
    rows = children.json()
    assert len(rows) == 1
    assert rows[0]["fullName"] == "Иванова Маша"
    assert rows[0]["groupId"] == "group-1"
    assert rows[0]["groupName"] == "Группа 1"
    assert rows[0]["parentPhone"] == "+79991112233"


def test_reassign_child_group_recalculates_counts(client: TestClient):
    headers = _auth_headers(client, main.OWNER_PHONE)
    created = client.post(
        "/api/admin/clients",
        json={
            "parent_full_name": "Петрова Ольга",
            "child_full_name": "Петрова Лиза",
            "child_birth_date": "2015-02-10",
            "parent_phone": "+79994445566",
            "subscription_name": "Про",
            "subscription_amount": 7000,
            "payment_method": "cash",
            "group_id": "group-1",
        },
        headers=headers,
    )
    assert created.status_code == 200
    child_id = created.json()["child"]["id"]

    reassigned = client.patch(
        f"/api/admin/children/{child_id}/group",
        json={"group_id": "group-2"},
        headers=headers,
    )
    assert reassigned.status_code == 200
    assert reassigned.json()["child"]["groupId"] == "group-2"

    groups = client.get("/api/owner/groups", headers=headers)
    assert groups.status_code == 200
    by_id = {item["id"]: item for item in groups.json()}
    assert by_id["group-1"]["studentCount"] == 0
    assert by_id["group-2"]["studentCount"] == 1

    unassigned = client.patch(
        f"/api/admin/children/{child_id}/group",
        json={"group_id": None},
        headers=headers,
    )
    assert unassigned.status_code == 200
    assert unassigned.json()["child"]["groupId"] is None

