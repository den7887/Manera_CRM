"""run_scheduled_jobs.py: the payment-provider reconciliation job that closes
the gap where Selfwork confirms a payment but neither its webhook nor the
browser's return-redirect ever reaches us (see production incident: a real
card payment succeeded on Selfwork's side and stayed "pending" in the CRM
indefinitely). These tests stub the actual network call -- they check the
candidate selection and the cap, not real HTTP behaviour.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import main  # noqa: E402
import run_scheduled_jobs  # noqa: E402


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
        "pushSubscriptions": [],
    }


@pytest.fixture
def client(tmp_path, monkeypatch):
    store_file = tmp_path / "store.json"
    monkeypatch.setattr(main, "DATA_FILE", store_file)
    monkeypatch.setenv("TEST_MODE", "true")
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:3000")
    monkeypatch.setenv("PAYMENT_PROVIDER", "selfwork")

    main.ACTIVE_TOKENS.clear()
    store_file.write_text(json.dumps(_make_store(), ensure_ascii=False, indent=2), encoding="utf-8")
    return TestClient(main.app)


def _csrf_headers(http: TestClient) -> dict[str, str]:
    response = http.get("/api/auth/csrf")
    token = http.cookies.get(main.CSRF_COOKIE_NAME)
    return {"X-CSRF-Token": token}


def _auth_client(phone: str, pin: str = "505255") -> tuple[TestClient, dict[str, str]]:
    store = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    user = next(item for item in store["users"] if str(item.get("phone")) == phone)
    now = main._utc_now_iso()
    store["userPinAuth"] = [
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
    ]
    main.DATA_FILE.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")
    http = TestClient(main.app)
    login = http.post("/api/auth/login-pin", json={"phone": phone, "pin": pin}, headers=_csrf_headers(http))
    assert login.status_code == 200, login.text
    return http, _csrf_headers(http)


def _create_online_invoice_with_provider_id(owner: TestClient, owner_headers: dict, phone: str, amount: float) -> str:
    created = owner.post(
        "/api/admin/clients",
        json={
            "parent_full_name": "Тест Родитель",
            "child_full_name": "Тест Ребёнок",
            "child_birth_date": "2016-01-01",
            "parent_phone": phone,
            "subscription_name": "Хобби",
            "subscription_amount": amount,
            "payment_method": "online",
        },
        headers=owner_headers,
    )
    assert created.status_code == 200, created.text
    payment_id = created.json()["payment"]["id"]

    # A provider payment id only exists once /api/payments/provider/create has
    # run; set it directly to avoid a real Selfwork call in this fixture.
    store = json.loads(main.DATA_FILE.read_text(encoding="utf-8"))
    payment = next(p for p in store["paymentRecords"] if p["id"] == payment_id)
    payment["providerPaymentId"] = f"INV-{payment_id}"
    main.DATA_FILE.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")
    return payment_id


def test_reconciliation_only_targets_outstanding_online_payments_with_a_provider_id(client: TestClient, monkeypatch):
    owner, owner_headers = _auth_client(main.OWNER_PHONE)

    # Candidate: online, pending, has a provider id.
    good_id = _create_online_invoice_with_provider_id(owner, owner_headers, "+79990000001", 5000)

    # Not a candidate: cash payment method.
    cash_created = owner.post(
        "/api/admin/clients",
        json={
            "parent_full_name": "Наличные Родитель", "child_full_name": "Наличные Ребёнок",
            "child_birth_date": "2016-01-01", "parent_phone": "+79990000002",
            "subscription_name": "Хобби", "subscription_amount": 5000, "payment_method": "cash",
        },
        headers=owner_headers,
    )
    cash_payment_id = cash_created.json()["payment"]["id"]

    # Not a candidate: online but never reached the provider (no providerPaymentId).
    no_provider_created = owner.post(
        "/api/admin/clients",
        json={
            "parent_full_name": "Без Провайдера", "child_full_name": "Без Провайдера Ребёнок",
            "child_birth_date": "2016-01-01", "parent_phone": "+79990000003",
            "subscription_name": "Хобби", "subscription_amount": 5000, "payment_method": "online",
        },
        headers=owner_headers,
    )
    no_provider_payment_id = no_provider_created.json()["payment"]["id"]

    seen_ids: list[str] = []

    def fake_sync(store, payment_id):
        seen_ids.append(payment_id)
        return {"ok": True, "synced": False}

    monkeypatch.setattr(main, "_sync_selfwork_payment_status_internal", fake_sync)

    synced = run_scheduled_jobs.run_provider_payment_reconciliation()

    assert seen_ids == [good_id]
    assert cash_payment_id not in seen_ids
    assert no_provider_payment_id not in seen_ids
    assert synced == 0  # fake_sync always reports synced=False


def test_reconciliation_disabled_when_provider_is_not_selfwork(client: TestClient, monkeypatch):
    monkeypatch.setenv("PAYMENT_PROVIDER", "some_other_gateway")
    called = []
    monkeypatch.setattr(main, "_sync_selfwork_payment_status_internal", lambda store, pid: called.append(pid))
    synced = run_scheduled_jobs.run_provider_payment_reconciliation()
    assert called == []
    assert synced == 0


def test_reconciliation_respects_the_per_run_cap(client: TestClient, monkeypatch):
    owner, owner_headers = _auth_client(main.OWNER_PHONE)
    cap = run_scheduled_jobs.MAX_PROVIDER_RECONCILIATIONS_PER_RUN
    for i in range(cap + 5):
        _create_online_invoice_with_provider_id(owner, owner_headers, f"+7999000{i:04d}", 5000)

    seen_ids: list[str] = []
    monkeypatch.setattr(
        main,
        "_sync_selfwork_payment_status_internal",
        lambda store, payment_id: (seen_ids.append(payment_id), {"ok": True, "synced": False})[1],
    )

    run_scheduled_jobs.run_provider_payment_reconciliation()
    assert len(seen_ids) == cap


def test_reconciliation_one_failure_does_not_block_the_rest(client: TestClient, monkeypatch):
    owner, owner_headers = _auth_client(main.OWNER_PHONE)
    failing_id = _create_online_invoice_with_provider_id(owner, owner_headers, "+79990001111", 5000)
    ok_id = _create_online_invoice_with_provider_id(owner, owner_headers, "+79990002222", 5000)

    def flaky_sync(store, payment_id):
        if payment_id == failing_id:
            raise TimeoutError("selfwork did not respond")
        return {"ok": True, "synced": True}

    monkeypatch.setattr(main, "_sync_selfwork_payment_status_internal", flaky_sync)

    synced = run_scheduled_jobs.run_provider_payment_reconciliation()
    assert synced == 1  # only ok_id counted; failing_id's exception was swallowed and logged
