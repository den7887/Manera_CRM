# 🔌 Руководство по интеграции Frontend с Supabase

## 📋 Обзор

Ваш CRM сейчас работает с mock данными. Это руководство покажет, как подключить реальную базу данных Supabase к существующим компонентам.

---

## 🎯 Стратегия интеграции

### Этапы:
1. ✅ **Backend готов** (SQL миграции, RLS)
2. ✅ **API функции готовы** (`/lib/api.ts`)
3. 🔄 **Интеграция компонентов** ← Сейчас здесь
4. 🧪 **Тестирование**
5. 🚀 **Production**

---

## 🛠️ Как интегрировать компонент

### Общий паттерн:

**Было (с mock данными):**
```typescript
import { mockStudents } from '../data/mockData';

function StudentsList() {
  const students = mockStudents;
  
  return (
    <div>
      {students.map(student => (
        <div key={student.id}>{student.name}</div>
      ))}
    </div>
  );
}
```

**Стало (с Supabase):**
```typescript
import { useEffect, useState } from 'react';
import { getStudents } from '../lib/api';
import type { Student } from '../lib/supabase';

function StudentsList() {
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
      toast.error('Не удалось загрузить учеников');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Загрузка...</div>;

  return (
    <div>
      {students.map(student => (
        <div key={student.id}>{student.full_name}</div>
      ))}
    </div>
  );
}
```

---

## 📁 Интеграция по компонентам

### 1. ParentDashboard

**Файл:** `/components/parent/ParentDashboard.tsx`

**Что интегрировать:**
- Список детей
- Расписание
- Абонементы
- Платежи
- События

**Пример интеграции:**

```typescript
import { useEffect, useState } from 'react';
import { getStudents, getSchedules, getActiveSubscriptions, getPayments, getEvents } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function ParentDashboard() {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Загрузить детей родителя
      const studentsData = await getStudents();
      setChildren(studentsData);

      // Загрузить расписание
      const schedulesData = await getSchedules();
      setSchedules(schedulesData);

      // И так далее...
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  }

  // Rest of component...
}
```

---

### 2. AdminDashboard - Ученики

**Файл:** `/components/admin/AdminStudents.tsx`

**Что делать:**
```typescript
import { getStudents, createStudent, updateStudent, deleteStudent } from '../../lib/api';

export function AdminStudents() {
  const [students, setStudents] = useState([]);

  // Загрузка
  async function loadStudents() {
    const data = await getStudents();
    setStudents(data);
  }

  // Создание
  async function handleCreate(formData) {
    await createStudent({
      parent_id: formData.parentId,
      full_name: formData.name,
      date_of_birth: formData.birthDate,
      is_active: true,
    });
    toast.success('Ученик добавлен!');
    loadStudents(); // Обновить список
  }

  // Редактирование
  async function handleEdit(id, updates) {
    await updateStudent(id, updates);
    toast.success('Изменения сохранены!');
    loadStudents();
  }

  // Удаление (мягкое)
  async function handleDelete(id) {
    await deleteStudent(id);
    toast.success('Ученик деактивирован');
    loadStudents();
  }

  // Rest of component...
}
```

---

### 3. TeacherDashboard - Посещаемость

**Файл:** `/components/teacher/TeacherAttendance.tsx`

```typescript
import { getAttendance, markAttendance } from '../../lib/api';

export function TeacherAttendance({ groupId }) {
  const [attendance, setAttendance] = useState([]);

  // Загрузить посещаемость группы за последний месяц
  async function loadAttendance() {
    const dateFrom = new Date();
    dateFrom.setMonth(dateFrom.getMonth() - 1);

    const data = await getAttendance({
      groupId,
      dateFrom: dateFrom.toISOString().split('T')[0],
    });
    
    setAttendance(data);
  }

  // Отметить посещение
  async function handleMarkPresent(studentId, lessonDate, present) {
    await markAttendance({
      student_id: studentId,
      group_id: groupId,
      lesson_date: lessonDate,
      present: present,
    });
    
    toast.success('Посещение отмечено!');
    loadAttendance();
  }

  // Rest of component...
}
```

---

### 4. OwnerDashboard - Финансы

**Файл:** `/components/owner/OwnerFinance.tsx`

```typescript
import { getPayments, getAnalyticsMetrics, getDashboardStats } from '../../lib/api';

export function OwnerFinance() {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [metrics, setMetrics] = useState([]);

  async function loadFinancialData() {
    // Все платежи
    const paymentsData = await getPayments();
    setPayments(paymentsData);

    // Статистика дашборда
    const statsData = await getDashboardStats();
    setStats(statsData);

    // Метрики за последние 30 дней
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
    
    const metricsData = await getAnalyticsMetrics(
      dateFrom.toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    );
    setMetrics(metricsData);
  }

  // Рассчитать месячную выручку
  const monthlyRevenue = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Rest of component...
}
```

---

### 5. Сообщения

**Файл:** `/components/Messages.tsx`

```typescript
import { getMessages, sendMessage, markMessageAsRead } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function Messages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);

  // Загрузить сообщения пользователя
  async function loadMessages() {
    const data = await getMessages(user.id);
    setMessages(data);
  }

  // Отправить сообщение
  async function handleSend(recipientId, subject, content) {
    await sendMessage({
      sender_id: user.id,
      recipient_id: recipientId,
      subject,
      content,
    });
    
    toast.success('Сообщение отправлено!');
  }

  // Отметить как прочитанное
  async function handleMarkRead(messageId) {
    await markMessageAsRead(messageId);
    loadMessages(); // Обновить список
  }

  // Rest of component...
}
```

---

### 6. Задачи

**Файл:** `/components/admin/AdminTasks.tsx`

```typescript
import { getTasks, createTask, updateTask } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

export function AdminTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);

  async function loadTasks() {
    const data = await getTasks();
    setTasks(data);
  }

  async function handleCreateTask(taskData) {
    await createTask({
      title: taskData.title,
      description: taskData.description,
      assigned_to: taskData.assignedTo,
      created_by: user.id,
      priority: taskData.priority,
      status: 'new',
      due_date: taskData.dueDate,
    });
    
    toast.success('Задача создана!');
    loadTasks();
  }

  async function handleComplete(taskId) {
    await updateTask(taskId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
    
    toast.success('Задача выполнена!');
    loadTasks();
  }

  // Rest of component...
}
```

---

## 🎨 Custom Hooks для переиспользования

### useStudents.ts

```typescript
import { useEffect, useState } from 'react';
import { getStudents } from '../lib/api';
import type { Student } from '../lib/supabase';

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  return { students, loading, error, refresh: loadStudents };
}
```

**Использование:**
```typescript
function StudentsList() {
  const { students, loading, error, refresh } = useStudents();

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error.message}</div>;

  return (
    <div>
      {students.map(student => (
        <div key={student.id}>{student.full_name}</div>
      ))}
      <Button onClick={refresh}>Обновить</Button>
    </div>
  );
}
```

---

## 🔄 Real-time обновления

### Подписка на изменения

```typescript
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtimeStudents() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    // Загрузить начальные данные
    loadStudents();

    // Подписаться на изменения
    const channel = supabase
      .channel('students-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'students' },
        (payload) => {
          console.log('Change received!', payload);
          loadStudents(); // Перезагрузить данные
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadStudents() {
    const data = await getStudents();
    setStudents(data);
  }

  return students;
}
```

---

## ⚡ Оптимизация производительности

### 1. Пагинация

```typescript
async function loadStudentsPaginated(page = 1, pageSize = 20) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .range((page - 1) * pageSize, page * pageSize - 1)
    .order('full_name');

  return data;
}
```

### 2. Кэширование с React Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { getStudents } from '../lib/api';

export function useStudentsQuery() {
  return useQuery({
    queryKey: ['students'],
    queryFn: getStudents,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}
```

### 3. Optimistic updates

```typescript
async function handleUpdateStudent(id, updates) {
  // Сразу обновить UI (оптимистично)
  setStudents(prev => 
    prev.map(s => s.id === id ? { ...s, ...updates } : s)
  );

  try {
    // Отправить на сервер
    await updateStudent(id, updates);
  } catch (error) {
    // Откатить изменения при ошибке
    loadStudents();
    toast.error('Ошибка сохранения');
  }
}
```

---

## 🔍 Поиск и фильтрация

### На стороне сервера

```typescript
async function searchStudents(query: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .ilike('full_name', `%${query}%`)
    .limit(10);

  return data;
}
```

### С дебаунсом

```typescript
import { useState, useEffect } from 'react';
import { useDebounce } from './useDebounce';

export function StudentsSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (debouncedQuery) {
      searchStudents(debouncedQuery).then(setResults);
    }
  }, [debouncedQuery]);

  return (
    <div>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск учеников..."
      />
      {/* Results */}
    </div>
  );
}
```

---

## 📊 Агрегация данных

### Подсчёт статистики

```typescript
async function getGroupStatistics(groupId: string) {
  // Количество учеников
  const { count: studentCount } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId);

  // Средняя посещаемость за месяц
  const dateFrom = new Date();
  dateFrom.setMonth(dateFrom.getMonth() - 1);

  const { data: attendance } = await supabase
    .from('attendance')
    .select('present')
    .eq('group_id', groupId)
    .gte('lesson_date', dateFrom.toISOString());

  const averageAttendance = attendance
    ? (attendance.filter(a => a.present).length / attendance.length) * 100
    : 0;

  return {
    studentCount: studentCount || 0,
    averageAttendance: Math.round(averageAttendance),
  };
}
```

---

## 🧪 Тестирование интеграции

### 1. Проверить подключение

```typescript
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('count')
      .limit(1);

    if (error) throw error;
    
    console.log('✅ Supabase подключён успешно');
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к Supabase:', error);
    return false;
  }
}
```

### 2. Проверить права доступа

```typescript
async function testRLS() {
  const { user } = await supabase.auth.getUser();
  
  if (!user) {
    console.log('❌ Пользователь не авторизован');
    return;
  }

  // Попробовать получить данные
  const { data, error } = await supabase
    .from('students')
    .select('*');

  if (error) {
    console.error('❌ RLS блокирует доступ:', error);
  } else {
    console.log('✅ RLS работает корректно, получено записей:', data.length);
  }
}
```

---

## 📝 Чек-лист интеграции

### Для каждого компонента:

- [ ] Импортировать нужные API функции из `/lib/api.ts`
- [ ] Добавить state для данных, loading, error
- [ ] Создать функцию загрузки данных
- [ ] Вызвать в useEffect при монтировании
- [ ] Добавить loading состояние
- [ ] Обработать ошибки с toast
- [ ] Заменить mock данные на реальные
- [ ] Обновить типы (использовать типы из `/lib/supabase.ts`)
- [ ] Добавить refresh функцию
- [ ] Протестировать CRUD операции

### Общий чек-лист:

- [ ] AuthContext интегрирован
- [ ] Все компоненты обновлены
- [ ] Loading состояния работают
- [ ] Ошибки отображаются
- [ ] Toast уведомления работают
- [ ] Real-time обновления (если нужны)
- [ ] Производительность приемлемая
- [ ] Нет утечек памяти
- [ ] Все CRUD операции работают
- [ ] RLS работает корректно

---

## 🚀 Готово к интеграции!

После прохождения всех шагов ваш frontend будет полностью подключён к Supabase backend.

**Следующие шаги:**
1. ✅ Интегрировать по одному компоненту
2. ✅ Тестировать каждый компонент отдельно
3. ✅ Проверять в разных ролях
4. ✅ Оптимизировать производительность
5. ✅ Добавить обработку ошибок везде

**Успехов с интеграцией! 🎉**
