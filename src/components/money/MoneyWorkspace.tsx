import { useEffect, useMemo, useState } from 'react';
import { addDays, isSameDay, parseISO } from 'date-fns';
import {
  AdminChildRecord,
  AdminClientRecord,
  AdminPaymentRecord,
  OwnerPricingPlanDto,
  changeAdminPaymentDueDate,
  changeAdminPaymentMethod,
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
import { MoneyExpenses } from './MoneyExpenses';
import { MobileMoneyWorkspace } from './MobileMoneyWorkspace';
import { MoneyFiltersSheet } from './MoneyFiltersSheet';
import { MoneyOverview } from './MoneyOverview';
import { MoneyPayments } from './MoneyPayments';
import { PaymentDetailsSheet } from './PaymentDetailsSheet';
import {
  MoneyInvoiceDraft,
  MoneyJournalEntry,
  MoneyOverviewSummary,
  MoneyPaymentFiltersState,
  MoneySubscriptionRecord,
  MoneyTab,
  derivePaymentType,
  moneyInvoiceTargetLabels,
  deriveSubscriptionRecord,
  formatMoney,
  getDisplayPaymentStatus,
  isOutstandingPayment,
  normalizePaymentSearch,
  paymentQueueMatches,
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
  parentUserId: '',
  parentPhone: '',
  parentFullName: '',
  childFullName: '',
  paymentType: 'subscription',
  planCode: '',
  paymentMethod: 'online',
  amount: '',
  dueDate: addDays(new Date(), 3).toISOString().slice(0, 10),
  startsAt: new Date().toISOString().slice(0, 10),
  useCustomStartsAt: false,
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

function mapContextStatus(status?: OwnerPaymentsNavigationContext['statusFilter']): MoneyPaymentFiltersState['status'] {
  if (status === 'paid') return 'paid';
  if (status === 'overdue') return 'overdue';
  if (status === 'pending' || status === 'unpaid' || status === 'failed' || status === 'cancelled' || status === 'refunded') {
    return 'unpaid';
  }
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
      status: mapContextStatus(paymentsNavigationContext.statusFilter),
      method: paymentsNavigationContext.methodFilter || prev.method,
      search: paymentsNavigationContext.searchQuery || prev.search,
    }));
    if (paymentsNavigationContext.invoiceClientId) {
      setInvoiceDraft((prev) => ({ ...prev, clientId: paymentsNavigationContext.invoiceClientId || '' }));
      setIsCreateInvoiceOpen(true);
    }
    onPaymentsNavigationContextApplied?.();
  }, [paymentsNavigationContext, appliedContextId, onPaymentsNavigationContextApplied]);

  useEffect(() => {
    if (!invoiceDraft.clientId) return;
    const linkedClient = clients.find((item) => item.id === invoiceDraft.clientId);
    if (!linkedClient) return;
    if (invoiceDraft.parentUserId === linkedClient.parentUserId && invoiceDraft.parentPhone) return;
    setInvoiceDraft((prev) => ({
      ...prev,
      parentUserId: linkedClient.parentUserId || prev.parentUserId,
      parentPhone: linkedClient.parentPhone || prev.parentPhone,
      parentFullName: linkedClient.parentName || prev.parentFullName,
      childFullName: '',
    }));
  }, [invoiceDraft.clientId, invoiceDraft.parentPhone, invoiceDraft.parentUserId, clients]);

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
      .filter((payment) => paymentFilters.status === 'all' || getDisplayPaymentStatus(payment.status) === paymentFilters.status)
      .filter((payment) => paymentFilters.method === 'all' || payment.paymentMethod === paymentFilters.method)
      .filter((payment) => paymentFilters.type === 'all' || derivePaymentType(payment) === paymentFilters.type)
      .filter((payment) => !query || normalizePaymentSearch(payment).includes(query))
      .sort((left, right) => new Date(right.updatedAt || right.createdAt).getTime() - new Date(left.updatedAt || left.createdAt).getTime());
  }, [payments, paymentFilters]);

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

  const openSubscriptionsQueue = () => {
    onNavigateSection?.('pricing');
  };

  const submitInvoice = async () => {
    const hasClientReference = Boolean(invoiceDraft.clientId);
    if (!hasClientReference && !invoiceDraft.parentPhone.trim()) {
      toast.error('Укажите телефон родителя для создания профиля');
      return;
    }
    if (!hasClientReference && !invoiceDraft.childFullName.trim()) {
      toast.error('Укажите имя ребенка');
      return;
    }
    setIsInvoiceSubmitting(true);
    try {
      const parsedAmount = invoiceDraft.amount.trim() ? Number(invoiceDraft.amount) : undefined;
      const selectedPlan = pricingPlans.find((plan) => plan.code === invoiceDraft.planCode);
      const composedComment = [moneyInvoiceTargetLabels[invoiceDraft.paymentType], selectedPlan?.title, invoiceDraft.comment.trim() || null]
        .filter(Boolean)
        .join(' · ');
      await createAdminInvoice({
        client_id: hasClientReference ? invoiceDraft.clientId : undefined,
        parent_user_id: invoiceDraft.parentUserId || undefined,
        parent_phone: hasClientReference ? undefined : invoiceDraft.parentPhone.trim(),
        parent_full_name: hasClientReference ? undefined : (invoiceDraft.parentFullName.trim() || undefined),
        child_full_name: hasClientReference ? undefined : invoiceDraft.childFullName.trim(),
        subscription_name: selectedPlan?.title || moneyInvoiceTargetLabels[invoiceDraft.paymentType],
        payment_method: invoiceDraft.paymentMethod,
        amount: parsedAmount,
        due_date: invoiceDraft.dueDate || undefined,
        starts_at: invoiceDraft.useCustomStartsAt ? invoiceDraft.startsAt || undefined : undefined,
        comment: composedComment || undefined,
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

  const changePaymentMethod = async (
    payment: AdminPaymentRecord,
    nextMethod: 'cash' | 'online',
    options?: { confirmCashImmediately?: boolean },
  ) => {
    try {
      await changeAdminPaymentMethod(payment.id, {
        payment_method: nextMethod,
        confirm_cash_immediately: options?.confirmCashImmediately || false,
        paid_amount: nextMethod === 'cash' && options?.confirmCashImmediately ? Number(payment.amount || 0) : undefined,
        comment:
          nextMethod === 'cash' && options?.confirmCashImmediately
            ? 'Переведено в наличные и подтверждено из раздела Деньги'
            : `Способ оплаты изменен на ${nextMethod === 'cash' ? 'наличные' : 'онлайн'} из раздела Деньги`,
      });
      toast.success(
        nextMethod === 'cash' && options?.confirmCashImmediately
          ? 'Платеж переведен в наличные и подтвержден'
          : `Способ оплаты изменен на ${nextMethod === 'cash' ? 'наличные' : 'онлайн'}`,
      );
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось изменить способ оплаты');
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
      return false;
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
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить расход');
      return false;
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

  const content = (
    <>
      {activeTab === 'overview' ? (
        <MoneyOverview
          stats={stats}
          monthlyData={monthlyData}
          payments={payments}
          activeSubscriptionsCount={subscriptions.filter((item) => item.status === 'active' || item.status === 'not_started').length}
          endingSoonCount={subscriptions.filter((item) => item.status === 'ending_soon').length}
          onCreateInvoice={() => setIsCreateInvoiceOpen(true)}
          onOpenExpenses={() => setActiveTab('expenses')}
          onOpenWaiting={() => openPaymentQueue('waiting')}
          onOpenOverdue={() => openPaymentQueue('overdue')}
          onOpenEndingSoon={() => openSubscriptionsQueue()}
          onOpenSubscriptions={() => openSubscriptionsQueue()}
        />
      ) : null}

      {activeTab === 'payments' ? (
        <MoneyPayments
          payments={visiblePayments}
          summary={overviewSummary}
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
          onChangeMethod={changePaymentMethod}
          onChangeDueDate={changeDueDate}
          activeContextLabel={activeContextLabel}
        />
      ) : null}

      {activeTab === 'expenses' ? (
        <MoneyExpenses
          expenses={expenses}
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
          <TabsList className="grid w-full grid-cols-3 rounded-2xl border border-[#133C2A]/10 bg-white/90 p-1 md:w-[520px]">
            <TabsTrigger value="overview" className="rounded-xl">Обзор</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-xl">Оплаты</TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-xl">Расходы</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">{activeTab === 'overview' ? content : null}</TabsContent>
          <TabsContent value="payments">{activeTab === 'payments' ? content : null}</TabsContent>
          <TabsContent value="expenses">{activeTab === 'expenses' ? content : null}</TabsContent>
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
        pricingPlans={pricingPlans}
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
