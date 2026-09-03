import { useMemo, useEffect, useRef, useState } from 'react';
import { Landing } from './components/Landing';
import { MobileOnlyGate } from './components/MobileOnlyGate';
import { PinLogin } from './components/auth/PinLogin';
import { ActivationPinPage } from './components/auth/ActivationPinPage';
import { ParentDashboard } from './components/parent/ParentDashboard';
import { OwnerDashboard } from './components/owner/OwnerDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { PublicPaymentSessionPage } from './components/payments/PublicPaymentSessionPage';
import { PublicPaymentSuccessPage } from './components/payments/PublicPaymentSuccessPage';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { useMediaQuery } from './hooks/useMediaQuery';
import { publicSiteConfig } from './lib/publicSiteConfig';
import './styles/landing-v2.css';
import { UserRole, Task, Notification, News, Document, Payment, Child, User, Event, Group, Employee, FinanceStats, MonthlyData, Expense } from './types';
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
  syncProviderPaymentStatus,
  startPinActivationByPhone,
  updateDocument as updateDocumentApi,
  updateNews as updateNewsApi,
  loginWithPin,
} from './lib/backendApi';

type AppState = 'landing' | 'login' | 'dashboard' | 'activation' | 'payment-session' | 'payment-success';

function readAppStateFromUrl(): { appState: AppState; token: string | null } {
  if (typeof window === 'undefined') {
    return { appState: 'landing', token: null };
  }
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const activationMatch = path.match(/^\/activate\/([^/]+)$/);
  if (activationMatch) {
    return { appState: 'activation', token: decodeURIComponent(activationMatch[1] || '') };
  }
  const paymentSessionMatch = path.match(/^\/pay\/session\/([^/]+)$/);
  if (paymentSessionMatch) {
    return { appState: 'payment-session', token: decodeURIComponent(paymentSessionMatch[1] || '') };
  }
  const paymentSuccessMatch = path.match(/^\/pay\/success\/([^/]+)$/);
  if (paymentSuccessMatch) {
    return { appState: 'payment-success', token: decodeURIComponent(paymentSuccessMatch[1] || '') };
  }
  if (path === '/login') {
    return { appState: 'login', token: null };
  }
  return { appState: 'landing', token: null };
}

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
  const initialRoute = readAppStateFromUrl();
  const isDesktopWide = useMediaQuery('(min-width: 1024px)');
  const emptyOwnerStats: FinanceStats = {
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    revenueGrowth: 0,
    churnRate: 0,
    trialConversion: 0,
  };

  const [appState, setAppState] = useState<AppState>(initialRoute.appState);
  const [routeToken, setRouteToken] = useState<string | null>(initialRoute.token);
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
  const isBackendParentSession = currentUserRole === 'parent' && (backendUser !== null || parentAccess !== null);
  const isBackendOwnerSession = currentUserRole === 'owner' && backendUser !== null;

  const currentUser: User = backendUser ?? {
    id: `session-${currentUserRole}`,
    name: currentUserRole === 'owner' ? 'Владелец' : 'Пользователь',
    phone: '',
    role: currentUserRole,
  };
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

  const navigateToState = (nextState: AppState, path: string, token: string | null = null) => {
    window.history.replaceState(null, '', path);
    setRouteToken(token);
    setAppState(nextState);
  };

  const openLanding = () => navigateToState('landing', '/');
  const openLogin = () => navigateToState('login', '/login');
  const openDashboard = () => navigateToState('dashboard', '/');

  const syncParentState = async (options?: { silent?: boolean }) => {
    if (parentSyncInFlightRef.current) {
      return;
    }
    parentSyncInFlightRef.current = true;
    const silent = options?.silent ?? false;
    // Background refreshes (30s poll, tab refocus, post-payment return) must not
    // swap the whole dashboard for a "Проверяем доступ к кабинету..." loader --
    // only the very first load after login should ever show it.
    if (!silent) {
      setIsParentStateLoading(true);
    }
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

    if (effectiveRole === 'owner' || effectiveRole === 'admin' || effectiveRole === 'teacher') {
      // Admin already has the same backend access as owner for all of these.
      // Teacher only has read access to groups/employees (see _require_staff
      // on the backend) -- the rest 403 and Promise.allSettled quietly falls
      // back to empty state for those, no separate code path needed.
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
    const allowedRole = savedRole === 'owner' || savedRole === 'parent' || savedRole === 'admin' || savedRole === 'teacher' ? savedRole : null;
    const initialUrlRoute = readAppStateFromUrl();
    const isStandalonePublicRoute = ['activation', 'payment-session', 'payment-success'].includes(initialUrlRoute.appState);
    // A guest on /login already renders the login screen correctly (see readAppStateFromUrl
    // above); the session-bootstrap 401 below must not bounce them off it (see audit F-02).
    const isLoginRoute = initialUrlRoute.appState === 'login';
    if (allowedRole) {
      setCurrentUserRole(allowedRole);
      if (!isStandalonePublicRoute) {
        setAppState('dashboard');
      }
    } else if (savedRole) {
      clearAuth();
      setCurrentUserRole('parent');
      if (!isStandalonePublicRoute) {
        setAppState(initialUrlRoute.appState);
      }
    }
    if (savedRole && !allowedRole) {
      return;
    }
    if (isStandalonePublicRoute) {
      return;
    }

    const bootstrap = async () => {
      try {
        const serverUser = await loadCurrentUser();
        const serverRole = serverUser.role;
        if (serverRole !== 'owner' && serverRole !== 'parent' && serverRole !== 'admin' && serverRole !== 'teacher') {
          clearAuth();
          setCurrentUserRole('parent');
          openLanding();
          return;
        }
        if (allowedRole !== serverRole) {
          setCurrentUserRole(serverRole);
        }
        await syncServerState(serverRole);
        openDashboard();
      } catch {
        clearAuth();
        setCurrentUserRole('parent');
        if (!isLoginRoute) {
          openLanding();
        }
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get('payment');
    const paymentId = window.localStorage.getItem('manera_pending_provider_payment_id');
    if (!paymentResult || !paymentId) {
      return;
    }

    let active = true;
    const finish = () => {
      window.localStorage.removeItem('manera_pending_provider_payment_id');
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete('payment');
      window.history.replaceState({}, '', nextUrl.toString());
    };

    const sync = async () => {
      try {
        const result = await syncProviderPaymentStatus({ payment_id: paymentId });
        if (!active) {
          return;
        }
        if (result.synced && currentUserRole === 'parent' && appState === 'dashboard') {
          await syncParentState({ silent: true });
        }
      } catch {
        // Если status-sync еще не настроен полностью, не блокируем возврат в приложение.
      } finally {
        if (active) {
          finish();
        }
      }
    };

    void sync();

    return () => {
      active = false;
    };
  }, [appState, currentUserRole]);

  useEffect(() => {
    if (appState !== 'dashboard' || currentUserRole !== 'parent') {
      return;
    }

    const refresh = () => {
      void syncParentState({ silent: true });
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

  // Watchdog: some mobile browsers (notably iOS Safari) occasionally fail to
  // undo the pointer-events lock a popover/dropdown/dialog sets on <body>
  // while open, leaving the whole page unresponsive to taps until reload.
  // If nothing is actually open anymore but the lock is still there, clear it.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.body.style.pointerEvents !== 'none') return;
      const somethingOpen = document.querySelector(
        '[data-state="open"], [data-slot$="-overlay"], [role="alertdialog"]',
      );
      if (!somethingOpen) {
        document.body.style.pointerEvents = '';
      }
    }, 500);
    return () => window.clearInterval(intervalId);
  }, []);

  const handlePinLogin = async (phone: string, pin: string) => {
    const role = await loginWithPin(phone, pin);

    try {
      await syncServerState(role);
    } catch {
      // Если backend недоступен, дашборды продолжают работать на моках.
    }

    setCurrentUserRole(role);
    openDashboard();
  };

  const handleStartPinActivation = async (phone: string) => {
    const response = await startPinActivationByPhone({ phone });
    const activationUrl = String(response.activation_url || '').trim();
    if (!activationUrl) {
      throw new Error('Ссылка активации не получена. Обратитесь к администратору студии.');
    }
    window.location.href = activationUrl;
  };

  const handleActivationComplete = async () => {
    try {
      const user = await loadCurrentUser();
      setCurrentUserRole(user.role);
      await syncServerState(user.role);
    } catch {
      setCurrentUserRole('parent');
      await syncServerState('parent');
    }
    openDashboard();
  };

  const handleLogout = () => {
    void logoutApi();
    clearAuth();
    openLanding();
    setRouteToken(null);
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
    try {
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
          provider_payment_id: provider.provider_payment_id || `provider-${Date.now()}`,
          raw_payload: {
            source: 'parent-cabinet',
            mode: 'auto-confirm',
          },
        });
        await syncParentState({ silent: true });
        return;
      }

      window.localStorage.setItem('manera_pending_provider_payment_id', paymentId);
      window.location.href = provider.payment_url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось начать оплату. Попробуйте еще раз.');
      throw error;
    }
  };

  const handleParentManualPayment = async (paymentId: string) => {
    try {
      await confirmManualPayment(paymentId);
      await syncParentState();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось подтвердить оплату. Попробуйте еще раз.');
      throw error;
    }
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
      await syncParentState({ silent: true });
    }
  };

  const handleParentMarkAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true, readAt: item.readAt || new Date() })));
    try {
      await markAllNotificationsRead();
    } catch {
      await syncParentState({ silent: true });
    }
  };

  const appOrigin = typeof window === 'undefined' ? publicSiteConfig.siteUrl : window.location.origin;
  const activationTargetUrl = typeof window === 'undefined' ? publicSiteConfig.siteUrl : window.location.href;
  const parentCabinetDesktopBlocked =
    isDesktopWide &&
    (
      appState === 'login' ||
      appState === 'activation' ||
      (appState === 'dashboard' && currentUserRole === 'parent')
    );

  const parentCabinetGate = (() => {
    if (!parentCabinetDesktopBlocked) {
      return null;
    }
    if (appState === 'activation') {
      return (
        <MobileOnlyGate
          targetUrl={activationTargetUrl}
          title="Активация кабинета доступна только с телефона"
          description="Откройте ссылку активации на мобильном устройстве и создайте PIN-код там."
        />
      );
    }
    if (appState === 'dashboard' && currentUserRole === 'parent') {
      return (
        <MobileOnlyGate
          targetUrl={`${appOrigin}/login`}
          title="Личный кабинет доступен только в мобильной версии"
          description="Откройте страницу входа на телефоне и войдите по номеру телефона и PIN-коду."
        />
      );
    }
    return (
      <MobileOnlyGate
        targetUrl={`${appOrigin}/login`}
        title="Вход в личный кабинет доступен только с телефона"
        description="Откройте страницу входа на мобильном устройстве и авторизуйтесь там."
      />
    );
  })();

  return (
    <div className="min-h-screen">
      {appState === 'landing' && (
        <Landing 
          onLogin={openLogin} 
          onAddTask={addTask}
          onAddNotification={addNotification}
        />
      )}

      {appState === 'login' && (
        parentCabinetGate ?? (
          <PinLogin
            onBack={openLanding}
            onLogin={handlePinLogin}
            onStartActivation={handleStartPinActivation}
          />
        )
      )}

      {appState === 'activation' && routeToken && (
        parentCabinetGate ?? (
          <ActivationPinPage
            token={routeToken}
            onActivated={handleActivationComplete}
            onGoLogin={openLogin}
          />
        )
      )}

      {appState === 'payment-session' && routeToken && (
        <PublicPaymentSessionPage token={routeToken} />
      )}

      {appState === 'payment-success' && routeToken && (
        <PublicPaymentSuccessPage token={routeToken} />
      )}

      {appState === 'dashboard' && currentUserRole === 'parent' && (
        parentCabinetGate ?? (
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

      {appState === 'dashboard' && currentUserRole === 'admin' && (
        <AdminDashboard
          user={currentUser}
          onLogout={handleLogout}
          tasks={tasks}
          events={ownerScheduleEvents}
          groups={ownerGroups}
          newsEvents={newsEvents}
          documents={documents}
          notifications={notifications}
        />
      )}

      {appState === 'dashboard' && currentUserRole === 'teacher' && (
        <TeacherDashboard
          user={currentUser}
          onLogout={handleLogout}
          groups={ownerGroups}
          events={ownerScheduleEvents}
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
