# 🔐 Настройка аутентификации в CRM "Manera"

## 📋 Обзор

В текущей версии используются моковые данные для демонстрации. Для production необходимо настроить реальную аутентификацию через Supabase Auth.

---

## 🎯 Что нужно сделать

### Вариант 1: Email/Password (Рекомендуется для старта)
### Вариант 2: Magic Link (Email без пароля)
### Вариант 3: Social Auth (Google, Facebook, etc.)

---

## 🔧 Вариант 1: Email/Password

### Шаг 1: Включить в Supabase

1. Откройте Supabase Dashboard
2. Перейдите в **Authentication** → **Providers**
3. Найдите **Email**
4. Убедитесь что **Enable Email provider** включён ✅
5. Настройте:
   - **Confirm email**: включить/выключить (рекомендуется включить для production)
   - **Secure email change**: включить
   - **Secure password change**: включить

---

### Шаг 2: Настройка Email Templates

#### Если НЕТ своего SMTP:

Supabase будет отправлять emails со своего сервера (ограничено для production).

**Для тестирования - достаточно!**

#### Если ЕСТЬ свой SMTP (рекомендуется для production):

1. В Supabase Dashboard → **Project Settings** → **Auth**
2. Найдите **SMTP Settings**
3. Заполните:
   ```
   Host: smtp.gmail.com (или ваш SMTP)
   Port: 587
   Username: your-email@gmail.com
   Password: your-app-password
   Sender email: noreply@manera.ru
   Sender name: CRM Manera
   ```

**Для Gmail:**
- Включите "2-Step Verification"
- Создайте "App Password": https://myaccount.google.com/apppasswords

---

### Шаг 3: Создание пользователей

#### Через Supabase Dashboard (Для первых пользователей):

1. **Authentication** → **Users** → **Invite User**
2. Введите email
3. Пользователь получит письмо с приглашением
4. После регистрации добавьте роль в таблицу `users`:

```sql
-- В SQL Editor
UPDATE users 
SET role = 'owner' 
WHERE email = 'owner@manera.ru';
```

#### Через API (Программно):

Используйте функцию регистрации:

```typescript
// В вашем коде
import { supabase } from './lib/supabase';

async function registerUser(email: string, password: string, fullName: string, role: 'parent' | 'teacher' | 'admin' | 'owner') {
  // 1. Создать пользователя в Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      }
    }
  });

  if (authError) throw authError;

  // 2. Добавить в таблицу users
  const { error: dbError } = await supabase
    .from('users')
    .insert({
      id: authData.user!.id,
      email,
      role,
      full_name: fullName,
      is_active: true,
    });

  if (dbError) throw dbError;

  // 3. Если родитель, создать запись в parents
  if (role === 'parent') {
    await supabase
      .from('parents')
      .insert({
        user_id: authData.user!.id,
        full_name: fullName,
        email,
      });
  }

  // 4. Если преподаватель, создать запись в teachers
  if (role === 'teacher') {
    await supabase
      .from('teachers')
      .insert({
        user_id: authData.user!.id,
        full_name: fullName,
        email,
      });
  }

  return authData.user;
}
```

---

### Шаг 4: Обновить компонент Login

Текущий компонент `/components/auth/Login.tsx` использует телефон и OTP.

#### Создайте новый компонент LoginEmail.tsx:

```typescript
import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

export function LoginEmail({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success('Вход выполнен успешно!');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="owner@manera.ru"
          required
        />
      </div>

      <div>
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Вход...' : 'Войти'}
      </Button>
    </form>
  );
}
```

---

### Шаг 5: Обновить App.tsx

```typescript
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginEmail } from './components/auth/LoginEmail';
import { ParentDashboard } from './components/parent/ParentDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { OwnerDashboard } from './components/owner/OwnerDashboard';

function AppContent() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Загрузка...</div>
    </div>;
  }

  if (!user) {
    return <LoginEmail onSuccess={() => window.location.reload()} />;
  }

  // Отображаем дашборд в зависимости от роли
  if (role === 'parent') return <ParentDashboard />;
  if (role === 'teacher') return <TeacherDashboard />;
  if (role === 'admin') return <AdminDashboard />;
  if (role === 'owner') return <OwnerDashboard />;

  return <div>Неизвестная роль</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
```

---

## 🔧 Вариант 2: Magic Link (Вход по email без пароля)

### Преимущества:
- ✅ Не нужно запоминать пароль
- ✅ Безопаснее (не может быть украден пароль)
- ✅ Быстрее для пользователей

### Настройка:

```typescript
async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: 'https://manera.ru/auth/callback',
    }
  });

  if (error) throw error;
  
  toast.success('Проверьте email! Письмо с ссылкой для входа отправлено.');
}
```

### Компонент:

```typescript
export function MagicLinkLogin() {
  const [email, setEmail] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await sendMagicLink(email);
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <Button type="submit">Отправить ссылку</Button>
    </form>
  );
}
```

---

## 🔧 Вариант 3: Social Authentication (Google, VK, etc.)

### Google Authentication:

#### Шаг 1: Настроить Google OAuth

1. Перейдите на https://console.cloud.google.com
2. Создайте новый проект (или выберите существующий)
3. Включите **Google+ API**
4. Создайте **OAuth 2.0 Client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`
5. Скопируйте **Client ID** и **Client Secret**

#### Шаг 2: Настроить в Supabase

1. **Authentication** → **Providers**
2. Найдите **Google**
3. Включите **Enable Google provider**
4. Вставьте **Client ID** и **Client Secret**
5. Сохраните

#### Шаг 3: Добавить кнопку в Login

```typescript
async function handleGoogleLogin() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://manera.ru/auth/callback',
    }
  });

  if (error) {
    toast.error('Ошибка входа через Google');
  }
}
```

```tsx
<Button onClick={handleGoogleLogin} variant="outline" className="w-full">
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
    {/* Google icon */}
  </svg>
  Войти через Google
</Button>
```

---

## 🔄 Обработка redirect после OAuth

Создайте страницу `/auth/callback`:

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase автоматически обработает callback
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/dashboard');
      }
    });
  }, [navigate]);

  return <div>Вход...</div>;
}
```

---

## 🔒 Безопасность

### 1. Password политики

В Supabase Dashboard → **Authentication** → **Auth** → **Password Policy**:

```
Minimum password length: 8
Require lowercase: Yes
Require uppercase: Yes
Require numbers: Yes
Require special characters: Yes
```

### 2. Rate limiting

Supabase автоматически ограничивает:
- 5 попыток входа за 10 минут
- Защита от brute force

### 3. Session управление

```typescript
// Автоматическое обновление токена
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed');
  }
});

// Принудительный выход
async function forceLogout() {
  await supabase.auth.signOut();
}
```

---

## 📧 Email Templates

### Кастомизация писем

В Supabase Dashboard → **Authentication** → **Email Templates**:

1. **Confirm signup** - Подтверждение email
2. **Magic Link** - Вход без пароля
3. **Change Email Address** - Смена email
4. **Reset Password** - Сброс пароля

### Пример кастомного шаблона:

```html
<h2>Добро пожаловать в CRM Manera!</h2>
<p>Здравствуйте, {{ .Email }}!</p>
<p>Нажмите кнопку ниже, чтобы подтвердить email:</p>
<a href="{{ .ConfirmationURL }}">Подтвердить email</a>

<style>
  body { font-family: Arial, sans-serif; }
  a { 
    background: #133C2A; 
    color: white; 
    padding: 12px 24px; 
    text-decoration: none;
    border-radius: 8px;
    display: inline-block;
  }
</style>
```

---

## 🧪 Тестирование

### Локальное тестирование:

1. **Создайте тестового пользователя:**
```bash
# В Supabase SQL Editor
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES (
  'test@manera.ru',
  crypt('password123', gen_salt('bf')),
  NOW()
);
```

2. **Проверьте вход:**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@manera.ru',
  password: 'password123',
});
```

---

## 🆘 Частые проблемы

### Проблема: "Email not confirmed"

**Решение:**
```sql
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'user@email.com';
```

### Проблема: "Invalid login credentials"

**Решения:**
1. Проверьте правильность email/пароля
2. Убедитесь что пользователь существует в `auth.users`
3. Проверьте что email подтверждён

### Проблема: Письма не приходят

**Решения:**
1. Проверьте папку "Спам"
2. Настройте свой SMTP
3. Используйте Resend или SendGrid для production

---

## 📱 Mobile Apps

### React Native

Используйте `@supabase/supabase-js` точно так же:

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

---

## ✅ Чек-лист готовности

- [ ] Email provider включён в Supabase
- [ ] SMTP настроен (для production)
- [ ] Email templates кастомизированы
- [ ] Создан компонент LoginEmail
- [ ] AuthContext интегрирован
- [ ] Password политики настроены
- [ ] Rate limiting работает
- [ ] Тестовые пользователи созданы
- [ ] Проверен вход/выход
- [ ] Проверено восстановление пароля
- [ ] Проверена смена пароля

---

## 🚀 Production Ready!

После прохождения всех шагов ваша аутентификация готова к production использованию!

**Рекомендации:**
1. ✅ Используйте Magic Link для родителей (проще)
2. ✅ Email/Password для администраторов (надёжнее)
3. ✅ Настройте собственный SMTP
4. ✅ Включите 2FA для владельца
5. ✅ Мониторьте попытки входа

**Безопасной работы! 🔐**
