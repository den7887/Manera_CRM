import {
  AutomationRule,
  Child,
  Document,
  Employee,
  Event,
  Expense,
  FinanceStats,
  Group,
  MonthlyData,
  News,
  Notification,
  Payment,
  Task,
  User,
  UserRole,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const TOKEN_STORAGE_KEY = 'manera_crm_token';
const ROLE_STORAGE_KEY = 'manera_crm_role';

type RequestOptions = RequestInit & { skipAuth?: boolean };

interface AuthVerifyResponse {
  access_token: string;
  role: UserRole;
  access_level?: 'payment_only' | 'full';
  account_status?: 'invited' | 'payment_pending' | 'active' | 'suspended';
}

export interface AdminCreateClientInput {
  parent_full_name: string;
  child_full_name: string;
  child_birth_date: string;
  parent_phone: string;
  subscription_name: string;
  subscription_amount: number;
  payment_method: 'cash' | 'online';
  notes?: string;
}

export interface ParentAccessInfo {
  parentUserId: string;
  accessLevel: 'payment_only' | 'full';
  accountStatus: 'invited' | 'payment_pending' | 'active' | 'suspended';
  canUseDashboard: boolean;
  pendingPaymentsCount: number;
  pendingPayments: any[];
}

export interface BackendUser extends User {
  accessLevel?: 'payment_only' | 'full';
  accountStatus?: 'invited' | 'payment_pending' | 'active' | 'suspended';
}

export interface SubscriptionPlanDto {
  id: string;
  code: 'hobby' | 'pro' | string;
  title: string;
  price: number;
  duration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ManualPaymentCreateResponse {
  payment_id: string;
  amount: number;
  status: 'pending' | 'waiting_confirmation' | 'paid' | 'failed' | 'cancelled' | 'expired';
  payment_reference: string;
  payment_comment: string;
  payment_url?: string | null;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  provider: string;
  method: string;
  plan: SubscriptionPlanDto;
}

export interface ParentSubscriptionDto {
  id: string;
  plan_title: string;
  status: 'active' | 'expired' | 'cancelled';
  starts_at: string;
  expires_at: string;
  total_lessons: number | null;
  used_lessons: number;
  remaining_lessons: number | null;
}

export interface AdminClientRecord {
  id: string;
  parentUserId: string;
  parentPhone: string;
  parentName?: string | null;
  childId: string;
  childFullName?: string | null;
  childBirthDate?: string | null;
  subscriptionName: string;
  subscriptionAmount: number;
  paymentMethod: 'cash' | 'online';
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | 'overdue' | 'cancelled';
  accessLevel: 'payment_only' | 'full';
  accountStatus: 'invited' | 'payment_pending' | 'active' | 'suspended';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  payment?: any;
}

export interface AdminPaymentRecord {
  id: string;
  clientId: string;
  parentUserId: string;
  parentPhone: string;
  parentName?: string | null;
  childName?: string | null;
  subscriptionName: string;
  amount: number;
  currency?: string;
  paymentMethod: 'cash' | 'online';
  status: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | 'overdue' | 'cancelled' | 'expired';
  providerPaymentId?: string | null;
  paidAt?: string | null;
  invoiceNumber?: string | null;
  dueDate?: string | null;
  reminderCount?: number;
  lastReminderAt?: string | null;
  nextReminderAt?: string | null;
  reminderComment?: string | null;
  invoiceComment?: string | null;
  createdAt: string;
  updatedAt: string;
  statusUpdatedAt?: string | null;
}

export interface OwnerFinanceSummaryResponse {
  stats: FinanceStats;
  monthlyData: MonthlyData[];
}

export interface OwnerStudioSettings {
  studio_name: string;
  support_phone: string;
  support_email: string;
  city: string;
  address: string;
  timezone: string;
  currency: string;
  parent_registration_enabled: boolean;
  updated_at: string;
}

export interface OwnerLandingSettingsDto {
  hero_title: string;
  hero_subtitle: string;
  cta_label: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  map_url: string;
  published: boolean;
  updated_at: string;
}

export interface OwnerPricingPlanDto {
  id: string;
  code: 'hobby' | 'pro' | string;
  title: string;
  price: number;
  classes_count: number | null;
  classes_tracked: boolean;
  duration_days: number;
  is_active: boolean;
  updated_at: string;
}

export interface OwnerNotificationRecord extends Notification {
  userId: string;
  parentName?: string | null;
  parentPhone?: string | null;
  dedupKey?: string | null;
}

export interface CommunicationEmployeeOption {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  status: 'active' | 'inactive';
}

export interface CommunicationChatRecord {
  id: string;
  parentUserId: string;
  parentName: string;
  parentPhone: string;
  parentContactLine?: string | null;
  parentChildLine?: string | null;
  employeeUserId: string;
  employeeName: string;
  employeeRole: UserRole;
  employeeContactLine?: string | null;
  lastMessageText: string | null;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  status: 'open' | string;
  parentUnreadCount: number;
  employeeUnreadCount: number;
}

export interface CommunicationMessageRecord {
  id: string;
  chatId: string;
  senderUserId: string;
  senderRole: UserRole;
  senderName: string;
  senderPhone: string;
  senderContactLine?: string | null;
  senderChildLine?: string | null;
  text: string;
  createdAt: Date;
}

function readStoredToken(): string | null {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function toDate(value: unknown): Date {
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

function toOptionalDate(value: unknown): Date | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  return toDate(value);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, headers, ...rest } = options;
  const token = readStoredToken();

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  };

  if (!skipAuth && token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
  });

  const textBody = await response.text();
  let parsedBody: any = null;
  if (textBody) {
    try {
      parsedBody = JSON.parse(textBody);
    } catch {
      parsedBody = textBody;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearAuth();
      throw new Error('Сессия истекла. Войдите снова.');
    }
    const message =
      (typeof parsedBody === 'object' && (parsedBody?.detail || parsedBody?.message)) ||
      (typeof parsedBody === 'string' ? parsedBody : null) ||
      `HTTP ${response.status}`;
    throw new Error(message);
  }

  return parsedBody as T;
}

function normalizeRole(role: string): UserRole {
  const normalized = role.toLowerCase();
  if (normalized === 'owner') return 'owner';
  if (normalized === 'admin') return 'admin';
  if (normalized === 'teacher') return 'teacher';
  return 'parent';
}

function mapUser(user: any): BackendUser {
  return {
    id: String(user.id),
    name: String(user.name || user.phone || user.id),
    phone: String(user.phone || ''),
    email: user.email || undefined,
    role: normalizeRole(String(user.role || 'parent')),
    avatar: user.avatar || undefined,
    accessLevel: user.access_level || user.accessLevel || undefined,
    accountStatus: user.account_status || user.accountStatus || undefined,
  };
}

function mapParentPayment(payment: any): Payment {
  const rawStatus = String(payment.status || 'pending') as Payment['status'];
  return {
    id: String(payment.id),
    userId: String(payment.parentUserId || payment.userId || ''),
    amount: Number(payment.amount || 0),
    date: toDate(payment.createdAt || payment.created_at || payment.date),
    status: rawStatus,
    type: 'subscription',
    description: payment.plan_title
      ? `Абонемент: ${payment.plan_title}`
      : payment.subscriptionName
      ? `Абонемент: ${payment.subscriptionName}`
      : 'Оплата абонемента',
    paymentMethod: (payment.paymentMethod || payment.method) as Payment['paymentMethod'],
    paidAt: toOptionalDate(payment.paidAt || payment.paid_at),
    paymentReference: payment.payment_reference || undefined,
    paymentComment: payment.payment_comment || undefined,
    paymentUrl: payment.payment_url || undefined,
    provider: payment.provider || undefined,
    userConfirmedAt: toOptionalDate(payment.user_confirmed_at),
    invoiceNumber: payment.invoice_number || payment.invoiceNumber || undefined,
    dueDate: toOptionalDate(payment.due_date || payment.dueDate),
    reminderCount: Number(payment.reminder_count ?? payment.reminderCount ?? 0),
    lastReminderAt: toOptionalDate(payment.last_reminder_at || payment.lastReminderAt),
  };
}

function mapParentChild(child: any): Child {
  const birthDate = toOptionalDate(child.birthDate);
  const age = birthDate
    ? new Date().getFullYear() - birthDate.getFullYear()
    : 0;
  const rawTotalClasses = Number(
    child.totalClasses ??
      child.total_lessons ??
      0,
  );
  const paymentStatus = String(child.payment?.status || child.client?.paymentStatus || '').toLowerCase();
  const nameMatch = String(child.client?.subscriptionName || '').toLowerCase().match(/(\d{1,3})\s*занят/);
  const classesFromName = nameMatch ? Number(nameMatch[1]) : 0;
  const totalClasses = Number.isFinite(rawTotalClasses) && rawTotalClasses > 0
    ? rawTotalClasses
    : classesFromName;
  const attendedClasses = Math.max(
    0,
    Number(
      child.attendedClasses ??
        child.usedLessons ??
        child.used_lessons ??
        0,
    ),
  );
  let remainingClasses = Number(
    child.remainingClasses ??
      child.remaining_lessons ??
      (totalClasses > 0 ? totalClasses - attendedClasses : 0),
  );
  if (!Number.isFinite(remainingClasses)) {
    remainingClasses = 0;
  }
  if (totalClasses > 0 && remainingClasses <= 0 && paymentStatus === 'paid') {
    remainingClasses = totalClasses;
  }
  remainingClasses = Math.max(0, Math.min(totalClasses > 0 ? totalClasses : remainingClasses, remainingClasses));
  const normalizedAttended = totalClasses > 0 ? Math.max(0, Math.min(attendedClasses, totalClasses)) : attendedClasses;
  const progress = totalClasses > 0 ? Math.round((normalizedAttended / totalClasses) * 100) : 0;

  return {
    id: String(child.id),
    name: String(child.fullName || child.name || 'Ученик'),
    age: Math.max(age, 0),
    groupId: String(child.groupId || ''),
    groupName: child.groupName || 'Группа не назначена',
    progress,
    parentId: String(child.parentUserId || ''),
    subscriptionId: String(child.client?.id || ''),
    subscriptionName: child.client?.subscriptionName || 'Абонемент не назначен',
    totalClasses: Math.max(totalClasses, 0),
    remainingClasses,
    attendedClasses: normalizedAttended,
    purchaseDate: toDate(child.client?.createdAt || child.createdAt),
    adminNotes: child.client?.notes || undefined,
  };
}

function mapParentEvent(event: any): Event {
  return {
    id: String(event.id || ''),
    title: String(event.title || 'Занятие'),
    groupId: String(event.groupId || event.group_id || ''),
    groupName: String(event.groupName || event.group_name || 'Группа'),
    date: toDate(event.date || event.starts_at || event.startAt),
    startTime: String(event.startTime || event.start_time || ''),
    endTime: String(event.endTime || event.end_time || ''),
    teacherId: String(event.teacherId || event.teacher_id || ''),
    teacherName: String(event.teacherName || event.teacher_name || 'Преподаватель'),
    attendance: Array.isArray(event.attendance) ? event.attendance : undefined,
  };
}

function mapOwnerGroup(group: any): Group {
  const scheduleValue = group.schedule;
  let schedule = '';
  if (Array.isArray(scheduleValue)) {
    schedule = scheduleValue.filter((item: unknown) => typeof item === 'string').join(', ');
  } else if (typeof scheduleValue === 'string') {
    schedule = scheduleValue;
  }
  return {
    id: String(group.id),
    name: String(group.name || ''),
    ageRange: String(group.ageRange || ''),
    teacherId: String(group.teacherId || ''),
    teacherName: String(group.teacherName || ''),
    studentCount: Number(group.studentCount || 0),
    schedule,
    color: String(group.color || '#133C2A'),
    time: String(group.time || ''),
    maxCapacity: Number(group.maxCapacity || 12),
  } as Group;
}

function mapOwnerEmployee(employee: any): Employee {
  return {
    id: String(employee.id),
    name: String(employee.name || ''),
    role: normalizeRole(String(employee.role || 'teacher')),
    email: String(employee.email || ''),
    phone: String(employee.phone || ''),
    status: employee.status === 'inactive' ? 'inactive' : 'active',
    lastLogin: employee.lastLogin ? toDate(employee.lastLogin) : undefined,
    groupsAssigned: Number(employee.groupsAssigned || 0),
    birthDate: employee.birthDate ? toDate(employee.birthDate) : undefined,
    experience: employee.experience || undefined,
    location: employee.location || undefined,
    permissions: Array.isArray(employee.permissions) ? employee.permissions.map(String) : undefined,
  };
}

function mapOwnerExpense(expense: any): Expense {
  return {
    id: String(expense.id),
    category: String(expense.category),
    amount: Number(expense.amount || 0),
    date: toDate(expense.date),
    description: String(expense.description || ''),
    paymentMethod: expense.paymentMethod || undefined,
    recipientName: expense.recipientName || undefined,
    notes: expense.notes || undefined,
    createdBy: String(expense.createdBy || ''),
    createdByName: String(expense.createdByName || ''),
    createdAt: toDate(expense.createdAt || expense.date),
    attachments: Array.isArray(expense.attachments) ? expense.attachments : undefined,
  };
}

export function getStoredRole(): UserRole | null {
  const role = window.localStorage.getItem(ROLE_STORAGE_KEY);
  if (!role) {
    return null;
  }
  return normalizeRole(role);
}

export function clearAuth(): void {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(ROLE_STORAGE_KEY);
}

export async function startOtp(phone: string): Promise<void> {
  await request('/api/auth/otp/start', {
    method: 'POST',
    body: JSON.stringify({ phone }),
    skipAuth: true,
  });
}

export async function verifyOtp(phone: string, code: string): Promise<UserRole> {
  const data = await request<AuthVerifyResponse>('/api/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
    skipAuth: true,
  });

  const role = normalizeRole(data.role);
  window.localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
  window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  return role;
}

export async function logout(): Promise<void> {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } catch {
    // ignore network/auth errors on logout
  }
}

export async function loadCurrentUser(): Promise<BackendUser> {
  const user = await request<any>('/api/auth/me');
  return mapUser(user);
}

function mapTask(task: any): Task {
  return {
    ...task,
    createdAt: toDate(task.createdAt),
    dueDate: toOptionalDate(task.dueDate),
    scheduledDate: toOptionalDate(task.scheduledDate),
    completedAt: toOptionalDate(task.completedAt),
  };
}

function mapNews(news: any): News {
  return {
    ...news,
    date: toDate(news.date),
    eventDate: toOptionalDate(news.eventDate),
    eventDeadline: toOptionalDate(news.eventDeadline),
    eventParticipants: Array.isArray(news.eventParticipants)
      ? news.eventParticipants.map((participant: any) => ({
          ...participant,
          viewedAt: toOptionalDate(participant.viewedAt),
          respondedAt: toOptionalDate(participant.respondedAt),
          paidAt: toOptionalDate(participant.paidAt),
        }))
      : undefined,
  };
}

function mapDocument(document: any): Document {
  return {
    ...document,
    createdAt: toDate(document.createdAt),
    updatedAt: toDate(document.updatedAt),
  };
}

function mapNotification(notification: any): Notification {
  const roleList = Array.isArray(notification.forRoles)
    ? notification.forRoles.map((role: unknown) => normalizeRole(String(role)))
    : ['parent'];
  return {
    id: String(notification.id || ''),
    type: (notification.type || 'general') as Notification['type'],
    priority: (notification.priority || 'low') as Notification['priority'],
    title: String(notification.title || ''),
    message: String(notification.message || ''),
    additionalInfo: notification.additionalInfo || undefined,
    highlightedData: notification.highlightedData || undefined,
    createdAt: toDate(notification.createdAt),
    forRoles: roleList,
    metadata: notification.metadata || undefined,
    read: Boolean(notification.read),
    readAt: toOptionalDate(notification.readAt),
  };
}

function mapOwnerNotification(notification: any): OwnerNotificationRecord {
  return {
    ...mapNotification(notification),
    userId: String(notification.userId || ''),
    parentName: notification.parentName || null,
    parentPhone: notification.parentPhone || null,
    dedupKey: notification.dedupKey || null,
  };
}

function mapCommunicationEmployee(employee: any): CommunicationEmployeeOption {
  return {
    id: String(employee.id || ''),
    name: String(employee.name || employee.phone || ''),
    role: normalizeRole(String(employee.role || 'teacher')),
    phone: String(employee.phone || ''),
    status: employee.status === 'inactive' ? 'inactive' : 'active',
  };
}

function mapCommunicationChat(chat: any): CommunicationChatRecord {
  return {
    id: String(chat.id || ''),
    parentUserId: String(chat.parent_user_id || ''),
    parentName: String(chat.parent_name || ''),
    parentPhone: String(chat.parent_phone || ''),
    parentContactLine: chat.parent_contact_line ? String(chat.parent_contact_line) : null,
    parentChildLine: chat.parent_child_line ? String(chat.parent_child_line) : null,
    employeeUserId: String(chat.employee_user_id || ''),
    employeeName: String(chat.employee_name || ''),
    employeeRole: normalizeRole(String(chat.employee_role || 'teacher')),
    employeeContactLine: chat.employee_contact_line ? String(chat.employee_contact_line) : null,
    lastMessageText: chat.last_message_text ? String(chat.last_message_text) : null,
    lastMessageAt: toOptionalDate(chat.last_message_at),
    createdAt: toDate(chat.created_at),
    updatedAt: toDate(chat.updated_at),
    status: String(chat.status || 'open'),
    parentUnreadCount: Number(chat.parent_unread_count || 0),
    employeeUnreadCount: Number(chat.employee_unread_count || 0),
  };
}

function mapCommunicationMessage(message: any): CommunicationMessageRecord {
  return {
    id: String(message.id || ''),
    chatId: String(message.chat_id || ''),
    senderUserId: String(message.sender_user_id || ''),
    senderRole: normalizeRole(String(message.sender_role || 'parent')),
    senderName: String(message.sender_name || ''),
    senderPhone: String(message.sender_phone || ''),
    senderContactLine: message.sender_contact_line ? String(message.sender_contact_line) : null,
    senderChildLine: message.sender_child_line ? String(message.sender_child_line) : null,
    text: String(message.text || ''),
    createdAt: toDate(message.created_at),
  };
}

function mapAutomation(rule: any): AutomationRule {
  return {
    id: String(rule.id),
    name: String(rule.name || ''),
    triggerKey: String(rule.triggerKey || ''),
    actionType: String(rule.actionType || ''),
    actionParams: rule.actionParams || {},
    isActive: Boolean(rule.isActive),
    createdAt: toDate(rule.createdAt),
    updatedAt: toDate(rule.updatedAt),
  };
}

function serializeTask(task: Task): any {
  return {
    ...task,
    createdAt: task.createdAt.toISOString(),
    dueDate: task.dueDate ? task.dueDate.toISOString() : undefined,
    scheduledDate: task.scheduledDate ? task.scheduledDate.toISOString() : undefined,
    completedAt: task.completedAt ? task.completedAt.toISOString() : undefined,
  };
}

function serializeNews(news: News): any {
  return {
    ...news,
    date: news.date.toISOString(),
    eventDate: news.eventDate ? news.eventDate.toISOString() : undefined,
    eventDeadline: news.eventDeadline ? news.eventDeadline.toISOString() : undefined,
    eventParticipants: news.eventParticipants?.map((participant) => ({
      ...participant,
      viewedAt: participant.viewedAt ? participant.viewedAt.toISOString() : undefined,
      respondedAt: participant.respondedAt ? participant.respondedAt.toISOString() : undefined,
      paidAt: participant.paidAt ? participant.paidAt.toISOString() : undefined,
    })),
  };
}

function serializeDocument(document: Document): any {
  return {
    ...document,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function loadTasks(): Promise<Task[]> {
  const tasks = await request<any[]>('/api/tasks');
  return tasks.map(mapTask);
}

export async function createTask(task: Task): Promise<Task> {
  const created = await request<any>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(serializeTask(task)),
  });
  return mapTask(created);
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const payload = {
    ...updates,
    createdAt: updates.createdAt ? updates.createdAt.toISOString() : undefined,
    dueDate: updates.dueDate ? updates.dueDate.toISOString() : undefined,
    scheduledDate: updates.scheduledDate ? updates.scheduledDate.toISOString() : undefined,
    completedAt: updates.completedAt ? updates.completedAt.toISOString() : undefined,
  };
  const updated = await request<any>(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return mapTask(updated);
}

export async function deleteTask(id: string): Promise<void> {
  await request(`/api/tasks/${id}`, { method: 'DELETE' });
}

export async function loadNews(): Promise<News[]> {
  const news = await request<any[]>('/api/news');
  return news.map(mapNews);
}

export async function createNews(news: News): Promise<News> {
  const created = await request<any>('/api/news', {
    method: 'POST',
    body: JSON.stringify(serializeNews(news)),
  });
  return mapNews(created);
}

export async function updateNews(id: string, updates: Partial<News>): Promise<News> {
  const payload = {
    ...updates,
    date: updates.date ? updates.date.toISOString() : undefined,
    eventDate: updates.eventDate ? updates.eventDate.toISOString() : undefined,
    eventDeadline: updates.eventDeadline ? updates.eventDeadline.toISOString() : undefined,
  };

  const updated = await request<any>(`/api/news/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return mapNews(updated);
}

export async function deleteNews(id: string): Promise<void> {
  await request(`/api/news/${id}`, {
    method: 'DELETE',
  });
}

export async function loadDocuments(): Promise<Document[]> {
  const documents = await request<any[]>('/api/documents');
  return documents.map(mapDocument);
}

export async function createDocument(document: Document): Promise<Document> {
  const created = await request<any>('/api/documents', {
    method: 'POST',
    body: JSON.stringify(serializeDocument(document)),
  });
  return mapDocument(created);
}

export async function updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
  const payload = {
    ...updates,
    createdAt: updates.createdAt ? updates.createdAt.toISOString() : undefined,
    updatedAt: updates.updatedAt ? updates.updatedAt.toISOString() : undefined,
  };

  const updated = await request<any>(`/api/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return mapDocument(updated);
}

export async function deleteDocument(id: string): Promise<void> {
  await request(`/api/documents/${id}`, {
    method: 'DELETE',
  });
}

export async function createClientByAdmin(payload: AdminCreateClientInput): Promise<any> {
  return request('/api/admin/clients', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loadAdminPayments(
  statusFilter?: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | 'overdue' | 'cancelled' | 'expired',
  methodFilter?: 'cash' | 'online',
): Promise<AdminPaymentRecord[]> {
  const params = new URLSearchParams();
  if (statusFilter) {
    params.set('status_filter', statusFilter);
  }
  if (methodFilter) {
    params.set('method_filter', methodFilter);
  }
  const query = params.toString();
  return request<AdminPaymentRecord[]>(`/api/admin/payments${query ? `?${query}` : ''}`);
}

export async function loadAdminClients(): Promise<AdminClientRecord[]> {
  return request<AdminClientRecord[]>('/api/admin/clients');
}

export async function confirmCashPayment(
  paymentId: string,
  payload: { comment?: string; paid_amount?: number } = {},
): Promise<any> {
  return request(`/api/admin/payments/${paymentId}/confirm-cash`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function sendProviderPaymentWebhook(payload: {
  payment_id: string;
  status: 'paid' | 'failed';
  provider_payment_id?: string;
  raw_payload?: any;
}): Promise<any> {
  return request('/api/payments/provider/webhook', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  });
}

export async function createProviderPayment(payload: {
  payment_id: string;
  success_url: string;
  fail_url: string;
}): Promise<{ ok: boolean; payment_url: string; provider_payment_id?: string }> {
  return request('/api/payments/provider/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loadPaymentJournal(): Promise<any[]> {
  return request('/api/payments/journal');
}

export async function createAdminInvoice(payload: {
  client_id: string;
  amount?: number;
  payment_method: 'cash' | 'online';
  due_date?: string;
  comment?: string;
}): Promise<{ ok: boolean; payment: AdminPaymentRecord }> {
  return request('/api/admin/payments/invoices', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function sendAdminPaymentReminder(
  paymentId: string,
  payload: { message?: string } = {},
): Promise<{ ok: boolean; payment: AdminPaymentRecord; notification?: any }> {
  return request(`/api/admin/payments/${paymentId}/send-reminder`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function runAdminPaymentReminders(): Promise<{
  ok: boolean;
  processed: number;
  payments: AdminPaymentRecord[];
}> {
  return request('/api/admin/payments/reminders/run', {
    method: 'POST',
  });
}

export async function updateAdminPaymentStatus(
  paymentId: string,
  payload: { status: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled' | 'overdue'; comment?: string },
): Promise<{ ok: boolean; payment: AdminPaymentRecord; idempotent?: boolean }> {
  return request(`/api/admin/payments/${paymentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function loadParentAccess(): Promise<ParentAccessInfo> {
  return request('/api/parent/access');
}

export async function loadParentPayments(): Promise<any[]> {
  const payments = await request<any[]>('/api/payments/my');
  return payments.map(mapParentPayment);
}

export async function loadParentChildren(): Promise<Child[]> {
  const children = await request<any[]>('/api/parent/children');
  return children.map(mapParentChild);
}

export async function loadParentEvents(): Promise<Event[]> {
  const events = await request<any[]>('/api/parent/events');
  return events.map(mapParentEvent);
}

export async function loadOwnerGroups(): Promise<Group[]> {
  const groups = await request<any[]>('/api/owner/groups');
  return groups.map(mapOwnerGroup);
}

export async function createOwnerGroup(payload: {
  name: string;
  age_range: string;
  teacher_id?: string | null;
  teacher_name?: string | null;
  schedule?: string;
  time?: string;
  color?: string;
  max_capacity?: number;
}): Promise<Group> {
  const created = await request<any>('/api/owner/groups', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapOwnerGroup(created);
}

export async function updateOwnerGroup(
  groupId: string,
  payload: {
    name: string;
    age_range: string;
    teacher_id?: string | null;
    teacher_name?: string | null;
    schedule?: string;
    time?: string;
    color?: string;
    max_capacity?: number;
  },
): Promise<Group> {
  const updated = await request<any>(`/api/owner/groups/${groupId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return mapOwnerGroup(updated);
}

export async function deleteOwnerGroup(groupId: string): Promise<void> {
  await request(`/api/owner/groups/${groupId}`, { method: 'DELETE' });
}

export async function loadOwnerEmployees(): Promise<Employee[]> {
  const employees = await request<any[]>('/api/owner/employees');
  return employees.map(mapOwnerEmployee);
}

export async function createOwnerEmployee(payload: {
  name: string;
  role: 'teacher' | 'admin';
  phone: string;
  email?: string;
  birth_date?: string | null;
  experience?: string | null;
  location?: string | null;
  status?: 'active' | 'inactive';
  permissions?: string[];
}): Promise<Employee> {
  const created = await request<any>('/api/owner/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapOwnerEmployee(created);
}

export async function updateOwnerEmployee(
  employeeId: string,
  payload: {
    name: string;
    role: 'teacher' | 'admin';
    phone: string;
    email?: string;
    birth_date?: string | null;
    experience?: string | null;
    location?: string | null;
    status?: 'active' | 'inactive';
    permissions?: string[];
  },
): Promise<Employee> {
  const updated = await request<any>(`/api/owner/employees/${employeeId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return mapOwnerEmployee(updated);
}

export async function deleteOwnerEmployee(employeeId: string): Promise<void> {
  await request(`/api/owner/employees/${employeeId}`, { method: 'DELETE' });
}

export async function loadOwnerExpenses(): Promise<Expense[]> {
  const expenses = await request<any[]>('/api/owner/expenses');
  return expenses.map(mapOwnerExpense);
}

export async function createOwnerExpense(payload: {
  category: string;
  amount: number;
  date: string;
  description: string;
  payment_method?: 'cash' | 'card' | 'transfer' | null;
  recipient_name?: string | null;
  notes?: string | null;
}): Promise<Expense> {
  const created = await request<any>('/api/owner/expenses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapOwnerExpense(created);
}

export async function deleteOwnerExpense(expenseId: string): Promise<void> {
  await request(`/api/owner/expenses/${expenseId}`, { method: 'DELETE' });
}

export async function loadOwnerFinanceSummary(): Promise<OwnerFinanceSummaryResponse> {
  return request<OwnerFinanceSummaryResponse>('/api/owner/finance/summary');
}

export async function loadOwnerSettings(): Promise<OwnerStudioSettings> {
  return request<OwnerStudioSettings>('/api/owner/settings');
}

export async function updateOwnerSettings(payload: {
  studio_name: string;
  support_phone: string;
  support_email?: string;
  city?: string;
  address?: string;
  timezone?: string;
  currency?: string;
  parent_registration_enabled: boolean;
}): Promise<OwnerStudioSettings> {
  return request<OwnerStudioSettings>('/api/owner/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function loadOwnerLandingSettings(): Promise<OwnerLandingSettingsDto> {
  return request<OwnerLandingSettingsDto>('/api/owner/landing-settings');
}

export async function updateOwnerLandingSettings(payload: {
  hero_title: string;
  hero_subtitle?: string;
  cta_label?: string;
  contact_phone: string;
  contact_email?: string;
  address?: string;
  map_url?: string;
  published: boolean;
}): Promise<OwnerLandingSettingsDto> {
  return request<OwnerLandingSettingsDto>('/api/owner/landing-settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function loadOwnerPricing(): Promise<OwnerPricingPlanDto[]> {
  return request<OwnerPricingPlanDto[]>('/api/owner/pricing');
}

export async function updateOwnerPricingPlan(
  planCode: string,
  payload: {
    title: string;
    price: number;
    classes_count?: number | null;
    classes_tracked: boolean;
    duration_days: number;
    is_active: boolean;
  },
): Promise<OwnerPricingPlanDto> {
  return request<OwnerPricingPlanDto>(`/api/owner/pricing/${planCode}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function loadOwnerAutomations(): Promise<AutomationRule[]> {
  const rules = await request<any[]>('/api/owner/automations');
  return rules.map(mapAutomation);
}

export async function createOwnerAutomation(payload: {
  name: string;
  trigger_key: string;
  action_type: string;
  action_params?: Record<string, any>;
  is_active?: boolean;
}): Promise<AutomationRule> {
  const created = await request<any>('/api/owner/automations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapAutomation(created);
}

export async function updateOwnerAutomation(
  id: string,
  payload: {
    name: string;
    trigger_key: string;
    action_type: string;
    action_params?: Record<string, any>;
    is_active?: boolean;
  },
): Promise<AutomationRule> {
  const updated = await request<any>(`/api/owner/automations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return mapAutomation(updated);
}

export async function deleteOwnerAutomation(id: string): Promise<void> {
  await request(`/api/owner/automations/${id}`, { method: 'DELETE' });
}

export async function loadOwnerNotifications(params: {
  type_filter?: 'payment' | 'trial_class' | 'attendance' | 'general' | string;
  status_filter?: 'all' | 'read' | 'unread';
  user_id?: string;
  created_from?: string;
  created_to?: string;
  limit?: number;
} = {}): Promise<OwnerNotificationRecord[]> {
  const query = new URLSearchParams();
  if (params.type_filter) query.set('type_filter', params.type_filter);
  if (params.status_filter) query.set('status_filter', params.status_filter);
  if (params.user_id) query.set('user_id', params.user_id);
  if (params.created_from) query.set('created_from', params.created_from);
  if (params.created_to) query.set('created_to', params.created_to);
  if (typeof params.limit === 'number') query.set('limit', String(params.limit));
  const response = await request<any[]>(`/api/owner/notifications${query.toString() ? `?${query.toString()}` : ''}`);
  return response.map(mapOwnerNotification);
}

export async function loadParentCommunicationEmployees(): Promise<CommunicationEmployeeOption[]> {
  const employees = await request<any[]>('/api/parent/communications/employees');
  return employees.map(mapCommunicationEmployee);
}

export async function loadParentCommunicationChats(): Promise<CommunicationChatRecord[]> {
  const chats = await request<any[]>('/api/parent/communications/chats');
  return chats.map(mapCommunicationChat);
}

export async function createParentCommunicationChat(employeeId: string): Promise<CommunicationChatRecord> {
  const chat = await request<any>('/api/parent/communications/chats', {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId }),
  });
  return mapCommunicationChat(chat);
}

export async function loadParentCommunicationMessages(chatId: string): Promise<CommunicationMessageRecord[]> {
  const messages = await request<any[]>(`/api/parent/communications/chats/${chatId}/messages`);
  return messages.map(mapCommunicationMessage);
}

export async function sendParentCommunicationMessage(chatId: string, text: string): Promise<CommunicationMessageRecord> {
  const message = await request<any>(`/api/parent/communications/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return mapCommunicationMessage(message);
}

export async function loadOwnerCommunicationChats(params: {
  status_filter?: 'all' | 'unread' | 'waiting_reply';
  employee_id?: string;
} = {}): Promise<CommunicationChatRecord[]> {
  const query = new URLSearchParams();
  if (params.status_filter) query.set('status_filter', params.status_filter);
  if (params.employee_id) query.set('employee_id', params.employee_id);
  const response = await request<any[]>(
    `/api/owner/communications/chats${query.toString() ? `?${query.toString()}` : ''}`,
  );
  return response.map(mapCommunicationChat);
}

export async function loadOwnerCommunicationMessages(chatId: string): Promise<CommunicationMessageRecord[]> {
  const messages = await request<any[]>(`/api/owner/communications/chats/${chatId}/messages`);
  return messages.map(mapCommunicationMessage);
}

export async function sendOwnerCommunicationMessage(chatId: string, text: string): Promise<CommunicationMessageRecord> {
  const message = await request<any>(`/api/owner/communications/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return mapCommunicationMessage(message);
}

export async function loadMyNotifications(): Promise<Notification[]> {
  const notifications = await request<any[]>('/api/notifications/my');
  return notifications.map(mapNotification);
}

export async function markNotificationRead(notificationId: string): Promise<Notification> {
  const updated = await request<any>(`/api/notifications/${notificationId}/mark-read`, {
    method: 'POST',
  });
  return mapNotification(updated);
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  return request<{ updated: number }>('/api/notifications/mark-all-read', {
    method: 'POST',
  });
}

export async function loadSubscriptionPlans(): Promise<SubscriptionPlanDto[]> {
  const result = await request<{ plans: SubscriptionPlanDto[] }>('/api/payments/plans');
  return result.plans || [];
}

export async function createManualPayment(payload: {
  subscription_plan_code: string;
  child_id?: string | null;
}): Promise<ManualPaymentCreateResponse> {
  return request<ManualPaymentCreateResponse>('/api/payments/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function confirmManualPayment(paymentId: string): Promise<{
  payment: any;
  subscription?: ParentSubscriptionDto | null;
  idempotent?: boolean;
}> {
  return request(`/api/payments/${paymentId}/confirm-user-paid`, {
    method: 'POST',
  });
}

export async function loadMySubscriptions(): Promise<ParentSubscriptionDto[]> {
  return request<ParentSubscriptionDto[]>('/api/subscriptions/my');
}
