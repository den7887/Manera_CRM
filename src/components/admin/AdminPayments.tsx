import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, RefreshCw, Search, SlidersHorizontal, TimerReset } from 'lucide-react';
import {
  AdminPaymentRecord,
  confirmCashPayment,
  createAdminInvoice,
  loadAdminClients,
  loadAdminPayments,
  runAdminPaymentReminders,
  sendAdminPaymentReminder,
  updateAdminPaymentStatus,
} from '../../lib/backendApi';
import { toast } from 'sonner';
import { EmptyState } from '../EmptyState';
import { PaymentCard } from '../payments/PaymentCard';
import { isOutstandingPaymentStatus } from '../payments/PaymentStatusBadge';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type AdminPaymentQueue = 'review' | 'waiting' | 'overdue' | 'paid' | 'problem' | 'all';
type AdminPaymentStatus = 'all' | 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | 'overdue' | 'cancelled' | 'expired';
type AdminPaymentMethod = 'all' | 'cash' | 'online';

export interface AdminPaymentsNavigationContext {
  requestId: number;
  searchQuery?: string;
  queue?: AdminPaymentQueue;
  sourceLabel?: string;
  invoiceClientId?: string;
}

const queueMeta: Array<{ id: AdminPaymentQueue; label: string }> = [
  { id: 'review', label: 'На проверке' },
  { id: 'waiting', label: 'Ожидают оплаты' },
  { id: 'overdue', label: 'Просрочены' },
  { id: 'paid', label: 'Оплачены' },
  { id: 'problem', label: 'Проблемные' },
  { id: 'all', label: 'Все' },
];

const statusOptions: Array<{ value: Exclude<AdminPaymentStatus, 'all'>; label: string }> = [
  { value: 'pending', label: 'На проверке' },
  { value: 'unpaid', label: 'Ожидает оплату' },
  { value: 'overdue', label: 'Просрочено' },
  { value: 'paid', label: 'Оплачено' },
  { value: 'failed', label: 'Ошибка' },
  { value: 'cancelled', label: 'Отменено' },
  { value: 'refunded', label: 'Возврат' },
  { value: 'expired', label: 'Истекло' },
];

function amountLabel(value: number): string {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

function queueMatches(payment: AdminPaymentRecord, queue: AdminPaymentQueue): boolean {
  if (queue === 'review') return payment.status === 'pending';
  if (queue === 'waiting') return payment.status === 'unpaid';
  if (queue === 'overdue') return payment.status === 'overdue';
  if (queue === 'paid') return payment.status === 'paid';
  if (queue === 'problem') return ['failed', 'cancelled', 'refunded', 'expired'].includes(payment.status);
  return true;
}

export function AdminPayments({
  navigationContext,
  onNavigationContextApplied,
  onOpenClient,
}: {
  navigationContext?: AdminPaymentsNavigationContext;
  onNavigationContextApplied?: () => void;
  onOpenClient?: (payment: AdminPaymentRecord) => void;
}) {
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; childFullName?: string | null; parentPhone: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [queue, setQueue] = useState<AdminPaymentQueue>('review');
  const [statusFilter, setStatusFilter] = useState<AdminPaymentStatus>('all');
  const [methodFilter, setMethodFilter] = useState<AdminPaymentMethod>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [invoiceClientId, setInvoiceClientId] = useState('');
  const [invoiceMethod, setInvoiceMethod] = useState<'cash' | 'online'>('online');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [invoiceComment, setInvoiceComment] = useState('');
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isRunningReminders, setIsRunningReminders] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusDraftById, setStatusDraftById] = useState<Record<string, AdminPaymentStatus>>({});
  const [appliedContextId, setAppliedContextId] = useState<number | null>(null);
  const [activeContextLabel, setActiveContextLabel] = useState<string | null>(null);

  const refresh = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const [paymentRows, clientRows] = await Promise.all([
        loadAdminPayments(statusFilter === 'all' ? undefined : statusFilter, methodFilter === 'all' ? undefined : methodFilter),
        loadAdminClients(),
      ]);
      setPayments(paymentRows);
      setClients(clientRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить оплаты');
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
  }, [statusFilter, methodFilter]);

  useEffect(() => {
    if (!navigationContext) return;
    if (appliedContextId === navigationContext.requestId) return;

    if (navigationContext.searchQuery !== undefined) {
      setSearchQuery(navigationContext.searchQuery);
    }
    if (navigationContext.queue) {
      setQueue(navigationContext.queue);
    }
    if (navigationContext.invoiceClientId) {
      setInvoiceClientId(navigationContext.invoiceClientId);
    }
    setActiveContextLabel(navigationContext.sourceLabel || 'Фокус из другого раздела');
    setAppliedContextId(navigationContext.requestId);
    onNavigationContextApplied?.();
  }, [navigationContext, appliedContextId, onNavigationContextApplied]);

  const stats = useMemo(() => {
    const review = payments.filter((payment) => payment.status === 'pending');
    const waiting = payments.filter((payment) => payment.status === 'unpaid');
    const overdue = payments.filter((payment) => payment.status === 'overdue');
    const paid = payments.filter((payment) => payment.status === 'paid');
    const problem = payments.filter((payment) => ['failed', 'cancelled', 'refunded', 'expired'].includes(payment.status));
    return {
      reviewCount: review.length,
      waitingCount: waiting.length,
      overdueCount: overdue.length,
      paidCount: paid.length,
      problemCount: problem.length,
      waitingAmount: [...review, ...waiting, ...overdue].reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      paidAmount: paid.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    };
  }, [payments]);

  const visiblePayments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return payments
      .filter((payment) => queueMatches(payment, queue))
      .filter((payment) => {
        if (!query) return true;
        return [
          payment.parentName || '',
          payment.parentPhone || '',
          payment.childName || '',
          payment.subscriptionName || '',
          payment.invoiceNumber || '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }, [payments, queue, searchQuery]);

  const submitInvoice = async () => {
    if (!invoiceClientId) {
      toast.error('Выберите клиента для счета');
      return;
    }

    const parsedAmount = invoiceAmount.trim() ? Number(invoiceAmount) : undefined;
    if (parsedAmount !== undefined && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
      toast.error('Сумма должна быть больше нуля');
      return;
    }

    setIsCreatingInvoice(true);
    try {
      await createAdminInvoice({
        client_id: invoiceClientId,
        payment_method: invoiceMethod,
        amount: parsedAmount,
        due_date: invoiceDueDate || undefined,
        comment: invoiceComment.trim() || undefined,
      });
      toast.success('Счет выставлен');
      setInvoiceAmount('');
      setInvoiceComment('');
      setInvoiceDueDate('');
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось выставить счет');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const confirmCash = async (payment: AdminPaymentRecord) => {
    setConfirmingId(payment.id);
    try {
      await confirmCashPayment(payment.id, {
        comment: 'Подтверждено администратором',
        paid_amount: Number(payment.amount || 0),
      });
      toast.success('Наличный платеж подтвержден');
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось подтвердить оплату');
    } finally {
      setConfirmingId(null);
    }
  };

  const sendReminder = async (payment: AdminPaymentRecord) => {
    setRemindingId(payment.id);
    try {
      await sendAdminPaymentReminder(payment.id);
      toast.success('Напоминание отправлено');
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось отправить напоминание');
    } finally {
      setRemindingId(null);
    }
  };

  const applyStatus = async (payment: AdminPaymentRecord) => {
    const nextStatus = statusDraftById[payment.id];
    if (!nextStatus || nextStatus === payment.status || nextStatus === 'all') {
      return;
    }
    setUpdatingId(payment.id);
    try {
      await updateAdminPaymentStatus(payment.id, { status: nextStatus });
      toast.success('Статус обновлен');
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить статус');
    } finally {
      setUpdatingId(null);
    }
  };

  const runReminders = async () => {
    setIsRunningReminders(true);
    try {
      const result = await runAdminPaymentReminders();
      toast.success(`Напоминаний отправлено: ${result.processed}`);
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось запустить напоминания');
    } finally {
      setIsRunningReminders(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Оплаты</h1>
          <p className="text-[#133C2A]/60">Очередь проверок, долги родителей и выставление счетов.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
          <Button variant="outline" className="rounded-2xl" onClick={() => void runReminders()} disabled={isRunningReminders}>
            <TimerReset className="mr-2 h-4 w-4" />
            {isRunningReminders ? 'Отправляем...' : 'Напоминания'}
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={() => void refresh(true)} disabled={isRefreshing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {isRefreshing ? 'Обновляем...' : 'Обновить'}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">На проверке</p><p className="mt-1 text-3xl text-[#133C2A]">{stats.reviewCount}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Ожидают оплаты</p><p className="mt-1 text-3xl text-[#133C2A]">{stats.waitingCount}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Просрочены</p><p className="mt-1 text-3xl text-[#D14343]">{stats.overdueCount}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Оплачено</p><p className="mt-1 text-3xl text-[#133C2A]">{stats.paidCount}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Сумма к получению</p><p className="mt-1 text-2xl text-[#133C2A]">{amountLabel(stats.waitingAmount)}</p></CardContent></Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardContent className="p-4 md:p-5">
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="mobile-scroll-x rounded-2xl border border-[#133C2A]/10 bg-[#fbf7e8]/70 p-1">
                <div className="flex min-w-max gap-1">
                  {queueMeta.map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      size="sm"
                      variant={queue === item.id ? 'default' : 'ghost'}
                      className={queue === item.id ? 'rounded-xl bg-[#133C2A]' : 'rounded-xl text-[#133C2A]/68'}
                      onClick={() => setQueue(item.id)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>

              {activeContextLabel ? (
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#D4AF37]/35 bg-[#FFF9E8] px-3 py-2 text-sm text-[#8B6B00]">
                  <span>{activeContextLabel}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl"
                    onClick={() => {
                      setActiveContextLabel(null);
                      setSearchQuery('');
                    }}
                  >
                    Сбросить
                  </Button>
                </div>
              ) : null}

              <div className="flex flex-col gap-2 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#133C2A]/40" />
                  <Input
                    className="rounded-2xl pl-9"
                    placeholder="Поиск по родителю, ребенку, счету"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
                <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="md:w-auto">
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" className="rounded-2xl">
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      Фильтры
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="grid gap-2 md:grid-cols-2">
                      <Select value={statusFilter} onValueChange={(value: AdminPaymentStatus) => setStatusFilter(value)}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все статусы</SelectItem>
                          {statusOptions.map((item) => (
                            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={methodFilter} onValueChange={(value: AdminPaymentMethod) => setMethodFilter(value)}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все способы</SelectItem>
                          <SelectItem value="online">Онлайн</SelectItem>
                          <SelectItem value="cash">Наличные</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#133C2A]/10 bg-white/90 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg text-[#133C2A]">Выставить счет</p>
                  <p className="mt-1 text-sm text-[#133C2A]/58">Рабочий способ быстро отправить новый платеж родителю.</p>
                </div>
                <Badge variant="outline" className="rounded-full">Без смены раздела</Badge>
              </div>
              <div className="mt-4 grid gap-3">
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
                <div className="grid gap-3 md:grid-cols-2">
                  <Select value={invoiceMethod} onValueChange={(value: 'cash' | 'online') => setInvoiceMethod(value)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Онлайн</SelectItem>
                      <SelectItem value="cash">Наличные</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="rounded-xl"
                    placeholder="Сумма, если нужна"
                    value={invoiceAmount}
                    onChange={(event) => setInvoiceAmount(event.target.value)}
                  />
                </div>
                <Input
                  className="rounded-xl"
                  type="date"
                  value={invoiceDueDate}
                  onChange={(event) => setInvoiceDueDate(event.target.value)}
                />
                <Input
                  className="rounded-xl"
                  placeholder="Комментарий к счету"
                  value={invoiceComment}
                  onChange={(event) => setInvoiceComment(event.target.value)}
                />
                <Button
                  className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]"
                  onClick={() => void submitInvoice()}
                  disabled={isCreatingInvoice}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {isCreatingInvoice ? 'Создаем...' : 'Выставить счет'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="border-none soft-shadow">
          <CardContent className="p-8 text-[#133C2A]/60">Загрузка оплат...</CardContent>
        </Card>
      ) : visiblePayments.length === 0 ? (
        <Card className="border-none soft-shadow">
          <CardContent className="p-0">
            <EmptyState
              icon={queue === 'paid' ? CheckCircle2 : queue === 'problem' ? AlertTriangle : CreditCard}
              title={queue === 'paid' ? 'Оплат в этой очереди пока нет' : 'Открытых платежей нет'}
              description={
                queue === 'paid'
                  ? 'Как только оплаты будут подтверждены, они появятся здесь.'
                  : 'Когда родитель оплатит или нажмет “Я уже оплатил”, запись появится в нужной очереди.'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visiblePayments.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              onConfirmCash={payment.paymentMethod === 'cash' && payment.status !== 'paid' ? confirmCash : undefined}
              onSendReminder={isOutstandingPaymentStatus(payment.status) ? sendReminder : undefined}
              onOpenClient={onOpenClient}
              onSetStatus={applyStatus}
              isConfirming={confirmingId === payment.id}
              isReminding={remindingId === payment.id}
              statusControl={
                <Select
                  value={statusDraftById[payment.id] || payment.status}
                  onValueChange={(value: AdminPaymentStatus) => setStatusDraftById((prev) => ({ ...prev, [payment.id]: value }))}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
          ))}
          {updatingId ? <p className="text-sm text-[#133C2A]/50">Обновление статуса...</p> : null}
        </div>
      )}
    </div>
  );
}
