import { Plus, RefreshCw, Save, Wallet2 } from 'lucide-react';
import { Expense, Group } from '../../types';
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
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[#133C2A]">Еще и настройки</h1>
        <p className="mt-1 text-sm text-[#133C2A]/60">Тарифы, способы оплаты, эквайринг, напоминания и студийные расходы.</p>
      </div>

      <Card className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Тарифы и абонементы</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {pricingPlans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-[#133C2A]/10 bg-[#F8F4E3]/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[#133C2A]">{plan.title}</p>
                    <p className="mt-1 text-sm text-[#133C2A]/58">
                      {formatMoney(plan.price)} · {plan.classes_tracked ? `${plan.classes_count || 0} занятий` : 'по сроку'} · {plan.duration_days} дней
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs ${plan.is_active ? 'bg-[#F1F7F3] text-[#133C2A]' : 'bg-slate-100 text-slate-600'}`}>
                    {plan.is_active ? 'Активен' : 'Выключен'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={onOpenPricing}>
            Открыть настройки тарифов
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Способы оплаты</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Наличные', 'Доступно администратору'],
            ['Онлайн', 'Через ссылку или ручной провайдер'],
            ['СБП / перевод', 'Подходит для ручного подтверждения'],
            ['Эквайринг', 'Подготовлено место под подключение'],
          ].map(([title, description]) => (
            <div key={title} className="rounded-2xl border border-[#133C2A]/10 bg-[#F8F4E3]/60 p-4">
              <p className="text-[#133C2A]">{title}</p>
              <p className="mt-1 text-sm text-[#133C2A]/58">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <AcquiringSettingsCard onOpenSettings={onOpenPricing} />

      <Card className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-[#133C2A]">Расходы студии</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={onRefreshExpenses} disabled={isRefreshingExpenses}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {isRefreshingExpenses ? 'Обновляем...' : 'Обновить'}
              </Button>
              <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" onClick={onAddExpense}>
                <Plus className="mr-2 h-4 w-4" />
                Добавить расход
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
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
            <div className="space-y-2">
              <Label>Сумма</Label>
              <Input className="rounded-2xl" type="number" value={expenseForm.amount} onChange={(event) => onExpenseFormChange({ ...expenseForm, amount: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input className="rounded-2xl" type="date" value={expenseForm.date} onChange={(event) => onExpenseFormChange({ ...expenseForm, date: event.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>Описание</Label>
              <Input className="rounded-2xl" value={expenseForm.description} onChange={(event) => onExpenseFormChange({ ...expenseForm, description: event.target.value })} />
            </div>
          </div>

          {expenses.length === 0 ? (
            <MoneyEmptyState
              title="Пока нет расходов"
              description="Добавьте первый расход, чтобы контролировать не только поступления, но и финансовый результат студии."
            />
          ) : (
            <div className="space-y-3">
              {expenses.slice(0, 8).map((expense) => (
                <div key={expense.id} className="flex flex-col gap-3 rounded-2xl border border-[#133C2A]/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[#133C2A]">{expense.description}</p>
                    <p className="mt-1 text-sm text-[#133C2A]/58">
                      {expense.date.toLocaleDateString('ru-RU')} · {expense.paymentMethod || '—'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[#133C2A]">{formatMoney(expense.amount)}</p>
                    <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={() => onDeleteExpense(expense.id)}>
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

