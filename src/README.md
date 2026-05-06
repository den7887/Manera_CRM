# Manera CRM: актуальное состояние

Этот каталог содержит frontend проекта Manera CRM.

## Стек

- Frontend: React + Vite + TypeScript.
- UI: Tailwind CSS, shadcn/ui, lucide-react.
- Backend MVP: FastAPI в каталоге `server`.
- Текущий источник данных MVP: `server/data/store.json`.

## Важно

Supabase не используется в текущем локальном MVP. Файлы `src/supabase/*` и старые инструкции оставлены как исторический контекст и не являются активным способом запуска проекта.

## Основные роли

- Родитель: ребенок, расписание, оплата, сообщения, профиль.
- Владелец: деньги, клиенты, команда, отчеты, настройки студии.
- Администратор и преподаватель: компоненты сохранены, но вход для этих ролей сейчас отключен на backend.

## Запуск

```powershell
npm install
npm run dev
```

Backend:

```powershell
npm run dev:api
```

По умолчанию frontend обращается к backend по адресу `http://<текущий-host>:8000`.
