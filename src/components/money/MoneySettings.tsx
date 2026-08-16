import { useMemo, useState } from 'react';
import { BellRing, CheckCircle, Clock, CreditCard, Key, Plus, RefreshCw, TrendingDown } from 'lucide-react';
import { Expense } from '../../types';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { OwnerPricingPlanDto } from '../../lib/backendApi';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AcquiringSettingsCard } from './AcquiringSettingsCard';
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

export function MoneySettings({
  pricingPlans,
  expenses,
  onOpenPricing,
  onAddExpense,
  onDeleteExpense,
  isRefreshingExpenses,
  onRefreshExpenses,
  expenseForm,
  onExpenseFormChange,
}: {
  pricingPlans: OwnerPricingPlanDto[];
  expenses: Expense[];
  onOpenPricing?: () => void;
  onAddExpense: () => void;
  onDeleteExpense: (expenseId: string) => void;
  isRefreshingExpenses?: boolean;
  onRefreshExpenses: () => void;
  expenseForm: ExpenseFormState;
  onExpenseFormChange: (next: ExpenseFormState) => void;
}) {
  const isMobile = useIsMobile();
  const [section, setSection] = useState<'expenses' | 'integrations' | 'notifications'>('expenses');

  const totalExpenses = useMemo(() => expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0), [expenses]);
  const plannedExpenses = useMemo(() => expenses.filter((expense) => !expense.paymentMethod), [expenses]);
  const paidExpenses = useMemo(() => expenses.filter((expense) => Boolean(expense.paymentMethod)), [expenses]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-[#133C2A]">Настройки</h1>
        <p className="mt-1 text-sm text-[#133C2A]/60">Управление расходами, интеграциями и уведомлениями</p>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-[#133C2A]/10">
        {[
          ['expenses', 'Расходы'],
          ['integrations', 'Интеграции'],
          ['notifications', 'Уведомления'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setSection(value as typeof section)}
            className={`border-b-2 px-1 pb-4 pt-1 text-sm transition-colors ${section === value ? 'border-[#133C2A] text-[#133C2A]' : 'border-transparent text-[#133C2A]/58'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'expenses' ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[#133C2A]">Расходы</h2>
              <p className="mt-1 text-sm text-[#133C2A]/60">Управление расходами студии</p>
            </div>
            <Button className="rounded-2xl bg-[#133C2A]" onClick={onAddExpense}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить расход
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <ExpenseSummary title="Всего расходов" value={formatMoney(totalExpenses)} icon={TrendingDown} iconClassName="bg-[#FCEBEC] text-[#B84949]" valueClassName="text-[#B84949]" />
            <ExpenseSummary title="Запланировано" value={formatMoney(plannedExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0))} icon={Clock} iconClassName="bg-[#FFF5DB] text-[#8B6B00]" valueClassName="text-[#8B6B00]" />
            <ExpenseSummary title="Оплачено" value={String(paidExpenses.length)} icon={CheckCircle} iconClassName="bg-[#EEF5F0] text-[#133C2A]" valueClassName="text-[#133C2A]" />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-[#133C2A]">Запланированные платежи</CardTitle>
                <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={onRefreshExpenses} disabled={isRefreshingExpenses}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isRefreshingExpenses ? 'Обновляем...' : 'Обновить'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label>Категория</Label>
                    <Select value={expenseForm.category} onValueChange={(value) => onExpenseFormChange({ ...expenseForm, category: value })}>
                      <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rent">Аренда</SelectItem>
                        <SelectItem value="salaries">Зарплаты</SelectItem>
                        <SelectItem value="utilities">Коммунальные</SelectItem>
                        <SelectItem value="marketing">Маркетинг</SelectItem>
                        <SelectItem value="other">Прочее</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Сумма</Label>
                      <Input className="rounded-2xl" type="number" value={expenseForm.amount} onChange={(event) => onExpenseFormChange({ ...expenseForm, amount: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Срок оплаты</Label>
                      <Input className="rounded-2xl" type="date" value={expenseForm.date} onChange={(event) => onExpenseFormChange({ ...expenseForm, date: event.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Описание</Label>
                    <Input className="rounded-2xl" value={expenseForm.description} onChange={(event) => onExpenseFormChange({ ...expenseForm, description: event.target.value })} />
                  </div>
                </div>

                {plannedExpenses.length === 0 ? (
                  <MoneyEmptyState title="Нет запланированных платежей" description="Добавьте расход сверху, чтобы он появился в этом списке." />
                ) : (
                  <div className="space-y-3">
                    {plannedExpenses.map((expense) => (
                      <div key={expense.id} className="flex flex-col gap-3 rounded-2xl bg-[#F8F4E3]/55 p-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm text-[#133C2A]">{expense.description}</p>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#133C2A]/58">
                            <span>{expense.category}</span>
                            <span>Срок: {expense.date.toLocaleDateString('ru-RU')}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[#B84949]">{formatMoney(expense.amount)}</p>
                          <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={() => onDeleteExpense(expense.id)}>
                            Закрыть
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
              <CardHeader>
                <CardTitle className="text-[#133C2A]">История расходов</CardTitle>
              </CardHeader>
              <CardContent>
                {expenses.length === 0 ? (
                  <MoneyEmptyState title="Истории расходов пока нет" description="Добавленные и оплаченные расходы будут показаны здесь." />
                ) : (
                  <div className="space-y-3">
                    {expenses.slice(0, isMobile ? 5 : 8).map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between gap-4 border-b border-[#133C2A]/8 py-3 last:border-b-0">
                        <div className="min-w-0">
                          <p className="text-sm text-[#133C2A]">{expense.description}</p>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#133C2A]/58">
                            <span>{expense.category}</span>
                            <span>{expense.date.toLocaleDateString('ru-RU')}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-[#B84949]">-{formatMoney(expense.amount).replace(' ₽', '')} ₽</p>
                          <span className="text-xs text-[#133C2A]/52">{expense.paymentMethod ? 'Оплачено' : 'Запланировано'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {section === 'integrations' ? (
        <div className="space-y-4">
          <Card className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F8F0FF] text-[#7C3AED]">
                  <CreditCard className="h-5 w-5" />
                </span>
                <CardTitle className="text-[#133C2A]">Stripe</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-[#F8F4E3]/60 p-4 text-sm text-[#133C2A]/62">
                Здесь будет храниться API-ключ Stripe и режим тестирования. Реальное подключение пока не настраивалось.
              </div>
              <Input className="rounded-2xl" type="password" placeholder="sk_test_..." />
              <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" disabled>
                Сохранить настройки Stripe
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF5F0] text-[#133C2A]">
                  <Key className="h-5 w-5" />
                </span>
                <CardTitle className="text-[#133C2A]">ЮKassa</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-[#F8F4E3]/60 p-4 text-sm text-[#133C2A]/62">
                Здесь будет храниться `shopId`, секретный ключ и webhook-конфигурация для ручного или автоматического режима.
              </div>
              <Input className="rounded-2xl" placeholder="Shop ID" />
              <Input className="rounded-2xl" type="password" placeholder="Секретный ключ" />
              <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" disabled>
                Сохранить настройки ЮKassa
              </Button>
            </CardContent>
          </Card>

          <AcquiringSettingsCard onOpenSettings={onOpenPricing} />
        </div>
      ) : null}

      {section === 'notifications' ? (
        <Card className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F8F4E3] text-[#8B6B00]">
                <BellRing className="h-5 w-5" />
              </span>
              <CardTitle className="text-[#133C2A]">Уведомления</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ['Email уведомления', 'О новых платежах и истекающих абонементах'],
              ['SMS уведомления', 'Критичные напоминания клиентам'],
              ['Telegram уведомления', 'Дублирование важных событий в Telegram'],
            ].map(([title, description]) => (
              <div key={title} className="flex items-center justify-between gap-4 rounded-2xl border border-[#133C2A]/10 bg-white p-4">
                <div>
                  <p className="text-sm text-[#133C2A]">{title}</p>
                  <p className="mt-1 text-sm text-[#133C2A]/58">{description}</p>
                </div>
                <input type="checkbox" className="h-4 w-4 rounded border-[#133C2A]/20 accent-[#133C2A]" disabled />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
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
