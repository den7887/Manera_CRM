# 🎭 CRM "Manera" - Система управления танцевальной студией

> Современный, элегантный и интуитивно понятный CRM-интерфейс для студии современного танца

---

## 🚀 С чего начать?

### Новый пользователь? 👋
**→ Откройте [START_HERE.md](./START_HERE.md)** - там выбор пути (быстрый/подробный)

### Хотите быстро запустить? ⚡
**→ Откройте [QUICK_CHECKLIST.md](./QUICK_CHECKLIST.md)** - чек-лист на 10 минут

### Нужна подробная инструкция? 📖
**→ Откройте [FULL_STEP_BY_STEP_GUIDE.md](./FULL_STEP_BY_STEP_GUIDE.md)** - пошаговое руководство

### Вся документация:
| Файл | Описание |
|------|----------|
| [START_HERE.md](./START_HERE.md) | 🎯 **НАЧНИТЕ ЗДЕСЬ** - выбор пути |
| [QUICK_CHECKLIST.md](./QUICK_CHECKLIST.md) | ✅ Быстрый чек-лист (10 мин) |
| [FULL_STEP_BY_STEP_GUIDE.md](./FULL_STEP_BY_STEP_GUIDE.md) | 📖 Полная пошаговая инструкция |
| [WHATS_INCLUDED.md](./WHATS_INCLUDED.md) | 📦 Что входит в проект |
| [QUICK_START.md](./QUICK_START.md) | ⚡ Краткая справка |
| [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) | ⚙️ Настройка Supabase |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | 🔌 Документация API |
| [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md) | 🔐 Настройка входа |
| [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) | 🔄 Подключение к Supabase |
| [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) | 🚀 Деплой на production |
| [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) | 📊 Итоги проекта |

---

## ✨ Особенности

### 🎨 **Премиальный дизайн**
- Цветовая палитра: изумрудный (#133C2A), золотой (#D4AF37), бежевый (#F8F4E3)
- Мягкие градиенты и закругленные углы
- Адаптивный дизайн для desktop и mobile

### 👥 **4 роли пользователей**
1. **Родители** - просмотр детей, расписания, оплата
2. **Преподаватели** - управление группами, посещаемость
3. **Администраторы** - операционное управление студией
4. **Владелец** - полный доступ + финансы и аналитика

### 📱 **Адаптивная навигация**
- Desktop: складная левая боковая панель
- Mobile: нижняя панель навигации
- Плавные переходы и анимации

### 🚀 **Функционал**

#### Для всех ролей:
- ✅ Личный профиль
- ✅ Уведомления в реальном времени
- ✅ Сообщения
- ✅ Новости и мероприятия

#### Для родителей:
- ✅ Карточки детей с расписанием
- ✅ История посещений
- ✅ Абонементы и платежи
- ✅ Регистрация на мероприятия

#### Для преподавателей:
- ✅ Управление группами
- ✅ Отметка посещаемости
- ✅ Расписание занятий
- ✅ Просмотр учеников

#### Для администраторов:
- ✅ Управление клиентами
- ✅ Управление учениками
- ✅ Управление группами
- ✅ Расписание
- ✅ Задачи и автоматизации
- ✅ Прайс-лист
- ✅ Документы

#### Для владельца:
- ✅ Финансовая аналитика
- ✅ Прогноз оттока клиентов (AI)
- ✅ Бизнес-метрики
- ✅ Управление командой
- ✅ Настройки студии
- ✅ Отчёты и графики

---

## 📊 Статистика проекта

- **32+** страниц/экранов
- **50+** диалогов и форм
- **200+** интерактивных кнопок с toast-уведомлениями
- **15+** таблиц базы данных
- **100%** покрытие функционала

---

## 🛠️ Технологический стек

### Frontend:
- **React** + TypeScript
- **Tailwind CSS** v4.0
- **shadcn/ui** компоненты
- **Lucide** иконки
- **Recharts** графики
- **Sonner** toast-уведомления

### Backend:
- **Supabase** (PostgreSQL)
- **Row Level Security** (RLS)
- **Real-time subscriptions**
- **Authentication**

### Архитектура:
- Трёхуровневая: Frontend → API → Database
- RESTful API через Supabase Client
- TypeScript типизация
- Модульная структура компонентов

---

## 🚀 Быстрый старт

### 1. Клонируйте репозиторий
```bash
git clone https://github.com/your-username/crm-manera.git
cd crm-manera
```

### 2. Установите зависимости
```bash
npm install
```

### 3. Настройте Supabase
Следуйте инструкциям в `SETUP_INSTRUCTIONS.md`:
1. Создайте проект на supabase.com
2. Запустите SQL миграции
3. Скопируйте API ключи

### 4. Настройте переменные окружения
```bash
cp .env.example .env.local
```

Заполните `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Запустите проект
```bash
npm run dev
```

Откройте http://localhost:5173

---

## 📁 Структура проекта

```
crm-manera/
├── components/          # React компоненты
│   ├── parent/         # Компоненты родителя
│   ├── teacher/        # Компоненты преподавателя
│   ├── admin/          # Компоненты администратора
│   ├── owner/          # Компоненты владельца
│   ├── ui/             # shadcn/ui компоненты
│   └── auth/           # Аутентификация
├── lib/                # Библиотеки и утилиты
│   ├── supabase.ts     # Supabase client
│   └── api.ts          # API функции
├── contexts/           # React contexts
│   └── AuthContext.tsx # Контекст аутентификации
├── supabase/           # Backend
│   └── migrations/     # SQL миграции
├── styles/             # Глобальные стили
│   └── globals.css     # Tailwind + кастомные стили
├── types/              # TypeScript типы
├── data/               # Моковые данные (для разработки)
└── utils/              # Утилиты
```

---

## 🗄️ База данных

### Основные таблицы:
- `users` - Пользователи (4 роли)
- `students` - Ученики
- `parents` - Родители
- `teachers` - Преподаватели
- `groups` - Группы
- `schedules` - Расписание
- `subscriptions` - Абонементы
- `payments` - Платежи
- `attendance` - Посещаемость
- `tasks` - Задачи
- `events` - Мероприятия
- `messages` - Сообщения
- `pricing` - Прайс-лист
- `automations` - Автоматизации
- `analytics_metrics` - Метрики

### Row Level Security (RLS):
✅ Автоматическое разграничение доступа:
- Родители видят только своих детей
- Преподаватели - только свои группы
- Администраторы - операционные данные
- Владелец - весь доступ

---

## 📚 Документация

- **[SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)** - Подробная инструкция по настройке
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Документация API
- **SQL миграции** - `/supabase/migrations/`

---

## 🔐 Аутентификация

### Тестовые пользователи:
| Роль | Email | Пароль |
|------|-------|--------|
| Владелец | owner@manera.ru | manera2024 |
| Админ | admin@manera.ru | manera2024 |
| Преподаватель | teacher1@manera.ru | manera2024 |
| Родитель | parent1@manera.ru | manera2024 |

⚠️ **Для production:** настройте реальные пароли через Supabase Auth

---

## 🎯 Использование API

### Пример: Получить учеников
```typescript
import { getStudents } from './lib/api';

const students = await getStudents();
console.log(students);
```

### Пример: Создать абонемент
```typescript
import { createSubscription } from './lib/api';

await createSubscription({
  student_id: 'student-id',
  pricing_id: 'pricing-id',
  lessons_total: 8,
  start_date: '2024-11-01',
  end_date: '2024-11-30',
  amount: 5600,
});
```

Больше примеров в `API_DOCUMENTATION.md`

---

## 🚢 Deployment

### Vercel (Рекомендуется):
1. Push код на GitHub
2. Подключите репозиторий к Vercel
3. Добавьте environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

### Netlify:
1. Push на GitHub
2. Подключите к Netlify
3. Настройте environment variables
4. Deploy!

### Docker:
```bash
docker build -t crm-manera .
docker run -p 3000:3000 crm-manera
```

---

## 🧪 Тестирование

```bash
# Запустить тесты
npm test

# Запустить с покрытием
npm run test:coverage

# E2E тесты
npm run test:e2e
```

---

## 🎨 Кастомизация

### Цвета:
Отредактируйте `/styles/globals.css`:
```css
:root {
  --emerald: #133C2A;
  --gold: #D4AF37;
  --beige: #F8F4E3;
}
```

### Компоненты:
Все компоненты в `/components/` полностью кастомизируемы

---

## 📈 Roadmap

### Планируется:
- [ ] Интеграция платёжных систем (ЮKassa, Stripe)
- [ ] Push-уведомления (PWA)
- [ ] Email рассылки
- [ ] SMS напоминания
- [ ] Mobile приложение (React Native)
- [ ] Telegram бот
- [ ] Экспорт отчётов (PDF, Excel)
- [ ] Видео-уроки онлайн
- [ ] Система лояльности

---

## 🤝 Contributing

Приветствуются Pull Request'ы! 

1. Fork проект
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

---

## 📄 Лицензия

MIT License - см. файл `LICENSE`

---

## 💬 Поддержка

- **Email:** support@manera.ru
- **Telegram:** @manera_support
- **GitHub Issues:** [создать issue](https://github.com/your-username/crm-manera/issues)

---

## 👏 Благодарности

- [Supabase](https://supabase.com) - Backend платформа
- [shadcn/ui](https://ui.shadcn.com) - UI компоненты
- [Lucide](https://lucide.dev) - Иконки
- [Vercel](https://vercel.com) - Hosting

---

## 📊 Скриншоты

### Landing Page
![Landing](./screenshots/landing.png)

### Parent Dashboard
![Parent](./screenshots/parent.png)

### Teacher Dashboard
![Teacher](./screenshots/teacher.png)

### Admin Dashboard
![Admin](./screenshots/admin.png)

### Owner Analytics
![Owner](./screenshots/owner.png)

---

**Сделано с ❤️ для танцевальной студии "Manera"**

---

## 🌟 Ключевые особенности

### 🎯 Полнофункциональный CRM
- Управление клиентами и учениками
- Расписание и посещаемость
- Абонементы и платежи
- Задачи и автоматизации

### 📊 Продвинутая аналитика
- Финансовые метрики
- Прогноз оттока клиентов
- AI-рекомендации
- Графики и отчёты

### 🔒 Безопасность
- Row Level Security (RLS)
- JWT аутентификация
- Защищённые API endpoints
- GDPR compliant

### ⚡ Производительность
- Оптимизированные запросы
- Lazy loading
- Кэширование
- Real-time updates

---

**Версия:** 1.0.0  
**Последнее обновление:** 21 ноября 2024