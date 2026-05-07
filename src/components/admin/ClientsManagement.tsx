import { useEffect, useMemo, useState } from 'react';
import {
  AdminChildRecord,
  AdminPaymentRecord,
  assignAdminChildGroup,
  createAdminInvoice,
  loadAdminChildren,
  loadAdminPayments,
  loadOwnerGroups,
  sendAdminPaymentReminder,
  updateAdminChildProfile,
} from '../../lib/backendApi';
import { Group, Task, User } from '../../types';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FolderArchive,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { AddStudentDialog } from './AddStudentDialog';
import { EmptyState } from '../EmptyState';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { useIsMobile } from '../ui/use-mobile';
import { PaymentStatusBadge, isOutstandingPaymentStatus, paymentStatusLabel } from '../payments/PaymentStatusBadge';
import { ClientCard } from '../clients/ClientCard';
import { ClientNextAction } from '../clients/ClientNextAction';
import { ClientStatusBadge } from '../clients/ClientStatusBadge';
import { ClientTemperatureBadge } from '../clients/ClientTemperatureBadge';
import { MobileClientsWorkspace } from '../clients/MobileClientsWorkspace';
import { MobileClientDetails } from '../clients/MobileClientDetails';
import {
  ClientStage,
  TrialWorkspaceStage,
  buildClientTasks,
  buildClientTimeline,
  clientStageLabel,
  clientTemperatureLabel,
  deriveClientStage,
  deriveClientTemperature,
  deriveNextAction,
  deriveTrialStage,
  trialStageLabel,
} from '../clients/clientStatus';
import {
  ArchiveFilter,
  ClientWorkspaceEntry,
  StageFilter,
  TaskTab,
  TemperatureFilter,
  WorkspaceTab,
} from '../clients/clientsWorkspaceTypes';

const workspaceLabels: Record<WorkspaceTab, string> = {
  today: 'Сегодня',
  funnel: 'Воронка',
  base: 'База клиентов',
  trials: 'Пробные',
  tasks: 'Задачи',
  archive: 'Архив',
};

const stageOrder: ClientStage[] = [
  'lead_new',
  'contact_needed',
  'in_dialog',
  'trial_scheduled',
  'trial_attended',
  'trial_missed',
  'thinking',
  'waiting_payment',
  'active',
  'risk',
  'frozen',
  'paused',
  'lost',
  'archived',
];

const trialSectionOrder: TrialWorkspaceStage[] = [
  'new_request',
  'scheduled',
  'waiting_decision',
  'waiting_payment',
  'converted',
  'at_risk',
];

const stageFilterOptions: Array<{ value: StageFilter; label: string }> = [
  { value: 'all', label: 'Все статусы' },
  { value: 'leads', label: 'Новые и в работе' },
  { value: 'trials', label: 'Пробные' },
  { value: 'waiting_payment', label: 'Ждут оплату' },
  { value: 'active', label: 'Активные' },
  { value: 'risk', label: 'Риск' },
  { value: 'archive', label: 'Архив' },
];

const temperatureFilterOptions: Array<{ value: TemperatureFilter; label: string }> = [
  { value: 'all', label: 'Любая температура' },
  { value: 'hot', label: 'Горячие' },
  { value: 'warm', label: 'Теплые' },
  { value: 'cold', label: 'Холодные' },
  { value: 'problem', label: 'Проблемные' },
];

const archiveFilterOptions: Array<{ value: ArchiveFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'lost', label: 'Отказ' },
  { value: 'no_response', label: 'Не отвечает' },
  { value: 'no_show', label: 'Не пришел' },
  { value: 'too_expensive', label: 'Дорого' },
  { value: 'schedule', label: 'Не подошло расписание' },
  { value: 'former', label: 'Бывшие' },
  { value: 'duplicate', label: 'Дубль' },
  { value: 'other', label: 'Другое' },
];

const todaySectionDescriptions: Record<string, string> = {
  new: 'Первый контакт еще не закрыт.',
  dialog: 'Есть интерес, но нужно дожать следующий шаг.',
  trials: 'Нужно закрыть решение после пробного.',
  payments: 'Есть счет или ожидается подтверждение оплаты.',
  risk: 'Карточки с долгом, проблемой или зависшим сценарием.',
  'no-action': 'Нет четкого следующего шага и ответственного решения.',
};

const funnelSectionDescriptions: Record<string, string> = {
  new: 'Люди, с которыми работа только начинается.',
  trials: 'Записаны на пробное, были или думают после него.',
  waiting: 'Счет уже есть или платеж еще не подтвержден.',
  active: 'Занимаются и находятся в текущей базе студии.',
  risk: 'Просрочка, нет группы или карточка зависла.',
  archive: 'Неактуальные, ушедшие и закрытые сценарии.',
};

const trialSectionDescriptions: Record<Exclude<TrialWorkspaceStage, 'not_trial'>, string> = {
  new_request: 'Есть интерес, но еще нет явной записи на пробное.',
  scheduled: 'Пробный сценарий уже движется, нужен контроль до занятия.',
  waiting_decision: 'После пробного нужно дожать решение или записать повторно.',
  waiting_payment: 'Пробный сценарий дошел до счета и ждет оплаты.',
  converted: 'Пробный сценарий завершился покупкой абонемента.',
  at_risk: 'Пробный сценарий завис или пошел в проблемную ветку.',
};

export interface AdminClientsNavigationContext {
  requestId: number;
  searchQuery?: string;
  sourceLabel?: string;
}

function formatRuDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

function formatRuDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

function sourceLabel(child: AdminChildRecord): string {
  return child.profile?.sourceChannel || child.landingLead?.discoverySource || 'Не указан';
}

function buildFunnelSteps(stage: ClientStage, child: AdminChildRecord) {
  const currentIndex = stageOrder.indexOf(stage);
  const steps = [
    { id: 'lead', label: 'Заявка', date: child.createdAt || '' },
    { id: 'contact', label: 'Связались', date: child.updatedAt || '' },
    { id: 'trial', label: 'Пробное', date: child.groupId ? child.updatedAt || '' : '' },
    { id: 'decision', label: 'Решение', date: child.updatedAt || '' },
    { id: 'payment', label: 'Оплата', date: child.latestPayment?.paidAt || child.latestPayment?.createdAt || '' },
    { id: 'active', label: 'Активный ученик', date: stage === 'active' ? child.updatedAt || '' : '' },
  ];
  return steps.map((step, index) => ({
    ...step,
    state: currentIndex > index ? 'done' : currentIndex === index ? 'current' : 'pending',
  }));
}

function buildTrialFacts(child: AdminChildRecord, payments: AdminPaymentRecord[]) {
  const trialStage = deriveTrialStage(child, payments);
  return {
    trialStage,
    title: trialStageLabel[trialStage],
    note:
      trialStage === 'new_request'
        ? 'Есть интерес с сайта, но еще нет записи в группу.'
        : trialStage === 'scheduled'
          ? 'Пробное, вероятно, запланировано через группу. Отдельной backend-сущности пока нет.'
          : trialStage === 'waiting_decision'
            ? 'Пробный интерес подтвержден, решение после него еще не закрыто.'
            : trialStage === 'waiting_payment'
              ? 'После пробного сценария остался открытый платеж.'
              : trialStage === 'converted'
                ? 'Карточка прошла путь до покупки абонемента.'
                : 'Пробный сценарий требует ручной проверки.',
  };
}

function taskDueLabel(task: Task): string {
  if (!task.dueDate) return 'Без срока';
  return new Date(task.dueDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

function stageReason(stage: ClientStage): string {
  switch (stage) {
    case 'lead_new':
      return 'Новая заявка недавно попала в CRM и еще не обработана.';
    case 'contact_needed':
      return 'Интерес подтвержден, но первый контакт еще не закрыт.';
    case 'in_dialog':
      return 'Контакт есть, но решение по пробному или группе еще не принято.';
    case 'trial_scheduled':
      return 'Пробный сценарий уже движется и требует подтверждения.';
    case 'thinking':
      return 'После пробного решения по покупке еще нет.';
    case 'waiting_payment':
      return 'Есть открытый счет, ожидание оплаты или подтверждения.';
    case 'active':
      return 'Клиент в действующей базе и занимается в группе.';
    case 'risk':
      return 'Есть просрочка, проблема с группой или зависшее действие.';
    case 'paused':
      return 'Клиент временно выпал из активного потока и требует уточнения.';
    case 'frozen':
      return 'Сценарий находится в заморозке и требует ручного контроля.';
    case 'lost':
      return 'Сделка закрылась без продолжения, нужна причина отказа.';
    case 'archived':
      return 'Карточка выведена из активной работы.';
    default:
      return 'Статус рассчитан по текущим данным карточки.';
  }
}

function archiveCategory(stage: ClientStage): ArchiveFilter {
  if (stage === 'lost') return 'lost';
  if (stage === 'paused' || stage === 'frozen') return 'former';
  return 'other';
}

function archiveCategoryLabel(filter: ArchiveFilter): string {
  return archiveFilterOptions.find((item) => item.value === filter)?.label || 'Причина не указана';
}

export function ClientsManagement({
  navigationContext,
  onNavigationContextApplied,
  onNavigatePayments,
  onNavigateSection,
  tasks,
  currentUser,
}: {
  navigationContext?: AdminClientsNavigationContext;
  onNavigationContextApplied?: () => void;
  onNavigatePayments?: (context?: { searchQuery?: string; queue?: 'review' | 'waiting' | 'overdue' | 'paid' | 'problem' | 'all'; sourceLabel?: string; invoiceClientId?: string }) => void;
  onNavigateSection?: (page: string) => void;
  tasks: Task[];
  currentUser: User;
}) {
  const isMobile = useIsMobile();
  const [children, setChildren] = useState<AdminChildRecord[]>([]);
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('today');
  const [taskTab, setTaskTab] = useState<TaskTab>('mine');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [temperatureFilter, setTemperatureFilter] = useState<TemperatureFilter>('all');
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>('all');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssigningChildId, setIsAssigningChildId] = useState<string | null>(null);
  const [isInvoicingChildId, setIsInvoicingChildId] = useState<string | null>(null);
  const [isReminderPaymentId, setIsReminderPaymentId] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    internalComment: '',
    healthNotes: '',
    behavioralNotes: '',
    goals: '',
    strengths: '',
    parentExpectations: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    communicationPreferences: '',
    sourceChannel: '',
    priorExperience: '',
    tagsInput: '',
  });
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [contextId, setContextId] = useState<number | null>(null);
  const [contextLabel, setContextLabel] = useState<string | null>(null);

  const refresh = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [childrenRows, paymentRows, groupRows] = await Promise.all([
        loadAdminChildren(),
        loadAdminPayments(),
        loadOwnerGroups(),
      ]);
      setChildren(childrenRows);
      setPayments(paymentRows);
      setGroups(groupRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить клиентов');
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!navigationContext) return;
    if (contextId === navigationContext.requestId) return;
    if (navigationContext.searchQuery !== undefined) {
      setSearchQuery(navigationContext.searchQuery);
    }
    setContextLabel(navigationContext.sourceLabel || 'Фокус из другого раздела');
    setContextId(navigationContext.requestId);
    onNavigationContextApplied?.();
  }, [navigationContext, contextId, onNavigationContextApplied]);

  const sourceOptions = useMemo(() => {
    return Array.from(
      new Set(children.map((child) => sourceLabel(child)).filter((value) => value && value !== 'Не указан')),
    );
  }, [children]);

  const childPaymentsMap = useMemo(() => {
    const map = new Map<string, AdminPaymentRecord[]>();
    payments.forEach((payment) => {
      const key = String(payment.clientId || '');
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(payment);
    });
    map.forEach((value) => value.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()));
    return map;
  }, [payments]);

  const childrenWithMeta = useMemo<ClientWorkspaceEntry[]>(() => {
    return children.map((child) => {
      const childPayments = childPaymentsMap.get(String(child.clientId || '')) || [];
      const stage = deriveClientStage(child, childPayments);
      const temperature = deriveClientTemperature(child, childPayments, tasks);
      const nextAction = deriveNextAction(child, childPayments);
      const timeline = buildClientTimeline(child, childPayments);
      const relatedTasks = buildClientTasks(child, tasks);
      const trialFacts = buildTrialFacts(child, childPayments);
      const latestOpenPayment = childPayments.find((payment) => isOutstandingPaymentStatus(payment.status)) || null;
      return {
        child,
        payments: childPayments,
        stage,
        temperature,
        nextAction,
        timeline,
        relatedTasks,
        trialFacts,
        latestOpenPayment,
      };
    });
  }, [children, childPaymentsMap, tasks]);

  const selectedClient = useMemo(
    () => childrenWithMeta.find((entry) => entry.child.id === selectedChildId) || null,
    [childrenWithMeta, selectedChildId],
  );

  useEffect(() => {
    if (!selectedClient) return;
    const profile = selectedClient.child.profile || {
      internalComment: '',
      healthNotes: '',
      behavioralNotes: '',
      goals: '',
      strengths: '',
      parentExpectations: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      communicationPreferences: '',
      sourceChannel: '',
      priorExperience: '',
      tags: [],
    };
    setProfileDraft({
      internalComment: profile.internalComment || '',
      healthNotes: profile.healthNotes || '',
      behavioralNotes: profile.behavioralNotes || '',
      goals: profile.goals || '',
      strengths: profile.strengths || '',
      parentExpectations: profile.parentExpectations || '',
      emergencyContactName: profile.emergencyContactName || '',
      emergencyContactPhone: profile.emergencyContactPhone || '',
      communicationPreferences: profile.communicationPreferences || '',
      sourceChannel: profile.sourceChannel || sourceLabel(selectedClient.child),
      priorExperience: profile.priorExperience || selectedClient.child.landingLead?.previousActivities || '',
      tagsInput: (profile.tags || []).join(', '),
    });
  }, [selectedClient]);

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return childrenWithMeta.filter((entry) => {
      const { child, stage } = entry;
      const searchText = [
        child.fullName || '',
        child.parentName || '',
        child.parentPhone || '',
        child.groupName || '',
        child.subscriptionName || '',
        sourceLabel(child),
        child.profile?.internalComment || '',
        clientStageLabel[stage],
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = !query || searchText.includes(query);
      const matchesGroup =
        groupFilter === 'all' ||
        (groupFilter === 'ungrouped' && !child.groupId) ||
        String(child.groupId || '') === groupFilter;
      const matchesPayment = paymentFilter === 'all' || String(child.paymentStatus || '') === paymentFilter;
      const matchesSource = sourceFilter === 'all' || sourceLabel(child) === sourceFilter;
      const matchesStage =
        stageFilter === 'all' ||
        (stageFilter === 'leads' && ['lead_new', 'contact_needed', 'in_dialog'].includes(stage)) ||
        (stageFilter === 'trials' && ['trial_scheduled', 'thinking'].includes(stage)) ||
        stage === stageFilter ||
        (stageFilter === 'archive' && ['archived', 'paused', 'lost', 'frozen'].includes(stage));
      const matchesTemperature = temperatureFilter === 'all' || entry.temperature === temperatureFilter;
      return matchesSearch && matchesGroup && matchesPayment && matchesSource && matchesStage && matchesTemperature;
    });
  }, [childrenWithMeta, searchQuery, groupFilter, paymentFilter, sourceFilter, stageFilter, temperatureFilter]);

  const todaySummary = useMemo(() => {
    const newRequests = filteredClients.filter((entry) => ['lead_new', 'contact_needed'].includes(entry.stage)).length;
    const trials = filteredClients.filter((entry) => ['trial_scheduled', 'thinking'].includes(entry.stage)).length;
    const waitingDecision = filteredClients.filter((entry) => entry.stage === 'thinking').length;
    const waitingPayment = filteredClients.filter((entry) => entry.stage === 'waiting_payment').length;
    const risk = filteredClients.filter((entry) => entry.stage === 'risk').length;
    const withoutConcreteAction = filteredClients.filter((entry) => !entry.nextAction.concrete && entry.stage !== 'archived').length;
    return {
      newRequests,
      trials,
      waitingDecision,
      waitingPayment,
      risk,
      withoutConcreteAction,
    };
  }, [filteredClients]);

  const baseSummary = useMemo(() => {
    return {
      total: childrenWithMeta.length,
      active: childrenWithMeta.filter((entry) => entry.stage === 'active').length,
      waiting: childrenWithMeta.filter((entry) => entry.stage === 'waiting_payment').length,
      trials: childrenWithMeta.filter((entry) => ['trial_scheduled', 'thinking'].includes(entry.stage)).length,
      risk: childrenWithMeta.filter((entry) => entry.stage === 'risk').length,
      archived: childrenWithMeta.filter((entry) => entry.stage === 'archived').length,
    };
  }, [childrenWithMeta]);

  const todaySections = useMemo(() => {
    return [
      {
        id: 'new',
        title: 'Новые заявки',
        items: filteredClients.filter((entry) => ['lead_new', 'contact_needed'].includes(entry.stage)),
      },
      {
        id: 'dialog',
        title: 'Связаться сегодня',
        items: filteredClients.filter((entry) => entry.stage === 'in_dialog'),
      },
      {
        id: 'trials',
        title: 'Пробные без решения',
        items: filteredClients.filter((entry) => ['trial_scheduled', 'thinking'].includes(entry.stage)),
      },
      {
        id: 'payments',
        title: 'Ждут оплату',
        items: filteredClients.filter((entry) => entry.stage === 'waiting_payment'),
      },
      {
        id: 'risk',
        title: 'Просрочки и риск',
        items: filteredClients.filter((entry) => entry.stage === 'risk'),
      },
      {
        id: 'no-action',
        title: 'Нет четкого следующего действия',
        items: filteredClients.filter((entry) => !entry.nextAction.concrete && entry.stage !== 'archived'),
      },
    ];
  }, [filteredClients]);

  const funnelSections = useMemo(() => {
    return [
      {
        id: 'new',
        title: 'Новые',
        items: filteredClients.filter((entry) => ['lead_new', 'contact_needed', 'in_dialog'].includes(entry.stage)),
      },
      {
        id: 'trials',
        title: 'Пробные',
        items: filteredClients.filter((entry) => ['trial_scheduled', 'thinking'].includes(entry.stage)),
      },
      {
        id: 'waiting',
        title: 'Ждут оплату',
        items: filteredClients.filter((entry) => entry.stage === 'waiting_payment'),
      },
      {
        id: 'active',
        title: 'Активные',
        items: filteredClients.filter((entry) => entry.stage === 'active'),
      },
      {
        id: 'risk',
        title: 'Риск',
        items: filteredClients.filter((entry) => entry.stage === 'risk'),
      },
      {
        id: 'archive',
        title: 'Архив',
        items: filteredClients.filter((entry) => entry.stage === 'archived'),
      },
    ];
  }, [filteredClients]);

  const trialSections = useMemo(() => {
    return trialSectionOrder
      .map((trialKey) => ({
        id: trialKey,
        title: trialStageLabel[trialKey],
        items: filteredClients.filter((entry) => entry.trialFacts.trialStage === trialKey),
      }));
  }, [filteredClients]);

  const taskPool = useMemo(() => {
    return tasks.filter((task) => task.relatedChildId || task.relatedUserId);
  }, [tasks]);

  const visibleTaskPool = useMemo(() => {
    const now = new Date();
    return taskPool.filter((task) => {
      if (taskTab === 'mine') return task.assigneeId === currentUser.id && task.status !== 'done';
      if (taskTab === 'today') {
        if (!task.dueDate) return false;
        return new Date(task.dueDate).toDateString() === now.toDateString() && task.status !== 'done';
      }
      if (taskTab === 'overdue') {
        if (!task.dueDate) return false;
        return new Date(task.dueDate) < now && task.status !== 'done';
      }
      if (taskTab === 'unassigned') return !task.assigneeId && task.status !== 'done';
      return task.status === 'done';
    });
  }, [taskPool, taskTab, currentUser.id]);

  const archivePool = useMemo(() => {
    return filteredClients.filter((entry) => {
      if (!['archived', 'paused', 'lost', 'frozen'].includes(entry.stage)) {
        return false;
      }
      if (archiveFilter === 'all') {
        return true;
      }
      return archiveCategory(entry.stage) === archiveFilter;
    });
  }, [filteredClients, archiveFilter]);

  const parentOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string; phone: string }>();
    for (const entry of childrenWithMeta) {
      const key = entry.child.parentUserId || entry.child.parentPhone || '';
      if (!key || map.has(key)) continue;
      map.set(key, {
        id: String(entry.child.parentUserId || key),
        name: entry.child.parentName || entry.child.parentPhone || 'Родитель',
        email: '',
        phone: entry.child.parentPhone || '',
      });
    }
    return Array.from(map.values());
  }, [childrenWithMeta]);

  const subscriptions = useMemo(
    () => [
      { id: 'hobby', name: 'Хобби' },
      { id: 'pro', name: 'Про' },
    ],
    [],
  );

  const openClient = (childId: string) => {
    setSelectedChildId(childId);
    setIsDetailsOpen(true);
  };

  const saveProfile = async () => {
    if (!selectedClient) return;
    setIsProfileSaving(true);
    try {
      const response = await updateAdminChildProfile(selectedClient.child.id, {
        internal_comment: profileDraft.internalComment,
        health_notes: profileDraft.healthNotes,
        behavioral_notes: profileDraft.behavioralNotes,
        goals: profileDraft.goals,
        strengths: profileDraft.strengths,
        parent_expectations: profileDraft.parentExpectations,
        emergency_contact_name: profileDraft.emergencyContactName,
        emergency_contact_phone: profileDraft.emergencyContactPhone,
        communication_preferences: profileDraft.communicationPreferences,
        source_channel: profileDraft.sourceChannel,
        prior_experience: profileDraft.priorExperience,
        tags: profileDraft.tagsInput
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setChildren((prev) => prev.map((child) => (child.id === response.child.id ? response.child : child)));
      toast.success('Внутренний профиль обновлен');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить внутренний профиль');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const assignGroup = async (childId: string, groupId: string | null) => {
    setIsAssigningChildId(childId);
    try {
      await assignAdminChildGroup(childId, { group_id: groupId || null });
      toast.success(groupId ? 'Группа назначена' : 'Ученик снят с группы');
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить группу');
    } finally {
      setIsAssigningChildId(null);
    }
  };

  const createInvoiceForChild = async (child: AdminChildRecord) => {
    if (!child.clientId) {
      toast.error('У карточки нет clientId для выставления счета');
      return;
    }
    setIsInvoicingChildId(child.id);
    try {
      await createAdminInvoice({
        client_id: String(child.clientId),
        payment_method: 'online',
        amount: Number(child.subscriptionAmount || 0) || undefined,
      });
      toast.success('Счет выставлен');
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось выставить счет');
    } finally {
      setIsInvoicingChildId(null);
    }
  };

  const remindAboutPayment = async (payment: AdminPaymentRecord) => {
    setIsReminderPaymentId(payment.id);
    try {
      await sendAdminPaymentReminder(payment.id);
      toast.success('Напоминание отправлено');
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось отправить напоминание');
    } finally {
      setIsReminderPaymentId(null);
    }
  };

  const renderClientCard = (entry: (typeof childrenWithMeta)[number], sectionLabel?: string) => (
    <ClientCard
      key={entry.child.id}
      child={entry.child}
      stage={entry.stage}
      temperature={entry.temperature}
      nextAction={entry.nextAction}
      outstandingPayment={entry.latestOpenPayment}
      groups={groups}
      onOpen={() => openClient(entry.child.id)}
      onOpenPayments={() =>
        onNavigatePayments?.({
          searchQuery: entry.child.parentPhone || entry.child.fullName,
          queue: entry.stage === 'waiting_payment' ? 'waiting' : entry.stage === 'risk' ? 'problem' : 'all',
          sourceLabel: `Оплаты по ${entry.child.fullName}`,
          invoiceClientId: entry.child.clientId || undefined,
        })
      }
      onCreateInvoice={() => void createInvoiceForChild(entry.child)}
      onRemind={entry.latestOpenPayment ? () => void remindAboutPayment(entry.latestOpenPayment as AdminPaymentRecord) : undefined}
      onAssignGroup={(groupId) => void assignGroup(entry.child.id, groupId)}
      onOpenTasks={() => {
        setWorkspaceTab('tasks');
        if (entry.relatedTasks.length === 0 && onNavigateSection) {
          onNavigateSection('tasks-management');
        }
      }}
      isAssigning={isAssigningChildId === entry.child.id}
      isInvoicing={isInvoicingChildId === entry.child.id}
      isReminding={entry.latestOpenPayment ? isReminderPaymentId === entry.latestOpenPayment.id : false}
      sectionLabel={sectionLabel}
    />
  );

  const renderCompactClientRow = (
    entry: (typeof childrenWithMeta)[number],
    options?: {
      contextLabel?: string;
      highlight?: string;
      showSource?: boolean;
      showPayment?: boolean;
      showGroup?: boolean;
      showArchive?: boolean;
    },
  ) => (
    <Card key={`${options?.contextLabel || 'compact'}-${entry.child.id}`} className="border-[#133C2A]/10 bg-white/95 shadow-[0_8px_24px_rgba(19,60,42,0.05)]">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <button type="button" onClick={() => openClient(entry.child.id)} className="truncate text-left text-lg text-[#133C2A] hover:underline">
                  {entry.child.fullName || 'Ученик'}
                </button>
                <p className="mt-1 text-sm text-[#133C2A]/62">
                  {entry.child.age ?? '—'} лет • {entry.child.parentName || 'Родитель не указан'} • {entry.child.parentPhone || 'Телефон не указан'}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <ClientStatusBadge stage={entry.stage} />
                <ClientTemperatureBadge temperature={entry.temperature} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {options?.showSource !== false ? (
                <div className="rounded-2xl bg-[#F8F4E3]/68 px-3 py-3">
                  <p className="text-xs text-[#133C2A]/45">Источник</p>
                  <p className="mt-1 text-sm text-[#133C2A]">{sourceLabel(entry.child)}</p>
                </div>
              ) : null}
              {options?.showGroup !== false ? (
                <div className="rounded-2xl bg-[#F8F4E3]/68 px-3 py-3">
                  <p className="text-xs text-[#133C2A]/45">Группа</p>
                  <p className="mt-1 text-sm text-[#133C2A]">{entry.child.groupName || 'Не назначена'}</p>
                </div>
              ) : null}
              <div className="rounded-2xl bg-[#F8F4E3]/68 px-3 py-3">
                <p className="text-xs text-[#133C2A]/45">Следующий шаг</p>
                <p className="mt-1 text-sm text-[#133C2A]">{entry.nextAction.title}</p>
                <p className="mt-1 text-xs text-[#133C2A]/50">{entry.nextAction.dueLabel}</p>
              </div>
              {options?.showPayment !== false ? (
                <div className="rounded-2xl bg-[#F8F4E3]/68 px-3 py-3">
                  <p className="text-xs text-[#133C2A]/45">Оплата</p>
                  <p className="mt-1 text-sm text-[#133C2A]">
                    {paymentStatusLabel(entry.latestOpenPayment?.status || entry.child.paymentStatus)}
                    {entry.latestOpenPayment?.amount ? ` • ${Number(entry.latestOpenPayment.amount).toLocaleString('ru-RU')} ₽` : ''}
                  </p>
                </div>
              ) : null}
            </div>

            {options?.highlight ? (
              <div className="rounded-2xl border border-[#D4AF37]/25 bg-[#FFF9E8] px-3 py-3 text-sm text-[#8B6B00]">
                {options.highlight}
              </div>
            ) : null}

            {options?.showArchive ? (
              <div className="rounded-2xl border border-[#133C2A]/10 bg-[#fbf7e8]/72 px-3 py-3 text-sm text-[#133C2A]/68">
                Причина архива: {archiveCategoryLabel(archiveCategory(entry.stage))}
              </div>
            ) : null}
          </div>

          <div className="flex w-full flex-col gap-2 lg:w-[230px]">
            <Button onClick={() => openClient(entry.child.id)} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
              Открыть карточку
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl border-[#133C2A]/15"
              onClick={() =>
                onNavigatePayments?.({
                  searchQuery: entry.child.parentPhone || entry.child.fullName,
                  queue: entry.stage === 'waiting_payment' ? 'waiting' : entry.stage === 'risk' ? 'problem' : 'all',
                  sourceLabel: `Оплаты по ${entry.child.fullName}`,
                  invoiceClientId: entry.child.clientId || undefined,
                })
              }
            >
              Открыть оплаты
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl border-[#133C2A]/15"
              onClick={() => {
                if (entry.latestOpenPayment) {
                  void remindAboutPayment(entry.latestOpenPayment);
                  return;
                }
                void createInvoiceForChild(entry.child);
              }}
              disabled={Boolean(entry.latestOpenPayment ? isReminderPaymentId === entry.latestOpenPayment.id : isInvoicingChildId === entry.child.id)}
            >
              {entry.latestOpenPayment ? 'Напомнить' : 'Выставить счет'}
            </Button>
            <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={() => onNavigateSection?.('tasks-management')}>
              Задачи
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const openPaymentsForEntry = (entry: (typeof childrenWithMeta)[number]) => {
    onNavigatePayments?.({
      searchQuery: entry.child.parentPhone || entry.child.fullName,
      queue: entry.stage === 'waiting_payment' ? 'waiting' : entry.stage === 'risk' ? 'problem' : 'all',
      sourceLabel: `Оплаты по ${entry.child.fullName}`,
      invoiceClientId: entry.child.clientId || undefined,
    });
  };

  const openTasksForEntry = (entry: (typeof childrenWithMeta)[number]) => {
    setWorkspaceTab('tasks');
    if (entry.relatedTasks.length === 0 && onNavigateSection) {
      onNavigateSection('tasks-management');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {isMobile ? (
        <MobileClientsWorkspace
          isLoading={isLoading}
          groups={groups}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          groupFilter={groupFilter}
          setGroupFilter={setGroupFilter}
          paymentFilter={paymentFilter}
          setPaymentFilter={setPaymentFilter}
          sourceFilter={sourceFilter}
          setSourceFilter={setSourceFilter}
          stageFilter={stageFilter}
          setStageFilter={setStageFilter}
          temperatureFilter={temperatureFilter}
          setTemperatureFilter={setTemperatureFilter}
          archiveFilter={archiveFilter}
          setArchiveFilter={setArchiveFilter}
          sourceOptions={sourceOptions}
          filteredClients={filteredClients}
          todaySummary={todaySummary}
          todaySections={todaySections}
          funnelSections={funnelSections}
          trialSections={trialSections}
          visibleTaskPool={visibleTaskPool}
          taskTab={taskTab}
          setTaskTab={setTaskTab}
          archivePool={archivePool}
          onOpenClient={openClient}
          onOpenPayments={openPaymentsForEntry}
          onCreateInvoice={(entry) => void createInvoiceForChild(entry.child)}
          onRemind={(payment) => void remindAboutPayment(payment)}
          onOpenTasks={openTasksForEntry}
          onAssignGroup={(entry) => openClient(entry.child.id)}
          onOpenComments={(entry) => openClient(entry.child.id)}
          isInvoicingChildId={isInvoicingChildId}
          isReminderPaymentId={isReminderPaymentId}
          onNavigateSection={onNavigateSection}
        />
      ) : (
        <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Клиенты и заявки</h1>
          <p className="text-[#133C2A]/60">Единый CRM-центр по заявкам, пробным, действующим ученикам, оплатам и рискам.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
          <Button variant="outline" className="rounded-2xl" onClick={() => void refresh(true)} disabled={isRefreshing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {isRefreshing ? 'Обновляем...' : 'Обновить'}
          </Button>
          <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить ученика
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-6">
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Новые заявки</p><p className="mt-1 text-3xl text-[#133C2A]">{todaySummary.newRequests}</p><p className="mt-2 text-xs text-[#133C2A]/45">Кто ждет первого контакта</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Пробные</p><p className="mt-1 text-3xl text-[#133C2A]">{todaySummary.trials}</p><p className="mt-2 text-xs text-[#133C2A]/45">Записаны или зависли после пробного</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">После пробного</p><p className="mt-1 text-3xl text-[#133C2A]">{todaySummary.waitingDecision}</p><p className="mt-2 text-xs text-[#133C2A]/45">Нужно дожать решение</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Ждут оплату</p><p className="mt-1 text-3xl text-[#133C2A]">{todaySummary.waitingPayment}</p><p className="mt-2 text-xs text-[#133C2A]/45">Счет есть, деньги еще не закрыты</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Риск</p><p className="mt-1 text-3xl text-[#D14343]">{todaySummary.risk}</p><p className="mt-2 text-xs text-[#133C2A]/45">Просрочки, нет группы, зависшие сценарии</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Без следующего шага</p><p className="mt-1 text-3xl text-[#133C2A]">{todaySummary.withoutConcreteAction}</p><p className="mt-2 text-xs text-[#133C2A]/45">Где нет ясного действия на сегодня</p></CardContent></Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader className="pb-3">
          <div className="space-y-3">
            <div className="mobile-scroll-x rounded-2xl border border-[#133C2A]/10 bg-[#fbf7e8]/70 p-1">
              <div className="flex min-w-max gap-1">
                {(Object.keys(workspaceLabels) as WorkspaceTab[]).map((tab) => (
                  <Button
                    key={tab}
                    type="button"
                    size="sm"
                    variant={workspaceTab === tab ? 'default' : 'ghost'}
                    className={workspaceTab === tab ? 'rounded-xl bg-[#133C2A]' : 'rounded-xl text-[#133C2A]/68'}
                    onClick={() => setWorkspaceTab(tab)}
                  >
                    {workspaceLabels[tab]}
                  </Button>
                ))}
              </div>
            </div>

            {contextLabel ? (
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#D4AF37]/35 bg-[#FFF9E8] px-3 py-2 text-sm text-[#8B6B00]">
                <span>{contextLabel}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-xl"
                  onClick={() => {
                    setContextLabel(null);
                    setSearchQuery('');
                  }}
                >
                  Сбросить
                </Button>
              </div>
            ) : null}

            <div className="grid gap-2 xl:grid-cols-[1fr_180px_180px_180px_180px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#133C2A]/40" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Поиск по ребенку, родителю, телефону, группе, источнику"
                  className="rounded-2xl pl-9"
                />
              </div>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все группы</SelectItem>
                  <SelectItem value="ungrouped">Без группы</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Оплата" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все оплаты</SelectItem>
                  <SelectItem value="paid">Оплачено</SelectItem>
                  <SelectItem value="pending">На проверке</SelectItem>
                  <SelectItem value="unpaid">Ждет оплату</SelectItem>
                  <SelectItem value="overdue">Просрочено</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Источник" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все источники</SelectItem>
                  {sourceOptions.map((source) => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={stageFilter} onValueChange={(value) => setStageFilter(value as StageFilter)}>
                <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Статус" /></SelectTrigger>
                <SelectContent>
                  {stageFilterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={temperatureFilter} onValueChange={(value) => setTemperatureFilter(value as TemperatureFilter)}>
                <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Температура" /></SelectTrigger>
                <SelectContent>
                  {temperatureFilterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="py-12 text-center text-[#133C2A]/60">Загрузка клиентской базы...</div>
          ) : workspaceTab === 'today' ? (
            <div className="space-y-5">
              <div className="rounded-[28px] border border-[#133C2A]/10 bg-gradient-to-r from-[#133C2A] to-[#1d5a3f] px-5 py-5 text-white">
                <p className="text-xs uppercase tracking-[0.16em] text-white/65">Сегодня нужно обработать</p>
                <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-2xl">Очереди дня</h2>
                    <p className="mt-1 text-sm text-white/72">Новые заявки, пробные, оплаты и риск собраны в одном рабочем потоке.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-white/72">
                    <span>{todaySummary.newRequests} новых</span>
                    <span>•</span>
                    <span>{todaySummary.waitingPayment} ждут оплату</span>
                    <span>•</span>
                    <span>{todaySummary.withoutConcreteAction} без следующего шага</span>
                  </div>
                </div>
              </div>

              {todaySections.every((section) => section.items.length === 0) ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Сегодня нет клиентов в активной обработке"
                  description="Когда появятся новые заявки, пробные или оплаты в работе, они будут собраны здесь по очередям."
                />
              ) : (
                todaySections.map((section) => (
                  <section key={section.id} className="rounded-[28px] border border-[#133C2A]/10 bg-[#fcfaf0] p-4 md:p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-[#133C2A]">{section.title}</h2>
                        <p className="text-sm text-[#133C2A]/55">{todaySectionDescriptions[section.id] || 'Рабочая очередь по клиентам.'}</p>
                      </div>
                      <Badge variant="outline" className="w-fit rounded-full border-[#133C2A]/12 bg-white px-3 py-1 text-[#133C2A]/72">
                        {section.items.length}
                      </Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                      {section.items.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#133C2A]/12 bg-white/70 px-4 py-5 text-sm text-[#133C2A]/52">
                          В этой очереди сейчас пусто.
                        </div>
                      ) : (
                        section.items.map((entry) => renderClientCard(entry, section.title))
                      )}
                    </div>
                  </section>
                ))
              )}
            </div>
          ) : workspaceTab === 'funnel' ? (
            <div className="space-y-4">
              <div className="rounded-[28px] border border-[#133C2A]/10 bg-[#fbf7e8]/70 px-5 py-4">
                <h2 className="text-[#133C2A]">Воронка клиентов</h2>
                <p className="mt-1 text-sm text-[#133C2A]/58">Здесь видно, где именно зависает каждый человек: новая заявка, пробное, оплата, активная база или риск.</p>
              </div>
              <div className="mobile-scroll-x pb-1">
                <div className="flex min-w-max gap-4">
                  {funnelSections.map((section) => (
                    <section key={section.id} className="flex w-[320px] shrink-0 flex-col rounded-[28px] border border-[#133C2A]/10 bg-[#fcfaf0] p-4">
                      <div className="rounded-2xl bg-white/85 px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h2 className="text-[#133C2A]">{section.title}</h2>
                            <p className="mt-1 text-sm text-[#133C2A]/55">{funnelSectionDescriptions[section.id] || 'Этап клиентской воронки.'}</p>
                          </div>
                          <Badge variant="outline" className="rounded-full border-[#133C2A]/12 px-3 py-1">{section.items.length}</Badge>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        {section.items.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[#133C2A]/12 bg-white/70 px-4 py-5 text-sm text-[#133C2A]/52">
                            На этом этапе пока нет клиентов.
                          </div>
                        ) : (
                          section.items.map((entry) =>
                            renderCompactClientRow(entry, {
                              contextLabel: section.title,
                              highlight: stageReason(entry.stage),
                              showArchive: section.id === 'archive',
                            }),
                          )
                        )}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </div>
          ) : workspaceTab === 'base' ? (
            <>
              <div className="grid gap-3 md:grid-cols-6">
                <Card className="border-[#133C2A]/8 bg-[#fbf7e8]/55"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Всего</p><p className="mt-1 text-2xl text-[#133C2A]">{baseSummary.total}</p></CardContent></Card>
                <Card className="border-[#133C2A]/8 bg-[#fbf7e8]/55"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Активные</p><p className="mt-1 text-2xl text-[#133C2A]">{baseSummary.active}</p></CardContent></Card>
                <Card className="border-[#133C2A]/8 bg-[#fbf7e8]/55"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Пробные</p><p className="mt-1 text-2xl text-[#133C2A]">{baseSummary.trials}</p></CardContent></Card>
                <Card className="border-[#133C2A]/8 bg-[#fbf7e8]/55"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Ждут оплату</p><p className="mt-1 text-2xl text-[#133C2A]">{baseSummary.waiting}</p></CardContent></Card>
                <Card className="border-[#133C2A]/8 bg-[#fbf7e8]/55"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Риск</p><p className="mt-1 text-2xl text-[#D14343]">{baseSummary.risk}</p></CardContent></Card>
                <Card className="border-[#133C2A]/8 bg-[#fbf7e8]/55"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Архив</p><p className="mt-1 text-2xl text-[#133C2A]">{baseSummary.archived}</p></CardContent></Card>
              </div>
              <div className="rounded-[28px] border border-[#133C2A]/10 bg-[#fcfaf0] p-4 md:p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-[#133C2A]">База клиентов</h2>
                    <p className="text-sm text-[#133C2A]/55">Спокойный справочник по всем людям в CRM: ребенок, родитель, группа, статус и следующий шаг.</p>
                  </div>
                  <p className="text-sm text-[#133C2A]/48">Найдено: {filteredClients.length}</p>
                </div>
                <div className="mt-4 space-y-3">
                  {filteredClients.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#133C2A]/12 bg-white/70 px-4 py-5 text-sm text-[#133C2A]/52">
                      По текущим фильтрам клиентов не найдено.
                    </div>
                  ) : (
                    filteredClients.map((entry) =>
                      renderCompactClientRow(entry, {
                        contextLabel: clientStageLabel[entry.stage],
                        showSource: false,
                        highlight: entry.child.profile?.internalComment ? `Важно: ${entry.child.profile.internalComment}` : undefined,
                      }),
                    )
                  )}
                </div>
              </div>
            </>
          ) : workspaceTab === 'trials' ? (
            <div className="space-y-4">
              <div className="rounded-[28px] border border-[#133C2A]/10 bg-[#fbf7e8]/70 px-5 py-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-[#133C2A]">Пробные как отдельный процесс</h2>
                    <p className="mt-1 text-sm text-[#133C2A]/58">Пока статус пробного рассчитывается по заявке, группе, оплате и дате обновления. Для точного сценария нужен backend `trial_lessons`.</p>
                  </div>
                  <Badge variant="outline" className="w-fit rounded-full border-[#133C2A]/12 bg-white px-3 py-1 text-[#133C2A]/70">
                    {trialSections.reduce((sum, section) => sum + section.items.length, 0)} карточек
                  </Badge>
                </div>
              </div>

              {trialSections.every((section) => section.items.length === 0) ? (
                <EmptyState
                  icon={Users}
                  title="Пробных сценариев не найдено"
                  description="Когда заявки начнут переходить в пробные, они будут собраны здесь по этапам."
                />
              ) : (
                trialSections.map((section) => (
                  <section key={section.id} className="rounded-[28px] border border-[#133C2A]/10 bg-[#fcfaf0] p-4 md:p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-[#133C2A]">{section.title}</h2>
                        <p className="text-sm text-[#133C2A]/55">{trialSectionDescriptions[section.id as Exclude<TrialWorkspaceStage, 'not_trial'>]}</p>
                      </div>
                      <Badge variant="outline" className="w-fit rounded-full border-[#133C2A]/12 bg-white px-3 py-1 text-[#133C2A]/70">
                        {section.items.length}
                      </Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                      {section.items.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#133C2A]/12 bg-white/70 px-4 py-5 text-sm text-[#133C2A]/52">
                          На этом этапе пробных пока никого нет.
                        </div>
                      ) : (
                        section.items.map((entry) =>
                          renderCompactClientRow(entry, {
                            contextLabel: section.title,
                            highlight: `${entry.trialFacts.title}. ${entry.nextAction.title} — ${entry.nextAction.dueLabel}.`,
                          }),
                        )
                      )}
                    </div>
                  </section>
                ))
              )}
            </div>
          ) : workspaceTab === 'tasks' ? (
            <div className="space-y-4">
              <div className="mobile-scroll-x rounded-2xl border border-[#133C2A]/10 bg-[#fbf7e8]/70 p-1">
                <div className="flex min-w-max gap-1">
                  {[
                    { id: 'mine', label: 'Мои' },
                    { id: 'today', label: 'Сегодня' },
                    { id: 'overdue', label: 'Просрочены' },
                    { id: 'unassigned', label: 'Без ответственного' },
                    { id: 'done', label: 'Выполнены' },
                  ].map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      size="sm"
                      variant={taskTab === item.id ? 'default' : 'ghost'}
                      className={taskTab === item.id ? 'rounded-xl bg-[#133C2A]' : 'rounded-xl text-[#133C2A]/68'}
                      onClick={() => setTaskTab(item.id as TaskTab)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>

              {visibleTaskPool.length === 0 ? (
                <Card className="border-[#133C2A]/10 bg-[#fcfaf0]">
                  <CardContent className="space-y-4 p-6">
                    <div>
                      <h2 className="text-[#133C2A]">Задач по клиентам пока нет</h2>
                      <p className="mt-1 text-sm text-[#133C2A]/58">
                        Сейчас система показывает вычисляемые следующие действия в карточках клиентов. Для полноценной работы нужно связать задачи с `client_id` и `child_id`.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row">
                      <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" onClick={() => onNavigateSection?.('tasks-management')}>
                        Открыть общий раздел задач
                      </Button>
                      <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={() => setWorkspaceTab('today')}>
                        Открыть клиентов без следующего шага
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                visibleTaskPool.map((task) => {
                  const linkedClient = childrenWithMeta.find(
                    (entry) => entry.child.id === task.relatedChildId || entry.child.parentUserId === task.relatedUserId,
                  );
                  return (
                    <Card key={task.id} className="border-[#133C2A]/10 bg-white/92 shadow-[0_10px_30px_rgba(19,60,42,0.06)]">
                      <CardContent className="p-4 md:p-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-2 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="rounded-full">{task.status === 'done' ? 'Выполнено' : 'В работе'}</Badge>
                              <Badge variant="outline" className="rounded-full">{task.priority}</Badge>
                            </div>
                            <div>
                              <p className="text-lg text-[#133C2A]">{task.title}</p>
                              <p className="mt-1 text-sm text-[#133C2A]/62">{task.description}</p>
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-[#133C2A]/62">
                              <span>Срок: {taskDueLabel(task)}</span>
                              <span>Ответственный: {task.assigneeName}</span>
                              {linkedClient ? <span>Клиент: {linkedClient.child.parentName || linkedClient.child.fullName}</span> : null}
                            </div>
                            {task.assigneeComment ? <p className="text-sm text-[#133C2A]/58">Комментарий исполнителя: {task.assigneeComment}</p> : null}
                          </div>
                          <div className="flex flex-col gap-2 md:w-[220px]">
                            {linkedClient ? (
                              <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" onClick={() => openClient(linkedClient.child.id)}>
                                Открыть клиента
                              </Button>
                            ) : null}
                            <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={() => onNavigateSection?.('tasks-management')}>
                              Перейти в задачи
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          ) : archivePool.length === 0 ? (
            <div className="space-y-4">
              <div className="mobile-scroll-x rounded-2xl border border-[#133C2A]/10 bg-[#fbf7e8]/70 p-1">
                <div className="flex min-w-max gap-1">
                  {archiveFilterOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={archiveFilter === option.value ? 'default' : 'ghost'}
                      className={archiveFilter === option.value ? 'rounded-xl bg-[#133C2A]' : 'rounded-xl text-[#133C2A]/68'}
                      onClick={() => setArchiveFilter(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              <EmptyState
                icon={FolderArchive}
                title="Архив пуст"
                description="Архивные и ушедшие карточки появятся здесь. Причины архива будут доступны после добавления backend-поля `archive_reason`."
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#D4AF37]/25 bg-[#FFF9E8] px-4 py-3 text-sm text-[#8B6B00]">
                Причины архива пока не хранятся отдельно. Сейчас архив собирается по статусам `archived`, `paused`, `lost`, `frozen`.
              </div>
              <div className="mobile-scroll-x rounded-2xl border border-[#133C2A]/10 bg-[#fbf7e8]/70 p-1">
                <div className="flex min-w-max gap-1">
                  {archiveFilterOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={archiveFilter === option.value ? 'default' : 'ghost'}
                      className={archiveFilter === option.value ? 'rounded-xl bg-[#133C2A]' : 'rounded-xl text-[#133C2A]/68'}
                      onClick={() => setArchiveFilter(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {archivePool.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#133C2A]/12 bg-white/70 px-4 py-5 text-sm text-[#133C2A]/52">
                    По выбранной причине архива карточек пока нет.
                  </div>
                ) : (
                  archivePool.map((entry) =>
                    renderCompactClientRow(entry, {
                      contextLabel: 'Архив',
                      showArchive: true,
                      highlight: stageReason(entry.stage),
                    }),
                  )
                )}
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-dashed border-[#133C2A]/12 bg-[#fbf7e8]/50 px-4 py-3 text-sm text-[#133C2A]/52">
            Часть CRM-статусов сейчас рассчитывается по заявке, группе, оплате и дате обновления. Для точной работы нужны backend-поля `crm_status`, `next_action`, `trial_lessons`, `client_timeline`.
          </div>
        </CardContent>
      </Card>

        </>
      )}

      {isMobile ? (
        <MobileClientDetails
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          entry={selectedClient}
          groups={groups}
          profileDraft={profileDraft}
          setProfileDraft={setProfileDraft}
          isProfileSaving={isProfileSaving}
          onSaveProfile={() => void saveProfile()}
          onOpenPayments={() => {
            if (selectedClient) {
              openPaymentsForEntry(selectedClient);
            }
          }}
          onCreateInvoice={() => {
            if (selectedClient) {
              void createInvoiceForChild(selectedClient.child);
            }
          }}
          onRemind={
            selectedClient?.latestOpenPayment
              ? () => void remindAboutPayment(selectedClient.latestOpenPayment as AdminPaymentRecord)
              : undefined
          }
          onOpenTasks={() => {
            if (selectedClient) {
              openTasksForEntry(selectedClient);
            }
          }}
          onAssignGroup={(groupId) => {
            if (selectedClient) {
              void assignGroup(selectedClient.child.id, groupId);
            }
          }}
        />
      ) : (
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto rounded-3xl">
          {selectedClient ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex min-w-0 items-center justify-between gap-3 pr-8 text-[#133C2A]">
                  <div className="min-w-0 space-y-2">
                    <div>
                      <p className="truncate text-2xl">{selectedClient.child.parentName || selectedClient.child.fullName}</p>
                      <p className="mt-1 text-sm text-[#133C2A]/60">
                        {selectedClient.child.fullName || 'Ребенок не указан'} • {selectedClient.child.parentPhone || 'Телефон не указан'} • Источник: {sourceLabel(selectedClient.child)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ClientStatusBadge stage={selectedClient.stage} />
                      <ClientTemperatureBadge temperature={selectedClient.temperature} />
                      <Badge variant="outline" className="rounded-full border-[#133C2A]/12 bg-[#fbf7e8]/70 text-[#133C2A]/70">
                        Следующий шаг: {selectedClient.nextAction.dueLabel}
                      </Badge>
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <Card className="border-[#133C2A]/10">
                  <CardContent className="p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs text-[#133C2A]/60">Ответственный</p>
                        <p className="text-[#133C2A]">Не назначен в backend</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#133C2A]/60">Последнее событие</p>
                        <p className="text-[#133C2A]">{selectedClient.timeline[0] ? formatRuDateTime(selectedClient.timeline[0].occurredAt) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#133C2A]/60">Почему этот статус</p>
                        <p className="text-[#133C2A]">{stageReason(selectedClient.stage)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#133C2A]/60">Что важно сейчас</p>
                        <p className="text-[#133C2A]">
                          {selectedClient.child.profile?.internalComment || (selectedClient.temperature === 'problem' ? 'Нужна ручная проверка проблемной карточки.' : 'Критичных заметок пока нет.')}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <ClientNextAction nextAction={selectedClient.nextAction} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#133C2A]/10">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-2">
                      <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" onClick={() => onNavigatePayments?.({
                        searchQuery: selectedClient.child.parentPhone || selectedClient.child.fullName,
                        queue: selectedClient.stage === 'waiting_payment' ? 'waiting' : selectedClient.stage === 'risk' ? 'problem' : 'all',
                        sourceLabel: `Оплаты по ${selectedClient.child.fullName}`,
                        invoiceClientId: selectedClient.child.clientId || undefined,
                      })}>
                        Открыть оплаты
                      </Button>
                      <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={() => void createInvoiceForChild(selectedClient.child)} disabled={!selectedClient.child.clientId || isInvoicingChildId === selectedClient.child.id}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Выставить счет
                      </Button>
                      {selectedClient.latestOpenPayment ? (
                        <Button
                          variant="outline"
                          className="rounded-2xl border-[#133C2A]/15"
                          onClick={() => void remindAboutPayment(selectedClient.latestOpenPayment as AdminPaymentRecord)}
                          disabled={isReminderPaymentId === selectedClient.latestOpenPayment.id}
                        >
                          Напомнить об оплате
                        </Button>
                      ) : null}
                      <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={() => onNavigateSection?.('tasks-management')}>
                        Открыть задачи
                      </Button>
                      <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" disabled>
                        Связь со статусом и ответственным появится после backend-расширения
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="w-full overflow-x-auto whitespace-nowrap rounded-2xl bg-[#F8F4E3] p-1">
                  <TabsTrigger value="overview" className="min-w-[120px] rounded-xl">Обзор</TabsTrigger>
                  <TabsTrigger value="child" className="min-w-[120px] rounded-xl">Ребенок</TabsTrigger>
                  <TabsTrigger value="parent" className="min-w-[120px] rounded-xl">Родитель</TabsTrigger>
                  <TabsTrigger value="funnel" className="min-w-[120px] rounded-xl">Воронка</TabsTrigger>
                  <TabsTrigger value="trials" className="min-w-[120px] rounded-xl">Пробные</TabsTrigger>
                  <TabsTrigger value="payments" className="min-w-[120px] rounded-xl">Оплаты</TabsTrigger>
                  <TabsTrigger value="group" className="min-w-[120px] rounded-xl">Группа</TabsTrigger>
                  <TabsTrigger value="attendance" className="min-w-[120px] rounded-xl">Посещаемость</TabsTrigger>
                  <TabsTrigger value="tasks" className="min-w-[120px] rounded-xl">Задачи</TabsTrigger>
                  <TabsTrigger value="comments" className="min-w-[120px] rounded-xl">Комментарии</TabsTrigger>
                  <TabsTrigger value="history" className="min-w-[120px] rounded-xl">История</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl bg-[#F8F4E3]/70 p-4"><p className="text-xs text-[#133C2A]/60">Статус клиента</p><p className="mt-1 text-[#133C2A]">{clientStageLabel[selectedClient.stage]}</p></div>
                      <div className="rounded-2xl bg-[#F8F4E3]/70 p-4"><p className="text-xs text-[#133C2A]/60">Температура</p><p className="mt-1 text-[#133C2A]">{clientTemperatureLabel[selectedClient.temperature]}</p></div>
                      <div className="rounded-2xl bg-[#F8F4E3]/70 p-4"><p className="text-xs text-[#133C2A]/60">Ребенок</p><p className="mt-1 text-[#133C2A]">{selectedClient.child.fullName}</p></div>
                      <div className="rounded-2xl bg-[#F8F4E3]/70 p-4"><p className="text-xs text-[#133C2A]/60">Группа</p><p className="mt-1 text-[#133C2A]">{selectedClient.child.groupName || 'Не назначена'}</p></div>
                      <div className="rounded-2xl bg-[#F8F4E3]/70 p-4"><p className="text-xs text-[#133C2A]/60">Абонемент</p><p className="mt-1 text-[#133C2A]">{selectedClient.child.subscriptionName || 'Не выбран'}</p></div>
                      <div className="rounded-2xl bg-[#F8F4E3]/70 p-4"><p className="text-xs text-[#133C2A]/60">Статус оплаты</p><p className="mt-1 text-[#133C2A]">{paymentStatusLabel(selectedClient.latestOpenPayment?.status || selectedClient.child.paymentStatus)}</p></div>
                      <div className="rounded-2xl bg-[#F8F4E3]/70 p-4"><p className="text-xs text-[#133C2A]/60">Почему этот статус</p><p className="mt-1 text-[#133C2A]">{stageReason(selectedClient.stage)}</p></div>
                      <div className="rounded-2xl bg-[#F8F4E3]/70 p-4"><p className="text-xs text-[#133C2A]/60">Следующий шаг</p><p className="mt-1 text-[#133C2A]">{selectedClient.nextAction.title}</p><p className="mt-1 text-xs text-[#133C2A]/48">{selectedClient.nextAction.dueLabel}</p></div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="child" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                      <div><p className="text-xs text-[#133C2A]/60">ФИО</p><p className="text-[#133C2A]">{selectedClient.child.fullName}</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Возраст</p><p className="text-[#133C2A]">{selectedClient.child.age ?? '—'} лет</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Дата рождения</p><p className="text-[#133C2A]">{formatRuDate(selectedClient.child.birthDate)}</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Опыт</p><p className="text-[#133C2A]">{profileDraft.priorExperience || selectedClient.child.landingLead?.previousActivities || '—'}</p></div>
                      <div className="md:col-span-2"><p className="text-xs text-[#133C2A]/60">Ограничения</p><p className="whitespace-pre-wrap text-[#133C2A]">{profileDraft.healthNotes || selectedClient.child.landingLead?.medicalRestrictions || '—'}</p></div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="parent" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                      <div><p className="text-xs text-[#133C2A]/60">ФИО родителя</p><p className="text-[#133C2A]">{selectedClient.child.parentName || '—'}</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Телефон</p><p className="text-[#133C2A]">{selectedClient.child.parentPhone || '—'}</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Доступ в ЛК</p><p className="text-[#133C2A]">{selectedClient.child.parentAccountStatus || '—'}</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Уровень доступа</p><p className="text-[#133C2A]">{selectedClient.child.parentAccessLevel || '—'}</p></div>
                      <div className="md:col-span-2"><p className="text-xs text-[#133C2A]/60">Предпочтения по связи</p><p className="text-[#133C2A]">{profileDraft.communicationPreferences || 'Не заданы'}</p></div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="funnel" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardContent className="space-y-3 p-6">
                      {buildFunnelSteps(selectedClient.stage, selectedClient.child).map((step) => (
                        <div key={step.id} className="flex items-center gap-3 rounded-2xl border border-[#133C2A]/10 bg-white px-4 py-3">
                          <span className={`h-3 w-3 rounded-full ${step.state === 'done' ? 'bg-green-500' : step.state === 'current' ? 'bg-[#D4AF37]' : 'bg-[#133C2A]/15'}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[#133C2A]">{step.label}</p>
                            <p className="text-xs text-[#133C2A]/55">{step.date ? formatRuDateTime(step.date) : 'Дата пока не хранится отдельно'}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="trials" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardContent className="p-6">
                      <p className="text-[#133C2A]">{selectedClient.trialFacts.title}</p>
                      <p className="mt-2 text-sm text-[#133C2A]/62">{selectedClient.trialFacts.note}</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div><p className="text-xs text-[#133C2A]/60">Источник</p><p className="text-[#133C2A]">{sourceLabel(selectedClient.child)}</p></div>
                        <div><p className="text-xs text-[#133C2A]/60">Предпочтительный график</p><p className="text-[#133C2A]">{selectedClient.child.landingLead?.preferredSchedule || '—'}</p></div>
                        <div className="md:col-span-2"><p className="text-xs text-[#133C2A]/60">Комментарий из заявки</p><p className="whitespace-pre-wrap text-[#133C2A]">{selectedClient.child.landingLead?.comment || '—'}</p></div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payments" className="space-y-4">
                  {selectedClient.payments.length === 0 ? (
                    <EmptyState
                      icon={CreditCard}
                      title="Платежей пока нет"
                      description="Можно выставить первый счет из карточки клиента."
                      actionLabel="Выставить счет"
                      onAction={() => void createInvoiceForChild(selectedClient.child)}
                    />
                  ) : (
                    selectedClient.payments.map((payment) => (
                      <Card key={payment.id} className="border-[#133C2A]/10">
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                          <div>
                            <p className="text-[#133C2A]">{payment.subscriptionName || selectedClient.child.subscriptionName || 'Абонемент'}</p>
                            <p className="text-xs text-[#133C2A]/60">
                              Счет: {payment.invoiceNumber || '—'} • Создан: {formatRuDateTime(payment.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg text-[#133C2A]">{Number(payment.amount || 0).toLocaleString('ru-RU')} ₽</p>
                            <PaymentStatusBadge status={payment.status} />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="group" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardContent className="space-y-4 p-6">
                      <div>
                        <p className="text-xs text-[#133C2A]/60">Текущая группа</p>
                        <p className="text-[#133C2A]">{selectedClient.child.groupName || 'Не назначена'}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Изменить группу</Label>
                        <Select value={selectedClient.child.groupId || 'none'} onValueChange={(value) => void assignGroup(selectedClient.child.id, value === 'none' ? null : value)} disabled={isAssigningChildId === selectedClient.child.id}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Без группы" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Без группы</SelectItem>
                            {groups.map((group) => (
                              <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="attendance" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardContent className="grid gap-4 p-6 md:grid-cols-3">
                      <div><p className="text-xs text-[#133C2A]/60">Всего занятий</p><p className="text-[#133C2A]">{selectedClient.child.totalClasses ?? '—'}</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Посещено</p><p className="text-[#133C2A]">{selectedClient.child.attendedClasses ?? '—'}</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Осталось</p><p className="text-[#133C2A]">{selectedClient.child.remainingClasses ?? '—'}</p></div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tasks" className="space-y-4">
                  {selectedClient.relatedTasks.length === 0 ? (
                    <EmptyState
                      icon={ClipboardList}
                      title="Связанных задач пока нет"
                      description="Backend уже хранит `relatedUserId` и `relatedChildId`, но создание задачи из карточки клиента еще не подключено в этом разделе."
                      actionLabel="Открыть задачи"
                      onAction={() => onNavigateSection?.('tasks-management')}
                    />
                  ) : (
                    selectedClient.relatedTasks.map((task) => (
                      <Card key={task.id} className="border-[#133C2A]/10">
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-[#133C2A]">{task.title}</p>
                              <p className="mt-1 text-sm text-[#133C2A]/60">{task.description}</p>
                              <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#133C2A]/55">
                                <span>Срок: {task.dueLabel}</span>
                                <span>Приоритет: {task.priority}</span>
                                <span>Ответственный: {task.assigneeName}</span>
                              </div>
                            </div>
                            <Badge variant="outline" className="rounded-full">{task.status}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="comments" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm text-[#133C2A]/60">
                        <ShieldCheck className="h-4 w-4 text-[#D4AF37]" />
                        Внутренние комментарии и заметки
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Важное</Label>
                          <Textarea value={profileDraft.internalComment} onChange={(event) => setProfileDraft((prev) => ({ ...prev, internalComment: event.target.value }))} className="min-h-[90px] rounded-xl" />
                        </div>
                        <div className="space-y-1">
                          <Label>Здоровье</Label>
                          <Textarea value={profileDraft.healthNotes} onChange={(event) => setProfileDraft((prev) => ({ ...prev, healthNotes: event.target.value }))} className="min-h-[90px] rounded-xl" />
                        </div>
                        <div className="space-y-1">
                          <Label>Поведение</Label>
                          <Textarea value={profileDraft.behavioralNotes} onChange={(event) => setProfileDraft((prev) => ({ ...prev, behavioralNotes: event.target.value }))} className="min-h-[90px] rounded-xl" />
                        </div>
                        <div className="space-y-1">
                          <Label>Цели</Label>
                          <Textarea value={profileDraft.goals} onChange={(event) => setProfileDraft((prev) => ({ ...prev, goals: event.target.value }))} className="min-h-[90px] rounded-xl" />
                        </div>
                        <div className="space-y-1">
                          <Label>Сильные стороны</Label>
                          <Textarea value={profileDraft.strengths} onChange={(event) => setProfileDraft((prev) => ({ ...prev, strengths: event.target.value }))} className="min-h-[90px] rounded-xl" />
                        </div>
                        <div className="space-y-1">
                          <Label>Ожидания родителя</Label>
                          <Textarea value={profileDraft.parentExpectations} onChange={(event) => setProfileDraft((prev) => ({ ...prev, parentExpectations: event.target.value }))} className="min-h-[90px] rounded-xl" />
                        </div>
                        <div className="space-y-1">
                          <Label>Коммуникация</Label>
                          <Input value={profileDraft.communicationPreferences} onChange={(event) => setProfileDraft((prev) => ({ ...prev, communicationPreferences: event.target.value }))} className="rounded-xl" />
                        </div>
                        <div className="space-y-1">
                          <Label>Источник</Label>
                          <Input value={profileDraft.sourceChannel} onChange={(event) => setProfileDraft((prev) => ({ ...prev, sourceChannel: event.target.value }))} className="rounded-xl" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <Label>Опыт до студии</Label>
                          <Textarea value={profileDraft.priorExperience} onChange={(event) => setProfileDraft((prev) => ({ ...prev, priorExperience: event.target.value }))} className="min-h-[90px] rounded-xl" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <Label>Теги</Label>
                          <Input value={profileDraft.tagsInput} onChange={(event) => setProfileDraft((prev) => ({ ...prev, tagsInput: event.target.value }))} className="rounded-xl" placeholder="например: не звонить поздно, сильная техника, конкурс" />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={() => void saveProfile()} disabled={isProfileSaving} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
                          {isProfileSaving ? 'Сохраняем...' : 'Сохранить комментарии'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardHeader>
                      <CardTitle className="text-[#133C2A]">История карточки</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedClient.timeline.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[#133C2A]/12 px-4 py-5 text-sm text-[#133C2A]/55">
                            История пока собирается из заявки, платежей и изменений профиля. Для полной ленты нужен backend `client_timeline`.
                          </div>
                        ) : (
                          selectedClient.timeline.map((entry) => (
                            <div key={entry.id} className="rounded-2xl border border-[#133C2A]/10 bg-white/92 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-[#133C2A]">{entry.title}</p>
                                  <p className="mt-1 text-sm text-[#133C2A]/60">{entry.description}</p>
                                </div>
                                <p className="text-xs text-[#133C2A]/45">{formatRuDateTime(entry.occurredAt)}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      )}

      <AddStudentDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        groups={groups}
        parents={parentOptions}
        subscriptions={subscriptions}
        onStudentCreated={() => {
          void refresh(true);
        }}
      />
    </div>
  );
}
