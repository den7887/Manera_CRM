"""OwnerTeamPanel's permission checkboxes used to be pure decoration -- an
employee's `permissions` list was stored but nothing on the backend ever
read it back, so any admin or teacher account could reach any admin/owner
endpoint regardless of what the owner had actually granted them. These
tests prove _require_permission actually blocks and allows based on the
real, current permissions array (not the role alone), and that the owner
role bypasses it entirely (studio owner, not a grantable-permission
employee).
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
        "tasks": [], "news": [], "documents": [], "notifications": [],
        "children": [], "clients": [], "paymentRecords": [], "paymentJournal": [],
        "ownerGroups": [], "ownerPricingPlans": main._default_owner_pricing_plans(),
        "payments": [], "subscriptions": [], "subscriptionPlans": [], "attendance": [],
    }


@pytest.fixture
def client(tmp_path, monkeypatch):
    store_file = tmp_path / "store.json"
    monkeypatch.setattr(main, "DATA_FILE", store_file)
    monkeypatch.setenv("TEST_MODE", "true")
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:3000")

    main.ACTIVE_TOKENS.clear()
    store_file.write_text(json.dumps(_make_store(), ensure_ascii=False, indent=2), encoding="utf-8")
    return TestClient(main.app)


def _csrf_headers(http: TestClient) -> dict[str, str]:
    http.get("/api/auth/csrf")
    token = http.cookies.get(main.CSRF_COOKIE_NAME)
    return {"X-CSRF-Token": token}


def _auth_client(phone: str, pin: str) -> tuple[TestClient, dict[str, str]]:
    store = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    user = next(item for item in store["users"] if str(item.get("phone")) == phone)
    now = main._utc_now_iso()
    records = [item for item in store.get("userPinAuth", []) if item.get("parentUserId") != user["id"]]
    records.append({
        "id": f"pin-{user['id']}", "parentUserId": user["id"],
        "pinHash": main._hash_secret_pin(pin), "pinSetAt": now,
        "failedAttempts": 0, "lockedUntil": None, "isDisabled": False,
        "createdAt": now, "updatedAt": now,
    })
    store["userPinAuth"] = records
    main.DATA_FILE.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")

    http = TestClient(main.app)
    login = http.post("/api/auth/login-pin", json={"phone": phone, "pin": pin}, headers=_csrf_headers(http))
    assert login.status_code == 200, login.text
    return http, _csrf_headers(http)


def _create_employee(owner: TestClient, headers: dict, role: str, phone: str, permissions: list[str]) -> str:
    resp = owner.post(
        "/api/owner/employees",
        json={
            "name": "Тест Сотрудник", "phone": phone, "role": role,
            "email": "", "status": "active", "birth_date": None,
            "experience": None, "location": None, "permissions": permissions,
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


def _activate_employee(owner: TestClient, headers: dict, phone: str, pin: str) -> None:
    resp = owner.post("/api/auth/start-pin-activation", json={"phone": phone}, headers=headers)
    assert resp.status_code == 200, resp.text
    from urllib.parse import urlparse
    token = urlparse(resp.json()["activation_url"]).path.rstrip("/").split("/")[-1]
    fresh = TestClient(main.app)
    fresh_headers = _csrf_headers(fresh)
    set_pin = fresh.post(
        f"/api/auth/activation/{token}/set-pin",
        json={"pin": pin, "pin_repeat": pin},
        headers=fresh_headers,
    )
    assert set_pin.status_code == 200, set_pin.text


def test_admin_without_permission_gets_403(client: TestClient):
    owner, owner_headers = _auth_client(main.OWNER_PHONE, "505255")
    phone = "+79990005555"
    _create_employee(owner, owner_headers, "admin", phone, permissions=["dashboard.view"])
    _activate_employee(owner, owner_headers, phone, "614523")

    admin, admin_headers = _auth_client(phone, "614523")
    resp = admin.post(
        "/api/owner/groups",
        json={"name": "Не должно создаться", "age_range": "5-7", "schedule": "Пн 18:00", "time": "18:00-19:00"},
        headers=admin_headers,
    )
    assert resp.status_code == 403


def test_admin_with_permission_succeeds(client: TestClient):
    owner, owner_headers = _auth_client(main.OWNER_PHONE, "505255")
    phone = "+79990006666"
    _create_employee(owner, owner_headers, "admin", phone, permissions=["dashboard.view", "groups.edit"])
    _activate_employee(owner, owner_headers, phone, "728193")

    admin, admin_headers = _auth_client(phone, "728193")
    resp = admin.post(
        "/api/owner/groups",
        json={"name": "Должно создаться", "age_range": "5-7", "schedule": "Пн 18:00", "time": "18:00-19:00"},
        headers=admin_headers,
    )
    assert resp.status_code == 200, resp.text


def test_teacher_with_only_attendance_permission_cannot_touch_finance(client: TestClient):
    owner, owner_headers = _auth_client(main.OWNER_PHONE, "505255")
    phone = "+79990007777"
    _create_employee(
        owner, owner_headers, "teacher", phone,
        permissions=["dashboard.view", "groups.view", "groups.attendance"],
    )
    _activate_employee(owner, owner_headers, phone, "395184")

    teacher, teacher_headers = _auth_client(phone, "395184")

    # Granted: can read the attendance day view.
    ok = teacher.get("/api/staff/attendance/day", params={"date": "2026-08-27"}, headers=teacher_headers)
    assert ok.status_code == 200, ok.text

    # Not granted: finance is completely outside this teacher's permissions.
    blocked = teacher.get("/api/admin/payments", headers=teacher_headers)
    assert blocked.status_code == 403


def test_revoking_a_permission_takes_effect_immediately(client: TestClient):
    owner, owner_headers = _auth_client(main.OWNER_PHONE, "505255")
    phone = "+79990008888"
    employee_id = _create_employee(owner, owner_headers, "admin", phone, permissions=["dashboard.view", "team.view"])
    _activate_employee(owner, owner_headers, phone, "852741")

    admin, admin_headers = _auth_client(phone, "852741")
    before = admin.get("/api/owner/employees", headers=admin_headers)
    assert before.status_code == 200, before.text

    # Owner revokes team.view for this employee.
    update = owner.patch(
        f"/api/owner/employees/{employee_id}",
        json={
            "name": "Тест Сотрудник", "phone": phone, "role": "admin",
            "email": "", "status": "active", "birth_date": None,
            "experience": None, "location": None, "permissions": ["dashboard.view"],
        },
        headers=owner_headers,
    )
    assert update.status_code == 200, update.text

    # Same already-logged-in session, no re-login -- the very next request
    # re-reads the store, so the revocation must apply immediately.
    after = admin.get("/api/owner/employees", headers=admin_headers)
    assert after.status_code == 403


def test_owner_bypasses_every_permission_check(client: TestClient):
    owner, owner_headers = _auth_client(main.OWNER_PHONE, "505255")
    # The owner account itself has no `permissions` array at all (it's not
    # an employee record) -- every gated endpoint must still work.
    resp = owner.get("/api/owner/employees", headers=owner_headers)
    assert resp.status_code == 200, resp.text
    resp2 = owner.get("/api/staff/attendance/day", params={"date": "2026-08-27"}, headers=owner_headers)
    assert resp2.status_code == 200, resp2.text
