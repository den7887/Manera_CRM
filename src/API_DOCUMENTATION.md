# 📚 CRM "Manera" - API Документация

## 🎯 Обзор

Все функции для работы с данными находятся в `/lib/api.ts`.

---

## 🔐 Аутентификация

### `signIn(email, password)`
Вход в систему.

```typescript
import { signIn } from './lib/api';

try {
  await signIn('owner@manera.ru', 'password');
  console.log('✅ Вход выполнен');
} catch (error) {
  console.error('❌ Ошибка входа:', error);
}
```

### `signOut()`
Выход из системы.

```typescript
import { signOut } from './lib/api';

await signOut();
```

### `getCurrentSession()`
Получить текущую сессию.

```typescript
import { getCurrentSession } from './lib/api';

const session = await getCurrentSession();
if (session) {
  console.log('Пользователь авторизован:', session.user);
}
```

---

## 👨‍🎓 Ученики

### `getStudents()`
Получить всех активных учеников.

```typescript
import { getStudents } from './lib/api';

const students = await getStudents();
// [{ id: '...', full_name: 'София Козлова', parent: {...}, ... }]
```

### `getStudentById(id)`
Получить ученика по ID с полной информацией.

```typescript
import { getStudentById } from './lib/api';

const student = await getStudentById('student-id');
// { id, full_name, parent, subscriptions[], attendance[], ... }
```

### `createStudent(data)`
Создать нового ученика.

```typescript
import { createStudent } from './lib/api';

const student = await createStudent({
  parent_id: 'parent-id',
  full_name: 'Иван Иванов',
  date_of_birth: '2015-05-15',
  is_active: true,
});
```

### `updateStudent(id, updates)`
Обновить данные ученика.

```typescript
import { updateStudent } from './lib/api';

await updateStudent('student-id', {
  medical_info: 'Аллергия на пыль',
  notes: 'Очень активный',
});
```

### `deleteStudent(id)`
Деактивировать ученика (мягкое удаление).

```typescript
import { deleteStudent } from './lib/api';

await deleteStudent('student-id');
```

---

## 👨‍🏫 Преподаватели

### `getTeachers()`
Получить всех активных преподавателей.

```typescript
import { getTeachers } from './lib/api';

const teachers = await getTeachers();
```

### `getTeacherById(id)`
Получить преподавателя с группами.

```typescript
import { getTeacherById } from './lib/api';

const teacher = await getTeacherById('teacher-id');
// { id, full_name, groups[], ... }
```

### `createTeacher(data)`
Создать преподавателя.

```typescript
import { createTeacher } from './lib/api';

const teacher = await createTeacher({
  full_name: 'Анна Петрова',
  phone: '+7 999 123 45 67',
  email: 'anna@manera.ru',
  specialization: ['Контемпорари', 'Джаз'],
  hourly_rate: 2500,
});
```

---

## 👥 Группы

### `getGroups()`
Получить все активные группы с участниками.

```typescript
import { getGroups } from './lib/api';

const groups = await getGroups();
// [{ id, name, teacher: {...}, members: [{ student: {...} }], ... }]
```

### `getGroupById(id)`
Получить группу с расписанием.

```typescript
import { getGroupById } from './lib/api';

const group = await getGroupById('group-id');
// { id, name, teacher, members[], schedules[], ... }
```

### `createGroup(data)`
Создать группу.

```typescript
import { createGroup } from './lib/api';

const group = await createGroup({
  name: 'Контемпорари 8-10 лет',
  description: 'Начальный уровень',
  teacher_id: 'teacher-id',
  level: 'Начальный',
  color: '#133C2A',
  max_students: 12,
});
```

---

## 📅 Расписание

### `getSchedules()`
Получить всё расписание.

```typescript
import { getSchedules } from './lib/api';

const schedules = await getSchedules();
// [{ id, group: {...}, teacher: {...}, day_of_week: 2, start_time: '16:00', ... }]
```

### `createSchedule(data)`
Создать занятие в расписании.

```typescript
import { createSchedule } from './lib/api';

const schedule = await createSchedule({
  group_id: 'group-id',
  teacher_id: 'teacher-id',
  day_of_week: 2, // 0=Воскресенье, 1=Понедельник, ...
  start_time: '16:00',
  end_time: '17:30',
  room: 'Зал 1',
});
```

---

## 🎫 Абонементы

### `getSubscriptions()`
Получить все абонементы.

```typescript
import { getSubscriptions } from './lib/api';

const subscriptions = await getSubscriptions();
```

### `getActiveSubscriptions()`
Получить только активные абонементы.

```typescript
import { getActiveSubscriptions } from './lib/api';

const active = await getActiveSubscriptions();
```

### `createSubscription(data)`
Создать абонемент.

```typescript
import { createSubscription } from './lib/api';

const subscription = await createSubscription({
  student_id: 'student-id',
  pricing_id: 'pricing-id',
  group_id: 'group-id',
  status: 'active',
  lessons_total: 8,
  lessons_used: 0,
  start_date: '2024-11-01',
  end_date: '2024-11-30',
  amount: 5600,
});
```

### `updateSubscription(id, updates)`
Обновить абонемент.

```typescript
import { updateSubscription } from './lib/api';

await updateSubscription('subscription-id', {
  lessons_used: 5,
  status: 'active',
});
```

---

## 💳 Платежи

### `getPayments()`
Получить все платежи.

```typescript
import { getPayments } from './lib/api';

const payments = await getPayments();
```

### `createPayment(data)`
Создать платёж.

```typescript
import { createPayment } from './lib/api';

const payment = await createPayment({
  student_id: 'student-id',
  parent_id: 'parent-id',
  subscription_id: 'subscription-id',
  amount: 5600,
  status: 'completed',
  payment_method: 'Банковская карта',
  payment_date: new Date().toISOString(),
});
```

---

## ✅ Посещаемость

### `getAttendance(filters?)`
Получить посещаемость с фильтрами.

```typescript
import { getAttendance } from './lib/api';

// Все посещения
const all = await getAttendance();

// Для конкретного ученика
const studentAttendance = await getAttendance({
  studentId: 'student-id',
  dateFrom: '2024-11-01',
  dateTo: '2024-11-30',
});

// Для группы
const groupAttendance = await getAttendance({
  groupId: 'group-id',
});
```

### `markAttendance(data)`
Отметить посещение.

```typescript
import { markAttendance } from './lib/api';

await markAttendance({
  student_id: 'student-id',
  group_id: 'group-id',
  schedule_id: 'schedule-id',
  lesson_date: '2024-11-21',
  present: true,
  notes: 'Отлично занимался',
});
```

---

## 📋 Задачи

### `getTasks()`
Получить все задачи.

```typescript
import { getTasks } from './lib/api';

const tasks = await getTasks();
```

### `createTask(data)`
Создать задачу.

```typescript
import { createTask } from './lib/api';

const task = await createTask({
  title: 'Закупить коврики',
  description: 'Нужно 15 штук',
  assigned_to: 'user-id',
  created_by: 'user-id',
  priority: 'high',
  status: 'new',
  due_date: '2024-11-25T18:00:00',
});
```

### `updateTask(id, updates)`
Обновить задачу.

```typescript
import { updateTask } from './lib/api';

await updateTask('task-id', {
  status: 'completed',
  completed_at: new Date().toISOString(),
});
```

---

## 🎉 Мероприятия

### `getEvents()`
Получить все мероприятия.

```typescript
import { getEvents } from './lib/api';

const events = await getEvents();
```

### `createEvent(data)`
Создать мероприятие.

```typescript
import { createEvent } from './lib/api';

const event = await createEvent({
  title: 'Новогодний концерт',
  description: 'Праздничное мероприятие',
  event_date: '2024-12-28T18:00:00',
  location: 'Основной зал',
  status: 'upcoming',
  max_participants: 100,
  price: 0,
  created_by: 'user-id',
});
```

### `registerForEvent(eventId, studentId)`
Зарегистрировать ученика на мероприятие.

```typescript
import { registerForEvent } from './lib/api';

await registerForEvent('event-id', 'student-id');
```

---

## 💬 Сообщения

### `getMessages(userId)`
Получить сообщения пользователя.

```typescript
import { getMessages } from './lib/api';

const messages = await getMessages('user-id');
```

### `sendMessage(data)`
Отправить сообщение.

```typescript
import { sendMessage } from './lib/api';

await sendMessage({
  sender_id: 'sender-user-id',
  recipient_id: 'recipient-user-id',
  subject: 'Напоминание',
  content: 'Не забудьте про занятие завтра!',
});
```

### `markMessageAsRead(id)`
Отметить сообщение как прочитанное.

```typescript
import { markMessageAsRead } from './lib/api';

await markMessageAsRead('message-id');
```

---

## 💰 Прайс-лист

### `getPricing()`
Получить все активные тарифы.

```typescript
import { getPricing } from './lib/api';

const pricing = await getPricing();
```

### `createPricing(data)`
Создать тариф.

```typescript
import { createPricing } from './lib/api';

const price = await createPricing({
  name: 'Абонемент 8 занятий',
  description: 'На месяц',
  price: 5600,
  lessons_count: 8,
  validity_days: 30,
  is_trial: false,
  is_active: true,
});
```

---

## 🤖 Автоматизации

### `getAutomations()`
Получить все автоматизации.

```typescript
import { getAutomations } from './lib/api';

const automations = await getAutomations();
```

### `createAutomation(data)`
Создать автоматизацию.

```typescript
import { createAutomation } from './lib/api';

const automation = await createAutomation({
  name: 'Напоминание об абонементе',
  description: 'За 3 дня до окончания',
  trigger: 'subscription_expiring',
  trigger_days: 3,
  action_type: 'email',
  message_template: 'Ваш абонемент заканчивается {{end_date}}',
  is_active: true,
});
```

---

## 📊 Аналитика

### `getAnalyticsMetrics(dateFrom?, dateTo?)`
Получить метрики аналитики.

```typescript
import { getAnalyticsMetrics } from './lib/api';

// Все метрики
const all = await getAnalyticsMetrics();

// За период
const monthly = await getAnalyticsMetrics('2024-11-01', '2024-11-30');
```

### `getDashboardStats()`
Получить статистику для дашборда.

```typescript
import { getDashboardStats } from './lib/api';

const stats = await getDashboardStats();
// {
//   totalStudents: 48,
//   activeSubscriptions: 45,
//   monthlyRevenue: 185000,
//   upcomingEvents: 2
// }
```

---

## 🎨 Использование в компонентах

### Пример: Загрузка учеников

```typescript
import { useEffect, useState } from 'react';
import { getStudents } from './lib/api';
import type { Student } from './lib/supabase';

export function StudentsList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (error) {
      console.error('Ошибка загрузки учеников:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Загрузка...</div>;

  return (
    <div>
      {students.map(student => (
        <div key={student.id}>
          {student.full_name}
        </div>
      ))}
    </div>
  );
}
```

### Пример: Создание ученика

```typescript
import { useState } from 'react';
import { createStudent } from './lib/api';
import { toast } from 'sonner';

export function AddStudentForm() {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      await createStudent({
        parent_id: parentId,
        full_name: name,
        is_active: true,
      });
      
      toast.success('Ученик добавлен!');
    } catch (error) {
      toast.error('Ошибка при добавлении');
      console.error(error);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={name} 
        onChange={(e) => setName(e.target.value)}
        placeholder="Имя ученика"
      />
      <button type="submit">Добавить</button>
    </form>
  );
}
```

---

## 🔒 Row Level Security (RLS)

Все таблицы защищены RLS политиками:

- ✅ **Родители** видят только своих детей
- ✅ **Преподаватели** видят только свои группы
- ✅ **Администраторы** видят операционные данные
- ✅ **Владелец** видит всё включая финансы

**Не нужно проверять доступ в коде** - Supabase делает это автоматически!

---

## 🆘 Обработка ошибок

Все функции могут выбрасывать ошибки. Всегда используйте try/catch:

```typescript
try {
  const students = await getStudents();
  // Успех
} catch (error) {
  console.error('Ошибка:', error);
  toast.error('Не удалось загрузить данные');
}
```

---

## 📱 Real-time обновления

Для real-time обновлений используйте Supabase Realtime:

```typescript
import { supabase } from './lib/supabase';

// Подписка на изменения в таблице students
supabase
  .channel('students-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'students' },
    (payload) => {
      console.log('Изменение:', payload);
      // Обновить UI
    }
  )
  .subscribe();
```

---

**Готово!** 🎉 Теперь вы можете использовать все функции API в вашем CRM.
