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


def test_create_existing_client_with_paid_period_grants_full_access(client: TestClient):
    headers = _auth_headers(client, main.OWNER_PHONE)
    created = client.post(
        "/api/admin/clients",
        json={
            "parent_full_name": "Соколова Анна",
            "child_full_name": "Соколов Илья",
            "child_birth_date": "2015-09-01",
            "parent_phone": "+79990001122",
            "subscription_name": "Хобби",
            "subscription_amount": 5000,
            "payment_method": "online",
            "group_id": "group-2",
            "mark_as_paid": True,
            "service_start_date": "2026-05-01",
        },
        headers=headers,
    )
    assert created.status_code == 200

    payload = created.json()
    assert payload["client"]["paymentStatus"] == "paid"
    assert payload["client"]["accessLevel"] == "full"
    assert payload["client"]["accountStatus"] == "active"
    assert payload["payment"]["status"] == "paid"
    assert payload["payment"]["paymentMethod"] == "online"
    assert payload["payment"]["serviceStartDate"] == "2026-05-01"
    assert payload["payment"]["paidAt"]
    assert payload["parent"]["access_level"] == "full"
    assert payload["parent"]["account_status"] == "active"


def test_delete_landing_lead_soft_deletes_and_hides_it(client: TestClient):
    lead_response = client.post(
        "/api/landing/leads",
        json={
            "parent_full_name": "Николаева Полина",
            "phone": "+79998887766",
            "child_full_name": "Николаева Соня",
            "child_birth_date": "14.09.2017",
            "discovery_source": "Лендинг",
            "comment": "",
            "consent": True,
        },
    )
    assert lead_response.status_code == 200
    lead_id = lead_response.json()["lead"]["id"]

    headers = _auth_headers(client, main.OWNER_PHONE)
    before = client.get("/api/admin/landing-leads", headers=headers)
    assert before.status_code == 200
    assert any(item["id"] == lead_id for item in before.json())

    deleted = client.delete(f"/api/admin/landing-leads/{lead_id}", headers=headers)
    assert deleted.status_code == 200
    assert deleted.json()["ok"] is True

    after = client.get("/api/admin/landing-leads", headers=headers)
    assert all(item["id"] != lead_id for item in after.json())

    # Deleting it again (already soft-deleted) is a clean 404, not a crash.
    repeat = client.delete(f"/api/admin/landing-leads/{lead_id}", headers=headers)
    assert repeat.status_code == 404


def test_delete_child_removes_client_and_recalculates_group_counts(client: TestClient):
    headers = _auth_headers(client, main.OWNER_PHONE)
    created = client.post(
        "/api/admin/clients",
        json={
            "parent_full_name": "Кузнецова Вера",
            "child_full_name": "Кузнецова Даша",
            "child_birth_date": "2016-01-01",
            "parent_phone": "+79997778899",
            "subscription_name": "Хобби",
            "subscription_amount": 5000,
            "payment_method": "cash",
            "group_id": "group-1",
        },
        headers=headers,
    )
    assert created.status_code == 200
    child_id = created.json()["child"]["id"]

    groups_before = client.get("/api/owner/groups", headers=headers)
    assert {item["id"]: item["studentCount"] for item in groups_before.json()}["group-1"] == 1

    deleted = client.delete(f"/api/admin/children/{child_id}", headers=headers)
    assert deleted.status_code == 200
    assert deleted.json()["ok"] is True

    children = client.get("/api/admin/children", headers=headers)
    assert children.json() == []

    payments = client.get("/api/admin/payments", headers=headers)
    assert payments.json() == []

    groups_after = client.get("/api/owner/groups", headers=headers)
    assert {item["id"]: item["studentCount"] for item in groups_after.json()}["group-1"] == 0

    # Deleting an id that no longer exists is a clean 404, not a crash.
    repeat = client.delete(f"/api/admin/children/{child_id}", headers=headers)
    assert repeat.status_code == 404


def test_delete_child_blocked_when_client_has_a_paid_payment(client: TestClient):
    headers = _auth_headers(client, main.OWNER_PHONE)
    created = client.post(
        "/api/admin/clients",
        json={
            "parent_full_name": "Морозова Ирина",
            "child_full_name": "Морозов Тимофей",
            "child_birth_date": "2015-06-15",
            "parent_phone": "+79996667788",
            "subscription_name": "Хобби",
            "subscription_amount": 5000,
            "payment_method": "cash",
            "group_id": "group-1",
            "mark_as_paid": True,
        },
        headers=headers,
    )
    assert created.status_code == 200
    child_id = created.json()["child"]["id"]

    deleted = client.delete(f"/api/admin/children/{child_id}", headers=headers)
    assert deleted.status_code == 409

    # Nothing was touched by the rejected attempt.
    children = client.get("/api/admin/children", headers=headers)
    assert len(children.json()) == 1
