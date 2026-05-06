import { AdminChildRecord, AdminPaymentRecord } from '../../lib/backendApi';
import { Task } from '../../types';
import { isOutstandingPaymentStatus } from '../payments/PaymentStatusBadge';

export type ClientStage =
  | 'lead_new'
  | 'contact_needed'
  | 'in_dialog'
  | 'trial_scheduled'
  | 'trial_attended'
  | 'trial_missed'
  | 'thinking'
  | 'waiting_payment'
  | 'active'
  | 'risk'
  | 'frozen'
  | 'paused'
  | 'lost'
  | 'archived';

export type ClientTemperature = 'hot' | 'warm' | 'cold' | 'problem';

export type TrialWorkspaceStage =
  | 'new_request'
  | 'scheduled'
  | 'waiting_decision'
  | 'waiting_payment'
  | 'converted'
  | 'at_risk'
  | 'not_trial';

export interface ClientNextAction {
  title: string;
  dueLabel: string;
  description: string;
  concrete: boolean;
  actionKey: 'open_profile' | 'assign_group' | 'invoice' | 'remind' | 'follow_up' | 'observe' | 'archive';
}

export interface ClientTimelineEntry {
  id: string;
  occurredAt: string;
  title: string;
  description: string;
  tone: 'default' | 'success' | 'warning';
}

export interface ClientTaskItem {
  id: string;
  title: string;
  description: string;
  dueLabel: string;
  priority: string;
  status: string;
  assigneeName: string;
  clientMatch: boolean;
}

export const clientStageLabel: Record<ClientStage, string> = {
  lead_new: 'Новая заявка',
  contact_needed: 'Нужно связаться',
  in_dialog: 'В диалоге',
  trial_scheduled: 'Записан на пробное',
  trial_attended: 'Был на пробном',
  trial_missed: 'Не пришел',
  thinking: 'Думает',
  waiting_payment: 'Ждет оплату',
  active: 'Действующий ученик',
  risk: 'Риск',
  frozen: 'Заморозка',
  paused: 'Пауза',
  lost: 'Отказ',
  archived: 'Архив',
};

export const clientStageClassName: Record<ClientStage, string> = {
  lead_new: 'border-[#D4AF37]/30 bg-[#FFF9E8] text-[#8B6B00]',
  contact_needed: 'border-[#D4AF37]/30 bg-[#FFF9E8] text-[#8B6B00]',
  in_dialog: 'border-blue-200 bg-blue-50 text-blue-700',
  trial_scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
  trial_attended: 'border-green-200 bg-green-50 text-green-700',
  trial_missed: 'border-red-200 bg-red-50 text-red-700',
  thinking: 'border-blue-200 bg-blue-50 text-blue-700',
  waiting_payment: 'border-[#D4AF37]/30 bg-[#FFF9E8] text-[#8B6B00]',
  active: 'border-green-200 bg-green-50 text-green-700',
  risk: 'border-red-200 bg-red-50 text-red-700',
  frozen: 'border-slate-200 bg-slate-100 text-slate-700',
  paused: 'border-slate-200 bg-slate-100 text-slate-700',
  lost: 'border-slate-200 bg-slate-100 text-slate-700',
  archived: 'border-slate-200 bg-slate-100 text-slate-700',
};

export const trialStageLabel: Record<TrialWorkspaceStage, string> = {
  new_request: 'Заявка без записи',
  scheduled: 'Записан на пробное',
  waiting_decision: 'После пробного',
  waiting_payment: 'Ждет оплату',
  converted: 'Купил абонемент',
  at_risk: 'Проблемный',
  not_trial: 'Нет пробного сценария',
};

export const clientTemperatureLabel: Record<ClientTemperature, string> = {
  hot: 'Горячий',
  warm: 'Теплый',
  cold: 'Холодный',
  problem: 'Проблемный',
};

export const clientTemperatureClassName: Record<ClientTemperature, string> = {
  hot: 'border-red-200 bg-red-50 text-red-700',
  warm: 'border-[#D4AF37]/30 bg-[#FFF9E8] text-[#8B6B00]',
  cold: 'border-slate-200 bg-slate-100 text-slate-700',
  problem: 'border-red-200 bg-red-50 text-red-700',
};

function formatRuDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

function diffDaysFromNow(value?: string | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function latestRelevantPayment(child: AdminChildRecord, payments: AdminPaymentRecord[]): AdminPaymentRecord | null {
  const childPayments = payments
    .filter((payment) => String(payment.clientId || '') === String(child.clientId || ''))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  return childPayments[0] || child.latestPayment || null;
}

export function deriveClientStage(child: AdminChildRecord, payments: AdminPaymentRecord[]): ClientStage {
  const latestPayment = latestRelevantPayment(child, payments);
  const paymentStatus = String(latestPayment?.status || child.paymentStatus || '');
  const parentStatus = String(child.parentAccountStatus || '');
  const hasLead = Boolean(child.landingLead);
  const inGroup = Boolean(child.groupId);
  const daysSinceUpdate = diffDaysFromNow(child.updatedAt || child.createdAt);

  if (parentStatus === 'suspended' || ['cancelled', 'refunded'].includes(paymentStatus)) {
    return 'archived';
  }
  if (paymentStatus === 'overdue' || paymentStatus === 'failed') {
    return 'risk';
  }
  if (paymentStatus === 'paid' && inGroup && parentStatus === 'active') {
    return 'active';
  }
  if (parentStatus === 'payment_pending' || ['unpaid', 'pending'].includes(paymentStatus)) {
    return 'waiting_payment';
  }
  if (hasLead && !inGroup) {
    if (daysSinceUpdate !== null && daysSinceUpdate <= 1) return 'lead_new';
    if (daysSinceUpdate !== null && daysSinceUpdate <= 4) return 'contact_needed';
    return 'in_dialog';
  }
  if (hasLead && inGroup && paymentStatus !== 'paid') {
    if (daysSinceUpdate !== null && daysSinceUpdate <= 2) return 'trial_scheduled';
    return 'thinking';
  }
  if (!inGroup && parentStatus === 'active') {
    return 'paused';
  }
  if (!inGroup) {
    return 'risk';
  }
  return 'active';
}

export function deriveTrialStage(child: AdminChildRecord, payments: AdminPaymentRecord[]): TrialWorkspaceStage {
  if (!child.landingLead) return 'not_trial';
  const stage = deriveClientStage(child, payments);
  if (!child.groupId) return 'new_request';
  if (stage === 'waiting_payment') return 'waiting_payment';
  if (stage === 'active') return 'converted';
  if (stage === 'risk') return 'at_risk';
  if (stage === 'trial_scheduled') return 'scheduled';
  return 'waiting_decision';
}

export function deriveClientTemperature(
  child: AdminChildRecord,
  payments: AdminPaymentRecord[],
  tasks: Task[],
): ClientTemperature {
  const stage = deriveClientStage(child, payments);
  const daysSinceUpdate = diffDaysFromNow(child.updatedAt || child.createdAt);
  const hasOpenTask = tasks.some(
    (task) => task.status === 'todo' && (task.relatedChildId === child.id || task.relatedUserId === child.parentUserId),
  );

  if (stage === 'waiting_payment' || stage === 'lead_new' || stage === 'trial_scheduled') {
    return 'hot';
  }
  if (stage === 'risk' || stage === 'trial_missed') {
    return 'problem';
  }
  if (stage === 'thinking' || stage === 'in_dialog' || hasOpenTask) {
    return 'warm';
  }
  if (daysSinceUpdate !== null && daysSinceUpdate > 21) {
    return 'cold';
  }
  return stage === 'active' ? 'warm' : 'cold';
}

export function deriveNextAction(child: AdminChildRecord, payments: AdminPaymentRecord[]): ClientNextAction {
  const stage = deriveClientStage(child, payments);
  const remaining = Number(child.remainingClasses || 0);

  if (stage === 'lead_new') {
    return {
      title: 'Связаться с родителем',
      dueLabel: 'сегодня',
      description: 'Новая заявка с сайта. Уточнить возраст, интерес и удобное время.',
      concrete: true,
      actionKey: 'open_profile',
    };
  }
  if (stage === 'contact_needed' || stage === 'in_dialog') {
    return {
      title: 'Написать и договориться о пробном',
      dueLabel: 'в ближайшие 24 часа',
      description: 'Контакт есть, но решения по пробному еще нет.',
      concrete: true,
      actionKey: 'open_profile',
    };
  }
  if (stage === 'trial_scheduled') {
    return {
      title: 'Подтвердить пробное занятие',
      dueLabel: 'до занятия',
      description: 'Напомнить родителю о времени, форме и группе.',
      concrete: true,
      actionKey: 'open_profile',
    };
  }
  if (stage === 'thinking') {
    return {
      title: 'Уточнить решение после пробного',
      dueLabel: 'сегодня',
      description: 'Пробный интерес был, теперь нужно дожать решение.',
      concrete: true,
      actionKey: 'follow_up',
    };
  }
  if (stage === 'waiting_payment') {
    return {
      title: 'Напомнить об оплате',
      dueLabel: 'сегодня',
      description: 'Есть открытый счет или родитель нажал “я уже оплатил”.',
      concrete: true,
      actionKey: 'remind',
    };
  }
  if (stage === 'risk') {
    return {
      title: 'Разобрать проблемную карточку',
      dueLabel: 'сегодня',
      description: 'Проверить долг, неявку или отсутствие группы и принять решение.',
      concrete: true,
      actionKey: 'open_profile',
    };
  }
  if (stage === 'paused' || stage === 'frozen') {
    return {
      title: 'Уточнить возврат в студию',
      dueLabel: 'на этой неделе',
      description: 'Карточка активна частично. Нужно понять, возвращается ли клиент.',
      concrete: true,
      actionKey: 'open_profile',
    };
  }
  if (stage === 'active' && remaining > 0 && remaining <= 2) {
    return {
      title: 'Предложить продление',
      dueLabel: 'до конца текущего абонемента',
      description: `Осталось ${remaining} занятия. Лучше заранее обсудить следующий абонемент.`,
      concrete: true,
      actionKey: 'invoice',
    };
  }
  if (stage === 'active') {
    return {
      title: 'Следить за посещаемостью',
      dueLabel: 'планово',
      description: 'Срочного действия нет. Контроль идет по занятиям и остатку абонемента.',
      concrete: false,
      actionKey: 'observe',
    };
  }
  return {
    title: 'Проверить карточку',
    dueLabel: 'по ситуации',
    description: 'Для этой карточки пока нет точного backend-статуса, поэтому решение принимается вручную.',
    concrete: false,
    actionKey: 'open_profile',
  };
}

export function buildClientTimeline(child: AdminChildRecord, payments: AdminPaymentRecord[]): ClientTimelineEntry[] {
  const timeline: ClientTimelineEntry[] = [];

  if (child.landingLead) {
    timeline.push({
      id: `lead-${child.landingLead.id}`,
      occurredAt: child.createdAt || '',
      title: 'Заявка с сайта',
      description: child.landingLead.discoverySource
        ? `Источник: ${child.landingLead.discoverySource}`
        : 'Заявка попала в систему из публичной формы.',
      tone: 'default',
    });
  }

  if (child.groupId) {
    timeline.push({
      id: `group-${child.id}`,
      occurredAt: child.updatedAt || child.createdAt || '',
      title: 'Назначена группа',
      description: child.groupName || 'Группа привязана к карточке клиента.',
      tone: 'success',
    });
  }

  const childPayments = payments
    .filter((payment) => String(payment.clientId || '') === String(child.clientId || ''))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

  childPayments.forEach((payment) => {
    timeline.push({
      id: `payment-${payment.id}`,
      occurredAt: payment.createdAt,
      title: 'Создан счет',
      description: `${payment.subscriptionName || 'Абонемент'} • ${Number(payment.amount || 0).toLocaleString('ru-RU')} ₽`,
      tone: 'default',
    });
    if (payment.lastReminderAt) {
      timeline.push({
        id: `reminder-${payment.id}`,
        occurredAt: payment.lastReminderAt,
        title: 'Отправлено напоминание',
        description: `Напоминание по счету ${payment.invoiceNumber || payment.id}`,
        tone: 'warning',
      });
    }
    if (payment.paidAt || payment.status === 'paid') {
      timeline.push({
        id: `paid-${payment.id}`,
        occurredAt: payment.paidAt || payment.statusUpdatedAt || payment.updatedAt,
        title: 'Оплата подтверждена',
        description: `${payment.subscriptionName || 'Абонемент'} оплачен.`,
        tone: 'success',
      });
    } else if (payment.statusUpdatedAt && payment.status !== 'paid') {
      timeline.push({
        id: `status-${payment.id}`,
        occurredAt: payment.statusUpdatedAt,
        title: 'Статус платежа изменен',
        description: `Текущий статус: ${payment.status}`,
        tone: payment.status === 'overdue' || payment.status === 'failed' ? 'warning' : 'default',
      });
    }
  });

  if (child.profile?.updatedAt) {
    timeline.push({
      id: `profile-${child.id}`,
      occurredAt: child.profile.updatedAt,
      title: 'Обновлен внутренний профиль',
      description: 'Добавлены или изменены заметки по ребенку и родителю.',
      tone: 'default',
    });
  }

  return timeline
    .filter((item) => Boolean(item.occurredAt))
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

export function buildClientTasks(child: AdminChildRecord, tasks: Task[]): ClientTaskItem[] {
  return tasks
    .filter((task) => task.relatedChildId === child.id || task.relatedUserId === child.parentUserId)
    .map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      dueLabel: task.dueDate ? formatRuDate(task.dueDate.toString()) : 'Без срока',
      priority: task.priority,
      status: task.status,
      assigneeName: task.assigneeName,
      clientMatch: task.relatedChildId === child.id || task.relatedUserId === child.parentUserId,
    }))
    .sort((a, b) => a.status.localeCompare(b.status));
}
