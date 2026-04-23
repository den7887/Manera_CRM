# ✅ Чек-лист деплоя CRM "Manera"

## 🎯 Перед деплоем

### 1. Backend (Supabase) ✅

- [ ] Создан проект на supabase.com
- [ ] Запущена миграция `001_initial_schema.sql`
- [ ] Запущена миграция `002_rls_policies.sql`
- [ ] Запущена миграция `003_seed_data.sql`
- [ ] Проверена структура таблиц (15+ таблиц)
- [ ] Проверены RLS политики
- [ ] Скопированы API ключи (URL + ANON_KEY)

**Как проверить:**
```sql
-- В Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
-- Должно быть 15+ таблиц
```

---

### 2. Environment Variables ✅

- [ ] Создан файл `.env.local`
- [ ] Заполнен `VITE_SUPABASE_URL`
- [ ] Заполнен `VITE_SUPABASE_ANON_KEY`
- [ ] Проверена корректность ключей

**Пример `.env.local`:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 3. Локальное тестирование ✅

- [ ] Установлены зависимости (`npm install`)
- [ ] Запущен dev сервер (`npm run dev`)
- [ ] Открывается без ошибок
- [ ] Нет ошибок в консоли браузера
- [ ] Supabase подключён (нет предупреждений)
- [ ] Данные загружаются из БД

**Команды:**
```bash
npm install
npm run dev
# Открыть http://localhost:5173
# Проверить консоль (F12)
```

---

### 4. Build проверка ✅

- [ ] Production build успешен (`npm run build`)
- [ ] Нет ошибок TypeScript
- [ ] Нет предупреждений сборки
- [ ] Preview работает (`npm run preview`)

**Команды:**
```bash
npm run build
npm run preview
# Проверить http://localhost:4173
```

---

## 🚀 Deployment

### Вариант A: Vercel (Рекомендуется)

#### Шаг 1: Подготовка Git
- [ ] Создан репозиторий на GitHub
- [ ] Код загружен в GitHub
```bash
git init
git add .
git commit -m "Initial commit: CRM Manera"
git remote add origin https://github.com/username/crm-manera.git
git push -u origin main
```

#### Шаг 2: Vercel Dashboard
- [ ] Зарегистрирован на vercel.com
- [ ] Нажато "New Project"
- [ ] Импортирован GitHub репозиторий
- [ ] Выбран framework: Vite
- [ ] Добавлены Environment Variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] Нажато "Deploy"

#### Шаг 3: После деплоя
- [ ] Deployment успешен
- [ ] Сайт открывается (manera.vercel.app)
- [ ] Нет ошибок на production
- [ ] Данные загружаются корректно
- [ ] Все роли работают

---

### Вариант B: Netlify

#### Шаг 1: Подготовка
- [ ] Код в GitHub (см. Вариант A)
- [ ] Build команда: `npm run build`
- [ ] Publish directory: `dist`

#### Шаг 2: Netlify Dashboard
- [ ] Зарегистрирован на netlify.com
- [ ] "Add new site" → "Import from Git"
- [ ] Выбран GitHub репозиторий
- [ ] Настроен Build:
  - Build command: `npm run build`
  - Publish directory: `dist`
- [ ] Добавлены Environment Variables
- [ ] Deploy

#### Шаг 3: Проверка
- [ ] Сайт работает
- [ ] Custom domain настроен (опционально)

---

### Вариант C: Docker

#### Dockerfile создан:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

#### Команды:
- [ ] Docker image собран
```bash
docker build -t crm-manera .
```
- [ ] Контейнер запущен
```bash
docker run -p 3000:3000 \
  -e VITE_SUPABASE_URL=your-url \
  -e VITE_SUPABASE_ANON_KEY=your-key \
  crm-manera
```
- [ ] Сайт доступен на localhost:3000

---

## 🔧 Post-Deployment

### 1. Тестирование Production ✅

- [ ] Сайт открывается
- [ ] Landing page загружается
- [ ] Форма входа работает
- [ ] Можно войти за каждую роль:
  - [ ] Владелец (owner@manera.ru)
  - [ ] Администратор (admin@manera.ru)
  - [ ] Преподаватель (teacher1@manera.ru)
  - [ ] Родитель (parent1@manera.ru)
- [ ] Дашборды отображаются корректно
- [ ] Данные загружаются
- [ ] Нет ошибок в консоли
- [ ] Mobile версия работает

---

### 2. Производительность ✅

Проверить через Lighthouse (F12 → Lighthouse):

- [ ] Performance: > 90
- [ ] Accessibility: > 90
- [ ] Best Practices: > 90
- [ ] SEO: > 90

**Если низкие баллы:**
- Оптимизировать изображения
- Включить кэширование
- Минифицировать CSS/JS (должно быть автоматически)

---

### 3. Безопасность ✅

- [ ] HTTPS включён (обычно автоматически на Vercel/Netlify)
- [ ] API ключи не в коде (только в .env)
- [ ] RLS политики активны в Supabase
- [ ] CORS настроен корректно
- [ ] Service Role Key НЕ используется на frontend

**Проверка RLS:**
```sql
-- В Supabase SQL Editor
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
-- rowsecurity должен быть true для всех таблиц
```

---

### 4. Мониторинг ✅

#### Vercel Analytics (бесплатно):
- [ ] Включён в Vercel Dashboard
- [ ] Отслеживание посещаемости работает

#### Supabase Dashboard:
- [ ] Проверить "Database" → "Usage"
- [ ] Проверить "Auth" → "Users"
- [ ] Настроить алерты при превышении лимитов

---

### 5. Custom Domain (Опционально) ✅

- [ ] Куплен домен (manera.ru)
- [ ] DNS настроен:
  - A record → Vercel IP
  - или CNAME → manera.vercel.app
- [ ] SSL сертификат выпущен (автоматически)
- [ ] Сайт доступен на manera.ru
- [ ] Редирект с www на apex (или наоборот)

---

## 🎨 Production оптимизации

### 1. SEO ✅

Добавить в `index.html`:
```html
<title>CRM Manera - Управление танцевальной студией</title>
<meta name="description" content="Современная CRM система для танцевальных студий">
<meta property="og:title" content="CRM Manera">
<meta property="og:description" content="...">
<meta property="og:image" content="/og-image.png">
```

### 2. Favicon ✅

- [ ] Создан favicon.ico
- [ ] Добавлен в /public/
- [ ] Отображается в браузере

### 3. Robots.txt ✅

Создать `/public/robots.txt`:
```
User-agent: *
Allow: /

Sitemap: https://manera.ru/sitemap.xml
```

---

## 📊 Метрики успеха

После запуска отслеживать:

### Технические:
- [ ] Uptime > 99.9%
- [ ] Response time < 2s
- [ ] Error rate < 1%
- [ ] Database response < 500ms

### Бизнес:
- [ ] Регистраций пользователей
- [ ] Активных сессий
- [ ] Количество оплат
- [ ] Retention rate

---

## 🆘 Troubleshooting

### Проблема: Сайт не открывается

**Решение:**
1. Проверить статус деплоя в Vercel/Netlify
2. Проверить логи сборки
3. Проверить DNS (если custom domain)

### Проблема: Ошибки Supabase

**Решение:**
1. Проверить environment variables
2. Проверить статус Supabase проекта
3. Проверить RLS политики
4. Посмотреть логи в Supabase Dashboard

### Проблема: Медленная загрузка

**Решение:**
1. Включить CDN (обычно по умолчанию)
2. Оптимизировать изображения
3. Включить кэширование
4. Проверить размер bundle

---

## 🎉 Финальная проверка

Перед анонсом:

- [ ] ✅ Все функции работают
- [ ] ✅ Нет критических багов
- [ ] ✅ Mobile версия корректна
- [ ] ✅ Производительность приемлема
- [ ] ✅ Безопасность настроена
- [ ] ✅ Monitoring включён
- [ ] ✅ Backup настроен (Supabase делает автоматически)
- [ ] ✅ Документация готова
- [ ] ✅ Тестовые данные загружены
- [ ] ✅ SSL работает
- [ ] ✅ Domain настроен (если есть)

---

## 📞 Поддержка после запуска

### Ежедневно:
- Проверять логи ошибок
- Отвечать на вопросы пользователей
- Мониторить производительность

### Еженедельно:
- Backup базы данных (Supabase делает автоматически)
- Проверка метрик
- Обновление зависимостей (если нужно)

### Ежемесячно:
- Проверка security updates
- Оптимизация производительности
- Анализ обратной связи

---

## 🚀 Готово к запуску!

После прохождения всех пунктов ваш CRM "Manera" готов к production использованию!

**Следующие шаги:**
1. ✅ Настроить реальную аутентификацию (email/пароль)
2. ✅ Добавить реальных пользователей
3. ✅ Загрузить реальные данные студии
4. ✅ Обучить команду работе с системой
5. ✅ Анонсировать родителям

**Успехов! 🎉**
