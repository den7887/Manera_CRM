import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Expense, FinanceStats, MonthlyData } from '../../types';
import {
  AdminPaymentRecord,
  createOwnerExpense,
  deleteOwnerExpense,
  loadAdminPayments,
  loadOwnerExpenses,
  loadOwnerFinanceSummary,
} from '../../lib/backendApi';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { OwnerPaymentsJournalPanel } from './OwnerPaymentsJournalPanel';
import { OwnerPaymentsNavigationContext } from './paymentsNavigation';

const emptyStats: FinanceStats = {
  totalIncome: 0,
  totalExpenses: 0,
  netProfit: 0,
  revenueGrowth: 0,
  churnRate: 0,
  trialConversion: 0,
};

const expenseTemplate = {
  category: 'rent',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  description: '',
  paymentMethod: 'cash' as 'cash' | 'card' | 'transfer',
  recipientName: '',
  notes: '',
};

type PeriodFilter = 'all' | 'month' | 'quarter';
type FinanceTab = 'overview' | 'expenses' | 'payments';

interface OwnerFinancePanelProps {
  paymentsNavigationContext?: OwnerPaymentsNavigationContext;
  onPaymentsNavigationContextApplied?: () => void;
}

function categoryLabel(value: string): string {
  if (value === 'rent') return 'Аренда';
  if (value === 'salaries') return 'Зарплаты';
  if (value === 'utilities') return 'Коммунальные';
  if (value === 'marketing') return 'Маркетинг';
  return 'Прочее';
}

function paymentMethodLabel(value?: string): string {
  if (value === 'card') return 'Карта';
  if (value === 'transfer') return 'Перевод';
  return 'Наличные';
}

function withinPeriod(date: Date, filter: PeriodFilter): boolean {
  if (filter === 'all') return true;
  const now = new Date();
  const from = new Date(now);
  if (filter === 'month') {
    from.setMonth(now.getMonth() - 1);
  } else {
    from.setMonth(now.getMonth() - 3);
  }
  return date >= from && date <= now;
}

function isOutstandingStatus(status: string): boolean {
  return ['unpaid', 'pending', 'failed', 'overdue'].includes(status);
}

export function OwnerFinancePanel({
  paymentsNavigationContext,
  onPaymentsNavigationContextApplied,
}: OwnerFinancePanelProps) {
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');
  const [stats, setStats] = useState<FinanceStats>(emptyStats);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(expenseTemplate);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [appliedPaymentsRequestId, setAppliedPaymentsRequestId] = useState<number | null>(null);
  const [isExpenseFiltersOpen, setIsExpenseFiltersOpen] = useState(false);

  const refresh = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const [summary, ownerExpenses, adminPayments] = await Promise.all([
        loadOwnerFinanceSummary(),
        loadOwnerExpenses(),
        loadAdminPayments(),
      ]);
      setStats(summary.stats || emptyStats);
      setMonthlyData(summary.monthlyData || []);
      setExpenses(ownerExpenses);
      setPayments(adminPayments);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить финансы');
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
    if (appliedPaymentsRequestId === paymentsNavigationContext.requestId) return;
    setActiveTab('payments');
    setAppliedPaymentsRequestId(paymentsNavigationContext.requestId);
  }, [paymentsNavigationContext, appliedPaymentsRequestId]);

  const lastMonths = useMemo(() => monthlyData.slice(-3).reverse(), [monthlyData]);

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return expenses
      .filter((expense) => {
        const text = [expense.description, expense.category, expense.recipientName || '', expense.notes || '']
          .join(' ')
          .toLowerCase();
        const matchesSearch = !query || text.includes(query);
        const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
        const matchesMethod = methodFilter === 'all' || (expense.paymentMethod || 'cash') === methodFilter;
        const expenseDate = new Date(expense.date);
        const matchesPeriod = withinPeriod(expenseDate, periodFilter);
        return matchesSearch && matchesCategory && matchesMethod && matchesPeriod;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, search, categoryFilter, methodFilter, periodFilter]);

  const filteredAmount = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [filteredExpenses],
  );

  const expenseShare = stats.totalIncome > 0 ? Math.round((stats.totalExpenses / stats.totalIncome) * 100) : 0;
  const hasFinanceRisk = stats.totalIncome > 0 && stats.totalExpenses > stats.totalIncome;

  const topCategories = useMemo(() => {
    const totals = new Map<string, number>();
    filteredExpenses.forEach((expense) => {
      totals.set(expense.category, (totals.get(expense.category) || 0) + Number(expense.amount || 0));
    });
    const list = Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    const max = list[0]?.amount || 1;
    return list.map((item) => ({ ...item, percent: Math.round((item.amount / max) * 100) }));
  }, [filteredExpenses]);

  const paymentStats = useMemo(() => {
    const outstanding = payments.filter((item) => isOutstandingStatus(item.status));
    const overdue = payments.filter((item) => item.status === 'overdue');
    const paid = payments.filter((item) => item.status === 'paid');
    const outstandingAmount = outstanding.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const paidAmount = paid.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalTracked = outstandingAmount + paidAmount;
    const collectionRate = totalTracked > 0 ? Math.round((paidAmount / totalTracked) * 100) : 0;
    return {
      total: payments.length,
      outstandingCount: outstanding.length,
      overdueCount: overdue.length,
      paidCount: paid.length,
      outstandingAmount,
      paidAmount,
      collectionRate,
    };
  }, [payments]);

  const financeNextActions = useMemo(() => {
    const actions: Array<{
      title: string;
      description: string;
      button: string;
      tab: FinanceTab;
      tone: 'red' | 'gold' | 'green';
      Icon: typeof Receipt;
    }> = [];

    if (paymentStats.outstandingCount > 0) {
      actions.push({
        title: 'Собрать открытые оплаты',
        description: `${paymentStats.outstandingCount} счетов на сумму ${paymentStats.outstandingAmount.toLocaleString('ru-RU')} ₽ требуют контроля.`,
        button: 'Открыть платежи',
        tab: 'payments',
        tone: paymentStats.overdueCount > 0 ? 'red' : 'gold',
        Icon: Receipt,
      });
    }

    if (hasFinanceRisk) {
      actions.push({
        title: 'Разобрать расходы',
        description: 'Расходы выше дохода. Проверьте крупные категории и последние траты.',
        button: 'Открыть расходы',
        tab: 'expenses',
        tone: 'red',
        Icon: AlertTriangle,
      });
    }

    if (actions.length === 0) {
      actions.push({
        title: 'Деньги под контролем',
        description: 'Критичных долгов и финансового риска сейчас нет. Можно посмотреть журнал оплат или добавить текущий расход.',
        button: 'Журнал платежей',
        tab: 'payments',
        tone: 'green',
        Icon: Wallet,
      });
    }

    return actions;
  }, [paymentStats, hasFinanceRisk]);

  const addExpense = async () => {
    const amount = Number(form.amount);
    if (!form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Заполните описание и сумму расхода');
      return;
    }
    setIsSaving(true);
    try {
      await createOwnerExpense({
        category: form.category,
        amount,
        date: form.date,
        description: form.description.trim(),
        payment_method: form.paymentMethod,
        recipient_name: form.recipientName.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setIsDialogOpen(false);
      setForm(expenseTemplate);
      toast.success('Расход добавлен');
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить расход');
    } finally {
      setIsSaving(false);
    }
  };

  const removeExpense = async (expenseId: string) => {
    if (!window.confirm('Удалить расход?')) return;
    try {
      await deleteOwnerExpense(expenseId);
      setExpenses((prev) => prev.filter((expense) => expense.id !== expenseId));
      toast.success('Расход удален');
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить расход');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[#133C2A] mb-2">Финансы</h1>
          <p className="text-[#133C2A]/60">Единый центр: доходы, расходы, счета и контроль оплат</p>
        </div>
        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => void refresh(true)} className="rounded-2xl" disabled={isRefreshing}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {isRefreshing ? 'Обновляем...' : 'Обновить'}
          </Button>
          {activeTab !== 'payments' && (
            <Button onClick={() => setIsDialogOpen(true)} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
              <Plus className="w-4 h-4 mr-2" />
              Добавить расход
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FinanceTab)} className="space-y-4 md:space-y-6">
        <TabsList className="grid w-full md:w-[560px] grid-cols-3 rounded-2xl bg-white border border-[#133C2A]/10 p-1">
          <TabsTrigger value="overview" className="rounded-xl">Обзор</TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-xl">Расходы</TabsTrigger>
          <TabsTrigger value="payments" className="rounded-xl">Платежи</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden border-none bg-[#123827] text-white shadow-[0_22px_55px_rgba(19,60,42,0.16)]">
              <CardContent className="p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm text-white/60">Финансовый результат</p>
                    <p className="mt-2 text-4xl leading-none md:text-5xl">{stats.netProfit.toLocaleString('ru-RU')} ₽</p>
                    <p className="mt-3 text-sm text-white/65">
                      Доход минус расходы. Если показатель уходит в минус, сначала проверяем долги и крупные траты.
                    </p>
                  </div>
                  <Badge className={`w-fit rounded-full border bg-white/10 text-white hover:bg-white/10 ${hasFinanceRisk ? 'border-red-300/40' : 'border-green-300/40'}`}>
                    {hasFinanceRisk ? 'требует внимания' : 'баланс нормальный'}
                  </Badge>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                    <p className="text-xs text-white/50">Доход</p>
                    <p className="mt-1 text-xl">{stats.totalIncome.toLocaleString('ru-RU')} ₽</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                    <p className="text-xs text-white/50">Расходы</p>
                    <p className="mt-1 text-xl">{stats.totalExpenses.toLocaleString('ru-RU')} ₽</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                    <p className="text-xs text-white/50">Расходы от дохода</p>
                    <p className="mt-1 text-xl">{expenseShare}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-white/92 shadow-[0_12px_35px_rgba(19,60,42,0.07)]">
              <CardContent className="p-5 md:p-6">
                <p className="text-lg text-[#133C2A]">Что сделать сейчас</p>
                <div className="mt-4 space-y-3">
                  {financeNextActions.map((action) => {
                    const Icon = action.Icon;
                    return (
                      <button
                        key={action.title}
                        type="button"
                        onClick={() => setActiveTab(action.tab)}
                        className={`w-full rounded-2xl border p-4 text-left transition-smooth hover:-translate-y-0.5 ${
                          action.tone === 'red'
                            ? 'border-red-200 bg-red-50'
                            : action.tone === 'green'
                              ? 'border-green-200 bg-green-50'
                              : 'border-[#D4AF37]/30 bg-[#FFF9E8]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-[#133C2A]">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm text-[#133C2A]">{action.title}</span>
                            <span className="mt-1 block text-xs leading-relaxed text-[#133C2A]/62">{action.description}</span>
                            <span className="mt-3 block text-sm text-[#133C2A] underline-offset-4">{action.button}</span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="border-none bg-white/92 shadow-[0_12px_35px_rgba(19,60,42,0.07)]">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg text-[#133C2A]">Платежи родителей</p>
                    <p className="text-sm text-[#133C2A]/58">Открытые счета и собираемость.</p>
                  </div>
                  <Button variant="outline" className="rounded-xl" onClick={() => setActiveTab('payments')}>
                    Открыть
                  </Button>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#F8F4E3]/80 p-4">
                    <p className="text-xs text-[#133C2A]/50">К оплате</p>
                    <p className="mt-1 text-2xl text-[#133C2A]">{paymentStats.outstandingAmount.toLocaleString('ru-RU')} ₽</p>
                    <p className="mt-1 text-xs text-[#133C2A]/55">{paymentStats.outstandingCount} открытых счетов</p>
                  </div>
                  <div className="rounded-2xl bg-[#F8F4E3]/80 p-4">
                    <p className="text-xs text-[#133C2A]/50">Собираемость</p>
                    <p className="mt-1 text-2xl text-[#133C2A]">{paymentStats.collectionRate}%</p>
                    <p className="mt-1 text-xs text-[#D14343]">Просрочено: {paymentStats.overdueCount}</p>
                  </div>
                </div>
                <Progress value={paymentStats.collectionRate} className="mt-4 h-2 bg-[#133C2A]/10 [&>div]:bg-[#133C2A]" />
              </CardContent>
            </Card>

            <Card className="border-none bg-white/92 shadow-[0_12px_35px_rgba(19,60,42,0.07)]">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg text-[#133C2A]">Расходы студии</p>
                    <p className="text-sm text-[#133C2A]/58">Крупные категории и последние месяцы.</p>
                  </div>
                  <Button variant="outline" className="rounded-xl" onClick={() => setActiveTab('expenses')}>
                    Открыть
                  </Button>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    {topCategories.length === 0 ? (
                      <p className="text-sm text-[#133C2A]/60">Категорий расходов пока нет</p>
                    ) : (
                      topCategories.slice(0, 3).map((item) => (
                        <div key={item.category} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#133C2A]">{categoryLabel(item.category)}</span>
                            <span className="text-[#133C2A]/65">{item.amount.toLocaleString('ru-RU')} ₽</span>
                          </div>
                          <Progress value={item.percent} className="h-2 bg-[#133C2A]/10 [&>div]:bg-[#D4AF37]" />
                        </div>
                      ))
                    )}
                  </div>
                  <div className="space-y-2">
                    {isLoading ? (
                      <p className="text-sm text-[#133C2A]/60">Загрузка...</p>
                    ) : lastMonths.length === 0 ? (
                      <p className="text-sm text-[#133C2A]/60">Нет данных по месяцам</p>
                    ) : (
                      lastMonths.map((month) => (
                        <div key={month.month} className="rounded-xl bg-[#F8F4E3]/80 px-3 py-2">
                          <p className="text-sm text-[#133C2A]">{month.month}</p>
                          <p className="text-xs text-[#133C2A]/58">
                            {month.income.toLocaleString('ru-RU')} ₽ доход · {month.expenses.toLocaleString('ru-RU')} ₽ расход
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A]">Расходы</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="mobile-scroll-x md:flex md:items-center md:gap-2 md:flex-wrap">
                <Button size="sm" variant={periodFilter === 'all' ? 'default' : 'outline'} className={periodFilter === 'all' ? 'rounded-xl bg-[#133C2A]' : 'rounded-xl'} onClick={() => setPeriodFilter('all')}>
                  Все
                </Button>
                <Button size="sm" variant={periodFilter === 'month' ? 'default' : 'outline'} className={periodFilter === 'month' ? 'rounded-xl bg-[#133C2A]' : 'rounded-xl'} onClick={() => setPeriodFilter('month')}>
                  30 дней
                </Button>
                <Button size="sm" variant={periodFilter === 'quarter' ? 'default' : 'outline'} className={periodFilter === 'quarter' ? 'rounded-xl bg-[#133C2A]' : 'rounded-xl'} onClick={() => setPeriodFilter('quarter')}>
                  3 месяца
                </Button>
                <Badge variant="outline" className="rounded-xl ml-auto">
                  По фильтру: {filteredAmount.toLocaleString('ru-RU')} ₽
                </Badge>
              </div>

              <div className="grid gap-2 md:hidden">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#133C2A]/40" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по расходам" className="pl-9 rounded-xl" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl justify-center"
                  onClick={() => setIsExpenseFiltersOpen((prev) => !prev)}
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  {isExpenseFiltersOpen ? 'Скрыть фильтры' : 'Фильтры'}
                </Button>
              </div>

              <div className={`${isExpenseFiltersOpen ? 'grid' : 'hidden'} gap-3 md:grid md:grid-cols-[1fr_190px_190px_190px]`}>
                <div className="relative hidden md:block">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#133C2A]/40" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по расходам" className="pl-9 rounded-xl" />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все категории</SelectItem>
                    <SelectItem value="rent">Аренда</SelectItem>
                    <SelectItem value="salaries">Зарплаты</SelectItem>
                    <SelectItem value="utilities">Коммунальные</SelectItem>
                    <SelectItem value="marketing">Маркетинг</SelectItem>
                    <SelectItem value="other">Прочее</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все методы</SelectItem>
                    <SelectItem value="cash">Наличные</SelectItem>
                    <SelectItem value="card">Карта</SelectItem>
                    <SelectItem value="transfer">Перевод</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={periodFilter} onValueChange={(value: PeriodFilter) => setPeriodFilter(value)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">За все время</SelectItem>
                    <SelectItem value="month">Последний месяц</SelectItem>
                    <SelectItem value="quarter">Последние 3 месяца</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredExpenses.length === 0 ? (
                <p className="text-[#133C2A]/60">Расходы по текущему фильтру не найдены</p>
              ) : (
                filteredExpenses.slice(0, 25).map((expense) => (
                  <div key={expense.id} className="rounded-xl border border-[#133C2A]/10 p-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1 min-w-0">
                      <p className="text-[#133C2A]">{expense.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="rounded-xl">{categoryLabel(expense.category)}</Badge>
                        <Badge variant="outline" className="rounded-xl">{paymentMethodLabel(expense.paymentMethod)}</Badge>
                      </div>
                      <p className="text-sm text-[#133C2A]/60">
                        {new Date(expense.date).toLocaleDateString('ru-RU')}
                        {expense.recipientName ? ` • Получатель: ${expense.recipientName}` : ''}
                      </p>
                      {expense.notes ? <p className="text-xs text-[#133C2A]/55">{expense.notes}</p> : null}
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:shrink-0">
                      <p className="text-[#133C2A]">{expense.amount.toLocaleString('ru-RU')} ₽</p>
                      <Button size="sm" variant="outline" onClick={() => void removeExpense(expense.id)} className="rounded-xl">
                        <Trash2 className="w-4 h-4" />
                        <span className="sm:hidden">Удалить</span>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <OwnerPaymentsJournalPanel
            navigationContext={paymentsNavigationContext}
            onNavigationContextApplied={() => {
              onPaymentsNavigationContextApplied?.();
            }}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">Новый расход</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Категория</Label>
              <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent">Аренда</SelectItem>
                  <SelectItem value="salaries">Зарплаты</SelectItem>
                  <SelectItem value="utilities">Коммунальные</SelectItem>
                  <SelectItem value="marketing">Маркетинг</SelectItem>
                  <SelectItem value="other">Прочее</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Способ оплаты</Label>
              <Select value={form.paymentMethod} onValueChange={(value: 'cash' | 'card' | 'transfer') => setForm((prev) => ({ ...prev, paymentMethod: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Наличные</SelectItem>
                  <SelectItem value="card">Карта</SelectItem>
                  <SelectItem value="transfer">Перевод</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Описание</Label>
              <Input value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Сумма</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Дата</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Получатель</Label>
              <Input value={form.recipientName} onChange={(e) => setForm((prev) => ({ ...prev, recipientName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Примечание</Label>
              <Input value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-2xl">
              Отмена
            </Button>
            <Button onClick={() => void addExpense()} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" disabled={isSaving}>
              {isSaving ? 'Сохраняем...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
