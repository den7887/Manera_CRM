
# Manera CRM

Рабочий MVP CRM для студии детского танца Manera.

- Frontend: React + Vite + TypeScript.
- Backend MVP: FastAPI.
- Текущий режим: локальный backend MVP через `server/data/store.json`.
- Supabase в текущем MVP не используется. Старые папки Supabase оставлены как исторический артефакт проекта и не являются активным способом запуска.

## Запуск фронтенда

1. `npm i`
2. `npm run dev`

По умолчанию frontend обращается к `http://localhost:8000`.

## Запуск backend (FastAPI)

1. Перейдите в папку `server`
2. Установите зависимости: `pip install -r requirements.txt`
3. Запустите сервер:
   `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

## Вход

- Основной вход клиента и владельца: телефон + 6-значный PIN.
- Старый OTP-вход в рабочем проекте отключен.
- Вход для `teacher` и `admin` отключен на backend.

Шаблон переменных: `server/.env.example`

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
- `GET /api/payments/my` — оплаты текущего родителя.

## Selfwork эквайринг

Текущий online flow теперь умеет работать через Selfwork.

Нужные backend-переменные:

- `PAYMENT_METHOD=online`
- `PAYMENT_PROVIDER=selfwork`
- `SELFWORK_API_KEY=...`
- `SELFWORK_MERCHANT_ID=0209088`
- `SELFWORK_INIT_URL=https://pro.selfwork.ru/merchant/v1/init`
- `SELFWORK_STATUS_URL=https://pro.selfwork.ru/merchant/v1/status`

Как это работает:

- backend создаёт локальный relay URL;
- parent UI переводит пользователя на локальную form-page;
- form-page отправляет серверный `POST` в hosted payment page Selfwork;
- после возврата в приложение frontend вызывает `POST /api/payments/provider/status-sync`;
- backend проверяет итоговый статус в Selfwork `status` и подтверждает оплату в CRM.

Важно:

- секретный ключ должен храниться только в env;
- redirect URL в кабинете Selfwork должен вести обратно в приложение, например:
  - `https://maneradancestudio.ru/?payment=success`
  - `https://maneradancestudio.ru/?payment=fail`

## Временный MVP оплат через СБП

Этот контур был добавлен как временный вариант без эквайринга, но сейчас не является основным платежным сценарием. Не включайте его в рабочем режиме, если не требуется отдельный тест старого MVP.

Переменные окружения backend:

- `MANUAL_SBP_PAYMENT_URL` — ссылка на оплату СБП
- `MANUAL_SBP_RECEIVER_NAME` — имя получателя
- `MANUAL_SBP_RECEIVER_PHONE` — телефон получателя
- `PAYMENTS_AUTO_ACTIVATE_ON_USER_CONFIRM=true|false`
- `PAYMENTS_MVP_ENABLED=false` — временный платежный MVP должен быть отключен в текущей рабочей схеме

Новые endpoint:

- `GET /api/payments/plans` — активные тарифы
- `POST /api/payments/create` — создать payment (`pending`)
- `POST /api/payments/{payment_id}/confirm-user-paid` — подтверждение «Я оплатил»
- `GET /api/payments/my` — список платежей родителя
- `GET /api/subscriptions/my` — активные абонементы родителя

Начальные тарифы (seed):

- `hobby` / `Хобби` / `5000` / `30 дней`
- `pro` / `Про` / `7000` / `30 дней`
  
