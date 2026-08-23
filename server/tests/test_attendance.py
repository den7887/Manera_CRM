"""New attendance module: date -> group picker, per-student marking, and its
effect on a subscription's remaining-lesson count. Хобби-style plans
(classesTracked, a fixed lesson count) only spend a lesson on an actual
"present" mark -- a no-show costs nothing, and correcting a mistaken mark
gives the lesson back. Про-style plans (untracked, monthly) never spend a
lesson at all; attendance there is just a journal entry.
"""
from __future__ import annotations

import json
from datetime import date, timedelta

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


def _auth_client(phone: str, pin: str = "505255") -> tuple[TestClient, dict[str, str]]:
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


WEEKDAY_ALIASES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]


def _next_date_for_weekday(weekday: int) -> str:
    today = date.today()
    delta = (weekday - today.weekday()) % 7
    return (today + timedelta(days=delta)).isoformat()


def _create_group(owner: TestClient, headers: dict, weekday: int) -> str:
    resp = owner.post(
        "/api/owner/groups",
        json={"name": "Тестовая группа", "age_range": "5-7", "schedule": f"{WEEKDAY_ALIASES[weekday]} 18:00-19:00", "time": "18:00-19:00"},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


def _create_client_in_group(
    owner: TestClient, headers: dict, group_id: str, phone: str, plan_name: str, amount: float,
) -> tuple[str, str]:
    """Returns (child_id, client_id)."""
    created = owner.post(
        "/api/admin/clients",
        json={
            "parent_full_name": "Родитель Тестов",
            "child_full_name": "Ребёнок Тестов",
            "child_birth_date": "2017-01-01",
            "parent_phone": phone,
            "subscription_name": plan_name,
            "subscription_amount": amount,
            "payment_method": "cash",
        },
        headers=headers,
    )
    assert created.status_code == 200, created.text
    child_id = created.json()["child"]["id"]
    client_id = created.json()["client"]["id"]
    payment_id = created.json()["payment"]["id"]

    confirm = owner.post(f"/api/admin/payments/{payment_id}/confirm-cash", json={"paid_amount": amount}, headers=headers)
    assert confirm.status_code == 200, confirm.text

    assign = owner.patch(f"/api/admin/children/{child_id}/group", json={"group_id": group_id}, headers=headers)
    assert assign.status_code == 200, assign.text

    return child_id, client_id


def test_day_endpoint_lists_only_groups_meeting_that_weekday(client: TestClient):
    owner, headers = _auth_client(main.OWNER_PHONE)
    monday_group = _create_group(owner, headers, weekday=0)
    _create_group(owner, headers, weekday=2)  # Wednesday -- should not show up on a Monday query

    monday_date = _next_date_for_weekday(0)
    resp = owner.get("/api/staff/attendance/day", params={"date": monday_date}, headers=headers)
    assert resp.status_code == 200, resp.text
    ids = [row["groupId"] for row in resp.json()]
    assert monday_group in ids
    assert len(resp.json()) == 1


def test_hobby_plan_present_spends_a_lesson_absent_does_not(client: TestClient):
    owner, headers = _auth_client(main.OWNER_PHONE)
    group_id = _create_group(owner, headers, weekday=0)
    child_id, client_id = _create_client_in_group(owner, headers, group_id, "+79990001111", "Хобби", 5000)
    monday_date = _next_date_for_weekday(0)

    roster = owner.get(f"/api/staff/attendance/group/{group_id}", params={"date": monday_date}, headers=headers)
    assert roster.status_code == 200, roster.text
    student = next(s for s in roster.json()["students"] if s["childId"] == child_id)
    assert student["status"] is None
    assert student["remainingClasses"] == 8
    assert student["attendanceStatusColor"] == "green"

    mark_present = owner.post(
        "/api/staff/attendance/mark",
        json={"group_id": group_id, "child_id": child_id, "date": monday_date, "status": "present"},
        headers=headers,
    )
    assert mark_present.status_code == 200, mark_present.text
    assert mark_present.json()["remainingClasses"] == 7

    # Marking present again on the same day must not double-spend a lesson.
    mark_present_again = owner.post(
        "/api/staff/attendance/mark",
        json={"group_id": group_id, "child_id": child_id, "date": monday_date, "status": "present"},
        headers=headers,
    )
    assert mark_present_again.json()["remainingClasses"] == 7

    # Correcting present -> absent must give the lesson back (a no-show costs nothing).
    mark_absent = owner.post(
        "/api/staff/attendance/mark",
        json={"group_id": group_id, "child_id": child_id, "date": monday_date, "status": "absent"},
        headers=headers,
    )
    assert mark_absent.status_code == 200, mark_absent.text
    assert mark_absent.json()["remainingClasses"] == 8

    # Un-marking a plain absence is a no-op on the lesson count (nothing was spent).
    unmark = owner.post(
        "/api/staff/attendance/mark",
        json={"group_id": group_id, "child_id": child_id, "date": monday_date, "status": "unmarked"},
        headers=headers,
    )
    assert unmark.status_code == 200, unmark.text
    assert unmark.json()["status"] is None
    assert unmark.json()["remainingClasses"] == 8


def test_pro_plan_attendance_never_touches_a_lesson_count(client: TestClient):
    owner, headers = _auth_client(main.OWNER_PHONE)
    group_id = _create_group(owner, headers, weekday=1)
    child_id, client_id = _create_client_in_group(owner, headers, group_id, "+79990002222", "Про", 7000)
    tuesday_date = _next_date_for_weekday(1)

    roster = owner.get(f"/api/staff/attendance/group/{group_id}", params={"date": tuesday_date}, headers=headers)
    student = next(s for s in roster.json()["students"] if s["childId"] == child_id)
    assert student["remainingClasses"] is None  # untracked -- no lesson count at all
    assert student["attendanceStatusColor"] == "green"  # a fresh 30-day subscription has plenty of runway

    mark_present = owner.post(
        "/api/staff/attendance/mark",
        json={"group_id": group_id, "child_id": child_id, "date": tuesday_date, "status": "present"},
        headers=headers,
    )
    assert mark_present.status_code == 200, mark_present.text
    assert mark_present.json()["remainingClasses"] is None

    store = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    subscription = next(s for s in store["subscriptions"] if s["client_id"] == client_id)
    assert subscription["used_lessons"] == 0
    assert subscription["total_lessons"] is None

    attendance_rows = [a for a in store["attendance"] if a["childId"] == child_id]
    assert len(attendance_rows) == 1
    assert attendance_rows[0]["status"] == "present"


def test_attendance_endpoints_reject_parent_role(client: TestClient):
    owner, owner_headers = _auth_client(main.OWNER_PHONE)
    group_id = _create_group(owner, owner_headers, weekday=0)
    _, client_id = _create_client_in_group(owner, owner_headers, group_id, "+79990003333", "Хобби", 5000)

    from urllib.parse import urlparse
    link = owner.post(f"/api/admin/clients/{client_id}/activation-link", json={"purpose": "after_cash_payment"}, headers=owner_headers)
    assert link.status_code == 200, link.text
    token = urlparse(link.json()["activation_url"]).path.rstrip("/").split("/")[-1]
    parent = TestClient(main.app)
    ph = _csrf_headers(parent)
    set_pin = parent.post(f"/api/auth/activation/{token}/set-pin", json={"pin": "936275", "pin_repeat": "936275"}, headers=ph)
    assert set_pin.status_code == 200, set_pin.text

    ph = _csrf_headers(parent)
    resp = parent.get("/api/staff/attendance/day", params={"date": date.today().isoformat()}, headers=ph)
    assert resp.status_code == 403


def test_low_remaining_lessons_turns_the_badge_yellow_then_red(client: TestClient):
    owner, headers = _auth_client(main.OWNER_PHONE)
    group_id = _create_group(owner, headers, weekday=3)
    child_id, client_id = _create_client_in_group(owner, headers, group_id, "+79990004444", "Хобби", 5000)
    thursday_date = _next_date_for_weekday(3)

    for offset in range(6):
        day = (date.fromisoformat(thursday_date) + timedelta(days=7 * offset)).isoformat()
        mark = owner.post(
            "/api/staff/attendance/mark",
            json={"group_id": group_id, "child_id": child_id, "date": day, "status": "present"},
            headers=headers,
        )
        assert mark.status_code == 200, mark.text

    store = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    subscription = next(s for s in store["subscriptions"] if s["client_id"] == client_id)
    assert subscription["used_lessons"] == 6  # 2 remaining -> yellow threshold

    roster = owner.get(f"/api/staff/attendance/group/{group_id}", params={"date": thursday_date}, headers=headers)
    student = next(s for s in roster.json()["students"] if s["childId"] == child_id)
    assert student["remainingClasses"] == 2
    assert student["attendanceStatusColor"] == "yellow"

    # Spend the last two -> exhausted -> red.
    for offset in range(6, 8):
        day = (date.fromisoformat(thursday_date) + timedelta(days=7 * offset)).isoformat()
        owner.post(
            "/api/staff/attendance/mark",
            json={"group_id": group_id, "child_id": child_id, "date": day, "status": "present"},
            headers=headers,
        )

    roster_after = owner.get(f"/api/staff/attendance/group/{group_id}", params={"date": thursday_date}, headers=headers)
    student_after = next(s for s in roster_after.json()["students"] if s["childId"] == child_id)
    assert student_after["remainingClasses"] == 0
    assert student_after["attendanceStatusColor"] == "red"
