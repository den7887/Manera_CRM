import { useEffect, useMemo, useState } from 'react';
import { Plus, Receipt, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Expense, FinanceStats, MonthlyData } from '../../types';
import { createOwnerExpense, deleteOwnerExpense, loadOwnerExpenses, loadOwnerFinanceSummary } from '../../lib/backendApi';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
};

export function OwnerFinancePanel() {
  const [stats, setStats] = useState<FinanceStats>(emptyStats);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(expenseTemplate);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [summary, ownerExpenses] = await Promise.all([loadOwnerFinanceSummary(), loadOwnerExpenses()]);
      setStats(summary.stats || emptyStats);
      setMonthlyData(summary.monthlyData || []);
      setExpenses(ownerExpenses);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить финансы');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const lastMonths = useMemo(() => monthlyData.slice(-3).reverse(), [monthlyData]);

  const addExpense = async () => {
    const amount = Number(form.amount);
    if (!form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Заполните описание и сумму расхода');
      return;
    }
    try {
      await createOwnerExpense({
        category: form.category,
        amount,
        date: form.date,
        description: form.description.trim(),
        payment_method: form.paymentMethod,
      });
      setIsDialogOpen(false);
      setForm(expenseTemplate);
      toast.success('Расход добавлен');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить расход');
    }
  };

  const removeExpense = async (expenseId: string) => {
    if (!window.confirm('Удалить расход?')) {
      return;
    }
    try {
      await deleteOwnerExpense(expenseId);
      setExpenses((prev) => prev.filter((expense) => expense.id !== expenseId));
      toast.success('Расход удален');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить расход');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Финансы</h1>
          <p className="text-[#133C2A]/60">Доходы, расходы и прибыль в реальном времени</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
          <Plus className="w-4 h-4 mr-2" />
          Добавить расход
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none soft-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-[#1C8C64]" />
              <p className="text-sm text-[#133C2A]/60">Доход</p>
            </div>
            <p className="text-3xl text-[#133C2A] mt-2">{stats.totalIncome.toLocaleString('ru-RU')} ₽</p>
          </CardContent>
        </Card>
        <Card className="border-none soft-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-5 h-5 text-[#D14343]" />
              <p className="text-sm text-[#133C2A]/60">Расходы</p>
            </div>
            <p className="text-3xl text-[#133C2A] mt-2">{stats.totalExpenses.toLocaleString('ru-RU')} ₽</p>
          </CardContent>
        </Card>
        <Card className="border-none soft-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-[#D4AF37]" />
              <p className="text-sm text-[#133C2A]/60">Чистая прибыль</p>
            </div>
            <p className="text-3xl text-[#133C2A] mt-2">{stats.netProfit.toLocaleString('ru-RU')} ₽</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Последние месяцы</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-[#133C2A]/60">Загрузка...</p>
          ) : lastMonths.length === 0 ? (
            <p className="text-[#133C2A]/60">Нет данных</p>
          ) : (
            lastMonths.map((month) => (
              <div key={month.month} className="rounded-xl border border-[#133C2A]/10 p-3 flex items-center justify-between">
                <p className="text-[#133C2A]">{month.month}</p>
                <div className="text-sm text-[#133C2A]/70">
                  <span>Доход: {month.income.toLocaleString('ru-RU')} ₽</span>
                  <span className="mx-2">•</span>
                  <span>Расход: {month.expenses.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Последние расходы</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {expenses.length === 0 ? (
            <p className="text-[#133C2A]/60">Расходы не добавлены</p>
          ) : (
            expenses.slice(0, 15).map((expense) => (
              <div key={expense.id} className="rounded-xl border border-[#133C2A]/10 p-3 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[#133C2A]">{expense.description}</p>
                  <p className="text-sm text-[#133C2A]/60">
                    <Receipt className="w-4 h-4 inline mr-1" />
                    {new Date(expense.date).toLocaleDateString('ru-RU')} • {expense.category}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[#133C2A]">{expense.amount.toLocaleString('ru-RU')} ₽</p>
                  <Button size="sm" variant="outline" onClick={() => void removeExpense(expense.id)} className="rounded-xl">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">Новый расход</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Категория</Label>
              <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
              <Label>Способ оплаты</Label>
              <Select value={form.paymentMethod} onValueChange={(value: 'cash' | 'card' | 'transfer') => setForm((prev) => ({ ...prev, paymentMethod: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Наличные</SelectItem>
                  <SelectItem value="card">Карта</SelectItem>
                  <SelectItem value="transfer">Перевод</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-2xl">
              Отмена
            </Button>
            <Button onClick={() => void addExpense()} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
