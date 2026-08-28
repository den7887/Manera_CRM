import { useMemo, useState } from 'react';
import { BarChart3, CheckCircle, PieChart as PieChartIcon, Plus, RefreshCw, TrendingDown, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Expense } from '../../types';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { MoneyEmptyState } from './MoneyEmptyState';
import { formatMoney } from './moneyTypes';

interface ExpenseFormState {
  category: string;
  amount: string;
  date: string;
  description: string;
  paymentMethod: 'cash' | 'card' | 'transfer';
  recipientName: string;
  notes: string;
}

const expenseCategoryLabels: Record<string, string> = {
  rent: 'Аренда',
  salaries: 'Зарплаты',
  utilities: 'Коммунальные',
  marketing: 'Реклама',
  equipment: 'Оборудование',
  materials: 'Материалы',
  other: 'Прочее',
};

function getExpenseCategoryLabel(value: string): string {
  return expenseCategoryLabels[value] || 'Прочее';
}

export function MoneyExpenses({
  expenses,
  onAddExpense,
  onDeleteExpense,
  isRefreshingExpenses,
  onRefreshExpenses,
  expenseForm,
  onExpenseFormChange,
}: {
  expenses: Expense[];
  onAddExpense: () => Promise<boolean> | boolean;
  onDeleteExpense: (expenseId: string) => void;
  isRefreshingExpenses?: boolean;
  onRefreshExpenses: () => void;
  expenseForm: ExpenseFormState;
  onExpenseFormChange: (next: ExpenseFormState) => void;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const paidExpenses = expenses.filter((expense) => Boolean(expense.paymentMethod));
  const thisMonthExpenses = expenses.filter((expense) => {
    const date = new Date(expense.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const chartColors = ['#133C2A', '#D4AF37', '#B84949', '#7C8C72', '#B85A2E', '#5F7A6B', '#8A6A1B'];

  const categoryData = useMemo(() => {
    const grouped = new Map<string, number>();
    expenses.forEach((expense) => {
      const key = getExpenseCategoryLabel(expense.category);
      grouped.set(key, (grouped.get(key) || 0) + Number(expense.amount || 0));
    });
    return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const monthlyData = useMemo(() => {
    const now = new Date();
    const points = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      return {
        key,
        month: date.toLocaleDateString('ru-RU', { month: 'short' }),
        amount: 0,
      };
    });
    const pointMap = new Map(points.map((item) => [item.key, item]));
    expenses.forEach((expense) => {
      const date = new Date(expense.date);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const point = pointMap.get(key);
      if (point) {
        point.amount += Number(expense.amount || 0);
      }
    });
    return points;
  }, [expenses]);

  const handleSubmitExpense = async () => {
    const result = await Promise.resolve(onAddExpense());
    if (result) {
      setIsCreateOpen(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="rounded-[28px] border border-[#133C2A]/10 bg-gradient-to-r from-[#133C2A] to-[#1d5a3f] px-5 py-5 text-white">
        <p className="text-xs uppercase tracking-[0.16em] text-white/65">Расходы студии</p>
        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl">Учет расходов</h2>
            <p className="mt-1 text-sm text-white/72">Что закрыто и сколько потрачено за месяц.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-white/72">
            <span>{formatMoney(thisMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0))} за месяц</span>
            <span>•</span>
            <span>{formatMoney(totalExpenses)} всего</span>
            <span>•</span>
            <span>{paidExpenses.length} закрыто</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A]">Расходы</h1>
          <p className="mt-1 text-sm text-[#133C2A]/60">Планируйте, учитывайте и закрывайте расходы студии в одном месте.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="rounded-2xl bg-[#133C2A]" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить расход
          </Button>
          <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={onRefreshExpenses} disabled={isRefreshingExpenses}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {isRefreshingExpenses ? 'Обновляем...' : 'Обновить'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <ExpenseSummary title="За месяц" value={formatMoney(thisMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0))} icon={Wallet} iconClassName="bg-[#F8F4E3] text-[#8B6B00]" valueClassName="text-[#133C2A]" />
        <ExpenseSummary title="Всего расходов" value={formatMoney(totalExpenses)} icon={TrendingDown} iconClassName="bg-[#FCEBEC] text-[#B84949]" valueClassName="text-[#B84949]" />
        <ExpenseSummary title="Закрыто" value={String(paidExpenses.length)} icon={CheckCircle} iconClassName="bg-[#EEF5F0] text-[#133C2A]" valueClassName="text-[#133C2A]" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Card className="min-w-0 border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#133C2A]" />
                <CardTitle className="text-[#133C2A]">Расходы по месяцам</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <MoneyEmptyState title="Пока нет данных для графика" description="Добавьте расходы, чтобы видеть динамику по месяцам." />
              ) : (
                <div className="h-[260px] min-w-0 w-full">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid stroke="#E7E1CD" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#6A7A70', fontSize: 12 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6A7A70', fontSize: 12 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                      <Tooltip formatter={(value) => formatMoney(Number(value || 0))} />
                      <Bar dataKey="amount" fill="#133C2A" radius={[10, 10, 0, 0]} name="Расходы" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0 border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-[#8B6B00]" />
                <CardTitle className="text-[#133C2A]">Структура расходов</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <MoneyEmptyState title="Пока нет данных по категориям" description="Когда появятся расходы, здесь будет видно, на что уходит бюджет." />
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="h-[250px] min-w-0 w-full">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                          {categoryData.map((entry, index) => (
                            <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatMoney(Number(value || 0))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {categoryData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8F4E3]/55 px-3 py-3">
                        <div className="flex items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                          <span className="text-sm text-[#133C2A]">{item.name}</span>
                        </div>
                        <span className="text-sm text-[#133C2A]/70">{formatMoney(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
            <CardHeader>
              <CardTitle className="text-[#133C2A]">История</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <MoneyEmptyState title="История расходов пуста" description="Сохранённые расходы будут собираться здесь." />
              ) : (
                <div className="space-y-3">
                  {expenses.slice(0, 8).map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between gap-3 border-b border-[#133C2A]/8 py-3 last:border-b-0">
                      <div className="min-w-0">
                        <p className="text-sm text-[#133C2A]">{expense.description}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#133C2A]/58">
                          <span>{getExpenseCategoryLabel(expense.category)}</span>
                          <span>{new Date(expense.date).toLocaleDateString('ru-RU')}</span>
                          <span>{expense.paymentMethod ? 'Оплачен' : 'Запланирован'}</span>
                        </div>
                      </div>
                      <p className="shrink-0 text-sm text-[#B84949]">-{formatMoney(expense.amount).replace(' ₽', '')} ₽</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">Новый расход</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Назначение расхода</Label>
              <Select value={expenseForm.category} onValueChange={(value) => onExpenseFormChange({ ...expenseForm, category: value })}>
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent">Аренда</SelectItem>
                  <SelectItem value="salaries">Зарплаты</SelectItem>
                  <SelectItem value="utilities">Коммунальные</SelectItem>
                  <SelectItem value="marketing">Реклама</SelectItem>
                  <SelectItem value="equipment">Оборудование</SelectItem>
                  <SelectItem value="materials">Материалы</SelectItem>
                  <SelectItem value="other">Прочее</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Сумма</Label>
                <Input className="rounded-2xl" type="number" placeholder="0" value={expenseForm.amount} onChange={(event) => onExpenseFormChange({ ...expenseForm, amount: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Дата оплаты</Label>
                <Input className="rounded-2xl" type="date" value={expenseForm.date} onChange={(event) => onExpenseFormChange({ ...expenseForm, date: event.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Комментарий / что оплачиваем</Label>
              <Input className="rounded-2xl" placeholder="Например: аренда зала на май" value={expenseForm.description} onChange={(event) => onExpenseFormChange({ ...expenseForm, description: event.target.value })} />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Способ оплаты</Label>
                <Select value={expenseForm.paymentMethod} onValueChange={(value: 'cash' | 'card' | 'transfer') => onExpenseFormChange({ ...expenseForm, paymentMethod: value })}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Наличные</SelectItem>
                    <SelectItem value="card">Карта</SelectItem>
                    <SelectItem value="transfer">Перевод</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Получатель</Label>
                <Input className="rounded-2xl" placeholder="Кому платим" value={expenseForm.recipientName} onChange={(event) => onExpenseFormChange({ ...expenseForm, recipientName: event.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Заметка</Label>
              <Input className="rounded-2xl" placeholder="Например: оплатить до 15 числа" value={expenseForm.notes} onChange={(event) => onExpenseFormChange({ ...expenseForm, notes: event.target.value })} />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={() => setIsCreateOpen(false)}>
                Отмена
              </Button>
              <Button className="rounded-2xl bg-[#133C2A]" onClick={() => void handleSubmitExpense()}>
                <Plus className="mr-2 h-4 w-4" />
                Сохранить расход
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExpenseSummary({
  title,
  value,
  icon: Icon,
  iconClassName,
  valueClassName,
}: {
  title: string;
  value: string;
  icon: typeof TrendingDown;
  iconClassName: string;
  valueClassName: string;
}) {
  return (
    <Card className="border-none bg-white/92 shadow-[0_10px_24px_rgba(19,60,42,0.06)]">
      <CardContent className="flex items-start gap-4 p-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-[#133C2A]/58">{title}</p>
          <p className={`mt-2 text-2xl ${valueClassName}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
