
# Multi-Platform CRM Design

Frontend + локальный MVP backend для оживления CRM без Supabase.

## Запуск фронтенда

1. `npm i`
2. `npm run dev`

По умолчанию frontend обращается к `http://localhost:8000`.

## Запуск backend (FastAPI)

1. Перейдите в папку `server`
2. Установите зависимости: `pip install -r requirements.txt`
3. Запустите сервер:
   `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

## Тестовый вход

- Демо OTP-коды:
  - `111111` → parent
  - `444444` → owner
- Вход для `teacher` и `admin` отключен на backend.
- Можно включить единый тест-код через переменные окружения backend:
  - `TEST_MODE=true`
  - `TEST_OTP=400001`

## Реальный OTP через Notificore (2FA)

Для включения реальной отправки и проверки OTP через Notificore:

- Отключите тестовый режим:
  - `TEST_MODE=false`
- Включите интеграцию Notificore:
  - `NOTIFICORE_OTP_ENABLED=true`
- Укажите ключ API и параметры 2FA:
  - `NOTIFICORE_API_KEY=live_xxx`
  - `NOTIFICORE_TEMPLATE_ID=123`
  - `NOTIFICORE_SENDER=SENDER`

Дополнительные (необязательно):

- `NOTIFICORE_ONE_API_URL=http://one-api.notificore.ru`
- `NOTIFICORE_CHANNEL=SMS`
- `NOTIFICORE_SENDER_ALT=SENDERALT` (fallback sender для Viber-сценариев)
- `NOTIFICORE_CODE_DIGITS=6`
- `NOTIFICORE_CODE_LIFETIME_SEC=300`
- `NOTIFICORE_CODE_MAX_TRIES=3`
- (опционально для frontend) `VITE_OTP_LENGTH=6`

Шаблон переменных: `server/.env.example`

Примечание:

- При `NOTIFICORE_OTP_ENABLED=true` backend использует:
  - `POST /api/auth/login` (получение bearer),
  - `POST /api/2fa/authentications/otp` (отправка OTP),
  - `POST /api/2fa/authentications/otp/{id}/verify` (проверка OTP).

Быстрый запуск одной командой (PowerShell):

```powershell
cd server
.\run_notificore_otp.ps1 -ApiKey "live_xxx" -TemplateId "123" -Sender "SENDER"
```

## Новый контур оплат и доступа (MVP)

На backend добавлен базовый бизнес-процесс доступа родителя:

- Родитель получает `payment_only` доступ после добавления администратором.
- Полный доступ `full` открывается после оплаты:
  - вручную администратором для наличных;
  - автоматически через webhook для online.
- Ведётся журнал всех статусов оплат (`paymentJournal` в `server/data/store.json`).

### Ключевые API

- `POST /api/admin/clients` — создать клиента (родитель+ребёнок+назначение оплаты).
- `GET /api/admin/clients` — список клиентских назначений.
- `GET /api/admin/payments` — список оплат.
- `POST /api/admin/payments/{payment_id}/confirm-cash` — подтверждение наличной оплаты.
- `POST /api/payments/provider/webhook` — webhook оплаты онлайн (заглушка провайдера).
- `GET /api/payments/journal` — журнал оплат (admin/owner).
- `GET /api/parent/access` — проверка уровня доступа родителя.
- `GET /api/parent/payments` — оплаты текущего родителя.

## Временный MVP оплат через СБП (без эквайринга)

Добавлен модуль `payments` для временного процесса оплаты по ссылке/QR с кнопкой «Я оплатил».

Переменные окружения backend:

- `MANUAL_SBP_PAYMENT_URL` — ссылка на оплату СБП
- `MANUAL_SBP_RECEIVER_NAME` — имя получателя
- `MANUAL_SBP_RECEIVER_PHONE` — телефон получателя
- `PAYMENTS_AUTO_ACTIVATE_ON_USER_CONFIRM=true|false`
- `PAYMENTS_MVP_ENABLED=true|false` — включение/отключение временного платежного MVP

Новые endpoint:

- `GET /api/payments/plans` — активные тарифы
- `POST /api/payments/create` — создать payment (`pending`)
- `POST /api/payments/{payment_id}/confirm-user-paid` — подтверждение «Я оплатил»
- `GET /api/payments/my` — список платежей родителя
- `GET /api/subscriptions/my` — активные абонементы родителя

Начальные тарифы (seed):

- `hobby` / `Хобби` / `5000` / `30 дней`
- `pro` / `Про` / `7000` / `30 дней`
  
