from __future__ import annotations

import os
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol


PAYMENT_STATUS_VALUES = {
    "pending",
    "waiting_confirmation",
    "paid",
    "failed",
    "cancelled",
    "expired",
}

SUBSCRIPTION_STATUS_VALUES = {"active", "expired", "cancelled"}
PAYMENT_METHOD = "sbp_manual"
PAYMENT_PROVIDER = "manual_sbp"

PLAN_PRESETS = [
    {
        "id": "plan-hobby",
        "code": "hobby",
        "title": "Хобби",
        "price": 5000.0,
        "duration_days": 30,
        "total_lessons": 8,
        "is_active": True,
    },
    {
        "id": "plan-pro",
        "code": "pro",
        "title": "Про",
        "price": 7000.0,
        "duration_days": 30,
        "total_lessons": None,
        "is_active": True,
    },
]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    millis = int(datetime.now(timezone.utc).timestamp() * 1000)
    return f"{prefix}-{millis}-{secrets.token_hex(2)}"


def to_iso_with_offset(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat()


class PaymentProvider(Protocol):
    name: str

    def create_payment(self, payment: dict[str, Any], plan: dict[str, Any]) -> dict[str, Any]:
        ...

    def confirm_user_paid(self, payment: dict[str, Any]) -> dict[str, Any]:
        ...

    def handle_webhook(self, payload: dict[str, Any]) -> dict[str, Any]:
        ...

    def get_status(self, payment: dict[str, Any]) -> str:
        ...


@dataclass
class ManualSbpPaymentProvider:
    name: str = PAYMENT_PROVIDER

    def create_payment(self, payment: dict[str, Any], plan: dict[str, Any]) -> dict[str, Any]:
        del plan
        payment_url = os.getenv("MANUAL_SBP_PAYMENT_URL", "").strip() or None
        payment["payment_url"] = payment_url
        payment["qr_payload"] = payment_url
        return payment

    def confirm_user_paid(self, payment: dict[str, Any]) -> dict[str, Any]:
        return payment

    def handle_webhook(self, payload: dict[str, Any]) -> dict[str, Any]:
        del payload
        return {"ok": True, "ignored": True}

    def get_status(self, payment: dict[str, Any]) -> str:
        return str(payment.get("status", "pending"))


class PaymentService:
    def __init__(self, provider: PaymentProvider | None = None):
        self.provider = provider or ManualSbpPaymentProvider()

    @staticmethod
    def ensure_store_shape(store: dict[str, Any]) -> bool:
        changed = False
        for key in ["subscriptionPlans", "payments", "subscriptions"]:
            if key not in store or not isinstance(store.get(key), list):
                store[key] = []
                changed = True

        if "paymentRefSequence" not in store or not isinstance(store.get("paymentRefSequence"), dict):
            store["paymentRefSequence"] = {"year": datetime.now(timezone.utc).year, "value": 0}
            changed = True

        for plan in list(store["subscriptionPlans"]):
            if "code" not in plan:
                plan["code"] = ""
                changed = True
            if "title" not in plan:
                plan["title"] = plan.get("code", "")
                changed = True
            if "price" not in plan:
                plan["price"] = 0.0
                changed = True
            if "duration_days" not in plan:
                plan["duration_days"] = 30
                changed = True
            if "is_active" not in plan:
                plan["is_active"] = True
                changed = True
            if "created_at" not in plan:
                plan["created_at"] = utc_now_iso()
                changed = True
            if "updated_at" not in plan:
                plan["updated_at"] = utc_now_iso()
                changed = True

        existing_by_code = {str(plan.get("code")): plan for plan in store["subscriptionPlans"]}
        for preset in PLAN_PRESETS:
            existing = existing_by_code.get(preset["code"])
            if existing:
                for field in ["title", "price", "duration_days", "is_active"]:
                    if existing.get(field) != preset[field]:
                        existing[field] = preset[field]
                        changed = True
                existing.setdefault("id", preset["id"])
                existing.setdefault("created_at", utc_now_iso())
                existing["updated_at"] = utc_now_iso()
                continue

            now = utc_now_iso()
            store["subscriptionPlans"].append(
                {
                    "id": preset["id"],
                    "code": preset["code"],
                    "title": preset["title"],
                    "price": preset["price"],
                    "duration_days": preset["duration_days"],
                    "is_active": preset["is_active"],
                    "created_at": now,
                    "updated_at": now,
                }
            )
            changed = True
        return changed

    @staticmethod
    def _next_reference(store: dict[str, Any]) -> str:
        now = datetime.now(timezone.utc)
        year = now.year
        seq = store.get("paymentRefSequence") or {"year": year, "value": 0}
        if seq.get("year") != year:
            seq = {"year": year, "value": 0}
        seq["value"] = int(seq.get("value", 0)) + 1
        store["paymentRefSequence"] = seq

        while True:
            reference = f"MN-{year}-{seq['value']:06d}"
            if not any(str(item.get("payment_reference")) == reference for item in store.get("payments", [])):
                return reference
            seq["value"] += 1

    @staticmethod
    def _find_active_plan_by_code(store: dict[str, Any], code: str) -> dict[str, Any] | None:
        normalized = code.strip().lower()
        for item in store.get("subscriptionPlans", []):
            if str(item.get("code", "")).lower() == normalized and bool(item.get("is_active", False)):
                return item
        return None

    @staticmethod
    def _plan_total_lessons(plan_code: str) -> int | None:
        normalized = plan_code.strip().lower()
        if normalized == "hobby":
            return 8
        if normalized == "pro":
            return None
        return None

    @staticmethod
    def _serialize_plan(plan: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": str(plan.get("id")),
            "code": str(plan.get("code")),
            "title": str(plan.get("title")),
            "price": float(plan.get("price", 0)),
            "duration_days": int(plan.get("duration_days", 30)),
            "is_active": bool(plan.get("is_active", False)),
            "created_at": str(plan.get("created_at")),
            "updated_at": str(plan.get("updated_at")),
        }

    def list_active_plans(self, store: dict[str, Any]) -> list[dict[str, Any]]:
        return [
            self._serialize_plan(item)
            for item in store.get("subscriptionPlans", [])
            if bool(item.get("is_active", False))
        ]

    def create_payment(
        self,
        *,
        store: dict[str, Any],
        parent_user: dict[str, Any],
        subscription_plan_code: str,
        child_id: str | None,
    ) -> dict[str, Any]:
        plan = self._find_active_plan_by_code(store, subscription_plan_code)
        if plan is None:
            raise ValueError("Subscription plan not found or inactive")

        parent_id = str(parent_user.get("id"))
        if child_id:
            child = next(
                (item for item in store.get("children", []) if str(item.get("id")) == str(child_id)),
                None,
            )
            if child is None:
                raise LookupError("Child not found")
            if str(child.get("parentUserId")) != parent_id:
                raise PermissionError("Child does not belong to current parent")

        reference = self._next_reference(store)
        now_iso = utc_now_iso()
        payment = {
            "id": new_id("pay"),
            "parent_id": parent_id,
            "child_id": str(child_id) if child_id else None,
            "subscription_plan_id": str(plan.get("id")),
            "amount": float(plan.get("price", 0)),
            "status": "pending",
            "method": PAYMENT_METHOD,
            "provider": self.provider.name,
            "payment_reference": reference,
            "payment_comment": f"Манера / {reference}",
            "payment_url": None,
            "qr_payload": None,
            "user_confirmed_at": None,
            "provider_confirmed_at": None,
            "paid_at": None,
            "confirmed_by": None,
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        payment = self.provider.create_payment(payment, plan)
        store.setdefault("payments", []).insert(0, payment)

        receiver_name = os.getenv("MANUAL_SBP_RECEIVER_NAME", "").strip()
        receiver_phone = os.getenv("MANUAL_SBP_RECEIVER_PHONE", "").strip()

        return {
            "payment_id": payment["id"],
            "amount": payment["amount"],
            "status": payment["status"],
            "payment_reference": payment["payment_reference"],
            "payment_comment": payment["payment_comment"],
            "payment_url": payment.get("payment_url"),
            "receiver_name": receiver_name,
            "receiver_phone": receiver_phone,
            "provider": payment["provider"],
            "method": payment["method"],
            "plan": self._serialize_plan(plan),
        }

    def confirm_user_paid(
        self,
        *,
        store: dict[str, Any],
        parent_user: dict[str, Any],
        payment_id: str,
    ) -> dict[str, Any]:
        parent_id = str(parent_user.get("id"))
        payment = next((item for item in store.get("payments", []) if str(item.get("id")) == payment_id), None)
        if payment is None:
            raise LookupError("Payment not found")
        if str(payment.get("parent_id")) != parent_id:
            raise PermissionError("Payment does not belong to current parent")

        current_status = str(payment.get("status", "pending"))
        existing_subscription = next(
            (item for item in store.get("subscriptions", []) if str(item.get("payment_id")) == payment_id),
            None,
        )
        if current_status == "paid":
            return {"payment": payment, "subscription": existing_subscription, "idempotent": True}

        if current_status not in {"pending", "waiting_confirmation"}:
            raise ValueError("Payment cannot be confirmed in current status")

        now = datetime.now(timezone.utc)
        now_iso = to_iso_with_offset(now)
        payment["user_confirmed_at"] = now_iso
        payment["confirmed_by"] = "user"
        payment["updated_at"] = now_iso
        self.provider.confirm_user_paid(payment)

        auto_activate = os.getenv("PAYMENTS_AUTO_ACTIVATE_ON_USER_CONFIRM", "true").strip().lower() in {
            "1",
            "true",
            "yes",
            "on",
        }

        created_subscription: dict[str, Any] | None = existing_subscription
        if auto_activate:
            payment["status"] = "paid"
            payment["paid_at"] = now_iso

            plan = next(
                (item for item in store.get("subscriptionPlans", []) if str(item.get("id")) == str(payment.get("subscription_plan_id"))),
                None,
            )
            if plan is None:
                raise LookupError("Subscription plan not found for payment")

            already_active_same_plan = next(
                (
                    item
                    for item in store.get("subscriptions", [])
                    if str(item.get("parent_id")) == parent_id
                    and str(item.get("subscription_plan_id")) == str(payment.get("subscription_plan_id"))
                    and str(item.get("status")) == "active"
                    and (str(item.get("child_id")) if item.get("child_id") else None)
                    == (str(payment.get("child_id")) if payment.get("child_id") else None)
                ),
                None,
            )

            if existing_subscription is None and already_active_same_plan is None:
                expires_at = now + timedelta(days=int(plan.get("duration_days", 30)))
                created_subscription = {
                    "id": new_id("sub"),
                    "parent_id": parent_id,
                    "child_id": payment.get("child_id"),
                    "subscription_plan_id": payment.get("subscription_plan_id"),
                    "payment_id": payment["id"],
                    "status": "active",
                    "starts_at": now_iso,
                    "expires_at": to_iso_with_offset(expires_at),
                    "total_lessons": self._plan_total_lessons(str(plan.get("code", ""))),
                    "used_lessons": 0,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                }
                store.setdefault("subscriptions", []).insert(0, created_subscription)
            elif existing_subscription is None:
                created_subscription = already_active_same_plan

            parent_user["access_level"] = "full"
            parent_user["account_status"] = "active"
            parent_user["updated_at"] = now_iso
        else:
            payment["status"] = "waiting_confirmation"

        return {"payment": payment, "subscription": created_subscription}

    def parent_payments(self, *, store: dict[str, Any], parent_user: dict[str, Any]) -> list[dict[str, Any]]:
        parent_id = str(parent_user.get("id"))
        plans_by_id = {str(item.get("id")): item for item in store.get("subscriptionPlans", [])}
        rows: list[dict[str, Any]] = []
        for item in store.get("payments", []):
            if str(item.get("parent_id")) != parent_id:
                continue
            plan = plans_by_id.get(str(item.get("subscription_plan_id")))
            plan_title = str(plan.get("title")) if plan else "Абонемент"
            rows.append(
                {
                    "id": item.get("id"),
                    "plan_title": plan_title,
                    "amount": float(item.get("amount", 0)),
                    "status": item.get("status"),
                    "payment_reference": item.get("payment_reference"),
                    "created_at": item.get("created_at"),
                    "paid_at": item.get("paid_at"),
                    "payment_comment": item.get("payment_comment"),
                    "payment_url": item.get("payment_url"),
                    "qr_payload": item.get("qr_payload"),
                    "method": item.get("method"),
                    "provider": item.get("provider"),
                    "user_confirmed_at": item.get("user_confirmed_at"),
                }
            )
        # Compatibility layer for legacy paymentRecords used before MVP payments table.
        # Keeps parent payment history visible even when temporary payments contour is disabled.
        for record in store.get("paymentRecords", []):
            if str(record.get("parentUserId")) != parent_id:
                continue
            rows.append(
                {
                    "id": record.get("id"),
                    "plan_title": record.get("subscriptionName") or "Абонемент",
                    "amount": float(record.get("amount", 0) or 0),
                    "status": record.get("status") or "pending",
                    "payment_reference": record.get("providerPaymentId"),
                    "created_at": record.get("createdAt"),
                    "paid_at": record.get("paidAt"),
                    "payment_comment": None,
                    "payment_url": None,
                    "qr_payload": None,
                    "method": record.get("paymentMethod"),
                    "provider": "legacy",
                    "user_confirmed_at": None,
                    "invoice_number": record.get("invoiceNumber"),
                    "due_date": record.get("dueDate"),
                    "reminder_count": int(record.get("reminderCount") or 0),
                    "last_reminder_at": record.get("lastReminderAt"),
                }
            )

        def _sort_key(value: dict[str, Any]) -> datetime:
            raw = value.get("created_at")
            if isinstance(raw, str):
                try:
                    parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
                    if parsed.tzinfo is None:
                        parsed = parsed.replace(tzinfo=timezone.utc)
                    return parsed.astimezone(timezone.utc)
                except ValueError:
                    pass
            return datetime.fromtimestamp(0, tz=timezone.utc)

        rows.sort(key=_sort_key, reverse=True)
        return rows

    def parent_subscriptions(self, *, store: dict[str, Any], parent_user: dict[str, Any]) -> list[dict[str, Any]]:
        parent_id = str(parent_user.get("id"))
        plans_by_id = {str(item.get("id")): item for item in store.get("subscriptionPlans", [])}
        result: list[dict[str, Any]] = []
        for item in store.get("subscriptions", []):
            if str(item.get("parent_id")) != parent_id:
                continue
            if str(item.get("status")) != "active":
                continue
            plan = plans_by_id.get(str(item.get("subscription_plan_id")))
            plan_title = str(plan.get("title")) if plan else "Абонемент"
            total_lessons = item.get("total_lessons")
            used_lessons = int(item.get("used_lessons", 0))
            remaining_lessons = None
            if isinstance(total_lessons, int):
                remaining_lessons = max(total_lessons - used_lessons, 0)

            result.append(
                {
                    "id": item.get("id"),
                    "plan_title": plan_title,
                    "status": item.get("status"),
                    "starts_at": item.get("starts_at"),
                    "expires_at": item.get("expires_at"),
                    "total_lessons": total_lessons,
                    "used_lessons": used_lessons,
                    "remaining_lessons": remaining_lessons,
                }
            )
        return result
