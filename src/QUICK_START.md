# ⚡ Быстрый старт - CRM "Manera"

> Запустите свой CRM за 10 минут!

---

## 🎯 Сейчас у вас есть

✅ **Frontend** - 32+ страницы, все компоненты готовы  
✅ **Backend структура** - SQL миграции готовы  
✅ **API функции** - все готово к использованию  
✅ **Документация** - подробные инструкции  

---

## 🚀 3 шага до запуска

### Шаг 1: Supabase (5 минут)

1. Перейдите на [supabase.com](https://supabase.com) → Создайте проект
2. SQL Editor → Скопируйте из `/supabase/migrations/001_initial_schema.sql` → Run
3. SQL Editor → Скопируйте из `/supabase/migrations/002_rls_policies.sql` → Run
4. SQL Editor → Скопируйте из `/supabase/migrations/003_seed_data.sql` → Run
5. Settings → API → Скопируйте URL и anon key

**Готово! База создана с тестовыми данными** ✅

---

### Шаг 2: Environment (1 минута)

Создайте файл `.env.local`:

```env
VITE_SUPABASE_URL=ваш-url-из-шага-1
VITE_SUPABASE_ANON_KEY=ваш-ключ-из-шага-1
```

---

### Шаг 3: Запуск (2 минуты)

```bash
npm install
npm run dev
```

Откройте http://localhost:5173

**Готово! CRM запущен** 🎉

---

## 👥 Тестовые пользователи

| Email | Пароль | Роль |
|-------|--------|------|
| owner@manera.ru | manera2024 | Владелец |
| admin@manera.ru | manera2024 | Админ |
| teacher1@manera.ru | manera2024 | Преподаватель |
| parent1@manera.ru | manera2024 | Родитель |

⚠️ **Важно:** Это демо пароли. Для настройки реальной аутентификации см. `AUTHENTICATION_SETUP.md`

---

## 📂 Структура файлов

```
/
├── components/          # Все компоненты UI
│   ├── parent/         # Дашборд родителя
│   ├── teacher/        # Дашборд преподавателя
│   ├── admin/          # Дашборд администратора
│   └── owner/          # Дашборд владельца
├── lib/
│   ├── supabase.ts     # Supabase client
│   └── api.ts          # API функции (используйте эти!)
├── contexts/
│   └── AuthContext.tsx # Аутентификация
├── supabase/migrations/ # SQL миграции (уже запущены)
└── data/mockData.ts    # Mock данные (пока используются)
```

---

## 🔌 Как использовать API

### Получить данные:

```typescript
import { getStudents } from './lib/api';

const students = await getStudents();
console.log(students); // [{ id, full_name, ... }]
```

### Создать запись:

```typescript
import { createStudent } from './lib/api';

await createStudent({
  parent_id: 'parent-id',
  full_name: 'Иван Иванов',
  is_active: true,
});
```

### Обновить:

```typescript
import { updateStudent } from './lib/api';

await updateStudent('student-id', {
  full_name: 'Новое имя',
});
```

**Больше примеров:** `API_DOCUMENTATION.md`

---

## 📚 Документация

| Файл | Содержание |
|------|------------|
| `README.md` | Полное описание проекта |
| `SETUP_INSTRUCTIONS.md` | Подробная настройка |
| `API_DOCUMENTATION.md` | Все API функции |
| `AUTHENTICATION_SETUP.md` | Настройка входа |
| `INTEGRATION_GUIDE.md` | Подключение компонентов |
| `DEPLOYMENT_CHECKLIST.md` | Чек-лист для деплоя |

---

## 🎨 Что уже работает

### Для всех ролей:
- ✅ Профиль пользователя
- ✅ Уведомления
- ✅ Сообщения
- ✅ Новости и мероприятия

### Родители:
- ✅ Карточки детей
- ✅ Расписание
- ✅ Абонементы
- ✅ Платежи

### Преподаватели:
- ✅ Группы
- ✅ Посещаемость
- ✅ Расписание

### Администраторы:
- ✅ Клиенты
- ✅ Ученики
- ✅ Группы
- ✅ Расписание
- ✅ Задачи
- ✅ Прайс-лист
- ✅ Автоматизации

### Владелец:
- ✅ Финансы
- ✅ Аналитика с AI
- ✅ Прогноз оттока
- ✅ Управление командой
- ✅ Настройки студии

---

## 🔄 Что дальше?

### Сейчас работает с mock данными
Приложение загружается мгновенно с демо данными из `/data/mockData.ts`

### Для подключения реального backend:

1. **Базовая интеграция** (2-3 часа):
   - Обновить 5-10 основных компонентов
   - Подключить API функции
   - Тестировать
   - См. `INTEGRATION_GUIDE.md`

2. **Полная интеграция** (1-2 дня):
   - Все 32+ компонента
   - Real-time обновления
   - Оптимизация
   - Полное тестирование

3. **Production** (1 день):
   - Настроить аутентификацию
   - Deploy на Vercel
   - Настроить домен
   - См. `DEPLOYMENT_CHECKLIST.md`

---

## 🚀 Deploy за 5 минут (опционально)

### Vercel (Бесплатно):

```bash
# 1. Загрузить на GitHub
git init
git add .
git commit -m "CRM Manera"
git remote add origin https://github.com/username/crm-manera
git push -u origin main

# 2. Vercel
npm i -g vercel
vercel

# 3. Добавить environment variables в Vercel Dashboard
# Готово! manera.vercel.app
```

---

## 💡 Советы

### Для разработки:
```bash
npm run dev          # Запустить dev сервер
npm run build        # Собрать для production
npm run preview      # Предпросмотр production билда
```

### Проверка Supabase:
```typescript
// В консоли браузера (F12)
import { supabase } from './lib/supabase';
const { data } = await supabase.from('students').select('count');
console.log(data); // Должно работать!
```

### Если что-то не работает:
1. Проверьте `.env.local` файл
2. Проверьте консоль браузера (F12)
3. Проверьте что SQL миграции запущены
4. Перезапустите dev сервер

---

## 🎯 Быстрая проверка

После запуска проверьте:

- [ ] Сайт открывается на localhost:5173
- [ ] Landing page загружается
- [ ] Нет ошибок в консоли
- [ ] Кнопки работают
- [ ] Toast уведомления появляются
- [ ] Можно переключаться между страницами
- [ ] Responsive design работает (изменить размер окна)

---

## 📞 Помощь

**Если нужна помощь:**
1. Проверьте соответствующий .md файл
2. Посмотрите консоль браузера (F12)
3. Проверьте Supabase Dashboard → Logs

**Частые вопросы:**

**Q: Ошибка "Supabase credentials not found"**  
A: Создайте `.env.local` с ключами из Supabase

**Q: "Table doesn't exist"**  
A: Запустите SQL миграции в Supabase SQL Editor

**Q: Медленно загружается**  
A: Это нормально для первого запуска, далее будет быстрее

**Q: Как подключить реальные данные?**  
A: См. `INTEGRATION_GUIDE.md`

---

## ✅ Готово!

Ваш CRM "Manera" запущен и готов к работе!

**Следующие шаги:**
1. ✅ Изучите интерфейс (протестируйте все роли)
2. ✅ Посмотрите код компонентов
3. ✅ Прочитайте API_DOCUMENTATION.md
4. ✅ Начните интеграцию с Supabase
5. ✅ Deploy на production

**Приятной работы! 🎉**

---

**Версия:** 1.0.0  
**Дата:** 21 ноября 2024  
**Статус:** ✅ Готов к разработке
