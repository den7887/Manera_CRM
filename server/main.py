from __future__ import annotations

import json
import os
import re
import secrets
import threading
import hashlib
import html
from base64 import b64encode
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from fastapi import Depends, FastAPI, HTTPException, Request as FastAPIRequest, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from payments import PaymentService

try:
    import psycopg2
    from psycopg2.extras import Json as PsycopgJson
except Exception:  # pragma: no cover - optional dependency for production storage backend
    psycopg2 = None
    PsycopgJson = None

try:
    from pywebpush import WebPushException, webpush
except Exception:  # pragma: no cover - optional dependency for browser push notifications
    webpush = None
    WebPushException = None


UserRole = Literal["parent", "teacher", "admin", "owner"]
AccessLevel = Literal["payment_only", "full"]
AccountStatus = Literal["invited", "payment_pending", "active", "suspended"]
PaymentMethod = Literal["cash", "online"]
PaymentStatus = Literal["unpaid", "pending", "paid", "failed", "refunded", "overdue", "cancelled"]
PortalStatus = Literal[
    "not_created",
    "awaiting_payment",
    "paid_cash_waiting_activation",
    "paid_online_waiting_activation",
    "activation_link_created",
    "activated",
    "blocked",
]
ActivationPurpose = Literal["initial_activation", "reset_pin", "after_cash_payment", "after_online_payment"]
ActivationSourceFlow = Literal["admin_cash_payment", "online_payment", "admin_reset_pin", "admin_manual_activation"]
PaymentSessionStatus = Literal["active", "paid", "expired", "cancelled", "completed"]

APP_ROOT = Path(__file__).resolve().parent
DATA_FILE = APP_ROOT / "data" / "store.json"
DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
LOCK = threading.Lock()
DEFAULT_TELEGRAM_ALLOWED_CHAT_IDS: list[str] = ["8147085641", "824827315", "772025944"]

ACTIVE_TOKENS: dict[str, str] = {}
OTP_CODES: dict[str, str] = {}
NOTIFICORE_OTP_SESSIONS: dict[str, str] = {}
RATE_LIMIT_BUCKETS: dict[str, list[float]] = {}
_POSTGRES_SCHEMA_READY = False
SESSION_COOKIE_NAME = "manera_crm_session"
CSRF_COOKIE_NAME = "manera_crm_csrf"
CSRF_HEADER_NAME = "x-csrf-token"
POSTGRES_DEDICATED_COLLECTION_KEYS: tuple[str, ...] = (
    "notifications",
    "children",
    "clients",
    "ownerGroups",
    "ownerExpenses",
    "ownerPricingPlans",
)
POSTGRES_GENERIC_COLLECTION_KEYS: tuple[str, ...] = (
    "tasks",
    "news",
    "documents",
    "landingLeads",
    "landingSessions",
    "telegramChats",
    "analyticsEvents",
    "paymentJournal",
    "subscriptionPlans",
    "payments",
    "subscriptions",
    "automationRules",
    "communicationChats",
    "communicationMessages",
    "pushSubscriptions",
)
POSTGRES_GENERIC_COLLECTION_TABLES: dict[str, str] = {
    "tasks": "crm_tasks",
    "news": "crm_news",
    "documents": "crm_documents",
    "landingLeads": "crm_landing_leads",
    "landingSessions": "crm_landing_sessions",
    "telegramChats": "crm_telegram_chats",
    "analyticsEvents": "crm_analytics_events",
    "paymentJournal": "crm_payment_journal",
    "subscriptionPlans": "crm_subscription_plans",
    "payments": "crm_legacy_payments",
    "subscriptions": "crm_legacy_subscriptions",
    "automationRules": "crm_automation_rules",
    "pushSubscriptions": "crm_push_subscriptions",
    "communicationChats": "crm_communication_chats",
    "communicationMessages": "crm_communication_messages",
}
POSTGRES_COLLECTION_KEYS: tuple[str, ...] = (*POSTGRES_DEDICATED_COLLECTION_KEYS, *POSTGRES_GENERIC_COLLECTION_KEYS)
POSTGRES_DIRECT_ENTITY_KEYS: tuple[str, ...] = (
    "users",
    "userPinAuth",
    "activationTokens",
    "paymentSessions",
    "paymentRecords",
    "activeTokens",
    "securityAuditLog",
)

OWNER_PHONE = "+79189423508"
SUBSCRIPTION_CATALOG: dict[str, dict[str, Any]] = {
    "Хобби": {"price": 5000.0, "classes_count": 8, "classes_tracked": True},
    "Про": {"price": 7000.0, "classes_count": None, "classes_tracked": False},
}
payment_service = PaymentService()
SIMPLE_PINS = {
    "000000",
    "111111",
    "222222",
    "333333",
    "444444",
    "555555",
    "666666",
    "777777",
    "888888",
    "999999",
    "123456",
    "654321",
    "112233",
    "123123",
    "121212",
    "101010",
    "258025",
    "147258",
    "159357",
    "987654",
}


class OtpStartPayload(BaseModel):
    phone: str = Field(min_length=5, max_length=30)


class OtpVerifyPayload(BaseModel):
    phone: str = Field(min_length=5, max_length=30)
    code: str = Field(min_length=4, max_length=10)


class AuthResponse(BaseModel):
    role: UserRole
    access_level: AccessLevel
    account_status: AccountStatus


class PinLoginPayload(BaseModel):
    phone: str = Field(min_length=5, max_length=30)
    pin: str = Field(min_length=1, max_length=20)


class ActivationSetPinPayload(BaseModel):
    pin: str = Field(min_length=1, max_length=20)
    pin_repeat: str = Field(min_length=1, max_length=20)


class AdminCreateClientPayload(BaseModel):
    parent_full_name: str = Field(min_length=2, max_length=120)
    child_full_name: str = Field(min_length=2, max_length=120)
    child_birth_date: str = Field(min_length=8, max_length=20)
    parent_phone: str = Field(min_length=5, max_length=30)
    subscription_name: str = Field(min_length=2, max_length=120)
    subscription_amount: float = Field(gt=0)
    payment_method: PaymentMethod
    group_id: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=1000)
    mark_as_paid: bool = False
    service_start_date: str | None = Field(default=None, max_length=30)


class CashPaymentConfirmPayload(BaseModel):
    comment: str | None = Field(default=None, max_length=1000)
    paid_amount: float | None = Field(default=None, gt=0)


class PaymentMethodChangePayload(BaseModel):
    payment_method: PaymentMethod
    confirm_cash_immediately: bool = False
    comment: str | None = Field(default=None, max_length=1000)
    paid_amount: float | None = Field(default=None, gt=0)


class AdminCreateInvoicePayload(BaseModel):
    client_id: str | None = Field(default=None, max_length=120)
    parent_user_id: str | None = Field(default=None, max_length=120)
    parent_phone: str | None = Field(default=None, max_length=30)
    parent_full_name: str | None = Field(default=None, max_length=120)
    child_full_name: str | None = Field(default=None, max_length=120)
    subscription_name: str | None = Field(default=None, max_length=120)
    amount: float | None = Field(default=None, gt=0)
    payment_method: PaymentMethod = "online"
    due_date: str | None = Field(default=None, max_length=30)
    starts_at: str | None = Field(default=None, max_length=30)
    comment: str | None = Field(default=None, max_length=1000)


class PaymentReminderPayload(BaseModel):
    message: str | None = Field(default=None, max_length=1000)


class StartPinActivationPayload(BaseModel):
    phone: str = Field(min_length=5, max_length=30)


class PaymentStatusUpdatePayload(BaseModel):
    status: Literal["unpaid", "pending", "paid", "failed", "refunded", "cancelled", "overdue"]
    comment: str | None = Field(default=None, max_length=1000)


class PaymentDueDatePayload(BaseModel):
    due_date: str = Field(min_length=8, max_length=30)
    comment: str | None = Field(default=None, max_length=1000)


class ProviderWebhookPayload(BaseModel):
    payment_id: str = Field(min_length=2, max_length=120)
    status: Literal["paid", "failed"]
    provider_payment_id: str | None = Field(default=None, max_length=120)
    raw_payload: dict[str, Any] | None = None


class ProviderCreatePaymentPayload(BaseModel):
    payment_id: str = Field(min_length=2, max_length=120)
    success_url: str = Field(min_length=8, max_length=500)
    fail_url: str = Field(min_length=8, max_length=500)


class ProviderStatusSyncPayload(BaseModel):
    payment_id: str = Field(min_length=2, max_length=120)


class AdminActivationLinkPayload(BaseModel):
    purpose: ActivationPurpose = "after_cash_payment"


class AdminCashPortalPaymentPayload(BaseModel):
    amount: float | None = Field(default=None, gt=0)
    service_type: str | None = Field(default=None, max_length=120)
    abonement_id: str | None = Field(default=None, max_length=120)
    comment: str | None = Field(default=None, max_length=1000)


class PublicPaymentStartPayload(BaseModel):
    phone: str = Field(min_length=5, max_length=30)
    product_id: str | None = Field(default=None, max_length=120)
    child_name: str | None = Field(default=None, max_length=160)
    parent_name: str | None = Field(default=None, max_length=160)


class CreatePaymentPayload(BaseModel):
    subscription_plan_code: str = Field(min_length=2, max_length=40)
    child_id: str | None = Field(default=None, max_length=120)


class LandingLeadPayload(BaseModel):
    parent_full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=5, max_length=30)
    child_full_name: str = Field(min_length=2, max_length=120)
    child_birth_date: str | None = Field(default=None, max_length=20)
    medical_restrictions: str | None = Field(default=None, max_length=1200)
    previous_activities: str | None = Field(default=None, max_length=1200)
    discovery_source: str | None = Field(default=None, max_length=240)
    preferred_schedule: str | None = Field(default=None, max_length=240)
    comment: str | None = Field(default=None, max_length=1200)
    consent: bool = True
    website: str | None = Field(default=None, max_length=240)
    session_id: str | None = Field(default=None, max_length=120)
    source: dict[str, Any] | None = None


class AnalyticsEventPayload(BaseModel):
    session_id: str = Field(min_length=6, max_length=120)
    event_name: Literal[
        "page_view",
        "session_start",
        "scroll_depth",
        "time_on_page",
        "cta_click",
        "section_view",
        "form_start",
        "form_submit",
        "form_error",
        "source_tracking",
    ]
    payload: dict[str, Any] = Field(default_factory=dict)


class OwnerGroupPayload(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    age_range: str | None = Field(default=None, max_length=80)
    ageRange: str | None = Field(default=None, max_length=80)
    teacher_id: str | None = Field(default=None, max_length=120)
    teacher_name: str | None = Field(default=None, max_length=120)
    schedule: str | list[str] | None = Field(default="", max_length=120)
    time: str = Field(default="", max_length=80)
    color: str = Field(default="#133C2A", max_length=20)
    max_capacity: int | None = Field(default=None, ge=1, le=200)
    maxCapacity: int | None = Field(default=None, ge=1, le=200)


class OwnerAssignChildGroupPayload(BaseModel):
    group_id: str | None = Field(default=None, max_length=120)


class AdminChildProfilePayload(BaseModel):
    internal_comment: str | None = Field(default=None, max_length=2000)
    health_notes: str | None = Field(default=None, max_length=2000)
    behavioral_notes: str | None = Field(default=None, max_length=2000)
    goals: str | None = Field(default=None, max_length=2000)
    strengths: str | None = Field(default=None, max_length=2000)
    parent_expectations: str | None = Field(default=None, max_length=2000)
    emergency_contact_name: str | None = Field(default=None, max_length=160)
    emergency_contact_phone: str | None = Field(default=None, max_length=40)
    communication_preferences: str | None = Field(default=None, max_length=800)
    source_channel: str | None = Field(default=None, max_length=160)
    prior_experience: str | None = Field(default=None, max_length=2000)
    tags: list[str] | None = None


class OwnerEmployeePayload(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    role: Literal["teacher", "admin"] = "teacher"
    phone: str = Field(min_length=5, max_length=30)
    email: str | None = Field(default=None, max_length=120)
    birth_date: str | None = Field(default=None, max_length=30)
    experience: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=200)
    status: Literal["active", "inactive"] = "active"
    permissions: list[str] = Field(default_factory=list)


class OwnerExpensePayload(BaseModel):
    category: str = Field(min_length=2, max_length=60)
    amount: float = Field(gt=0)
    date: str = Field(min_length=8, max_length=30)
    description: str = Field(min_length=2, max_length=300)
    payment_method: Literal["cash", "card", "transfer"] | None = None
    recipient_name: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=1000)


class OwnerAutomationPayload(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    trigger_key: str = Field(min_length=2, max_length=120)
    action_type: str = Field(min_length=2, max_length=120)
    action_params: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class OwnerSettingsPayload(BaseModel):
    studio_name: str = Field(min_length=2, max_length=160)
    support_phone: str = Field(min_length=5, max_length=30)
    support_email: str | None = Field(default=None, max_length=120)
    city: str | None = Field(default=None, max_length=120)
    address: str | None = Field(default=None, max_length=240)
    timezone: str = Field(default="Europe/Moscow", min_length=3, max_length=80)
    currency: str = Field(default="RUB", min_length=3, max_length=10)
    parent_registration_enabled: bool = True


class OwnerLandingSettingsPayload(BaseModel):
    hero_title: str = Field(min_length=2, max_length=160)
    hero_subtitle: str = Field(default="", max_length=600)
    cta_label: str = Field(default="Записаться на пробное занятие", max_length=120)
    contact_phone: str = Field(min_length=5, max_length=30)
    contact_email: str | None = Field(default=None, max_length=120)
    address: str | None = Field(default=None, max_length=240)
    map_url: str | None = Field(default=None, max_length=1000)
    published: bool = True


class OwnerPricingPlanPayload(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    price: float = Field(ge=0)
    classes_count: int | None = Field(default=None, ge=0, le=500)
    classes_tracked: bool = True
    duration_days: int = Field(default=30, ge=1, le=3650)
    is_active: bool = True


class CreateCommunicationChatPayload(BaseModel):
    employee_id: str = Field(min_length=2, max_length=120)


class CreateCommunicationMessagePayload(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class PushSubscriptionKeys(BaseModel):
    p256dh: str = Field(min_length=1, max_length=400)
    auth: str = Field(min_length=1, max_length=200)


class PushSubscribePayload(BaseModel):
    endpoint: str = Field(min_length=1, max_length=2000)
    keys: PushSubscriptionKeys
    userAgent: str | None = Field(default=None, max_length=400)


class PushUnsubscribePayload(BaseModel):
    endpoint: str = Field(min_length=1, max_length=2000)


class DocumentCreatePayload(BaseModel):
    """Minimal validation so a document can never be stored without the fields the
    frontend unconditionally reads (name, fileType) — see audit finding F-03: a
    document missing either one white-screens the owner, admin and parent apps
    on every read, with no error boundary anywhere in the tree."""

    name: str = Field(min_length=1, max_length=300)
    description: str | None = Field(default=None, max_length=2000)
    category: str = Field(default="other", max_length=60)
    fileName: str | None = Field(default=None, max_length=300)
    fileType: str = Field(default="", max_length=20)
    fileSize: int | None = Field(default=None, ge=0)
    fileUrl: str | None = None
    accessType: str = Field(default="all", max_length=40)
    assignedEmployees: list[str] = Field(default_factory=list)
    assignedParents: list[str] = Field(default_factory=list)
    createdBy: str | None = Field(default=None, max_length=120)
    createdByName: str | None = Field(default=None, max_length=200)
    tags: list[str] | None = None
    checklistItems: list[str] | None = None

    model_config = ConfigDict(extra="allow")


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_local_env_file() -> None:
    env_path = APP_ROOT / ".env"
    if not env_path.exists():
        return

    try:
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            if not key or key in os.environ:
                continue
            normalized = value.strip()
            if len(normalized) >= 2 and normalized[0] == normalized[-1] and normalized[0] in {'"', "'"}:
                normalized = normalized[1:-1]
            os.environ[key] = normalized
    except OSError:
        return


_load_local_env_file()


def _new_id(prefix: str) -> str:
    millis = int(datetime.now(timezone.utc).timestamp() * 1000)
    return f"{prefix}-{millis}-{secrets.token_hex(2)}"


def _default_owner_settings() -> dict[str, Any]:
    return {
        "studioName": "Manera Dance Studio",
        "supportPhone": OWNER_PHONE,
        "supportEmail": "",
        "city": "Москва",
        "address": "",
        "timezone": "Europe/Moscow",
        "currency": "RUB",
        "parentRegistrationEnabled": True,
        "updatedAt": _utc_now_iso(),
    }


def _default_owner_landing_settings() -> dict[str, Any]:
    return {
        "heroTitle": "Танцевальная студия Manera",
        "heroSubtitle": "Занятия для детей и подростков с профессиональными педагогами.",
        "ctaLabel": "Записаться на пробное занятие",
        "contactPhone": OWNER_PHONE,
        "contactEmail": "",
        "address": "",
        "mapUrl": "",
        "published": True,
        "updatedAt": _utc_now_iso(),
    }


def _default_owner_pricing_plans() -> list[dict[str, Any]]:
    now = _utc_now_iso()
    return [
        {
            "id": "owner-plan-hobby",
            "code": "hobby",
            "title": "Хобби",
            "price": 5000.0,
            "classesCount": 8,
            "classesTracked": True,
            "durationDays": 30,
            "isActive": True,
            "updatedAt": now,
        },
        {
            "id": "owner-plan-pro",
            "code": "pro",
            "title": "Про",
            "price": 7000.0,
            "classesCount": None,
            "classesTracked": False,
            "durationDays": 30,
            "isActive": True,
            "updatedAt": now,
        },
    ]


def _serialize_owner_pricing_plan(plan: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(plan.get("id")),
        "code": str(plan.get("code")),
        "title": str(plan.get("title") or ""),
        "price": float(plan.get("price") or 0),
        "classes_count": int(plan.get("classesCount")) if isinstance(plan.get("classesCount"), int) else None,
        "classes_tracked": bool(plan.get("classesTracked", True)),
        "duration_days": int(plan.get("durationDays") or 30),
        "is_active": bool(plan.get("isActive", True)),
        "updated_at": str(plan.get("updatedAt") or _utc_now_iso()),
    }


def _new_owner_pricing_code(store: dict[str, Any]) -> str:
    existing_codes = {
        str(item.get("code") or "").strip().lower()
        for item in store.get("ownerPricingPlans", [])
        if isinstance(item, dict)
    }
    while True:
        candidate = f"custom-{secrets.token_hex(3)}"
        if candidate not in existing_codes:
            return candidate


def _sync_subscription_catalog_from_owner_pricing(store: dict[str, Any]) -> None:
    plans = store.get("ownerPricingPlans", [])
    if not isinstance(plans, list):
        return
    for plan in plans:
        code = str(plan.get("code") or "").strip().lower()
        title = str(plan.get("title") or "").strip()
        if not code or not title:
            continue
        price = float(plan.get("price") or 0)
        classes_count = plan.get("classesCount")
        tracked = bool(plan.get("classesTracked", classes_count is not None))
        SUBSCRIPTION_CATALOG[title] = {
            "price": price,
            "classes_count": classes_count if isinstance(classes_count, int) else None,
            "classes_tracked": tracked,
            "code": code,
        }


def _sync_subscription_plans_from_owner_pricing(store: dict[str, Any]) -> bool:
    changed = False
    plans = store.get("subscriptionPlans")
    if not isinstance(plans, list):
        return False
    plans_by_code = {str(item.get("code", "")).strip().lower(): item for item in plans if isinstance(item, dict)}
    for owner_plan in store.get("ownerPricingPlans", []):
        code = str(owner_plan.get("code") or "").strip().lower()
        if not code:
            continue
        target = plans_by_code.get(code)
        if target is None:
            now = _utc_now_iso()
            target = {
                "id": f"plan-{code}",
                "code": code,
                "title": str(owner_plan.get("title") or code),
                "price": float(owner_plan.get("price") or 0),
                "duration_days": int(owner_plan.get("durationDays") or 30),
                "is_active": bool(owner_plan.get("isActive", True)),
                "created_at": now,
                "updated_at": now,
            }
            plans.append(target)
            plans_by_code[code] = target
            changed = True
            continue
        next_title = str(owner_plan.get("title") or target.get("title") or code)
        next_price = float(owner_plan.get("price") or 0)
        next_duration = int(owner_plan.get("durationDays") or 30)
        next_is_active = bool(owner_plan.get("isActive", True))
        if (
            target.get("title") != next_title
            or float(target.get("price") or 0) != next_price
            or int(target.get("duration_days") or 30) != next_duration
            or bool(target.get("is_active", True)) != next_is_active
        ):
            target["title"] = next_title
            target["price"] = next_price
            target["duration_days"] = next_duration
            target["is_active"] = next_is_active
            target["updated_at"] = _utc_now_iso()
            changed = True
    return changed


def _find_owner_pricing_plan(store: dict[str, Any], subscription_name: str) -> dict[str, Any] | None:
    normalized = subscription_name.strip().lower()
    for plan in store.get("ownerPricingPlans", []):
        title = str(plan.get("title") or "").strip().lower()
        code = str(plan.get("code") or "").strip().lower()
        if normalized in {title, code}:
            return plan
    return None


def _ensure_active_subscription_for_payment(store: dict[str, Any], payment: dict[str, Any]) -> None:
    """Create the subscription record a paid invoice is supposed to produce.

    Before this, flipping a payment to "paid" never wrote anything to
    `subscriptions` — the parent's "Активные абонементы" view and the owner's
    subscription counters stayed at zero no matter how many invoices were paid
    (see audit finding F-05). Idempotent per payment_id so it is safe to call
    from every "became paid" transition without risking duplicates.
    """
    payment_id = str(payment.get("id") or "")
    parent_id = str(payment.get("parentUserId") or "")
    if not payment_id or not parent_id:
        return

    subscriptions = store.setdefault("subscriptions", [])
    if any(str(item.get("payment_id")) == payment_id for item in subscriptions):
        return  # already provisioned for this payment

    plan = _find_owner_pricing_plan(store, str(payment.get("subscriptionName") or ""))
    if plan is None:
        return  # no matching catalog plan (e.g. a manually-priced one-off invoice)

    # parent_subscriptions() (payments.py) resolves plan_title through the separate
    # `subscriptionPlans` catalog, not `ownerPricingPlans` — the two are kept in sync
    # by code (see _sync_subscription_plans_from_owner_pricing) but have different ids.
    plan_code = str(plan.get("code") or "").strip().lower()
    synced_plan = next(
        (item for item in store.get("subscriptionPlans", []) if str(item.get("code") or "").strip().lower() == plan_code),
        None,
    )
    subscription_plan_id = str((synced_plan or plan).get("id") or "")

    now_dt = datetime.now(timezone.utc)
    duration_days = int(plan.get("durationDays") or 30)
    total_lessons = plan.get("classesCount") if plan.get("classesTracked") else None

    subscriptions.append(
        {
            "id": _new_id("subscription"),
            "parent_id": parent_id,
            "client_id": payment.get("clientId"),
            "payment_id": payment_id,
            "subscription_plan_id": subscription_plan_id,
            "status": "active",
            "starts_at": now_dt.isoformat(),
            "expires_at": (now_dt + timedelta(days=duration_days)).isoformat(),
            "total_lessons": total_lessons,
            "used_lessons": 0,
            "createdAt": _utc_now_iso(),
            "updatedAt": _utc_now_iso(),
        }
    )


def _normalize_group_schedule_value(value: Any) -> str:
    if isinstance(value, list):
        return ", ".join(str(item).strip() for item in value if str(item).strip())
    if isinstance(value, str):
        return value.strip()
    return ""


def _resolve_owner_group_payload(payload: OwnerGroupPayload) -> dict[str, Any]:
    name = str(payload.name or "").strip()
    age_range = str(payload.age_range or payload.ageRange or "").strip()
    if len(name) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Название группы должно быть не короче 2 символов")
    if len(age_range) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Возрастной диапазон должен быть не короче 2 символов")

    max_capacity = payload.max_capacity if payload.max_capacity is not None else payload.maxCapacity
    if max_capacity is None:
        max_capacity = 12
    max_capacity = int(max_capacity)
    if max_capacity < 1 or max_capacity > 200:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Вместимость должна быть в диапазоне 1-200")

    return {
        "name": name,
        "ageRange": age_range,
        "teacherId": payload.teacher_id,
        "teacherName": str(payload.teacher_name or "").strip(),
        "schedule": _normalize_group_schedule_value(payload.schedule),
        "time": str(payload.time or "").strip(),
        "color": str(payload.color or "#133C2A").strip() or "#133C2A",
        "maxCapacity": max_capacity,
    }


def _next_invoice_number(store: dict[str, Any]) -> str:
    now = datetime.now(timezone.utc)
    year = now.year
    seq = store.get("invoiceSequence") or {"year": year, "value": 0}
    if int(seq.get("year") or year) != year:
        seq = {"year": year, "value": 0}
    seq["value"] = int(seq.get("value", 0)) + 1
    store["invoiceSequence"] = seq
    return f"INV-{year}-{int(seq['value']):06d}"


def _default_due_date_iso(base_dt: datetime | None = None) -> str:
    anchor = base_dt.astimezone(timezone.utc) if base_dt else datetime.now(timezone.utc)
    return (anchor + timedelta(days=5)).date().isoformat()


def _next_reminder_iso(due_date_iso: str) -> str:
    try:
        due_date = datetime.strptime(due_date_iso, "%Y-%m-%d").date()
    except ValueError:
        due_date = (datetime.now(timezone.utc) + timedelta(days=2)).date()
    now_date = datetime.now(timezone.utc).date()
    candidate = due_date - timedelta(days=2)
    if candidate <= now_date:
        candidate = now_date
    return datetime.combine(candidate, datetime.min.time(), tzinfo=timezone.utc).isoformat()


def _is_outstanding_status(status_value: str) -> bool:
    return status_value in {"unpaid", "pending", "failed", "overdue"}


def _ensure_legacy_payment_shape(store: dict[str, Any], payment: dict[str, Any]) -> bool:
    changed = False
    if "invoiceNumber" not in payment or not payment.get("invoiceNumber"):
        payment["invoiceNumber"] = _next_invoice_number(store)
        changed = True

    if "dueDate" not in payment or not payment.get("dueDate"):
        created_dt = _parse_datetime_safe(payment.get("createdAt")) or datetime.now(timezone.utc)
        payment["dueDate"] = _default_due_date_iso(created_dt)
        changed = True

    if "reminderCount" not in payment or not isinstance(payment.get("reminderCount"), int):
        payment["reminderCount"] = int(payment.get("reminderCount") or 0)
        changed = True
    if "lastReminderAt" not in payment:
        payment["lastReminderAt"] = None
        changed = True
    if "nextReminderAt" not in payment or not payment.get("nextReminderAt"):
        payment["nextReminderAt"] = _next_reminder_iso(str(payment.get("dueDate")))
        changed = True
    if "reminderComment" not in payment:
        payment["reminderComment"] = None
        changed = True
    if "invoiceComment" not in payment:
        payment["invoiceComment"] = None
        changed = True
    if "createdByUserId" not in payment:
        payment["createdByUserId"] = None
        changed = True
    if "statusUpdatedAt" not in payment:
        payment["statusUpdatedAt"] = payment.get("updatedAt") or payment.get("createdAt") or _utc_now_iso()
        changed = True

    status_value = str(payment.get("status") or "pending")
    if status_value not in {"unpaid", "pending", "paid", "failed", "refunded", "overdue", "cancelled"}:
        payment["status"] = "pending"
        changed = True
        status_value = "pending"

    due_dt = _parse_datetime_safe(payment.get("dueDate"))
    now_dt = datetime.now(timezone.utc)
    if due_dt and due_dt.date() < now_dt.date() and status_value in {"unpaid", "pending"}:
        payment["status"] = "overdue"
        payment["statusUpdatedAt"] = _utc_now_iso()
        changed = True

    return changed


def _normalize_phone(raw: str) -> str:
    text = "".join(ch for ch in raw if ch.isdigit() or ch == "+")
    if text.startswith("8") and len(text) == 11:
        text = f"+7{text[1:]}"
    if text.startswith("7") and len(text) == 11:
        text = f"+{text}"
    return text


def _phone_to_msisdn(phone: str) -> str:
    return "".join(ch for ch in phone if ch.isdigit())


def _env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name, "").strip().lower()
    if not value:
        return default
    return value in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _auth_token_ttl_seconds() -> int:
    return max(300, _env_int("AUTH_TOKEN_TTL_SECONDS", 7 * 24 * 60 * 60))


def _pin_length() -> int:
    return max(4, _env_int("AUTH_PIN_LENGTH", 6))


def _activation_link_ttl_hours() -> int:
    return max(1, _env_int("AUTH_ACTIVATION_LINK_TTL_HOURS", 72))


def _pin_max_attempts() -> int:
    return max(1, _env_int("AUTH_PIN_MAX_ATTEMPTS", 5))


def _pin_lock_minutes() -> int:
    return max(1, _env_int("AUTH_PIN_LOCK_MINUTES", 15))


def _rate_limit_window_ms() -> int:
    return max(1000, _env_int("RATE_LIMIT_WINDOW_MS", 60_000))


def _login_rate_limit_max_requests() -> int:
    return max(1, _env_int("LOGIN_RATE_LIMIT_MAX_REQUESTS", 10))


def _payment_start_rate_limit_max_requests() -> int:
    return max(1, _env_int("PAYMENT_START_RATE_LIMIT_MAX_REQUESTS", 5))


def _form_rate_limit_max_requests() -> int:
    return max(1, _env_int("FORM_RATE_LIMIT_MAX_REQUESTS", 5))


def _analytics_rate_limit_max_requests() -> int:
    return max(1, _env_int("ANALYTICS_RATE_LIMIT_MAX_REQUESTS", 120))


def _frontend_base_url() -> str:
    value = os.getenv("FRONTEND_BASE_URL", "").strip().rstrip("/")
    if value:
        return value
    return "http://localhost:3000"


def _payment_public_base_url(request: FastAPIRequest) -> str:
    configured = os.getenv("PAYMENT_PUBLIC_BASE_URL", "").strip().rstrip("/")
    if configured:
        return configured
    return str(request.base_url).rstrip("/")


def _database_url() -> str:
    return os.getenv("DATABASE_URL", "").strip()


def _uses_postgres_store() -> bool:
    return _database_url().startswith(("postgres://", "postgresql://"))


def _cookie_secure() -> bool:
    return _frontend_base_url().startswith("https://")


def _session_cookie_settings() -> dict[str, Any]:
    return {
        "key": SESSION_COOKIE_NAME,
        "httponly": True,
        "secure": _cookie_secure(),
        "samesite": "lax",
        "path": "/",
        "max_age": _auth_token_ttl_seconds(),
    }


def _csrf_cookie_settings() -> dict[str, Any]:
    return {
        "key": CSRF_COOKIE_NAME,
        "httponly": False,
        "secure": _cookie_secure(),
        "samesite": "lax",
        "path": "/",
        "max_age": _auth_token_ttl_seconds(),
    }


def _extra_cors_origins() -> list[str]:
    raw = os.getenv("EXTRA_CORS_ORIGINS", "")
    return [item.strip().rstrip("/") for item in raw.split(",") if item.strip()]


def _allow_lan_origins() -> bool:
    frontend_host = urlparse(_frontend_base_url()).hostname or ""
    if frontend_host in {"localhost", "127.0.0.1"}:
        return True
    return _env_flag("ALLOW_LAN_ORIGINS", False)


def _cors_allowed_origins() -> list[str]:
    origins = {
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "https://maneradancestudio.ru",
        "https://manera.hyperconnect.fun",
        _frontend_base_url(),
        *_extra_cors_origins(),
    }
    return sorted(origin for origin in origins if origin)


def _cors_allow_origin_regex() -> str | None:
    if not _allow_lan_origins():
        return None
    return r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$"


def _hash_sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _hash_auth_token(token: str) -> str:
    return _hash_sha256(f"auth::{token}")


def _issue_csrf_cookie(response: Response) -> str:
    csrf_token = secrets.token_urlsafe(24)
    response.set_cookie(value=csrf_token, **_csrf_cookie_settings())
    return csrf_token


def _set_auth_session_cookies(response: Response, session_token: str) -> None:
    response.set_cookie(value=session_token, **_session_cookie_settings())
    _issue_csrf_cookie(response)


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    response.delete_cookie(CSRF_COOKIE_NAME, path="/")


def _extract_auth_token(request: FastAPIRequest) -> str | None:
    cookie_token = str(request.cookies.get(SESSION_COOKIE_NAME) or "").strip()
    return cookie_token or None


def _csrf_exempt_path(path: str) -> bool:
    return path in {
        "/api/auth/csrf",
        "/api/analytics",
        "/api/telegram/webhook",
        "/api/payments/provider/webhook",
    }


def _csrf_tokens_match(request: FastAPIRequest) -> bool:
    csrf_cookie = str(request.cookies.get(CSRF_COOKIE_NAME) or "").strip()
    csrf_header = str(request.headers.get(CSRF_HEADER_NAME, "")).strip()
    return bool(csrf_cookie and csrf_header and secrets.compare_digest(csrf_cookie, csrf_header))


def _enforce_csrf(request: FastAPIRequest) -> None:
    if not _csrf_tokens_match(request):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed")


def _should_enforce_session_csrf(request: FastAPIRequest) -> bool:
    if request.method.upper() in {"GET", "HEAD", "OPTIONS"}:
        return False
    path = request.url.path
    if not path.startswith("/api/") or _csrf_exempt_path(path):
        return False
    return bool(str(request.cookies.get(SESSION_COOKIE_NAME) or "").strip())


def _hash_secret_pin(pin: str) -> str:
    salt = secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), salt.encode("utf-8"), 120000)
    return f"pbkdf2_sha256${salt}${derived.hex()}"


def _verify_secret_pin(pin: str, encoded_hash: str) -> bool:
    try:
        algorithm, salt, digest = encoded_hash.split("$", 2)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256" or not salt or not digest:
        return False
    derived = hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), salt.encode("utf-8"), 120000)
    return secrets.compare_digest(derived.hex(), digest)


def _mask_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) < 4:
        return "+7 ***"
    tail = digits[-4:]
    return f"+7 *** ***-{tail[:2]}-{tail[2:]}"


def _sanitize_pin(value: str) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _validate_pin_or_raise(pin: str) -> str:
    clean = _sanitize_pin(pin)
    if len(clean) != _pin_length():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN-код должен состоять из 6 цифр")
    if clean in SIMPLE_PINS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Придумайте более сложный PIN-код")
    return clean


def _normalize_auth_token_store(store: dict[str, Any]) -> bool:
    tokens = store.get("activeTokens")
    if not isinstance(tokens, dict):
        store["activeTokens"] = {}
        return True

    changed = False
    normalized: dict[str, Any] = {}
    for raw_key, token_data in list(tokens.items()):
        record = token_data if isinstance(token_data, dict) else {"phone": _resolve_token_phone(token_data)}
        token_key = str(raw_key or "")
        if not token_key:
            changed = True
            continue
        if record.get("tokenHashVersion") == 1 and len(token_key) == 64:
            normalized[token_key] = record
            continue
        normalized[_hash_auth_token(token_key)] = {
            **record,
            "tokenHashVersion": 1,
        }
        changed = True
    if changed:
        store["activeTokens"] = normalized
    return changed


def _payment_provider_webhook_secret() -> str:
    return os.getenv("PAYMENT_PROVIDER_WEBHOOK_SECRET", "").strip()


def _verify_provider_webhook_auth(request: FastAPIRequest) -> None:
    expected_secret = _payment_provider_webhook_secret()
    if not expected_secret:
        return
    provided_secret = (
        str(request.headers.get("x-webhook-secret", "")).strip()
        or str(request.query_params.get("secret", "")).strip()
    )
    if not provided_secret or not secrets.compare_digest(provided_secret, expected_secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook secret")


def _allowed_redirect_origins() -> set[str]:
    # During domain migration we intentionally allow both canonical studio domains
    # for payment return redirects.
    allowed = {
        _frontend_base_url(),
        "https://maneradancestudio.ru",
        "https://manera.hyperconnect.fun",
        *(_extra_cors_origins()),
    }
    return {item.rstrip("/") for item in allowed if item}


def _is_safe_frontend_redirect(url_value: str) -> bool:
    try:
        parsed = urlparse(url_value.strip())
    except Exception:
        return False
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return False
    candidate = f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
    return candidate in _allowed_redirect_origins()


def _request_client_ip(request: FastAPIRequest) -> str:
    forwarded_for = str(request.headers.get("x-forwarded-for", "")).strip()
    if forwarded_for:
        return forwarded_for.split(",")[0].strip() or "unknown"
    client = request.client
    return str(client.host) if client and client.host else "unknown"


def _enforce_rate_limit(bucket: str, *, limit: int, window_ms: int, detail: str) -> None:
    now_ts = datetime.now(timezone.utc).timestamp() * 1000
    cutoff = now_ts - window_ms
    window = RATE_LIMIT_BUCKETS.setdefault(bucket, [])
    window[:] = [value for value in window if value >= cutoff]
    if len(window) >= limit:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=detail)
    window.append(now_ts)


def _is_sensitive_no_store_path(path: str) -> bool:
    return (
        path.startswith("/api/auth/")
        or path.startswith("/api/public/payment/")
        or path.startswith("/api/payments/provider/")
        or path.startswith("/activate/")
        or path.startswith("/pay/")
        or path == "/login"
    )


def _http_post_json(url: str, payload: dict[str, Any], headers: dict[str, str] | None = None) -> dict[str, Any]:
    request_headers = {"Content-Type": "application/json"}
    if headers:
        request_headers.update(headers)

    request = Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers=request_headers,
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            body = response.read().decode("utf-8") if response else ""
            return json.loads(body) if body else {}
    except HTTPError as error:
        response_body = ""
        try:
            response_body = error.read().decode("utf-8")
        except Exception:
            response_body = ""
        message = response_body.strip() or f"HTTP {error.code}"
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OTP provider error: {message}",
        )
    except URLError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OTP provider is unavailable",
        )


def _parse_datetime_query(value: str | None, *, field_name: str) -> datetime | None:
    if not value:
        return None
    text = value.strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be ISO datetime",
        )
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _parse_datetime_safe(value: Any) -> datetime | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _notificore_login() -> str:
    api_key = os.getenv("NOTIFICORE_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Notificore OTP is not configured: NOTIFICORE_API_KEY is required.",
        )
    base_url = os.getenv("NOTIFICORE_ONE_API_URL", "http://one-api.notificore.ru").strip().rstrip("/")
    response = _http_post_json(f"{base_url}/api/auth/login", {"api_key": api_key})
    bearer = response.get("bearer")
    if not isinstance(bearer, str) or not bearer.strip():
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Notificore auth failed: bearer token is missing in response.",
        )
    return bearer.strip()


def _send_otp_notificore(phone: str) -> str:
    template_id = os.getenv("NOTIFICORE_TEMPLATE_ID", "").strip()
    sender = os.getenv("NOTIFICORE_SENDER", "").strip()
    if not template_id or not sender:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Notificore OTP is not configured: NOTIFICORE_TEMPLATE_ID and NOTIFICORE_SENDER are required.",
        )

    code_digits = max(3, min(9, _env_int("NOTIFICORE_CODE_DIGITS", 6)))
    code_lifetime = max(30, min(300, _env_int("NOTIFICORE_CODE_LIFETIME_SEC", 300)))
    code_max_tries = max(1, min(5, _env_int("NOTIFICORE_CODE_MAX_TRIES", 3)))
    channel = os.getenv("NOTIFICORE_CHANNEL", "SMS").strip() or "SMS"
    sender_alt = os.getenv("NOTIFICORE_SENDER_ALT", "").strip()
    base_url = os.getenv("NOTIFICORE_ONE_API_URL", "http://one-api.notificore.ru").strip().rstrip("/")

    bearer = _notificore_login()
    payload: dict[str, Any] = {
        "recipient": _phone_to_msisdn(phone),
        "channel": channel,
        "sender": sender,
        "template_id": template_id,
        "code_lifetime": code_lifetime,
        "code_max_tries": code_max_tries,
        "code_digits": code_digits,
    }
    if sender_alt:
        payload["sender_alt"] = sender_alt

    response = _http_post_json(
        f"{base_url}/api/2fa/authentications/otp",
        payload,
        headers={"Authorization": f"Bearer {bearer}"},
    )
    data = response.get("data", {})
    auth_id = data.get("id")
    if not isinstance(auth_id, str) or not auth_id.strip():
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Notificore OTP create failed: authentication id is missing.",
        )
    return auth_id.strip()


def _verify_otp_notificore(phone: str, code: str) -> None:
    auth_id = NOTIFICORE_OTP_SESSIONS.get(phone)
    if not auth_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP session not found. Please request a new code.",
        )
    if not code.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code format.",
        )

    base_url = os.getenv("NOTIFICORE_ONE_API_URL", "http://one-api.notificore.ru").strip().rstrip("/")
    bearer = _notificore_login()
    response = _http_post_json(
        f"{base_url}/api/2fa/authentications/otp/{auth_id}/verify",
        {"access_code": int(code)},
        headers={"Authorization": f"Bearer {bearer}"},
    )
    data = response.get("data", {})
    status_value = str(data.get("status", "")).lower()
    if status_value and status_value != "verified":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code",
        )

    NOTIFICORE_OTP_SESSIONS.pop(phone, None)


def _default_store() -> dict[str, Any]:
    return {
        "users": [],
        "tasks": [],
        "news": [],
        "documents": [],
        "notifications": [],
        "landingLeads": [],
        "landingSessions": [],
        "telegramChats": [],
        "analyticsEvents": [],
        "children": [],
        "clients": [],
        "userPinAuth": [],
        "activationTokens": [],
        "paymentSessions": [],
        "paymentRecords": [],
        "paymentJournal": [],
        "activeTokens": {},
        "subscriptionPlans": [],
        "payments": [],
        "subscriptions": [],
        "ownerGroups": [],
        "ownerExpenses": [],
        "automationRules": [],
        "communicationChats": [],
        "communicationMessages": [],
        "pushSubscriptions": [],
        "securityAuditLog": [],
        "appState": {"statsResetAt": None},
        "ownerSettings": _default_owner_settings(),
        "ownerLandingSettings": _default_owner_landing_settings(),
        "ownerPricingPlans": _default_owner_pricing_plans(),
        "paymentRefSequence": {"year": datetime.now(timezone.utc).year, "value": 0},
        "invoiceSequence": {"year": datetime.now(timezone.utc).year, "value": 0},
    }


def _normalize_birth_date(value: str) -> str:
    text = value.strip()
    if len(text) == 10 and text[4] == "-" and text[7] == "-":
        # yyyy-mm-dd
        datetime.strptime(text, "%Y-%m-%d")
        return text

    if len(text) == 10 and text[2] == "." and text[5] == ".":
        # dd.mm.yyyy -> yyyy-mm-dd
        parsed = datetime.strptime(text, "%d.%m.%Y")
        return parsed.strftime("%Y-%m-%d")

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="child_birth_date должен быть в формате YYYY-MM-DD или DD.MM.YYYY",
    )


def _calculate_age_from_birth_date(value: Any) -> int | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        birth_date = datetime.strptime(value[:10], "%Y-%m-%d").date()
    except ValueError:
        return None
    today = datetime.now().date()
    age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    return max(age, 0)


def _clean_tracking_value(value: Any, max_length: int = 240) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text[:max_length]


def _normalize_tracking_source(source: Any) -> dict[str, str]:
    if not isinstance(source, dict):
        return {}
    normalized: dict[str, str] = {}
    for key in ("src", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"):
        value = _clean_tracking_value(source.get(key))
        if value:
            normalized[key] = value
    return normalized


def _serialize_tracking_payload(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return {}
    serialized: dict[str, Any] = {}
    for key, value in payload.items():
        clean_key = _clean_tracking_value(key, 80)
        if not clean_key:
            continue
        if isinstance(value, (str, int, float, bool)) or value is None:
            serialized[clean_key] = value
        else:
            serialized[clean_key] = str(value)[:500]
    return serialized


def _upsert_landing_session(
    store: dict[str, Any],
    session_id: str | None,
    source: dict[str, str] | None = None,
    *,
    user_agent: str | None = None,
    landing_path: str = "/",
) -> None:
    clean_session_id = _clean_tracking_value(session_id, 120)
    if not clean_session_id:
        return

    source_data = source or {}
    now = _utc_now_iso()
    sessions = store.setdefault("landingSessions", [])
    existing = next(
        (item for item in sessions if str(item.get("sessionId") or "") == clean_session_id),
        None,
    )
    if existing is None:
        existing = {
            "sessionId": clean_session_id,
            "firstSeenAt": now,
            "lastSeenAt": now,
            "landingPath": landing_path,
            "userAgent": user_agent or "",
        }
        sessions.append(existing)
    else:
        existing["lastSeenAt"] = now
        if user_agent:
            existing["userAgent"] = user_agent
        existing["landingPath"] = landing_path

    if source_data.get("src"):
        existing["src"] = source_data["src"]
    if source_data.get("utm_source"):
        existing["utmSource"] = source_data["utm_source"]
    if source_data.get("utm_medium"):
        existing["utmMedium"] = source_data["utm_medium"]
    if source_data.get("utm_campaign"):
        existing["utmCampaign"] = source_data["utm_campaign"]
    if source_data.get("utm_content"):
        existing["utmContent"] = source_data["utm_content"]
    if source_data.get("utm_term"):
        existing["utmTerm"] = source_data["utm_term"]


def _append_analytics_event(
    store: dict[str, Any],
    session_id: str | None,
    event_name: str,
    payload: dict[str, Any] | None = None,
) -> None:
    clean_session_id = _clean_tracking_value(session_id, 120)
    if not clean_session_id:
        return

    store.setdefault("analyticsEvents", []).append(
        {
            "id": _new_id("analytics"),
            "sessionId": clean_session_id,
            "eventName": event_name,
            "payload": _serialize_tracking_payload(payload or {}),
            "createdAt": _utc_now_iso(),
        }
    )


def _stats_api_token() -> str:
    return os.getenv("STATS_API_TOKEN", "").strip()


def _require_stats_token(request: FastAPIRequest) -> None:
    expected = _stats_api_token()
    if not expected:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Stats API disabled")

    provided = request.headers.get("x-stats-token", "").strip()
    authorization = request.headers.get("authorization", "").strip()
    if authorization.lower().startswith("bearer "):
        provided = authorization[7:].strip()

    if provided != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


def _resolve_stats_range(request: FastAPIRequest, default_days: int = 7) -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    raw_from = request.query_params.get("from")
    raw_to = request.query_params.get("to")
    if raw_from and raw_to:
        try:
            date_from = datetime.strptime(raw_from[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            date_to = datetime.strptime(raw_to[:10], "%Y-%m-%d").replace(
                hour=23,
                minute=59,
                second=59,
                microsecond=999999,
                tzinfo=timezone.utc,
            )
            if date_from <= date_to:
                return date_from, date_to
        except Exception:
            pass
    days_raw = request.query_params.get("days", str(default_days))
    try:
        days = max(1, min(int(days_raw), 365))
    except ValueError:
        days = default_days
    date_to = now
    date_from = now - timedelta(days=days)
    return date_from, date_to


def _is_in_stats_range(value: Any, date_from: datetime, date_to: datetime) -> bool:
    parsed = _parse_datetime_safe(value)
    if parsed is None:
        return False
    return date_from <= parsed <= date_to


def _ensure_store_shape(store: dict[str, Any]) -> bool:
    changed = False
    list_keys = [
        "tasks",
        "news",
        "documents",
        "notifications",
        "landingLeads",
        "landingSessions",
        "telegramChats",
        "analyticsEvents",
        "children",
        "clients",
        "userPinAuth",
        "activationTokens",
        "paymentSessions",
        "paymentRecords",
        "paymentJournal",
        "ownerGroups",
        "ownerExpenses",
        "automationRules",
        "communicationChats",
        "communicationMessages",
        "pushSubscriptions",
        "ownerPricingPlans",
    ]
    for key in list_keys:
        if key not in store or not isinstance(store.get(key), list):
            store[key] = []
            changed = True

    if "users" not in store or not isinstance(store.get("users"), list):
        store["users"] = []
        changed = True
    if "activeTokens" not in store or not isinstance(store.get("activeTokens"), dict):
        store["activeTokens"] = {}
        changed = True
    elif _normalize_auth_token_store(store):
        changed = True
    if "appState" not in store or not isinstance(store.get("appState"), dict):
        store["appState"] = {"statsResetAt": None}
        changed = True
    elif "statsResetAt" not in store["appState"]:
        store["appState"]["statsResetAt"] = None
        changed = True
    if "invoiceSequence" not in store or not isinstance(store.get("invoiceSequence"), dict):
        store["invoiceSequence"] = {"year": datetime.now(timezone.utc).year, "value": 0}
        changed = True

    if "ownerSettings" not in store or not isinstance(store.get("ownerSettings"), dict):
        store["ownerSettings"] = _default_owner_settings()
        changed = True
    else:
        defaults = _default_owner_settings()
        for key, value in defaults.items():
            if key not in store["ownerSettings"]:
                store["ownerSettings"][key] = value
                changed = True

    if "ownerLandingSettings" not in store or not isinstance(store.get("ownerLandingSettings"), dict):
        store["ownerLandingSettings"] = _default_owner_landing_settings()
        changed = True
    else:
        defaults = _default_owner_landing_settings()
        for key, value in defaults.items():
            if key not in store["ownerLandingSettings"]:
                store["ownerLandingSettings"][key] = value
                changed = True

    if "ownerPricingPlans" not in store or not isinstance(store.get("ownerPricingPlans"), list):
        store["ownerPricingPlans"] = _default_owner_pricing_plans()
        changed = True
    else:
        plans = store["ownerPricingPlans"]
        by_code = {str(item.get("code", "")).lower(): item for item in plans if isinstance(item, dict)}
        for preset in _default_owner_pricing_plans():
            code = str(preset["code"]).lower()
            target = by_code.get(code)
            if target is None:
                plans.append(preset)
                changed = True
                continue
            for key, value in preset.items():
                if key not in target:
                    target[key] = value
                    changed = True

    for user in store["users"]:
        role = str(user.get("role", "parent"))
        if role not in {"parent", "teacher", "admin", "owner"}:
            user["role"] = "parent"
            role = "parent"
            changed = True
        if "id" not in user:
            user["id"] = _new_id(f"user-{role}")
            changed = True
        if "name" not in user:
            user["name"] = user.get("phone", user["id"])
            changed = True
        if "phone" not in user:
            user["phone"] = f"+7{secrets.randbelow(10**10):010d}"
            changed = True
        if "access_level" not in user:
            user["access_level"] = "full"
            changed = True
        if "account_status" not in user:
            user["account_status"] = "active"
            changed = True
        if "portal_status" not in user:
            if role == "parent":
                user["portal_status"] = "activated" if (
                    str(user.get("access_level")) == "full"
                    and str(user.get("account_status")) == "active"
                ) else "not_created"
            else:
                user["portal_status"] = "activated"
            changed = True
        if "portal_activated_at" not in user:
            user["portal_activated_at"] = user.get("updated_at") if user.get("portal_status") == "activated" else None
            changed = True
        if "portal_blocked_at" not in user:
            user["portal_blocked_at"] = None
            changed = True
        if "last_login_at" not in user:
            user["last_login_at"] = None
            changed = True
        if "updated_at" not in user:
            user["updated_at"] = _utc_now_iso()
            changed = True

    for child in store.get("children", []):
        if "id" not in child:
            child["id"] = _new_id("child")
            changed = True
        if "fullName" not in child:
            child["fullName"] = "Ученик"
            changed = True
        if "groupId" not in child:
            child["groupId"] = None
            changed = True
        if "updatedAt" not in child:
            child["updatedAt"] = _utc_now_iso()
            changed = True
        if "createdAt" not in child:
            child["createdAt"] = child["updatedAt"]
            changed = True

    for client in store.get("clients", []):
        if "childId" in client:
            pass
        else:
            parent_id = str(client.get("parentUserId") or "")
            first_child = next((item for item in store.get("children", []) if str(item.get("parentUserId") or "") == parent_id), None)
            if first_child:
                client["childId"] = first_child.get("id")
                changed = True
            elif "childId" not in client:
                client["childId"] = ""
                changed = True
        if "portalStatus" not in client:
            parent_user = _find_user_by_id(store, str(client.get("parentUserId") or ""))
            client["portalStatus"] = str((parent_user or {}).get("portal_status") or "not_created")
            changed = True
        if "portalActivatedAt" not in client:
            parent_user = _find_user_by_id(store, str(client.get("parentUserId") or ""))
            client["portalActivatedAt"] = (parent_user or {}).get("portal_activated_at")
            changed = True
        if "portalBlockedAt" not in client:
            parent_user = _find_user_by_id(store, str(client.get("parentUserId") or ""))
            client["portalBlockedAt"] = (parent_user or {}).get("portal_blocked_at")
            changed = True

    if payment_service.ensure_store_shape(store):
        changed = True
    if _sync_subscription_plans_from_owner_pricing(store):
        changed = True
    _sync_subscription_catalog_from_owner_pricing(store)

    for payment in store.get("paymentRecords", []):
        if _ensure_legacy_payment_shape(store, payment):
            changed = True

    if _recalculate_group_student_counts(store):
        changed = True

    return changed


def _get_postgres_connection():
    database_url = _database_url()
    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured")
    if psycopg2 is None:
        raise RuntimeError("psycopg2 is required for PostgreSQL storage backend")
    return psycopg2.connect(database_url)


def _jsonb_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return value if isinstance(value, dict) else {}


def _normalized_postgres_row_count(conn, table_name: str) -> int:
    with conn.cursor() as cursor:
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        row = cursor.fetchone()
    return int((row or [0])[0] or 0)


def _postgres_collection_row_count(conn, collection_name: str) -> int:
    table_name = POSTGRES_GENERIC_COLLECTION_TABLES.get(collection_name, "crm_collection_entities")
    with conn.cursor() as cursor:
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        row = cursor.fetchone()
    return int((row or [0])[0] or 0)


def _postgres_dedicated_collection_row_count(conn, table_name: str) -> int:
    return _normalized_postgres_row_count(conn, table_name)


def _collection_entity_identifier(collection_name: str, item: dict[str, Any], index: int) -> str:
    for key in ("id", "code", "sessionId", "chatId", "messageId", "ruleId", "paymentReference", "title", "name"):
        value = str(item.get(key) or "").strip()
        if value:
            return value[:180]
    return f"{collection_name}:{index}"


def _strip_runtime_entities_for_app_store(data: dict[str, Any]) -> dict[str, Any]:
    payload = json.loads(json.dumps(data, ensure_ascii=False))
    for key in (*POSTGRES_DIRECT_ENTITY_KEYS, *POSTGRES_COLLECTION_KEYS):
        payload.pop(key, None)
    return payload


def _app_store_payload_contains_runtime_entities(data: dict[str, Any]) -> bool:
    return any(key in data for key in (*POSTGRES_DIRECT_ENTITY_KEYS, *POSTGRES_COLLECTION_KEYS))


def _sync_postgres_normalized_entities(conn, store: dict[str, Any]) -> None:
    users = [item for item in store.get("users", []) if isinstance(item, dict) and str(item.get("id") or "").strip()]
    pin_auth_rows = [
        item for item in store.get("userPinAuth", []) if isinstance(item, dict) and str(item.get("id") or "").strip()
    ]
    activation_rows = [
        item for item in store.get("activationTokens", []) if isinstance(item, dict) and str(item.get("id") or "").strip()
    ]
    payment_session_rows = [
        item for item in store.get("paymentSessions", []) if isinstance(item, dict) and str(item.get("id") or "").strip()
    ]
    payment_rows = [
        item for item in store.get("paymentRecords", []) if isinstance(item, dict) and str(item.get("id") or "").strip()
    ]
    auth_sessions = [
        (str(token_hash or "").strip(), token_data)
        for token_hash, token_data in (store.get("activeTokens") or {}).items()
        if str(token_hash or "").strip() and isinstance(token_data, dict)
    ]

    with conn.cursor() as cursor:
        for table_name in (
            "crm_user_pin_auth",
            "crm_activation_tokens",
            "crm_payment_sessions",
            "crm_payment_records",
            "crm_auth_sessions",
            "crm_users",
        ):
            cursor.execute(f"DELETE FROM {table_name}")

        if users:
            cursor.executemany(
                """
                INSERT INTO crm_users (
                    user_id, phone, role, access_level, account_status, portal_status,
                    portal_activated_at, portal_blocked_at, last_login_at, updated_at, payload
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    (
                        str(item.get("id") or ""),
                        str(item.get("phone") or ""),
                        str(item.get("role") or "parent"),
                        str(item.get("access_level") or "full"),
                        str(item.get("account_status") or "active"),
                        str(item.get("portal_status") or "not_created"),
                        item.get("portal_activated_at"),
                        item.get("portal_blocked_at"),
                        item.get("last_login_at"),
                        item.get("updated_at"),
                        PsycopgJson(item),
                    )
                    for item in users
                ],
            )

        if pin_auth_rows:
            cursor.executemany(
                """
                INSERT INTO crm_user_pin_auth (
                    auth_id, parent_user_id, pin_hash, pin_set_at, failed_attempts,
                    locked_until, is_disabled, created_at, updated_at, payload
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    (
                        str(item.get("id") or ""),
                        str(item.get("parentUserId") or ""),
                        str(item.get("pinHash") or ""),
                        item.get("pinSetAt"),
                        int(item.get("failedAttempts") or 0),
                        item.get("lockedUntil"),
                        bool(item.get("isDisabled")),
                        item.get("createdAt"),
                        item.get("updatedAt"),
                        PsycopgJson(item),
                    )
                    for item in pin_auth_rows
                ],
            )

        if activation_rows:
            cursor.executemany(
                """
                INSERT INTO crm_activation_tokens (
                    activation_id, parent_user_id, payment_id, token_hash, purpose, source_flow,
                    expires_at, is_used, used_at, created_at, created_by_admin_id, revoked, payload
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    (
                        str(item.get("id") or ""),
                        str(item.get("parentUserId") or ""),
                        str(item.get("paymentId") or "") or None,
                        str(item.get("tokenHash") or ""),
                        str(item.get("purpose") or ""),
                        str(item.get("sourceFlow") or ""),
                        item.get("expiresAt"),
                        bool(item.get("isUsed")),
                        item.get("usedAt"),
                        item.get("createdAt"),
                        str(item.get("createdByAdminId") or "") or None,
                        bool(item.get("revoked")),
                        PsycopgJson(item),
                    )
                    for item in activation_rows
                ],
            )

        if payment_session_rows:
            cursor.executemany(
                """
                INSERT INTO crm_payment_sessions (
                    session_id, parent_user_id, payment_id, token_hash, status,
                    expires_at, created_at, last_used_at, payload
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    (
                        str(item.get("id") or ""),
                        str(item.get("parentUserId") or ""),
                        str(item.get("paymentId") or ""),
                        str(item.get("tokenHash") or ""),
                        str(item.get("status") or "active"),
                        item.get("expiresAt"),
                        item.get("createdAt"),
                        item.get("lastUsedAt"),
                        PsycopgJson(item),
                    )
                    for item in payment_session_rows
                ],
            )

        if payment_rows:
            cursor.executemany(
                """
                INSERT INTO crm_payment_records (
                    payment_id, client_id, parent_user_id, parent_phone, status, payment_method,
                    amount, currency, invoice_number, due_date, service_start_date,
                    provider_payment_id, paid_at, status_updated_at, created_at, updated_at, payload
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    (
                        str(item.get("id") or ""),
                        str(item.get("clientId") or ""),
                        str(item.get("parentUserId") or ""),
                        str(item.get("parentPhone") or ""),
                        str(item.get("status") or "pending"),
                        str(item.get("paymentMethod") or ""),
                        float(item.get("amount") or 0),
                        str(item.get("currency") or "RUB"),
                        str(item.get("invoiceNumber") or ""),
                        item.get("dueDate"),
                        item.get("serviceStartDate"),
                        str(item.get("providerPaymentId") or "") or None,
                        item.get("paidAt"),
                        item.get("statusUpdatedAt"),
                        item.get("createdAt"),
                        item.get("updatedAt"),
                        PsycopgJson(item),
                    )
                    for item in payment_rows
                ],
            )

        if auth_sessions:
            cursor.executemany(
                """
                INSERT INTO crm_auth_sessions (
                    token_hash, phone, issued_at, expires_at, token_hash_version, payload
                ) VALUES (%s, %s, %s, %s, %s, %s)
                """,
                [
                    (
                        token_hash,
                        str(token_data.get("phone") or ""),
                        token_data.get("issuedAt"),
                        token_data.get("expiresAt"),
                        int(token_data.get("tokenHashVersion") or 1),
                        PsycopgJson(token_data),
                    )
                    for token_hash, token_data in auth_sessions
                ],
            )


def _sync_postgres_collection_entities(conn, store: dict[str, Any]) -> None:
    with conn.cursor() as cursor:
        cursor.execute(
            "DELETE FROM crm_collection_entities WHERE collection_name = ANY(%s)",
            (list(POSTGRES_COLLECTION_KEYS),),
        )
        for collection_name in POSTGRES_GENERIC_COLLECTION_KEYS:
            table_name = POSTGRES_GENERIC_COLLECTION_TABLES[collection_name]
            cursor.execute(f"DELETE FROM {table_name}")
            items = store.get(collection_name, [])
            if not isinstance(items, list):
                continue
            rows: list[tuple[str, int, Any]] = []
            for index, item in enumerate(items):
                if not isinstance(item, dict):
                    continue
                rows.append(
                    (
                        _collection_entity_identifier(collection_name, item, index),
                        index,
                        PsycopgJson(item),
                    )
                )
            if rows:
                cursor.executemany(
                    f"""
                    INSERT INTO {table_name} (
                        entity_id, sort_index, payload
                    ) VALUES (%s, %s, %s)
                    """,
                    rows,
                )


def _sync_postgres_dedicated_collections(conn, store: dict[str, Any]) -> None:
    notifications = [item for item in store.get("notifications", []) if isinstance(item, dict)]
    children = [item for item in store.get("children", []) if isinstance(item, dict)]
    clients = [item for item in store.get("clients", []) if isinstance(item, dict)]
    owner_groups = [item for item in store.get("ownerGroups", []) if isinstance(item, dict)]
    owner_expenses = [item for item in store.get("ownerExpenses", []) if isinstance(item, dict)]
    owner_pricing_plans = [item for item in store.get("ownerPricingPlans", []) if isinstance(item, dict)]

    with conn.cursor() as cursor:
        for table_name in (
            "crm_notifications",
            "crm_children",
            "crm_clients",
            "crm_owner_groups",
            "crm_owner_expenses",
            "crm_owner_pricing_plans",
        ):
            cursor.execute(f"DELETE FROM {table_name}")

        if notifications:
            cursor.executemany(
                """
                INSERT INTO crm_notifications (
                    notification_id, user_id, type_value, is_read, created_at, sort_index, payload
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    (
                        str(item.get("id") or _collection_entity_identifier("notifications", item, index)),
                        str(item.get("userId") or ""),
                        str(item.get("type") or ""),
                        bool(item.get("read")),
                        item.get("createdAt"),
                        index,
                        PsycopgJson(item),
                    )
                    for index, item in enumerate(notifications)
                ],
            )

        if children:
            cursor.executemany(
                """
                INSERT INTO crm_children (
                    child_id, parent_user_id, group_id, full_name, updated_at, sort_index, payload
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    (
                        str(item.get("id") or _collection_entity_identifier("children", item, index)),
                        str(item.get("parentUserId") or ""),
                        str(item.get("groupId") or "") or None,
                        str(item.get("fullName") or ""),
                        item.get("updatedAt"),
                        index,
                        PsycopgJson(item),
                    )
                    for index, item in enumerate(children)
                ],
            )

        if clients:
            cursor.executemany(
                """
                INSERT INTO crm_clients (
                    client_id, parent_user_id, child_id, payment_status, updated_at, sort_index, payload
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    (
                        str(item.get("id") or _collection_entity_identifier("clients", item, index)),
                        str(item.get("parentUserId") or ""),
                        str(item.get("childId") or "") or None,
                        str(item.get("paymentStatus") or ""),
                        item.get("updatedAt"),
                        index,
                        PsycopgJson(item),
                    )
                    for index, item in enumerate(clients)
                ],
            )

        if owner_groups:
            cursor.executemany(
                """
                INSERT INTO crm_owner_groups (
                    group_id, teacher_id, student_count, updated_at, sort_index, payload
                ) VALUES (%s, %s, %s, %s, %s, %s)
                """,
                [
                    (
                        str(item.get("id") or _collection_entity_identifier("ownerGroups", item, index)),
                        str(item.get("teacherId") or "") or None,
                        int(item.get("studentCount") or 0),
                        item.get("updatedAt"),
                        index,
                        PsycopgJson(item),
                    )
                    for index, item in enumerate(owner_groups)
                ],
            )

        if owner_expenses:
            cursor.executemany(
                """
                INSERT INTO crm_owner_expenses (
                    expense_id, status_value, due_date, updated_at, sort_index, payload
                ) VALUES (%s, %s, %s, %s, %s, %s)
                """,
                [
                    (
                        str(item.get("id") or _collection_entity_identifier("ownerExpenses", item, index)),
                        str(item.get("status") or ""),
                        item.get("date") or item.get("dueDate"),
                        item.get("updatedAt"),
                        index,
                        PsycopgJson(item),
                    )
                    for index, item in enumerate(owner_expenses)
                ],
            )

        if owner_pricing_plans:
            cursor.executemany(
                """
                INSERT INTO crm_owner_pricing_plans (
                    plan_id, code, title, is_active, updated_at, sort_index, payload
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    (
                        str(item.get("id") or _collection_entity_identifier("ownerPricingPlans", item, index)),
                        str(item.get("code") or ""),
                        str(item.get("title") or ""),
                        bool(item.get("isActive", True)),
                        item.get("updatedAt"),
                        index,
                        PsycopgJson(item),
                    )
                    for index, item in enumerate(owner_pricing_plans)
                ],
            )


def _hydrate_store_from_postgres_entities(conn, payload: dict[str, Any]) -> dict[str, Any]:
    with conn.cursor() as cursor:
        cursor.execute("SELECT payload FROM crm_users ORDER BY updated_at NULLS LAST, user_id")
        payload["users"] = [_jsonb_dict(row[0]) for row in cursor.fetchall()]

        cursor.execute("SELECT payload FROM crm_user_pin_auth ORDER BY updated_at NULLS LAST, auth_id")
        payload["userPinAuth"] = [_jsonb_dict(row[0]) for row in cursor.fetchall()]

        cursor.execute("SELECT payload FROM crm_activation_tokens ORDER BY created_at DESC NULLS LAST, activation_id")
        payload["activationTokens"] = [_jsonb_dict(row[0]) for row in cursor.fetchall()]

        cursor.execute("SELECT payload FROM crm_payment_sessions ORDER BY created_at DESC NULLS LAST, session_id")
        payload["paymentSessions"] = [_jsonb_dict(row[0]) for row in cursor.fetchall()]

        cursor.execute("SELECT payload FROM crm_payment_records ORDER BY created_at DESC NULLS LAST, payment_id")
        payload["paymentRecords"] = [_jsonb_dict(row[0]) for row in cursor.fetchall()]

        cursor.execute("SELECT token_hash, payload FROM crm_auth_sessions")
        payload["activeTokens"] = {
            str(row[0] or ""): _jsonb_dict(row[1])
            for row in cursor.fetchall()
            if str(row[0] or "").strip()
        }
        cursor.execute("SELECT payload FROM crm_notifications ORDER BY sort_index ASC, notification_id ASC")
        payload["notifications"] = [_jsonb_dict(row[0]) for row in cursor.fetchall()]

        cursor.execute("SELECT payload FROM crm_children ORDER BY sort_index ASC, child_id ASC")
        payload["children"] = [_jsonb_dict(row[0]) for row in cursor.fetchall()]

        cursor.execute("SELECT payload FROM crm_clients ORDER BY sort_index ASC, client_id ASC")
        payload["clients"] = [_jsonb_dict(row[0]) for row in cursor.fetchall()]

        cursor.execute("SELECT payload FROM crm_owner_groups ORDER BY sort_index ASC, group_id ASC")
        payload["ownerGroups"] = [_jsonb_dict(row[0]) for row in cursor.fetchall()]

        cursor.execute("SELECT payload FROM crm_owner_expenses ORDER BY sort_index ASC, expense_id ASC")
        payload["ownerExpenses"] = [_jsonb_dict(row[0]) for row in cursor.fetchall()]

        cursor.execute("SELECT payload FROM crm_owner_pricing_plans ORDER BY sort_index ASC, plan_id ASC")
        payload["ownerPricingPlans"] = [_jsonb_dict(row[0]) for row in cursor.fetchall()]
        for collection_name in POSTGRES_GENERIC_COLLECTION_KEYS:
            table_name = POSTGRES_GENERIC_COLLECTION_TABLES[collection_name]
            cursor.execute(f"SELECT payload FROM {table_name} ORDER BY sort_index ASC, entity_id ASC")
            payload[collection_name] = [_jsonb_dict(row[0]) for row in cursor.fetchall()]
        cursor.execute(
            """
            SELECT id, created_at, event_type, outcome, actor_user_id, target_user_id, request_ip, user_agent, metadata
            FROM security_audit_log
            ORDER BY created_at DESC, id DESC
            LIMIT 1000
            """
        )
        payload["securityAuditLog"] = [
            {
                "id": str(row[0] or ""),
                "createdAt": row[1].isoformat() if row[1] else None,
                "eventType": str(row[2] or ""),
                "outcome": str(row[3] or ""),
                "actorUserId": row[4],
                "targetUserId": row[5],
                "requestIp": row[6],
                "userAgent": row[7],
                "metadata": _jsonb_dict(row[8]),
            }
            for row in cursor.fetchall()
        ]
    return payload


def _seed_postgres_normalized_entities_if_needed(conn, payload: dict[str, Any]) -> None:
    should_seed = False
    if payload.get("users") and _normalized_postgres_row_count(conn, "crm_users") == 0:
        should_seed = True
    elif payload.get("userPinAuth") and _normalized_postgres_row_count(conn, "crm_user_pin_auth") == 0:
        should_seed = True
    elif payload.get("activationTokens") and _normalized_postgres_row_count(conn, "crm_activation_tokens") == 0:
        should_seed = True
    elif payload.get("paymentSessions") and _normalized_postgres_row_count(conn, "crm_payment_sessions") == 0:
        should_seed = True
    elif payload.get("paymentRecords") and _normalized_postgres_row_count(conn, "crm_payment_records") == 0:
        should_seed = True
    elif payload.get("activeTokens") and _normalized_postgres_row_count(conn, "crm_auth_sessions") == 0:
        should_seed = True
    elif payload.get("notifications") and _postgres_dedicated_collection_row_count(conn, "crm_notifications") == 0:
        should_seed = True
    elif payload.get("children") and _postgres_dedicated_collection_row_count(conn, "crm_children") == 0:
        should_seed = True
    elif payload.get("clients") and _postgres_dedicated_collection_row_count(conn, "crm_clients") == 0:
        should_seed = True
    elif payload.get("ownerGroups") and _postgres_dedicated_collection_row_count(conn, "crm_owner_groups") == 0:
        should_seed = True
    elif payload.get("ownerExpenses") and _postgres_dedicated_collection_row_count(conn, "crm_owner_expenses") == 0:
        should_seed = True
    elif payload.get("ownerPricingPlans") and _postgres_dedicated_collection_row_count(conn, "crm_owner_pricing_plans") == 0:
        should_seed = True
    elif any(payload.get(collection_name) for collection_name in POSTGRES_COLLECTION_KEYS) and any(
        _postgres_collection_row_count(conn, collection_name) == 0 for collection_name in POSTGRES_GENERIC_COLLECTION_KEYS
    ):
        should_seed = True
    if should_seed:
        _sync_postgres_normalized_entities(conn, payload)
        _sync_postgres_dedicated_collections(conn, payload)
        _sync_postgres_collection_entities(conn, payload)


def _ensure_postgres_schema(conn) -> None:
    # The schema is idempotent but costs ~32 DDL statements, which used to run on
    # every single request. Once per process is enough.
    global _POSTGRES_SCHEMA_READY
    if _POSTGRES_SCHEMA_READY:
        return

    with conn.cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS app_store (
                store_key TEXT PRIMARY KEY,
                payload JSONB NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS security_audit_log (
                id TEXT PRIMARY KEY,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                event_type TEXT NOT NULL,
                outcome TEXT NOT NULL,
                actor_user_id TEXT NULL,
                target_user_id TEXT NULL,
                request_ip TEXT NULL,
                user_agent TEXT NULL,
                metadata JSONB NOT NULL DEFAULT '{}'::jsonb
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS crm_users (
                user_id TEXT PRIMARY KEY,
                phone TEXT NOT NULL,
                role TEXT NOT NULL,
                access_level TEXT NOT NULL,
                account_status TEXT NOT NULL,
                portal_status TEXT NOT NULL,
                portal_activated_at TIMESTAMPTZ NULL,
                portal_blocked_at TIMESTAMPTZ NULL,
                last_login_at TIMESTAMPTZ NULL,
                updated_at TIMESTAMPTZ NULL,
                payload JSONB NOT NULL
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_crm_users_phone ON crm_users (phone)")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS crm_user_pin_auth (
                auth_id TEXT PRIMARY KEY,
                parent_user_id TEXT NOT NULL UNIQUE,
                pin_hash TEXT NOT NULL,
                pin_set_at TIMESTAMPTZ NULL,
                failed_attempts INTEGER NOT NULL DEFAULT 0,
                locked_until TIMESTAMPTZ NULL,
                is_disabled BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NULL,
                updated_at TIMESTAMPTZ NULL,
                payload JSONB NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS crm_activation_tokens (
                activation_id TEXT PRIMARY KEY,
                parent_user_id TEXT NOT NULL,
                payment_id TEXT NULL,
                token_hash TEXT NOT NULL UNIQUE,
                purpose TEXT NOT NULL,
                source_flow TEXT NOT NULL,
                expires_at TIMESTAMPTZ NULL,
                is_used BOOLEAN NOT NULL DEFAULT FALSE,
                used_at TIMESTAMPTZ NULL,
                created_at TIMESTAMPTZ NULL,
                created_by_admin_id TEXT NULL,
                revoked BOOLEAN NOT NULL DEFAULT FALSE,
                payload JSONB NOT NULL
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_crm_activation_tokens_parent ON crm_activation_tokens (parent_user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_crm_activation_tokens_payment ON crm_activation_tokens (payment_id)")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS crm_payment_sessions (
                session_id TEXT PRIMARY KEY,
                parent_user_id TEXT NOT NULL,
                payment_id TEXT NOT NULL,
                token_hash TEXT NOT NULL UNIQUE,
                status TEXT NOT NULL,
                expires_at TIMESTAMPTZ NULL,
                created_at TIMESTAMPTZ NULL,
                last_used_at TIMESTAMPTZ NULL,
                payload JSONB NOT NULL
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_crm_payment_sessions_parent ON crm_payment_sessions (parent_user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_crm_payment_sessions_payment ON crm_payment_sessions (payment_id)")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS crm_payment_records (
                payment_id TEXT PRIMARY KEY,
                client_id TEXT NULL,
                parent_user_id TEXT NULL,
                parent_phone TEXT NULL,
                status TEXT NOT NULL,
                payment_method TEXT NULL,
                amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
                currency TEXT NOT NULL DEFAULT 'RUB',
                invoice_number TEXT NULL,
                due_date DATE NULL,
                service_start_date DATE NULL,
                provider_payment_id TEXT NULL,
                paid_at TIMESTAMPTZ NULL,
                status_updated_at TIMESTAMPTZ NULL,
                created_at TIMESTAMPTZ NULL,
                updated_at TIMESTAMPTZ NULL,
                payload JSONB NOT NULL
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_crm_payment_records_parent ON crm_payment_records (parent_user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_crm_payment_records_client ON crm_payment_records (client_id)")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS crm_auth_sessions (
                token_hash TEXT PRIMARY KEY,
                phone TEXT NOT NULL,
                issued_at TIMESTAMPTZ NULL,
                expires_at TIMESTAMPTZ NULL,
                token_hash_version INTEGER NOT NULL DEFAULT 1,
                payload JSONB NOT NULL
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_crm_auth_sessions_phone ON crm_auth_sessions (phone)")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS crm_collection_entities (
                collection_name TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                sort_index INTEGER NOT NULL,
                payload JSONB NOT NULL,
                PRIMARY KEY (collection_name, entity_id)
            )
            """
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_crm_collection_entities_collection_sort ON crm_collection_entities (collection_name, sort_index)"
        )
        for table_name in POSTGRES_GENERIC_COLLECTION_TABLES.values():
            cursor.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {table_name} (
                    entity_id TEXT PRIMARY KEY,
                    sort_index INTEGER NOT NULL,
                    payload JSONB NOT NULL
                )
                """
            )
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_sort ON {table_name} (sort_index)")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS crm_notifications (
                notification_id TEXT PRIMARY KEY,
                user_id TEXT NULL,
                type_value TEXT NULL,
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NULL,
                sort_index INTEGER NOT NULL,
                payload JSONB NOT NULL
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_crm_notifications_user_id ON crm_notifications (user_id)")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS crm_children (
                child_id TEXT PRIMARY KEY,
                parent_user_id TEXT NULL,
                group_id TEXT NULL,
                full_name TEXT NULL,
                updated_at TIMESTAMPTZ NULL,
                sort_index INTEGER NOT NULL,
                payload JSONB NOT NULL
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_crm_children_parent_user_id ON crm_children (parent_user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_crm_children_group_id ON crm_children (group_id)")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS crm_clients (
                client_id TEXT PRIMARY KEY,
                parent_user_id TEXT NULL,
                child_id TEXT NULL,
                payment_status TEXT NULL,
                updated_at TIMESTAMPTZ NULL,
                sort_index INTEGER NOT NULL,
                payload JSONB NOT NULL
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_crm_clients_parent_user_id ON crm_clients (parent_user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_crm_clients_child_id ON crm_clients (child_id)")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS crm_owner_groups (
                group_id TEXT PRIMARY KEY,
                teacher_id TEXT NULL,
                student_count INTEGER NOT NULL DEFAULT 0,
                updated_at TIMESTAMPTZ NULL,
                sort_index INTEGER NOT NULL,
                payload JSONB NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS crm_owner_expenses (
                expense_id TEXT PRIMARY KEY,
                status_value TEXT NULL,
                due_date DATE NULL,
                updated_at TIMESTAMPTZ NULL,
                sort_index INTEGER NOT NULL,
                payload JSONB NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS crm_owner_pricing_plans (
                plan_id TEXT PRIMARY KEY,
                code TEXT NULL,
                title TEXT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                updated_at TIMESTAMPTZ NULL,
                sort_index INTEGER NOT NULL,
                payload JSONB NOT NULL
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_crm_owner_pricing_plans_code ON crm_owner_pricing_plans (code)")
    conn.commit()
    # Only after a clean commit, so a failed run is retried on the next call.
    _POSTGRES_SCHEMA_READY = True


def _read_store_from_postgres() -> tuple[dict[str, Any], bool]:
    """Return the hydrated store and whether app_store still holds legacy runtime entities."""
    with _get_postgres_connection() as conn:
        _ensure_postgres_schema(conn)
        with conn.cursor() as cursor:
            cursor.execute("SELECT payload FROM app_store WHERE store_key = %s", ("primary",))
            row = cursor.fetchone()
            if row and row[0]:
                payload = row[0]
                if isinstance(payload, str):
                    payload = json.loads(payload)
                if isinstance(payload, dict):
                    # Must be checked on the raw payload: hydration below adds these very
                    # keys back, which would make the check true on every single read.
                    has_legacy_entities = _app_store_payload_contains_runtime_entities(payload)
                    _seed_postgres_normalized_entities_if_needed(conn, payload)
                    return _hydrate_store_from_postgres_entities(conn, payload), has_legacy_entities
    return {}, False


def _write_store_to_postgres(data: dict[str, Any]) -> None:
    with _get_postgres_connection() as conn:
        _ensure_postgres_schema(conn)
        app_store_payload = _strip_runtime_entities_for_app_store(data)
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO app_store (store_key, payload, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (store_key)
                DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
                """,
                ("primary", PsycopgJson(app_store_payload)),
            )
            _sync_postgres_normalized_entities(conn, data)
            _sync_postgres_dedicated_collections(conn, data)
            _sync_postgres_collection_entities(conn, data)
        conn.commit()


def _append_postgres_security_audit_entry(entry: dict[str, Any]) -> None:
    if not _uses_postgres_store():
        return
    with _get_postgres_connection() as conn:
        _ensure_postgres_schema(conn)
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO security_audit_log (
                    id, created_at, event_type, outcome, actor_user_id, target_user_id, request_ip, user_agent, metadata
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    str(entry.get("id") or ""),
                    str(entry.get("createdAt") or _utc_now_iso()),
                    str(entry.get("eventType") or "unknown"),
                    str(entry.get("outcome") or "unknown"),
                    entry.get("actorUserId"),
                    entry.get("targetUserId"),
                    entry.get("requestIp"),
                    entry.get("userAgent"),
                    PsycopgJson(entry.get("metadata") or {}),
                ),
            )
        conn.commit()


def _append_security_audit_event(
    store: dict[str, Any],
    *,
    event_type: str,
    outcome: str,
    actor_user_id: str | None = None,
    target_user_id: str | None = None,
    request: FastAPIRequest | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    entry = {
        "id": _new_id("security-audit"),
        "createdAt": _utc_now_iso(),
        "eventType": event_type,
        "outcome": outcome,
        "actorUserId": actor_user_id,
        "targetUserId": target_user_id,
        "requestIp": _request_client_ip(request) if request else None,
        "userAgent": str(request.headers.get("user-agent", "")).strip() if request else None,
        "metadata": metadata or {},
    }
    audit_log = store.setdefault("securityAuditLog", [])
    if isinstance(audit_log, list):
        audit_log.insert(0, entry)
        del audit_log[1000:]
    if _uses_postgres_store():
        _append_postgres_security_audit_entry(entry)


def _read_store() -> dict[str, Any]:
    with LOCK:
        if _uses_postgres_store():
            try:
                data, has_legacy_entities = _read_store_from_postgres()
            except Exception:
                data = {}
                has_legacy_entities = False
            if not data:
                if DATA_FILE.exists():
                    try:
                        data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
                    except json.JSONDecodeError:
                        data = _default_store()
                else:
                    data = _default_store()
                if _ensure_store_shape(data):
                    pass
                if _cleanup_expired_tokens(data):
                    pass
                _write_store_to_postgres(data)
                return data
            changed = False
            if has_legacy_entities:
                changed = True
            if _ensure_store_shape(data):
                changed = True
            if _cleanup_expired_tokens(data):
                changed = True
            if changed:
                _write_store_to_postgres(data)
            return data

        if not DATA_FILE.exists():
            data = _default_store()
            DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            return data

        try:
            data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            data = _default_store()
            DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            return data

        if _ensure_store_shape(data):
            DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        if _cleanup_expired_tokens(data):
            DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return data


def _write_store(data: dict[str, Any]) -> None:
    with LOCK:
        if _uses_postgres_store():
            _write_store_to_postgres(data)
            return
        DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _resolve_token_phone(token_data: Any) -> str | None:
    if isinstance(token_data, str):
        return token_data
    if isinstance(token_data, dict):
        phone_value = token_data.get("phone")
        if isinstance(phone_value, str) and phone_value:
            return phone_value
    return None


def _is_token_expired(token_data: Any) -> bool:
    if isinstance(token_data, dict):
        expires_at = token_data.get("expiresAt")
        if isinstance(expires_at, str) and expires_at:
            try:
                expires_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                return expires_dt <= datetime.now(timezone.utc)
            except ValueError:
                return True
    return False


def _cleanup_expired_tokens(store: dict[str, Any]) -> bool:
    tokens = store.get("activeTokens", {})
    if not isinstance(tokens, dict):
        store["activeTokens"] = {}
        return True

    changed = False
    expired: list[str] = []
    for token_hash, token_data in tokens.items():
        if _is_token_expired(token_data):
            expired.append(token_hash)
    for token_hash in expired:
        tokens.pop(token_hash, None)
        ACTIVE_TOKENS.pop(token_hash, None)
        changed = True
    return changed


def _find_user_by_phone(store: dict[str, Any], phone: str) -> dict[str, Any] | None:
    for user in store["users"]:
        if user.get("phone") == phone:
            return user
    return None


def _find_user_by_id(store: dict[str, Any], user_id: str) -> dict[str, Any] | None:
    for user in store["users"]:
        if str(user.get("id")) == user_id:
            return user
    return None


def _find_payment_by_id(store: dict[str, Any], payment_id: str) -> dict[str, Any] | None:
    for payment in store["paymentRecords"]:
        if str(payment.get("id")) == payment_id:
            return payment
    return None


def _find_client_by_id(store: dict[str, Any], client_id: str) -> dict[str, Any] | None:
    for client in store.get("clients", []):
        if str(client.get("id")) == client_id:
            return client
    return None


def _find_clients_by_parent_id(store: dict[str, Any], parent_user_id: str) -> list[dict[str, Any]]:
    return [item for item in store.get("clients", []) if str(item.get("parentUserId") or "") == parent_user_id]


def _current_portal_status(user: dict[str, Any]) -> str:
    status_value = str(user.get("portal_status") or "").strip()
    return status_value or "not_created"


def _set_parent_portal_status(
    store: dict[str, Any],
    parent_user: dict[str, Any],
    portal_status: PortalStatus,
    *,
    activated_at: str | None = None,
    blocked_at: str | None = None,
) -> None:
    now = _utc_now_iso()
    parent_user["portal_status"] = portal_status
    if portal_status == "activated":
        parent_user["portal_activated_at"] = activated_at or now
        parent_user["portal_blocked_at"] = None
    elif portal_status == "blocked":
        parent_user["portal_blocked_at"] = blocked_at or now
    else:
        if portal_status != "blocked":
            parent_user["portal_blocked_at"] = None
    parent_user["updated_at"] = now
    for client in _find_clients_by_parent_id(store, str(parent_user.get("id") or "")):
        client["portalStatus"] = portal_status
        client["portalActivatedAt"] = parent_user.get("portal_activated_at")
        client["portalBlockedAt"] = parent_user.get("portal_blocked_at")
        client["updatedAt"] = now


def _find_pin_auth_by_parent_id(store: dict[str, Any], parent_user_id: str) -> dict[str, Any] | None:
    return next(
        (item for item in store.get("userPinAuth", []) if str(item.get("parentUserId") or "") == parent_user_id),
        None,
    )


def _upsert_pin_auth(
    store: dict[str, Any],
    *,
    parent_user_id: str,
    pin_hash: str,
    disable_existing: bool = False,
) -> dict[str, Any]:
    now = _utc_now_iso()
    pin_auth = _find_pin_auth_by_parent_id(store, parent_user_id)
    if pin_auth is None:
        pin_auth = {
            "id": _new_id("pin-auth"),
            "parentUserId": parent_user_id,
            "pinHash": pin_hash,
            "pinSetAt": now,
            "failedAttempts": 0,
            "lockedUntil": None,
            "isDisabled": False,
            "createdAt": now,
            "updatedAt": now,
        }
        store.setdefault("userPinAuth", []).append(pin_auth)
        return pin_auth

    if disable_existing:
        pin_auth["isDisabled"] = True
    pin_auth["pinHash"] = pin_hash
    pin_auth["pinSetAt"] = now
    pin_auth["failedAttempts"] = 0
    pin_auth["lockedUntil"] = None
    pin_auth["isDisabled"] = False
    pin_auth["updatedAt"] = now
    return pin_auth


def _disable_pin_auth(store: dict[str, Any], parent_user_id: str) -> None:
    pin_auth = _find_pin_auth_by_parent_id(store, parent_user_id)
    if pin_auth is None:
        return
    pin_auth["isDisabled"] = True
    pin_auth["updatedAt"] = _utc_now_iso()


def _has_active_pin_auth(store: dict[str, Any], parent_user_id: str) -> bool:
    pin_auth = _find_pin_auth_by_parent_id(store, parent_user_id)
    if pin_auth is None:
        return False
    return bool(str(pin_auth.get("pinHash") or "").strip()) and not bool(pin_auth.get("isDisabled"))


def _has_unused_activation_link(store: dict[str, Any], parent_user_id: str) -> bool:
    now = datetime.now(timezone.utc)
    for record in store.get("activationTokens", []):
        if str(record.get("parentUserId") or "") != parent_user_id:
            continue
        if bool(record.get("isUsed")):
            continue
        expires_at = _parse_datetime_safe(record.get("expiresAt"))
        if expires_at is None or expires_at <= now:
            continue
        return True
    return False


def _restore_parent_portal_access(store: dict[str, Any], parent_user: dict[str, Any]) -> PortalStatus:
    parent_user_id = str(parent_user.get("id") or "")
    latest_payment = next(
        (
            payment
            for payment in store.get("paymentRecords", [])
            if str(payment.get("parentUserId") or "") == parent_user_id
        ),
        None,
    )
    has_paid_payment = latest_payment is not None and str(latest_payment.get("status") or "") == "paid"

    if _has_active_pin_auth(store, parent_user_id):
        parent_user["access_level"] = "full"
        parent_user["account_status"] = "active"
        _set_parent_portal_status(store, parent_user, "activated")
        return "activated"

    if _has_unused_activation_link(store, parent_user_id):
        parent_user["access_level"] = "full"
        parent_user["account_status"] = "active"
        _set_parent_portal_status(store, parent_user, "activation_link_created")
        return "activation_link_created"

    if has_paid_payment:
        parent_user["access_level"] = "full"
        parent_user["account_status"] = "active"
        _set_parent_portal_status(store, parent_user, "paid_cash_waiting_activation")
        return "paid_cash_waiting_activation"

    if latest_payment is not None:
        parent_user["access_level"] = "payment_only"
        parent_user["account_status"] = "payment_pending"
        _set_parent_portal_status(store, parent_user, "awaiting_payment")
        return "awaiting_payment"

    parent_user["access_level"] = "payment_only"
    parent_user["account_status"] = "invited"
    _set_parent_portal_status(store, parent_user, "not_created")
    return "not_created"


def _find_activation_record_by_raw_token(store: dict[str, Any], raw_token: str) -> dict[str, Any] | None:
    token_hash = _hash_sha256(raw_token)
    return next(
        (item for item in store.get("activationTokens", []) if str(item.get("tokenHash") or "") == token_hash),
        None,
    )


def _find_active_activation_for_payment(
    store: dict[str, Any],
    *,
    parent_user_id: str,
    payment_id: str,
    purpose: ActivationPurpose,
) -> dict[str, Any] | None:
    now = datetime.now(timezone.utc)
    for item in store.get("activationTokens", []):
        if str(item.get("parentUserId") or "") != parent_user_id:
            continue
        if str(item.get("paymentId") or "") != payment_id:
            continue
        if str(item.get("purpose") or "") != purpose:
            continue
        if bool(item.get("isUsed")) or bool(item.get("revoked")):
            continue
        expires_dt = _parse_datetime_safe(item.get("expiresAt"))
        if expires_dt is None or expires_dt <= now:
            continue
        return item
    return None


def _deactivate_activation_tokens(
    store: dict[str, Any],
    *,
    parent_user_id: str,
    purposes: set[str] | None = None,
) -> None:
    now = _utc_now_iso()
    for item in store.get("activationTokens", []):
        if str(item.get("parentUserId") or "") != parent_user_id:
            continue
        if purposes and str(item.get("purpose") or "") not in purposes:
            continue
        if bool(item.get("isUsed")):
            continue
        item["isUsed"] = True
        item["usedAt"] = now
        item["revoked"] = True


def _build_activation_url(raw_token: str) -> str:
    return f"{_frontend_base_url()}/activate/{raw_token}"


def _activation_qr_url(activation_url: str) -> str:
    return f"https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=0&data={urlencode({'': activation_url})[1:]}"


def _create_activation_token(
    store: dict[str, Any],
    *,
    parent_user_id: str,
    payment_id: str | None,
    purpose: ActivationPurpose,
    source_flow: ActivationSourceFlow,
    created_by_admin_id: str | None = None,
) -> dict[str, Any]:
    raw_token = secrets.token_urlsafe(32)
    now_dt = datetime.now(timezone.utc)
    expires_at = (now_dt + timedelta(hours=_activation_link_ttl_hours())).isoformat()
    _deactivate_activation_tokens(store, parent_user_id=parent_user_id, purposes={purpose})
    record = {
        "id": _new_id("activation"),
        "parentUserId": parent_user_id,
        "paymentId": payment_id,
        "tokenHash": _hash_sha256(raw_token),
        "purpose": purpose,
        "sourceFlow": source_flow,
        "expiresAt": expires_at,
        "isUsed": False,
        "createdAt": now_dt.isoformat(),
        "usedAt": None,
        "createdByAdminId": created_by_admin_id,
        "revoked": False,
    }
    store.setdefault("activationTokens", []).append(record)
    parent_user = _find_user_by_id(store, parent_user_id)
    if parent_user is not None and _current_portal_status(parent_user) != "blocked":
        _set_parent_portal_status(store, parent_user, "activation_link_created")
    activation_url = _build_activation_url(raw_token)
    return {
        **record,
        "activationUrl": activation_url,
        "qrCode": _activation_qr_url(activation_url),
    }


def _is_activation_record_valid(store: dict[str, Any], record: dict[str, Any]) -> tuple[bool, str | None]:
    if bool(record.get("isUsed")):
        return False, "Ссылка недействительна или устарела"
    if bool(record.get("revoked")):
        return False, "Ссылка недействительна или устарела"
    expires_dt = _parse_datetime_safe(record.get("expiresAt"))
    if expires_dt is None or expires_dt <= datetime.now(timezone.utc):
        return False, "Ссылка недействительна или устарела"
    parent_user = _find_user_by_id(store, str(record.get("parentUserId") or ""))
    if parent_user is None:
        return False, "Ссылка недействительна или устарела"
    if _current_portal_status(parent_user) == "blocked":
        return False, "Доступ к кабинету отключён"
    purpose = str(record.get("purpose") or "")
    payment_id = str(record.get("paymentId") or "")
    if purpose in {"after_online_payment", "initial_activation"} and payment_id:
        payment = _find_payment_by_id(store, payment_id) or payment_service.find_payment_by_id(store, payment_id)
        payment_status = str((payment or {}).get("status") or "")
        if payment_status != "paid":
            return False, "Активация доступна только после подтверждённой оплаты"
    return True, None


def _mark_activation_record_used(record: dict[str, Any]) -> None:
    record["isUsed"] = True
    record["usedAt"] = _utc_now_iso()
    record["revoked"] = False


def _find_payment_session_by_raw_token(store: dict[str, Any], raw_token: str) -> dict[str, Any] | None:
    token_hash = _hash_sha256(raw_token)
    return next(
        (item for item in store.get("paymentSessions", []) if str(item.get("tokenHash") or "") == token_hash),
        None,
    )


def _build_payment_session_url(raw_token: str) -> str:
    return f"{_frontend_base_url()}/pay/session/{raw_token}"


def _create_payment_session(store: dict[str, Any], *, parent_user_id: str, payment_id: str) -> dict[str, Any]:
    raw_token = secrets.token_urlsafe(24)
    now_dt = datetime.now(timezone.utc)
    expires_at = (now_dt + timedelta(hours=_activation_link_ttl_hours())).isoformat()
    record = {
        "id": _new_id("payment-session"),
        "parentUserId": parent_user_id,
        "paymentId": payment_id,
        "tokenHash": _hash_sha256(raw_token),
        "status": "active",
        "expiresAt": expires_at,
        "createdAt": now_dt.isoformat(),
        "lastUsedAt": now_dt.isoformat(),
    }
    store.setdefault("paymentSessions", []).append(record)
    return {
        **record,
        "paymentSessionUrl": _build_payment_session_url(raw_token),
        "rawToken": raw_token,
    }


def _is_payment_session_valid(record: dict[str, Any]) -> bool:
    if str(record.get("status") or "active") not in {"active", "paid"}:
        return False
    expires_dt = _parse_datetime_safe(record.get("expiresAt"))
    if expires_dt is None:
        return False
    return expires_dt > datetime.now(timezone.utc)


def _touch_payment_session(record: dict[str, Any], *, status_value: PaymentSessionStatus | None = None) -> None:
    record["lastUsedAt"] = _utc_now_iso()
    if status_value is not None:
        record["status"] = status_value


def _create_auth_session(store: dict[str, Any], user: dict[str, Any]) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = _hash_auth_token(token)
    issued_at_dt = datetime.now(timezone.utc)
    expires_at_dt = issued_at_dt.timestamp() + _auth_token_ttl_seconds()
    store.setdefault("activeTokens", {})[token_hash] = {
        "phone": str(user.get("phone") or ""),
        "issuedAt": issued_at_dt.isoformat(),
        "expiresAt": datetime.fromtimestamp(expires_at_dt, tz=timezone.utc).isoformat(),
        "tokenHashVersion": 1,
    }
    ACTIVE_TOKENS[token_hash] = str(user.get("phone") or "")
    user["last_login_at"] = issued_at_dt.isoformat()
    user["updated_at"] = issued_at_dt.isoformat()
    return token


def _payment_public_token_key(kind: str) -> str:
    return "provider_public_token" if kind == "parent" else "providerPublicToken"


def _resolve_provider_payment_context(store: dict[str, Any], payment_id: str) -> dict[str, Any] | None:
    parent_payment = payment_service.find_payment_by_id(store, payment_id)
    if parent_payment is not None:
        return {"kind": "parent", "payment": parent_payment}

    legacy_payment = _find_payment_by_id(store, payment_id)
    if legacy_payment is not None:
        return {"kind": "legacy", "payment": legacy_payment}

    return None


def _authorize_payment_access(
    store: dict[str, Any],
    *,
    payment_id: str,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    """Resolve a payment and ensure the caller owns it. Admins and owners may act on any."""
    payment_context = _resolve_provider_payment_context(store, payment_id)
    if payment_context is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    if current_user.get("role") in {"admin", "owner"}:
        return payment_context

    payment = payment_context["payment"]
    owner_id = str(payment.get("parentUserId") or payment.get("parent_id") or "").strip()
    if not owner_id or owner_id != str(current_user.get("id") or "").strip():
        # Same 404 as a missing payment so foreign ids cannot be probed.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return payment_context


def _ensure_provider_public_token(payment_context: dict[str, Any]) -> str:
    payment = payment_context["payment"]
    token_key = _payment_public_token_key(str(payment_context["kind"]))
    token = str(payment.get(token_key) or "").strip()
    if token:
        return token
    token = secrets.token_urlsafe(18)
    payment[token_key] = token
    return token


def _get_provider_public_token(payment_context: dict[str, Any]) -> str | None:
    payment = payment_context["payment"]
    token_key = _payment_public_token_key(str(payment_context["kind"]))
    token = str(payment.get(token_key) or "").strip()
    return token or None


def _selfwork_api_key() -> str:
    return os.getenv("SELFWORK_API_KEY", "").strip() or os.getenv("PAYMENT_PROVIDER_TOKEN", "").strip()


def _selfwork_merchant_id() -> str:
    return os.getenv("SELFWORK_MERCHANT_ID", "").strip()


def _selfwork_provider_name() -> str:
    return os.getenv("PAYMENT_PROVIDER", "").strip()


def _selfwork_init_url() -> str:
    return os.getenv("SELFWORK_INIT_URL", "").strip() or "https://pro.selfwork.ru/merchant/v1/init"


def _selfwork_status_url() -> str:
    return os.getenv("SELFWORK_STATUS_URL", "").strip() or "https://pro.selfwork.ru/merchant/v1/status"


def _selfwork_order_id(value: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9._-]", "-", value).strip("-")
    if not normalized:
        normalized = f"order-{secrets.token_hex(6)}"
    return normalized[:35]


def _selfwork_order_line_name(store: dict[str, Any], payment_context: dict[str, Any]) -> str:
    payment = payment_context["payment"]
    if str(payment_context["kind"]) == "parent":
        plan = next(
            (
                item
                for item in store.get("subscriptionPlans", [])
                if str(item.get("id") or "") == str(payment.get("subscription_plan_id") or "")
            ),
            None,
        )
        title = str(plan.get("title") or "").strip() if plan else ""
        if title:
            return f"Абонемент: {title}"
        reference = str(payment.get("payment_reference") or "").strip()
        if reference:
            return f"Оплата {reference}"
        return "Оплата занятий"

    subscription_name = str(payment.get("subscriptionName") or "").strip()
    child_name = str(payment.get("childName") or "").strip()
    if subscription_name and child_name:
        return f"{subscription_name} / {child_name}"
    if subscription_name:
        return subscription_name
    if child_name:
        return f"Оплата / {child_name}"
    return "Оплата занятий"


def _selfwork_order_amount_minor(payment_context: dict[str, Any]) -> int:
    payment = payment_context["payment"]
    amount = float(payment.get("amount") or 0)
    return max(int(round(amount * 100)), 1)


def _selfwork_order_reference(payment_context: dict[str, Any]) -> str:
    payment = payment_context["payment"]
    raw_reference = (
        str(payment.get("payment_reference") or "").strip()
        or str(payment.get("invoiceNumber") or "").strip()
        or str(payment.get("id") or "").strip()
    )
    return _selfwork_order_id(raw_reference)


def _build_selfwork_init_fields(store: dict[str, Any], payment_context: dict[str, Any]) -> dict[str, str]:
    api_key = _selfwork_api_key()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Selfwork API key is not configured. Set SELFWORK_API_KEY.",
        )

    order_id = _selfwork_order_reference(payment_context)
    amount_minor = str(_selfwork_order_amount_minor(payment_context))
    line_name = _selfwork_order_line_name(store, payment_context)
    line_quantity = "1"
    signature_source = f"{order_id}{amount_minor}{line_name}{line_quantity}{amount_minor}{api_key}"
    signature = hashlib.sha256(signature_source.encode("utf-8")).hexdigest()

    return {
        "order_id": order_id,
        "amount": amount_minor,
        "signature": signature,
        "info[0][name]": line_name,
        "info[0][quantity]": line_quantity,
        "info[0][amount]": amount_minor,
    }


def _render_selfwork_form_html(*, payment_id: str, action_url: str, fields: dict[str, str]) -> str:
    hidden_fields = "\n".join(
        f'<input type="hidden" name="{html.escape(key)}" value="{html.escape(value)}" />'
        for key, value in fields.items()
    )
    escaped_action = html.escape(action_url)
    js_payment_id = json.dumps(payment_id)
    js_autosubmit_key = json.dumps(f"manera_selfwork_autosubmitted_{payment_id}")
    return f"""<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Переход к оплате</title>
    <style>
      body {{
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f8f4e3;
        color: #133c2a;
        font-family: Arial, sans-serif;
        padding: 24px;
      }}
      .card {{
        width: min(100%, 420px);
        background: #ffffff;
        border-radius: 24px;
        box-shadow: 0 18px 44px rgba(19, 60, 42, 0.12);
        padding: 28px;
        text-align: center;
      }}
      .button {{
        border: 0;
        border-radius: 16px;
        background: #133c2a;
        color: #ffffff;
        padding: 12px 18px;
        font-size: 15px;
        cursor: pointer;
      }}
      .muted {{
        margin-top: 10px;
        color: rgba(19, 60, 42, 0.68);
        font-size: 14px;
        line-height: 1.45;
      }}
    </style>
  </head>
  <body>
    <div class="card">
      <h1 style="margin:0 0 10px;font-size:24px;">Переход к оплате</h1>
      <p class="muted">Открываем защищённую страницу оплаты.</p>
      <form id="selfwork-payment-form" action="{escaped_action}" method="post" accept-charset="utf-8">
        {hidden_fields}
        <button class="button" type="submit">Перейти к оплате</button>
      </form>
      <p class="muted">Если переход не произошёл автоматически, нажмите кнопку.</p>
    </div>
    <script>
      try {{
        window.localStorage.setItem('manera_pending_provider_payment_id', {js_payment_id});
      }} catch (error) {{
        console.warn('Unable to store pending payment id', error);
      }}
      // Guards against a redirect loop: if the browser restores this page from
      // history/bfcache after the user has already been sent to Selfwork once
      // (closing the widget tab, pressing back), the script re-runs on that
      // restore. Without this flag it would silently re-submit the form and
      // bounce the user straight back to the Selfwork widget.
      var autoSubmitKey = {js_autosubmit_key};
      var alreadyAutoSubmitted = false;
      try {{
        alreadyAutoSubmitted = window.sessionStorage.getItem(autoSubmitKey) === '1';
      }} catch (error) {{
        alreadyAutoSubmitted = false;
      }}
      if (!alreadyAutoSubmitted) {{
        try {{
          window.sessionStorage.setItem(autoSubmitKey, '1');
        }} catch (error) {{
          // ignore -- worst case the guard just won't persist
        }}
        window.setTimeout(function () {{
          var form = document.getElementById('selfwork-payment-form');
          if (form) {{
            form.submit();
          }}
        }}, 150);
      }}
    </script>
  </body>
</html>"""


def _map_selfwork_status(value: str) -> Literal["paid", "failed"] | None:
    normalized = value.strip().lower()
    if normalized == "succeeded":
        return "paid"
    if normalized in {"failed", "canceled"}:
        return "failed"
    return None


def _create_provider_payment_for_payment(
    store: dict[str, Any],
    *,
    payment_id: str,
    success_url: str,
    fail_url: str,
    backend_base_url: str,
) -> dict[str, Any]:
    if not _is_safe_frontend_redirect(success_url) or not _is_safe_frontend_redirect(fail_url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Некорректный URL возврата после оплаты",
        )
    provider_name = _selfwork_provider_name().strip().lower()
    if provider_name == "selfwork":
        payment_context = _resolve_provider_payment_context(store, payment_id)
        if payment_context is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

        public_token = _ensure_provider_public_token(payment_context)
        payment_url = (
            f"{backend_base_url.rstrip('/')}/api/payments/provider/selfwork/form/"
            f"{payment_id}?token={public_token}"
        )
        provider_payment_id = _selfwork_order_reference(payment_context)
        payment = payment_context["payment"]
        payment["success_url"] = success_url
        payment["fail_url"] = fail_url
        try:
            payment_service.register_provider_payment(
                store=store,
                payment_id=payment_id,
                payment_url=payment_url,
                provider_payment_id=provider_payment_id,
                provider_name="selfwork",
            )
        except LookupError:
            payment["paymentMethod"] = "online"
            payment["providerPaymentId"] = provider_payment_id
            payment["paymentUrl"] = payment_url
            payment["updatedAt"] = _utc_now_iso()
        return {
            "ok": True,
            "payment_url": payment_url,
            "provider_payment_id": provider_payment_id,
            "raw": {"provider": "selfwork", "mode": "hosted_form"},
        }

    provider_url = os.getenv("PAYMENT_PROVIDER_URL", "").strip()
    if not provider_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment provider is not configured. Set PAYMENT_PROVIDER_URL.",
        )

    token = os.getenv("PAYMENT_PROVIDER_TOKEN", "").strip()
    request_payload = {
        "payment_id": payment_id,
        "success_url": success_url,
        "fail_url": fail_url,
    }
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(
        provider_url,
        data=json.dumps(request_payload, ensure_ascii=False).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            body = response.read().decode("utf-8") if response else ""
            parsed = json.loads(body) if body else {}
    except (HTTPError, URLError):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment provider is unavailable.",
        )

    payment_url = parsed.get("payment_url") or parsed.get("confirmation_url")
    provider_payment_id = parsed.get("provider_payment_id") or parsed.get("id")
    if not payment_url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment provider response missing payment_url.",
        )
    try:
        payment_service.register_provider_payment(
            store=store,
            payment_id=payment_id,
            payment_url=payment_url,
            provider_payment_id=provider_payment_id,
            provider_name=parsed.get("provider")
            or os.getenv("PAYMENT_PROVIDER", "").strip()
            or "internet_acquiring",
        )
    except LookupError:
        pass
    return {
        "ok": True,
        "payment_url": payment_url,
        "provider_payment_id": provider_payment_id,
        "raw": parsed,
    }


def _sync_selfwork_payment_status_internal(store: dict[str, Any], payment_id: str) -> dict[str, Any]:
    merchant_id = _selfwork_merchant_id()
    api_key = _selfwork_api_key()
    if not merchant_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Selfwork merchant id is not configured. Set SELFWORK_MERCHANT_ID.",
        )
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Selfwork API key is not configured. Set SELFWORK_API_KEY.",
        )

    payment_context = _resolve_provider_payment_context(store, payment_id)
    if payment_context is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    order_id = _selfwork_order_reference(payment_context)
    auth_value = b64encode(f"{merchant_id}:{api_key}".encode("utf-8")).decode("ascii")
    request = Request(
        f"{_selfwork_status_url()}?{urlencode({'order_id': order_id})}",
        headers={"Authorization": f"Basic {auth_value}"},
        method="GET",
    )
    try:
        with urlopen(request, timeout=10) as response:
            body = response.read().decode("utf-8") if response else ""
    except HTTPError as error:
        body = error.read().decode("utf-8") if error.fp else ""
        detail = body or f"Selfwork status returned HTTP {error.code}"
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)
    except URLError:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Selfwork status is unavailable")

    try:
        parsed = json.loads(body) if body else {}
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Selfwork status returned invalid JSON")

    provider_status = str(parsed.get("status") or "").strip().lower()
    mapped_status = _map_selfwork_status(provider_status)
    if mapped_status is None:
        return {
            "ok": True,
            "payment_id": payment_id,
            "provider_payment_id": parsed.get("order_id") or order_id,
            "provider_status": provider_status or "pending",
            "synced": False,
            "raw": parsed,
        }

    webhook_result = _apply_provider_webhook_payload(
        store,
        ProviderWebhookPayload(
            payment_id=payment_id,
            status=mapped_status,
            provider_payment_id=str(parsed.get("order_id") or order_id),
            raw_payload=parsed,
        ),
    )
    return {
        "ok": True,
        "payment_id": payment_id,
        "provider_payment_id": parsed.get("order_id") or order_id,
        "provider_status": provider_status,
        "synced": True,
        "result": webhook_result,
        "raw": parsed,
    }


def _find_child_by_id(store: dict[str, Any], child_id: str) -> dict[str, Any] | None:
    for child in store.get("children", []):
        if str(child.get("id")) == child_id:
            return child
    return None


def _find_latest_landing_lead_by_phone(store: dict[str, Any], phone: str) -> dict[str, Any] | None:
    normalized_phone = _normalize_phone(phone)
    leads = [item for item in store.get("landingLeads", []) if _normalize_phone(str(item.get("phone") or "")) == normalized_phone]
    leads.sort(
        key=lambda item: _parse_datetime_safe(item.get("createdAt")) or datetime.fromtimestamp(0, tz=timezone.utc),
        reverse=True,
    )
    return leads[0] if leads else None


def _find_group_by_id(store: dict[str, Any], group_id: str) -> dict[str, Any] | None:
    for group in store.get("ownerGroups", []):
        if str(group.get("id")) == group_id:
            return group
    return None


def _recalculate_group_student_counts(store: dict[str, Any]) -> bool:
    groups = store.get("ownerGroups", [])
    if not isinstance(groups, list):
        return False
    counts: dict[str, int] = {}
    for child in store.get("children", []):
        group_id = str(child.get("groupId") or "").strip()
        if not group_id:
            continue
        counts[group_id] = counts.get(group_id, 0) + 1

    changed = False
    for group in groups:
        group_id = str(group.get("id") or "")
        next_count = counts.get(group_id, 0)
        current_count = int(group.get("studentCount") or 0)
        if current_count != next_count:
            group["studentCount"] = next_count
            group["updatedAt"] = _utc_now_iso()
            changed = True
    return changed


def _find_latest_payment_for_client(store: dict[str, Any], client_id: str) -> dict[str, Any] | None:
    for payment in store["paymentRecords"]:
        if str(payment.get("clientId")) == client_id:
            return payment
    return None


def _append_payment_journal(
    store: dict[str, Any],
    *,
    payment: dict[str, Any],
    event_type: str,
    source: str,
    previous_status: str | None,
    new_status: str,
    actor_user_id: str | None = None,
    actor_role: UserRole | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    entry = {
        "id": _new_id("paylog"),
        "paymentId": payment["id"],
        "parentUserId": payment.get("parentUserId"),
        "eventType": event_type,
        "source": source,
        "previousStatus": previous_status,
        "newStatus": new_status,
        "actorUserId": actor_user_id,
        "actorRole": actor_role,
        "metadata": metadata or {},
        "createdAt": _utc_now_iso(),
    }
    store["paymentJournal"].insert(0, entry)
    return entry


def _journal_payment_view_from_parent_payment(store: dict[str, Any], payment: dict[str, Any]) -> dict[str, Any]:
    plan = next(
        (
            item
            for item in store.get("subscriptionPlans", [])
            if str(item.get("id") or "") == str(payment.get("subscription_plan_id") or "")
        ),
        None,
    )
    return {
        "id": payment.get("id"),
        "parentUserId": payment.get("parent_id"),
        "amount": payment.get("amount"),
        "subscriptionName": str(plan.get("title") or "Абонемент") if isinstance(plan, dict) else "Абонемент",
        "paymentMethod": payment.get("method"),
        "invoiceNumber": payment.get("invoice_number"),
        "dueDate": payment.get("due_date"),
    }


def _create_user(
    store: dict[str, Any],
    *,
    phone: str,
    role: UserRole,
    name: str | None = None,
    access_level: AccessLevel = "full",
    account_status: AccountStatus = "active",
    portal_status: PortalStatus | None = None,
) -> dict[str, Any]:
    resolved_portal_status: PortalStatus = portal_status or (
        "activated" if role != "parent" else ("activated" if access_level == "full" and account_status == "active" else "not_created")
    )
    portal_activated_at = _utc_now_iso() if resolved_portal_status == "activated" else None
    new_user = {
        "id": _new_id(f"user-{role}"),
        "name": (name or phone).strip(),
        "phone": phone,
        "role": role,
        "access_level": access_level,
        "account_status": account_status,
        "portal_status": resolved_portal_status,
        "portal_activated_at": portal_activated_at,
        "portal_blocked_at": None,
        "last_login_at": None,
        "updated_at": _utc_now_iso(),
    }
    store["users"].append(new_user)
    return new_user


def _list_parent_user_ids(store: dict[str, Any]) -> list[str]:
    return [str(user.get("id")) for user in store.get("users", []) if str(user.get("role")) == "parent" and user.get("id")]


def _append_notification(
    store: dict[str, Any],
    *,
    user_id: str,
    type_value: str,
    priority: str,
    title: str,
    message: str,
    additional_info: str | None = None,
    metadata: dict[str, Any] | None = None,
    dedup_key: str | None = None,
    for_roles: list[str] | None = None,
) -> dict[str, Any]:
    now = _utc_now_iso()
    notifications = store.get("notifications", [])
    if dedup_key:
        for item in notifications:
            if str(item.get("userId")) != user_id:
                continue
            if str(item.get("dedupKey") or "") != dedup_key:
                continue
            if bool(item.get("read")):
                continue
            item["type"] = type_value
            item["priority"] = priority
            item["title"] = title
            item["message"] = message
            item["additionalInfo"] = additional_info
            item["createdAt"] = now
            item["metadata"] = metadata or {}
            item["dedupKey"] = dedup_key
            return item

    entry = {
        "id": _new_id("notif"),
        "userId": user_id,
        "type": type_value,
        "priority": priority,
        "title": title,
        "message": message,
        "additionalInfo": additional_info,
        "createdAt": now,
        "read": False,
        "readAt": None,
        "forRoles": list(for_roles or ["parent"]),
        "metadata": metadata or {},
        "dedupKey": dedup_key,
    }
    notifications.insert(0, entry)
    _send_web_push_to_user(
        store,
        user_id=user_id,
        title=title,
        body=message,
        tag=dedup_key or entry["id"],
        url=_push_notification_url(type_value),
    )
    return entry


def _vapid_public_key() -> str:
    return str(os.getenv("VAPID_PUBLIC_KEY", "")).strip()


def _vapid_private_key() -> str:
    return str(os.getenv("VAPID_PRIVATE_KEY", "")).strip()


def _vapid_subject() -> str:
    return str(os.getenv("VAPID_SUBJECT", "") or "mailto:support@maneradancestudio.ru").strip()


def _push_notifications_configured() -> bool:
    return bool(webpush) and bool(_vapid_public_key()) and bool(_vapid_private_key())


def _push_notification_url(type_value: str) -> str:
    # Where the browser should focus/open the app when the notification is clicked.
    # Kept coarse on purpose: the frontend doesn't yet have a router for arbitrary
    # deep links into notification-specific screens.
    if type_value == "landing_lead":
        return "/?ownerPage=clients"
    if type_value == "payment":
        return "/?ownerPage=finance"
    return "/"


def _remove_push_subscription(store: dict[str, Any], endpoint: str) -> bool:
    subscriptions = store.get("pushSubscriptions", [])
    before = len(subscriptions)
    store["pushSubscriptions"] = [item for item in subscriptions if str(item.get("endpoint")) != endpoint]
    return len(store["pushSubscriptions"]) != before


def _send_web_push_to_user(
    store: dict[str, Any],
    *,
    user_id: str,
    title: str,
    body: str,
    tag: str | None = None,
    url: str = "/",
) -> None:
    """Best-effort browser push for an in-app notification that was just created.

    Never raises: a slow or unreachable push service (FCM/Mozilla) must not break
    the business action (payment update, new lead, etc.) that triggered it. Stale
    subscriptions (browser unsubscribed, endpoint expired) are pruned as they're
    found rather than left to accumulate.
    """
    if not _push_notifications_configured():
        return
    subscriptions = [item for item in store.get("pushSubscriptions", []) if str(item.get("userId")) == user_id]
    if not subscriptions:
        return

    payload = json.dumps({"title": title, "body": body, "tag": tag, "url": url}, ensure_ascii=False)
    stale_endpoints: list[str] = []
    for sub in subscriptions:
        subscription_info = {
            "endpoint": sub.get("endpoint"),
            "keys": {"p256dh": (sub.get("keys") or {}).get("p256dh"), "auth": (sub.get("keys") or {}).get("auth")},
        }
        try:
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=_vapid_private_key(),
                vapid_claims={"sub": _vapid_subject()},
                timeout=5,
            )
        except WebPushException as error:
            response = getattr(error, "response", None)
            status_code = getattr(response, "status_code", None)
            if status_code in {404, 410}:
                stale_endpoints.append(str(sub.get("endpoint")))
        except Exception:
            continue

    if stale_endpoints:
        store["pushSubscriptions"] = [
            item for item in store.get("pushSubscriptions", []) if str(item.get("endpoint")) not in stale_endpoints
        ]


def _telegram_bot_token() -> str:
    return str(os.getenv("TELEGRAM_BOT_TOKEN", "")).strip()


def _parse_csv_list(value: str | None) -> list[str]:
    if not value:
        return []
    result: list[str] = []
    seen: set[str] = set()
    for item in value.split(","):
        normalized = item.strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)
    return result


def _sanitize_source_text(value: Any) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None

    normalized = text.lower()
    if normalized in {"unknown", "-", "—", "null", "undefined", "none"}:
        return None

    mapped_values = {
        "qr-default": "QR-код",
        "qr": "QR-код",
        "offline": "Офлайн",
        "instagram": "Instagram",
        "insta": "Instagram",
        "inst": "Instagram",
        "ig": "Instagram",
        "vk": "VK",
        "vkontakte": "VK",
        "telegram": "Telegram",
        "tg": "Telegram",
        "whatsapp": "WhatsApp",
        "wa": "WhatsApp",
        "site": "Сайт",
        "website": "Сайт",
        "google": "Google",
        "yandex": "Яндекс",
    }

    return mapped_values.get(normalized) or re.sub(r"[_-]+", " ", text)


def _resolve_telegram_notification_chat_ids(store: dict[str, Any]) -> list[str]:
    configured_chat_ids = _parse_csv_list(os.getenv("TELEGRAM_ALLOWED_CHAT_IDS")) or list(DEFAULT_TELEGRAM_ALLOWED_CHAT_IDS)
    direct_chat_id = str(os.getenv("TELEGRAM_CHAT_ID", "")).strip()
    if direct_chat_id and direct_chat_id not in configured_chat_ids:
        configured_chat_ids.append(direct_chat_id)

    chats = store.get("telegramChats", [])
    if not isinstance(chats, list):
        chats = []

    if configured_chat_ids:
        notification_map = {
            str(chat.get("chatId") or ""): bool(chat.get("notificationsEnabled", True))
            for chat in chats
            if isinstance(chat, dict)
        }
        return [chat_id for chat_id in configured_chat_ids if notification_map.get(chat_id) is not False]

    primary_chat = next(
        (
            chat
            for chat in chats
            if isinstance(chat, dict)
            and bool(chat.get("isPrimary"))
            and bool(chat.get("notificationsEnabled", True))
            and str(chat.get("chatId") or "").strip()
        ),
        None,
    )
    if primary_chat is not None:
        return [str(primary_chat.get("chatId"))]

    fallback_chat = next(
        (
            chat
            for chat in chats
            if isinstance(chat, dict)
            and bool(chat.get("notificationsEnabled", True))
            and str(chat.get("chatId") or "").strip()
        ),
        None,
    )
    if fallback_chat is not None:
        return [str(fallback_chat.get("chatId"))]

    return []


def _format_telegram_datetime(value: Any) -> str:
    parsed = _parse_datetime_safe(value)
    if parsed is None:
        return str(value or "")
    local_dt = parsed.astimezone()
    return local_dt.strftime("%d.%m.%Y %H:%M")


def _format_birth_date_with_age(value: Any) -> str:
    birth_date = str(value or "").strip()
    if not birth_date:
        return "Не указана"
    try:
        normalized = _normalize_birth_date(birth_date)
        parsed_date = datetime.strptime(normalized, "%Y-%m-%d").date()
        formatted = parsed_date.strftime("%d.%m.%Y")
        age = _calculate_age_from_birth_date(normalized)
        if age is None:
            return formatted
        return f"{formatted} ({age} лет)"
    except Exception:
        return birth_date


def _telegram_api_call(method: str, payload: dict[str, Any]) -> dict[str, Any]:
    bot_token = _telegram_bot_token()
    if not bot_token:
        return {"ok": False, "skipped": True}

    request = Request(
        f"https://api.telegram.org/bot{bot_token}/{method}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {"ok": True}
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        if method == "editMessageText" and "message is not modified" in detail:
            return {"ok": True, "skipped": True}
        if method == "answerCallbackQuery" and "query is too old" in detail:
            return {"ok": True, "skipped": True}
        raise RuntimeError(f"Telegram API error: {detail or exc.reason}") from exc
    except URLError as exc:
        raise RuntimeError(f"Telegram API request failed: {exc.reason}") from exc


def _send_telegram_message(text: str, chat_id: str, reply_markup: dict[str, Any] | None = None) -> dict[str, Any]:
    return _telegram_api_call(
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
            **({"reply_markup": reply_markup} if reply_markup else {}),
        },
    )


def _edit_telegram_message(
    *,
    chat_id: str,
    message_id: int,
    text: str,
    reply_markup: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return _telegram_api_call(
        "editMessageText",
        {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
            **({"reply_markup": reply_markup} if reply_markup else {}),
        },
    )


def _answer_telegram_callback(callback_query_id: str, text: str | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"callback_query_id": callback_query_id}
    if text:
        payload["text"] = text
    return _telegram_api_call("answerCallbackQuery", payload)


def _telegram_configured_chat_ids() -> list[str]:
    chat_ids = _parse_csv_list(os.getenv("TELEGRAM_ALLOWED_CHAT_IDS")) or list(DEFAULT_TELEGRAM_ALLOWED_CHAT_IDS)
    direct_chat_id = str(os.getenv("TELEGRAM_CHAT_ID", "")).strip()
    if direct_chat_id and direct_chat_id not in chat_ids:
        chat_ids.append(direct_chat_id)
    return chat_ids


def _is_telegram_chat_allowed(chat_id: str, store: dict[str, Any]) -> bool:
    configured_chat_ids = _telegram_configured_chat_ids()
    if configured_chat_ids:
        return chat_id in configured_chat_ids
    return bool(os.getenv("TELEGRAM_WEBHOOK_SECRET", "").strip()) or any(
        str(chat.get("chatId") or "") == chat_id for chat in store.get("telegramChats", []) if isinstance(chat, dict)
    )


def _format_telegram_chat_label(chat: dict[str, Any]) -> str:
    return (
        str(chat.get("title") or "").strip()
        or (f"@{str(chat.get('username') or '').strip()}" if str(chat.get("username") or "").strip() else "")
        or str(chat.get("firstName") or "").strip()
        or str(chat.get("chatId") or "").strip()
    )


def _register_telegram_chat(store: dict[str, Any], chat: dict[str, Any]) -> dict[str, Any]:
    chat_id = str(chat.get("id") or "").strip()
    if not chat_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Telegram chat id is missing")

    now = _utc_now_iso()
    chats = store.setdefault("telegramChats", [])
    existing = next((item for item in chats if isinstance(item, dict) and str(item.get("chatId") or "") == chat_id), None)
    configured_primary = bool(str(os.getenv("TELEGRAM_CHAT_ID", "")).strip())
    has_primary = any(bool(item.get("isPrimary")) for item in chats if isinstance(item, dict))
    is_primary = not configured_primary and not has_primary

    data = {
        "chatId": chat_id,
        "type": str(chat.get("type") or ""),
        "title": str(chat.get("title") or "").strip() or None,
        "username": str(chat.get("username") or "").strip() or None,
        "firstName": str(chat.get("first_name") or chat.get("firstName") or "").strip() or None,
        "lastName": str(chat.get("last_name") or chat.get("lastName") or "").strip() or None,
        "lastInteractionAt": now,
        "updatedAt": now,
    }
    if existing is None:
        existing = {
            "id": _new_id("tg-chat"),
            **data,
            "notificationsEnabled": True,
            "isPrimary": is_primary,
            "createdAt": now,
        }
        chats.append(existing)
    else:
        existing.update(data)
        existing.setdefault("notificationsEnabled", True)
        existing.setdefault("isPrimary", is_primary)
        existing.setdefault("createdAt", now)
    return existing


def _telegram_secondary_keyboard(extra_rows: list[list[dict[str, str]]] | None = None) -> dict[str, Any]:
    return {"inline_keyboard": [*(extra_rows or []), [{"text": "Главное меню", "callback_data": "menu:home"}]]}


def _telegram_with_active_mark(label: str, active: bool) -> str:
    return f"• {label}" if active else label


def _telegram_period_range(period: str) -> tuple[datetime, datetime, str]:
    now = datetime.now(timezone.utc)
    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return start, now, "сегодня"
    days = {"week": 7, "month": 30, "quarter": 90}.get(period, 7)
    return now - timedelta(days=days), now, f"последние {days} дней"


def _stats_reset_at(store: dict[str, Any]) -> datetime | None:
    raw_value = (store.get("appState") or {}).get("statsResetAt") if isinstance(store.get("appState"), dict) else None
    return _parse_datetime_safe(raw_value)


def _effective_stats_range(store: dict[str, Any], date_from: datetime, date_to: datetime) -> tuple[datetime, datetime]:
    reset_at = _stats_reset_at(store)
    if reset_at and reset_at > date_from:
        return reset_at, date_to
    return date_from, date_to


def _format_stats_range_label(date_from: datetime, date_to: datetime, fallback: str) -> str:
    if fallback:
        return fallback
    return f"{date_from.strftime('%d.%m.%Y')} — {date_to.strftime('%d.%m.%Y')}"


def _group_counter_items(values: list[Any]) -> list[dict[str, Any]]:
    counters: dict[str, int] = {}
    for value in values:
        label = _sanitize_source_text(value)
        if not label:
            continue
        counters[label] = counters.get(label, 0) + 1
    return [
        {"label": label, "value": count}
        for label, count in sorted(counters.items(), key=lambda item: item[1], reverse=True)
    ]


def _format_counter_list(items: list[dict[str, Any]], empty_text: str = "Пока данных нет.") -> str:
    if not items:
        return empty_text
    return "\n".join(
        f"• {html.escape(str(item.get('label') or ''))} — {int(item.get('value') or 0)}"
        for item in items[:6]
    )


def _active_landing_session_ids(store: dict[str, Any], date_from: datetime, date_to: datetime) -> set[str]:
    session_ids: set[str] = set()
    for event in store.get("analyticsEvents", []):
        if _is_in_stats_range(event.get("createdAt"), date_from, date_to):
            session_id = str(event.get("sessionId") or "").strip()
            if session_id:
                session_ids.add(session_id)
    for lead in store.get("landingLeads", []):
        if _is_deleted_landing_lead(lead):
            continue
        if _is_in_stats_range(lead.get("createdAt"), date_from, date_to):
            session_id = str(lead.get("sessionId") or "").strip()
            if session_id:
                session_ids.add(session_id)
    return session_ids


def _analytics_payload_value(event: dict[str, Any], key: str) -> Any:
    payload = event.get("payload")
    if isinstance(payload, dict):
        return payload.get(key)
    return None


def _format_duration(seconds: int) -> str:
    if seconds <= 0:
        return "0 сек"
    minutes = seconds // 60
    remaining = seconds % 60
    if minutes == 0:
        return f"{seconds} сек"
    if remaining == 0:
        return f"{minutes} мин"
    return f"{minutes} мин {remaining} сек"


def _landing_overview_stats(store: dict[str, Any], period: str) -> dict[str, Any]:
    raw_from, raw_to, label = _telegram_period_range(period)
    date_from, date_to = _effective_stats_range(store, raw_from, raw_to)
    active_session_ids = _active_landing_session_ids(store, date_from, date_to)
    leads = [
        lead
        for lead in store.get("landingLeads", [])
        if not _is_deleted_landing_lead(lead) and _is_in_stats_range(lead.get("createdAt"), date_from, date_to)
    ]
    page_views = sum(
        1
        for event in store.get("analyticsEvents", [])
        if str(event.get("eventName") or "") == "page_view" and _is_in_stats_range(event.get("createdAt"), date_from, date_to)
    )
    form_starts = sum(
        1
        for event in store.get("analyticsEvents", [])
        if str(event.get("eventName") or "") == "form_start" and _is_in_stats_range(event.get("createdAt"), date_from, date_to)
    )
    max_time_by_session: dict[str, int] = {}
    for event in store.get("analyticsEvents", []):
        if str(event.get("eventName") or "") != "time_on_page" or not _is_in_stats_range(event.get("createdAt"), date_from, date_to):
            continue
        session_id = str(event.get("sessionId") or "").strip()
        seconds = _analytics_payload_value(event, "seconds")
        if session_id and isinstance(seconds, int):
            max_time_by_session[session_id] = max(max_time_by_session.get(session_id, 0), seconds)
    avg_time = round(sum(max_time_by_session.values()) / len(max_time_by_session)) if max_time_by_session else 0
    unique_sessions = len(active_session_ids)
    return {
        "label": _format_stats_range_label(date_from, date_to, label),
        "unique_sessions": unique_sessions,
        "visits_total": page_views,
        "form_start_count": form_starts,
        "leads_total": len(leads),
        "conversion_rate": round((len(leads) / unique_sessions) * 100, 2) if unique_sessions else 0.0,
        "avg_time_on_page": avg_time,
    }


def _format_overview_for_telegram(stats: dict[str, Any]) -> str:
    return "\n".join(
        [
            f"<b>Сводка: {html.escape(str(stats.get('label') or ''))}</b>",
            "",
            f"Посетители: {int(stats.get('unique_sessions') or 0)}",
            f"Переходы на сайт: {int(stats.get('visits_total') or 0)}",
            f"Начали запись: {int(stats.get('form_start_count') or 0)}",
            f"Новые заявки: {int(stats.get('leads_total') or 0)}",
            f"Конверсия в заявку: {float(stats.get('conversion_rate') or 0)}%",
            f"Среднее время на сайте: {_format_duration(int(stats.get('avg_time_on_page') or 0))}",
        ]
    )


def _landing_sources_stats(store: dict[str, Any], period: str) -> dict[str, Any]:
    raw_from, raw_to, label = _telegram_period_range(period)
    date_from, date_to = _effective_stats_range(store, raw_from, raw_to)
    session_ids = _active_landing_session_ids(store, date_from, date_to)
    sessions = [
        session
        for session in store.get("landingSessions", [])
        if str(session.get("sessionId") or "") in session_ids
    ]
    leads = [
        lead
        for lead in store.get("landingLeads", [])
        if not _is_deleted_landing_lead(lead) and _is_in_stats_range(lead.get("createdAt"), date_from, date_to)
    ]
    return {
        "label": _format_stats_range_label(date_from, date_to, label),
        "src": _group_counter_items([session.get("src") for session in sessions] + [lead.get("src") for lead in leads]),
        "utm_source": _group_counter_items([session.get("utmSource") for session in sessions] + [lead.get("utmSource") for lead in leads]),
        "utm_medium": _group_counter_items([session.get("utmMedium") for session in sessions] + [lead.get("utmMedium") for lead in leads]),
        "utm_campaign": _group_counter_items([session.get("utmCampaign") for session in sessions] + [lead.get("utmCampaign") for lead in leads]),
        "manual_sources": _group_counter_items([lead.get("discoverySource") for lead in leads]),
    }


def _build_sources_message(store: dict[str, Any], period: str) -> str:
    stats = _landing_sources_stats(store, period)
    return "\n\n".join(
        [
            f"<b>Источники: {html.escape(str(stats.get('label') or ''))}</b>",
            f"<b>Канал</b>\n{_format_counter_list(stats['src'])}",
            f"<b>UTM source</b>\n{_format_counter_list(stats['utm_source'])}",
            f"<b>UTM medium</b>\n{_format_counter_list(stats['utm_medium'])}",
            f"<b>Как узнали из анкеты</b>\n{_format_counter_list(stats['manual_sources'])}",
        ]
    )


def _build_conversion_message(store: dict[str, Any], period: str) -> str:
    raw_from, raw_to, label = _telegram_period_range(period)
    date_from, date_to = _effective_stats_range(store, raw_from, raw_to)
    active_sessions = _active_landing_session_ids(store, date_from, date_to)
    form_start_sessions = {
        str(event.get("sessionId") or "").strip()
        for event in store.get("analyticsEvents", [])
        if str(event.get("eventName") or "") == "form_start" and _is_in_stats_range(event.get("createdAt"), date_from, date_to)
    }
    lead_sessions = {
        str(lead.get("sessionId") or "").strip()
        for lead in store.get("landingLeads", [])
        if not _is_deleted_landing_lead(lead) and _is_in_stats_range(lead.get("createdAt"), date_from, date_to)
    }
    form_start_sessions.discard("")
    lead_sessions.discard("")
    leads_count = sum(
        1
        for lead in store.get("landingLeads", [])
        if not _is_deleted_landing_lead(lead) and _is_in_stats_range(lead.get("createdAt"), date_from, date_to)
    )
    sessions_count = len(active_sessions)
    form_starts_count = len(form_start_sessions)
    lead_sessions_count = len(lead_sessions)

    def rate(part: int, total: int) -> float:
        return round((part / total) * 100, 2) if total else 0.0

    return "\n".join(
        [
            f"<b>Воронка: {html.escape(_format_stats_range_label(date_from, date_to, label))}</b>",
            "",
            f"Сессии: {sessions_count}",
            f"Начали форму: {form_starts_count} ({rate(form_starts_count, sessions_count)}%)",
            f"Оставили заявку: {leads_count} ({rate(lead_sessions_count, sessions_count)}%)",
            f"Форма → заявка: {rate(lead_sessions_count, form_starts_count)}%",
        ]
    )


def _overview_stats_keyboard(active_period: str) -> dict[str, Any]:
    return _telegram_secondary_keyboard(
        [
            [
                {"text": _telegram_with_active_mark("Сегодня", active_period == "today"), "callback_data": "stats:today"},
                {"text": _telegram_with_active_mark("7д", active_period == "week"), "callback_data": "stats:week"},
                {"text": _telegram_with_active_mark("30д", active_period == "month"), "callback_data": "stats:month"},
                {"text": _telegram_with_active_mark("90д", active_period == "quarter"), "callback_data": "stats:quarter"},
            ],
            [{"text": "Обновить", "callback_data": f"stats:{active_period}"}],
        ]
    )


def _long_stats_keyboard(kind: str, active_period: str) -> dict[str, Any]:
    return _telegram_secondary_keyboard(
        [
            [
                {"text": _telegram_with_active_mark("7д", active_period == "week"), "callback_data": f"stats:{kind}:week"},
                {"text": _telegram_with_active_mark("30д", active_period == "month"), "callback_data": f"stats:{kind}:month"},
                {"text": _telegram_with_active_mark("90д", active_period == "quarter"), "callback_data": f"stats:{kind}:quarter"},
            ],
            [{"text": "Обновить", "callback_data": f"stats:{kind}:{active_period}"}],
        ]
    )


def _is_deleted_landing_lead(lead: dict[str, Any]) -> bool:
    return str(lead.get("status") or "") == "deleted" or bool(lead.get("deletedAt"))


def _active_landing_leads(store: dict[str, Any]) -> list[dict[str, Any]]:
    leads = [lead for lead in store.get("landingLeads", []) if isinstance(lead, dict) and not _is_deleted_landing_lead(lead)]
    leads.sort(
        key=lambda item: _parse_datetime_safe(item.get("createdAt")) or datetime.fromtimestamp(0, tz=timezone.utc),
        reverse=True,
    )
    return leads


def _find_landing_lead_by_id(store: dict[str, Any], lead_id: str) -> dict[str, Any] | None:
    for lead in store.get("landingLeads", []):
        if isinstance(lead, dict) and str(lead.get("id") or "") == lead_id and not _is_deleted_landing_lead(lead):
            return lead
    return None


def _telegram_trim_button_label(value: str, max_length: int = 24) -> str:
    text = value.strip()
    return text if len(text) <= max_length else f"{text[: max_length - 1]}…"


def _telegram_short_datetime(value: Any) -> str:
    parsed = _parse_datetime_safe(value)
    if parsed is None:
        return "без даты"
    return parsed.astimezone().strftime("%d.%m %H:%M")


def _landing_leads_page(store: dict[str, Any], page: int, page_size: int = 10) -> dict[str, Any]:
    leads = _active_landing_leads(store)
    total_pages = max(1, (len(leads) + page_size - 1) // page_size)
    safe_page = max(1, min(page, total_pages))
    start = (safe_page - 1) * page_size
    return {
        "items": leads[start : start + page_size],
        "page": safe_page,
        "totalPages": total_pages,
        "totalLeads": len(leads),
    }


def _parse_positive_int(value: Any, default: int = 1) -> int:
    try:
        parsed = int(value)
        return parsed if parsed > 0 else default
    except Exception:
        return default


def _parse_lead_action(data: str, prefix: str) -> tuple[str, int] | None:
    if not data.startswith(prefix):
        return None
    payload = data[len(prefix) :]
    lead_id, _, page_raw = payload.partition(":")
    if not lead_id:
        return None
    return lead_id, _parse_positive_int(page_raw, 1)


def _leads_page_callback(page: int) -> str:
    return f"leads:page:{max(1, int(page))}"


def _telegram_contact_call_url(phone: str) -> str:
    return f"{_frontend_base_url()}/api/contact/call?{urlencode({'phone': phone})}"


def _telegram_whatsapp_url(lead: dict[str, Any], phone: str) -> str | None:
    for key in ("whatsappUrl", "whatsappLink", "whatsapp", "waUrl", "waLink"):
        value = str(lead.get(key) or "").strip()
        if value.startswith(("https://", "http://")):
            return value
    digits = _phone_to_msisdn(phone)
    if not digits:
        return None
    return f"https://wa.me/{digits}"


def _telegram_profile_url(value: Any) -> str | None:
    raw = str(value or "").strip()
    if not raw:
        return None
    if raw.startswith(("https://t.me/", "http://t.me/", "tg://")):
        return raw
    if raw.startswith("@"):
        raw = raw[1:]
    if re.fullmatch(r"[A-Za-z0-9_]{5,32}", raw):
        return f"https://t.me/{raw}"
    return None


def _telegram_lead_profile_url(lead: dict[str, Any]) -> str | None:
    for key in ("telegramUrl", "telegramLink", "telegramUsername", "telegram", "tgUsername", "tgLink"):
        url = _telegram_profile_url(lead.get(key))
        if url:
            return url
    return None


def _build_lead_contact_keyboard_rows(lead: dict[str, Any]) -> list[list[dict[str, str]]]:
    phone = _normalize_phone(str(lead.get("phone") or ""))
    rows: list[list[dict[str, str]]] = []
    if phone:
        rows.append([{"text": "Позвонить", "url": _telegram_contact_call_url(phone)}])

    social_row: list[dict[str, str]] = []
    telegram_url = _telegram_lead_profile_url(lead)
    if telegram_url:
        social_row.append({"text": "Telegram", "url": telegram_url})
    whatsapp_url = _telegram_whatsapp_url(lead, phone) if phone else None
    if whatsapp_url:
        social_row.append({"text": "WhatsApp", "url": whatsapp_url})
    if social_row:
        rows.append(social_row)
    return rows


def _build_leads_keyboard(leads: list[dict[str, Any]], page: int, total_pages: int) -> dict[str, Any]:
    rows: list[list[dict[str, str]]] = []
    for lead in leads:
        viewed_mark = "✓" if lead.get("reviewedAt") else "•"
        label = f"{viewed_mark} {_telegram_short_datetime(lead.get('createdAt'))} · {_telegram_trim_button_label(str(lead.get('childFullName') or 'Ребёнок'))}"
        rows.append([{"text": label, "callback_data": f"lead:view:{lead.get('id')}:{page}"}])
    if total_pages > 1:
        nav_row: list[dict[str, str]] = []
        if page > 1:
            nav_row.append({"text": "‹", "callback_data": _leads_page_callback(page - 1)})
        nav_row.append({"text": f"{page}/{total_pages}", "callback_data": _leads_page_callback(page)})
        if page < total_pages:
            nav_row.append({"text": "›", "callback_data": _leads_page_callback(page + 1)})
        rows.append(nav_row)
    rows.append([{"text": "Обновить список", "callback_data": _leads_page_callback(page)}])
    rows.append([{"text": "Главное меню", "callback_data": "menu:home"}])
    return {"inline_keyboard": rows}


def _build_lead_details_keyboard(lead: dict[str, Any], page: int) -> dict[str, Any]:
    lead_id = str(lead.get("id") or "")
    return {
        "inline_keyboard": [
            *_build_lead_contact_keyboard_rows(lead),
            [
                {
                    "text": "Снять отметку" if lead.get("reviewedAt") else "Просмотрена",
                    "callback_data": f"lead:toggle_viewed:{lead_id}:{page}",
                }
            ],
            [{"text": "Удалить", "callback_data": f"lead:delete_confirm:{lead_id}:{page}"}],
            [{"text": "К списку заявок", "callback_data": _leads_page_callback(page)}],
            [{"text": "Главное меню", "callback_data": "menu:home"}],
        ]
    }


def _build_lead_delete_confirm_keyboard(lead_id: str, page: int) -> dict[str, Any]:
    return {
        "inline_keyboard": [
            [{"text": "Подтвердить удаление", "callback_data": f"lead:delete_apply:{lead_id}:{page}"}],
            [{"text": "Назад к анкете", "callback_data": f"lead:view:{lead_id}:{page}"}],
            [{"text": "К списку заявок", "callback_data": _leads_page_callback(page)}],
        ]
    }


def _build_admin_home(store: dict[str, Any], chat_id: str) -> dict[str, Any]:
    chat = next((item for item in store.get("telegramChats", []) if str(item.get("chatId") or "") == chat_id), None)
    chat_label = _format_telegram_chat_label(chat) if isinstance(chat, dict) else chat_id
    return {
        "text": "\n".join(
            [
                "<b>Манера CRM</b>",
                "",
                f"Чат подключён: {html.escape(chat_label)}",
                "Доступны заявки с лендинга, источники и статистика.",
            ]
        ),
        "reply_markup": {
            "inline_keyboard": [
                [
                    {"text": "Сегодня", "callback_data": "stats:today"},
                    {"text": "7 дней", "callback_data": "stats:week"},
                    {"text": "30 дней", "callback_data": "stats:month"},
                ],
                [
                    {"text": "Заявки", "callback_data": "leads:recent"},
                    {"text": "Источники", "callback_data": "stats:sources"},
                ],
                [
                    {"text": "Воронка", "callback_data": "stats:conversion"},
                    {"text": "Настройки", "callback_data": "settings:view"},
                ],
            ]
        },
    }


def _build_recent_leads_message(page_data: dict[str, Any]) -> str:
    if int(page_data.get("totalLeads") or 0) == 0:
        return "<b>Заявки</b>\n\nПока новых заявок нет."
    return "\n".join(
        [
            "<b>Последние заявки</b>",
            "",
            f"Всего: {int(page_data.get('totalLeads') or 0)}",
            f"Страница: {int(page_data.get('page') or 1)}/{int(page_data.get('totalPages') or 1)}",
            "",
            "Откройте заявку кнопкой ниже.",
        ]
    )


def _build_recent_leads_response(store: dict[str, Any], page: int = 1) -> dict[str, Any]:
    page_data = _landing_leads_page(store, page)
    return {
        "text": _build_recent_leads_message(page_data),
        "reply_markup": _build_leads_keyboard(page_data["items"], page_data["page"], page_data["totalPages"]),
    }


def _build_lead_details_message(lead: dict[str, Any]) -> str:
    reviewed = _format_telegram_datetime(lead.get("reviewedAt")) if lead.get("reviewedAt") else "нет"
    return "\n".join(
        [
            "<b>Заявка</b>",
            "",
            f"<b>Создана:</b> {html.escape(_format_telegram_datetime(lead.get('createdAt')))}",
            f"<b>Просмотрена:</b> {html.escape(reviewed)}",
            "",
            "<b>Ребёнок</b>",
            html.escape(str(lead.get("childFullName") or "Не указан")),
            html.escape(_format_birth_date_with_age(lead.get("childBirthDate"))),
            "",
            "<b>Родитель</b>",
            html.escape(str(lead.get("parentFullName") or "Не указан")),
            html.escape(str(lead.get("phone") or "Не указан")),
            "",
            "<b>Дополнительно</b>",
            f"Как узнали: {html.escape(_resolve_landing_lead_source_label(lead))}",
            f"Опыт: {html.escape(str(lead.get('previousActivities') or 'Не указан'))}",
            f"Ограничения: {html.escape(str(lead.get('medicalRestrictions') or 'Не указаны'))}",
            f"График: {html.escape(str(lead.get('preferredSchedule') or 'Не указан'))}",
            f"Комментарий: {html.escape(str(lead.get('comment') or 'Нет'))}",
        ]
    )


def _build_lead_details_response(store: dict[str, Any], lead_id: str, page: int) -> dict[str, Any]:
    lead = _find_landing_lead_by_id(store, lead_id)
    if lead is None:
        return {
            "text": "<b>Анкета не найдена</b>\n\nВозможно, она уже была удалена.",
            "reply_markup": _telegram_secondary_keyboard([[{"text": "К списку заявок", "callback_data": _leads_page_callback(page)}]]),
        }
    return {"text": _build_lead_details_message(lead), "reply_markup": _build_lead_details_keyboard(lead, page)}


def _build_settings_keyboard(chat: dict[str, Any]) -> dict[str, Any]:
    rows = [
        [
            {
                "text": "Выключить уведомления" if bool(chat.get("notificationsEnabled", True)) else "Включить уведомления",
                "callback_data": "settings:toggle_notifications",
            }
        ],
        [
            {
                "text": "Этот чат основной" if bool(chat.get("isPrimary")) else "Сделать этот чат основным",
                "callback_data": "settings:make_primary",
            }
        ],
        [{"text": "Очистить статистику", "callback_data": "settings:reset_stats_confirm"}],
    ]
    return _telegram_secondary_keyboard(rows)


def _build_settings_response(store: dict[str, Any], chat_id: str) -> dict[str, Any]:
    chat = next((item for item in store.get("telegramChats", []) if isinstance(item, dict) and str(item.get("chatId") or "") == chat_id), None)
    if chat is None:
        return {"text": "Чат ещё не зарегистрирован. Отправьте /start ещё раз.", "reply_markup": _telegram_secondary_keyboard()}
    primary = next((item for item in store.get("telegramChats", []) if isinstance(item, dict) and bool(item.get("isPrimary"))), None)
    fixed_primary = str(os.getenv("TELEGRAM_CHAT_ID", "")).strip()
    primary_label = "закреплён в настройках сервера" if fixed_primary else (_format_telegram_chat_label(primary) if isinstance(primary, dict) else "не назначен")
    reset_at = _stats_reset_at(store)
    return {
        "text": "\n".join(
            [
                "<b>Настройки уведомлений</b>",
                "",
                f"<b>Чат:</b> {html.escape(_format_telegram_chat_label(chat))}",
                f"<b>Уведомления:</b> {'включены' if bool(chat.get('notificationsEnabled', True)) else 'выключены'}",
                f"<b>Основной чат:</b> {html.escape(primary_label)}",
                f"<b>Статистика с:</b> {html.escape(_format_telegram_datetime(reset_at) if reset_at else 'начала сбора данных')}",
            ]
        ),
        "reply_markup": _build_settings_keyboard(chat),
    }


def _handle_telegram_text(store: dict[str, Any], text: str, chat: dict[str, Any]) -> dict[str, Any]:
    registered = _register_telegram_chat(store, chat)
    chat_id = str(registered.get("chatId") or "")
    command = text.strip()
    if command in {"/start", "/menu"} or command.lower() == "меню":
        return _build_admin_home(store, chat_id)
    if command == "/stats_today":
        return {"text": _format_overview_for_telegram(_landing_overview_stats(store, "today")), "reply_markup": _overview_stats_keyboard("today")}
    if command == "/stats_week":
        return {"text": _format_overview_for_telegram(_landing_overview_stats(store, "week")), "reply_markup": _overview_stats_keyboard("week")}
    if command == "/stats_month":
        return {"text": _format_overview_for_telegram(_landing_overview_stats(store, "month")), "reply_markup": _overview_stats_keyboard("month")}
    if command == "/stats_quarter":
        return {"text": _format_overview_for_telegram(_landing_overview_stats(store, "quarter")), "reply_markup": _overview_stats_keyboard("quarter")}
    if command == "/stats_sources":
        return {"text": _build_sources_message(store, "week"), "reply_markup": _long_stats_keyboard("sources", "week")}
    if command == "/stats_sources_month":
        return {"text": _build_sources_message(store, "month"), "reply_markup": _long_stats_keyboard("sources", "month")}
    if command == "/stats_sources_quarter":
        return {"text": _build_sources_message(store, "quarter"), "reply_markup": _long_stats_keyboard("sources", "quarter")}
    if command == "/stats_conversion":
        return {"text": _build_conversion_message(store, "week"), "reply_markup": _long_stats_keyboard("conversion", "week")}
    if command == "/stats_conversion_month":
        return {"text": _build_conversion_message(store, "month"), "reply_markup": _long_stats_keyboard("conversion", "month")}
    if command == "/stats_conversion_quarter":
        return {"text": _build_conversion_message(store, "quarter"), "reply_markup": _long_stats_keyboard("conversion", "quarter")}
    if command == "/leads_recent":
        return _build_recent_leads_response(store)
    if command == "/clear_stats":
        return {
            "text": "<b>Очистить статистику?</b>\n\nЗаявки и уведомления не будут удалены. Бот начнёт считать статистику с текущего момента.",
            "reply_markup": _telegram_secondary_keyboard([[{"text": "Да, очистить", "callback_data": "settings:reset_stats_apply"}]]),
        }
    return {
        "text": "<b>Команда не распознана</b>\n\nИспользуйте /start или кнопку ниже, чтобы открыть меню.",
        "reply_markup": _telegram_secondary_keyboard(),
    }


def _handle_telegram_callback(store: dict[str, Any], data: str, chat: dict[str, Any]) -> dict[str, Any]:
    registered = _register_telegram_chat(store, chat)
    chat_id = str(registered.get("chatId") or "")
    if data == "menu:home":
        return _build_admin_home(store, chat_id)
    if data in {"stats:today", "stats:week", "stats:month", "stats:quarter"}:
        period = data.split(":", 1)[1]
        return {"text": _format_overview_for_telegram(_landing_overview_stats(store, period)), "reply_markup": _overview_stats_keyboard(period)}
    if data == "stats:sources":
        return {"text": _build_sources_message(store, "week"), "reply_markup": _long_stats_keyboard("sources", "week")}
    if data.startswith("stats:sources:"):
        period = data.rsplit(":", 1)[-1]
        if period in {"week", "month", "quarter"}:
            return {"text": _build_sources_message(store, period), "reply_markup": _long_stats_keyboard("sources", period)}
    if data == "stats:conversion":
        return {"text": _build_conversion_message(store, "week"), "reply_markup": _long_stats_keyboard("conversion", "week")}
    if data.startswith("stats:conversion:"):
        period = data.rsplit(":", 1)[-1]
        if period in {"week", "month", "quarter"}:
            return {"text": _build_conversion_message(store, period), "reply_markup": _long_stats_keyboard("conversion", period)}
    if data == "leads:recent":
        return _build_recent_leads_response(store)
    if data.startswith("leads:page:"):
        return _build_recent_leads_response(store, _parse_positive_int(data.rsplit(":", 1)[-1], 1))
    lead_view = _parse_lead_action(data, "lead:view:")
    if lead_view:
        return _build_lead_details_response(store, lead_view[0], lead_view[1])
    lead_toggle = _parse_lead_action(data, "lead:toggle_viewed:")
    if lead_toggle:
        lead = _find_landing_lead_by_id(store, lead_toggle[0])
        if lead is None:
            return _build_lead_details_response(store, lead_toggle[0], lead_toggle[1])
        lead["reviewedAt"] = None if lead.get("reviewedAt") else _utc_now_iso()
        lead["updatedAt"] = _utc_now_iso()
        return _build_lead_details_response(store, lead_toggle[0], lead_toggle[1])
    lead_delete_confirm = _parse_lead_action(data, "lead:delete_confirm:")
    if lead_delete_confirm:
        lead = _find_landing_lead_by_id(store, lead_delete_confirm[0])
        if lead is None:
            return _build_lead_details_response(store, lead_delete_confirm[0], lead_delete_confirm[1])
        return {
            "text": f"<b>Удалить заявку?</b>\n\n{html.escape(str(lead.get('childFullName') or 'Ребёнок'))} · {html.escape(str(lead.get('parentFullName') or 'Родитель'))}",
            "reply_markup": _build_lead_delete_confirm_keyboard(lead_delete_confirm[0], lead_delete_confirm[1]),
        }
    lead_delete_apply = _parse_lead_action(data, "lead:delete_apply:")
    if lead_delete_apply:
        lead = _find_landing_lead_by_id(store, lead_delete_apply[0])
        if lead is not None:
            lead["status"] = "deleted"
            lead["deletedAt"] = _utc_now_iso()
            lead["updatedAt"] = _utc_now_iso()
        return {
            "text": "<b>Заявка удалена</b>",
            "reply_markup": _telegram_secondary_keyboard([[{"text": "К списку заявок", "callback_data": _leads_page_callback(lead_delete_apply[1])}]]),
        }
    if data == "settings:view":
        return _build_settings_response(store, chat_id)
    if data == "settings:toggle_notifications":
        registered["notificationsEnabled"] = not bool(registered.get("notificationsEnabled", True))
        registered["updatedAt"] = _utc_now_iso()
        return _build_settings_response(store, chat_id)
    if data == "settings:make_primary":
        if str(os.getenv("TELEGRAM_CHAT_ID", "")).strip():
            return {
                "text": "<b>Настройки уведомлений</b>\n\nОсновной чат закреплён на сервере. Управление этим параметром из бота недоступно.",
                "reply_markup": _telegram_secondary_keyboard(),
            }
        for item in store.get("telegramChats", []):
            if isinstance(item, dict):
                item["isPrimary"] = str(item.get("chatId") or "") == chat_id
                if item["isPrimary"]:
                    item["notificationsEnabled"] = True
                item["updatedAt"] = _utc_now_iso()
        return _build_settings_response(store, chat_id)
    if data == "settings:reset_stats_confirm":
        return {
            "text": "<b>Очистить статистику?</b>\n\nЗаявки и уведомления не будут удалены. Бот начнёт считать статистику с текущего момента.",
            "reply_markup": _telegram_secondary_keyboard([[{"text": "Да, очистить", "callback_data": "settings:reset_stats_apply"}]]),
        }
    if data == "settings:reset_stats_apply":
        store.setdefault("appState", {})["statsResetAt"] = _utc_now_iso()
        return {
            "text": f"<b>Статистика очищена</b>\n\nНовая точка отсчёта: {html.escape(_format_telegram_datetime(store['appState']['statsResetAt']))}\nАнкеты и уведомления не удалены.",
            "reply_markup": _telegram_secondary_keyboard([[{"text": "Сегодня", "callback_data": "stats:today"}, {"text": "Заявки", "callback_data": "leads:recent"}]]),
        }
    return {"text": "Действие не распознано. Вернитесь в главное меню.", "reply_markup": _telegram_secondary_keyboard()}


def _resolve_landing_lead_source_label(lead: dict[str, Any]) -> str:
    manual_source = str(lead.get("discoverySource") or "").strip()
    if manual_source:
        return manual_source
    return _sanitize_source_text(lead.get("utmSource")) or _sanitize_source_text(lead.get("src")) or "Не указано"


def _format_landing_lead_telegram_message(lead: dict[str, Any]) -> str:
    child_birth_date = _format_birth_date_with_age(lead.get("childBirthDate"))
    medical_restrictions = str(lead.get("medicalRestrictions") or "").strip() or "Не указаны"
    previous_activities = str(lead.get("previousActivities") or "").strip() or "Не указан"
    created_at = _format_telegram_datetime(lead.get("createdAt") or _utc_now_iso())
    source_label = _resolve_landing_lead_source_label(lead)

    return "\n".join(
        [
            "<b>Новая заявка</b>",
            "",
            f"<b>Когда:</b> {html.escape(created_at)}",
            "",
            "<b>Ребёнок</b>",
            html.escape(str(lead.get("childFullName") or "").strip() or "Не указан"),
            html.escape(child_birth_date),
            "",
            "<b>Родитель</b>",
            html.escape(str(lead.get("parentFullName") or "").strip() or "Не указан"),
            html.escape(str(lead.get("phone") or "").strip() or "Не указан"),
            "",
            "<b>Дополнительно</b>",
            f"Ограничения: {html.escape(medical_restrictions)}",
            f"Опыт: {html.escape(previous_activities)}",
            f"Как узнали: {html.escape(source_label)}",
        ]
    )


def _send_landing_lead_notification_to_telegram(store: dict[str, Any], lead: dict[str, Any]) -> dict[str, Any]:
    chat_ids = _resolve_telegram_notification_chat_ids(store)
    if not chat_ids or not _telegram_bot_token():
        return {"ok": False, "skipped": True}

    text = _format_landing_lead_telegram_message(lead)
    reply_markup = {"inline_keyboard": _build_lead_contact_keyboard_rows(lead)}
    delivered = 0
    last_error: Exception | None = None
    for chat_id in chat_ids:
        try:
            _send_telegram_message(text, chat_id, reply_markup if reply_markup["inline_keyboard"] else None)
            delivered += 1
        except Exception as exc:
            last_error = exc

    if delivered > 0:
        return {"ok": True, "delivered": delivered}
    if last_error is not None:
        raise last_error
    return {"ok": False, "skipped": True}


def _landing_lead_telegram_delivered(lead: dict[str, Any]) -> bool:
    delivery = lead.get("telegramDelivery")
    if not isinstance(delivery, dict):
        return False
    return bool(delivery.get("ok")) and int(delivery.get("delivered") or 0) > 0


def _record_landing_lead_telegram_delivery(
    lead: dict[str, Any],
    result: dict[str, Any] | None = None,
    *,
    error: str | None = None,
) -> None:
    now = _utc_now_iso()
    payload: dict[str, Any] = {
        "syncedAt": now,
        "ok": bool((result or {}).get("ok")) if result is not None else False,
        "delivered": int((result or {}).get("delivered") or 0) if result is not None else 0,
        "skipped": bool((result or {}).get("skipped")) if result is not None else False,
    }
    if error:
        payload["error"] = error[:500]
    lead["telegramDelivery"] = payload
    lead["updatedAt"] = now


def _landing_lead_has_form_submit_event(store: dict[str, Any], lead_id: str) -> bool:
    for event in store.get("analyticsEvents", []):
        if not isinstance(event, dict):
            continue
        if str(event.get("eventName") or "") != "form_submit":
            continue
        payload = event.get("payload")
        if isinstance(payload, dict) and str(payload.get("leadId") or "") == lead_id:
            return True
    return False


def _sync_landing_lead_integrations(
    store: dict[str, Any],
    lead: dict[str, Any],
    *,
    send_telegram: bool,
) -> dict[str, Any]:
    if _is_deleted_landing_lead(lead):
        return {"skipped": True, "reason": "deleted"}

    lead_id = str(lead.get("id") or "").strip()
    session_id = _clean_tracking_value(lead.get("sessionId"), 120) or f"legacy-lead-{lead_id}"
    source = {
        "src": lead.get("src"),
        "utm_source": lead.get("utmSource"),
        "utm_medium": lead.get("utmMedium"),
        "utm_campaign": lead.get("utmCampaign"),
        "utm_content": lead.get("utmContent"),
        "utm_term": lead.get("utmTerm"),
    }

    _append_landing_lead_owner_notification(store, lead)
    _upsert_landing_session(
        store,
        session_id,
        _normalize_tracking_source(source),
        user_agent=str(lead.get("userAgent") or ""),
        landing_path="/",
    )

    analytics_created = False
    if lead_id and not _landing_lead_has_form_submit_event(store, lead_id):
        _append_analytics_event(
            store,
            session_id,
            "form_submit",
            {
                "leadId": lead_id,
                "discoverySource": lead.get("discoverySource"),
                **_normalize_tracking_source(source),
            },
        )
        analytics_created = True

    telegram_result: dict[str, Any] | None = None
    telegram_error: str | None = None
    if send_telegram and not _landing_lead_telegram_delivered(lead):
        try:
            telegram_result = _send_landing_lead_notification_to_telegram(store, lead)
            _record_landing_lead_telegram_delivery(lead, telegram_result)
        except Exception as exc:
            telegram_error = str(exc)
            _record_landing_lead_telegram_delivery(lead, {"ok": False, "delivered": 0}, error=telegram_error)

    return {
        "leadId": lead_id,
        "analyticsCreated": analytics_created,
        "telegram": telegram_result or lead.get("telegramDelivery") or None,
        "telegramError": telegram_error,
    }


def _sync_existing_landing_integrations(
    store: dict[str, Any],
    *,
    send_telegram: bool = True,
    limit: int | None = None,
) -> dict[str, Any]:
    leads = _active_landing_leads(store)
    if limit is not None:
        leads = leads[: max(0, limit)]
    results = [
        _sync_landing_lead_integrations(store, lead, send_telegram=send_telegram)
        for lead in leads
    ]
    return {
        "ok": True,
        "processed": len(results),
        "telegramDelivered": sum(1 for item in results if int(((item.get("telegram") or {}).get("delivered") or 0)) > 0),
        "analyticsCreated": sum(1 for item in results if item.get("analyticsCreated")),
        "errors": [item for item in results if item.get("telegramError")],
        "results": results,
    }


def _append_landing_lead_owner_notification(store: dict[str, Any], lead: dict[str, Any]) -> None:
    owner_users = [
        user
        for user in store.get("users", [])
        if str(user.get("role") or "") in {"owner", "admin"} and user.get("id")
    ]
    additional_info = f"Телефон: {str(lead.get('phone') or '').strip()}"
    metadata = {
        "leadId": str(lead.get("id") or ""),
        "parentName": str(lead.get("parentFullName") or "").strip(),
        "parentPhone": str(lead.get("phone") or "").strip(),
        "childName": str(lead.get("childFullName") or "").strip(),
        "source": _resolve_landing_lead_source_label(lead),
    }
    for user in owner_users:
        _append_notification(
            store,
            user_id=str(user.get("id")),
            type_value="landing_lead",
            priority="high",
            title="Новая заявка с лендинга",
            message=f"{str(lead.get('parentFullName') or '').strip()} оставил(а) заявку на пробный урок.",
            additional_info=additional_info,
            metadata=metadata,
            dedup_key=f"landing-lead:{str(lead.get('id') or '')}:{str(user.get('id') or '')}",
            for_roles=["owner", "admin"],
        )


def _notify_parent_payment_status(
    store: dict[str, Any],
    *,
    payment: dict[str, Any],
    status_value: str,
) -> None:
    parent_user_id = str(payment.get("parentUserId") or "")
    if not parent_user_id:
        return

    amount = float(payment.get("amount") or 0)
    subscription_name = str(payment.get("subscriptionName") or "Абонемент")
    if status_value in {"pending", "unpaid"}:
        title = "Выставлен счет"
        message = f"{subscription_name}: {int(amount) if amount.is_integer() else amount} ₽"
        additional_info = "Для полного доступа к кабинету оплатите счет."
        priority = "high"
    elif status_value == "overdue":
        title = "Счет просрочен"
        message = f"{subscription_name}: {int(amount) if amount.is_integer() else amount} ₽"
        additional_info = "Срок оплаты прошел. Пожалуйста, оплатите счет в ближайшее время."
        priority = "high"
    elif status_value == "paid":
        title = "Оплата подтверждена"
        message = f"{subscription_name}: платеж принят"
        additional_info = "Доступ к разделам кабинета активирован."
        priority = "low"
    elif status_value == "failed":
        title = "Оплата не прошла"
        message = f"{subscription_name}: не удалось подтвердить платеж"
        additional_info = "Попробуйте оплатить снова или свяжитесь со студией."
        priority = "high"
    elif status_value in {"cancelled", "refunded"}:
        title = "Счет закрыт"
        message = f"{subscription_name}: счет закрыт"
        additional_info = None
        priority = "low"
    else:
        return

    _append_notification(
        store,
        user_id=parent_user_id,
        type_value="payment",
        priority=priority,
        title=title,
        message=message,
        additional_info=additional_info,
        metadata={
            "paymentId": payment.get("id"),
            "status": status_value,
            "paymentMethod": payment.get("paymentMethod"),
            "amount": payment.get("amount"),
            "invoiceNumber": payment.get("invoiceNumber"),
            "dueDate": payment.get("dueDate"),
            "subscriptionName": payment.get("subscriptionName"),
        },
        dedup_key=f"payment:{payment.get('id')}:{status_value}",
    )


def _notify_parents_news(store: dict[str, Any], news_item: dict[str, Any], mode: Literal["created", "updated"]) -> None:
    if not bool(news_item.get("published")):
        return
    news_id = str(news_item.get("id") or "")
    title = str(news_item.get("title") or "Публикация")
    content = str(news_item.get("content") or "")
    is_event = bool(news_item.get("isEvent"))
    prefix = "Новое мероприятие" if is_event else "Новая новость"
    if mode == "updated":
        prefix = "Обновление мероприятия" if is_event else "Обновление новости"

    for parent_user_id in _list_parent_user_ids(store):
        _append_notification(
            store,
            user_id=parent_user_id,
            type_value="general",
            priority="medium" if is_event else "low",
            title=prefix,
            message=title,
            additional_info=content[:220] if content else None,
            metadata={"newsId": news_id, "isEvent": is_event, "mode": mode},
            dedup_key=f"news:{news_id}:{mode}",
        )


def _notify_parents_document(store: dict[str, Any], document_item: dict[str, Any], mode: Literal["created", "updated"]) -> None:
    access_type = str(document_item.get("accessType") or "all")
    recipients: list[str] = []
    if access_type in {"all", "parents"}:
        recipients = _list_parent_user_ids(store)
    elif access_type == "specific":
        recipients = [str(value) for value in (document_item.get("assignedParents") or []) if value]
    else:
        recipients = []

    if not recipients:
        return

    title = str(document_item.get("name") or "Документ")
    message = "Добавлен документ" if mode == "created" else "Обновлен документ"
    for parent_user_id in recipients:
        _append_notification(
            store,
            user_id=parent_user_id,
            type_value="general",
            priority="low",
            title=message,
            message=title,
            additional_info=str(document_item.get("description") or "")[:220] or None,
            metadata={"documentId": document_item.get("id"), "mode": mode},
            dedup_key=f"document:{document_item.get('id')}:{mode}:{parent_user_id}",
        )


def _find_chat_by_id(store: dict[str, Any], chat_id: str) -> dict[str, Any] | None:
    for chat in store.get("communicationChats", []):
        if str(chat.get("id")) == chat_id:
            return chat
    return None


def _chat_messages(store: dict[str, Any], chat_id: str) -> list[dict[str, Any]]:
    rows = [item for item in store.get("communicationMessages", []) if str(item.get("chatId")) == chat_id]
    rows.sort(key=lambda item: _parse_datetime_safe(item.get("createdAt")) or datetime.fromtimestamp(0, tz=timezone.utc))
    return rows


def _build_parent_contact_context(store: dict[str, Any], parent_user_id: str) -> dict[str, str | None]:
    parent = _find_user_by_id(store, parent_user_id)
    parent_name = str(parent.get("name")) if parent else ""
    parent_phone = str(parent.get("phone")) if parent else ""
    parent_line = ", ".join([value for value in [parent_name, parent_phone] if value])

    children = [item for item in store.get("children", []) if str(item.get("parentUserId")) == parent_user_id]
    children.sort(
        key=lambda item: _parse_datetime_safe(item.get("updatedAt") or item.get("createdAt")) or datetime.fromtimestamp(0, tz=timezone.utc),
        reverse=True,
    )
    child = children[0] if children else None
    if not child:
        return {
            "parent_line": parent_line,
            "child_line": None,
        }

    child_name = str(child.get("fullName") or child.get("name") or "").strip()
    group_name = str(child.get("groupName") or "").strip()
    if not group_name:
        group_id = str(child.get("groupId") or "").strip()
        if group_id:
            group = next((item for item in store.get("ownerGroups", []) if str(item.get("id")) == group_id), None)
            group_name = str(group.get("name") if group else group_id).strip()

    client = next((item for item in store.get("clients", []) if str(item.get("childId")) == str(child.get("id"))), None)
    subscription_name = str(client.get("subscriptionName") or "").strip() if client else ""
    details = [value for value in [group_name, subscription_name] if value]
    child_line = child_name
    if details:
        child_line = f"{child_name} ({', '.join(details)})"

    return {
        "parent_line": parent_line,
        "child_line": child_line if child_line else None,
    }


def _serialize_chat_message(store: dict[str, Any], message: dict[str, Any]) -> dict[str, Any]:
    sender = _find_user_by_id(store, str(message.get("senderUserId") or ""))
    sender_role = str(message.get("senderRole", "parent"))
    sender_name = str(sender.get("name")) if sender else str(message.get("senderUserId"))
    sender_phone = str(sender.get("phone")) if sender else ""
    sender_contact_line = ", ".join([value for value in [sender_name, sender_phone] if value])
    sender_child_line = None
    if sender_role == "parent":
        context = _build_parent_contact_context(store, str(message.get("senderUserId") or ""))
        sender_contact_line = context.get("parent_line") or sender_contact_line
        sender_child_line = context.get("child_line")

    return {
        "id": str(message.get("id")),
        "chat_id": str(message.get("chatId")),
        "sender_user_id": str(message.get("senderUserId")),
        "sender_role": sender_role,
        "sender_name": sender_name,
        "sender_phone": sender_phone,
        "sender_contact_line": sender_contact_line,
        "sender_child_line": sender_child_line,
        "text": str(message.get("text", "")),
        "created_at": str(message.get("createdAt")),
    }


def _serialize_chat_summary(store: dict[str, Any], chat: dict[str, Any]) -> dict[str, Any]:
    parent = _find_user_by_id(store, str(chat.get("parentUserId") or ""))
    employee = _find_user_by_id(store, str(chat.get("employeeUserId") or ""))
    parent_context = _build_parent_contact_context(store, str(chat.get("parentUserId") or ""))
    employee_name = str(employee.get("name")) if employee else ""
    employee_phone = str(employee.get("phone")) if employee else ""
    employee_contact_line = ", ".join([value for value in [employee_name, employee_phone] if value])
    return {
        "id": str(chat.get("id")),
        "parent_user_id": str(chat.get("parentUserId") or ""),
        "parent_name": str(parent.get("name")) if parent else "",
        "parent_phone": str(parent.get("phone")) if parent else "",
        "parent_contact_line": parent_context.get("parent_line"),
        "parent_child_line": parent_context.get("child_line"),
        "employee_user_id": str(chat.get("employeeUserId") or ""),
        "employee_name": employee_name,
        "employee_role": str(employee.get("role")) if employee else str(chat.get("employeeRole", "teacher")),
        "employee_contact_line": employee_contact_line,
        "last_message_text": chat.get("lastMessageText"),
        "last_message_at": chat.get("lastMessageAt"),
        "created_at": str(chat.get("createdAt")),
        "updated_at": str(chat.get("updatedAt")),
        "status": str(chat.get("status", "open")),
        "parent_unread_count": int(chat.get("parentUnreadCount") or 0),
        "employee_unread_count": int(chat.get("employeeUnreadCount") or 0),
    }


def _create_chat_message(
    store: dict[str, Any],
    *,
    chat: dict[str, Any],
    sender_user: dict[str, Any],
    text: str,
) -> dict[str, Any]:
    now = _utc_now_iso()
    message = {
        "id": _new_id("cmsg"),
        "chatId": str(chat.get("id")),
        "senderUserId": str(sender_user.get("id")),
        "senderRole": str(sender_user.get("role", "parent")),
        "text": text.strip(),
        "createdAt": now,
    }
    store["communicationMessages"].append(message)
    chat["lastMessageText"] = text.strip()
    chat["lastMessageAt"] = now
    chat["updatedAt"] = now

    sender_is_parent = str(sender_user.get("id")) == str(chat.get("parentUserId"))
    if sender_is_parent:
        chat["employeeUnreadCount"] = int(chat.get("employeeUnreadCount") or 0) + 1
        recipient_id = str(chat.get("employeeUserId") or "")
        recipient_roles = ["owner", "admin", "teacher"]
    else:
        chat["parentUnreadCount"] = int(chat.get("parentUnreadCount") or 0) + 1
        recipient_id = str(chat.get("parentUserId") or "")
        recipient_roles = ["parent"]

    if recipient_id:
        sender_name = str(sender_user.get("name") or "Студия").strip() or "Студия"
        _append_notification(
            store,
            user_id=recipient_id,
            type_value="message",
            priority="medium",
            title=f"Новое сообщение от {sender_name}",
            message=text.strip()[:200],
            metadata={"chatId": str(chat.get("id")), "messageId": message["id"]},
            dedup_key=None,
            for_roles=recipient_roles,
        )
    return message


def _send_otp_external(phone: str, code: str) -> None:
    provider_url = os.getenv("OTP_PROVIDER_URL", "").strip()
    if not provider_url:
        return

    token = os.getenv("OTP_PROVIDER_TOKEN", "").strip()
    payload = json.dumps({"phone": phone, "code": code}, ensure_ascii=False).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(provider_url, data=payload, headers=headers, method="POST")
    try:
        with urlopen(request, timeout=8) as response:
            if response.status >= 400:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="OTP provider rejected request",
                )
    except (HTTPError, URLError):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OTP provider is unavailable",
        )


def _require_auth(request: FastAPIRequest) -> dict[str, Any]:
    token = _extract_auth_token(request)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    token_hash = _hash_auth_token(token)
    store = _read_store()
    token_data = store.get("activeTokens", {}).get(token_hash)
    if token_data is None and token_hash in ACTIVE_TOKENS:
        token_data = ACTIVE_TOKENS.get(token_hash)
    if _is_token_expired(token_data):
        store.get("activeTokens", {}).pop(token_hash, None)
        ACTIVE_TOKENS.pop(token_hash, None)
        _write_store(store)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    phone = _resolve_token_phone(token_data)
    if not phone:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = _find_user_by_phone(store, phone)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def _require_admin_or_owner(current_user: dict[str, Any] = Depends(_require_auth)) -> dict[str, Any]:
    if current_user.get("role") not in {"admin", "owner"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return current_user


def _require_parent(current_user: dict[str, Any] = Depends(_require_auth)) -> dict[str, Any]:
    if current_user.get("role") != "parent":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Parent access only")
    return current_user


def _entity_list(entity_name: Literal["tasks", "news", "documents"]) -> list[dict[str, Any]]:
    store = _read_store()
    return list(store.get(entity_name, []))


def _filter_news_for_user(store: dict[str, Any], current_user: dict[str, Any]) -> list[dict[str, Any]]:
    role = str(current_user.get("role") or "")
    news = list(store.get("news", []))
    if role in {"owner", "admin"}:
        return news
    if role == "parent":
        return [item for item in news if bool(item.get("published"))]
    return []


def _filter_documents_for_user(store: dict[str, Any], current_user: dict[str, Any]) -> list[dict[str, Any]]:
    role = str(current_user.get("role") or "")
    documents = list(store.get("documents", []))
    if role in {"owner", "admin"}:
        return documents

    user_id = str(current_user.get("id") or "")
    if role == "parent":
        visible: list[dict[str, Any]] = []
        for item in documents:
            access_type = str(item.get("accessType") or "all")
            assigned_parents = item.get("assignedParents") or []
            if access_type in {"all", "parents"}:
                visible.append(item)
            elif access_type == "specific" and user_id in [str(parent_id) for parent_id in assigned_parents]:
                visible.append(item)
        return visible

    if role == "teacher":
        visible = []
        for item in documents:
            access_type = str(item.get("accessType") or "all")
            assigned_employees = item.get("assignedEmployees") or []
            if access_type in {"all", "employees"}:
                visible.append(item)
            elif access_type == "specific" and user_id in [str(employee_id) for employee_id in assigned_employees]:
                visible.append(item)
        return visible

    return []


def _create_entity(entity_name: Literal["tasks", "news", "documents"], payload: dict[str, Any]) -> dict[str, Any]:
    store = _read_store()
    entities = store[entity_name]
    item = dict(payload)

    if not item.get("id"):
        item["id"] = _new_id(entity_name[:-1])

    now = _utc_now_iso()
    if entity_name == "tasks":
        item.setdefault("createdAt", now)
    if entity_name == "news":
        item.setdefault("date", now)
    if entity_name == "documents":
        item.setdefault("createdAt", now)
        item.setdefault("updatedAt", now)

    entities.insert(0, item)
    _write_store(store)
    return item


def _update_entity(entity_name: Literal["tasks", "news", "documents"], item_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    store = _read_store()
    entities = store[entity_name]

    for idx, item in enumerate(entities):
        if str(item.get("id")) != item_id:
            continue

        updated = {**item, **patch}
        if entity_name == "documents":
            updated["updatedAt"] = _utc_now_iso()
        entities[idx] = updated
        _write_store(store)
        return updated

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{entity_name[:-1].capitalize()} not found")


def _delete_entity(entity_name: Literal["tasks", "news", "documents"], item_id: str) -> None:
    store = _read_store()
    entities = store[entity_name]
    next_entities = [item for item in entities if str(item.get("id")) != item_id]
    if len(next_entities) == len(entities):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{entity_name[:-1].capitalize()} not found")
    store[entity_name] = next_entities
    _write_store(store)


def _promote_parent_full_access(
    store: dict[str, Any],
    *,
    parent_user_id: str,
    client_id: str | None = None,
) -> dict[str, Any] | None:
    parent_user = _find_user_by_id(store, parent_user_id)
    if parent_user and parent_user.get("role") == "parent":
        parent_user["access_level"] = "full"
        parent_user["account_status"] = "active"
        parent_user["updated_at"] = _utc_now_iso()

    if client_id:
        client = _find_client_by_id(store, client_id)
        if client:
            client["paymentStatus"] = "paid"
            client["accessLevel"] = "full"
            client["accountStatus"] = "active"
            client["updatedAt"] = _utc_now_iso()

    return parent_user


def _sync_client_status_by_payment(store: dict[str, Any], payment: dict[str, Any]) -> None:
    client = _find_client_by_id(store, str(payment.get("clientId") or ""))
    if not client:
        return
    payment_status = str(payment.get("status") or "pending")
    client["paymentStatus"] = payment_status
    if payment_status == "paid":
        client["accessLevel"] = "full"
        client["accountStatus"] = "active"
    else:
        client["accessLevel"] = "payment_only"
        client["accountStatus"] = "payment_pending"
    client["updatedAt"] = _utc_now_iso()


def _recalculate_parent_access_from_clients(store: dict[str, Any], parent_user_id: str) -> dict[str, Any] | None:
    parent_user = _find_user_by_id(store, parent_user_id)
    if parent_user is None:
        return None
    if str(parent_user.get("role")) != "parent":
        return parent_user

    # An already-paying client must not be locked out of the portal just because
    # the next invoice was billed ahead of time (a new "pending" invoice used to
    # overwrite client.paymentStatus and re-lock access immediately — see the
    # incident where issuing a renewal invoice for an active client dropped them
    # back to payment_only even though their current period was still valid).
    # A currently-active, unexpired subscription is the real signal for "this
    # family should have full access right now"; client.paymentStatus only ever
    # reflects the *latest* invoice and is kept as a fallback for payments that
    # didn't provision a subscription (e.g. a custom plan not in the catalog).
    now_dt = datetime.now(timezone.utc)
    has_active_subscription = any(
        str(item.get("parent_id")) == parent_user_id
        and str(item.get("status")) == "active"
        and (_parse_datetime_safe(item.get("expires_at")) or now_dt) > now_dt
        for item in store.get("subscriptions", [])
    )

    parent_clients = [item for item in store.get("clients", []) if str(item.get("parentUserId")) == parent_user_id]
    has_paid_client = any(str(item.get("paymentStatus")) == "paid" for item in parent_clients)

    if has_active_subscription or has_paid_client:
        parent_user["access_level"] = "full"
        parent_user["account_status"] = "active"
    else:
        parent_user["access_level"] = "payment_only"
        parent_user["account_status"] = "payment_pending"
    parent_user["updated_at"] = _utc_now_iso()
    return parent_user


def _serialize_admin_client(store: dict[str, Any], client: dict[str, Any]) -> dict[str, Any]:
    parent = _find_user_by_id(store, str(client.get("parentUserId")))
    child = next((item for item in store["children"] if str(item.get("id")) == str(client.get("childId"))), None)
    group = _find_group_by_id(store, str((child or {}).get("groupId") or ""))
    payment = _find_latest_payment_for_client(store, str(client.get("id")))
    pin_auth = _find_pin_auth_by_parent_id(store, str(client.get("parentUserId") or ""))

    return {
        **client,
        "parentName": parent.get("name") if parent else None,
        "parentPhone": parent.get("phone") if parent else client.get("parentPhone"),
        "portalStatus": (parent or {}).get("portal_status") or client.get("portalStatus") or "not_created",
        "portalActivatedAt": (parent or {}).get("portal_activated_at") or client.get("portalActivatedAt"),
        "portalBlockedAt": (parent or {}).get("portal_blocked_at") or client.get("portalBlockedAt"),
        "parentLastLoginAt": (parent or {}).get("last_login_at"),
        "pinStatus": (
            "not_set"
            if pin_auth is None or not pin_auth.get("pinHash")
            else "disabled"
            if bool(pin_auth.get("isDisabled"))
            else "locked"
            if (_parse_datetime_safe(pin_auth.get("lockedUntil")) or datetime.fromtimestamp(0, tz=timezone.utc)) > datetime.now(timezone.utc)
            else "set"
        ),
        "childFullName": child.get("fullName") if child else None,
        "childBirthDate": child.get("birthDate") if child else None,
        "childGroupId": (child or {}).get("groupId"),
        "childGroupName": (group or {}).get("name"),
        "groupId": (child or {}).get("groupId"),
        "groupName": (group or {}).get("name"),
        "childAge": _calculate_age_from_birth_date((child or {}).get("birthDate")),
        "payment": payment,
    }


def _serialize_admin_child_row(store: dict[str, Any], child: dict[str, Any]) -> dict[str, Any]:
    client = next((item for item in store.get("clients", []) if str(item.get("childId")) == str(child.get("id"))), None)
    parent = _find_user_by_id(store, str(child.get("parentUserId") or ""))
    group = _find_group_by_id(store, str(child.get("groupId") or ""))
    payment = _find_latest_payment_for_client(store, str((client or {}).get("id") or ""))
    parent_id = str(child.get("parentUserId") or "")
    child_id = str(child.get("id") or "")

    active_subscription = next(
        (
            item
            for item in store.get("subscriptions", [])
            if str(item.get("parent_id")) == parent_id
            and str(item.get("child_id") or "") == child_id
            and str(item.get("status")) == "active"
        ),
        None,
    )

    lessons_tracked = True
    total_classes = 0
    attended_classes = 0
    remaining_classes = 0

    if active_subscription is not None:
        total_lessons = active_subscription.get("total_lessons")
        used_lessons = int(active_subscription.get("used_lessons", 0) or 0)
        if isinstance(total_lessons, int):
            total_classes = max(total_lessons, 0)
            attended_classes = max(used_lessons, 0)
            remaining_classes = max(total_classes - attended_classes, 0)
        else:
            lessons_tracked = False

    if client is not None:
        plan = _find_owner_pricing_plan(store, str(client.get("subscriptionName") or ""))
        if plan is not None and bool(plan.get("classesTracked")) is False:
            lessons_tracked = False
            total_classes = 0
            attended_classes = 0
            remaining_classes = 0
        elif total_classes <= 0:
            classes_count = plan.get("classesCount") if plan else None
            if isinstance(classes_count, int) and classes_count > 0:
                total_classes = max(classes_count, 0)
                attended_classes = max(min(attended_classes, total_classes), 0)
                remaining_classes = max(total_classes - attended_classes, 0)
            else:
                subscription_name = str(client.get("subscriptionName") or "")
                match = re.search(r"(\d{1,3})\s*занят", subscription_name.lower())
                if match:
                    total_classes = max(int(match.group(1)), 0)
                    attended_classes = max(min(attended_classes, total_classes), 0)
                    remaining_classes = max(total_classes - attended_classes, 0)
        if total_classes > 0 and remaining_classes <= 0 and str(client.get("paymentStatus")) == "paid":
            remaining_classes = total_classes

    progress_percent = 0
    if lessons_tracked and total_classes > 0:
        progress_percent = max(0, min(100, round((attended_classes / total_classes) * 100)))

    profile_raw = (client or {}).get("profile") if isinstance((client or {}).get("profile"), dict) else {}
    landing_lead = _find_latest_landing_lead_by_phone(store, str((parent or {}).get("phone") or (client or {}).get("parentPhone") or ""))
    profile = {
        "internalComment": str(profile_raw.get("internalComment") or ""),
        "healthNotes": str(profile_raw.get("healthNotes") or ""),
        "behavioralNotes": str(profile_raw.get("behavioralNotes") or ""),
        "goals": str(profile_raw.get("goals") or ""),
        "strengths": str(profile_raw.get("strengths") or ""),
        "parentExpectations": str(profile_raw.get("parentExpectations") or ""),
        "emergencyContactName": str(profile_raw.get("emergencyContactName") or ""),
        "emergencyContactPhone": str(profile_raw.get("emergencyContactPhone") or ""),
        "communicationPreferences": str(profile_raw.get("communicationPreferences") or ""),
        "sourceChannel": str(profile_raw.get("sourceChannel") or ""),
        "priorExperience": str(profile_raw.get("priorExperience") or ""),
        "tags": [str(item).strip() for item in (profile_raw.get("tags") or []) if str(item).strip()],
        "updatedAt": profile_raw.get("updatedAt"),
    }

    return {
        "id": str(child.get("id") or ""),
        "fullName": str(child.get("fullName") or "Ученик"),
        "birthDate": child.get("birthDate"),
        "age": _calculate_age_from_birth_date(child.get("birthDate")),
        "groupId": str((group or {}).get("id") or "") or None,
        "groupName": (group or {}).get("name"),
        "parentUserId": str((parent or {}).get("id") or child.get("parentUserId") or ""),
        "parentName": (parent or {}).get("name"),
        "parentPhone": (parent or {}).get("phone"),
        "parentAccessLevel": (parent or {}).get("access_level"),
        "parentAccountStatus": (parent or {}).get("account_status"),
        "parentPortalStatus": (parent or {}).get("portal_status"),
        "parentPortalActivatedAt": (parent or {}).get("portal_activated_at"),
        "parentPortalBlockedAt": (parent or {}).get("portal_blocked_at"),
        "parentLastLoginAt": (parent or {}).get("last_login_at"),
        "clientId": (client or {}).get("id"),
        "subscriptionName": (client or {}).get("subscriptionName"),
        "subscriptionCode": (client or {}).get("subscriptionCode"),
        "subscriptionAmount": (client or {}).get("subscriptionAmount"),
        "paymentMethod": (client or {}).get("paymentMethod"),
        "paymentStatus": (client or {}).get("paymentStatus"),
        "createdAt": child.get("createdAt"),
        "updatedAt": child.get("updatedAt"),
        "notes": (client or {}).get("notes"),
        "latestPayment": payment,
        "lessonsTracked": lessons_tracked,
        "totalClasses": total_classes,
        "attendedClasses": attended_classes,
        "remainingClasses": remaining_classes,
        "progressPercent": progress_percent,
        "profile": profile,
        "landingLead": {
            "id": landing_lead.get("id"),
            "parentFullName": landing_lead.get("parentFullName"),
            "phone": landing_lead.get("phone"),
            "childFullName": landing_lead.get("childFullName"),
            "childBirthDate": landing_lead.get("childBirthDate"),
            "medicalRestrictions": landing_lead.get("medicalRestrictions"),
            "previousActivities": landing_lead.get("previousActivities"),
            "discoverySource": landing_lead.get("discoverySource"),
            "preferredSchedule": landing_lead.get("preferredSchedule"),
            "comment": landing_lead.get("comment"),
            "consent": bool(landing_lead.get("consent", True)),
            "createdAt": landing_lead.get("createdAt"),
        } if landing_lead else None,
    }


def _serialize_admin_landing_lead_row(store: dict[str, Any], lead: dict[str, Any]) -> dict[str, Any]:
    parent_phone = _normalize_phone(str(lead.get("phone") or ""))
    parent = _find_user_by_phone(store, parent_phone) if parent_phone else None
    return {
        "id": str(lead.get("id") or ""),
        "parentFullName": str((parent or {}).get("name") or lead.get("parentFullName") or "").strip() or None,
        "phone": parent_phone or None,
        "childFullName": str(lead.get("childFullName") or "").strip() or None,
        "childBirthDate": lead.get("childBirthDate"),
        "medicalRestrictions": lead.get("medicalRestrictions"),
        "previousActivities": lead.get("previousActivities"),
        "discoverySource": lead.get("discoverySource"),
        "preferredSchedule": lead.get("preferredSchedule"),
        "comment": lead.get("comment"),
        "consent": bool(lead.get("consent", True)),
        "status": str(lead.get("status") or "new"),
        "createdAt": lead.get("createdAt"),
        "updatedAt": lead.get("updatedAt"),
        "parentUserId": str((parent or {}).get("id") or "") or None,
        "parentName": (parent or {}).get("name"),
        "parentAccessLevel": (parent or {}).get("access_level"),
        "parentAccountStatus": (parent or {}).get("account_status"),
    }


def _refresh_payment_overdue_status(payment: dict[str, Any]) -> bool:
    status_value = str(payment.get("status") or "pending")
    if status_value not in {"unpaid", "pending"}:
        return False
    due_dt = _parse_datetime_safe(payment.get("dueDate"))
    if due_dt is None:
        return False
    now_dt = datetime.now(timezone.utc)
    if due_dt.date() >= now_dt.date():
        return False
    payment["status"] = "overdue"
    payment["statusUpdatedAt"] = _utc_now_iso()
    payment["updatedAt"] = payment["statusUpdatedAt"]
    return True


def _serialize_admin_payment(store: dict[str, Any], payment: dict[str, Any]) -> dict[str, Any]:
    client = _find_client_by_id(store, str(payment.get("clientId") or ""))
    child = None
    if client is not None:
        child = next(
            (item for item in store.get("children", []) if str(item.get("id")) == str(client.get("childId"))),
            None,
        )
    parent = _find_user_by_id(store, str(payment.get("parentUserId") or ""))
    return {
        **payment,
        "parentName": parent.get("name") if parent else None,
        "parentPhone": parent.get("phone") if parent else payment.get("parentPhone"),
        "childName": (child.get("fullName") if child else None),
        "clientPaymentStatus": client.get("paymentStatus") if client else None,
        "clientAccountStatus": client.get("accountStatus") if client else None,
    }


def _normalize_parent_payment_status_for_admin(status_value: str) -> PaymentStatus:
    normalized = str(status_value or "").strip().lower()
    if normalized == "paid":
        return "paid"
    if normalized in {"pending", "waiting_confirmation"}:
        return "pending"
    if normalized == "cancelled":
        return "cancelled"
    if normalized == "refunded":
        return "refunded"
    if normalized == "overdue":
        return "overdue"
    if normalized in {"failed", "expired"}:
        return "failed"
    return "pending"


def _serialize_admin_payment_from_parent_payment(store: dict[str, Any], payment: dict[str, Any]) -> dict[str, Any]:
    parent_user_id = str(payment.get("parent_id") or "")
    child_id = str(payment.get("child_id") or "")
    parent = _find_user_by_id(store, parent_user_id)
    child = next((item for item in store.get("children", []) if str(item.get("id") or "") == child_id), None) if child_id else None
    client = next(
        (
            item
            for item in store.get("clients", [])
            if str(item.get("parentUserId") or "") == parent_user_id
            and (not child_id or str(item.get("childId") or "") == child_id)
        ),
        None,
    )
    plan = next(
        (
            item
            for item in store.get("subscriptionPlans", [])
            if str(item.get("id") or "") == str(payment.get("subscription_plan_id") or "")
        ),
        None,
    )

    method = "online" if str(payment.get("method") or "").strip().lower() == "online" else "cash"
    status_value = _normalize_parent_payment_status_for_admin(str(payment.get("status") or "pending"))
    created_at = payment.get("created_at") or _utc_now_iso()
    updated_at = payment.get("updated_at") or created_at
    paid_at = payment.get("paid_at")

    return {
        "id": str(payment.get("id") or ""),
        "clientId": str((client or {}).get("id") or ""),
        "parentUserId": parent_user_id,
        "parentPhone": str((parent or {}).get("phone") or ""),
        "parentName": (parent or {}).get("name"),
        "childName": (child or {}).get("fullName"),
        "subscriptionName": str((plan or {}).get("title") or "Абонемент"),
        "amount": float(payment.get("amount") or 0),
        "currency": "RUB",
        "paymentMethod": method,
        "status": status_value,
        "providerPaymentId": payment.get("provider_payment_id"),
        "paidAt": paid_at,
        "invoiceNumber": payment.get("invoice_number") or payment.get("payment_reference"),
        "dueDate": payment.get("due_date"),
        "serviceStartDate": None,
        "reminderCount": 0,
        "lastReminderAt": None,
        "nextReminderAt": None,
        "reminderComment": None,
        "invoiceComment": payment.get("payment_comment"),
        "createdAt": created_at,
        "updatedAt": updated_at,
        "statusUpdatedAt": paid_at if status_value == "paid" else updated_at,
        "clientPaymentStatus": (client or {}).get("paymentStatus"),
        "clientAccountStatus": (client or {}).get("accountStatus"),
    }


def _sync_parent_payment_status_from_admin_record(
    store: dict[str, Any],
    admin_payment: dict[str, Any],
    *,
    status_value: str,
    updated_at: str,
) -> None:
    target_id = str(admin_payment.get("id") or "")
    if not target_id:
        return
    parent_payment = next((item for item in store.get("payments", []) if str(item.get("id") or "") == target_id), None)
    if parent_payment is None:
        return

    normalized = str(status_value or "").strip().lower()
    if normalized == "unpaid":
        normalized = "pending"
    elif normalized == "overdue":
        normalized = "failed"
    elif normalized == "refunded":
        normalized = "cancelled"
    elif normalized not in {"pending", "waiting_confirmation", "paid", "failed", "cancelled", "expired"}:
        normalized = "pending"

    parent_payment["status"] = normalized
    parent_payment["updated_at"] = updated_at
    if normalized == "paid":
        parent_payment["paid_at"] = updated_at
    elif normalized in {"cancelled", "failed", "expired"}:
        parent_payment["paid_at"] = None


def _default_payment_reminder_message(payment: dict[str, Any]) -> str:
    subscription_name = str(payment.get("subscriptionName") or "Абонемент")
    amount = float(payment.get("amount") or 0)
    due_date = str(payment.get("dueDate") or "")
    amount_text = f"{int(amount) if amount.is_integer() else amount} ₽"
    due_text = f" до {due_date}" if due_date else ""
    return f"Напоминание: оплатите счет {subscription_name} на сумму {amount_text}{due_text}."


def _send_payment_reminder(
    store: dict[str, Any],
    *,
    payment: dict[str, Any],
    actor_user_id: str | None,
    actor_role: UserRole | None,
    source: str,
    custom_message: str | None = None,
) -> dict[str, Any]:
    now_iso = _utc_now_iso()
    reminder_count = int(payment.get("reminderCount") or 0) + 1
    reminder_text = custom_message.strip() if custom_message and custom_message.strip() else _default_payment_reminder_message(payment)

    payment["reminderCount"] = reminder_count
    payment["lastReminderAt"] = now_iso
    payment["nextReminderAt"] = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    payment["reminderComment"] = reminder_text
    payment["updatedAt"] = now_iso

    parent_user_id = str(payment.get("parentUserId") or "")
    notification = None
    if parent_user_id:
        notification = _append_notification(
            store,
            user_id=parent_user_id,
            type_value="payment",
            priority="high",
            title="Напоминание об оплате",
            message=str(payment.get("subscriptionName") or "Счет к оплате"),
            additional_info=reminder_text,
            metadata={
                "paymentId": payment.get("id"),
                "status": payment.get("status"),
                "invoiceNumber": payment.get("invoiceNumber"),
                "reminderCount": reminder_count,
            },
            dedup_key=f"payment:{payment.get('id')}:reminder:{reminder_count}",
        )

    _append_payment_journal(
        store,
        payment=payment,
        event_type="payment.reminder_sent",
        source=source,
        previous_status=str(payment.get("status") or "pending"),
        new_status=str(payment.get("status") or "pending"),
        actor_user_id=actor_user_id,
        actor_role=actor_role,
        metadata={"message": reminder_text, "reminderCount": reminder_count},
    )
    return {"notification": notification, "reminderText": reminder_text}


def _serialize_parent_child(store: dict[str, Any], child: dict[str, Any]) -> dict[str, Any]:
    client = next((item for item in store["clients"] if str(item.get("childId")) == str(child.get("id"))), None)
    payment = _find_latest_payment_for_client(store, str(client.get("id"))) if client else None
    group = _find_group_by_id(store, str(child.get("groupId") or ""))
    parent_id = str(child.get("parentUserId") or "")
    child_id = str(child.get("id") or "")

    active_subscription = next(
        (
            item
            for item in store.get("subscriptions", [])
            if str(item.get("parent_id")) == parent_id
            and str(item.get("child_id") or "") == child_id
            and str(item.get("status")) == "active"
        ),
        None,
    )

    lessons_tracked = True
    total_classes = 0
    attended_classes = 0
    remaining_classes = 0

    if active_subscription is not None:
        total_lessons = active_subscription.get("total_lessons")
        used_lessons = int(active_subscription.get("used_lessons", 0) or 0)
        if isinstance(total_lessons, int):
            total_classes = max(total_lessons, 0)
            attended_classes = max(used_lessons, 0)
            remaining_classes = max(total_classes - attended_classes, 0)
        else:
            lessons_tracked = False

    if total_classes <= 0 and client:
        subscription_name = str(client.get("subscriptionName") or "")
        match = re.search(r"(\d{1,3})\s*занят", subscription_name.lower())
        if match:
            total_classes = max(int(match.group(1)), 0)
            attended_classes = max(min(attended_classes, total_classes), 0)
            remaining_classes = max(total_classes - attended_classes, 0)

        if total_classes > 0 and remaining_classes <= 0 and str(client.get("paymentStatus")) == "paid":
            remaining_classes = total_classes

    return {
        **child,
        "groupName": (group or {}).get("name"),
        "groupSchedule": (group or {}).get("schedule"),
        "groupTime": (group or {}).get("time"),
        "client": client,
        "payment": payment,
        "lessonsTracked": lessons_tracked,
        "totalClasses": total_classes,
        "attendedClasses": attended_classes,
        "remainingClasses": remaining_classes,
    }


def _parse_schedule_weekdays(schedule_text: str) -> list[int]:
    aliases: dict[int, tuple[str, ...]] = {
        0: ("пн", "пон", "понедельник", "mon", "monday"),
        1: ("вт", "вто", "вторник", "tue", "tuesday"),
        2: ("ср", "сре", "среда", "wed", "wednesday"),
        3: ("чт", "чет", "четверг", "thu", "thursday"),
        4: ("пт", "пят", "пятница", "fri", "friday"),
        5: ("сб", "суб", "суббота", "sat", "saturday"),
        6: ("вс", "воск", "воскресенье", "sun", "sunday"),
    }
    tokens = [token for token in re.split(r"[^a-zA-Zа-яА-Я0-9]+", schedule_text.lower()) if token]
    weekdays: set[int] = set()
    for token in tokens:
        for weekday_index, values in aliases.items():
            if any(token == alias or token.startswith(alias) for alias in values):
                weekdays.add(weekday_index)
                break
    return sorted(weekdays)


def _parse_schedule_time_range(*values: Any) -> tuple[str, str] | None:
    for value in values:
        text = str(value or "").strip()
        if not text:
            continue
        match = re.search(r"(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})", text)
        if not match:
            continue
        start_hour = int(match.group(1))
        start_min = int(match.group(2))
        end_hour = int(match.group(3))
        end_min = int(match.group(4))
        if start_hour > 23 or end_hour > 23 or start_min > 59 or end_min > 59:
            continue
        return (f"{start_hour:02d}:{start_min:02d}", f"{end_hour:02d}:{end_min:02d}")
    return None


def _build_parent_group_schedule_events(store: dict[str, Any], parent_id: str) -> list[dict[str, Any]]:
    children = [item for item in store.get("children", []) if str(item.get("parentUserId")) == parent_id]
    groups_by_id = {str(item.get("id")): item for item in store.get("ownerGroups", [])}
    now = datetime.now(timezone.utc)
    events: list[dict[str, Any]] = []
    seen_keys: set[str] = set()

    for child in children:
        group = None
        group_id = str(child.get("groupId") or "").strip()
        if group_id:
            group = groups_by_id.get(group_id)

        if group is None:
            group_name = str(child.get("groupName") or "").strip().lower()
            if group_name:
                group = next(
                    (item for item in store.get("ownerGroups", []) if str(item.get("name", "")).strip().lower() == group_name),
                    None,
                )
                if group is not None:
                    group_id = str(group.get("id") or "").strip()

        if group is None:
            continue

        schedule_text = " ".join([str(group.get("schedule") or ""), str(group.get("time") or "")]).strip()
        weekdays = _parse_schedule_weekdays(schedule_text)
        time_range = _parse_schedule_time_range(group.get("time"), schedule_text)
        if not weekdays or time_range is None:
            continue

        start_time, end_time = time_range
        teacher_id = str(group.get("teacherId") or "").strip()
        teacher_name = str(group.get("teacherName") or "").strip()
        if teacher_id and not teacher_name:
            teacher = _find_user_by_id(store, teacher_id)
            if teacher:
                teacher_name = str(teacher.get("name") or "").strip()

        for day_offset in range(0, 30):
            event_date = (now + timedelta(days=day_offset)).date()
            if event_date.weekday() not in weekdays:
                continue
            hour, minute = [int(part) for part in start_time.split(":")]
            event_dt = datetime(
                year=event_date.year,
                month=event_date.month,
                day=event_date.day,
                hour=hour,
                minute=minute,
                tzinfo=timezone.utc,
            )
            uniq_key = f"{group_id}|{event_dt.date().isoformat()}|{start_time}"
            if uniq_key in seen_keys:
                continue
            seen_keys.add(uniq_key)
            events.append(
                {
                    "id": f"event-{group_id or 'group'}-{event_dt.strftime('%Y%m%d')}-{start_time.replace(':', '')}",
                    "title": "Занятие",
                    "groupId": group_id,
                    "groupName": str(group.get("name") or "Группа"),
                    "date": event_dt.isoformat(),
                    "startTime": start_time,
                    "endTime": end_time,
                    "teacherId": teacher_id,
                    "teacherName": teacher_name or "Преподаватель",
                }
            )

    events.sort(key=lambda item: _parse_datetime_safe(item.get("date")) or datetime.fromtimestamp(0, tz=timezone.utc))
    return events


def _serialize_parent_event(store: dict[str, Any], event: dict[str, Any]) -> dict[str, Any] | None:
    event_date = _parse_datetime_safe(event.get("date") or event.get("startAt") or event.get("startsAt"))
    if event_date is None:
        return None
    group_id = str(event.get("groupId") or event.get("group_id") or "")
    group = next((item for item in store.get("ownerGroups", []) if str(item.get("id")) == group_id), None)
    return {
        "id": str(event.get("id") or _new_id("event")),
        "title": str(event.get("title") or "Занятие"),
        "groupId": group_id,
        "groupName": str(event.get("groupName") or event.get("group_name") or (group.get("name") if group else "Группа")),
        "date": event_date.isoformat(),
        "startTime": str(event.get("startTime") or event.get("start_time") or ""),
        "endTime": str(event.get("endTime") or event.get("end_time") or ""),
        "teacherId": str(event.get("teacherId") or event.get("teacher_id") or (group.get("teacherId") if group else "")),
        "teacherName": str(
            event.get("teacherName")
            or event.get("teacher_name")
            or (group.get("teacherName") if group else "")
            or "Преподаватель"
        ),
    }


def _normalize_iso_date(value: str) -> str:
    text = value.strip()
    if len(text) == 10 and text[4] == "-" and text[7] == "-":
        datetime.strptime(text, "%Y-%m-%d")
        return text
    if len(text) == 10 and text[2] == "." and text[5] == ".":
        parsed = datetime.strptime(text, "%d.%m.%Y")
        return parsed.strftime("%Y-%m-%d")
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Дата должна быть в формате YYYY-MM-DD или DD.MM.YYYY",
    )


def _serialize_owner_employee(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(user.get("id")),
        "name": str(user.get("name", "")),
        "role": str(user.get("role", "teacher")),
        "email": str(user.get("email", "")),
        "phone": str(user.get("phone", "")),
        "status": str(user.get("status", "active")),
        "birthDate": user.get("birth_date"),
        "experience": user.get("experience"),
        "location": user.get("location"),
        "permissions": user.get("permissions", []),
        "lastLogin": user.get("updated_at"),
        "groupsAssigned": int(user.get("groups_assigned", 0)),
    }


def _serialize_communication_employee(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(user.get("id", "")),
        "name": str(user.get("name", "")),
        "role": str(user.get("role", "teacher")),
        "phone": str(user.get("phone", "")),
        "status": str(user.get("status", "active")),
    }


def _list_communication_employees(store: dict[str, Any]) -> list[dict[str, Any]]:
    employees = [
        user
        for user in store.get("users", [])
        if str(user.get("role")) in {"teacher", "admin", "owner"}
    ]
    employees = [item for item in employees if str(item.get("status", "active")) != "inactive"]
    employees.sort(key=lambda item: str(item.get("name", "")).strip().lower())
    return employees


app = FastAPI(title="Manera CRM MVP Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_allowed_origins(),
    allow_origin_regex=_cors_allow_origin_regex(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def apply_security_headers(request: FastAPIRequest, call_next):
    if _should_enforce_session_csrf(request) and not _csrf_tokens_match(request):
        return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"detail": "CSRF validation failed"})
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if _frontend_base_url().startswith("https://"):
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    if _is_sensitive_no_store_path(request.url.path):
        response.headers["Cache-Control"] = "no-store, max-age=0"
        response.headers["Pragma"] = "no-cache"
    return response


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "manera-crm-mvp-backend"}


@app.get("/api/contact/call", response_class=HTMLResponse)
def contact_call(phone: str) -> HTMLResponse:
    normalized_phone = _normalize_phone(phone)
    if not normalized_phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="phone is invalid")
    safe_phone = html.escape(normalized_phone, quote=True)
    return HTMLResponse(
        f"""<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="0; url=tel:{safe_phone}" />
    <title>Позвонить</title>
    <style>
      body {{ margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: sans-serif; background: #FCFAF0; color: #133C2A; }}
      a {{ display: inline-flex; margin-top: 16px; padding: 12px 18px; border-radius: 16px; background: #133C2A; color: white; text-decoration: none; }}
    </style>
  </head>
  <body>
    <main>
      <p>Открываем звонок на номер {safe_phone}</p>
      <a href="tel:{safe_phone}">Позвонить</a>
    </main>
    <script>window.location.href = "tel:{safe_phone}";</script>
  </body>
</html>"""
    )


@app.post("/api/analytics")
def analytics_create_event(payload: AnalyticsEventPayload, request: FastAPIRequest) -> dict[str, Any]:
    _enforce_rate_limit(
        f"analytics:{_request_client_ip(request)}",
        limit=_analytics_rate_limit_max_requests(),
        window_ms=_rate_limit_window_ms(),
        detail="Слишком много событий аналитики. Повторите позже.",
    )
    store = _read_store()
    source = _normalize_tracking_source(payload.payload)
    user_agent = request.headers.get("user-agent", "")
    landing_path = _clean_tracking_value(payload.payload.get("path") if isinstance(payload.payload, dict) else "/", 240) or "/"
    _upsert_landing_session(
        store,
        payload.session_id,
        source,
        user_agent=user_agent,
        landing_path=landing_path,
    )
    _append_analytics_event(store, payload.session_id, payload.event_name, payload.payload)
    _write_store(store)
    return {"ok": True}


@app.post("/api/telegram/webhook")
async def telegram_webhook(request: FastAPIRequest) -> dict[str, Any]:
    expected_secret = str(os.getenv("TELEGRAM_WEBHOOK_SECRET", "")).strip()
    if expected_secret:
        provided_secret = str(request.headers.get("x-telegram-bot-api-secret-token") or "").strip()
        if provided_secret != expected_secret:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook secret")

    store = _read_store()
    try:
        body = await request.json()
    except Exception:
        body = None

    if not isinstance(body, dict):
        return {"ok": True, "message": "No update body"}

    callback = body.get("callback_query")
    if isinstance(callback, dict):
        callback_id = str(callback.get("id") or "").strip()
        data = str(callback.get("data") or "").strip()
        message = callback.get("message") if isinstance(callback.get("message"), dict) else {}
        chat = message.get("chat") if isinstance(message.get("chat"), dict) else {}
        message_id = message.get("message_id")
        chat_id = str(chat.get("id") or "").strip()
        if data and chat_id and message_id:
            if not _is_telegram_chat_allowed(chat_id, store):
                if callback_id:
                    try:
                        _answer_telegram_callback(callback_id, "Этот чат не подключён к админке.")
                    except Exception:
                        pass
                return {"ok": True, "message": "Chat is not allowed"}
            response_data = _handle_telegram_callback(store, data, chat)
            _write_store(store)
            _edit_telegram_message(
                chat_id=chat_id,
                message_id=int(message_id),
                text=response_data["text"],
                reply_markup=response_data.get("reply_markup"),
            )
            if callback_id:
                _answer_telegram_callback(callback_id)
            return {"ok": True, "message": "Callback handled"}
        return {"ok": True, "message": "No callback data"}

    message = body.get("message") if isinstance(body.get("message"), dict) else {}
    text = str(message.get("text") or "").strip()
    chat = message.get("chat") if isinstance(message.get("chat"), dict) else {}
    chat_id = str(chat.get("id") or "").strip()
    if not text or not chat_id:
        return {"ok": True, "message": "No command provided"}

    if not _is_telegram_chat_allowed(chat_id, store):
        return {"ok": True, "message": "Chat is not allowed"}

    response_data = _handle_telegram_text(store, text, chat)
    _write_store(store)
    _send_telegram_message(response_data["text"], chat_id, response_data.get("reply_markup"))
    return {"ok": True, "message": "Reply sent"}


@app.post("/api/landing/leads")
def landing_create_lead(payload: LandingLeadPayload, request: FastAPIRequest) -> dict[str, Any]:
    _enforce_rate_limit(
        f"landing-lead:{_request_client_ip(request)}",
        limit=_form_rate_limit_max_requests(),
        window_ms=_rate_limit_window_ms(),
        detail="Слишком много заявок. Попробуйте позже.",
    )
    store = _read_store()
    created_at = _utc_now_iso()
    if (payload.website or "").strip():
        return {"ok": True, "lead": {"honeypot": True}}

    phone = _normalize_phone(payload.phone)
    source = _normalize_tracking_source(payload.source)
    session_id = _clean_tracking_value(payload.session_id, 120)
    user_agent = request.headers.get("user-agent", "")
    lead = {
        "id": _new_id("lead"),
        "parentFullName": payload.parent_full_name.strip(),
        "phone": phone,
        "childFullName": payload.child_full_name.strip(),
        "childBirthDate": payload.child_birth_date.strip() if payload.child_birth_date else None,
        "medicalRestrictions": (payload.medical_restrictions or "").strip(),
        "previousActivities": (payload.previous_activities or "").strip(),
        "discoverySource": (payload.discovery_source or "").strip(),
        "preferredSchedule": (payload.preferred_schedule or "").strip(),
        "comment": (payload.comment or "").strip(),
        "consent": bool(payload.consent),
        "sessionId": session_id,
        "src": source.get("src"),
        "utmSource": source.get("utm_source"),
        "utmMedium": source.get("utm_medium"),
        "utmCampaign": source.get("utm_campaign"),
        "utmContent": source.get("utm_content"),
        "utmTerm": source.get("utm_term"),
        "userAgent": user_agent,
        "status": "new",
        "createdAt": created_at,
        "updatedAt": created_at,
    }
    store.setdefault("landingLeads", []).insert(0, lead)
    _append_landing_lead_owner_notification(store, lead)
    _upsert_landing_session(store, session_id, source, user_agent=user_agent, landing_path="/")
    _append_analytics_event(
        store,
        session_id,
        "form_submit",
        {
            "leadId": lead["id"],
            "discoverySource": lead["discoverySource"],
            **source,
        },
    )
    _write_store(store)
    try:
        telegram_result = _send_landing_lead_notification_to_telegram(store, lead)
        _record_landing_lead_telegram_delivery(lead, telegram_result)
        _write_store(store)
    except Exception as exc:
        _record_landing_lead_telegram_delivery(lead, {"ok": False, "delivered": 0}, error=str(exc))
        _write_store(store)
    return {"ok": True, "lead": lead}


@app.get("/api/stats/events")
def stats_events(request: FastAPIRequest) -> dict[str, Any]:
    _require_stats_token(request)
    store = _read_store()
    date_from, date_to = _resolve_stats_range(request)
    date_from, date_to = _effective_stats_range(store, date_from, date_to)
    counts: dict[str, int] = {}
    for event in store.get("analyticsEvents", []):
        if not _is_in_stats_range(event.get("createdAt"), date_from, date_to):
            continue
        event_name = str(event.get("eventName") or "").strip() or "unknown"
        counts[event_name] = counts.get(event_name, 0) + 1
    return {
        "range": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "events": counts,
    }


@app.get("/api/stats/overview")
def stats_overview(request: FastAPIRequest) -> dict[str, Any]:
    _require_stats_token(request)
    store = _read_store()
    date_from, date_to = _resolve_stats_range(request)
    date_from, date_to = _effective_stats_range(store, date_from, date_to)
    sessions = [item for item in store.get("landingSessions", []) if _is_in_stats_range(item.get("firstSeenAt"), date_from, date_to)]
    leads = [
        item
        for item in store.get("landingLeads", [])
        if not _is_deleted_landing_lead(item) and _is_in_stats_range(item.get("createdAt"), date_from, date_to)
    ]
    form_starts = sum(
        1
        for event in store.get("analyticsEvents", [])
        if str(event.get("eventName") or "") == "form_start" and _is_in_stats_range(event.get("createdAt"), date_from, date_to)
    )
    conversion_rate = round((len(leads) / len(sessions)) * 100, 2) if sessions else 0.0
    return {
        "range": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "sessions": len(sessions),
        "form_starts": form_starts,
        "leads": len(leads),
        "conversion_rate": conversion_rate,
    }


@app.get("/api/stats/sources")
def stats_sources(request: FastAPIRequest) -> dict[str, Any]:
    _require_stats_token(request)
    store = _read_store()
    date_from, date_to = _resolve_stats_range(request)
    date_from, date_to = _effective_stats_range(store, date_from, date_to)
    source_breakdown: dict[str, dict[str, int]] = {}

    for session in store.get("landingSessions", []):
        if not _is_in_stats_range(session.get("firstSeenAt"), date_from, date_to):
            continue
        source = str(session.get("src") or session.get("utmSource") or "direct").strip() or "direct"
        row = source_breakdown.setdefault(source, {"sessions": 0, "leads": 0})
        row["sessions"] += 1

    for lead in store.get("landingLeads", []):
        if _is_deleted_landing_lead(lead):
            continue
        if not _is_in_stats_range(lead.get("createdAt"), date_from, date_to):
            continue
        source = str(lead.get("src") or lead.get("utmSource") or lead.get("discoverySource") or "direct").strip() or "direct"
        row = source_breakdown.setdefault(source, {"sessions": 0, "leads": 0})
        row["leads"] += 1

    return {
        "range": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "source_breakdown": [
            {"source": source, **totals}
            for source, totals in sorted(
                source_breakdown.items(),
                key=lambda item: (item[1]["leads"], item[1]["sessions"]),
                reverse=True,
            )
        ],
    }


@app.get("/api/stats/conversion")
def stats_conversion(request: FastAPIRequest) -> dict[str, Any]:
    _require_stats_token(request)
    store = _read_store()
    date_from, date_to = _resolve_stats_range(request)
    date_from, date_to = _effective_stats_range(store, date_from, date_to)
    sessions = sum(1 for item in store.get("landingSessions", []) if _is_in_stats_range(item.get("firstSeenAt"), date_from, date_to))
    page_views = sum(
        1
        for event in store.get("analyticsEvents", [])
        if str(event.get("eventName") or "") == "page_view" and _is_in_stats_range(event.get("createdAt"), date_from, date_to)
    )
    form_starts = sum(
        1
        for event in store.get("analyticsEvents", [])
        if str(event.get("eventName") or "") == "form_start" and _is_in_stats_range(event.get("createdAt"), date_from, date_to)
    )
    form_submits = sum(
        1
        for event in store.get("analyticsEvents", [])
        if str(event.get("eventName") or "") == "form_submit" and _is_in_stats_range(event.get("createdAt"), date_from, date_to)
    )
    leads = sum(
        1
        for item in store.get("landingLeads", [])
        if not _is_deleted_landing_lead(item) and _is_in_stats_range(item.get("createdAt"), date_from, date_to)
    )
    return {
        "range": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "funnel": {
            "sessions": sessions,
            "page_views": page_views,
            "form_starts": form_starts,
            "form_submits": form_submits,
            "leads": leads,
        },
    }


@app.post("/api/auth/otp/start")
def otp_start(payload: OtpStartPayload) -> dict[str, Any]:
    del payload
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="OTP-вход отключён. Используйте вход по телефону и PIN-коду.",
    )


@app.post("/api/auth/otp/verify", response_model=AuthResponse)
def otp_verify(payload: OtpVerifyPayload) -> AuthResponse:
    del payload
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="OTP-вход отключён. Используйте вход по телефону и PIN-коду.",
    )


@app.get("/api/auth/csrf")
def auth_csrf(response: Response) -> dict[str, str]:
    csrf_token = _issue_csrf_cookie(response)
    return {"csrf_token": csrf_token}


@app.get("/api/auth/me")
def auth_me(current_user: dict[str, Any] = Depends(_require_auth)) -> dict[str, Any]:
    return current_user


@app.post("/api/auth/logout")
def auth_logout(
    request: FastAPIRequest,
    response: Response,
    current_user: dict[str, Any] = Depends(_require_auth),
) -> dict[str, bool]:
    token = _extract_auth_token(request)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    token_hash = _hash_auth_token(token)
    store = _read_store()
    store.get("activeTokens", {}).pop(token_hash, None)
    ACTIVE_TOKENS.pop(token_hash, None)
    _append_security_audit_event(
        store,
        event_type="auth.logout",
        outcome="success",
        actor_user_id=str(current_user.get("id") or ""),
        target_user_id=str(current_user.get("id") or ""),
        request=request,
        metadata={"role": str(current_user.get("role") or "")},
    )
    _write_store(store)
    _clear_auth_cookies(response)
    return {"ok": True}


@app.post("/api/auth/login-pin", response_model=AuthResponse)
def auth_login_pin(payload: PinLoginPayload, request: FastAPIRequest, response: Response) -> AuthResponse:
    _enforce_csrf(request)
    normalized_phone = _normalize_phone(payload.phone)
    generic_error = "Телефон или PIN указаны неверно"
    _enforce_rate_limit(
        f"login-pin:{_request_client_ip(request)}:{normalized_phone}",
        limit=_login_rate_limit_max_requests(),
        window_ms=_rate_limit_window_ms(),
        detail="Слишком много попыток входа. Попробуйте позже",
    )
    store = _read_store()
    user = _find_user_by_phone(store, normalized_phone)
    user_role = str(user.get("role") or "") if user else ""
    if user is None or user_role not in {"parent", "owner"}:
        _append_security_audit_event(
            store,
            event_type="auth.login_pin",
            outcome="failed",
            request=request,
            metadata={"phone": normalized_phone, "reason": "user_not_found_or_role_denied"},
        )
        _write_store(store)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=generic_error)
    if _current_portal_status(user) == "blocked":
        _append_security_audit_event(
            store,
            event_type="auth.login_pin",
            outcome="blocked",
            actor_user_id=str(user.get("id") or ""),
            target_user_id=str(user.get("id") or ""),
            request=request,
            metadata={"phone": normalized_phone, "reason": "portal_blocked"},
        )
        _write_store(store)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Если вы ещё не активировали кабинет, обратитесь к администратору студии")
    if _current_portal_status(user) != "activated":
        _append_security_audit_event(
            store,
            event_type="auth.login_pin",
            outcome="failed",
            actor_user_id=str(user.get("id") or ""),
            target_user_id=str(user.get("id") or ""),
            request=request,
            metadata={"phone": normalized_phone, "reason": "portal_not_activated"},
        )
        _write_store(store)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Если вы ещё не активировали кабинет, обратитесь к администратору студии")

    pin_auth = _find_pin_auth_by_parent_id(store, str(user.get("id") or ""))
    if pin_auth is None or bool(pin_auth.get("isDisabled")) or not str(pin_auth.get("pinHash") or "").strip():
        _append_security_audit_event(
            store,
            event_type="auth.login_pin",
            outcome="failed",
            actor_user_id=str(user.get("id") or ""),
            target_user_id=str(user.get("id") or ""),
            request=request,
            metadata={"phone": normalized_phone, "reason": "pin_not_set_or_disabled"},
        )
        _write_store(store)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=generic_error)

    locked_until = _parse_datetime_safe(pin_auth.get("lockedUntil"))
    if locked_until and locked_until > datetime.now(timezone.utc):
        _append_security_audit_event(
            store,
            event_type="auth.login_pin",
            outcome="locked",
            actor_user_id=str(user.get("id") or ""),
            target_user_id=str(user.get("id") or ""),
            request=request,
            metadata={"phone": normalized_phone, "reason": "temporary_lock"},
        )
        _write_store(store)
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Вход временно заблокирован. Попробуйте позже")

    clean_pin = _sanitize_pin(payload.pin)
    if not _verify_secret_pin(clean_pin, str(pin_auth.get("pinHash") or "")):
        pin_auth["failedAttempts"] = int(pin_auth.get("failedAttempts") or 0) + 1
        audit_outcome = "failed"
        if pin_auth["failedAttempts"] >= _pin_max_attempts():
            pin_auth["lockedUntil"] = (datetime.now(timezone.utc) + timedelta(minutes=_pin_lock_minutes())).isoformat()
            audit_outcome = "locked"
        pin_auth["updatedAt"] = _utc_now_iso()
        _append_security_audit_event(
            store,
            event_type="auth.login_pin",
            outcome=audit_outcome,
            actor_user_id=str(user.get("id") or ""),
            target_user_id=str(user.get("id") or ""),
            request=request,
            metadata={"phone": normalized_phone, "reason": "invalid_pin", "failed_attempts": pin_auth["failedAttempts"]},
        )
        _write_store(store)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=generic_error)

    pin_auth["failedAttempts"] = 0
    pin_auth["lockedUntil"] = None
    pin_auth["updatedAt"] = _utc_now_iso()
    token = _create_auth_session(store, user)
    _set_auth_session_cookies(response, token)
    _append_security_audit_event(
        store,
        event_type="auth.login_pin",
        outcome="success",
        actor_user_id=str(user.get("id") or ""),
        target_user_id=str(user.get("id") or ""),
        request=request,
        metadata={"phone": normalized_phone, "role": user_role},
    )
    _write_store(store)
    return AuthResponse(
        role="owner" if user_role == "owner" else "parent",
        access_level=str(user.get("access_level") or "full"),
        account_status=str(user.get("account_status") or "active"),
    )


@app.post("/api/auth/start-pin-activation")
def auth_start_pin_activation(payload: StartPinActivationPayload) -> dict[str, Any]:
    store = _read_store()
    normalized_phone = _normalize_phone(payload.phone)
    parent_user = _find_user_by_phone(store, normalized_phone)
    if parent_user is None or str(parent_user.get("role") or "") != "parent":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Не удалось запустить активацию. Обратитесь к администратору студии.",
        )
    if _current_portal_status(parent_user) == "blocked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ к кабинету отключен. Обратитесь к администратору студии.",
        )
    has_any_payments = any(
        str(item.get("parentUserId") or "") == str(parent_user.get("id") or "")
        for item in store.get("paymentRecords", [])
    )
    if not has_any_payments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="По этому номеру пока нет выставленных счетов. Обратитесь к администратору студии.",
        )
    activation = _create_activation_token(
        store,
        parent_user_id=str(parent_user.get("id") or ""),
        payment_id=None,
        purpose="initial_activation",
        source_flow="admin_manual_activation",
        created_by_admin_id=None,
    )
    _write_store(store)
    return {
        "activation_url": activation.get("activationUrl"),
        "expires_at": activation.get("expiresAt"),
    }


@app.get("/api/auth/activation/{token}")
def auth_activation_info(token: str) -> dict[str, Any]:
    store = _read_store()
    record = _find_activation_record_by_raw_token(store, token)
    if record is None:
        return {"valid": False, "message": "Ссылка недействительна или устарела"}
    is_valid, message = _is_activation_record_valid(store, record)
    if not is_valid:
        return {"valid": False, "message": message or "Ссылка недействительна или устарела"}

    parent_user = _find_user_by_id(store, str(record.get("parentUserId") or ""))
    payment = _find_payment_by_id(store, str(record.get("paymentId") or "")) if record.get("paymentId") else None
    return {
        "valid": True,
        "phone_masked": _mask_phone(str((parent_user or {}).get("phone") or "")),
        "user_name": str((parent_user or {}).get("name") or ""),
        "purpose": str(record.get("purpose") or ""),
        "payment_status": str((payment or {}).get("status") or ""),
        "expires_at": record.get("expiresAt"),
    }


@app.post("/api/auth/activation/{token}/set-pin", response_model=AuthResponse)
def auth_activation_set_pin(
    token: str,
    payload: ActivationSetPinPayload,
    request: FastAPIRequest,
    response: Response,
) -> AuthResponse:
    _enforce_csrf(request)
    store = _read_store()
    record = _find_activation_record_by_raw_token(store, token)
    if record is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ссылка недействительна или устарела")
    is_valid, message = _is_activation_record_valid(store, record)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message or "Ссылка недействительна или устарела")
    if payload.pin != payload.pin_repeat:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN-коды не совпадают")

    clean_pin = _validate_pin_or_raise(payload.pin)
    parent_user = _find_user_by_id(store, str(record.get("parentUserId") or ""))
    if parent_user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ссылка недействительна или устарела")

    _upsert_pin_auth(
        store,
        parent_user_id=str(parent_user.get("id") or ""),
        pin_hash=_hash_secret_pin(clean_pin),
    )
    parent_user["access_level"] = "full"
    parent_user["account_status"] = "active"
    _set_parent_portal_status(store, parent_user, "activated")
    _mark_activation_record_used(record)
    token_value = _create_auth_session(store, parent_user)
    _set_auth_session_cookies(response, token_value)
    _append_security_audit_event(
        store,
        event_type="auth.activation_pin_set",
        outcome="success",
        actor_user_id=str(parent_user.get("id") or ""),
        target_user_id=str(parent_user.get("id") or ""),
        request=request,
        metadata={"purpose": str(record.get("purpose") or "")},
    )
    _write_store(store)
    return AuthResponse(
        role="parent",
        access_level="full",
        account_status="active",
    )


@app.post("/api/admin/clients/{client_id}/activation-link")
def admin_create_client_activation_link(
    client_id: str,
    payload: AdminActivationLinkPayload,
    request: FastAPIRequest,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    client = _find_client_by_id(store, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден")
    parent_user = _find_user_by_id(store, str(client.get("parentUserId") or ""))
    if parent_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Родитель не найден")
    if _current_portal_status(parent_user) == "blocked":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Доступ к кабинету отключён")
    activation = _create_activation_token(
        store,
        parent_user_id=str(parent_user.get("id") or ""),
        payment_id=str((_find_latest_payment_for_client(store, client_id) or {}).get("id") or "") or None,
        purpose=payload.purpose,
        source_flow="admin_manual_activation" if payload.purpose != "reset_pin" else "admin_reset_pin",
        created_by_admin_id=str(current_user.get("id") or ""),
    )
    _append_security_audit_event(
        store,
        event_type="admin.activation_link_created",
        outcome="success",
        actor_user_id=str(current_user.get("id") or ""),
        target_user_id=str(parent_user.get("id") or ""),
        request=request,
        metadata={"clientId": client_id, "purpose": payload.purpose},
    )
    _write_store(store)
    return {
        "activation_url": activation.get("activationUrl"),
        "qr_code": activation.get("qrCode"),
        "expires_at": activation.get("expiresAt"),
    }


@app.post("/api/admin/clients/{client_id}/reset-pin")
def admin_reset_client_pin(
    client_id: str,
    request: FastAPIRequest,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    client = _find_client_by_id(store, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден")
    parent_user_id = str(client.get("parentUserId") or "")
    _disable_pin_auth(store, parent_user_id)
    activation = _create_activation_token(
        store,
        parent_user_id=parent_user_id,
        payment_id=None,
        purpose="reset_pin",
        source_flow="admin_reset_pin",
        created_by_admin_id=str(current_user.get("id") or ""),
    )
    _append_security_audit_event(
        store,
        event_type="admin.reset_pin",
        outcome="success",
        actor_user_id=str(current_user.get("id") or ""),
        target_user_id=parent_user_id,
        request=request,
        metadata={"clientId": client_id},
    )
    _write_store(store)
    return {
        "activation_url": activation.get("activationUrl"),
        "qr_code": activation.get("qrCode"),
        "expires_at": activation.get("expiresAt"),
    }


@app.post("/api/admin/clients/{client_id}/suspend-portal")
def admin_suspend_client_portal(
    client_id: str,
    request: FastAPIRequest,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    client = _find_client_by_id(store, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден")
    parent_user = _find_user_by_id(store, str(client.get("parentUserId") or ""))
    if parent_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Родитель не найден")

    parent_user["account_status"] = "suspended"
    _set_parent_portal_status(store, parent_user, "blocked")
    _append_security_audit_event(
        store,
        event_type="admin.portal_suspended",
        outcome="success",
        actor_user_id=str(current_user.get("id") or ""),
        target_user_id=str(parent_user.get("id") or ""),
        request=request,
        metadata={"clientId": client_id},
    )
    _write_store(store)
    return {
        "ok": True,
        "portal_status": parent_user.get("portal_status"),
        "portal_activated_at": parent_user.get("portal_activated_at"),
        "portal_blocked_at": parent_user.get("portal_blocked_at"),
        "account_status": parent_user.get("account_status"),
        "access_level": parent_user.get("access_level"),
    }


@app.post("/api/admin/clients/{client_id}/resume-portal")
def admin_resume_client_portal(
    client_id: str,
    request: FastAPIRequest,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    client = _find_client_by_id(store, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден")
    parent_user = _find_user_by_id(store, str(client.get("parentUserId") or ""))
    if parent_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Родитель не найден")

    restored_status = _restore_parent_portal_access(store, parent_user)
    _append_security_audit_event(
        store,
        event_type="admin.portal_resumed",
        outcome="success",
        actor_user_id=str(current_user.get("id") or ""),
        target_user_id=str(parent_user.get("id") or ""),
        request=request,
        metadata={"clientId": client_id, "restoredStatus": restored_status},
    )
    _write_store(store)
    return {
        "ok": True,
        "portal_status": parent_user.get("portal_status"),
        "portal_activated_at": parent_user.get("portal_activated_at"),
        "portal_blocked_at": parent_user.get("portal_blocked_at"),
        "account_status": parent_user.get("account_status"),
        "access_level": parent_user.get("access_level"),
    }


@app.post("/api/admin/clients/{client_id}/cash-payment")
def admin_client_cash_payment(
    client_id: str,
    payload: AdminCashPortalPaymentPayload,
    request: FastAPIRequest,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    client = _find_client_by_id(store, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден")
    parent_user = _find_user_by_id(store, str(client.get("parentUserId") or ""))
    if parent_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Родитель не найден")

    payment = _find_latest_payment_for_client(store, client_id)
    now = _utc_now_iso()
    if payment is None:
        payment = {
            "id": _new_id("payment"),
            "clientId": client_id,
            "parentUserId": parent_user["id"],
            "parentPhone": parent_user["phone"],
            "subscriptionName": client.get("subscriptionName"),
            "amount": float(payload.amount or client.get("subscriptionAmount") or 0),
            "currency": "RUB",
            "paymentMethod": "cash",
            "status": "paid",
            "providerPaymentId": None,
            "paidAt": now,
            "confirmedByUserId": current_user["id"],
            "invoiceNumber": _next_invoice_number(store),
            "dueDate": _default_due_date_iso(),
            "serviceStartDate": datetime.now(timezone.utc).date().isoformat(),
            "reminderCount": 0,
            "lastReminderAt": None,
            "nextReminderAt": None,
            "reminderComment": None,
            "invoiceComment": payload.comment,
            "createdByUserId": current_user["id"],
            "statusUpdatedAt": now,
            "createdAt": now,
            "updatedAt": now,
        }
        store.setdefault("paymentRecords", []).insert(0, payment)
    else:
        payment["paymentMethod"] = "cash"
        payment["status"] = "paid"
        payment["paidAt"] = now
        payment["confirmedByUserId"] = current_user["id"]
        payment["invoiceComment"] = payload.comment
        payment["updatedAt"] = now
        payment["statusUpdatedAt"] = now
        _ensure_active_subscription_for_payment(store, payment)
        payment["nextReminderAt"] = None

    _sync_client_status_by_payment(store, payment)
    parent_user["access_level"] = "full"
    parent_user["account_status"] = "active"
    _set_parent_portal_status(store, parent_user, "paid_cash_waiting_activation")
    activation = _create_activation_token(
        store,
        parent_user_id=str(parent_user.get("id") or ""),
        payment_id=str(payment.get("id") or ""),
        purpose="after_cash_payment",
        source_flow="admin_cash_payment",
        created_by_admin_id=str(current_user.get("id") or ""),
    )
    _append_security_audit_event(
        store,
        event_type="admin.cash_payment_activation_issued",
        outcome="success",
        actor_user_id=str(current_user.get("id") or ""),
        target_user_id=str(parent_user.get("id") or ""),
        request=request,
        metadata={"clientId": client_id, "paymentId": str(payment.get("id") or "")},
    )
    _write_store(store)
    return {
        "payment": _serialize_admin_payment(store, payment),
        "activation_url": activation.get("activationUrl"),
        "qr_code": activation.get("qrCode"),
        "expires_at": activation.get("expiresAt"),
    }


@app.post("/api/public/payment/start")
def public_payment_start(payload: PublicPaymentStartPayload, request: FastAPIRequest) -> dict[str, Any]:
    _enforce_csrf(request)
    normalized_phone = _normalize_phone(payload.phone)
    _enforce_rate_limit(
        f"payment-start:{_request_client_ip(request)}:{normalized_phone}",
        limit=_payment_start_rate_limit_max_requests(),
        window_ms=_rate_limit_window_ms(),
        detail="Слишком много попыток создать оплату. Попробуйте позже",
    )
    store = _read_store()
    parent_user = _find_user_by_phone(store, normalized_phone)
    if parent_user and str(parent_user.get("role")) != "parent":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Телефон уже используется в системе")
    if parent_user is None:
        parent_user = _create_user(
            store,
            phone=normalized_phone,
            role="parent",
            name=(payload.parent_name or normalized_phone).strip() or normalized_phone,
            access_level="payment_only",
            account_status="payment_pending",
            portal_status="awaiting_payment",
        )
    else:
        is_activated_parent = _current_portal_status(parent_user) == "activated"
        if not is_activated_parent:
            _set_parent_portal_status(store, parent_user, "awaiting_payment")
        if not is_activated_parent:
            parent_user["access_level"] = "payment_only"
            parent_user["account_status"] = "payment_pending"
        parent_user["updated_at"] = _utc_now_iso()

    product_key = str(payload.product_id or "").strip()
    plan = None
    if product_key:
        plan = next(
            (
                item for item in store.get("ownerPricingPlans", [])
                if product_key in {str(item.get("id") or ""), str(item.get("code") or ""), str(item.get("title") or "")}
            ),
            None,
        )
    if plan is None:
        plan = next((item for item in store.get("ownerPricingPlans", []) if bool(item.get("isActive", True))), None)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Активные позиции прайса не найдены")

    child_name = (payload.child_name or "").strip() or "Новый ученик"
    existing_child = next(
        (
            item for item in store.get("children", [])
            if str(item.get("parentUserId") or "") == str(parent_user.get("id") or "")
            and str(item.get("fullName") or "").strip().lower() == child_name.lower()
        ),
        None,
    )
    if existing_child is None:
        existing_child = {
            "id": _new_id("child"),
            "parentUserId": parent_user["id"],
            "fullName": child_name,
            "birthDate": None,
            "groupId": None,
            "createdAt": _utc_now_iso(),
            "updatedAt": _utc_now_iso(),
        }
        store.setdefault("children", []).append(existing_child)

    client = next(
        (
            item for item in store.get("clients", [])
            if str(item.get("parentUserId") or "") == str(parent_user.get("id") or "")
            and str(item.get("childId") or "") == str(existing_child.get("id") or "")
        ),
        None,
    )
    if client is None:
        client = {
            "id": _new_id("client"),
            "parentUserId": parent_user["id"],
            "parentPhone": parent_user["phone"],
            "childId": existing_child["id"],
            "subscriptionName": str(plan.get("title") or "Абонемент"),
            "subscriptionCode": str(plan.get("code") or ""),
            "subscriptionAmount": float(plan.get("price") or 0),
            "paymentMethod": "online",
            "paymentStatus": "pending",
            "accessLevel": "payment_only",
            "accountStatus": "payment_pending",
            "portalStatus": _current_portal_status(parent_user),
            "portalActivatedAt": parent_user.get("portal_activated_at"),
            "portalBlockedAt": parent_user.get("portal_blocked_at"),
            "notes": None,
            "profile": {},
            "createdByUserId": None,
            "createdAt": _utc_now_iso(),
            "updatedAt": _utc_now_iso(),
        }
        store.setdefault("clients", []).append(client)

    payment = {
        "id": _new_id("payment"),
        "clientId": client["id"],
        "parentUserId": parent_user["id"],
        "parentPhone": parent_user["phone"],
        "subscriptionName": str(plan.get("title") or "Абонемент"),
        "amount": float(plan.get("price") or 0),
        "currency": "RUB",
        "paymentMethod": "online",
        "status": "pending",
        "providerPaymentId": None,
        "paidAt": None,
        "confirmedByUserId": None,
        "invoiceNumber": _next_invoice_number(store),
        "dueDate": _default_due_date_iso(),
        "serviceStartDate": None,
        "reminderCount": 0,
        "lastReminderAt": None,
        "nextReminderAt": _next_reminder_iso(_default_due_date_iso()),
        "reminderComment": None,
        "invoiceComment": None,
        "createdByUserId": None,
        "statusUpdatedAt": _utc_now_iso(),
        "createdAt": _utc_now_iso(),
        "updatedAt": _utc_now_iso(),
    }
    store.setdefault("paymentRecords", []).insert(0, payment)
    client["paymentMethod"] = "online"
    client["paymentStatus"] = "pending"
    client["updatedAt"] = _utc_now_iso()
    payment_session = _create_payment_session(store, parent_user_id=str(parent_user["id"]), payment_id=str(payment["id"]))
    _append_security_audit_event(
        store,
        event_type="public.payment_session_started",
        outcome="success",
        actor_user_id=str(parent_user.get("id") or ""),
        target_user_id=str(parent_user.get("id") or ""),
        request=request,
        metadata={"paymentId": str(payment.get("id") or ""), "phone": normalized_phone},
    )
    _write_store(store)
    return {
        "payment_session_url": payment_session.get("paymentSessionUrl"),
        "payment_id": payment.get("id"),
        "expires_at": payment_session.get("expiresAt"),
    }


@app.get("/api/public/payment/session/{token}")
def public_payment_session(token: str) -> dict[str, Any]:
    store = _read_store()
    session = _find_payment_session_by_raw_token(store, token)
    if session is None or not _is_payment_session_valid(session):
        return {"valid": False, "message": "Ссылка оплаты недействительна или устарела"}
    payment = _find_payment_by_id(store, str(session.get("paymentId") or ""))
    if payment is None:
        return {"valid": False, "message": "Платёж не найден"}
    parent_user = _find_user_by_id(store, str(session.get("parentUserId") or ""))
    _touch_payment_session(session)
    _write_store(store)
    return {
        "valid": True,
        "amount": float(payment.get("amount") or 0),
        "service_name": str(payment.get("subscriptionName") or "Абонемент"),
        "payment_status": str(payment.get("status") or "pending"),
        "phone_masked": _mask_phone(str((parent_user or {}).get("phone") or "")),
        "payment_url": payment.get("paymentUrl"),
        "expires_at": session.get("expiresAt"),
    }


@app.post("/api/public/payment/session/{token}/provider")
def public_payment_session_provider(token: str, request: FastAPIRequest) -> dict[str, Any]:
    _enforce_csrf(request)
    store = _read_store()
    session = _find_payment_session_by_raw_token(store, token)
    if session is None or not _is_payment_session_valid(session):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ссылка оплаты недействительна или устарела")
    payment = _find_payment_by_id(store, str(session.get("paymentId") or ""))
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Платёж не найден")
    if str(payment.get("status") or "") == "paid":
        _touch_payment_session(session, status_value="paid")
        _write_store(store)
        return {"ok": True, "status": "paid"}
    provider_result = _create_provider_payment_for_payment(
        store,
        payment_id=str(payment.get("id") or ""),
        success_url=f"{_frontend_base_url()}/pay/success/{token}",
        fail_url=f"{_frontend_base_url()}/pay/session/{token}?status=failed",
        backend_base_url=_payment_public_base_url(request),
    )
    _touch_payment_session(session, status_value="active")
    _write_store(store)
    return provider_result


@app.get("/api/public/payment/success/{token}")
def public_payment_success(token: str) -> dict[str, Any]:
    store = _read_store()
    session = _find_payment_session_by_raw_token(store, token)
    if session is None or not _is_payment_session_valid(session):
        return {"status": "invalid", "message": "Ссылка недействительна"}
    payment = _find_payment_by_id(store, str(session.get("paymentId") or ""))
    if payment is None:
        return {"status": "invalid", "message": "Платёж не найден"}

    payment_status = str(payment.get("status") or "pending")
    if payment_status == "pending" and _selfwork_provider_name().strip().lower() == "selfwork":
        sync_result = _sync_selfwork_payment_status_internal(store, str(payment.get("id") or ""))
        if bool(sync_result.get("synced")):
            store = _read_store()
            payment = _find_payment_by_id(store, str(session.get("paymentId") or "")) or payment
            payment_status = str(payment.get("status") or "pending")

    if payment_status == "paid":
        parent_user = _find_user_by_id(store, str(session.get("parentUserId") or ""))
        if parent_user is None:
            return {"status": "invalid", "message": "Клиент не найден"}
        _set_parent_portal_status(store, parent_user, "paid_online_waiting_activation")
        activation = _create_activation_token(
            store,
            parent_user_id=str(parent_user.get("id") or ""),
            payment_id=str(payment.get("id") or ""),
            purpose="after_online_payment",
            source_flow="online_payment",
        )
        _touch_payment_session(session, status_value="completed")
        _write_store(store)
        return {"status": "paid", "activation_url": activation.get("activationUrl")}

    if payment_status in {"failed", "cancelled"}:
        _touch_payment_session(session, status_value="cancelled")
        _write_store(store)
        return {"status": "failed", "message": "Оплата не прошла"}

    _touch_payment_session(session, status_value="active")
    _write_store(store)
    return {"status": "pending", "message": "Платёж обрабатывается"}


@app.get("/api/payments/plans")
def list_subscription_plans(_: dict[str, Any] = Depends(_require_parent)) -> dict[str, Any]:
    if not _env_flag("PAYMENTS_MVP_ENABLED", False):
        return {"plans": []}
    store = _read_store()
    plans = payment_service.list_active_plans(store)
    return {"plans": plans}


@app.post("/api/payments/create")
def payments_create(
    payload: CreatePaymentPayload,
    current_user: dict[str, Any] = Depends(_require_parent),
) -> dict[str, Any]:
    if not _env_flag("PAYMENTS_MVP_ENABLED", False):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Временный контур оплаты отключен.",
        )
    store = _read_store()
    try:
        created = payment_service.create_payment(
            store=store,
            parent_user=current_user,
            subscription_plan_code=payload.subscription_plan_code,
            child_id=payload.child_id,
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    except PermissionError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error))

    _write_store(store)
    return created


@app.post("/api/payments/{payment_id}/confirm-user-paid")
def payments_confirm_user_paid(
    payment_id: str,
    current_user: dict[str, Any] = Depends(_require_parent),
) -> dict[str, Any]:
    if not _env_flag("PAYMENTS_MVP_ENABLED", False):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Временный контур оплаты отключен.",
        )
    store = _read_store()
    try:
        result = payment_service.confirm_user_paid(
            store=store,
            parent_user=current_user,
            payment_id=payment_id,
        )
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    except PermissionError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error))
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error))

    _append_payment_journal(
        store,
        payment=result["payment"],
        event_type="payment.user_confirmed",
        source="parent_cabinet",
        previous_status=None,
        new_status=result["payment"].get("status", "pending"),
        actor_user_id=current_user.get("id"),
        actor_role="parent",
        metadata={"confirmedBy": "user"},
    )
    _write_store(store)
    return result


@app.get("/api/payments/my")
def payments_my(current_user: dict[str, Any] = Depends(_require_parent)) -> list[dict[str, Any]]:
    store = _read_store()
    return payment_service.parent_payments(store=store, parent_user=current_user)


@app.get("/api/subscriptions/my")
def subscriptions_my(current_user: dict[str, Any] = Depends(_require_parent)) -> list[dict[str, Any]]:
    store = _read_store()
    return payment_service.parent_subscriptions(store=store, parent_user=current_user)


@app.post("/api/admin/clients")
def admin_create_client(
    payload: AdminCreateClientPayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    now = _utc_now_iso()

    birth_date = _normalize_birth_date(payload.child_birth_date)
    parent_phone = _normalize_phone(payload.parent_phone)
    requested_group_id = str(payload.group_id or "").strip() or None
    selected_group: dict[str, Any] | None = None
    if requested_group_id:
        selected_group = _find_group_by_id(store, requested_group_id)
        if selected_group is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Группа не найдена")
    subscription_name = payload.subscription_name.strip()
    plan = _find_owner_pricing_plan(store, subscription_name)
    if plan is None or not bool(plan.get("isActive", True)):
        allowed = ", ".join(
            sorted(
                {
                    str(item.get("title"))
                    for item in store.get("ownerPricingPlans", [])
                    if bool(item.get("isActive", True))
                }
            )
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Доступны только абонементы: {allowed}.",
        )

    normalized_subscription_name = str(plan.get("title") or subscription_name)
    base_price = float(plan.get("price") or 0)
    if payload.subscription_amount > base_price:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Сумма к оплате не может быть выше базовой стоимости абонемента.",
        )
    service_start_date_iso = datetime.now(timezone.utc).date().isoformat()
    if payload.service_start_date:
        service_start_date_iso = _normalize_iso_date(payload.service_start_date)
    mark_as_paid = bool(payload.mark_as_paid)
    activation_bundle: dict[str, Any] | None = None
    payment_session_bundle: dict[str, Any] | None = None

    parent_user = _find_user_by_phone(store, parent_phone)

    if parent_user and parent_user.get("role") != "parent":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Телефон уже используется сотрудником. Укажите другой номер родителя.",
        )

    if parent_user is None:
        initial_portal_status: PortalStatus = (
            "paid_cash_waiting_activation"
            if mark_as_paid and payload.payment_method == "cash"
            else "paid_online_waiting_activation"
            if mark_as_paid and payload.payment_method == "online"
            else "awaiting_payment"
            if payload.payment_method == "online"
            else "not_created"
        )
        parent_user = _create_user(
            store,
            phone=parent_phone,
            role="parent",
            name=payload.parent_full_name,
            access_level="full" if mark_as_paid else "payment_only",
            account_status="active" if mark_as_paid else "payment_pending",
            portal_status=initial_portal_status,
        )
    else:
        current_portal_status = _current_portal_status(parent_user)
        keep_existing_access = current_portal_status == "activated"
        desired_portal_status: PortalStatus = current_portal_status  # type: ignore[assignment]
        if current_portal_status != "activated":
            desired_portal_status = (
                "paid_cash_waiting_activation"
                if mark_as_paid and payload.payment_method == "cash"
                else "paid_online_waiting_activation"
                if mark_as_paid and payload.payment_method == "online"
                else "awaiting_payment"
                if payload.payment_method == "online"
                else "not_created"
            )
        parent_user["name"] = payload.parent_full_name
        parent_user["access_level"] = "full" if mark_as_paid or keep_existing_access else "payment_only"
        parent_user["account_status"] = "active" if mark_as_paid or keep_existing_access else "payment_pending"
        if current_portal_status != "activated":
            _set_parent_portal_status(store, parent_user, desired_portal_status)
        parent_user["updated_at"] = now

    linked_lead = _find_latest_landing_lead_by_phone(store, parent_phone)
    intake_payload = {
        "landingLeadId": linked_lead.get("id") if linked_lead else None,
        "parentFullName": linked_lead.get("parentFullName") if linked_lead else payload.parent_full_name,
        "phone": linked_lead.get("phone") if linked_lead else parent_phone,
        "childFullName": linked_lead.get("childFullName") if linked_lead else payload.child_full_name,
        "childBirthDate": linked_lead.get("childBirthDate") if linked_lead else birth_date,
        "medicalRestrictions": linked_lead.get("medicalRestrictions") if linked_lead else "",
        "previousActivities": linked_lead.get("previousActivities") if linked_lead else "",
        "discoverySource": linked_lead.get("discoverySource") if linked_lead else "manual",
        "preferredSchedule": linked_lead.get("preferredSchedule") if linked_lead else "",
        "comment": linked_lead.get("comment") if linked_lead else "",
        "consent": bool(linked_lead.get("consent", True)) if linked_lead else True,
        "createdAt": linked_lead.get("createdAt") if linked_lead else now,
        "linkedAt": now,
    }

    child = {
        "id": _new_id("child"),
        "parentUserId": parent_user["id"],
        "fullName": payload.child_full_name,
        "birthDate": birth_date,
        "groupId": selected_group.get("id") if selected_group else None,
        "createdAt": now,
        "updatedAt": now,
    }
    store["children"].append(child)

    payment_status: PaymentStatus = "paid" if mark_as_paid else ("unpaid" if payload.payment_method == "cash" else "pending")
    client = {
        "id": _new_id("client"),
        "parentUserId": parent_user["id"],
        "parentPhone": parent_user["phone"],
        "childId": child["id"],
        "subscriptionName": normalized_subscription_name,
        "subscriptionCode": str(plan.get("code") or ""),
        "subscriptionAmount": payload.subscription_amount,
        "paymentMethod": payload.payment_method,
        "paymentStatus": payment_status,
        "accessLevel": "full" if mark_as_paid else "payment_only",
        "accountStatus": "active" if mark_as_paid else "payment_pending",
        "notes": payload.notes,
        "intake": intake_payload,
        "profile": {
            "internalComment": str(payload.notes or ""),
            "healthNotes": str(intake_payload.get("medicalRestrictions") or ""),
            "behavioralNotes": "",
            "goals": "",
            "strengths": "",
            "parentExpectations": "",
            "emergencyContactName": "",
            "emergencyContactPhone": "",
            "communicationPreferences": "",
            "sourceChannel": str(intake_payload.get("discoverySource") or "manual"),
            "priorExperience": str(intake_payload.get("previousActivities") or ""),
            "tags": [],
            "updatedAt": now,
        },
        "createdByUserId": current_user["id"],
        "portalStatus": str(parent_user.get("portal_status") or "not_created"),
        "portalActivatedAt": parent_user.get("portal_activated_at"),
        "portalBlockedAt": parent_user.get("portal_blocked_at"),
        "createdAt": now,
        "updatedAt": now,
    }
    store["clients"].append(client)

    due_date_iso = _default_due_date_iso()
    payment = {
        "id": _new_id("payment"),
        "clientId": client["id"],
        "parentUserId": parent_user["id"],
        "parentPhone": parent_user["phone"],
        "subscriptionName": normalized_subscription_name,
        "amount": payload.subscription_amount,
        "currency": "RUB",
        "paymentMethod": payload.payment_method,
        "status": payment_status,
        "providerPaymentId": None,
        "paidAt": now if mark_as_paid else None,
        "confirmedByUserId": current_user["id"] if mark_as_paid else None,
        "invoiceNumber": _next_invoice_number(store),
        "dueDate": due_date_iso,
        "serviceStartDate": service_start_date_iso,
        "reminderCount": 0,
        "lastReminderAt": None,
        "nextReminderAt": None if mark_as_paid else _next_reminder_iso(due_date_iso),
        "reminderComment": None,
        "invoiceComment": payload.notes,
        "createdByUserId": current_user["id"],
        "statusUpdatedAt": now,
        "createdAt": now,
        "updatedAt": now,
    }
    store["paymentRecords"].insert(0, payment)
    _notify_parent_payment_status(store, payment=payment, status_value=payment_status)

    _append_payment_journal(
        store,
        payment=payment,
        event_type="payment.created",
        source="admin",
        previous_status=None,
        new_status=payment_status,
        actor_user_id=current_user["id"],
        actor_role=current_user["role"],
        metadata={
            "clientId": client["id"],
            "paymentMethod": payload.payment_method,
            "subscriptionName": normalized_subscription_name,
            "subscriptionBasePrice": base_price,
            "subscriptionCode": str(plan.get("code") or ""),
            "markAsPaid": mark_as_paid,
            "serviceStartDate": service_start_date_iso,
        },
    )

    if mark_as_paid and _current_portal_status(parent_user) != "activated":
        activation_bundle = _create_activation_token(
            store,
            parent_user_id=str(parent_user.get("id") or ""),
            payment_id=str(payment.get("id") or ""),
            purpose="after_cash_payment" if payload.payment_method == "cash" else "after_online_payment",
            source_flow="admin_cash_payment" if payload.payment_method == "cash" else "admin_manual_activation",
            created_by_admin_id=str(current_user.get("id") or ""),
        )
    elif payload.payment_method == "online" and not mark_as_paid:
        payment_session_bundle = _create_payment_session(
            store,
            parent_user_id=str(parent_user.get("id") or ""),
            payment_id=str(payment.get("id") or ""),
        )

    _recalculate_group_student_counts(store)

    _write_store(store)

    return {
        "ok": True,
        "parent": parent_user,
        "child": child,
        "client": client,
        "payment": payment,
        "portal_status": parent_user.get("portal_status"),
        "activation": {
            "activation_url": activation_bundle.get("activationUrl"),
            "qr_code": activation_bundle.get("qrCode"),
            "expires_at": activation_bundle.get("expiresAt"),
        } if activation_bundle else None,
        "payment_session": {
            "payment_session_url": payment_session_bundle.get("paymentSessionUrl"),
            "expires_at": payment_session_bundle.get("expiresAt"),
        } if payment_session_bundle else None,
    }


@app.get("/api/admin/clients")
def admin_list_clients(
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> list[dict[str, Any]]:
    del current_user
    store = _read_store()
    return [_serialize_admin_client(store, client) for client in store["clients"]]


@app.get("/api/admin/children")
def admin_list_children(
    group_id: str | None = None,
    payment_status: PaymentStatus | None = None,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> list[dict[str, Any]]:
    del current_user
    store = _read_store()
    rows = [_serialize_admin_child_row(store, child) for child in store.get("children", [])]
    if group_id:
        rows = [item for item in rows if str(item.get("groupId") or "") == group_id]
    if payment_status:
        rows = [item for item in rows if str(item.get("paymentStatus") or "") == payment_status]
    rows.sort(key=lambda item: str(item.get("fullName") or ""))
    return rows


@app.get("/api/admin/landing-leads")
def admin_list_landing_leads(
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> list[dict[str, Any]]:
    del current_user
    store = _read_store()

    linked_lead_ids = {
        str((client.get("intake") or {}).get("landingLeadId") or "").strip()
        for client in store.get("clients", [])
        if isinstance(client.get("intake"), dict) and str((client.get("intake") or {}).get("landingLeadId") or "").strip()
    }

    rows = [
        _serialize_admin_landing_lead_row(store, lead)
        for lead in store.get("landingLeads", [])
        if str(lead.get("id") or "").strip()
        and str(lead.get("id") or "").strip() not in linked_lead_ids
        and not _is_deleted_landing_lead(lead)
    ]
    rows.sort(
        key=lambda item: _parse_datetime_safe(item.get("updatedAt") or item.get("createdAt"))
        or datetime.fromtimestamp(0, tz=timezone.utc),
        reverse=True,
    )
    return rows


@app.post("/api/admin/landing-leads/sync")
def admin_sync_landing_leads(
    send_telegram: bool = True,
    limit: int | None = None,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    del current_user
    store = _read_store()
    result = _sync_existing_landing_integrations(
        store,
        send_telegram=send_telegram,
        limit=max(1, min(500, limit)) if limit is not None else None,
    )
    _write_store(store)
    return result


@app.get("/api/admin/children/{child_id}")
def admin_get_child(
    child_id: str,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    del current_user
    store = _read_store()
    child = _find_child_by_id(store, child_id)
    if child is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ученик не найден")
    return _serialize_admin_child_row(store, child)


@app.patch("/api/admin/children/{child_id}/profile")
def admin_update_child_profile(
    child_id: str,
    payload: AdminChildProfilePayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    child = _find_child_by_id(store, child_id)
    if child is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ученик не найден")

    client = next((item for item in store.get("clients", []) if str(item.get("childId")) == str(child.get("id"))), None)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиентская карта не найдена")

    now = _utc_now_iso()
    profile = client.get("profile") if isinstance(client.get("profile"), dict) else {}
    profile["internalComment"] = (payload.internal_comment or "").strip()
    profile["healthNotes"] = (payload.health_notes or "").strip()
    profile["behavioralNotes"] = (payload.behavioral_notes or "").strip()
    profile["goals"] = (payload.goals or "").strip()
    profile["strengths"] = (payload.strengths or "").strip()
    profile["parentExpectations"] = (payload.parent_expectations or "").strip()
    profile["emergencyContactName"] = (payload.emergency_contact_name or "").strip()
    profile["emergencyContactPhone"] = (payload.emergency_contact_phone or "").strip()
    profile["communicationPreferences"] = (payload.communication_preferences or "").strip()
    profile["sourceChannel"] = (payload.source_channel or "").strip()
    profile["priorExperience"] = (payload.prior_experience or "").strip()
    profile["tags"] = sorted(
        {
            str(item).strip()
            for item in (payload.tags or [])
            if str(item).strip()
        }
    )
    profile["updatedAt"] = now

    client["profile"] = profile
    client["updatedAt"] = now
    child["updatedAt"] = now
    _write_store(store)

    return {
        "ok": True,
        "child": _serialize_admin_child_row(store, child),
        "updatedByUserId": current_user.get("id"),
    }


@app.patch("/api/admin/children/{child_id}/group")
def admin_assign_child_group(
    child_id: str,
    payload: OwnerAssignChildGroupPayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    child = _find_child_by_id(store, child_id)
    if child is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ученик не найден")

    next_group_id = str(payload.group_id or "").strip() or None
    next_group = None
    if next_group_id:
        next_group = _find_group_by_id(store, next_group_id)
        if next_group is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Группа не найдена")

    previous_group_id = str(child.get("groupId") or "").strip() or None
    if previous_group_id == next_group_id:
        return {"ok": True, "child": _serialize_admin_child_row(store, child), "idempotent": True}

    child["groupId"] = next_group_id
    child["updatedAt"] = _utc_now_iso()
    _recalculate_group_student_counts(store)
    _write_store(store)

    return {
        "ok": True,
        "child": _serialize_admin_child_row(store, child),
        "previousGroupId": previous_group_id,
        "group": next_group,
        "updatedByUserId": current_user.get("id"),
    }


@app.get("/api/admin/payments")
def admin_list_payments(
    status_filter: PaymentStatus | None = None,
    method_filter: PaymentMethod | None = None,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> list[dict[str, Any]]:
    del current_user
    store = _read_store()
    records = list(store["paymentRecords"])
    changed = False
    for item in records:
        if _ensure_legacy_payment_shape(store, item):
            changed = True
        if _refresh_payment_overdue_status(item):
            changed = True
    result = [_serialize_admin_payment(store, item) for item in records]

    existing_ids = {str(item.get("id") or "") for item in result if str(item.get("id") or "")}
    for parent_payment in store.get("payments", []):
        payment_id = str(parent_payment.get("id") or "")
        if not payment_id or payment_id in existing_ids:
            continue
        result.append(_serialize_admin_payment_from_parent_payment(store, parent_payment))

    if status_filter:
        result = [item for item in result if str(item.get("status") or "") == status_filter]
    if method_filter:
        result = [item for item in result if str(item.get("paymentMethod") or "") == method_filter]

    result.sort(
        key=lambda item: _parse_datetime_safe(item.get("updatedAt") or item.get("createdAt")) or datetime.fromtimestamp(0, tz=timezone.utc),
        reverse=True,
    )
    if changed:
        _write_store(store)
    return result


@app.post("/api/admin/payments/invoices")
def admin_create_invoice(
    payload: AdminCreateInvoicePayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    resolved_client_id = str(payload.client_id or "").strip()
    client = _find_client_by_id(store, resolved_client_id) if resolved_client_id else None
    now = _utc_now_iso()

    if client is None:
        parent_user: dict[str, Any] | None = None
        parent_user_id = str(payload.parent_user_id or "").strip()
        if parent_user_id:
            parent_user = _find_user_by_id(store, parent_user_id)
            if parent_user is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Родитель не найден")

        parent_phone_raw = str(payload.parent_phone or "").strip()
        if parent_user is None and not parent_phone_raw:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Укажите номер телефона или выберите существующего родителя",
            )
        if parent_user is None:
            parent_phone = _normalize_phone(parent_phone_raw)
            parent_user = _find_user_by_phone(store, parent_phone)
            if parent_user and parent_user.get("role") != "parent":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Телефон уже используется сотрудником. Укажите другой номер родителя.",
                )
            if parent_user is None:
                parent_user = _create_user(
                    store,
                    phone=parent_phone,
                    role="parent",
                    name=str(payload.parent_full_name or "Родитель").strip() or "Родитель",
                    access_level="payment_only",
                    account_status="payment_pending",
                    portal_status="not_created",
                )
            elif str(payload.parent_full_name or "").strip():
                parent_user["name"] = str(payload.parent_full_name or "").strip()
                parent_user["updated_at"] = now

        child_name = str(payload.child_full_name or "").strip()
        if not child_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Укажите имя ребенка")

        existing_child = next(
            (
                item
                for item in store.get("children", [])
                if str(item.get("parentUserId") or "") == str(parent_user.get("id") or "")
                and str(item.get("fullName") or "").strip().lower() == child_name.lower()
            ),
            None,
        )
        if existing_child is None:
            existing_child = {
                "id": _new_id("child"),
                "parentUserId": str(parent_user.get("id") or ""),
                "fullName": child_name,
                "birthDate": None,
                "groupId": None,
                "createdAt": now,
                "updatedAt": now,
            }
            store.setdefault("children", []).append(existing_child)

        existing_client = next(
            (
                item
                for item in store.get("clients", [])
                if str(item.get("parentUserId") or "") == str(parent_user.get("id") or "")
                and str(item.get("childId") or "") == str(existing_child.get("id") or "")
            ),
            None,
        )
        if existing_client is None:
            existing_client = {
                "id": _new_id("client"),
                "parentUserId": str(parent_user.get("id") or ""),
                "parentPhone": str(parent_user.get("phone") or ""),
                "childId": str(existing_child.get("id") or ""),
                "subscriptionName": str(payload.subscription_name or "Абонемент"),
                "subscriptionCode": "",
                "subscriptionAmount": float(payload.amount or 0) if payload.amount is not None else 0,
                "paymentMethod": payload.payment_method,
                "paymentStatus": "pending" if payload.payment_method == "online" else "unpaid",
                "accessLevel": str(parent_user.get("access_level") or "payment_only"),
                "accountStatus": str(parent_user.get("account_status") or "payment_pending"),
                "notes": None,
                "intake": None,
                "profile": {
                    "internalComment": "",
                    "healthNotes": "",
                    "behavioralNotes": "",
                    "goals": "",
                    "strengths": "",
                    "parentExpectations": "",
                    "emergencyContactName": "",
                    "emergencyContactPhone": "",
                    "communicationPreferences": "",
                    "sourceChannel": "manual",
                    "priorExperience": "",
                    "tags": [],
                    "updatedAt": now,
                },
                "createdByUserId": current_user.get("id"),
                "portalStatus": str(parent_user.get("portal_status") or "not_created"),
                "portalActivatedAt": parent_user.get("portal_activated_at"),
                "portalBlockedAt": parent_user.get("portal_blocked_at"),
                "createdAt": now,
                "updatedAt": now,
            }
            store.setdefault("clients", []).append(existing_client)
        client = existing_client

    parent_user_id = str(client.get("parentUserId") or "")
    parent_user = _find_user_by_id(store, parent_user_id)
    if parent_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent user not found")

    due_date_iso = _default_due_date_iso()
    if payload.due_date:
        due_date_iso = _normalize_iso_date(payload.due_date)
    starts_at_iso = datetime.now(timezone.utc).date().isoformat()
    if payload.starts_at:
        starts_at_iso = _normalize_iso_date(payload.starts_at)
    amount = float(payload.amount if payload.amount is not None else client.get("subscriptionAmount") or 0)
    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be > 0")

    status_value: PaymentStatus = "unpaid" if payload.payment_method == "cash" else "pending"
    payment = {
        "id": _new_id("payment"),
        "clientId": str(client.get("id")),
        "parentUserId": parent_user_id,
        "parentPhone": str(parent_user.get("phone") or client.get("parentPhone") or ""),
        "subscriptionName": str(client.get("subscriptionName") or "Абонемент"),
        "amount": amount,
        "currency": "RUB",
        "paymentMethod": payload.payment_method,
        "status": status_value,
        "providerPaymentId": None,
        "paidAt": None,
        "confirmedByUserId": None,
        "invoiceNumber": _next_invoice_number(store),
        "dueDate": due_date_iso,
        "serviceStartDate": starts_at_iso,
        "reminderCount": 0,
        "lastReminderAt": None,
        "nextReminderAt": _next_reminder_iso(due_date_iso),
        "reminderComment": None,
        "invoiceComment": payload.comment.strip() if payload.comment else None,
        "createdByUserId": current_user.get("id"),
        "statusUpdatedAt": now,
        "createdAt": now,
        "updatedAt": now,
    }
    store["paymentRecords"].insert(0, payment)

    _sync_client_status_by_payment(store, payment)
    _recalculate_parent_access_from_clients(store, parent_user_id)
    _notify_parent_payment_status(store, payment=payment, status_value=status_value)
    _append_payment_journal(
        store,
        payment=payment,
        event_type="payment.invoice_created",
        source="admin",
        previous_status=None,
        new_status=status_value,
        actor_user_id=current_user.get("id"),
        actor_role=current_user.get("role"),
        metadata={"comment": payload.comment, "dueDate": due_date_iso, "startsAt": starts_at_iso},
    )
    _write_store(store)
    return {"ok": True, "payment": _serialize_admin_payment(store, payment)}


@app.post("/api/admin/payments/{payment_id}/send-reminder")
def admin_send_payment_reminder(
    payment_id: str,
    payload: PaymentReminderPayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    payment = _find_payment_by_id(store, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    _ensure_legacy_payment_shape(store, payment)
    _refresh_payment_overdue_status(payment)
    status_value = str(payment.get("status") or "pending")
    if status_value in {"paid", "refunded", "cancelled", "expired"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Нельзя отправить напоминание по закрытому счету")

    reminder_result = _send_payment_reminder(
        store,
        payment=payment,
        actor_user_id=str(current_user.get("id") or ""),
        actor_role=current_user.get("role"),
        source="admin",
        custom_message=payload.message,
    )
    _write_store(store)
    return {
        "ok": True,
        "payment": _serialize_admin_payment(store, payment),
        "notification": reminder_result.get("notification"),
    }


def run_due_payment_reminders(
    store: dict[str, Any],
    *,
    actor_user_id: str = "",
    actor_role: str | None = None,
) -> tuple[list[dict[str, Any]], bool]:
    """Refresh overdue statuses and send every reminder that has come due.

    Returns the processed payments and whether the store needs writing back.
    Shared by the admin endpoint and the scheduled runner.
    """
    now_dt = datetime.now(timezone.utc)
    processed: list[dict[str, Any]] = []
    changed = False
    for payment in store.get("paymentRecords", []):
        if _ensure_legacy_payment_shape(store, payment):
            changed = True
        if _refresh_payment_overdue_status(payment):
            changed = True
        if not _is_outstanding_status(str(payment.get("status") or "pending")):
            continue
        next_reminder_at = _parse_datetime_safe(payment.get("nextReminderAt"))
        if next_reminder_at and next_reminder_at > now_dt:
            continue
        _send_payment_reminder(
            store,
            payment=payment,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            source="automation",
            custom_message=None,
        )
        processed.append(_serialize_admin_payment(store, payment))
        changed = True
    return processed, changed


@app.post("/api/admin/payments/reminders/run")
def admin_run_payment_reminders(
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    processed, changed = run_due_payment_reminders(
        store,
        actor_user_id=str(current_user.get("id") or ""),
        actor_role=current_user.get("role"),
    )
    if changed:
        _write_store(store)
    return {"ok": True, "processed": len(processed), "payments": processed}


@app.patch("/api/admin/payments/{payment_id}/status")
def admin_update_payment_status(
    payment_id: str,
    payload: PaymentStatusUpdatePayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    payment = _find_payment_by_id(store, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    _ensure_legacy_payment_shape(store, payment)
    _refresh_payment_overdue_status(payment)
    previous_status = str(payment.get("status") or "pending")
    next_status = payload.status
    if str(payment.get("paymentMethod")) == "online" and next_status == "unpaid":
        next_status = "pending"

    if previous_status == "paid" and next_status not in {"paid", "refunded", "cancelled"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Оплаченный счет можно перевести только в refunded или cancelled",
        )
    if previous_status == next_status:
        return {"ok": True, "payment": _serialize_admin_payment(store, payment), "idempotent": True}

    now = _utc_now_iso()
    payment["status"] = next_status
    payment["statusUpdatedAt"] = now
    payment["updatedAt"] = now
    if payload.comment and payload.comment.strip():
        payment["invoiceComment"] = payload.comment.strip()

    if next_status == "paid":
        payment["paidAt"] = now
        payment["nextReminderAt"] = None
        payment["confirmedByUserId"] = str(current_user.get("id") or "")
        _ensure_active_subscription_for_payment(store, payment)
    elif next_status in {"refunded", "cancelled"}:
        payment["nextReminderAt"] = None
        payment["paidAt"] = None
    elif _is_outstanding_status(next_status):
        due_date = str(payment.get("dueDate") or _default_due_date_iso())
        payment["nextReminderAt"] = _next_reminder_iso(due_date)
        payment["paidAt"] = None

    _sync_parent_payment_status_from_admin_record(store, payment, status_value=next_status, updated_at=now)
    _sync_client_status_by_payment(store, payment)
    _recalculate_parent_access_from_clients(store, str(payment.get("parentUserId") or ""))
    _notify_parent_payment_status(store, payment=payment, status_value=next_status)
    _append_payment_journal(
        store,
        payment=payment,
        event_type="payment.status_changed",
        source="admin",
        previous_status=previous_status,
        new_status=next_status,
        actor_user_id=str(current_user.get("id") or ""),
        actor_role=current_user.get("role"),
        metadata={"comment": payload.comment},
    )
    _write_store(store)
    return {"ok": True, "payment": _serialize_admin_payment(store, payment)}


@app.post("/api/admin/payments/{payment_id}/change-due-date")
def admin_change_payment_due_date(
    payment_id: str,
    payload: PaymentDueDatePayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    payment = _find_payment_by_id(store, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    _ensure_legacy_payment_shape(store, payment)
    _refresh_payment_overdue_status(payment)
    previous_due_date = str(payment.get("dueDate") or "")
    next_due_date = _normalize_iso_date(payload.due_date)
    if previous_due_date == next_due_date:
        return {"ok": True, "payment": _serialize_admin_payment(store, payment), "idempotent": True}

    previous_status = str(payment.get("status") or "pending")
    now = _utc_now_iso()
    payment["dueDate"] = next_due_date
    payment["updatedAt"] = now

    if _is_outstanding_status(previous_status):
        payment["nextReminderAt"] = _next_reminder_iso(next_due_date)
        due_dt = _parse_datetime_safe(next_due_date)
        now_dt = datetime.now(timezone.utc)
        if due_dt and due_dt >= now_dt and previous_status == "overdue":
            payment["status"] = "unpaid" if str(payment.get("paymentMethod") or "") == "cash" else "pending"
            payment["statusUpdatedAt"] = now

    if payload.comment and payload.comment.strip():
        payment["invoiceComment"] = payload.comment.strip()

    _sync_client_status_by_payment(store, payment)
    _recalculate_parent_access_from_clients(store, str(payment.get("parentUserId") or ""))
    _append_payment_journal(
        store,
        payment=payment,
        event_type="payment.due_date_changed",
        source="admin",
        previous_status=previous_status,
        new_status=str(payment.get("status") or previous_status),
        actor_user_id=str(current_user.get("id") or ""),
        actor_role=current_user.get("role"),
        metadata={"previousDueDate": previous_due_date, "dueDate": next_due_date, "comment": payload.comment},
    )
    _write_store(store)
    return {"ok": True, "payment": _serialize_admin_payment(store, payment)}


@app.post("/api/admin/payments/{payment_id}/confirm-cash")
def admin_confirm_cash_payment(
    payment_id: str,
    payload: CashPaymentConfirmPayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    payment = _find_payment_by_id(store, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    _ensure_legacy_payment_shape(store, payment)
    _refresh_payment_overdue_status(payment)

    if payment.get("paymentMethod") != "cash":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only cash payment can be confirmed manually")

    previous_status = payment.get("status")
    if previous_status == "paid":
        return {"ok": True, "payment": payment, "idempotent": True}

    now = _utc_now_iso()
    payment["status"] = "paid"
    payment["paidAt"] = now
    payment["updatedAt"] = now
    payment["statusUpdatedAt"] = now
    payment["nextReminderAt"] = None
    payment["confirmedByUserId"] = current_user["id"]
    if payload.paid_amount is not None:
        payment["amount"] = payload.paid_amount
    _ensure_active_subscription_for_payment(store, payment)

    _sync_client_status_by_payment(store, payment)
    parent_user = _recalculate_parent_access_from_clients(store, str(payment.get("parentUserId") or ""))

    _append_payment_journal(
        store,
        payment=payment,
        event_type="payment.confirmed_cash",
        source="admin",
        previous_status=previous_status,
        new_status="paid",
        actor_user_id=current_user["id"],
        actor_role=current_user["role"],
        metadata={
            "comment": payload.comment,
            "paidAmount": payload.paid_amount,
        },
    )
    _notify_parent_payment_status(store, payment=payment, status_value="paid")

    _write_store(store)
    return {"ok": True, "payment": _serialize_admin_payment(store, payment), "parentAccess": parent_user}


@app.post("/api/admin/payments/{payment_id}/change-method")
def admin_change_payment_method(
    payment_id: str,
    payload: PaymentMethodChangePayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    payment = _find_payment_by_id(store, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    _ensure_legacy_payment_shape(store, payment)
    _refresh_payment_overdue_status(payment)

    previous_method = str(payment.get("paymentMethod") or "online")
    previous_status = str(payment.get("status") or "pending")
    if previous_status in {"paid", "cancelled", "refunded", "expired"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Способ оплаты можно менять только у активного счета",
        )

    next_method = payload.payment_method
    next_status = "unpaid" if next_method == "cash" else "pending"
    now = _utc_now_iso()

    if previous_method == next_method and not (next_method == "cash" and payload.confirm_cash_immediately):
        return {"ok": True, "payment": _serialize_admin_payment(store, payment), "idempotent": True}

    payment["paymentMethod"] = next_method
    payment["updatedAt"] = now
    payment["statusUpdatedAt"] = now
    if payload.comment and payload.comment.strip():
        payment["invoiceComment"] = payload.comment.strip()

    if next_method == "cash" and payload.confirm_cash_immediately:
        payment["status"] = "paid"
        payment["paidAt"] = now
        payment["nextReminderAt"] = None
        payment["confirmedByUserId"] = current_user["id"]
        if payload.paid_amount is not None:
            payment["amount"] = payload.paid_amount
        _ensure_active_subscription_for_payment(store, payment)
    else:
        payment["status"] = next_status
        payment["paidAt"] = None
        due_date = str(payment.get("dueDate") or _default_due_date_iso())
        payment["nextReminderAt"] = _next_reminder_iso(due_date)

    _sync_client_status_by_payment(store, payment)
    parent_user = _recalculate_parent_access_from_clients(store, str(payment.get("parentUserId") or ""))

    _append_payment_journal(
        store,
        payment=payment,
        event_type="payment.method_changed",
        source="admin",
        previous_status=previous_status,
        new_status=str(payment.get("status") or previous_status),
        actor_user_id=current_user["id"],
        actor_role=current_user["role"],
        metadata={
            "previousMethod": previous_method,
            "paymentMethod": next_method,
            "confirmCashImmediately": payload.confirm_cash_immediately,
            "comment": payload.comment,
        },
    )

    if next_method == "cash" and payload.confirm_cash_immediately:
        _append_payment_journal(
            store,
            payment=payment,
            event_type="payment.confirmed_cash",
            source="admin",
            previous_status=previous_status,
            new_status="paid",
            actor_user_id=current_user["id"],
            actor_role=current_user["role"],
            metadata={
                "comment": payload.comment,
                "paidAmount": payload.paid_amount,
                "convertedFromMethod": previous_method,
            },
        )
        _notify_parent_payment_status(store, payment=payment, status_value="paid")
    else:
        _notify_parent_payment_status(store, payment=payment, status_value=str(payment.get("status") or next_status))

    _write_store(store)
    return {"ok": True, "payment": _serialize_admin_payment(store, payment), "parentAccess": parent_user}


def _apply_provider_webhook_payload(store: dict[str, Any], payload: ProviderWebhookPayload) -> dict[str, Any]:
    payment = _find_payment_by_id(store, payload.payment_id)
    if payment is None:
        current_parent_payment = payment_service.find_payment_by_id(store, payload.payment_id)
        previous_status = str(current_parent_payment.get("status") or "pending") if current_parent_payment else None
        try:
            if payload.status == "paid":
                result = payment_service.confirm_provider_paid(
                    store=store,
                    payment_id=payload.payment_id,
                    provider_payment_id=payload.provider_payment_id,
                )
            else:
                result = payment_service.confirm_provider_failed(
                    store=store,
                    payment_id=payload.payment_id,
                    provider_payment_id=payload.provider_payment_id,
                )
        except LookupError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
        except ValueError as error:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error))

        journal_payment = _journal_payment_view_from_parent_payment(store, result["payment"])
        if not result.get("idempotent"):
            event_type = "payment.confirmed_online" if payload.status == "paid" else "payment.failed_online"
            next_status = "paid" if payload.status == "paid" else "failed"
            _append_payment_journal(
                store,
                payment=journal_payment,
                event_type=event_type,
                source="provider_webhook",
                previous_status=previous_status,
                new_status=next_status,
                metadata={"providerPaymentId": payload.provider_payment_id, "rawPayload": payload.raw_payload},
            )
            _notify_parent_payment_status(store, payment=journal_payment, status_value=next_status)

        if payload.status == "paid":
            parent_user = result.get("parent_user")
            if not isinstance(parent_user, dict):
                parent_user = _find_user_by_id(store, str(result.get("payment", {}).get("parent_id") or ""))
            if isinstance(parent_user, dict) and _current_portal_status(parent_user) != "activated":
                _set_parent_portal_status(store, parent_user, "paid_online_waiting_activation")
                _create_activation_token(
                    store,
                    parent_user_id=str(parent_user.get("id") or ""),
                    payment_id=str(payload.payment_id),
                    purpose="after_online_payment",
                    source_flow="online_payment",
                )

        _write_store(store)
        response: dict[str, Any] = {"ok": True, "payment": result["payment"]}
        if result.get("subscription") is not None:
            response["subscription"] = result["subscription"]
        if result.get("parent_user") is not None:
            response["parentAccess"] = result["parent_user"]
        if result.get("idempotent"):
            response["idempotent"] = True
        return response
    _ensure_legacy_payment_shape(store, payment)
    _refresh_payment_overdue_status(payment)

    previous_status = payment.get("status")
    now = _utc_now_iso()
    payment["updatedAt"] = now
    if payload.provider_payment_id:
        payment["providerPaymentId"] = payload.provider_payment_id

    if payload.status == "paid":
        payment["status"] = "paid"
        payment["paidAt"] = now
        payment["statusUpdatedAt"] = now
        payment["nextReminderAt"] = None
        _ensure_active_subscription_for_payment(store, payment)
        _sync_client_status_by_payment(store, payment)
        parent_user = _recalculate_parent_access_from_clients(store, str(payment.get("parentUserId") or ""))
        if isinstance(parent_user, dict) and _current_portal_status(parent_user) != "activated":
            _set_parent_portal_status(store, parent_user, "paid_online_waiting_activation")
            _create_activation_token(
                store,
                parent_user_id=str(parent_user.get("id") or ""),
                payment_id=str(payment.get("id") or ""),
                purpose="after_online_payment",
                source_flow="online_payment",
            )
        _append_payment_journal(
            store,
            payment=payment,
            event_type="payment.confirmed_online",
            source="provider_webhook",
            previous_status=previous_status,
            new_status="paid",
            metadata={"providerPaymentId": payload.provider_payment_id, "rawPayload": payload.raw_payload},
        )
        _notify_parent_payment_status(store, payment=payment, status_value="paid")
        _write_store(store)
        return {"ok": True, "payment": _serialize_admin_payment(store, payment), "parentAccess": parent_user}

    if previous_status == "paid":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Paid payment cannot be marked as failed")

    payment["status"] = "failed"
    payment["statusUpdatedAt"] = now
    payment["nextReminderAt"] = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    _sync_client_status_by_payment(store, payment)
    _recalculate_parent_access_from_clients(store, str(payment.get("parentUserId") or ""))
    _append_payment_journal(
        store,
        payment=payment,
        event_type="payment.failed_online",
        source="provider_webhook",
        previous_status=previous_status,
        new_status="failed",
        metadata={"providerPaymentId": payload.provider_payment_id, "rawPayload": payload.raw_payload},
    )
    _notify_parent_payment_status(store, payment=payment, status_value="failed")
    _write_store(store)
    return {"ok": True, "payment": _serialize_admin_payment(store, payment)}


@app.post("/api/payments/provider/webhook")
def payment_provider_webhook(payload: ProviderWebhookPayload, request: FastAPIRequest) -> dict[str, Any]:
    _verify_provider_webhook_auth(request)
    store = _read_store()
    return _apply_provider_webhook_payload(store, payload)


@app.post("/api/payments/provider/create")
def payment_provider_create(
    payload: ProviderCreatePaymentPayload,
    request: FastAPIRequest,
    current_user: dict[str, Any] = Depends(_require_auth),
) -> dict[str, Any]:
    store = _read_store()
    _authorize_payment_access(store, payment_id=payload.payment_id, current_user=current_user)
    result = _create_provider_payment_for_payment(
        store,
        payment_id=payload.payment_id,
        success_url=payload.success_url,
        fail_url=payload.fail_url,
        backend_base_url=_payment_public_base_url(request),
    )
    _write_store(store)
    return result


@app.get("/api/payments/provider/selfwork/form/{payment_id}", response_class=HTMLResponse)
def selfwork_payment_form(payment_id: str, token: str) -> HTMLResponse:
    store = _read_store()
    payment_context = _resolve_provider_payment_context(store, payment_id)
    if payment_context is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    expected_token = _get_provider_public_token(payment_context)
    if not expected_token or token != expected_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid payment token")

    html_payload = _render_selfwork_form_html(
        payment_id=payment_id,
        action_url=_selfwork_init_url(),
        fields=_build_selfwork_init_fields(store, payment_context),
    )
    return HTMLResponse(content=html_payload)


@app.post("/api/payments/provider/status-sync")
def payment_provider_status_sync(
    payload: ProviderStatusSyncPayload,
    current_user: dict[str, Any] = Depends(_require_auth),
) -> dict[str, Any]:
    provider_name = _selfwork_provider_name().strip().lower()
    if provider_name != "selfwork":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Status sync is configured only for Selfwork")
    store = _read_store()
    _authorize_payment_access(store, payment_id=payload.payment_id, current_user=current_user)
    result = _sync_selfwork_payment_status_internal(store, payload.payment_id)
    return result


@app.get("/api/payments/journal")
def payment_journal(current_user: dict[str, Any] = Depends(_require_admin_or_owner)) -> list[dict[str, Any]]:
    del current_user
    store = _read_store()
    return list(store["paymentJournal"])


@app.get("/api/parent/access")
def parent_access(current_user: dict[str, Any] = Depends(_require_parent)) -> dict[str, Any]:
    store = _read_store()
    parent_id = current_user["id"]
    parent_payments = [item for item in store["paymentRecords"] if item.get("parentUserId") == parent_id]
    pending = [item for item in parent_payments if item.get("status") in {"unpaid", "pending", "failed", "overdue"}]
    new_pending = [
        item
        for item in store.get("payments", [])
        if item.get("parent_id") == parent_id and item.get("status") in {"pending", "waiting_confirmation", "failed"}
    ]
    merged_pending = [*new_pending, *pending]

    portal_status = _current_portal_status(current_user)
    pin_auth = _find_pin_auth_by_parent_id(store, parent_id)
    can_use_dashboard = (
        current_user.get("access_level") == "full"
        and current_user.get("account_status") == "active"
        and portal_status == "activated"
    )

    return {
        "parentUserId": parent_id,
        "accessLevel": current_user.get("access_level"),
        "accountStatus": current_user.get("account_status"),
        "portalStatus": portal_status,
        "portalActivatedAt": current_user.get("portal_activated_at"),
        "portalBlockedAt": current_user.get("portal_blocked_at"),
        "lastLoginAt": current_user.get("last_login_at"),
        "pinStatus": (
            "not_set"
            if pin_auth is None or not pin_auth.get("pinHash")
            else "disabled"
            if bool(pin_auth.get("isDisabled"))
            else "locked"
            if (_parse_datetime_safe(pin_auth.get("lockedUntil")) or datetime.fromtimestamp(0, tz=timezone.utc)) > datetime.now(timezone.utc)
            else "set"
        ),
        "canUseDashboard": can_use_dashboard,
        "pendingPaymentsCount": len(merged_pending),
        "pendingPayments": merged_pending,
    }


@app.get("/api/parent/payments")
def parent_payments(current_user: dict[str, Any] = Depends(_require_parent)) -> list[dict[str, Any]]:
    store = _read_store()
    return payment_service.parent_payments(store=store, parent_user=current_user)


@app.get("/api/parent/children")
def parent_children(current_user: dict[str, Any] = Depends(_require_parent)) -> list[dict[str, Any]]:
    store = _read_store()
    parent_id = current_user["id"]
    children = [item for item in store["children"] if item.get("parentUserId") == parent_id]
    return [_serialize_parent_child(store, child) for child in children]


@app.get("/api/parent/events")
def parent_events(current_user: dict[str, Any] = Depends(_require_parent)) -> list[dict[str, Any]]:
    store = _read_store()
    parent_id = str(current_user.get("id"))
    children = [item for item in store.get("children", []) if str(item.get("parentUserId")) == parent_id]
    child_ids = {str(item.get("id")) for item in children}
    group_ids = {str(item.get("groupId")) for item in children if item.get("groupId")}

    raw_events = []
    for event in store.get("events", []):
        event_group_id = str(event.get("groupId") or event.get("group_id") or "")
        event_child_id = str(event.get("childId") or event.get("child_id") or "")
        if event_group_id in group_ids or event_child_id in child_ids:
            serialized = _serialize_parent_event(store, event)
            if serialized is not None:
                raw_events.append(serialized)

    if raw_events:
        raw_events.sort(key=lambda item: _parse_datetime_safe(item.get("date")) or datetime.fromtimestamp(0, tz=timezone.utc))
        return raw_events

    return _build_parent_group_schedule_events(store, parent_id)


@app.get("/api/parent/communications/employees")
def parent_communications_employees(current_user: dict[str, Any] = Depends(_require_parent)) -> list[dict[str, Any]]:
    del current_user
    store = _read_store()
    return [_serialize_communication_employee(user) for user in _list_communication_employees(store)]


@app.get("/api/parent/communications/chats")
def parent_communications_chats(current_user: dict[str, Any] = Depends(_require_parent)) -> list[dict[str, Any]]:
    store = _read_store()
    parent_id = str(current_user.get("id"))
    chats = [item for item in store.get("communicationChats", []) if str(item.get("parentUserId")) == parent_id]
    chats.sort(key=lambda item: _parse_datetime_safe(item.get("updatedAt")) or datetime.fromtimestamp(0, tz=timezone.utc), reverse=True)
    return [_serialize_chat_summary(store, chat) for chat in chats]


@app.post("/api/parent/communications/chats")
def parent_create_communication_chat(
    payload: CreateCommunicationChatPayload,
    current_user: dict[str, Any] = Depends(_require_parent),
) -> dict[str, Any]:
    store = _read_store()
    parent_id = str(current_user.get("id"))
    employee_id = str(payload.employee_id)
    employee = _find_user_by_id(store, employee_id)
    if not employee or str(employee.get("role")) not in {"teacher", "admin", "owner"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сотрудник не найден")
    if str(employee.get("status", "active")) == "inactive":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Сотрудник неактивен")

    existing = next(
        (
            item
            for item in store.get("communicationChats", [])
            if str(item.get("parentUserId")) == parent_id and str(item.get("employeeUserId")) == employee_id
        ),
        None,
    )
    if existing:
        return _serialize_chat_summary(store, existing)

    now = _utc_now_iso()
    chat = {
        "id": _new_id("chat"),
        "parentUserId": parent_id,
        "employeeUserId": employee_id,
        "createdAt": now,
        "updatedAt": now,
        "lastMessageAt": None,
        "lastMessageText": None,
        "status": "open",
        "parentUnreadCount": 0,
        "employeeUnreadCount": 0,
    }
    store["communicationChats"].insert(0, chat)
    _write_store(store)
    return _serialize_chat_summary(store, chat)


@app.get("/api/parent/communications/chats/{chat_id}/messages")
def parent_communication_messages(
    chat_id: str,
    current_user: dict[str, Any] = Depends(_require_parent),
) -> list[dict[str, Any]]:
    store = _read_store()
    chat = _find_chat_by_id(store, chat_id)
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Чат не найден")
    parent_id = str(current_user.get("id"))
    if str(chat.get("parentUserId")) != parent_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нельзя открыть чужой чат")

    chat["parentUnreadCount"] = 0
    chat["updatedAt"] = _utc_now_iso()
    rows = [_serialize_chat_message(store, item) for item in _chat_messages(store, chat_id)]
    _write_store(store)
    return rows


@app.post("/api/parent/communications/chats/{chat_id}/messages")
def parent_communication_send_message(
    chat_id: str,
    payload: CreateCommunicationMessagePayload,
    current_user: dict[str, Any] = Depends(_require_parent),
) -> dict[str, Any]:
    store = _read_store()
    chat = _find_chat_by_id(store, chat_id)
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Чат не найден")
    parent_id = str(current_user.get("id"))
    if str(chat.get("parentUserId")) != parent_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нельзя отправить сообщение в чужой чат")

    message = _create_chat_message(store, chat=chat, sender_user=current_user, text=payload.text)
    _write_store(store)
    return _serialize_chat_message(store, message)


@app.get("/api/push/vapid-public-key")
def push_vapid_public_key() -> dict[str, Any]:
    return {"publicKey": _vapid_public_key(), "configured": _push_notifications_configured()}


@app.post("/api/push/subscribe")
def push_subscribe(
    payload: PushSubscribePayload,
    current_user: dict[str, Any] = Depends(_require_auth),
) -> dict[str, Any]:
    store = _read_store()
    user_id = str(current_user.get("id"))
    subscriptions = store.setdefault("pushSubscriptions", [])
    existing = next((item for item in subscriptions if str(item.get("endpoint")) == payload.endpoint), None)
    now = _utc_now_iso()
    if existing:
        existing["userId"] = user_id
        existing["keys"] = {"p256dh": payload.keys.p256dh, "auth": payload.keys.auth}
        existing["userAgent"] = payload.userAgent
        existing["updatedAt"] = now
    else:
        subscriptions.append(
            {
                "id": _new_id("push"),
                "userId": user_id,
                "endpoint": payload.endpoint,
                "keys": {"p256dh": payload.keys.p256dh, "auth": payload.keys.auth},
                "userAgent": payload.userAgent,
                "createdAt": now,
                "updatedAt": now,
            }
        )
    _write_store(store)
    return {"ok": True}


@app.post("/api/push/unsubscribe")
def push_unsubscribe(
    payload: PushUnsubscribePayload,
    current_user: dict[str, Any] = Depends(_require_auth),
) -> dict[str, Any]:
    del current_user
    store = _read_store()
    removed = _remove_push_subscription(store, payload.endpoint)
    if removed:
        _write_store(store)
    return {"ok": True, "removed": removed}


@app.get("/api/notifications/my")
def notifications_my(current_user: dict[str, Any] = Depends(_require_parent)) -> list[dict[str, Any]]:
    store = _read_store()
    user_id = str(current_user.get("id"))
    return [item for item in store.get("notifications", []) if str(item.get("userId")) == user_id]


@app.post("/api/notifications/{notification_id}/mark-read")
def notifications_mark_read(
    notification_id: str,
    current_user: dict[str, Any] = Depends(_require_parent),
) -> dict[str, Any]:
    store = _read_store()
    user_id = str(current_user.get("id"))
    for item in store.get("notifications", []):
        if str(item.get("id")) != notification_id:
            continue
        if str(item.get("userId")) != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot update чужое уведомление")
        if not bool(item.get("read")):
            item["read"] = True
            item["readAt"] = _utc_now_iso()
            _write_store(store)
        return item
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")


@app.post("/api/notifications/mark-all-read")
def notifications_mark_all_read(current_user: dict[str, Any] = Depends(_require_parent)) -> dict[str, int]:
    store = _read_store()
    user_id = str(current_user.get("id"))
    changed = 0
    for item in store.get("notifications", []):
        if str(item.get("userId")) != user_id:
            continue
        if bool(item.get("read")):
            continue
        item["read"] = True
        item["readAt"] = _utc_now_iso()
        changed += 1
    if changed:
        _write_store(store)
    return {"updated": changed}


@app.get("/api/owner/notifications")
def owner_notifications_journal(
    type_filter: str | None = None,
    status_filter: Literal["all", "read", "unread"] = "all",
    user_id: str | None = None,
    created_from: str | None = None,
    created_to: str | None = None,
    limit: int = 200,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> list[dict[str, Any]]:
    del current_user
    store = _read_store()
    users_by_id = {str(user.get("id")): user for user in store.get("users", [])}
    notifications = list(store.get("notifications", []))
    created_from_dt = _parse_datetime_query(created_from, field_name="created_from")
    created_to_dt = _parse_datetime_query(created_to, field_name="created_to")
    if created_from_dt and created_to_dt and created_from_dt > created_to_dt:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="created_from must be <= created_to")

    if type_filter:
        notifications = [item for item in notifications if str(item.get("type")) == type_filter]
    if status_filter == "read":
        notifications = [item for item in notifications if bool(item.get("read"))]
    elif status_filter == "unread":
        notifications = [item for item in notifications if not bool(item.get("read"))]
    if user_id:
        notifications = [item for item in notifications if str(item.get("userId")) == user_id]
    if created_from_dt:
        filtered: list[dict[str, Any]] = []
        for item in notifications:
            created_at = _parse_datetime_safe(item.get("createdAt"))
            if created_at is not None and created_at >= created_from_dt:
                filtered.append(item)
        notifications = filtered
    if created_to_dt:
        filtered = []
        for item in notifications:
            created_at = _parse_datetime_safe(item.get("createdAt"))
            if created_at is not None and created_at <= created_to_dt:
                filtered.append(item)
        notifications = filtered

    normalized_limit = max(1, min(1000, int(limit)))
    result: list[dict[str, Any]] = []
    for item in notifications[:normalized_limit]:
        parent = users_by_id.get(str(item.get("userId")))
        result.append(
            {
                **item,
                "parentName": parent.get("name") if parent else None,
                "parentPhone": parent.get("phone") if parent else None,
            }
        )
    return result


@app.get("/api/owner/security-audit")
def owner_security_audit(
    limit: int = 200,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> list[dict[str, Any]]:
    del current_user
    store = _read_store()
    rows = list(store.get("securityAuditLog", []))
    return rows[: max(1, min(1000, int(limit)))]


@app.get("/api/owner/communications/chats")
def owner_communications_chats(
    status_filter: Literal["all", "unread", "waiting_reply"] = "all",
    employee_id: str | None = None,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> list[dict[str, Any]]:
    del current_user
    store = _read_store()
    chats = list(store.get("communicationChats", []))
    if employee_id:
        chats = [item for item in chats if str(item.get("employeeUserId")) == employee_id]
    if status_filter == "unread":
        chats = [item for item in chats if int(item.get("employeeUnreadCount") or 0) > 0]
    elif status_filter == "waiting_reply":
        chats = [item for item in chats if int(item.get("parentUnreadCount") or 0) > 0]

    chats.sort(key=lambda item: _parse_datetime_safe(item.get("updatedAt")) or datetime.fromtimestamp(0, tz=timezone.utc), reverse=True)
    return [_serialize_chat_summary(store, chat) for chat in chats]


@app.get("/api/owner/communications/chats/{chat_id}/messages")
def owner_communication_messages(
    chat_id: str,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> list[dict[str, Any]]:
    store = _read_store()
    chat = _find_chat_by_id(store, chat_id)
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Чат не найден")

    current_user_id = str(current_user.get("id"))
    if current_user_id == str(chat.get("employeeUserId")) or str(current_user.get("role")) == "owner":
        chat["employeeUnreadCount"] = 0
        chat["updatedAt"] = _utc_now_iso()

    rows = [_serialize_chat_message(store, item) for item in _chat_messages(store, chat_id)]
    _write_store(store)
    return rows


@app.post("/api/owner/communications/chats/{chat_id}/messages")
def owner_communication_send_message(
    chat_id: str,
    payload: CreateCommunicationMessagePayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    chat = _find_chat_by_id(store, chat_id)
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Чат не найден")

    message = _create_chat_message(store, chat=chat, sender_user=current_user, text=payload.text)
    _write_store(store)
    return _serialize_chat_message(store, message)


@app.get("/api/owner/groups")
def owner_list_groups(current_user: dict[str, Any] = Depends(_require_admin_or_owner)) -> list[dict[str, Any]]:
    del current_user
    store = _read_store()
    return list(store.get("ownerGroups", []))


@app.post("/api/owner/groups")
def owner_create_group(
    payload: OwnerGroupPayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    now = _utc_now_iso()
    normalized = _resolve_owner_group_payload(payload)
    group = {
        "id": _new_id("group"),
        **normalized,
        "studentCount": 0,
        "createdByUserId": current_user.get("id"),
        "createdAt": now,
        "updatedAt": now,
    }
    store["ownerGroups"].insert(0, group)
    _write_store(store)
    return group


@app.patch("/api/owner/groups/{group_id}")
def owner_update_group(
    group_id: str,
    payload: OwnerGroupPayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    del current_user
    store = _read_store()
    normalized = _resolve_owner_group_payload(payload)
    for group in store.get("ownerGroups", []):
        if str(group.get("id")) != group_id:
            continue
        group.update(normalized)
        group["updatedAt"] = _utc_now_iso()
        _write_store(store)
        return group
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")


@app.delete("/api/owner/groups/{group_id}")
def owner_delete_group(
    group_id: str,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, bool]:
    del current_user
    store = _read_store()
    groups = store.get("ownerGroups", [])
    before = len(groups)
    store["ownerGroups"] = [item for item in groups if str(item.get("id")) != group_id]
    if len(store["ownerGroups"]) == before:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    for child in store.get("children", []):
        if str(child.get("groupId") or "") == group_id:
            child["groupId"] = None
            child["updatedAt"] = _utc_now_iso()
    _recalculate_group_student_counts(store)
    _write_store(store)
    return {"ok": True}


@app.get("/api/owner/employees")
def owner_list_employees(current_user: dict[str, Any] = Depends(_require_admin_or_owner)) -> list[dict[str, Any]]:
    del current_user
    store = _read_store()
    employees = [user for user in store["users"] if user.get("role") in {"teacher", "admin"}]
    employees.sort(key=lambda item: str(item.get("name", "")))
    return [_serialize_owner_employee(user) for user in employees]


@app.post("/api/owner/employees")
def owner_create_employee(
    payload: OwnerEmployeePayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    del current_user
    store = _read_store()
    normalized_phone = _normalize_phone(payload.phone)
    existed = _find_user_by_phone(store, normalized_phone)
    if existed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Пользователь с таким телефоном уже существует")

    now = _utc_now_iso()
    user = {
        "id": _new_id(f"user-{payload.role}"),
        "name": payload.name.strip(),
        "phone": normalized_phone,
        "role": payload.role,
        "email": (payload.email or "").strip(),
        "status": payload.status,
        "birth_date": payload.birth_date,
        "experience": payload.experience,
        "location": payload.location,
        "permissions": payload.permissions,
        "access_level": "full",
        "account_status": "active",
        "updated_at": now,
    }
    store["users"].append(user)
    _write_store(store)
    return _serialize_owner_employee(user)


@app.patch("/api/owner/employees/{employee_id}")
def owner_update_employee(
    employee_id: str,
    payload: OwnerEmployeePayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    del current_user
    store = _read_store()
    employee = _find_user_by_id(store, employee_id)
    if not employee or employee.get("role") not in {"teacher", "admin"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    normalized_phone = _normalize_phone(payload.phone)
    other = _find_user_by_phone(store, normalized_phone)
    if other and str(other.get("id")) != employee_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Телефон уже используется другим сотрудником")

    employee["name"] = payload.name.strip()
    employee["role"] = payload.role
    employee["phone"] = normalized_phone
    employee["email"] = (payload.email or "").strip()
    employee["status"] = payload.status
    employee["birth_date"] = payload.birth_date
    employee["experience"] = payload.experience
    employee["location"] = payload.location
    employee["permissions"] = payload.permissions
    employee["updated_at"] = _utc_now_iso()
    _write_store(store)
    return _serialize_owner_employee(employee)


@app.delete("/api/owner/employees/{employee_id}")
def owner_delete_employee(
    employee_id: str,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, bool]:
    del current_user
    store = _read_store()
    employees = [user for user in store["users"] if user.get("role") in {"teacher", "admin"}]
    if not any(str(item.get("id")) == employee_id for item in employees):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    store["users"] = [user for user in store["users"] if str(user.get("id")) != employee_id]
    _write_store(store)
    return {"ok": True}


@app.get("/api/owner/expenses")
def owner_list_expenses(current_user: dict[str, Any] = Depends(_require_admin_or_owner)) -> list[dict[str, Any]]:
    del current_user
    store = _read_store()
    return list(store.get("ownerExpenses", []))


@app.post("/api/owner/expenses")
def owner_create_expense(
    payload: OwnerExpensePayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    now = _utc_now_iso()
    expense = {
        "id": _new_id("expense"),
        "category": payload.category.strip(),
        "amount": float(payload.amount),
        "date": _normalize_iso_date(payload.date),
        "description": payload.description.strip(),
        "paymentMethod": payload.payment_method,
        "recipientName": payload.recipient_name,
        "notes": payload.notes,
        "createdBy": current_user.get("id"),
        "createdAt": now,
        "updatedAt": now,
    }
    store["ownerExpenses"].insert(0, expense)
    _write_store(store)
    return expense


@app.patch("/api/owner/expenses/{expense_id}")
def owner_update_expense(
    expense_id: str,
    payload: OwnerExpensePayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    del current_user
    store = _read_store()
    for expense in store.get("ownerExpenses", []):
        if str(expense.get("id")) != expense_id:
            continue
        expense["category"] = payload.category.strip()
        expense["amount"] = float(payload.amount)
        expense["date"] = _normalize_iso_date(payload.date)
        expense["description"] = payload.description.strip()
        expense["paymentMethod"] = payload.payment_method
        expense["recipientName"] = payload.recipient_name
        expense["notes"] = payload.notes
        expense["updatedAt"] = _utc_now_iso()
        _write_store(store)
        return expense
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")


@app.delete("/api/owner/expenses/{expense_id}")
def owner_delete_expense(
    expense_id: str,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, bool]:
    del current_user
    store = _read_store()
    expenses = store.get("ownerExpenses", [])
    before = len(expenses)
    store["ownerExpenses"] = [item for item in expenses if str(item.get("id")) != expense_id]
    if len(store["ownerExpenses"]) == before:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    _write_store(store)
    return {"ok": True}


@app.get("/api/owner/finance/summary")
def owner_finance_summary(current_user: dict[str, Any] = Depends(_require_admin_or_owner)) -> dict[str, Any]:
    del current_user
    store = _read_store()
    now = datetime.now(timezone.utc)

    month_keys: list[str] = []
    month_labels: dict[str, str] = {}
    ru_months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
    for shift in range(5, -1, -1):
        year = now.year
        month = now.month - shift
        while month <= 0:
            month += 12
            year -= 1
        key = f"{year:04d}-{month:02d}"
        month_keys.append(key)
        month_labels[key] = f"{ru_months[month - 1]} {str(year)[2:]}"

    income_by_month = {key: 0.0 for key in month_keys}
    expense_by_month = {key: 0.0 for key in month_keys}

    total_income = 0.0
    for payment in store.get("paymentRecords", []):
        if payment.get("status") != "paid":
            continue
        amount = float(payment.get("amount") or 0)
        total_income += amount
        date_text = str(payment.get("paidAt") or payment.get("updatedAt") or payment.get("createdAt") or "")
        key = date_text[:7]
        if key in income_by_month:
            income_by_month[key] += amount

    total_expenses = 0.0
    for expense in store.get("ownerExpenses", []):
        amount = float(expense.get("amount") or 0)
        total_expenses += amount
        key = str(expense.get("date") or "")[:7]
        if key in expense_by_month:
            expense_by_month[key] += amount

    monthly_data = [
        {
            "month": month_labels[key],
            "income": round(income_by_month[key], 2),
            "expenses": round(expense_by_month[key], 2),
        }
        for key in month_keys
    ]

    prev_income = income_by_month[month_keys[-2]] if len(month_keys) > 1 else 0.0
    current_income = income_by_month[month_keys[-1]] if month_keys else 0.0
    if prev_income > 0:
        revenue_growth = round(((current_income - prev_income) / prev_income) * 100, 2)
    else:
        revenue_growth = 0.0

    total_students = len(store.get("children", []))
    pending_clients = len([c for c in store.get("clients", []) if c.get("paymentStatus") in {"unpaid", "pending", "failed", "overdue"}])
    churn_rate = round((pending_clients / total_students) * 100, 2) if total_students > 0 else 0.0
    active_clients = len([c for c in store.get("clients", []) if c.get("paymentStatus") == "paid"])
    trial_conversion = round((active_clients / total_students) * 100, 2) if total_students > 0 else 0.0

    return {
        "stats": {
            "totalIncome": round(total_income, 2),
            "totalExpenses": round(total_expenses, 2),
            "netProfit": round(total_income - total_expenses, 2),
            "revenueGrowth": revenue_growth,
            "churnRate": churn_rate,
            "trialConversion": trial_conversion,
        },
        "monthlyData": monthly_data,
    }


@app.get("/api/owner/settings")
def owner_get_settings(current_user: dict[str, Any] = Depends(_require_admin_or_owner)) -> dict[str, Any]:
    del current_user
    store = _read_store()
    settings_data = store.get("ownerSettings", _default_owner_settings())
    return {
        "studio_name": str(settings_data.get("studioName") or ""),
        "support_phone": str(settings_data.get("supportPhone") or ""),
        "support_email": str(settings_data.get("supportEmail") or ""),
        "city": str(settings_data.get("city") or ""),
        "address": str(settings_data.get("address") or ""),
        "timezone": str(settings_data.get("timezone") or "Europe/Moscow"),
        "currency": str(settings_data.get("currency") or "RUB"),
        "parent_registration_enabled": bool(settings_data.get("parentRegistrationEnabled", True)),
        "updated_at": str(settings_data.get("updatedAt") or _utc_now_iso()),
    }


@app.put("/api/owner/settings")
def owner_update_settings(
    payload: OwnerSettingsPayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    normalized_phone = _normalize_phone(payload.support_phone)
    if not normalized_phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="support_phone is invalid")

    updated_at = _utc_now_iso()
    store["ownerSettings"] = {
        "studioName": payload.studio_name.strip(),
        "supportPhone": normalized_phone,
        "supportEmail": (payload.support_email or "").strip(),
        "city": (payload.city or "").strip(),
        "address": (payload.address or "").strip(),
        "timezone": payload.timezone.strip() or "Europe/Moscow",
        "currency": payload.currency.strip().upper() or "RUB",
        "parentRegistrationEnabled": bool(payload.parent_registration_enabled),
        "updatedAt": updated_at,
        "updatedByUserId": current_user.get("id"),
    }
    _write_store(store)
    return {
        "studio_name": store["ownerSettings"]["studioName"],
        "support_phone": store["ownerSettings"]["supportPhone"],
        "support_email": store["ownerSettings"]["supportEmail"],
        "city": store["ownerSettings"]["city"],
        "address": store["ownerSettings"]["address"],
        "timezone": store["ownerSettings"]["timezone"],
        "currency": store["ownerSettings"]["currency"],
        "parent_registration_enabled": store["ownerSettings"]["parentRegistrationEnabled"],
        "updated_at": updated_at,
    }


@app.get("/api/owner/landing-settings")
def owner_get_landing_settings(current_user: dict[str, Any] = Depends(_require_admin_or_owner)) -> dict[str, Any]:
    del current_user
    store = _read_store()
    settings_data = store.get("ownerLandingSettings", _default_owner_landing_settings())
    return {
        "hero_title": str(settings_data.get("heroTitle") or ""),
        "hero_subtitle": str(settings_data.get("heroSubtitle") or ""),
        "cta_label": str(settings_data.get("ctaLabel") or ""),
        "contact_phone": str(settings_data.get("contactPhone") or ""),
        "contact_email": str(settings_data.get("contactEmail") or ""),
        "address": str(settings_data.get("address") or ""),
        "map_url": str(settings_data.get("mapUrl") or ""),
        "published": bool(settings_data.get("published", True)),
        "updated_at": str(settings_data.get("updatedAt") or _utc_now_iso()),
    }


@app.put("/api/owner/landing-settings")
def owner_update_landing_settings(
    payload: OwnerLandingSettingsPayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    normalized_phone = _normalize_phone(payload.contact_phone)
    if not normalized_phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="contact_phone is invalid")

    updated_at = _utc_now_iso()
    store["ownerLandingSettings"] = {
        "heroTitle": payload.hero_title.strip(),
        "heroSubtitle": payload.hero_subtitle.strip(),
        "ctaLabel": payload.cta_label.strip(),
        "contactPhone": normalized_phone,
        "contactEmail": (payload.contact_email or "").strip(),
        "address": (payload.address or "").strip(),
        "mapUrl": (payload.map_url or "").strip(),
        "published": bool(payload.published),
        "updatedAt": updated_at,
        "updatedByUserId": current_user.get("id"),
    }
    _write_store(store)
    return {
        "hero_title": store["ownerLandingSettings"]["heroTitle"],
        "hero_subtitle": store["ownerLandingSettings"]["heroSubtitle"],
        "cta_label": store["ownerLandingSettings"]["ctaLabel"],
        "contact_phone": store["ownerLandingSettings"]["contactPhone"],
        "contact_email": store["ownerLandingSettings"]["contactEmail"],
        "address": store["ownerLandingSettings"]["address"],
        "map_url": store["ownerLandingSettings"]["mapUrl"],
        "published": store["ownerLandingSettings"]["published"],
        "updated_at": updated_at,
    }


@app.get("/api/owner/pricing")
def owner_get_pricing(current_user: dict[str, Any] = Depends(_require_admin_or_owner)) -> list[dict[str, Any]]:
    del current_user
    store = _read_store()
    plans = list(store.get("ownerPricingPlans", []))
    plans.sort(key=lambda item: (str(item.get("code") or ""), str(item.get("title") or "")))
    return [_serialize_owner_pricing_plan(plan) for plan in plans]


@app.post("/api/owner/pricing")
def owner_create_pricing_plan(
    payload: OwnerPricingPlanPayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    del current_user
    store = _read_store()
    title = payload.title.strip()
    if any(str(item.get("title") or "").strip().lower() == title.lower() for item in store.get("ownerPricingPlans", [])):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Тариф с таким названием уже существует")

    classes_count = payload.classes_count
    if not payload.classes_tracked:
        classes_count = None

    now = _utc_now_iso()
    plan = {
        "id": _new_id("owner-plan"),
        "code": _new_owner_pricing_code(store),
        "title": title,
        "price": float(payload.price),
        "classesCount": int(classes_count) if isinstance(classes_count, int) else None,
        "classesTracked": bool(payload.classes_tracked and classes_count is not None),
        "durationDays": int(payload.duration_days),
        "isActive": bool(payload.is_active),
        "updatedAt": now,
    }

    store.setdefault("ownerPricingPlans", []).append(plan)
    _sync_subscription_plans_from_owner_pricing(store)
    _sync_subscription_catalog_from_owner_pricing(store)
    _write_store(store)
    return _serialize_owner_pricing_plan(plan)


@app.patch("/api/owner/pricing/{plan_code}")
def owner_update_pricing_plan(
    plan_code: str,
    payload: OwnerPricingPlanPayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    del current_user
    store = _read_store()
    normalized_code = plan_code.strip().lower()

    plan = next(
        (item for item in store.get("ownerPricingPlans", []) if str(item.get("code") or "").strip().lower() == normalized_code),
        None,
    )
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pricing plan not found")

    classes_count = payload.classes_count
    if not payload.classes_tracked:
        classes_count = None

    plan["title"] = payload.title.strip()
    plan["price"] = float(payload.price)
    plan["classesCount"] = int(classes_count) if isinstance(classes_count, int) else None
    plan["classesTracked"] = bool(payload.classes_tracked and classes_count is not None)
    plan["durationDays"] = int(payload.duration_days)
    plan["isActive"] = bool(payload.is_active)
    plan["updatedAt"] = _utc_now_iso()

    _sync_subscription_plans_from_owner_pricing(store)
    _sync_subscription_catalog_from_owner_pricing(store)
    _write_store(store)
    return _serialize_owner_pricing_plan(plan)


@app.get("/api/owner/automations")
def owner_list_automations(current_user: dict[str, Any] = Depends(_require_admin_or_owner)) -> list[dict[str, Any]]:
    del current_user
    store = _read_store()
    return list(store.get("automationRules", []))


@app.post("/api/owner/automations")
def owner_create_automation(
    payload: OwnerAutomationPayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    now = _utc_now_iso()
    rule = {
        "id": _new_id("automation"),
        "name": payload.name.strip(),
        "triggerKey": payload.trigger_key.strip(),
        "actionType": payload.action_type.strip(),
        "actionParams": payload.action_params or {},
        "isActive": payload.is_active,
        "createdBy": current_user.get("id"),
        "createdAt": now,
        "updatedAt": now,
    }
    store["automationRules"].insert(0, rule)
    _write_store(store)
    return rule


@app.patch("/api/owner/automations/{rule_id}")
def owner_update_automation(
    rule_id: str,
    payload: OwnerAutomationPayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    del current_user
    store = _read_store()
    for rule in store.get("automationRules", []):
        if str(rule.get("id")) != rule_id:
            continue
        rule["name"] = payload.name.strip()
        rule["triggerKey"] = payload.trigger_key.strip()
        rule["actionType"] = payload.action_type.strip()
        rule["actionParams"] = payload.action_params or {}
        rule["isActive"] = payload.is_active
        rule["updatedAt"] = _utc_now_iso()
        _write_store(store)
        return rule
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation rule not found")


@app.delete("/api/owner/automations/{rule_id}")
def owner_delete_automation(
    rule_id: str,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, bool]:
    del current_user
    store = _read_store()
    rules = store.get("automationRules", [])
    before = len(rules)
    store["automationRules"] = [rule for rule in rules if str(rule.get("id")) != rule_id]
    if len(store["automationRules"]) == before:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation rule not found")
    _write_store(store)
    return {"ok": True}


@app.get("/api/tasks")
def list_tasks(_: dict[str, Any] = Depends(_require_admin_or_owner)) -> list[dict[str, Any]]:
    return _entity_list("tasks")


@app.post("/api/tasks")
def create_task(payload: dict[str, Any], _: dict[str, Any] = Depends(_require_admin_or_owner)) -> dict[str, Any]:
    return _create_entity("tasks", payload)


@app.patch("/api/tasks/{task_id}")
def update_task(task_id: str, payload: dict[str, Any], _: dict[str, Any] = Depends(_require_admin_or_owner)) -> dict[str, Any]:
    return _update_entity("tasks", task_id, payload)


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: str, _: dict[str, Any] = Depends(_require_admin_or_owner)) -> dict[str, bool]:
    _delete_entity("tasks", task_id)
    return {"ok": True}


@app.get("/api/news")
def list_news(current_user: dict[str, Any] = Depends(_require_auth)) -> list[dict[str, Any]]:
    store = _read_store()
    return _filter_news_for_user(store, current_user)


@app.post("/api/news")
def create_news(payload: dict[str, Any], _: dict[str, Any] = Depends(_require_admin_or_owner)) -> dict[str, Any]:
    created = _create_entity("news", payload)
    store = _read_store()
    target = next((item for item in store.get("news", []) if str(item.get("id")) == str(created.get("id"))), None)
    if target:
        _notify_parents_news(store, target, "created")
        _write_store(store)
    return created


@app.patch("/api/news/{news_id}")
def update_news(news_id: str, payload: dict[str, Any], _: dict[str, Any] = Depends(_require_admin_or_owner)) -> dict[str, Any]:
    updated = _update_entity("news", news_id, payload)
    store = _read_store()
    target = next((item for item in store.get("news", []) if str(item.get("id")) == str(updated.get("id"))), None)
    if target:
        _notify_parents_news(store, target, "updated")
        _write_store(store)
    return updated


@app.delete("/api/news/{news_id}")
def delete_news(news_id: str, _: dict[str, Any] = Depends(_require_admin_or_owner)) -> dict[str, bool]:
    _delete_entity("news", news_id)
    return {"ok": True}


@app.get("/api/documents")
def list_documents(current_user: dict[str, Any] = Depends(_require_auth)) -> list[dict[str, Any]]:
    store = _read_store()
    return _filter_documents_for_user(store, current_user)


@app.post("/api/documents")
def create_document(payload: DocumentCreatePayload, _: dict[str, Any] = Depends(_require_admin_or_owner)) -> dict[str, Any]:
    created = _create_entity("documents", payload.model_dump(exclude_none=True))
    store = _read_store()
    target = next((item for item in store.get("documents", []) if str(item.get("id")) == str(created.get("id"))), None)
    if target:
        _notify_parents_document(store, target, "created")
        _write_store(store)
    return created


@app.patch("/api/documents/{document_id}")
def update_document(
    document_id: str,
    payload: dict[str, Any],
    _: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    updated = _update_entity("documents", document_id, payload)
    store = _read_store()
    target = next((item for item in store.get("documents", []) if str(item.get("id")) == str(updated.get("id"))), None)
    if target:
        _notify_parents_document(store, target, "updated")
        _write_store(store)
    return updated


@app.delete("/api/documents/{document_id}")
def delete_document(document_id: str, _: dict[str, Any] = Depends(_require_admin_or_owner)) -> dict[str, bool]:
    _delete_entity("documents", document_id)
    return {"ok": True}
