import { AdminChildRecord, AdminClientRecord, AdminPaymentRecord, OwnerPricingPlanDto } from '../../lib/backendApi';
import { Group } from '../../types';

export type MoneyTab = 'overview' | 'payments' | 'subscriptions' | 'settings';
export type MoneyPaymentQueue = 'all' | 'review' | 'waiting' | 'overdue' | 'paid' | 'trial' | 'cash' | 'online' | 'problem';
export type MoneyPaymentStatusFilter =
  | 'all'
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'overdue'
  | 'cancelled'
  | 'expired';
export type MoneyPaymentMethodFilter = 'all' | 'cash' | 'online';
export type MoneyPaymentType = 'trial' | 'subscription' | 'renewal' | 'event' | 'individual' | 'custom' | 'debt';
export type MoneySubscriptionFilter = 'active' | 'ending_soon' | 'expired' | 'frozen' | 'payment_required' | 'all';
export type MoneySubscriptionStatus =
  | 'not_started'
  | 'active'
  | 'ending_soon'
  | 'expired_by_date'
  | 'finished_by_lessons'
  | 'frozen'
  | 'cancelled'
  | 'payment_required';

export interface MoneyJournalEntry {
  id: string;
  paymentId: string;
  eventType: string;
  source?: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface MoneySubscriptionRecord {
  id: string;
  childId: string;
  clientId?: string | null;
  childName: string;
  childAge?: number | null;
  parentName?: string | null;
  parentPhone?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  groupSchedule?: string | null;
  teacherName?: string | null;
  planTitle: string;
  planCode?: string | null;
  amount?: number | null;
  paymentStatus?: string | null;
  paymentMethod?: 'cash' | 'online' | null;
  latestPayment?: AdminPaymentRecord | null;
  totalLessons?: number | null;
  usedLessons?: number | null;
  remainingLessons?: number | null;
  lessonsTracked: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
  status: MoneySubscriptionStatus;
  progressPercent: number;
  importantNote?: string | null;
}

export interface MoneyOverviewSummary {
  todayPaidAmount: number;
  waitingAmount: number;
  overdueAmount: number;
  reviewCount: number;
  endingSoonCount: number;
  waitingCount: number;
  overdueCount: number;
  paidTodayCount: number;
}

export interface MoneyPaymentFiltersState {
  queue: MoneyPaymentQueue;
  status: MoneyPaymentStatusFilter;
  method: MoneyPaymentMethodFilter;
  type: 'all' | MoneyPaymentType;
  search: string;
}

export interface MoneyInvoiceDraft {
  clientId: string;
  paymentMethod: 'cash' | 'online';
  amount: string;
  dueDate: string;
  comment: string;
}

export interface MoneyWorkspaceData {
  payments: AdminPaymentRecord[];
  clients: AdminClientRecord[];
  children: AdminChildRecord[];
  groups: Group[];
  pricingPlans: OwnerPricingPlanDto[];
  journal: MoneyJournalEntry[];
}

export const moneyPaymentStatusLabels: Record<string, string> = {
  draft: 'Черновик',
  unpaid: 'Ждет оплату',
  pending: 'Нужно проверить',
  waiting_confirmation: 'Нужно проверить',
  paid: 'Оплачено',
  overdue: 'Просрочено',
  failed: 'Ошибка оплаты',
  cancelled: 'Отменено',
  refunded: 'Возврат',
  expired: 'Ссылка истекла',
};

export const moneySubscriptionStatusLabels: Record<MoneySubscriptionStatus, string> = {
  not_started: 'Не начался',
  active: 'Активен',
  ending_soon: 'Скоро закончится',
  expired_by_date: 'Закончился по сроку',
  finished_by_lessons: 'Занятия закончились',
  frozen: 'Заморозка',
  cancelled: 'Отменен',
  payment_required: 'Требует оплаты',
};

export const moneyPaymentTypeLabels: Record<MoneyPaymentType, string> = {
  trial: 'Пробное',
  subscription: 'Абонемент',
  renewal: 'Продление',
  event: 'Мероприятие',
  individual: 'Индивидуальное',
  custom: 'Другое',
  debt: 'Долг',
};

export const moneyQueueLabels: Record<MoneyPaymentQueue, string> = {
  all: 'Все',
  review: 'Проверить',
  waiting: 'Ждут',
  overdue: 'Просрочено',
  paid: 'Оплачено',
  trial: 'Пробные',
  cash: 'Наличные',
  online: 'Онлайн',
  problem: 'Ошибки',
};

export function formatMoney(value: number): string {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

export function formatShortDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

export function isOutstandingPayment(status?: string | null): boolean {
  return ['unpaid', 'pending', 'overdue', 'failed'].includes(String(status || ''));
}

export function getPaymentStatusLabel(status?: string | null): string {
  return moneyPaymentStatusLabels[String(status || '')] || String(status || 'Не задано');
}

export function getSubscriptionStatusLabel(status: MoneySubscriptionStatus): string {
  return moneySubscriptionStatusLabels[status];
}

export function derivePaymentType(payment: AdminPaymentRecord): MoneyPaymentType {
  const name = `${payment.subscriptionName || ''} ${payment.invoiceComment || ''}`.toLowerCase();
  if (name.includes('проб')) return 'trial';
  if (name.includes('продл')) return 'renewal';
  if (name.includes('меропр')) return 'event';
  if (name.includes('индив')) return 'individual';
  if (name.includes('долг')) return 'debt';
  return 'subscription';
}

export function paymentQueueMatches(payment: AdminPaymentRecord, queue: MoneyPaymentQueue): boolean {
  if (queue === 'review') return payment.status === 'pending';
  if (queue === 'waiting') return payment.status === 'unpaid';
  if (queue === 'overdue') return payment.status === 'overdue';
  if (queue === 'paid') return payment.status === 'paid';
  if (queue === 'trial') return derivePaymentType(payment) === 'trial';
  if (queue === 'cash') return payment.paymentMethod === 'cash';
  if (queue === 'online') return payment.paymentMethod === 'online';
  if (queue === 'problem') return ['failed', 'cancelled', 'refunded', 'expired'].includes(payment.status);
  return true;
}

function findPricingPlan(child: AdminChildRecord, pricingPlans: OwnerPricingPlanDto[]): OwnerPricingPlanDto | undefined {
  const code = String(child.subscriptionCode || '').trim().toLowerCase();
  const title = String(child.subscriptionName || '').trim().toLowerCase();
  return pricingPlans.find((plan) => {
    const planCode = String(plan.code || '').trim().toLowerCase();
    const planTitle = String(plan.title || '').trim().toLowerCase();
    return (code && planCode === code) || (title && planTitle === title);
  });
}

export function deriveSubscriptionRecord(
  child: AdminChildRecord,
  groups: Group[],
  pricingPlans: OwnerPricingPlanDto[],
): MoneySubscriptionRecord | null {
  if (!child.subscriptionName && !child.latestPayment) {
    return null;
  }

  const group = groups.find((entry) => String(entry.id) === String(child.groupId || ''));
  const plan = findPricingPlan(child, pricingPlans);
  const startsAt = child.latestPayment?.paidAt || child.updatedAt || child.createdAt || null;
  const durationDays = typeof plan?.duration_days === 'number' ? plan.duration_days : 30;

  let expiresAt: string | null = null;
  if (startsAt) {
    const startDate = new Date(startsAt);
    if (!Number.isNaN(startDate.getTime())) {
      const nextDate = new Date(startDate);
      nextDate.setDate(nextDate.getDate() + durationDays);
      expiresAt = nextDate.toISOString();
    }
  }

  const totalLessons =
    typeof child.totalClasses === 'number'
      ? child.totalClasses
      : typeof plan?.classes_count === 'number'
        ? plan.classes_count
        : null;
  const usedLessons = typeof child.attendedClasses === 'number' ? child.attendedClasses : 0;
  const remainingLessons =
    typeof child.remainingClasses === 'number'
      ? child.remainingClasses
      : totalLessons !== null
        ? Math.max(totalLessons - usedLessons, 0)
        : null;
  const lessonsTracked =
    typeof child.lessonsTracked === 'boolean'
      ? child.lessonsTracked
      : Boolean(plan?.classes_tracked || totalLessons !== null);

  const now = new Date();
  let status: MoneySubscriptionStatus = 'active';
  if (['unpaid', 'pending', 'failed', 'overdue', 'cancelled'].includes(String(child.paymentStatus || ''))) {
    status = 'payment_required';
  } else if (expiresAt) {
    const expiresAtDate = new Date(expiresAt);
    if (!Number.isNaN(expiresAtDate.getTime()) && expiresAtDate.getTime() < now.getTime()) {
      status = 'expired_by_date';
    }
  }
  if (status === 'active' && lessonsTracked && remainingLessons !== null) {
    if (remainingLessons <= 0) {
      status = 'finished_by_lessons';
    } else if (remainingLessons <= 2) {
      status = 'ending_soon';
    }
  }
  if (status === 'active' && expiresAt) {
    const expiresAtDate = new Date(expiresAt);
    const diffDays = Math.ceil((expiresAtDate.getTime() - now.getTime()) / 86_400_000);
    if (diffDays <= 5) {
      status = 'ending_soon';
    }
  }

  return {
    id: String(child.clientId || child.id),
    childId: child.id,
    clientId: child.clientId,
    childName: child.fullName,
    childAge: child.age,
    parentName: child.parentName,
    parentPhone: child.parentPhone,
    groupId: child.groupId,
    groupName: child.groupName,
    groupSchedule: group?.schedule || null,
    teacherName: group?.teacherName || null,
    planTitle: child.subscriptionName || 'Абонемент',
    planCode: child.subscriptionCode || plan?.code || null,
    amount: child.subscriptionAmount || plan?.price || null,
    paymentStatus: child.paymentStatus,
    paymentMethod: child.paymentMethod,
    latestPayment: child.latestPayment,
    totalLessons,
    usedLessons,
    remainingLessons,
    lessonsTracked,
    startsAt,
    expiresAt,
    status,
    progressPercent: typeof child.progressPercent === 'number' ? child.progressPercent : 0,
    importantNote: child.profile?.internalComment || child.notes || null,
  };
}

export function subscriptionQueueMatches(record: MoneySubscriptionRecord, filter: MoneySubscriptionFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'active') return record.status === 'active' || record.status === 'not_started';
  if (filter === 'ending_soon') return record.status === 'ending_soon';
  if (filter === 'expired') return ['expired_by_date', 'finished_by_lessons', 'cancelled'].includes(record.status);
  if (filter === 'frozen') return record.status === 'frozen';
  if (filter === 'payment_required') return record.status === 'payment_required';
  return true;
}

export function normalizePaymentSearch(payment: AdminPaymentRecord): string {
  return [
    payment.parentName || '',
    payment.parentPhone || '',
    payment.childName || '',
    payment.subscriptionName || '',
    payment.invoiceNumber || '',
    getPaymentStatusLabel(payment.status),
  ]
    .join(' ')
    .toLowerCase();
}

export function normalizeSubscriptionSearch(record: MoneySubscriptionRecord): string {
  return [
    record.childName,
    record.parentName || '',
    record.parentPhone || '',
    record.groupName || '',
    record.planTitle,
    getSubscriptionStatusLabel(record.status),
  ]
    .join(' ')
    .toLowerCase();
}
