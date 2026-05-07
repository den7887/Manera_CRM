import { useMemo, useEffect, useRef, useState } from 'react';
import { Landing } from './components/Landing';
import { Login } from './components/auth/Login';
import { OTPVerification } from './components/auth/OTPVerification';
import { ParentDashboard } from './components/parent/ParentDashboard';
import { OwnerDashboard } from './components/owner/OwnerDashboard';
import { Toaster } from './components/ui/sonner';
import { UserRole, Task, Notification, News, Document, Payment, Child, User, Event, Group, Employee, FinanceStats, MonthlyData, Expense } from './types';
import { mockUsers } from './data/mockData';
import { createNewsNotification, createEventNotification, createEventUpdateNotification } from './utils/notifications';
import {
  confirmManualPayment,
  createProviderPayment,
  clearAuth,
  createDocument as createDocumentApi,
  createNews as createNewsApi,
  createTask as createTaskApi,
  deleteDocument as deleteDocumentApi,
  deleteNews as deleteNewsApi,
  getStoredRole,
  loadCurrentUser,
  loadParentAccess,
  loadParentChildren,
  loadParentEvents,
  loadParentPayments,
  loadDocuments,
  loadMyNotifications,
  loadNews,
  loadOwnerAutomations,
  loadOwnerEmployees,
  loadOwnerExpenses,
  loadOwnerFinanceSummary,
  loadOwnerGroups,
  loadOwnerNotifications,
  loadTasks,
  logout as logoutApi,
  ParentAccessInfo,
  BackendUser,
  markAllNotificationsRead,
  markNotificationRead,
  sendProviderPaymentWebhook,
  startOtp,
  updateDocument as updateDocumentApi,
  updateNews as updateNewsApi,
  verifyOtp,
} from './lib/backendApi';

type AppState = 'landing' | 'login' | 'otp' | 'dashboard';

function parseWeekdays(scheduleValue: string): number[] {
  const aliases: Record<number, string[]> = {
    1: ['пн', 'пон', 'понедельник', 'mon', 'monday'],
    2: ['вт', 'вто', 'вторник', 'tue', 'tuesday'],
    3: ['ср', 'сре', 'среда', 'wed', 'wednesday'],
    4: ['чт', 'чет', 'четверг', 'thu', 'thursday'],
    5: ['пт', 'пят', 'пятница', 'fri', 'friday'],
    6: ['сб', 'суб', 'суббота', 'sat', 'saturday'],
    0: ['вс', 'воск', 'воскресенье', 'sun', 'sunday'],
  };
  const tokens = scheduleValue
    .toLowerCase()
    .split(/[^a-zA-Zа-яА-Я0-9]+/)
    .filter(Boolean);
  const result = new Set<number>();
  for (const token of tokens) {
    Object.entries(aliases).forEach(([weekdayText, names]) => {
      if (names.some((name) => token === name || token.startsWith(name))) {
        result.add(Number(weekdayText));
      }
    });
  }
  return Array.from(result.values()).sort();
}

function parseTimeRange(value: string): { start: string; end: string } | null {
  const match = value.match(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }
  const [, sh, sm, eh, em] = match;
  const startH = Number(sh);
  const startM = Number(sm);
  const endH = Number(eh);
  const endM = Number(em);
  if (
    !Number.isFinite(startH) ||
    !Number.isFinite(startM) ||
    !Number.isFinite(endH) ||
    !Number.isFinite(endM) ||
    startH > 23 ||
    endH > 23 ||
    startM > 59 ||
    endM > 59
  ) {
    return null;
  }
  return {
    start: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
    end: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
  };
}

function buildOwnerEvents(groups: Group[], employees: Employee[]): Event[] {
  const today = new Date();
  const employeeNameById = new Map(employees.map((employee) => [employee.id, employee.name]));
  const seen = new Set<string>();
  const rows: Event[] = [];

  groups.forEach((group) => {
    const scheduleSource = `${group.schedule || ''} ${String((group as any).time || '')}`.trim();
    const weekdays = parseWeekdays(scheduleSource);
    const timeRange = parseTimeRange(String((group as any).time || group.schedule || ''));
    if (weekdays.length === 0 || !timeRange) {
      return;
    }

    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(today.getDate() + offset);
      if (date.getDay() !== undefined && !weekdays.includes(date.getDay())) {
        continue;
      }

      const [startHour, startMinute] = timeRange.start.split(':').map(Number);
      date.setHours(startHour, startMinute, 0, 0);
      const key = `${group.id}|${date.toISOString().slice(0, 10)}|${timeRange.start}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      rows.push({
        id: `owner-event-${group.id}-${date.toISOString().slice(0, 10)}-${timeRange.start.replace(':', '')}`,
        title: 'Занятие',
        groupId: group.id,
        groupName: group.name,
        date,
        startTime: timeRange.start,
        endTime: timeRange.end,
        teacherId: group.teacherId || '',
        teacherName: group.teacherName || employeeNameById.get(group.teacherId || '') || 'Преподаватель',
      });
    }
  });

  return rows.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export default function App() {
  const emptyOwnerStats: FinanceStats = {
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    revenueGrowth: 0,
    churnRate: 0,
    trialConversion: 0,
  };

  const [appState, setAppState] = useState<AppState>('landing');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('parent');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newsEvents, setNewsEvents] = useState<News[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [parentAccess, setParentAccess] = useState<ParentAccessInfo | null>(null);
  const [parentChildren, setParentChildren] = useState<Child[]>([]);
  const [parentEvents, setParentEvents] = useState<Event[]>([]);
  const [parentPayments, setParentPayments] = useState<Payment[]>([]);
  const [isParentStateLoading, setIsParentStateLoading] = useState(false);
  const [ownerGroups, setOwnerGroups] = useState<Group[]>([]);
  const [ownerEmployees, setOwnerEmployees] = useState<Employee[]>([]);
  const [ownerStats, setOwnerStats] = useState<FinanceStats>(emptyOwnerStats);
  const [ownerMonthlyData, setOwnerMonthlyData] = useState<MonthlyData[]>([]);
  const [ownerExpenses, setOwnerExpenses] = useState<Expense[]>([]);
  const [ownerAutomationCount, setOwnerAutomationCount] = useState(0);
  const parentSyncInFlightRef = useRef(false);
  const isRealDashboardRole = appState === 'dashboard' && (currentUserRole === 'parent' || currentUserRole === 'owner');
  const shouldUseMocks = !isRealDashboardRole;
  const isBackendParentSession = currentUserRole === 'parent' && (backendUser !== null || parentAccess !== null);
  const isBackendOwnerSession = currentUserRole === 'owner' && backendUser !== null;

  const fallbackUser = mockUsers.find(u => u.role === currentUserRole) || mockUsers[0];
  const currentUser: User = backendUser ?? (
    shouldUseMocks
      ? fallbackUser
      : {
          id: `session-${currentUserRole}`,
          name: currentUserRole === 'owner' ? 'Владелец' : 'Родитель',
          phone: '',
          role: currentUserRole,
        }
  );
  const userChildren = currentUserRole === 'parent'
    ? (isBackendParentSession ? parentChildren : [])
    : [];
  const userEvents = currentUserRole === 'parent'
    ? (isBackendParentSession ? parentEvents : [])
    : [];
  const userPayments = currentUserRole === 'parent'
    ? (isBackendParentSession ? parentPayments : [])
    : [];
  const ownerScheduleEvents = useMemo(
    () => buildOwnerEvents(ownerGroups, ownerEmployees),
    [ownerGroups, ownerEmployees],
  );

  const syncParentState = async () => {
    if (parentSyncInFlightRef.current) {
      return;
    }
    parentSyncInFlightRef.current = true;
    setIsParentStateLoading(true);
    try {
      const [
        serverUser,
        accessInfo,
        payments,
        children,
        events,
        parentNews,
        parentNotifications,
        parentDocuments,
      ] = await Promise.allSettled([
        loadCurrentUser(),
        loadParentAccess(),
        loadParentPayments(),
        loadParentChildren(),
        loadParentEvents(),
        loadNews(),
        loadMyNotifications(),
        loadDocuments(),
      ]);

      setBackendUser(serverUser.status === 'fulfilled' ? serverUser.value : null);
      setParentAccess(accessInfo.status === 'fulfilled' ? accessInfo.value : null);
      const resolvedPayments = payments.status === 'fulfilled' ? payments.value : [];
      setParentPayments(resolvedPayments);
      setParentChildren(children.status === 'fulfilled' ? children.value : []);
      setParentEvents(events.status === 'fulfilled' ? events.value : []);
      const resolvedNews = parentNews.status === 'fulfilled' ? parentNews.value : [];
      setNewsEvents(resolvedNews);
      setNotifications(parentNotifications.status === 'fulfilled' ? parentNotifications.value : []);
      setDocuments(parentDocuments.status === 'fulfilled' ? parentDocuments.value : []);
    } finally {
      setIsParentStateLoading(false);
      parentSyncInFlightRef.current = false;
    }
  };

  const syncServerState = async (role?: UserRole) => {
    const effectiveRole = role ?? currentUserRole;

    if (effectiveRole === 'parent') {
      await syncParentState();
      setTasks([]);
      setOwnerGroups([]);
      setOwnerEmployees([]);
      setOwnerStats(emptyOwnerStats);
      setOwnerMonthlyData([]);
      setOwnerExpenses([]);
      setOwnerAutomationCount(0);
      return;
    }

    try {
      const user = await loadCurrentUser();
      setBackendUser(user);
    } catch {
      setBackendUser(null);
    }
    setParentAccess(null);
    setParentPayments([]);
    setParentChildren([]);
    setParentEvents([]);
    setIsParentStateLoading(false);

    if (effectiveRole === 'owner') {
      const [serverTasks, serverNews, serverDocuments, groups, employees, financeSummary, expenses, automations, ownerNotifications] = await Promise.allSettled([
        loadTasks(),
        loadNews(),
        loadDocuments(),
        loadOwnerGroups(),
        loadOwnerEmployees(),
        loadOwnerFinanceSummary(),
        loadOwnerExpenses(),
        loadOwnerAutomations(),
        loadOwnerNotifications({ status_filter: 'all', limit: 1000 }),
      ]);
      setTasks(serverTasks.status === 'fulfilled' ? serverTasks.value : []);
      setNewsEvents(serverNews.status === 'fulfilled' ? serverNews.value : []);
      setDocuments(serverDocuments.status === 'fulfilled' ? serverDocuments.value : []);
      setOwnerGroups(groups.status === 'fulfilled' ? groups.value : []);
      setOwnerEmployees(employees.status === 'fulfilled' ? employees.value : []);
      setOwnerStats(financeSummary.status === 'fulfilled' ? financeSummary.value.stats : emptyOwnerStats);
      setOwnerMonthlyData(financeSummary.status === 'fulfilled' ? financeSummary.value.monthlyData : []);
      setOwnerExpenses(expenses.status === 'fulfilled' ? expenses.value : []);
      setOwnerAutomationCount(automations.status === 'fulfilled' ? automations.value.length : 0);
      setNotifications(ownerNotifications.status === 'fulfilled' ? ownerNotifications.value : []);
      return;
    }

    setTasks([]);
    setNewsEvents([]);
    setDocuments([]);
    setNotifications([]);
    setOwnerGroups([]);
    setOwnerEmployees([]);
    setOwnerStats(emptyOwnerStats);
    setOwnerMonthlyData([]);
    setOwnerExpenses([]);
    setOwnerAutomationCount(0);
  };

  useEffect(() => {
    const savedRole = getStoredRole();
    const savedToken = window.localStorage.getItem('manera_crm_token');
    const allowedRole = savedRole === 'owner' || savedRole === 'parent' ? savedRole : null;
    if (allowedRole) {
      setCurrentUserRole(allowedRole);
      setAppState('dashboard');
    } else if (savedRole) {
      clearAuth();
      setCurrentUserRole('parent');
      setAppState('landing');
    }
    if (savedRole && !allowedRole) {
      return;
    }
    if (!savedToken) {
      if (savedRole) {
        clearAuth();
      }
      setAppState('landing');
      return;
    }

    const bootstrap = async () => {
      try {
        const serverUser = await loadCurrentUser();
        const serverRole = serverUser.role;
        if (serverRole !== 'owner' && serverRole !== 'parent') {
          clearAuth();
          setCurrentUserRole('parent');
          setAppState('landing');
          return;
        }
        if (allowedRole !== serverRole) {
          setCurrentUserRole(serverRole);
        }
        await syncServerState(serverRole);
      } catch {
        clearAuth();
        setCurrentUserRole('parent');
        setAppState('landing');
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (appState !== 'dashboard' || currentUserRole !== 'parent') {
      return;
    }

    const refresh = () => {
      void syncParentState();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        refresh();
      }
    }, 30000);

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [appState, currentUserRole]);

  const handleLogin = async (phone: string) => {
    await startOtp(phone);
    setPhoneNumber(phone);
    setAppState('otp');
  };

  const handleVerify = async (otp: string) => {
    const role = await verifyOtp(phoneNumber, otp);
    if (role !== 'owner' && role !== 'parent') {
      throw new Error('Вход для этой роли отключен');
    }

    try {
      await syncServerState(role);
    } catch {
      // Если backend недоступен, дашборды продолжают работать на моках.
    }

    setCurrentUserRole(role);
    setAppState('dashboard');
  };

  const handleLogout = () => {
    void logoutApi();
    clearAuth();
    setAppState('landing');
    setPhoneNumber('');
    setBackendUser(null);
    setParentAccess(null);
    setParentPayments([]);
    setParentChildren([]);
    setParentEvents([]);
    setIsParentStateLoading(false);
    setDocuments([]);
    setOwnerGroups([]);
    setOwnerEmployees([]);
    setOwnerStats(emptyOwnerStats);
    setOwnerMonthlyData([]);
    setOwnerExpenses([]);
    setOwnerAutomationCount(0);
  };

  const handleGuestBrowse = () => {
    // For demo, just show landing page with scroll to pricing
    window.scrollTo({ top: 600, behavior: 'smooth' });
  };

  // Функция для добавления задачи
  const addTask = (task: Task) => {
    setTasks((prev) => [task, ...prev]);
    createTaskApi(task)
      .then((createdTask) => {
        setTasks((prev) => prev.map((item) => (item.id === task.id ? createdTask : item)));
      })
      .catch(() => {
        // При ошибке API оставляем оптимистичное локальное состояние.
      });
  };

  // Функция для добавления уведомления
  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  // Функции для управления новостями и мероприятиями
  const handleCreateNewsEvent = (newsEvent: Partial<News>) => {
    const newNewsEvent: News = {
      id: `news-${Date.now()}`,
      title: newsEvent.title || '',
      content: newsEvent.content || '',
      date: new Date(),
      published: newsEvent.published ?? false,
      image: newsEvent.image,
      isEvent: newsEvent.isEvent ?? false,
      eventType: newsEvent.eventType,
      eventDate: newsEvent.eventDate,
      eventLocation: newsEvent.eventLocation,
      eventFee: newsEvent.eventFee,
      eventDeadline: newsEvent.eventDeadline,
      requiresPayment: newsEvent.requiresPayment,
      maxParticipants: newsEvent.maxParticipants,
      currentParticipants: newsEvent.currentParticipants ?? 0,
    };

    setNewsEvents((prev) => [newNewsEvent, ...prev]);

    createNewsApi(newNewsEvent)
      .then((createdNews) => {
        setNewsEvents((prev) => prev.map((item) => (item.id === newNewsEvent.id ? createdNews : item)));
      })
      .catch(() => {
        // При ошибке API оставляем локально созданную запись.
      });

    // Создаем уведомление для родителей, если публикуется
    if (newNewsEvent.published) {
      if (newNewsEvent.isEvent) {
        addNotification(createEventNotification(newNewsEvent));
      } else {
        addNotification(createNewsNotification(newNewsEvent));
      }
    }
  };

  const handleUpdateNewsEvent = (id: string, updates: Partial<News>) => {
    updateNewsApi(id, updates).catch(() => {
      // Локальное состояние уже обновится ниже.
    });

    setNewsEvents(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, ...updates };
          
          // Если мероприятие только что опубликовали
          if (!item.published && updates.published && updatedItem.isEvent) {
            addNotification(createEventNotification(updatedItem));
          }
          // Если новость только что опубликовали
          else if (!item.published && updates.published && !updatedItem.isEvent) {
            addNotification(createNewsNotification(updatedItem));
          }
          // Если уже было опубликовано и обновили важные поля мероприятия
          else if (item.published && updatedItem.isEvent && 
                   (updates.eventDate || updates.eventLocation || updates.eventFee || updates.eventDeadline)) {
            addNotification(createEventUpdateNotification(updatedItem));
          }
          
          return updatedItem;
        }
        return item;
      });
      return updated;
    });
  };

  const handleDeleteNewsEvent = (id: string) => {
    deleteNewsApi(id).catch(() => {
      // Не блокируем UI при сбое API.
    });
    setNewsEvents(prev => prev.filter(item => item.id !== id));
  };

  // Функции для управления документами
  const handleAddDocument = (document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newDocument: Document = {
      ...document,
      id: `doc-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setDocuments((prev) => [newDocument, ...prev]);

    createDocumentApi(newDocument)
      .then((createdDocument) => {
        setDocuments((prev) => prev.map((item) => (item.id === newDocument.id ? createdDocument : item)));
      })
      .catch(() => {
        // Оставляем локально добавленный документ.
      });
  };

  const handleUpdateDocument = (id: string, updates: Partial<Document>) => {
    updateDocumentApi(id, updates).catch(() => {
      // Локальное состояние уже обновится ниже.
    });

    setDocuments(prev => {
      const updated = prev.map(doc => {
        if (doc.id === id) {
          return { ...doc, ...updates, updatedAt: new Date() };
        }
        return doc;
      });
      return updated;
    });
  };

  const handleDeleteDocument = (id: string) => {
    deleteDocumentApi(id).catch(() => {
      // Не блокируем UI.
    });
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const handleParentOnlinePayment = async (paymentId: string) => {
    const successUrl = `${window.location.origin}/?payment=success`;
    const failUrl = `${window.location.origin}/?payment=fail`;
    const provider = await createProviderPayment({
      payment_id: paymentId,
      success_url: successUrl,
      fail_url: failUrl,
    });

    const autoConfirm = String(import.meta.env.VITE_PAYMENT_AUTO_CONFIRM || '').toLowerCase() === 'true';
    if (autoConfirm) {
      await sendProviderPaymentWebhook({
        payment_id: paymentId,
        status: 'paid',
        provider_payment_id: provider.provider_payment_id || `demo-${Date.now()}`,
        raw_payload: {
          source: 'parent-cabinet',
          mode: 'auto-confirm',
        },
      });
      await syncParentState();
      return;
    }

    window.location.href = provider.payment_url;
  };

  const handleParentManualPayment = async (paymentId: string) => {
    await confirmManualPayment(paymentId);
    await syncParentState();
  };

  const handleParentNotificationRead = async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, read: true, readAt: new Date() } : item)),
    );
    try {
      const updated = await markNotificationRead(notificationId);
      setNotifications((prev) => prev.map((item) => (item.id === notificationId ? updated : item)));
    } catch {
      // При ошибке синхронизируем состояние с backend
      await syncParentState();
    }
  };

  const handleParentMarkAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true, readAt: item.readAt || new Date() })));
    try {
      await markAllNotificationsRead();
    } catch {
      await syncParentState();
    }
  };

  return (
    <div className="min-h-screen">
      {appState === 'landing' && (
        <Landing 
          onLogin={() => setAppState('login')} 
          onGuestBrowse={handleGuestBrowse}
          onAddTask={addTask}
          onAddNotification={addNotification}
        />
      )}

      {appState === 'login' && (
        <Login
          onBack={() => setAppState('landing')}
          onLogin={handleLogin}
        />
      )}

      {appState === 'otp' && (
        <OTPVerification
          phone={phoneNumber}
          onVerify={handleVerify}
          onBack={() => setAppState('login')}
        />
      )}

      {appState === 'dashboard' && currentUserRole === 'parent' && (
        isParentStateLoading ? (
          <div className="min-h-screen bg-gradient-to-br from-[#F8F4E3] via-[#F8F4E3] to-[#133C2A]/5 flex items-center justify-center p-6">
            <div className="rounded-3xl bg-white/90 border border-[#133C2A]/10 shadow-lg px-8 py-6 text-center">
              <div className="text-[#133C2A] text-lg">Проверяем доступ к кабинету...</div>
            </div>
          </div>
        ) : (
          <ParentDashboard
            user={currentUser}
            children={userChildren}
            events={userEvents}
            payments={userPayments}
            newsEvents={newsEvents}
            documents={documents}
            onLogout={handleLogout}
            notifications={notifications}
            accessInfo={parentAccess}
            onPayOnline={handleParentOnlinePayment}
            onConfirmManualPayment={handleParentManualPayment}
            onMarkNotificationRead={handleParentNotificationRead}
            onMarkAllNotificationsRead={handleParentMarkAllNotificationsRead}
          />
        )
      )}

      {appState === 'dashboard' && currentUserRole === 'owner' && (
        <OwnerDashboard
          user={currentUser}
          onLogout={handleLogout}
          tasks={tasks}
          events={isBackendOwnerSession ? ownerScheduleEvents : []}
          payments={[]}
          groups={isBackendOwnerSession ? ownerGroups : []}
          employees={isBackendOwnerSession ? ownerEmployees : []}
          stats={isBackendOwnerSession ? ownerStats : emptyOwnerStats}
          monthlyData={isBackendOwnerSession ? ownerMonthlyData : []}
          expenses={isBackendOwnerSession ? ownerExpenses : []}
          notifications={notifications}
          automationCount={isBackendOwnerSession ? ownerAutomationCount : 0}
        />
      )}

      <Toaster 
        position="top-right"
        expand={false}
        richColors
        closeButton
        duration={3000}
      />
    </div>
  );
}
