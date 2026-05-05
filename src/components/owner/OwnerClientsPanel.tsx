import { useEffect, useMemo, useState } from 'react';
import {
  Baby,
  Calendar,
  CreditCard,
  Eye,
  MoreHorizontal,
  Phone,
  Plus,
  Receipt,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { Group } from '../../types';
import { AddStudentDialog } from '../admin/AddStudentDialog';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  AdminChildRecord,
  AdminPaymentRecord,
  assignAdminChildGroup,
  createAdminInvoice,
  loadAdminChildren,
  loadAdminPayments,
  loadOwnerGroups,
  loadOwnerPricing,
  OwnerPricingPlanDto,
  sendAdminPaymentReminder,
  updateAdminChildProfile,
} from '../../lib/backendApi';
import { OwnerPaymentsNavigationContext } from './paymentsNavigation';
import { toast } from 'sonner';
import { Textarea } from '../ui/textarea';

interface OwnerClientsPanelProps {
  groups: Group[];
  onNavigatePayments?: (context?: Omit<OwnerPaymentsNavigationContext, 'requestId'>) => void;
}

const paymentStatusLabels: Record<string, string> = {
  unpaid: 'Не оплачено',
  pending: 'Ожидает оплату',
  paid: 'Оплачено',
  failed: 'Ошибка',
  refunded: 'Возврат',
  overdue: 'Просрочено',
  cancelled: 'Отменено',
  expired: 'Истекло',
};

const parentStatusLabels: Record<string, string> = {
  invited: 'Приглашен',
  payment_pending: 'Ожидает оплату',
  active: 'Активен',
  suspended: 'Приостановлен',
};

const parentBadgeClass: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700 border-green-200',
  payment_pending: 'bg-blue-500/10 text-blue-700 border-blue-200',
  invited: 'bg-[#D4AF37]/15 text-[#B8941F] border-[#D4AF37]/30',
  suspended: 'bg-orange-500/10 text-orange-700 border-orange-200',
};

const paymentBadgeClass: Record<string, string> = {
  paid: 'bg-green-500/10 text-green-700 border-green-200',
  pending: 'bg-blue-500/10 text-blue-700 border-blue-200',
  unpaid: 'bg-[#D4AF37]/15 text-[#B8941F] border-[#D4AF37]/30',
  overdue: 'bg-red-500/10 text-red-700 border-red-200',
  failed: 'bg-red-500/10 text-red-700 border-red-200',
  refunded: 'bg-slate-100 text-slate-700 border-slate-200',
  cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
  expired: 'bg-slate-100 text-slate-700 border-slate-200',
};

function isOutstandingStatus(status?: string | null): boolean {
  return ['unpaid', 'pending', 'failed', 'overdue'].includes(String(status || ''));
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

function childInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  return parts.slice(0, 2).map((item) => item[0]).join('').toUpperCase() || 'У';
}

function normalizeTagInput(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function OwnerClientsPanel({ groups, onNavigatePayments }: OwnerClientsPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [children, setChildren] = useState<AdminChildRecord[]>([]);
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [pricingPlans, setPricingPlans] = useState<OwnerPricingPlanDto[]>([]);
  const [ownerGroups, setOwnerGroups] = useState<Group[]>(groups || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
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
  const [isInvoicingChildId, setIsInvoicingChildId] = useState<string | null>(null);
  const [isReminderPaymentId, setIsReminderPaymentId] = useState<string | null>(null);
  const [isAssigningChildId, setIsAssigningChildId] = useState<string | null>(null);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [isBulkInvoicing, setIsBulkInvoicing] = useState(false);
  const [isBulkReminding, setIsBulkReminding] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const refreshChildren = async () => {
    setIsLoading(true);
    try {
      const [childrenResult, plansResult, paymentsResult, groupsResult] = await Promise.allSettled([
        loadAdminChildren(),
        loadOwnerPricing(),
        loadAdminPayments(),
        loadOwnerGroups(),
      ]);

      if (childrenResult.status === 'fulfilled') {
        setChildren(childrenResult.value);
      } else {
        throw childrenResult.reason;
      }
      if (plansResult.status === 'fulfilled') {
        setPricingPlans(plansResult.value.filter((plan) => plan.is_active));
      } else {
        setPricingPlans([]);
      }
      if (paymentsResult.status === 'fulfilled') {
        setPayments(paymentsResult.value);
      } else {
        setPayments([]);
      }
      if (groupsResult.status === 'fulfilled') {
        setOwnerGroups(groupsResult.value);
      } else {
        setOwnerGroups(groups || []);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось загрузить клиентов';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshChildren();
  }, []);

  const groupById = useMemo(() => {
    const map = new Map<string, Group>();
    ownerGroups.forEach((group) => map.set(group.id, group));
    return map;
  }, [ownerGroups]);

  const outstandingPaymentByClientId = useMemo(() => {
    const statusWeight: Record<string, number> = { overdue: 4, failed: 3, pending: 2, unpaid: 1 };
    const filtered = payments.filter((payment) => isOutstandingStatus(payment.status));
    filtered.sort((a, b) => {
      const weightDiff = (statusWeight[b.status] || 0) - (statusWeight[a.status] || 0);
      if (weightDiff !== 0) return weightDiff;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
    const map = new Map<string, AdminPaymentRecord>();
    filtered.forEach((payment) => {
      const key = String(payment.clientId || '');
      if (!key || map.has(key)) return;
      map.set(key, payment);
    });
    return map;
  }, [payments]);

  const childById = useMemo(() => {
    const map = new Map<string, AdminChildRecord>();
    children.forEach((item) => map.set(item.id, item));
    return map;
  }, [children]);

  const selectedChild = useMemo(
    () => children.find((item) => item.id === selectedChildId) || null,
    [children, selectedChildId],
  );

  useEffect(() => {
    if (!selectedChild) {
      setProfileDraft({
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
      return;
    }

    const profile = selectedChild.profile || ({} as NonNullable<AdminChildRecord['profile']>);
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

  const filteredChildren = useMemo(
    () =>
      children.filter((child) => {
        const q = searchQuery.trim().toLowerCase();
        const searchText = [
          child.fullName || '',
          child.parentName || '',
          child.parentPhone || '',
          child.subscriptionName || '',
          child.groupName || '',
        ]
          .join(' ')
          .toLowerCase();
        const matchesSearch = !q || searchText.includes(q);
        const matchesGroup =
          groupFilter === 'all' ||
          (groupFilter === 'ungrouped' && !child.groupId) ||
          String(child.groupId || '') === groupFilter;
        const matchesPayment = paymentFilter === 'all' || String(child.paymentStatus || '') === paymentFilter;
        return matchesSearch && matchesGroup && matchesPayment;
      }),
    [children, searchQuery, groupFilter, paymentFilter],
  );

  const filteredChildIds = useMemo(() => filteredChildren.map((item) => item.id), [filteredChildren]);
  const selectedFilteredCount = useMemo(
    () => selectedChildIds.filter((id) => filteredChildIds.includes(id)).length,
    [selectedChildIds, filteredChildIds],
  );
  const isAllFilteredSelected = filteredChildIds.length > 0 && selectedFilteredCount === filteredChildIds.length;
  const outstandingSelectedPayments = useMemo(
    () =>
      selectedChildIds
        .map((childId) => {
          const child = childById.get(childId);
          if (!child?.clientId) return null;
          return outstandingPaymentByClientId.get(String(child.clientId));
        })
        .filter((item): item is AdminPaymentRecord => Boolean(item)),
    [selectedChildIds, childById, outstandingPaymentByClientId],
  );

  const stats = useMemo(
    () => ({
      total: children.length,
      inGroup: children.filter((item) => Boolean(item.groupId)).length,
      paymentPending: children.filter((item) => isOutstandingStatus(item.paymentStatus)).length,
      revenue: children
        .filter((item) => item.paymentStatus === 'paid')
        .reduce((sum, item) => sum + Number(item.subscriptionAmount || 0), 0),
    }),
    [children],
  );

  const parentOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string; phone: string }>();
    for (const child of children) {
      const key = child.parentUserId || child.parentPhone || '';
      if (!key || map.has(key)) continue;
      map.set(key, {
        id: key,
        name: child.parentName || child.parentPhone || key,
        email: '',
        phone: child.parentPhone || '',
      });
    }
    return Array.from(map.values());
  }, [children]);

  const subscriptions = pricingPlans.map((item) => ({
    id: String(item.code),
    name: item.title,
    classes: typeof item.classes_count === 'number' ? item.classes_count : 0,
    price: item.price,
  }));

  useEffect(() => {
    setSelectedChildIds((prev) => prev.filter((id) => childById.has(id)));
  }, [childById]);

  const toggleChildSelection = (childId: string, checked: boolean) => {
    setSelectedChildIds((prev) => {
      if (checked) {
        if (prev.includes(childId)) return prev;
        return [...prev, childId];
      }
      return prev.filter((item) => item !== childId);
    });
  };

  const toggleAllFilteredSelection = (checked: boolean) => {
    if (!checked) {
      setSelectedChildIds((prev) => prev.filter((id) => !filteredChildIds.includes(id)));
      return;
    }
    setSelectedChildIds((prev) => Array.from(new Set([...prev, ...filteredChildIds])));
  };

  const resolveInvoiceAmount = (child: AdminChildRecord): number => {
    if (Number(child.subscriptionAmount || 0) > 0) {
      return Number(child.subscriptionAmount || 0);
    }
    const byCode = pricingPlans.find((item) => String(item.code) === String(child.subscriptionCode || ''));
    if (byCode) return Number(byCode.price || 0);
    const byTitle = pricingPlans.find((item) => String(item.title) === String(child.subscriptionName || ''));
    return Number(byTitle?.price || 0);
  };

  const createInvoiceForChild = async (child: AdminChildRecord) => {
    if (!child.clientId) {
      toast.error('Для ученика не найден клиентский договор');
      return;
    }
    setIsInvoicingChildId(child.id);
    try {
      const amount = resolveInvoiceAmount(child);
      await createAdminInvoice({
        client_id: String(child.clientId),
        payment_method: 'online',
        amount: amount > 0 ? amount : undefined,
      });
      toast.success('Счет выставлен');
      await refreshChildren();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось выставить счет');
    } finally {
      setIsInvoicingChildId(null);
    }
  };

  const navigateToChildPayments = (child: AdminChildRecord, focusOutstanding = false) => {
    if (!onNavigatePayments) return;
    onNavigatePayments({
      searchQuery: `${child.parentPhone || ''} ${child.fullName || ''}`.trim(),
      showOnlyOutstanding: focusOutstanding,
      invoiceClientId: String(child.clientId || ''),
      sourceLabel: `Ученик: ${child.fullName || '—'}`,
    });
  };

  const remindByChild = async (child: AdminChildRecord) => {
    const payment = child.clientId ? outstandingPaymentByClientId.get(String(child.clientId)) : undefined;
    if (!payment) {
      toast.info('Для ученика нет открытого счета');
      return;
    }
    setIsReminderPaymentId(payment.id);
    try {
      await sendAdminPaymentReminder(payment.id);
      toast.success('Напоминание отправлено');
      await refreshChildren();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось отправить напоминание');
    } finally {
      setIsReminderPaymentId(null);
    }
  };

  const saveSelectedChildProfile = async () => {
    if (!selectedChild) return;
    setIsProfileSaving(true);
    try {
      const result = await updateAdminChildProfile(selectedChild.id, {
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
        tags: normalizeTagInput(profileDraft.tagsInput),
      });
      setChildren((prev) => prev.map((child) => (child.id === selectedChild.id ? result.child : child)));
      toast.success('Карточка клиента обновлена');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить карточку клиента');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const assignGroup = async (childId: string, groupId: string | null) => {
    setIsAssigningChildId(childId);
    try {
      await assignAdminChildGroup(childId, { group_id: groupId || null });
      setChildren((prev) =>
        prev.map((item) =>
          item.id === childId
            ? {
                ...item,
                groupId: groupId || null,
                groupName: groupId ? groupById.get(groupId)?.name || item.groupName : null,
              }
            : item,
        ),
      );
      toast.success(groupId ? 'Ученик назначен в группу' : 'Ученик снят с группы');
      await refreshChildren();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить группу ученика');
    } finally {
      setIsAssigningChildId(null);
    }
  };

  const createInvoicesForSelected = async () => {
    const targetIds = selectedChildIds.length > 0 ? selectedChildIds : filteredChildIds;
    if (targetIds.length === 0) {
      toast.info('Нет учеников для выставления счетов');
      return;
    }
    const targets = targetIds.map((id) => childById.get(id)).filter((item): item is AdminChildRecord => Boolean(item));
    const withClient = targets.filter((item) => item.clientId);
    if (withClient.length === 0) {
      toast.info('Нет учеников с клиентским договором');
      return;
    }

    setIsBulkInvoicing(true);
    try {
      const results = await Promise.allSettled(
        withClient.map((child) =>
          createAdminInvoice({
            client_id: String(child.clientId),
            payment_method: 'online',
            amount: resolveInvoiceAmount(child) || undefined,
          }),
        ),
      );
      const successCount = results.filter((item) => item.status === 'fulfilled').length;
      const failedCount = results.length - successCount;
      if (successCount > 0) toast.success(`Счета выставлены: ${successCount}`);
      if (failedCount > 0) toast.error(`Не удалось выставить счетов: ${failedCount}`);
      await refreshChildren();
    } finally {
      setIsBulkInvoicing(false);
    }
  };

  const sendRemindersForSelected = async () => {
    const sourceIds = selectedChildIds.length > 0 ? selectedChildIds : filteredChildIds;
    const targetPayments = sourceIds
      .map((id) => {
        const child = childById.get(id);
        if (!child?.clientId) return null;
        return outstandingPaymentByClientId.get(String(child.clientId));
      })
      .filter((item): item is AdminPaymentRecord => Boolean(item));

    if (targetPayments.length === 0) {
      toast.info('Нет открытых счетов для напоминаний');
      return;
    }
    setIsBulkReminding(true);
    try {
      const results = await Promise.allSettled(targetPayments.map((payment) => sendAdminPaymentReminder(payment.id)));
      const successCount = results.filter((item) => item.status === 'fulfilled').length;
      const failedCount = results.length - successCount;
      if (successCount > 0) toast.success(`Напоминания отправлены: ${successCount}`);
      if (failedCount > 0) toast.error(`Не удалось отправить напоминания: ${failedCount}`);
      await refreshChildren();
    } finally {
      setIsBulkReminding(false);
    }
  };

  const selectedChildPayments = useMemo(() => {
    if (!selectedChild?.clientId) return [];
    return payments
      .filter((item) => String(item.clientId || '') === String(selectedChild.clientId))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }, [payments, selectedChild]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-none soft-shadow"><CardContent className="p-4 md:p-5"><p className="text-xs md:text-sm text-[#133C2A]/60">Всего учеников</p><p className="text-2xl md:text-3xl text-[#133C2A]">{stats.total}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4 md:p-5"><p className="text-xs md:text-sm text-[#133C2A]/60">В группах</p><p className="text-2xl md:text-3xl text-[#133C2A]">{stats.inGroup}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4 md:p-5"><p className="text-xs md:text-sm text-[#133C2A]/60">Требуют оплаты</p><p className="text-2xl md:text-3xl text-[#D14343]">{stats.paymentPending}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4 md:p-5"><p className="text-xs md:text-sm text-[#133C2A]/60">Оплачено</p><p className="text-2xl md:text-3xl text-[#133C2A]">{stats.revenue.toLocaleString('ru-RU')} ₽</p></CardContent></Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-[#133C2A]">
              <Users className="w-6 h-6" />
              Клиенты (ученики)
            </CardTitle>
            <div className="grid grid-cols-2 sm:flex gap-2 w-full lg:w-auto">
              <Button variant="outline" onClick={() => void refreshChildren()} className="rounded-2xl">
                Обновить
              </Button>
              {onNavigatePayments && (
                <Button
                  variant="outline"
                  onClick={() =>
                    onNavigatePayments({
                      showOnlyOutstanding: true,
                      sourceLabel: 'Проблемные оплаты из раздела "Клиенты"',
                    })
                  }
                  className="rounded-2xl border-[#133C2A]/20 hidden sm:inline-flex"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  К проблемным оплатам
                </Button>
              )}
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 col-span-2 sm:col-span-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить ученика
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-2 md:hidden">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по ученику, родителю, телефону, абонементу"
                className="pl-10 rounded-2xl border-[#133C2A]/20"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => setIsFiltersOpen((prev) => !prev)}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              {isFiltersOpen ? 'Скрыть фильтры' : 'Фильтры и группы'}
            </Button>
          </div>

          <div className={`${isFiltersOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row gap-3`}>
            <div className="flex-1 relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по ученику, родителю, телефону, абонементу"
                className="pl-10 rounded-2xl border-[#133C2A]/20"
              />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-full md:w-[220px] rounded-2xl border-[#133C2A]/20">
                <SelectValue placeholder="Фильтр группы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все группы</SelectItem>
                <SelectItem value="ungrouped">Без группы</SelectItem>
                {ownerGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full md:w-[220px] rounded-2xl border-[#133C2A]/20">
                <SelectValue placeholder="Фильтр оплаты" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все оплаты</SelectItem>
                <SelectItem value="paid">Оплачено</SelectItem>
                <SelectItem value="pending">Ожидает оплату</SelectItem>
                <SelectItem value="unpaid">Не оплачено</SelectItem>
                <SelectItem value="failed">Ошибка оплаты</SelectItem>
                <SelectItem value="overdue">Просрочено</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-[#133C2A]/10 bg-[#F8F4E3]/80 px-3 md:px-4 py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-[#133C2A] cursor-pointer">
                <Checkbox
                  checked={isAllFilteredSelected}
                  onCheckedChange={(checked) => toggleAllFilteredSelection(Boolean(checked))}
                />
                Выбрать всех по фильтру
              </label>
              <span className="text-xs text-[#133C2A]/60">Выбрано: {selectedChildIds.length}</span>
              <span className="text-xs text-[#133C2A]/60">Открытых счетов в выборе: {outstandingSelectedPayments.length}</span>
            </div>
            <div className="mobile-scroll-x md:flex md:items-center md:gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl border-[#133C2A]/20"
                onClick={() => {
                  const sourceIds = selectedChildIds.length > 0 ? selectedChildIds : filteredChildIds;
                  const firstChild = sourceIds[0] ? childById.get(sourceIds[0]) : undefined;
                  if (!onNavigatePayments) return;
                  onNavigatePayments({
                    searchQuery: firstChild ? `${firstChild.parentPhone || ''} ${firstChild.fullName || ''}` : '',
                    showOnlyOutstanding: true,
                    sourceLabel: 'Контроль оплат по выбранным ученикам',
                  });
                }}
                disabled={(selectedChildIds.length === 0 && filteredChildIds.length === 0) || !onNavigatePayments}
              >
                Контроль выбранных
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl border-[#133C2A]/20"
                onClick={() => void createInvoicesForSelected()}
                disabled={isBulkInvoicing}
              >
                {isBulkInvoicing ? 'Выставляем...' : 'Массово выставить счета'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl border-[#D4AF37]/30 text-[#B8941F]"
                onClick={() => void sendRemindersForSelected()}
                disabled={isBulkReminding}
              >
                {isBulkReminding ? 'Отправляем...' : 'Уведомить выбранных'}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-[#133C2A]/60">Загрузка учеников...</div>
          ) : filteredChildren.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-[#133C2A]/20 mx-auto mb-4" />
              <p className="text-[#133C2A]/60">Ученики не найдены</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredChildren.map((child) => {
                  const outstandingPayment = child.clientId
                    ? outstandingPaymentByClientId.get(String(child.clientId))
                    : undefined;
                  const lessonsTracked = child.lessonsTracked !== false;
                  const totalClasses = Math.max(0, Number(child.totalClasses || 0));
                  const attendedClasses = Math.max(0, Number(child.attendedClasses || 0));
                  const remainingClasses = Math.max(0, Number(child.remainingClasses || 0));
                  const progressPercent = lessonsTracked && totalClasses > 0
                    ? Math.max(0, Math.min(100, Number(child.progressPercent ?? Math.round((attendedClasses / totalClasses) * 100))))
                    : 0;
                  const nextStep = !child.groupId
                    ? {
                        title: 'Без группы',
                        description: 'Группа не назначена. Это учебный маркер, а не срочное действие.',
                        action: 'Открыть карточку',
                        onClick: undefined,
                        disabled: false,
                        tone: 'gold',
                      }
                    : outstandingPayment
                      ? {
                          title: 'Открытый счет',
                          description: `${paymentStatusLabels[outstandingPayment.status] || 'Требует контроля'} · ${Number(outstandingPayment.amount || 0).toLocaleString('ru-RU')} ₽`,
                          action: 'Открыть карточку',
                          onClick: undefined,
                          disabled: false,
                          tone: 'red',
                        }
                      : String(child.parentAccountStatus || '') !== 'active'
                        ? {
                            title: 'Доступ родителя',
                            description: 'Личный кабинет родителя еще не активен.',
                            action: 'Открыть профиль',
                            onClick: () => {
                              setSelectedChildId(child.id);
                              setIsViewDialogOpen(true);
                            },
                            disabled: false,
                            tone: 'blue',
                          }
                        : {
                            title: 'Активная карточка',
                            description: 'Группа, доступ и базовые статусы заполнены.',
                            action: 'Открыть профиль',
                            onClick: () => {
                              setSelectedChildId(child.id);
                              setIsViewDialogOpen(true);
                            },
                            disabled: false,
                            tone: 'green',
                          };
                  const paymentTone = isOutstandingStatus(child.paymentStatus)
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : child.paymentStatus === 'paid'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-[#133C2A]/10 bg-[#F8F4E3] text-[#133C2A]/70';
                  const accountTone = String(child.parentAccountStatus || '') === 'active'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-[#D4AF37]/30 bg-[#FFF9E8] text-[#8B6B00]';
                  return (
                    <Card key={child.id} className="overflow-hidden border-[#133C2A]/10 bg-white/92 shadow-[0_10px_30px_rgba(19,60,42,0.06)] transition-smooth hover:border-[#D4AF37]/35">
                      <CardContent className="p-0">
                        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr_230px]">
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedChildIds.includes(child.id)}
                                onCheckedChange={(checked) => toggleChildSelection(child.id, Boolean(checked))}
                                className="mt-3"
                              />
                              <Avatar className="h-12 w-12 border border-[#D4AF37]/25">
                                <AvatarFallback className="bg-[#133C2A] text-white">
                                  {childInitials(child.fullName || '')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedChildId(child.id);
                                      setIsViewDialogOpen(true);
                                    }}
                                    className="text-left text-lg leading-tight text-[#133C2A] hover:underline"
                                  >
                                    {child.fullName || 'Ученик'}
                                  </button>
                                  <Badge variant="outline" className="rounded-full border-[#133C2A]/12 text-[#133C2A]/65">
                                    {child.age ?? '—'} лет
                                  </Badge>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#133C2A]/66">
                                  <span className="truncate">{child.parentName || 'Родитель не указан'}</span>
                                  {child.parentPhone ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Phone className="h-3.5 w-3.5" />
                                      {child.parentPhone}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  <Badge variant="outline" className={`rounded-full ${paymentTone}`}>
                                    {paymentStatusLabels[String(child.paymentStatus || '')] || (child.paymentStatus || 'Оплата не задана')}
                                  </Badge>
                                  <Badge variant="outline" className={`rounded-full ${accountTone}`}>
                                    ЛК: {parentStatusLabels[String(child.parentAccountStatus || '')] || (child.parentAccountStatus || 'не задан')}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="border-y border-[#133C2A]/8 bg-[#fbf7e8]/70 p-3 lg:border-x lg:border-y-0 lg:p-4">
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                              <div>
                                <p className="text-xs text-[#133C2A]/45">Группа</p>
                                <Select
                                  value={child.groupId || 'none'}
                                  onValueChange={(value) => void assignGroup(child.id, value === 'none' ? null : value)}
                                  disabled={isAssigningChildId === child.id}
                                >
                                  <SelectTrigger className="mt-1 h-10 rounded-xl border-[#133C2A]/15 bg-white text-xs sm:text-sm">
                                    <SelectValue placeholder="Без группы" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Без группы</SelectItem>
                                    {ownerGroups.map((group) => (
                                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <p className="text-xs text-[#133C2A]/45">Абонемент</p>
                                <p className="mt-2 line-clamp-1 text-sm text-[#133C2A]">{child.subscriptionName || 'Не выбран'}</p>
                                <p className="mt-1 line-clamp-1 text-xs text-[#133C2A]/58">
                                  {Number(child.subscriptionAmount || 0) > 0 ? `${Number(child.subscriptionAmount).toLocaleString('ru-RU')} ₽` : 'Стоимость не задана'}
                                </p>
                              </div>
                            </div>
                            <div className="mt-4">
                              <div className="mb-1 flex items-center justify-between text-xs text-[#133C2A]/58">
                                <span>Занятия</span>
                                <span>{lessonsTracked && totalClasses > 0 ? `${remainingClasses} из ${totalClasses} осталось` : 'без лимита'}</span>
                              </div>
                              {lessonsTracked && totalClasses > 0 ? (
                                <Progress value={progressPercent} className="h-2 bg-[#133C2A]/10" />
                              ) : (
                                <div className="h-2 rounded-full bg-[#133C2A]/10" />
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col justify-between gap-3 p-3 lg:p-4">
                            <div className="hidden lg:block">
                              <p className="text-xs uppercase tracking-[0.12em] text-[#133C2A]/38">Маркеры карточки</p>
                              <p className="mt-1 text-sm text-[#133C2A]">{nextStep.title}</p>
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#133C2A]/58">{nextStep.description}</p>
                            </div>
                            <div className="lg:hidden">
                              <p className="text-xs text-[#133C2A]/45">Маркер</p>
                              <p className="line-clamp-1 text-sm text-[#133C2A]">{nextStep.title}</p>
                            </div>
                            <div className="grid grid-cols-[1fr_auto] gap-2">
                              <Button
                                size="sm"
                                className="rounded-xl bg-[#133C2A] text-white hover:bg-[#133C2A]/90"
                                onClick={nextStep.onClick || (() => {
                                  setSelectedChildId(child.id);
                                  setIsViewDialogOpen(true);
                                })}
                                disabled={nextStep.disabled && nextStep.title !== 'Назначить группу'}
                              >
                                  {nextStep.action}
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="rounded-xl border-[#133C2A]/15 px-3">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl">
                                  <DropdownMenuItem
                                    onSelect={(event) => {
                                      event.preventDefault();
                                      setSelectedChildId(child.id);
                                      setIsViewDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Открыть профиль
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={(event) => {
                                      event.preventDefault();
                                      void createInvoiceForChild(child);
                                    }}
                                    disabled={isInvoicingChildId === child.id || !child.clientId}
                                  >
                                    <Receipt className="w-4 h-4 mr-2" />
                                    Выставить счет
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={(event) => {
                                      event.preventDefault();
                                      navigateToChildPayments(child, true);
                                    }}
                                    disabled={!onNavigatePayments}
                                  >
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Контроль оплат
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={(event) => {
                                      event.preventDefault();
                                      void remindByChild(child);
                                    }}
                                    disabled={!outstandingPayment || isReminderPaymentId === outstandingPayment?.id}
                                  >
                                    <Send className="w-4 h-4 mr-2" />
                                    Напомнить об оплате
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                  return (
                    <Card key={child.id} className="border-[#133C2A]/10 hover-lift transition-smooth">
                      <CardContent className="p-4">
                        {outstandingPayment && (
                          <div className="mb-3 text-xs rounded-xl border border-[#D4AF37]/25 bg-[#FFF9E8] px-3 py-2 text-[#8B6B00]">
                            Открытый счет: {paymentStatusLabels[outstandingPayment.status] || 'Ожидает оплату'}
                          </div>
                        )}
                        <div className="flex flex-col xl:flex-row gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="pt-1">
                                <Checkbox
                                  checked={selectedChildIds.includes(child.id)}
                                  onCheckedChange={(checked) => toggleChildSelection(child.id, Boolean(checked))}
                                />
                              </div>
                              <Avatar className="w-12 h-12 border-2 border-[#D4AF37]/20">
                                <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white">
                                  {childInitials(child.fullName || '')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-[#133C2A] leading-none">{child.fullName || 'Ученик'}</h3>
                                    <Badge variant="outline" className="rounded-lg text-xs border-[#133C2A]/20">
                                      <Baby className="w-3 h-3 mr-1" />
                                      {child.age ?? '—'} лет
                                    </Badge>
                                    <Badge className={`${parentBadgeClass[String(child.parentAccountStatus || '')] || ''} border rounded-lg`}>
                                      {parentStatusLabels[String(child.parentAccountStatus || '')] || String(child.parentAccountStatus || '—')}
                                    </Badge>
                                    <Badge className={`${paymentBadgeClass[String(child.paymentStatus || '')] || 'border-slate-200 bg-slate-100 text-slate-700'} border rounded-lg`}>
                                      {paymentStatusLabels[String(child.paymentStatus || '')] || (child.paymentStatus || '—')}
                                    </Badge>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-8 rounded-lg border-[#133C2A]/20">
                                        <MoreHorizontal className="w-4 h-4 mr-1" />
                                        Действия
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl">
                                      <DropdownMenuItem
                                        onSelect={(event) => {
                                          event.preventDefault();
                                          void createInvoiceForChild(child);
                                        }}
                                        disabled={isInvoicingChildId === child.id || !child.clientId}
                                      >
                                        <Receipt className="w-4 h-4 mr-2" />
                                        {isInvoicingChildId === child.id ? 'Выставляем счет...' : 'Выставить счет'}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onSelect={(event) => {
                                          event.preventDefault();
                                          navigateToChildPayments(child, true);
                                        }}
                                        disabled={!onNavigatePayments}
                                      >
                                        <CreditCard className="w-4 h-4 mr-2" />
                                        Контроль оплат
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onSelect={(event) => {
                                          event.preventDefault();
                                          void remindByChild(child);
                                        }}
                                        disabled={!outstandingPayment || isReminderPaymentId === outstandingPayment?.id}
                                      >
                                        <Send className="w-4 h-4 mr-2" />
                                        {isReminderPaymentId === outstandingPayment?.id ? 'Отправляем...' : 'Напомнить об оплате'}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onSelect={(event) => {
                                          event.preventDefault();
                                          setSelectedChildId(child.id);
                                          setIsViewDialogOpen(true);
                                        }}
                                      >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Открыть профиль
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-sm text-[#133C2A]/70">
                                  <span>{child.parentName || '—'}</span>
                                  {child.parentPhone ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      {child.parentPhone}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[#133C2A]/60 mt-1">
                                  <span>Источник: {child.profile?.sourceChannel || child.landingLead?.discoverySource || '—'}</span>
                                  {child.profile?.internalComment ? (
                                    <span className="line-clamp-1">• Комментарий: {child.profile.internalComment}</span>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 mb-2">
                              <div className="rounded-xl border border-[#133C2A]/10 bg-[#F8F4E3]/45 px-3 py-2">
                                <p className="text-xs text-[#133C2A]/55 mb-1">Группа</p>
                                <Select
                                  value={child.groupId || 'none'}
                                  onValueChange={(value) => void assignGroup(child.id, value === 'none' ? null : value)}
                                  disabled={isAssigningChildId === child.id}
                                >
                                  <SelectTrigger className="h-8 rounded-lg">
                                    <SelectValue placeholder="Без группы" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Без группы</SelectItem>
                                    {ownerGroups.map((group) => (
                                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="rounded-xl border border-[#133C2A]/10 bg-[#F8F4E3]/45 px-3 py-2">
                                <p className="text-xs text-[#133C2A]/55 mb-1">Абонемент</p>
                                <p className="text-sm text-[#133C2A] leading-tight line-clamp-2">
                                  {child.subscriptionName || '—'}
                                </p>
                                <p className="text-xs text-[#133C2A]/70 mt-1">
                                  {Number(child.subscriptionAmount || 0) > 0 ? `${Number(child.subscriptionAmount).toLocaleString('ru-RU')} ₽` : '—'}
                                </p>
                              </div>
                              <div className="rounded-xl border border-[#133C2A]/10 bg-[#F8F4E3]/45 px-3 py-2">
                                <p className="text-xs text-[#133C2A]/55 mb-1">Счет / дедлайн</p>
                                <p className="text-sm text-[#133C2A] leading-tight">
                                  {outstandingPayment?.invoiceNumber || child.latestPayment?.invoiceNumber || '—'}
                                </p>
                                <p className="text-xs text-[#133C2A]/70 mt-1">
                                  до {formatRuDate(outstandingPayment?.dueDate || child.latestPayment?.dueDate)}
                                </p>
                              </div>
                              <div className="rounded-xl border border-[#133C2A]/10 bg-[#F8F4E3]/45 px-3 py-2">
                                <p className="text-xs text-[#133C2A]/55 mb-1">Обновление</p>
                                <p className="text-sm text-[#133C2A]">{formatRuDate(child.updatedAt)}</p>
                                <p className="text-xs text-[#133C2A]/70 mt-1">
                                  создан {formatRuDate(child.createdAt)}
                                </p>
                              </div>
                            </div>

                            <div className={`mb-2 rounded-xl border px-3 py-3 ${
                              nextStep.tone === 'red'
                                ? 'border-red-200 bg-red-50'
                                : nextStep.tone === 'blue'
                                  ? 'border-blue-200 bg-blue-50'
                                  : nextStep.tone === 'green'
                                    ? 'border-green-200 bg-green-50'
                                    : 'border-[#D4AF37]/30 bg-[#FFF9E8]'
                            }`}>
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm text-[#133C2A]">Следующий шаг: {nextStep.title}</p>
                                  <p className="mt-1 text-xs leading-relaxed text-[#133C2A]/65">{nextStep.description}</p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl bg-white/70 shrink-0"
                                  onClick={nextStep.onClick}
                                  disabled={nextStep.disabled}
                                >
                                  {nextStep.action}
                                </Button>
                              </div>
                            </div>

                            <div className="rounded-xl border border-[#133C2A]/10 bg-white/80 px-3 py-2 mb-2">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <p className="text-xs text-[#133C2A]/55">Прогресс абонемента</p>
                                {lessonsTracked && totalClasses > 0 ? (
                                  <p className="text-xs text-[#133C2A]/70">
                                    Осталось: <span className="text-[#133C2A]">{remainingClasses}</span> из {totalClasses}
                                  </p>
                                ) : (
                                  <p className="text-xs text-[#133C2A]/70">Без лимита занятий</p>
                                )}
                              </div>
                              {lessonsTracked && totalClasses > 0 ? (
                                <>
                                  <Progress value={progressPercent} className="h-2 bg-[#133C2A]/10" />
                                  <div className="mt-1 flex items-center justify-between text-[11px] text-[#133C2A]/60">
                                    <span>Посещено: {attendedClasses}</span>
                                    <span>{progressPercent}%</span>
                                  </div>
                                </>
                              ) : (
                                <div className="text-[11px] text-[#133C2A]/60">
                                  Для этого абонемента посещения не ограничены по количеству занятий.
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-[#133C2A]/60">
                              <span className="flex items-center gap-1">
                                <CreditCard className="w-3 h-3" />
                                Метод: {child.paymentMethod === 'cash' ? 'Наличные' : child.paymentMethod === 'online' ? 'Онлайн' : '—'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Последний платеж: {formatRuDate(child.latestPayment?.paidAt || child.latestPayment?.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
          {selectedChild && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#133C2A] flex items-center gap-3 min-w-0 pr-8">
                  <Avatar className="w-12 h-12 border-2 border-[#D4AF37]/20">
                    <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white">
                      {childInitials(selectedChild.fullName || '')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 truncate">{selectedChild.fullName}</span>
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="w-full rounded-2xl bg-[#F8F4E3] p-1 overflow-x-auto whitespace-nowrap">
                  <TabsTrigger value="overview" className="rounded-xl min-w-[120px]">Обзор</TabsTrigger>
                  <TabsTrigger value="payments" className="rounded-xl min-w-[120px]">Оплаты</TabsTrigger>
                  <TabsTrigger value="parent" className="rounded-xl min-w-[120px]">Родитель</TabsTrigger>
                  <TabsTrigger value="intake" className="rounded-xl min-w-[120px]">Анкета</TabsTrigger>
                  <TabsTrigger value="profile" className="rounded-xl min-w-[130px]">Внутренняя</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardContent className="p-6 grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-xs text-[#133C2A]/60">Возраст</p>
                        <p className="text-[#133C2A]">{selectedChild.age ?? '—'} лет</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-[#133C2A]/60">Дата рождения</p>
                        <p className="text-[#133C2A]">{formatRuDate(selectedChild.birthDate)}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-[#133C2A]/60">Группа</p>
                        <p className="text-[#133C2A]">{selectedChild.groupName || 'Не назначена'}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-[#133C2A]/60">Абонемент</p>
                        <p className="text-[#133C2A]">
                          {selectedChild.subscriptionName || '—'}
                          {Number(selectedChild.subscriptionAmount || 0) > 0
                            ? ` • ${Number(selectedChild.subscriptionAmount).toLocaleString('ru-RU')} ₽`
                            : ''}
                        </p>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <p className="text-xs text-[#133C2A]/60">Статус оплаты</p>
                        <p className="text-[#133C2A]">
                          {paymentStatusLabels[String(selectedChild.paymentStatus || '')] || (selectedChild.paymentStatus || '—')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payments" className="space-y-4">
                  {selectedChildPayments.length === 0 ? (
                    <Card className="border-[#133C2A]/10"><CardContent className="p-6 text-[#133C2A]/60">Платежей пока нет</CardContent></Card>
                  ) : (
                    selectedChildPayments.map((payment) => (
                      <Card key={payment.id} className="border-[#133C2A]/10">
                        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[#133C2A]">{payment.subscriptionName || selectedChild.subscriptionName || 'Абонемент'}</p>
                            <p className="text-xs text-[#133C2A]/60">
                              Счет: {payment.invoiceNumber || '—'} • Создан: {formatRuDateTime(payment.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[#133C2A] text-lg">{Number(payment.amount || 0).toLocaleString('ru-RU')} ₽</p>
                            <p className="text-xs text-[#133C2A]/60">{paymentStatusLabels[payment.status] || payment.status}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="parent" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardHeader>
                      <CardTitle className="text-sm text-[#133C2A]/60">Контакты плательщика</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-[#D4AF37]" />
                        <div>
                          <p className="text-xs text-[#133C2A]/60">ФИО</p>
                          <p className="text-[#133C2A]">{selectedChild.parentName || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-[#D4AF37]" />
                        <div>
                          <p className="text-xs text-[#133C2A]/60">Телефон</p>
                          <p className="text-[#133C2A]">{selectedChild.parentPhone || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-[#D4AF37]" />
                        <div>
                          <p className="text-xs text-[#133C2A]/60">Доступ в ЛК</p>
                          <p className="text-[#133C2A]">
                            {parentStatusLabels[String(selectedChild.parentAccountStatus || '')] || (selectedChild.parentAccountStatus || '—')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="intake" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardHeader>
                      <CardTitle className="text-sm text-[#133C2A]/60">Первичная анкета с лендинга</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-[#133C2A]/60">Ребенок</p>
                        <p className="text-[#133C2A]">{selectedChild.landingLead?.childFullName || selectedChild.fullName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#133C2A]/60">Дата рождения</p>
                        <p className="text-[#133C2A]">{formatRuDate(selectedChild.landingLead?.childBirthDate || selectedChild.birthDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#133C2A]/60">Источник</p>
                        <p className="text-[#133C2A]">{selectedChild.landingLead?.discoverySource || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#133C2A]/60">Предпочтительный график</p>
                        <p className="text-[#133C2A]">{selectedChild.landingLead?.preferredSchedule || '—'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-[#133C2A]/60">Медицинские ограничения</p>
                        <p className="text-[#133C2A] whitespace-pre-wrap">{selectedChild.landingLead?.medicalRestrictions || '—'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-[#133C2A]/60">Опыт занятий</p>
                        <p className="text-[#133C2A] whitespace-pre-wrap">{selectedChild.landingLead?.previousActivities || '—'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-[#133C2A]/60">Комментарий из анкеты</p>
                        <p className="text-[#133C2A] whitespace-pre-wrap">{selectedChild.landingLead?.comment || '—'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="profile" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardHeader>
                      <CardTitle className="text-sm text-[#133C2A]/60 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                        Внутренние данные (не видны родителю)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-[#133C2A]/60">Экстренный контакт</Label>
                          <Input
                            value={profileDraft.emergencyContactName}
                            onChange={(e) => setProfileDraft((prev) => ({ ...prev, emergencyContactName: e.target.value }))}
                            placeholder="ФИО контактного лица"
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-[#133C2A]/60">Телефон экстренного контакта</Label>
                          <Input
                            value={profileDraft.emergencyContactPhone}
                            onChange={(e) => setProfileDraft((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))}
                            placeholder="+7..."
                            className="rounded-xl"
                          />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-[#133C2A]/60">Канал привлечения</Label>
                          <Input
                            value={profileDraft.sourceChannel}
                            onChange={(e) => setProfileDraft((prev) => ({ ...prev, sourceChannel: e.target.value }))}
                            placeholder="Instagram / рекомендации / сайт"
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-[#133C2A]/60">Теги (через запятую)</Label>
                          <Input
                            value={profileDraft.tagsInput}
                            onChange={(e) => setProfileDraft((prev) => ({ ...prev, tagsInput: e.target.value }))}
                            placeholder="новичок, конкурс, нужен контроль оплаты"
                            className="rounded-xl"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-[#133C2A]/60">Комментарий сотрудника</Label>
                        <Textarea
                          value={profileDraft.internalComment}
                          onChange={(e) => setProfileDraft((prev) => ({ ...prev, internalComment: e.target.value }))}
                          className="rounded-xl min-h-[84px]"
                          placeholder="Внутренний комментарий по клиенту"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-[#133C2A]/60">Медицинские ограничения</Label>
                        <Textarea
                          value={profileDraft.healthNotes}
                          onChange={(e) => setProfileDraft((prev) => ({ ...prev, healthNotes: e.target.value }))}
                          className="rounded-xl min-h-[84px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-[#133C2A]/60">Поведенческие наблюдения</Label>
                        <Textarea
                          value={profileDraft.behavioralNotes}
                          onChange={(e) => setProfileDraft((prev) => ({ ...prev, behavioralNotes: e.target.value }))}
                          className="rounded-xl min-h-[84px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-[#133C2A]/60">Цели ребенка / родителей</Label>
                        <Textarea
                          value={profileDraft.goals}
                          onChange={(e) => setProfileDraft((prev) => ({ ...prev, goals: e.target.value }))}
                          className="rounded-xl min-h-[84px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-[#133C2A]/60">Сильные стороны</Label>
                        <Textarea
                          value={profileDraft.strengths}
                          onChange={(e) => setProfileDraft((prev) => ({ ...prev, strengths: e.target.value }))}
                          className="rounded-xl min-h-[84px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-[#133C2A]/60">Ожидания родителя</Label>
                        <Textarea
                          value={profileDraft.parentExpectations}
                          onChange={(e) => setProfileDraft((prev) => ({ ...prev, parentExpectations: e.target.value }))}
                          className="rounded-xl min-h-[84px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-[#133C2A]/60">Предпочтения по коммуникации</Label>
                        <Textarea
                          value={profileDraft.communicationPreferences}
                          onChange={(e) => setProfileDraft((prev) => ({ ...prev, communicationPreferences: e.target.value }))}
                          className="rounded-xl min-h-[84px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-[#133C2A]/60">Предыдущий опыт</Label>
                        <Textarea
                          value={profileDraft.priorExperience}
                          onChange={(e) => setProfileDraft((prev) => ({ ...prev, priorExperience: e.target.value }))}
                          className="rounded-xl min-h-[84px]"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          onClick={() => void saveSelectedChildProfile()}
                          disabled={isProfileSaving}
                          className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
                        >
                          {isProfileSaving ? 'Сохраняем...' : 'Сохранить внутреннюю карточку'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AddStudentDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        groups={ownerGroups}
        parents={parentOptions}
        subscriptions={subscriptions}
        onStudentCreated={() => {
          void refreshChildren();
        }}
      />
    </div>
  );
}
