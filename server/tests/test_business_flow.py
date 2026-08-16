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
                "updated_at": now,
            },
        ],
        "tasks": [],
        "news": [],
        "documents": [],
        "notifications": [],
        "landingLeads": [],
        "children": [],
        "clients": [],
        "paymentRecords": [],
        "paymentJournal": [],
        "ownerGroups": [],
        "ownerExpenses": [],
        "automationRules": [],
        "communicationChats": [],
        "communicationMessages": [],
        "activeTokens": {},
        "subscriptionPlans": [],
        "payments": [],
        "subscriptions": [],
        "ownerSettings": main._default_owner_settings(),
        "ownerLandingSettings": main._default_owner_landing_settings(),
        "ownerPricingPlans": main._default_owner_pricing_plans(),
        "paymentRefSequence": {"year": 2026, "value": 0},
        "invoiceSequence": {"year": 2026, "value": 0},
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


def _csrf_headers(http: TestClient) -> dict[str, str]:
    response = http.get("/api/auth/csrf")
    assert response.status_code == 200
    token = http.cookies.get(main.CSRF_COOKIE_NAME)
    assert token
    return {"X-CSRF-Token": token}


def _seed_pin_and_login(phone: str, pin: str = "505255"):
    """Give `phone` a known PIN and attempt a login, returning the client and raw response."""
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
    return http, login


def _auth_client(phone: str, pin: str = "505255") -> tuple[TestClient, dict[str, str]]:
    """Return a client logged in as `phone` plus its CSRF headers.

    Sessions live in cookies, so each identity needs its own client to stay
    signed in while another role is acting.
    """
    http, login = _seed_pin_and_login(phone, pin)
    assert login.status_code == 200, login.text
    return http, _csrf_headers(http)


def _activate_parent_client(
    owner: TestClient,
    owner_headers: dict[str, str],
    client_id: str,
    pin: str = "505255",
) -> tuple[TestClient, dict[str, str]]:
    """Walk the real activation flow: admin issues a link, the parent sets a PIN and is signed in."""
    link = owner.post(
        f"/api/admin/clients/{client_id}/activation-link",
        json={"purpose": "after_cash_payment"},
        headers=owner_headers,
    )
    assert link.status_code == 200, link.text
    token = urlparse(link.json()["activation_url"]).path.rstrip("/").split("/")[-1]

    http = TestClient(main.app)
    set_pin = http.post(
        f"/api/auth/activation/{token}/set-pin",
        json={"pin": pin, "pin_repeat": pin},
        headers=_csrf_headers(http),
    )
    assert set_pin.status_code == 200, set_pin.text
    assert set_pin.json()["role"] == "parent"
    return http, _csrf_headers(http)


def test_landing_to_online_payment_access_flow(client: TestClient):
    lead_response = client.post(
        "/api/landing/leads",
        json={
            "parent_full_name": "Иванова Анна",
            "phone": "+79998887766",
            "child_full_name": "Иванова Маша",
            "child_birth_date": "11.05.2016",
            "medical_restrictions": "Не рекомендуется высокая нагрузка на колени",
            "previous_activities": "Художественная гимнастика 1 год",
            "discovery_source": "Instagram",
            "consent": True,
        },
    )
    assert lead_response.status_code == 200

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
            "payment_method": "online",
            "notes": "Тест бизнес-процесса",
        },
        headers=owner_headers,
    )
    assert created.status_code == 200
    payment_id = created.json()["payment"]["id"]
    client_id = created.json()["client"]["id"]

    # Until the payment is settled the portal stays inactive, so a PIN alone gets you nowhere.
    _, denied = _seed_pin_and_login("+79998887766")
    assert denied.status_code == 403

    status_paid = owner.patch(
        f"/api/admin/payments/{payment_id}/status",
        json={"status": "paid", "comment": "Онлайн оплата подтверждена"},
        headers=owner_headers,
    )
    assert status_paid.status_code == 200

    parent, parent_headers = _activate_parent_client(owner, owner_headers, client_id)
    parent_access_after = parent.get("/api/parent/access", headers=parent_headers)
    assert parent_access_after.status_code == 200
    assert parent_access_after.json()["canUseDashboard"] is True

    owner_children = owner.get("/api/admin/children", headers=owner_headers)
    assert owner_children.status_code == 200
    row = next(item for item in owner_children.json() if item["parentPhone"] == "+79998887766")
    assert row["landingLead"] is not None
    assert row["landingLead"]["discoverySource"] == "Instagram"
    assert row["profile"]["internalComment"] == "Тест бизнес-процесса"


def test_unlinked_landing_leads_are_returned_for_crm(client: TestClient):
    lead_response = client.post(
        "/api/landing/leads",
        json={
            "parent_full_name": "Сидорова Марина",
            "phone": "+79990001122",
            "child_full_name": "Сидорова Ева",
            "child_birth_date": "14.09.2017",
            "discovery_source": "Лендинг",
            "comment": "Ждет обратного звонка",
            "consent": True,
        },
    )
    assert lead_response.status_code == 200
    lead_id = lead_response.json()["lead"]["id"]

    owner, owner_headers = _auth_client(main.OWNER_PHONE)
    landing_leads_before = owner.get("/api/admin/landing-leads", headers=owner_headers)
    assert landing_leads_before.status_code == 200
    before_rows = landing_leads_before.json()
    assert len(before_rows) == 1
    assert before_rows[0]["id"] == lead_id
    assert before_rows[0]["childFullName"] == "Сидорова Ева"

    created = owner.post(
        "/api/admin/clients",
        json={
            "parent_full_name": "Сидорова Марина",
            "child_full_name": "Сидорова Ева",
            "child_birth_date": "2017-09-14",
            "parent_phone": "+79990001122",
            "subscription_name": "Хобби",
            "subscription_amount": 5000,
            "payment_method": "online",
        },
        headers=owner_headers,
    )
    assert created.status_code == 200

    landing_leads_after = owner.get("/api/admin/landing-leads", headers=owner_headers)
    assert landing_leads_after.status_code == 200
    assert landing_leads_after.json() == []


def test_cash_payment_opens_access_after_confirm(client: TestClient):
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
            "payment_method": "cash",
            "notes": "Ожидаем оплату наличными",
        },
        headers=owner_headers,
    )
    assert created.status_code == 200
    payment_id = created.json()["payment"]["id"]
    client_id = created.json()["client"]["id"]

    # Cash not yet accepted: the portal is inactive and PIN login is refused.
    _, denied = _seed_pin_and_login("+79997776655")
    assert denied.status_code == 403

    confirm = owner.post(
        f"/api/admin/payments/{payment_id}/confirm-cash",
        json={"paid_amount": 7000, "comment": "Наличные приняты"},
        headers=owner_headers,
    )
    assert confirm.status_code == 200

    parent, parent_headers = _activate_parent_client(owner, owner_headers, client_id)
    access_after = parent.get("/api/parent/access", headers=parent_headers)
    assert access_after.status_code == 200
    assert access_after.json()["canUseDashboard"] is True
