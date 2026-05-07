import { useEffect, useMemo, useState } from 'react';
import { addDays, isSameDay, parseISO } from 'date-fns';
import {
  AdminChildRecord,
  AdminClientRecord,
  AdminPaymentRecord,
  OwnerPricingPlanDto,
  changeAdminPaymentDueDate,
  confirmCashPayment,
  createAdminInvoice,
  createOwnerExpense,
  deleteOwnerExpense,
  loadAdminChildren,
  loadAdminClients,
  loadAdminPayments,
  loadOwnerExpenses,
  loadOwnerFinanceSummary,
  loadOwnerGroups,
  loadOwnerPricing,
  loadPaymentJournal,
  sendAdminPaymentReminder,
  updateAdminPaymentStatus,
} from '../../lib/backendApi';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { Expense, FinanceStats, Group, MonthlyData } from '../../types';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { CreateInvoiceSheet } from './CreateInvoiceSheet';
import { MobileMoneyWorkspace } from './MobileMoneyWorkspace';
import { MoneyFiltersSheet } from './MoneyFiltersSheet';
import { MoneyOverview } from './MoneyOverview';
import { MoneyPayments } from './MoneyPayments';
import { MoneySettings } from './MoneySettings';
import { MoneySubscriptions } from './MoneySubscriptions';
import { PaymentDetailsSheet } from './PaymentDetailsSheet';
import {
  MoneyInvoiceDraft,
  MoneyJournalEntry,
  MoneyOverviewSummary,
  MoneyPaymentFiltersState,
  MoneySubscriptionFilter,
  MoneySubscriptionRecord,
  MoneyTab,
  derivePaymentType,
  deriveSubscriptionRecord,
  formatMoney,
  isOutstandingPayment,
  normalizePaymentSearch,
  normalizeSubscriptionSearch,
  paymentQueueMatches,
  subscriptionQueueMatches,
} from './moneyTypes';
import { OwnerPaymentsNavigationContext } from '../owner/paymentsNavigation';

const defaultPaymentFilters: MoneyPaymentFiltersState = {
  queue: 'all',
  status: 'all',
  method: 'all',
  type: 'all',
  search: '',
};

const defaultInvoiceDraft: MoneyInvoiceDraft = {
  clientId: '',
  paymentMethod: 'online',
  amount: '',
  dueDate: '',
  comment: '',
};

function isToday(value?: string | null): boolean {
  if (!value) return false;
  try {
    return isSameDay(parseISO(value), new Date());
  } catch {
    return false;
  }
}

function deriveOverviewSummary(payments: AdminPaymentRecord[], subscriptions: MoneySubscriptionRecord[]): MoneyOverviewSummary {
  const paidToday = payments.filter((payment) => payment.status === 'paid' && isToday(payment.paidAt || payment.statusUpdatedAt || payment.updatedAt));
  const waiting = payments.filter((payment) => payment.status === 'unpaid');
  const overdue = payments.filter((payment) => payment.status === 'overdue');
  const review = payments.filter((payment) => payment.status === 'pending');
  const endingSoon = subscriptions.filter((subscription) => subscription.status === 'ending_soon');

  return {
    todayPaidAmount: paidToday.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    waitingAmount: waiting.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    overdueAmount: overdue.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    reviewCount: review.length,
    endingSoonCount: endingSoon.length,
    waitingCount: waiting.length,
    overdueCount: overdue.length,
    paidTodayCount: paidToday.length,
  };
}

function mapContextQueue(status?: OwnerPaymentsNavigationContext['statusFilter']): MoneyPaymentFiltersState['queue'] {
  if (status === 'pending') return 'review';
  if (status === 'unpaid') return 'waiting';
  if (status === 'overdue') return 'overdue';
  if (status === 'paid') return 'paid';
  if (status === 'failed' || status === 'cancelled' || status === 'refunded') return 'problem';
  return 'all';
}

export function MoneyWorkspace({
  paymentsNavigationContext,
  onPaymentsNavigationContextApplied,
  onNavigateSection,
}: {
  paymentsNavigationContext?: OwnerPaymentsNavigationContext;
  onPaymentsNavigationContextApplied?: () => void;
  onNavigateSection?: (page: string) => void;
}) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<MoneyTab>('overview');
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [clients, setClients] = useState<AdminClientRecord[]>([]);
  const [children, setChildren] = useState<AdminChildRecord[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pricingPlans, setPricingPlans] = useState<OwnerPricingPlanDto[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [journal, setJournal] = useState<MoneyJournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [paymentFilters, setPaymentFilters] = useState<MoneyPaymentFiltersState>(defaultPaymentFilters);
  const [subscriptionFilter, setSubscriptionFilter] = useState<MoneySubscriptionFilter>('active');
  const [selectedPayment, setSelectedPayment] = useState<AdminPaymentRecord | null>(null);
  const [isPaymentDetailsOpen, setIsPaymentDetailsOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [invoiceDraft, setInvoiceDraft] = useState<MoneyInvoiceDraft>(defaultInvoiceDraft);
  const [isInvoiceSubmitting, setIsInvoiceSubmitting] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [activeContextLabel, setActiveContextLabel] = useState<string | null>(null);
  const [appliedContextId, setAppliedContextId] = useState<number | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    category: 'rent',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    paymentMethod: 'cash' as const,
    recipientName: '',
    notes: '',
  });
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingDuePaymentId, setEditingDuePaymentId] = useState<string | null>(null);

  const refresh = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const [financeSummary, paymentRows, childRows, clientRows, groupRows, planRows, expenseRows, journalRows] = await Promise.all([
        loadOwnerFinanceSummary(),
        loadAdminPayments(),
        loadAdminChildren(),
        loadAdminClients(),
        loadOwnerGroups(),
        loadOwnerPricing(),
        loadOwnerExpenses(),
        loadPaymentJournal(),
      ]);
      setStats(financeSummary.stats);
      setMonthlyData(financeSummary.monthlyData);
      setPayments(paymentRows);
      setChildren(childRows);
      setClients(clientRows);
      setGroups(groupRows);
      setPricingPlans(planRows);
      setExpenses(expenseRows);
      setJournal(journalRows as MoneyJournalEntry[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить раздел денег');
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
    if (!paymentsNavigationContext) return;
    if (appliedContextId === paymentsNavigationContext.requestId) return;

    setAppliedContextId(paymentsNavigationContext.requestId);
    setActiveTab('payments');
    setActiveContextLabel(paymentsNavigationContext.sourceLabel || 'Фокус из карточки клиента');
    setPaymentFilters((prev) => ({
      ...prev,
      queue: mapContextQueue(paymentsNavigationContext.statusFilter),
      status: paymentsNavigationContext.statusFilter || prev.status,
      method: paymentsNavigationContext.methodFilter || prev.method,
      search: paymentsNavigationContext.searchQuery || prev.search,
    }));
    if (paymentsNavigationContext.invoiceClientId) {
      setInvoiceDraft((prev) => ({ ...prev, clientId: paymentsNavigationContext.invoiceClientId || '' }));
      setIsCreateInvoiceOpen(true);
    }
    onPaymentsNavigationContextApplied?.();
  }, [paymentsNavigationContext, appliedContextId, onPaymentsNavigationContextApplied]);

  const subscriptions = useMemo<MoneySubscriptionRecord[]>(
    () =>
      children
        .map((child) => deriveSubscriptionRecord(child, groups, pricingPlans))
        .filter((value): value is MoneySubscriptionRecord => value !== null)
        .sort((left, right) => right.childName.localeCompare(left.childName)),
    [children, groups, pricingPlans],
  );

  const overviewSummary = useMemo(() => deriveOverviewSummary(payments, subscriptions), [payments, subscriptions]);

  const trialUnpaidCount = useMemo(
    () => payments.filter((payment) => derivePaymentType(payment) === 'trial' && isOutstandingPayment(payment.status)).length,
    [payments],
  );
  const subscriptionWithoutPaymentCount = useMemo(
    () => subscriptions.filter((subscription) => subscription.status === 'payment_required').length,
    [subscriptions],
  );

  const visiblePayments = useMemo(() => {
    const query = paymentFilters.search.trim().toLowerCase();
    return payments
      .filter((payment) => paymentQueueMatches(payment, paymentFilters.queue))
      .filter((payment) => paymentFilters.status === 'all' || payment.status === paymentFilters.status)
      .filter((payment) => paymentFilters.method === 'all' || payment.paymentMethod === paymentFilters.method)
      .filter((payment) => paymentFilters.type === 'all' || derivePaymentType(payment) === paymentFilters.type)
      .filter((payment) => !query || normalizePaymentSearch(payment).includes(query))
      .sort((left, right) => new Date(right.updatedAt || right.createdAt).getTime() - new Date(left.updatedAt || left.createdAt).getTime());
  }, [payments, paymentFilters]);

  const visibleSubscriptions = useMemo(() => {
    const query = paymentFilters.search.trim().toLowerCase();
    return subscriptions
      .filter((subscription) => subscriptionQueueMatches(subscription, subscriptionFilter))
      .filter((subscription) => !query || normalizeSubscriptionSearch(subscription).includes(query))
      .sort((left, right) => left.childName.localeCompare(right.childName));
  }, [subscriptions, subscriptionFilter, paymentFilters.search]);

  const recentEvents = useMemo(() => journal.slice(0, 5), [journal]);
  const selectedPaymentEvents = useMemo(
    () => journal.filter((entry) => entry.paymentId === selectedPayment?.id),
    [journal, selectedPayment],
  );

  const openPayment = (payment: AdminPaymentRecord) => {
    setSelectedPayment(payment);
    setIsPaymentDetailsOpen(true);
  };

  const openPaymentQueue = (queue: MoneyPaymentFiltersState['queue'], extra?: Partial<MoneyPaymentFiltersState>) => {
    setActiveTab('payments');
    setPaymentFilters((prev) => ({ ...prev, queue, ...extra }));
  };

  const openSubscriptionsQueue = (filter: MoneySubscriptionFilter) => {
    setActiveTab('subscriptions');
    setSubscriptionFilter(filter);
  };

  const submitInvoice = async () => {
    if (!invoiceDraft.clientId) {
      toast.error('Выберите клиента для счета');
      return;
    }
    setIsInvoiceSubmitting(true);
    try {
      const parsedAmount = invoiceDraft.amount.trim() ? Number(invoiceDraft.amount) : undefined;
      await createAdminInvoice({
        client_id: invoiceDraft.clientId,
        payment_method: invoiceDraft.paymentMethod,
        amount: parsedAmount,
        due_date: invoiceDraft.dueDate || undefined,
        comment: invoiceDraft.comment.trim() || undefined,
      });
      toast.success('Счет создан');
      setIsCreateInvoiceOpen(false);
      setInvoiceDraft(defaultInvoiceDraft);
      await refresh(true);
      setActiveTab('payments');
      setPaymentFilters((prev) => ({ ...prev, queue: 'waiting' }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать счет');
    } finally {
      setIsInvoiceSubmitting(false);
    }
  };

  const remindPayment = async (payment: AdminPaymentRecord) => {
    try {
      await sendAdminPaymentReminder(payment.id);
      toast.success('Напоминание отправлено');
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось отправить напоминание');
    }
  };

  const confirmPayment = async (payment: AdminPaymentRecord) => {
    try {
      await updateAdminPaymentStatus(payment.id, { status: 'paid' });
      toast.success('Платеж подтвержден');
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось подтвердить платеж');
    }
  };

  const cancelPayment = async (payment: AdminPaymentRecord) => {
    try {
      await updateAdminPaymentStatus(payment.id, { status: 'cancelled' });
      toast.success('Счет отменен');
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось отменить счет');
    }
  };

  const markCashPaid = async (payment: AdminPaymentRecord) => {
    try {
      await confirmCashPayment(payment.id, { comment: 'Подтверждено из раздела Деньги', paid_amount: Number(payment.amount || 0) });
      toast.success('Наличный платеж подтвержден');
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось подтвердить наличный платеж');
    }
  };

  const changeDueDate = async (payment: AdminPaymentRecord) => {
    if (editingDuePaymentId === payment.id) return;
    const nextDueDate = window.prompt('Новый срок оплаты (YYYY-MM-DD)', payment.dueDate ? payment.dueDate.slice(0, 10) : '');
    if (!nextDueDate) return;
    setEditingDuePaymentId(payment.id);
    try {
      await changeAdminPaymentDueDate(payment.id, { due_date: nextDueDate });
      toast.success('Срок оплаты обновлен');
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить срок оплаты');
    } finally {
      setEditingDuePaymentId(null);
    }
  };

  const addExpense = async () => {
    const amount = Number(expenseForm.amount);
    if (!expenseForm.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Заполните описание и корректную сумму');
      return;
    }
    setIsAddingExpense(true);
    try {
      await createOwnerExpense({
        category: expenseForm.category,
        amount,
        date: expenseForm.date,
        description: expenseForm.description.trim(),
        payment_method: expenseForm.paymentMethod,
        recipient_name: expenseForm.recipientName.trim() || undefined,
        notes: expenseForm.notes.trim() || undefined,
      });
      toast.success('Расход добавлен');
      setExpenseForm((prev) => ({
        ...prev,
        amount: '',
        description: '',
        recipientName: '',
        notes: '',
      }));
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить расход');
    } finally {
      setIsAddingExpense(false);
    }
  };

  const removeExpense = async (expenseId: string) => {
    try {
      await deleteOwnerExpense(expenseId);
      toast.success('Расход удален');
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить расход');
    }
  };

  const openSubscription = (subscription: MoneySubscriptionRecord) => {
    if (subscription.latestPayment) {
      openPayment(subscription.latestPayment);
      return;
    }
    if (subscription.clientId) {
      setInvoiceDraft((prev) => ({ ...prev, clientId: subscription.clientId || '' }));
      setIsCreateInvoiceOpen(true);
    }
  };

  const content = (
    <>
      {activeTab === 'overview' ? (
        <MoneyOverview
          summary={overviewSummary}
          recentEvents={recentEvents}
          trialUnpaidCount={trialUnpaidCount}
          subscriptionWithoutPaymentCount={subscriptionWithoutPaymentCount}
          onOpenReview={() => openPaymentQueue('review')}
          onOpenWaiting={() => openPaymentQueue('waiting')}
          onOpenOverdue={() => openPaymentQueue('overdue')}
          onOpenEndingSoon={() => openSubscriptionsQueue('ending_soon')}
          onOpenTrialUnpaid={() => openPaymentQueue('trial', { type: 'trial' })}
          onOpenSubscriptionIssues={() => openSubscriptionsQueue('payment_required')}
        />
      ) : null}

      {activeTab === 'payments' ? (
        <MoneyPayments
          payments={visiblePayments}
          filters={paymentFilters}
          onChangeFilters={setPaymentFilters}
          onOpenFilters={() => setIsFiltersOpen(true)}
          onCreateInvoice={() => setIsCreateInvoiceOpen(true)}
          onOpenPayment={openPayment}
          onRemind={remindPayment}
          onCopyLink={(payment) => {
            navigator.clipboard.writeText(payment.invoiceNumber || payment.id);
            toast.success('Ссылка/идентификатор скопирован');
          }}
          onConfirm={confirmPayment}
          onCancel={cancelPayment}
          onMarkCash={markCashPaid}
          onChangeDueDate={changeDueDate}
          activeContextLabel={activeContextLabel}
        />
      ) : null}

      {activeTab === 'subscriptions' ? (
        <MoneySubscriptions
          subscriptions={visibleSubscriptions}
          filter={subscriptionFilter}
          onChangeFilter={setSubscriptionFilter}
          onCreateInvoice={() => setIsCreateInvoiceOpen(true)}
          onOpenSubscription={openSubscription}
          onOpenPayments={(subscription) => {
            if (subscription.latestPayment) {
              openPayment(subscription.latestPayment);
            } else if (subscription.clientId) {
              setInvoiceDraft((prev) => ({ ...prev, clientId: subscription.clientId || '' }));
              setIsCreateInvoiceOpen(true);
            }
          }}
        />
      ) : null}

      {activeTab === 'settings' ? (
        <MoneySettings
          pricingPlans={pricingPlans}
          expenses={expenses}
          onOpenPricing={() => onNavigateSection?.('pricing')}
          onAddExpense={() => void addExpense()}
          onDeleteExpense={(expenseId) => void removeExpense(expenseId)}
          isRefreshingExpenses={isRefreshing || isAddingExpense}
          onRefreshExpenses={() => void refresh(true)}
          expenseForm={expenseForm}
          onExpenseFormChange={setExpenseForm}
        />
      ) : null}
    </>
  );

  if (isLoading && !stats) {
    return <div className="rounded-3xl bg-white/80 p-6 text-[#133C2A]/60">Загрузка раздела денег...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {isMobile ? (
        <MobileMoneyWorkspace activeTab={activeTab} onTabChange={setActiveTab}>
          {content}
        </MobileMoneyWorkspace>
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MoneyTab)} className="space-y-5">
          <TabsList className="grid w-full grid-cols-4 rounded-2xl border border-[#133C2A]/10 bg-white/90 p-1 md:w-[680px]">
            <TabsTrigger value="overview" className="rounded-xl">Обзор</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-xl">Оплаты</TabsTrigger>
            <TabsTrigger value="subscriptions" className="rounded-xl">Абонементы</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl">Еще / настройки</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">{activeTab === 'overview' ? content : null}</TabsContent>
          <TabsContent value="payments">{activeTab === 'payments' ? content : null}</TabsContent>
          <TabsContent value="subscriptions">{activeTab === 'subscriptions' ? content : null}</TabsContent>
          <TabsContent value="settings">{activeTab === 'settings' ? content : null}</TabsContent>
        </Tabs>
      )}

      <MoneyFiltersSheet
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        filters={paymentFilters}
        onChange={setPaymentFilters}
        onReset={() => setPaymentFilters(defaultPaymentFilters)}
      />

      <CreateInvoiceSheet
        open={isCreateInvoiceOpen}
        onOpenChange={setIsCreateInvoiceOpen}
        clients={clients}
        draft={invoiceDraft}
        onChange={setInvoiceDraft}
        onSubmit={() => void submitInvoice()}
        isSubmitting={isInvoiceSubmitting}
      />

      <PaymentDetailsSheet
        open={isPaymentDetailsOpen}
        onOpenChange={setIsPaymentDetailsOpen}
        payment={selectedPayment}
        events={selectedPaymentEvents}
        onRemind={(payment) => void remindPayment(payment)}
        onConfirm={(payment) => void confirmPayment(payment)}
        onCancel={(payment) => void cancelPayment(payment)}
        onMarkCash={(payment) => void markCashPaid(payment)}
        onChangeDueDate={(payment) => void changeDueDate(payment)}
      />
    </div>
  );
}
