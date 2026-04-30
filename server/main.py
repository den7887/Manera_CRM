from __future__ import annotations

import json
import os
import re
import secrets
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from payments import PaymentService


UserRole = Literal["parent", "teacher", "admin", "owner"]
AccessLevel = Literal["payment_only", "full"]
AccountStatus = Literal["invited", "payment_pending", "active", "suspended"]
PaymentMethod = Literal["cash", "online"]
PaymentStatus = Literal["unpaid", "pending", "paid", "failed", "refunded", "overdue", "cancelled"]

APP_ROOT = Path(__file__).resolve().parent
DATA_FILE = APP_ROOT / "data" / "store.json"
DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
LOCK = threading.Lock()

bearer_scheme = HTTPBearer(auto_error=True)
ACTIVE_TOKENS: dict[str, str] = {}
OTP_CODES: dict[str, str] = {}
NOTIFICORE_OTP_SESSIONS: dict[str, str] = {}

ROLE_BY_DEMO_CODE: dict[str, UserRole] = {
    "111111": "parent",
    "222222": "teacher",
    "333333": "admin",
    "444444": "owner",
}
OWNER_PHONE = "+79189423508"
DISABLED_SIGNIN_ROLES = {"teacher", "admin"}
SUBSCRIPTION_CATALOG: dict[str, dict[str, Any]] = {
    "Хобби": {"price": 5000.0, "classes_count": 8, "classes_tracked": True},
    "Про": {"price": 7000.0, "classes_count": None, "classes_tracked": False},
}
payment_service = PaymentService()


class OtpStartPayload(BaseModel):
    phone: str = Field(min_length=5, max_length=30)


class OtpVerifyPayload(BaseModel):
    phone: str = Field(min_length=5, max_length=30)
    code: str = Field(min_length=4, max_length=10)


class AuthResponse(BaseModel):
    access_token: str
    role: UserRole
    access_level: AccessLevel
    account_status: AccountStatus


class AdminCreateClientPayload(BaseModel):
    parent_full_name: str = Field(min_length=2, max_length=120)
    child_full_name: str = Field(min_length=2, max_length=120)
    child_birth_date: str = Field(min_length=8, max_length=20)
    parent_phone: str = Field(min_length=5, max_length=30)
    subscription_name: str = Field(min_length=2, max_length=120)
    subscription_amount: float = Field(gt=0)
    payment_method: PaymentMethod
    notes: str | None = Field(default=None, max_length=1000)


class CashPaymentConfirmPayload(BaseModel):
    comment: str | None = Field(default=None, max_length=1000)
    paid_amount: float | None = Field(default=None, gt=0)


class AdminCreateInvoicePayload(BaseModel):
    client_id: str = Field(min_length=2, max_length=120)
    amount: float | None = Field(default=None, gt=0)
    payment_method: PaymentMethod = "online"
    due_date: str | None = Field(default=None, max_length=30)
    comment: str | None = Field(default=None, max_length=1000)


class PaymentReminderPayload(BaseModel):
    message: str | None = Field(default=None, max_length=1000)


class PaymentStatusUpdatePayload(BaseModel):
    status: Literal["unpaid", "pending", "paid", "failed", "refunded", "cancelled", "overdue"]
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


class CreatePaymentPayload(BaseModel):
    subscription_plan_code: str = Field(min_length=2, max_length=40)
    child_id: str | None = Field(default=None, max_length=120)


class OwnerGroupPayload(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    age_range: str = Field(min_length=2, max_length=80)
    teacher_id: str | None = Field(default=None, max_length=120)
    teacher_name: str | None = Field(default=None, max_length=120)
    schedule: str = Field(default="", max_length=120)
    time: str = Field(default="", max_length=80)
    color: str = Field(default="#133C2A", max_length=20)
    max_capacity: int = Field(default=12, ge=1, le=200)


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


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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


def _sync_subscription_catalog_from_owner_pricing(store: dict[str, Any]) -> None:
    plans = store.get("ownerPricingPlans", [])
    if not isinstance(plans, list):
        return
    for plan in plans:
        code = str(plan.get("code") or "").strip().lower()
        title = str(plan.get("title") or "").strip()
        if code not in {"hobby", "pro"} or not title:
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
        if code not in {"hobby", "pro"}:
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
    now = _utc_now_iso()

    return {
        "users": [
            {
                "id": "user-parent-1",
                "name": "Анна Петрова",
                "phone": "+79991234567",
                "role": "parent",
                "access_level": "full",
                "account_status": "active",
                "updated_at": now,
            },
            {
                "id": "user-teacher-1",
                "name": "Елена Смирнова",
                "phone": "+79992345678",
                "role": "teacher",
                "access_level": "full",
                "account_status": "active",
                "updated_at": now,
            },
            {
                "id": "user-admin-1",
                "name": "Мария Иванова",
                "phone": "+79993456789",
                "role": "admin",
                "access_level": "full",
                "account_status": "active",
                "updated_at": now,
            },
            {
                "id": "user-owner-1",
                "name": "Дмитрий Волков",
                "phone": "+79994567890",
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
        "activeTokens": {},
        "subscriptionPlans": [],
        "payments": [],
        "subscriptions": [],
        "ownerGroups": [],
        "ownerExpenses": [],
        "automationRules": [],
        "communicationChats": [],
        "communicationMessages": [],
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


def _ensure_store_shape(store: dict[str, Any]) -> bool:
    changed = False
    list_keys = [
        "tasks",
        "news",
        "documents",
        "notifications",
        "children",
        "clients",
        "paymentRecords",
        "paymentJournal",
        "ownerGroups",
        "ownerExpenses",
        "automationRules",
        "communicationChats",
        "communicationMessages",
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
        if "updated_at" not in user:
            user["updated_at"] = _utc_now_iso()
            changed = True

    if payment_service.ensure_store_shape(store):
        changed = True
    if _sync_subscription_plans_from_owner_pricing(store):
        changed = True
    _sync_subscription_catalog_from_owner_pricing(store)

    for payment in store.get("paymentRecords", []):
        if _ensure_legacy_payment_shape(store, payment):
            changed = True

    return changed


def _read_store() -> dict[str, Any]:
    with LOCK:
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
    for token, token_data in tokens.items():
        if _is_token_expired(token_data):
            expired.append(token)
    for token in expired:
        tokens.pop(token, None)
        ACTIVE_TOKENS.pop(token, None)
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
    for client in store["clients"]:
        if str(client.get("id")) == client_id:
            return client
    return None


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


def _create_user(
    store: dict[str, Any],
    *,
    phone: str,
    role: UserRole,
    name: str | None = None,
    access_level: AccessLevel = "full",
    account_status: AccountStatus = "active",
) -> dict[str, Any]:
    new_user = {
        "id": _new_id(f"user-{role}"),
        "name": (name or phone).strip(),
        "phone": phone,
        "role": role,
        "access_level": access_level,
        "account_status": account_status,
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
        "forRoles": ["parent"],
        "metadata": metadata or {},
        "dedupKey": dedup_key,
    }
    notifications.insert(0, entry)
    return entry


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
        metadata={"paymentId": payment.get("id"), "status": status_value},
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

    if str(sender_user.get("id")) == str(chat.get("parentUserId")):
        chat["employeeUnreadCount"] = int(chat.get("employeeUnreadCount") or 0) + 1
    else:
        chat["parentUnreadCount"] = int(chat.get("parentUnreadCount") or 0) + 1
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


def _require_auth(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict[str, Any]:
    token = creds.credentials
    store = _read_store()
    token_data = store.get("activeTokens", {}).get(token)
    if token_data is None and token in ACTIVE_TOKENS:
        token_data = ACTIVE_TOKENS.get(token)
    if _is_token_expired(token_data):
        store.get("activeTokens", {}).pop(token, None)
        ACTIVE_TOKENS.pop(token, None)
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
    parent_clients = [item for item in store.get("clients", []) if str(item.get("parentUserId")) == parent_user_id]
    has_paid = any(str(item.get("paymentStatus")) == "paid" for item in parent_clients)
    if has_paid:
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
    payment = _find_latest_payment_for_client(store, str(client.get("id")))

    return {
        **client,
        "parentName": parent.get("name") if parent else None,
        "parentPhone": parent.get("phone") if parent else client.get("parentPhone"),
        "childFullName": child.get("fullName") if child else None,
        "childBirthDate": child.get("birthDate") if child else None,
        "payment": payment,
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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "manera-crm-mvp-backend"}


@app.post("/api/auth/otp/start")
def otp_start(payload: OtpStartPayload) -> dict[str, Any]:
    normalized_phone = _normalize_phone(payload.phone)
    store = _read_store()
    user = _find_user_by_phone(store, normalized_phone)

    if normalized_phone != OWNER_PHONE and (user is None or user.get("role") != "parent"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вход разрешен только родителю, добавленному владельцем, или владельцу.",
        )

    test_mode = os.getenv("TEST_MODE", "true").lower() == "true"
    notificore_enabled = _env_flag("NOTIFICORE_OTP_ENABLED", False)
    test_otp = os.getenv("TEST_OTP", "400001")
    code = test_otp if test_mode else f"{secrets.randbelow(900000) + 100000}"
    if test_mode:
        OTP_CODES[normalized_phone] = code
        NOTIFICORE_OTP_SESSIONS.pop(normalized_phone, None)
    else:
        if notificore_enabled:
            auth_id = _send_otp_notificore(normalized_phone)
            NOTIFICORE_OTP_SESSIONS[normalized_phone] = auth_id
            OTP_CODES.pop(normalized_phone, None)
        else:
            OTP_CODES[normalized_phone] = code
            _send_otp_external(normalized_phone, code)
    return {"ok": True}


@app.post("/api/auth/otp/verify", response_model=AuthResponse)
def otp_verify(payload: OtpVerifyPayload) -> AuthResponse:
    normalized_phone = _normalize_phone(payload.phone)
    expected_code = OTP_CODES.get(normalized_phone)
    test_mode = os.getenv("TEST_MODE", "true").lower() == "true"
    notificore_enabled = _env_flag("NOTIFICORE_OTP_ENABLED", False)
    demo_role = ROLE_BY_DEMO_CODE.get(payload.code)
    if demo_role in DISABLED_SIGNIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вход для администратора и преподавателя отключен.",
        )

    if not demo_role:
        if not test_mode and notificore_enabled:
            _verify_otp_notificore(normalized_phone, payload.code)
        elif expected_code != payload.code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP code")

    store = _read_store()
    user = _find_user_by_phone(store, normalized_phone)

    if user is None and normalized_phone != OWNER_PHONE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Телефон не зарегистрирован. Обратитесь к администратору.",
        )

    if user is None and normalized_phone == OWNER_PHONE:
        user = _create_user(
            store,
            phone=normalized_phone,
            role="owner",
            name=normalized_phone,
            access_level="full",
            account_status="active",
        )

    assert user is not None
    resolved_role: UserRole = demo_role or user.get("role", "parent")
    if normalized_phone == OWNER_PHONE:
        resolved_role = "owner"
    if resolved_role == "owner" and normalized_phone != OWNER_PHONE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вход владельца разрешен только с номера +79189423508.",
        )
    if resolved_role in DISABLED_SIGNIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вход для администратора и преподавателя отключен.",
        )

    user["role"] = resolved_role

    if resolved_role != "parent":
        user["access_level"] = "full"
        user["account_status"] = "active"
    else:
        user.setdefault("access_level", "payment_only")
        user.setdefault("account_status", "payment_pending")
    user["updated_at"] = _utc_now_iso()

    _write_store(store)

    token = secrets.token_urlsafe(32)
    issued_at_dt = datetime.now(timezone.utc)
    expires_at_dt = issued_at_dt.timestamp() + _auth_token_ttl_seconds()
    expires_at = datetime.fromtimestamp(expires_at_dt, tz=timezone.utc).isoformat()
    ACTIVE_TOKENS[token] = normalized_phone
    store.setdefault("activeTokens", {})[token] = {
        "phone": normalized_phone,
        "issuedAt": issued_at_dt.isoformat(),
        "expiresAt": expires_at,
    }
    OTP_CODES.pop(normalized_phone, None)
    _write_store(store)
    return AuthResponse(
        access_token=token,
        role=resolved_role,
        access_level=user["access_level"],
        account_status=user["account_status"],
    )


@app.get("/api/auth/me")
def auth_me(current_user: dict[str, Any] = Depends(_require_auth)) -> dict[str, Any]:
    return current_user


@app.post("/api/auth/logout")
def auth_logout(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    _: dict[str, Any] = Depends(_require_auth),
) -> dict[str, bool]:
    token = creds.credentials
    store = _read_store()
    store.get("activeTokens", {}).pop(token, None)
    ACTIVE_TOKENS.pop(token, None)
    _write_store(store)
    return {"ok": True}


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
            name=payload.parent_full_name,
            access_level="payment_only",
            account_status="payment_pending",
        )
    else:
        parent_user["name"] = payload.parent_full_name
        parent_user["access_level"] = "payment_only"
        parent_user["account_status"] = "payment_pending"
        parent_user["updated_at"] = now

    child = {
        "id": _new_id("child"),
        "parentUserId": parent_user["id"],
        "fullName": payload.child_full_name,
        "birthDate": birth_date,
        "createdAt": now,
        "updatedAt": now,
    }
    store["children"].append(child)

    payment_status: PaymentStatus = "unpaid" if payload.payment_method == "cash" else "pending"
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
        "accessLevel": "payment_only",
        "accountStatus": "payment_pending",
        "notes": payload.notes,
        "createdByUserId": current_user["id"],
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
        "paidAt": None,
        "confirmedByUserId": None,
        "invoiceNumber": _next_invoice_number(store),
        "dueDate": due_date_iso,
        "reminderCount": 0,
        "lastReminderAt": None,
        "nextReminderAt": _next_reminder_iso(due_date_iso),
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
        },
    )

    _write_store(store)

    return {
        "ok": True,
        "parent": parent_user,
        "child": child,
        "client": client,
        "payment": payment,
    }


@app.get("/api/admin/clients")
def admin_list_clients(
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> list[dict[str, Any]]:
    del current_user
    store = _read_store()
    return [_serialize_admin_client(store, client) for client in store["clients"]]


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
    if status_filter:
        records = [item for item in records if item.get("status") == status_filter]
    if method_filter:
        records = [item for item in records if item.get("paymentMethod") == method_filter]
    result = [_serialize_admin_payment(store, item) for item in records]
    if changed:
        _write_store(store)
    return result


@app.post("/api/admin/payments/invoices")
def admin_create_invoice(
    payload: AdminCreateInvoicePayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
    client = _find_client_by_id(store, payload.client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    parent_user_id = str(client.get("parentUserId") or "")
    parent_user = _find_user_by_id(store, parent_user_id)
    if parent_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent user not found")

    outstanding_payment = next(
        (
            item
            for item in store.get("paymentRecords", [])
            if str(item.get("clientId")) == str(client.get("id"))
            and _is_outstanding_status(str(item.get("status") or "pending"))
        ),
        None,
    )
    if outstanding_payment is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"У клиента уже есть открытый счет: {outstanding_payment.get('invoiceNumber') or outstanding_payment.get('id')}",
        )

    due_date_iso = _default_due_date_iso()
    if payload.due_date:
        due_date_iso = _normalize_iso_date(payload.due_date)
    amount = float(payload.amount if payload.amount is not None else client.get("subscriptionAmount") or 0)
    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be > 0")

    now = _utc_now_iso()
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
        metadata={"comment": payload.comment, "dueDate": due_date_iso},
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


@app.post("/api/admin/payments/reminders/run")
def admin_run_payment_reminders(
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    store = _read_store()
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
            actor_user_id=str(current_user.get("id") or ""),
            actor_role=current_user.get("role"),
            source="automation",
            custom_message=None,
        )
        processed.append(_serialize_admin_payment(store, payment))
        changed = True

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
    elif next_status in {"refunded", "cancelled"}:
        payment["nextReminderAt"] = None
        payment["paidAt"] = None
    elif _is_outstanding_status(next_status):
        due_date = str(payment.get("dueDate") or _default_due_date_iso())
        payment["nextReminderAt"] = _next_reminder_iso(due_date)
        payment["paidAt"] = None

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


@app.post("/api/payments/provider/webhook")
def payment_provider_webhook(payload: ProviderWebhookPayload) -> dict[str, Any]:
    store = _read_store()
    payment = _find_payment_by_id(store, payload.payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
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
        _sync_client_status_by_payment(store, payment)
        parent_user = _recalculate_parent_access_from_clients(store, str(payment.get("parentUserId") or ""))
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


@app.post("/api/payments/provider/create")
def payment_provider_create(
    payload: ProviderCreatePaymentPayload,
    _: dict[str, Any] = Depends(_require_auth),
) -> dict[str, Any]:
    provider_url = os.getenv("PAYMENT_PROVIDER_URL", "").strip()
    if not provider_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment provider is not configured. Set PAYMENT_PROVIDER_URL.",
        )

    token = os.getenv("PAYMENT_PROVIDER_TOKEN", "").strip()
    request_payload = {
        "payment_id": payload.payment_id,
        "success_url": payload.success_url,
        "fail_url": payload.fail_url,
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
            payment_url = parsed.get("payment_url") or parsed.get("confirmation_url")
            provider_payment_id = parsed.get("provider_payment_id") or parsed.get("id")
            if not payment_url:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Payment provider response missing payment_url.",
                )
            return {
                "ok": True,
                "payment_url": payment_url,
                "provider_payment_id": provider_payment_id,
                "raw": parsed,
            }
    except (HTTPError, URLError):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment provider is unavailable.",
        )


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

    can_use_dashboard = (
        current_user.get("access_level") == "full"
        and current_user.get("account_status") == "active"
    )

    return {
        "parentUserId": parent_id,
        "accessLevel": current_user.get("access_level"),
        "accountStatus": current_user.get("account_status"),
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
    group = {
        "id": _new_id("group"),
        "name": payload.name.strip(),
        "ageRange": payload.age_range.strip(),
        "teacherId": payload.teacher_id,
        "teacherName": payload.teacher_name or "",
        "schedule": payload.schedule.strip(),
        "time": payload.time.strip(),
        "color": payload.color.strip() or "#133C2A",
        "maxCapacity": int(payload.max_capacity),
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
    for group in store.get("ownerGroups", []):
        if str(group.get("id")) != group_id:
            continue
        group["name"] = payload.name.strip()
        group["ageRange"] = payload.age_range.strip()
        group["teacherId"] = payload.teacher_id
        group["teacherName"] = payload.teacher_name or ""
        group["schedule"] = payload.schedule.strip()
        group["time"] = payload.time.strip()
        group["color"] = payload.color.strip() or "#133C2A"
        group["maxCapacity"] = int(payload.max_capacity)
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


@app.patch("/api/owner/pricing/{plan_code}")
def owner_update_pricing_plan(
    plan_code: str,
    payload: OwnerPricingPlanPayload,
    current_user: dict[str, Any] = Depends(_require_admin_or_owner),
) -> dict[str, Any]:
    del current_user
    store = _read_store()
    normalized_code = plan_code.strip().lower()
    if normalized_code not in {"hobby", "pro"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Доступны только планы hobby и pro")

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
def create_document(payload: dict[str, Any], _: dict[str, Any] = Depends(_require_admin_or_owner)) -> dict[str, Any]:
    created = _create_entity("documents", payload)
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
