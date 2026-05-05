import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, RefreshCw, Search, Send, SlidersHorizontal, TimerReset } from 'lucide-react';
import {
  AdminPaymentRecord,
  confirmCashPayment,
  createAdminInvoice,
  loadAdminClients,
  loadAdminPayments,
  loadPaymentJournal,
  runAdminPaymentReminders,
  sendAdminPaymentReminder,
  updateAdminPaymentStatus,
} from '../../lib/backendApi';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  OwnerPaymentsMethodFilter,
  OwnerPaymentsNavigationContext,
  OwnerPaymentsStatusFilter,
} from './paymentsNavigation';

type StatusFilter = OwnerPaymentsStatusFilter;
type MethodFilter = OwnerPaymentsMethodFilter;

const statusLabel: Record<string, string> = {
  unpaid: 'Не оплачено',
  pending: 'Ожидает',
  paid: 'Оплачено',
  failed: 'Ошибка',
  refunded: 'Возврат',
  overdue: 'Просрочено',
  cancelled: 'Отменено',
  expired: 'Истекло',
};

const statusUpdateOptions: Array<{ value: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled' | 'overdue'; label: string }> = [
  { value: 'unpaid', label: 'Не оплачено' },
  { value: 'pending', label: 'Ожидает' },
  { value: 'paid', label: 'Оплачено' },
  { value: 'overdue', label: 'Просрочено' },
  { value: 'failed', label: 'Ошибка' },
  { value: 'cancelled', label: 'Отменено' },
  { value: 'refunded', label: 'Возврат' },
];

const isOutstanding = (status: string) => ['unpaid', 'pending', 'failed', 'overdue'].includes(status);

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

interface OwnerPaymentsJournalPanelProps {
  navigationContext?: OwnerPaymentsNavigationContext;
  onNavigationContextApplied?: () => void;
}

export function OwnerPaymentsJournalPanel({
  navigationContext,
  onNavigationContextApplied,
}: OwnerPaymentsJournalPanelProps) {
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [journal, setJournal] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyOutstanding, setShowOnlyOutstanding] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [activeContextLabel, setActiveContextLabel] = useState<string | null>(null);
  const [appliedRequestId, setAppliedRequestId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [statusDraftById, setStatusDraftById] = useState<Record<string, string>>({});

  const [invoiceClientId, setInvoiceClientId] = useState<string>('');
  const [invoiceMethod, setInvoiceMethod] = useState<'cash' | 'online'>('online');
  const [invoiceAmount, setInvoiceAmount] = useState<string>('');
  const [invoiceDueDate, setInvoiceDueDate] = useState<string>('');
  const [invoiceComment, setInvoiceComment] = useState<string>('');
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isRunningReminders, setIsRunningReminders] = useState(false);
  const [isSendingReminderId, setIsSendingReminderId] = useState<string | null>(null);
  const [isUpdatingStatusId, setIsUpdatingStatusId] = useState<string | null>(null);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [bulkStatusDraft, setBulkStatusDraft] = useState<string>('pending');

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [paymentRows, journalRows, clientRows] = await Promise.all([
        loadAdminPayments(statusFilter === 'all' ? undefined : statusFilter, methodFilter === 'all' ? undefined : methodFilter),
        loadPaymentJournal(),
        loadAdminClients(),
      ]);
      setPayments(paymentRows);
      setJournal(journalRows);
      setClients(clientRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить платежи');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [statusFilter, methodFilter]);

  useEffect(() => {
    if (!navigationContext) return;
    if (appliedRequestId === navigationContext.requestId) return;

    if (typeof navigationContext.searchQuery === 'string') {
      setSearchQuery(navigationContext.searchQuery);
    }
    if (navigationContext.statusFilter) {
      setStatusFilter(navigationContext.statusFilter);
    }
    if (navigationContext.methodFilter) {
      setMethodFilter(navigationContext.methodFilter);
    }
    if (typeof navigationContext.showOnlyOutstanding === 'boolean') {
      setShowOnlyOutstanding(navigationContext.showOnlyOutstanding);
    }
    if (navigationContext.invoiceClientId) {
      setInvoiceClientId(navigationContext.invoiceClientId);
    }
    if (navigationContext.statusFilter || navigationContext.methodFilter) {
      setIsFiltersOpen(true);
    }

    setActiveContextLabel(navigationContext.sourceLabel || 'Фокус из другого раздела');
    setAppliedRequestId(navigationContext.requestId);
    onNavigationContextApplied?.();
  }, [navigationContext, appliedRequestId, onNavigationContextApplied]);

  const stats = useMemo(() => {
    const paid = payments.filter((item) => item.status === 'paid');
    const outstanding = payments.filter((item) => isOutstanding(item.status));
    const overdue = payments.filter((item) => item.status === 'overdue');
    return {
      total: payments.length,
      paid: paid.length,
      outstanding: outstanding.length,
      overdue: overdue.length,
      paidAmount: paid.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    };
  }, [payments]);

  const visiblePayments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesQuery =
        !query ||
        [
          payment.parentName || '',
          payment.parentPhone || '',
          payment.childName || '',
          payment.subscriptionName || '',
          payment.invoiceNumber || '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);
      const matchesOutstanding = !showOnlyOutstanding || isOutstanding(payment.status);
      return matchesQuery && matchesOutstanding;
    });
  }, [payments, searchQuery, showOnlyOutstanding]);

  const visiblePaymentIds = useMemo(() => visiblePayments.map((payment) => payment.id), [visiblePayments]);
  const selectedVisibleCount = useMemo(
    () => selectedPaymentIds.filter((id) => visiblePaymentIds.includes(id)).length,
    [selectedPaymentIds, visiblePaymentIds],
  );
  const isAllVisibleSelected = visiblePaymentIds.length > 0 && selectedVisibleCount === visiblePaymentIds.length;
  const selectedPayments = useMemo(
    () => visiblePayments.filter((payment) => selectedPaymentIds.includes(payment.id)),
    [visiblePayments, selectedPaymentIds],
  );
  const selectedOutstandingPayments = useMemo(
    () => selectedPayments.filter((payment) => isOutstanding(payment.status)),
    [selectedPayments],
  );
  const selectedCashPendingPayments = useMemo(
    () => selectedPayments.filter((payment) => payment.paymentMethod === 'cash' && payment.status !== 'paid'),
    [selectedPayments],
  );

  const togglePaymentSelection = (paymentId: string, checked: boolean) => {
    setSelectedPaymentIds((prev) => {
      if (checked) {
        if (prev.includes(paymentId)) return prev;
        return [...prev, paymentId];
      }
      return prev.filter((id) => id !== paymentId);
    });
  };

  const toggleAllVisibleSelection = (checked: boolean) => {
    setSelectedPaymentIds((prev) => {
      if (!checked) {
        return prev.filter((id) => !visiblePaymentIds.includes(id));
      }
      const merged = new Set(prev);
      visiblePaymentIds.forEach((id) => merged.add(id));
      return Array.from(merged);
    });
  };

  const confirmCash = async (payment: AdminPaymentRecord) => {
    if (payment.paymentMethod !== 'cash') return;
    setConfirmingId(String(payment.id));
    try {
      await confirmCashPayment(String(payment.id), {
        paid_amount: Number(payment.amount || 0),
        comment: 'Подтверждено владельцем',
      });
      toast.success('Наличный платеж подтвержден');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось подтвердить оплату');
    } finally {
      setConfirmingId(null);
    }
  };

  const submitInvoice = async () => {
    if (!invoiceClientId) {
      toast.error('Выберите клиента');
      return;
    }
    setIsCreatingInvoice(true);
    try {
      const amountValue = invoiceAmount.trim() ? Number(invoiceAmount) : undefined;
      if (amountValue !== undefined && (!Number.isFinite(amountValue) || amountValue <= 0)) {
        toast.error('Сумма должна быть больше 0');
        return;
      }
      await createAdminInvoice({
        client_id: invoiceClientId,
        payment_method: invoiceMethod,
        amount: amountValue,
        due_date: invoiceDueDate || undefined,
        comment: invoiceComment.trim() || undefined,
      });
      toast.success('Счет выставлен');
      setInvoiceAmount('');
      setInvoiceComment('');
      setInvoiceDueDate('');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось выставить счет');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const runReminders = async () => {
    setIsRunningReminders(true);
    try {
      const result = await runAdminPaymentReminders();
      toast.success(`Напоминания отправлены: ${result.processed}`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось запустить напоминания');
    } finally {
      setIsRunningReminders(false);
    }
  };

  const sendReminder = async (payment: AdminPaymentRecord) => {
    setIsSendingReminderId(payment.id);
    try {
      await sendAdminPaymentReminder(payment.id);
      toast.success('Напоминание отправлено');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось отправить напоминание');
    } finally {
      setIsSendingReminderId(null);
    }
  };

  const applyStatus = async (payment: AdminPaymentRecord) => {
    const nextStatus = statusDraftById[payment.id];
    if (!nextStatus || nextStatus === payment.status) {
      return;
    }
    setIsUpdatingStatusId(payment.id);
    try {
      const statusValue = nextStatus as 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled' | 'overdue';
      await updateAdminPaymentStatus(payment.id, { status: statusValue });
      toast.success('Статус обновлен');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить статус');
    } finally {
      setIsUpdatingStatusId(null);
    }
  };

  const runBulkReminder = async () => {
    if (selectedOutstandingPayments.length === 0) {
      toast.error('Выберите проблемные платежи для напоминания');
      return;
    }
    setIsRunningReminders(true);
    try {
      await Promise.all(selectedOutstandingPayments.map((payment) => sendAdminPaymentReminder(payment.id)));
      toast.success(`Напоминания отправлены: ${selectedOutstandingPayments.length}`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось отправить часть напоминаний');
    } finally {
      setIsRunningReminders(false);
    }
  };

  const runBulkCashConfirm = async () => {
    if (selectedCashPendingPayments.length === 0) {
      toast.error('Выберите наличные платежи для подтверждения');
      return;
    }
    setConfirmingId('bulk');
    try {
      await Promise.all(
        selectedCashPendingPayments.map((payment) =>
          confirmCashPayment(payment.id, {
            paid_amount: Number(payment.amount || 0),
            comment: 'Подтверждено владельцем (массово)',
          }),
        ),
      );
      toast.success(`Подтверждено оплат: ${selectedCashPendingPayments.length}`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось подтвердить часть оплат');
    } finally {
      setConfirmingId(null);
    }
  };

  const runBulkStatusUpdate = async () => {
    const statusValue = bulkStatusDraft as 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled' | 'overdue';
    const candidates = selectedPayments.filter((payment) => payment.status !== statusValue);
    if (candidates.length === 0) {
      toast.error('Нет выбранных платежей для смены статуса');
      return;
    }
    setIsUpdatingStatusId('bulk');
    try {
      await Promise.all(candidates.map((payment) => updateAdminPaymentStatus(payment.id, { status: statusValue })));
      toast.success(`Статус обновлен у ${candidates.length} платежей`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить часть платежей');
    } finally {
      setIsUpdatingStatusId(null);
    }
  };

  const clearFocus = () => {
    setActiveContextLabel(null);
    setSearchQuery('');
    setShowOnlyOutstanding(false);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Платежи и счета</h1>
          <p className="text-[#133C2A]/60">Выставление счетов, контроль оплат и напоминания</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
          <Button variant="outline" className="rounded-2xl" onClick={() => void runReminders()} disabled={isRunningReminders}>
            <TimerReset className="w-4 h-4 mr-2" />
            {isRunningReminders ? 'Проверяем...' : 'Запустить напоминания'}
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={() => void refresh()} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-5"><p className="text-xs text-[#133C2A]/60 md:text-sm">Всего счетов</p><p className="text-2xl text-[#133C2A] md:text-3xl">{stats.total}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-5"><p className="text-xs text-[#133C2A]/60 md:text-sm">Оплачено</p><p className="text-2xl text-[#133C2A] md:text-3xl">{stats.paid}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-5"><p className="text-xs text-[#133C2A]/60 md:text-sm">Открытые</p><p className="text-2xl text-[#133C2A] md:text-3xl">{stats.outstanding}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-5"><p className="text-xs text-[#133C2A]/60 md:text-sm">Просроченные</p><p className="text-2xl text-[#D14343] md:text-3xl">{stats.overdue}</p></CardContent></Card>
        <Card className="border-none soft-shadow col-span-2 md:col-span-1"><CardContent className="p-3 md:p-5"><p className="text-xs text-[#133C2A]/60 md:text-sm">Сумма оплат</p><p className="text-xl text-[#133C2A] md:text-3xl">{stats.paidAmount.toLocaleString('ru-RU')} ₽</p></CardContent></Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#133C2A]">Выставить счет</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <Select value={invoiceClientId} onValueChange={setInvoiceClientId}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Клиент" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.childFullName || 'Ученик'} • {client.parentPhone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={invoiceMethod} onValueChange={(v: 'cash' | 'online') => setInvoiceMethod(v)}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="online">Онлайн</SelectItem>
              <SelectItem value="cash">Наличные</SelectItem>
            </SelectContent>
          </Select>
          <Input
            className="rounded-xl"
            placeholder="Сумма (опционально)"
            value={invoiceAmount}
            onChange={(event) => setInvoiceAmount(event.target.value)}
          />
          <Input
            className="rounded-xl"
            type="date"
            value={invoiceDueDate}
            onChange={(event) => setInvoiceDueDate(event.target.value)}
          />
          <Button
            className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]"
            onClick={() => void submitInvoice()}
            disabled={isCreatingInvoice}
          >
            {isCreatingInvoice ? 'Создаем...' : 'Выставить счет'}
          </Button>
          <Input
            className="rounded-xl md:col-span-5"
            placeholder="Комментарий к счету (опционально)"
            value={invoiceComment}
            onChange={(event) => setInvoiceComment(event.target.value)}
          />
        </CardContent>
      </Card>

      <Card className="border-none soft-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#133C2A] flex items-center gap-2"><CreditCard className="w-5 h-5 text-[#D4AF37]" />Платежи</CardTitle>
          <div className="grid gap-2">
            {activeContextLabel && (
              <div className="rounded-xl border border-[#D4AF37]/35 bg-[#FFF9E8] px-3 py-2 text-sm text-[#8B6B00] flex items-center justify-between gap-2">
                <span>{activeContextLabel}</span>
                <Button type="button" size="sm" variant="outline" className="rounded-lg h-7" onClick={clearFocus}>
                  Сбросить фокус
                </Button>
              </div>
            )}
            <div className="flex flex-col gap-2 md:flex-row">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#133C2A]/45" />
                <Input
                  className="rounded-xl pl-9"
                  placeholder="Поиск по родителю, ученику, счету"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <Button
                type="button"
                variant={showOnlyOutstanding ? 'default' : 'outline'}
                className={showOnlyOutstanding ? 'rounded-xl bg-[#133C2A]' : 'rounded-xl'}
                onClick={() => setShowOnlyOutstanding((prev) => !prev)}
              >
                Только проблемные
              </Button>
              <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="md:w-auto">
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="outline" className="rounded-xl">
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    Фильтры
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="grid md:grid-cols-2 gap-2">
                    <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все статусы</SelectItem>
                        <SelectItem value="unpaid">Не оплачено</SelectItem>
                        <SelectItem value="pending">Ожидает</SelectItem>
                        <SelectItem value="overdue">Просрочено</SelectItem>
                        <SelectItem value="paid">Оплачено</SelectItem>
                        <SelectItem value="failed">Ошибка</SelectItem>
                        <SelectItem value="cancelled">Отменено</SelectItem>
                        <SelectItem value="refunded">Возврат</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={methodFilter} onValueChange={(value: MethodFilter) => setMethodFilter(value)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все методы</SelectItem>
                        <SelectItem value="cash">Наличные</SelectItem>
                        <SelectItem value="online">Онлайн</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
            <div className="mobile-scroll-x rounded-xl border border-[#133C2A]/10 bg-[#F8F4E3]/40 px-3 py-2 md:flex md:flex-wrap md:items-center md:overflow-visible md:pb-2">
              <div className="flex items-center gap-2 min-w-[200px]">
                <Checkbox checked={isAllVisibleSelected} onCheckedChange={(checked) => toggleAllVisibleSelection(Boolean(checked))} />
                <span className="text-xs text-[#133C2A]/70">Выбрано: {selectedVisibleCount} из {visiblePayments.length}</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={selectedOutstandingPayments.length === 0 || isRunningReminders}
                onClick={() => void runBulkReminder()}
              >
                Напомнить выбранным
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={selectedCashPendingPayments.length === 0 || confirmingId === 'bulk'}
                onClick={() => void runBulkCashConfirm()}
              >
                Подтвердить наличные
              </Button>
              <Select value={bulkStatusDraft} onValueChange={setBulkStatusDraft}>
                <SelectTrigger className="w-[170px] rounded-xl h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusUpdateOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={selectedPayments.length === 0 || isUpdatingStatusId === 'bulk'}
                onClick={() => void runBulkStatusUpdate()}
              >
                Применить статус к выбранным
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-[#133C2A]/60">Загрузка...</p>
          ) : visiblePayments.length === 0 ? (
            <p className="text-[#133C2A]/60">Платежей пока нет</p>
          ) : (
            visiblePayments.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-[#133C2A]/10 p-3 md:p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedPaymentIds.includes(payment.id)}
                      onCheckedChange={(checked) => togglePaymentSelection(payment.id, Boolean(checked))}
                      className="mt-1"
                    />
                    <div className="space-y-1">
                    <p className="text-[#133C2A]">{payment.subscriptionName || 'Абонемент'}</p>
                    <p className="text-sm text-[#133C2A]/70">
                      {payment.parentName || payment.parentPhone || '—'}
                      {payment.childName ? ` • ${payment.childName}` : ''}
                    </p>
                    <p className="text-xs text-[#133C2A]/55">
                      Счет: {payment.invoiceNumber || '—'} • Создан: {formatDateTime(payment.createdAt)}
                    </p>
                    <p className="text-xs text-[#133C2A]/55">
                      Дедлайн: {formatDate(payment.dueDate)} • Напоминаний: {payment.reminderCount || 0}
                    </p>
                    </div>
                  </div>
                  <div className="w-full text-left sm:w-auto sm:text-right">
                    <p className="text-xl text-[#133C2A]">{Number(payment.amount || 0).toLocaleString('ru-RU')} ₽</p>
                    <Badge variant="outline" className="rounded-xl mt-1">{statusLabel[payment.status] || payment.status}</Badge>
                    <p className="text-xs text-[#133C2A]/55 mt-1">{payment.paymentMethod === 'cash' ? 'Наличные' : 'Онлайн'}</p>
                    {payment.lastReminderAt && (
                      <p className="text-xs text-[#133C2A]/55 mt-1">Последнее: {formatDateTime(payment.lastReminderAt)}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                  {payment.paymentMethod === 'cash' && payment.status !== 'paid' ? (
                    <Button
                      size="sm"
                      onClick={() => void confirmCash(payment)}
                      disabled={confirmingId === payment.id}
                      className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {confirmingId === payment.id ? 'Подтверждаем...' : 'Подтвердить оплату'}
                    </Button>
                  ) : null}
                  {isOutstanding(payment.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      disabled={isSendingReminderId === payment.id}
                      onClick={() => void sendReminder(payment)}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {isSendingReminderId === payment.id ? 'Отправляем...' : 'Напомнить'}
                    </Button>
                  )}
                  <Select
                    value={statusDraftById[payment.id] || payment.status}
                    onValueChange={(value) => setStatusDraftById((prev) => ({ ...prev, [payment.id]: value }))}
                  >
                    <SelectTrigger className="w-full rounded-xl sm:w-[190px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusUpdateOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    disabled={isUpdatingStatusId === payment.id}
                    onClick={() => void applyStatus(payment)}
                  >
                    Применить статус
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Журнал событий оплат</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-[#133C2A]/60">Загрузка...</p>
          ) : journal.length === 0 ? (
            <p className="text-[#133C2A]/60">Журнал пуст</p>
          ) : (
            journal.slice(0, 50).map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-[#133C2A]/10 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-[#133C2A]">{entry.eventType}</p>
                  <p className="text-xs text-[#133C2A]/55">{formatDateTime(entry.createdAt)}</p>
                </div>
                <p className="text-sm text-[#133C2A]/70 mt-1">Платеж: {entry.paymentId} • Статус: {entry.newStatus}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
