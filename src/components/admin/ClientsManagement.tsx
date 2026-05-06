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
import { Group } from '../../types';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowUpRight,
  CreditCard,
  Eye,
  Filter,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { AddStudentDialog } from './AddStudentDialog';
import { EmptyState } from '../EmptyState';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { isOutstandingPaymentStatus, paymentStatusLabel } from '../payments/PaymentStatusBadge';

type ClientQueue = 'all' | 'new' | 'trial' | 'waiting' | 'active' | 'risk' | 'archive';

const queueLabels: Record<ClientQueue, string> = {
  all: 'Все',
  new: 'Новые заявки',
  trial: 'Пробные',
  waiting: 'Ждут оплату',
  active: 'Активные',
  risk: 'Риск',
  archive: 'Архив',
};

const parentStatusLabels: Record<string, string> = {
  invited: 'Приглашен',
  payment_pending: 'Ожидает оплату',
  active: 'Активен',
  suspended: 'Приостановлен',
};

const parentBadgeClass: Record<string, string> = {
  active: 'border-green-200 bg-green-50 text-green-700',
  payment_pending: 'border-blue-200 bg-blue-50 text-blue-700',
  invited: 'border-[#D4AF37]/30 bg-[#FFF9E8] text-[#8B6B00]',
  suspended: 'border-orange-200 bg-orange-50 text-orange-700',
};

const paymentBadgeClass: Record<string, string> = {
  paid: 'border-green-200 bg-green-50 text-green-700',
  pending: 'border-blue-200 bg-blue-50 text-blue-700',
  unpaid: 'border-[#D4AF37]/30 bg-[#FFF9E8] text-[#8B6B00]',
  overdue: 'border-red-200 bg-red-50 text-red-700',
  failed: 'border-red-200 bg-red-50 text-red-700',
  refunded: 'border-slate-200 bg-slate-100 text-slate-700',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-700',
  expired: 'border-slate-200 bg-slate-100 text-slate-700',
};

export interface AdminClientsNavigationContext {
  requestId: number;
  searchQuery?: string;
  sourceLabel?: string;
}

function childInitials(fullName?: string | null): string {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'У';
  return parts.slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
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

function deriveQueue(child: AdminChildRecord): ClientQueue {
  const paymentStatus = String(child.paymentStatus || '');
  const parentStatus = String(child.parentAccountStatus || '');
  const hasLead = Boolean(child.landingLead);
  const inGroup = Boolean(child.groupId);

  if (['cancelled', 'refunded'].includes(paymentStatus) || parentStatus === 'suspended') {
    return 'archive';
  }
  if (['overdue', 'failed'].includes(paymentStatus)) {
    return 'risk';
  }
  if (hasLead && !inGroup && !isOutstandingPaymentStatus(paymentStatus) && paymentStatus !== 'paid') {
    return 'new';
  }
  if (hasLead && inGroup && paymentStatus !== 'paid') {
    return 'trial';
  }
  if (isOutstandingPaymentStatus(paymentStatus)) {
    return 'waiting';
  }
  if (inGroup && paymentStatus === 'paid' && parentStatus === 'active') {
    return 'active';
  }
  if (!inGroup) {
    return 'risk';
  }
  return 'all';
}

export function ClientsManagement({
  navigationContext,
  onNavigationContextApplied,
  onNavigatePayments,
}: {
  navigationContext?: AdminClientsNavigationContext;
  onNavigationContextApplied?: () => void;
  onNavigatePayments?: (context?: { searchQuery?: string; queue?: 'review' | 'waiting' | 'overdue' | 'paid' | 'problem' | 'all'; sourceLabel?: string; invoiceClientId?: string }) => void;
}) {
  const [children, setChildren] = useState<AdminChildRecord[]>([]);
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [queue, setQueue] = useState<ClientQueue>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  const outstandingPaymentByClientId = useMemo(() => {
    const filtered = payments.filter((payment) => isOutstandingPaymentStatus(payment.status));
    filtered.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    const map = new Map<string, AdminPaymentRecord>();
    filtered.forEach((payment) => {
      const key = String(payment.clientId || '');
      if (!key || map.has(key)) return;
      map.set(key, payment);
    });
    return map;
  }, [payments]);

  const selectedChild = useMemo(
    () => children.find((child) => child.id === selectedChildId) || null,
    [children, selectedChildId],
  );

  const selectedChildPayments = useMemo(() => {
    if (!selectedChild) return [];
    return payments
      .filter((payment) => String(payment.clientId || '') === String(selectedChild.clientId || ''))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [payments, selectedChild]);

  useEffect(() => {
    if (!selectedChild) return;
    const profile = selectedChild.profile || {
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
      sourceChannel: profile.sourceChannel || selectedChild.landingLead?.discoverySource || '',
      priorExperience: profile.priorExperience || selectedChild.landingLead?.previousActivities || '',
      tagsInput: (profile.tags || []).join(', '),
    });
  }, [selectedChild]);

  const filteredChildren = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return children.filter((child) => {
      const currentQueue = deriveQueue(child);
      const matchesQueue = queue === 'all' || currentQueue === queue;
      const matchesSearch =
        !query ||
        [
          child.fullName || '',
          child.parentName || '',
          child.parentPhone || '',
          child.subscriptionName || '',
          child.groupName || '',
          child.landingLead?.discoverySource || '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);
      const matchesGroup =
        groupFilter === 'all' ||
        (groupFilter === 'ungrouped' && !child.groupId) ||
        String(child.groupId || '') === groupFilter;
      const matchesPayment = paymentFilter === 'all' || String(child.paymentStatus || '') === paymentFilter;
      return matchesQueue && matchesSearch && matchesGroup && matchesPayment;
    });
  }, [children, queue, searchQuery, groupFilter, paymentFilter]);

  const summary = useMemo(() => {
    return {
      total: children.length,
      active: children.filter((child) => deriveQueue(child) === 'active').length,
      waiting: children.filter((child) => deriveQueue(child) === 'waiting').length,
      withoutGroup: children.filter((child) => !child.groupId).length,
      risk: children.filter((child) => deriveQueue(child) === 'risk').length,
    };
  }, [children]);

  const parentOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string; phone: string }>();
    for (const child of children) {
      const key = child.parentUserId || child.parentPhone || '';
      if (!key || map.has(key)) continue;
      map.set(key, {
        id: String(child.parentUserId || key),
        name: child.parentName || child.parentPhone || 'Родитель',
        email: '',
        phone: child.parentPhone || '',
      });
    }
    return Array.from(map.values());
  }, [children]);

  const subscriptions = useMemo(
    () => [
      { id: 'hobby', name: 'Хобби' },
      { id: 'pro', name: 'Про' },
    ],
    [],
  );

  const saveProfile = async () => {
    if (!selectedChild) return;
    setIsProfileSaving(true);
    try {
      const response = await updateAdminChildProfile(selectedChild.id, {
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
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить профиль');
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
      toast.error('У карточки нет связанного клиента для выставления счета');
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

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Клиенты</h1>
          <p className="text-[#133C2A]/60">Рабочий центр по ученикам: статус, оплата, группа и внутренняя информация.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
          <Button variant="outline" className="rounded-2xl" onClick={() => void refresh(true)} disabled={isRefreshing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {isRefreshing ? 'Обновляем...' : 'Обновить'}
          </Button>
          <Button
            className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Добавить ученика
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Всего</p><p className="mt-1 text-3xl text-[#133C2A]">{summary.total}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Активные</p><p className="mt-1 text-3xl text-[#133C2A]">{summary.active}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Ждут оплату</p><p className="mt-1 text-3xl text-[#133C2A]">{summary.waiting}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Без группы</p><p className="mt-1 text-3xl text-[#133C2A]">{summary.withoutGroup}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Риск</p><p className="mt-1 text-3xl text-[#D14343]">{summary.risk}</p></CardContent></Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader className="pb-3">
          <div className="space-y-3">
            <div className="mobile-scroll-x rounded-2xl border border-[#133C2A]/10 bg-[#fbf7e8]/70 p-1">
              <div className="flex min-w-max gap-1">
                {(Object.keys(queueLabels) as ClientQueue[]).map((queueId) => (
                  <Button
                    key={queueId}
                    type="button"
                    size="sm"
                    variant={queue === queueId ? 'default' : 'ghost'}
                    className={queue === queueId ? 'rounded-xl bg-[#133C2A]' : 'rounded-xl text-[#133C2A]/68'}
                    onClick={() => setQueue(queueId)}
                  >
                    {queueLabels[queueId]}
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

            <div className="grid gap-2 lg:grid-cols-[1fr_220px_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#133C2A]/40" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Поиск по ребенку, родителю, группе"
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
                <SelectTrigger className="rounded-2xl">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все оплаты</SelectItem>
                  <SelectItem value="paid">Оплачено</SelectItem>
                  <SelectItem value="pending">На проверке</SelectItem>
                  <SelectItem value="unpaid">Ждет оплату</SelectItem>
                  <SelectItem value="overdue">Просрочено</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="py-10 text-center text-[#133C2A]/60">Загрузка клиентов...</p>
          ) : filteredChildren.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Клиентов в этой очереди пока нет"
              description="Добавьте ученика вручную или дождитесь новой заявки с сайта."
              actionLabel="Добавить ученика"
              onAction={() => setIsAddDialogOpen(true)}
            />
          ) : (
            filteredChildren.map((child) => {
              const childQueue = deriveQueue(child);
              const outstandingPayment = child.clientId ? outstandingPaymentByClientId.get(String(child.clientId)) : undefined;
              const nextAction =
                childQueue === 'waiting'
                  ? {
                      label: outstandingPayment ? 'Напомнить' : 'Выставить счет',
                      onClick: outstandingPayment ? () => void remindAboutPayment(outstandingPayment) : () => void createInvoiceForChild(child),
                      disabled:
                        Boolean(outstandingPayment && isReminderPaymentId === outstandingPayment.id) ||
                        isInvoicingChildId === child.id,
                    }
                  : childQueue === 'risk'
                    ? {
                        label: 'Открыть карточку',
                        onClick: () => {
                          setSelectedChildId(child.id);
                          setIsDialogOpen(true);
                        },
                        disabled: false,
                      }
                    : childQueue === 'new' || childQueue === 'trial'
                      ? {
                          label: 'Открыть карточку',
                          onClick: () => {
                            setSelectedChildId(child.id);
                            setIsDialogOpen(true);
                          },
                          disabled: false,
                        }
                      : {
                          label: 'Открыть карточку',
                          onClick: () => {
                            setSelectedChildId(child.id);
                            setIsDialogOpen(true);
                          },
                          disabled: false,
                        };

              return (
                <Card key={child.id} className="overflow-hidden border-[#133C2A]/10 bg-white/92 shadow-[0_10px_30px_rgba(19,60,42,0.06)]">
                  <CardContent className="p-0">
                    <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr_260px]">
                      <div className="p-4 md:p-5">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-14 w-14 border border-[#D4AF37]/20">
                            <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white">
                              {childInitials(child.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedChildId(child.id);
                                    setIsDialogOpen(true);
                                  }}
                                  className="text-left text-lg leading-tight text-[#133C2A] hover:underline"
                                >
                                  {child.fullName || 'Ученик'}
                                </button>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#133C2A]/66">
                                  <span>{child.age ?? '—'} лет</span>
                                  <span>•</span>
                                  <span>{child.parentName || 'Родитель не указан'}</span>
                                  <span>•</span>
                                  <span>{child.parentPhone || 'Телефон не указан'}</span>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  <Badge className={`${paymentBadgeClass[String(child.paymentStatus || '')] || 'border-slate-200 bg-slate-100 text-slate-700'} rounded-full border`}>
                                    {paymentStatusLabel(child.paymentStatus)}
                                  </Badge>
                                  <Badge className={`${parentBadgeClass[String(child.parentAccountStatus || '')] || 'border-slate-200 bg-slate-100 text-slate-700'} rounded-full border`}>
                                    ЛК: {parentStatusLabels[String(child.parentAccountStatus || '')] || String(child.parentAccountStatus || 'не задан')}
                                  </Badge>
                                  <Badge variant="outline" className="rounded-full border-[#133C2A]/12 text-[#133C2A]/70">
                                    {queueLabels[childQueue]}
                                  </Badge>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-9 rounded-xl border-[#133C2A]/15 px-3">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl">
                                  <DropdownMenuItem onSelect={() => { setSelectedChildId(child.id); setIsDialogOpen(true); }}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Открыть карточку
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => void createInvoiceForChild(child)} disabled={!child.clientId}>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Выставить счет
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      onNavigatePayments?.({
                                        queue: isOutstandingPaymentStatus(child.paymentStatus) ? 'waiting' : 'all',
                                        searchQuery: child.parentPhone || child.fullName,
                                        sourceLabel: `Оплаты по ${child.fullName}`,
                                        invoiceClientId: child.clientId || undefined,
                                      });
                                    }}
                                  >
                                    <ArrowUpRight className="mr-2 h-4 w-4" />
                                    Открыть оплаты
                                  </DropdownMenuItem>
                                  <DropdownMenuItem disabled>
                                    <Phone className="mr-2 h-4 w-4" />
                                    Написать родителю
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 text-sm">
                              <div className="rounded-2xl bg-[#F8F4E3]/70 p-3">
                                <p className="text-xs text-[#133C2A]/45">Группа</p>
                                <p className="mt-1 text-[#133C2A]">{child.groupName || 'Не назначена'}</p>
                              </div>
                              <div className="rounded-2xl bg-[#F8F4E3]/70 p-3">
                                <p className="text-xs text-[#133C2A]/45">Абонемент</p>
                                <p className="mt-1 text-[#133C2A]">
                                  {child.subscriptionName || 'Не выбран'}
                                  {child.subscriptionAmount ? ` • ${Number(child.subscriptionAmount).toLocaleString('ru-RU')} ₽` : ''}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-[#F8F4E3]/70 p-3">
                                <p className="text-xs text-[#133C2A]/45">Последнее изменение</p>
                                <p className="mt-1 text-[#133C2A]">{formatRuDate(child.updatedAt || child.createdAt)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-y border-[#133C2A]/8 bg-[#fbf7e8]/72 p-4 md:p-5 xl:border-x xl:border-y-0">
                        <div className="grid gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-[#133C2A]/38">Что важно</p>
                            <p className="mt-2 text-sm leading-relaxed text-[#133C2A]">
                              {childQueue === 'new'
                                ? 'Карточка пришла из анкеты. Нужно уточнить данные и решить вопрос с пробным.'
                                : childQueue === 'trial'
                                  ? 'Пробный интерес зафиксирован, но оплата еще не закрыта.'
                                  : childQueue === 'waiting'
                                    ? 'Есть открытый счет или подтверждение оплаты от родителя.'
                                    : childQueue === 'risk'
                                      ? 'Нужен ручной контроль: долг, ошибка платежа или не назначена группа.'
                                      : childQueue === 'archive'
                                        ? 'Карточка выведена из активной работы.'
                                        : 'Группа и оплата уже оформлены, карточка в рабочем состоянии.'}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs text-[#133C2A]/45">Группа</Label>
                            <Select
                              value={child.groupId || 'none'}
                              onValueChange={(value) => void assignGroup(child.id, value === 'none' ? null : value)}
                              disabled={isAssigningChildId === child.id}
                            >
                              <SelectTrigger className="rounded-xl bg-white">
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

                          <div className="rounded-2xl border border-[#133C2A]/10 bg-white px-3 py-3 text-sm text-[#133C2A]/68">
                            <p className="text-xs text-[#133C2A]/45">Источник</p>
                            <p className="mt-1 text-[#133C2A]">{child.profile?.sourceChannel || child.landingLead?.discoverySource || '—'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 md:p-5">
                        <div className="flex h-full flex-col gap-2">
                          <Button
                            onClick={() => nextAction.onClick()}
                            disabled={nextAction.disabled}
                            className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]"
                          >
                            {nextAction.label}
                          </Button>
                          <Button
                            variant="outline"
                            className="rounded-2xl border-[#133C2A]/15"
                            onClick={() => {
                              setSelectedChildId(child.id);
                              setIsDialogOpen(true);
                            }}
                          >
                            Открыть карточку
                          </Button>
                          <Button
                            variant="outline"
                            className="rounded-2xl border-[#133C2A]/15"
                            disabled={!child.clientId}
                            onClick={() => void createInvoiceForChild(child)}
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Выставить счет
                          </Button>
                          {outstandingPayment ? (
                            <Button
                              variant="outline"
                              className="rounded-2xl border-[#133C2A]/15"
                              onClick={() => void remindAboutPayment(outstandingPayment)}
                              disabled={isReminderPaymentId === outstandingPayment.id}
                            >
                              {isReminderPaymentId === outstandingPayment.id ? 'Отправляем...' : 'Напомнить'}
                            </Button>
                          ) : (
                            <div className="mt-auto rounded-2xl border border-dashed border-[#133C2A]/12 px-3 py-3 text-sm text-[#133C2A]/48">
                              Чат с родителем появится здесь после подключения раздела сообщений.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto rounded-3xl">
          {selectedChild ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex min-w-0 items-center gap-3 pr-8 text-[#133C2A]">
                  <Avatar className="h-12 w-12 border border-[#D4AF37]/20">
                    <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white">
                      {childInitials(selectedChild.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{selectedChild.fullName}</span>
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="w-full overflow-x-auto whitespace-nowrap rounded-2xl bg-[#F8F4E3] p-1">
                  <TabsTrigger value="overview" className="min-w-[120px] rounded-xl">Основное</TabsTrigger>
                  <TabsTrigger value="payments" className="min-w-[120px] rounded-xl">Оплата</TabsTrigger>
                  <TabsTrigger value="parent" className="min-w-[120px] rounded-xl">Родитель</TabsTrigger>
                  <TabsTrigger value="intake" className="min-w-[120px] rounded-xl">Анкета</TabsTrigger>
                  <TabsTrigger value="profile" className="min-w-[130px] rounded-xl">Комментарии</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                      <div><p className="text-xs text-[#133C2A]/60">Возраст</p><p className="text-[#133C2A]">{selectedChild.age ?? '—'} лет</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Дата рождения</p><p className="text-[#133C2A]">{formatRuDate(selectedChild.birthDate)}</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Группа</p><p className="text-[#133C2A]">{selectedChild.groupName || 'Не назначена'}</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Абонемент</p><p className="text-[#133C2A]">{selectedChild.subscriptionName || 'Не выбран'}</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Статус оплаты</p><p className="text-[#133C2A]">{paymentStatusLabel(selectedChild.paymentStatus)}</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Осталось занятий</p><p className="text-[#133C2A]">{selectedChild.remainingClasses ?? '—'}</p></div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payments" className="space-y-4">
                  {selectedChildPayments.length === 0 ? (
                    <Card className="border-[#133C2A]/10">
                      <CardContent className="p-6 text-[#133C2A]/60">Платежей по этой карточке пока нет.</CardContent>
                    </Card>
                  ) : (
                    selectedChildPayments.map((payment) => (
                      <Card key={payment.id} className="border-[#133C2A]/10">
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                          <div>
                            <p className="text-[#133C2A]">{payment.subscriptionName || selectedChild.subscriptionName || 'Абонемент'}</p>
                            <p className="text-xs text-[#133C2A]/60">
                              Счет: {payment.invoiceNumber || '—'} • Создан: {formatRuDateTime(payment.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg text-[#133C2A]">{Number(payment.amount || 0).toLocaleString('ru-RU')} ₽</p>
                            <p className="text-xs text-[#133C2A]/60">{paymentStatusLabel(payment.status)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="parent" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardHeader><CardTitle className="text-sm text-[#133C2A]/60">Контакты плательщика</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div><p className="text-xs text-[#133C2A]/60">ФИО</p><p className="text-[#133C2A]">{selectedChild.parentName || '—'}</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Телефон</p><p className="text-[#133C2A]">{selectedChild.parentPhone || '—'}</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Доступ в ЛК</p><p className="text-[#133C2A]">{parentStatusLabels[String(selectedChild.parentAccountStatus || '')] || (selectedChild.parentAccountStatus || '—')}</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Уровень доступа</p><p className="text-[#133C2A]">{selectedChild.parentAccessLevel || '—'}</p></div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="intake" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardHeader><CardTitle className="text-sm text-[#133C2A]/60">Первичная анкета</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div><p className="text-xs text-[#133C2A]/60">Ребенок</p><p className="text-[#133C2A]">{selectedChild.landingLead?.childFullName || selectedChild.fullName || '—'}</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Дата рождения</p><p className="text-[#133C2A]">{formatRuDate(selectedChild.landingLead?.childBirthDate || selectedChild.birthDate)}</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Источник</p><p className="text-[#133C2A]">{selectedChild.landingLead?.discoverySource || '—'}</p></div>
                      <div><p className="text-xs text-[#133C2A]/60">Предпочтительный график</p><p className="text-[#133C2A]">{selectedChild.landingLead?.preferredSchedule || '—'}</p></div>
                      <div className="md:col-span-2"><p className="text-xs text-[#133C2A]/60">Медицинские ограничения</p><p className="whitespace-pre-wrap text-[#133C2A]">{selectedChild.landingLead?.medicalRestrictions || '—'}</p></div>
                      <div className="md:col-span-2"><p className="text-xs text-[#133C2A]/60">Опыт занятий</p><p className="whitespace-pre-wrap text-[#133C2A]">{selectedChild.landingLead?.previousActivities || '—'}</p></div>
                      <div className="md:col-span-2"><p className="text-xs text-[#133C2A]/60">Комментарий</p><p className="whitespace-pre-wrap text-[#133C2A]">{selectedChild.landingLead?.comment || '—'}</p></div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="profile" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm text-[#133C2A]/60">
                        <ShieldCheck className="h-4 w-4 text-[#D4AF37]" />
                        Внутренние данные
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Комментарий</Label>
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
                          <Label>Экстренный контакт</Label>
                          <Input value={profileDraft.emergencyContactName} onChange={(event) => setProfileDraft((prev) => ({ ...prev, emergencyContactName: event.target.value }))} className="rounded-xl" />
                        </div>
                        <div className="space-y-1">
                          <Label>Телефон экстренного контакта</Label>
                          <Input value={profileDraft.emergencyContactPhone} onChange={(event) => setProfileDraft((prev) => ({ ...prev, emergencyContactPhone: event.target.value }))} className="rounded-xl" />
                        </div>
                        <div className="space-y-1">
                          <Label>Предпочтения по связи</Label>
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
                          <Input value={profileDraft.tagsInput} onChange={(event) => setProfileDraft((prev) => ({ ...prev, tagsInput: event.target.value }))} className="rounded-xl" placeholder="Например: конкурс, сильная техника, нужна адаптация" />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          onClick={() => void saveProfile()}
                          disabled={isProfileSaving}
                          className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]"
                        >
                          {isProfileSaving ? 'Сохраняем...' : 'Сохранить внутренний профиль'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

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
