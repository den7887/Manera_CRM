import { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  AlertCircle,
  Plus,
  Receipt,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { AdminPaymentRecord } from '../../lib/backendApi';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { FinanceStats, MonthlyData } from '../../types';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { MoneyEmptyState } from './MoneyEmptyState';
import { formatMoney, getDisplayPaymentStatus, getPaymentStatusLabel } from './moneyTypes';

function statusChipClassName(status: string): string {
  const displayStatus = getDisplayPaymentStatus(status);
  if (displayStatus === 'paid') return 'bg-[#EEF5F0] text-[#133C2A]';
  if (displayStatus === 'overdue') return 'bg-[#FCEBEC] text-[#B84949]';
  return 'bg-[#FFF5DB] text-[#8B6B00]';
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconClassName,
  valueClassName = 'text-[#133C2A]',
}: {
  title: string;
  value: string;
  change?: string;
  icon: typeof TrendingUp;
  iconClassName: string;
  valueClassName?: string;
}) {
  return (
    <Card className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="text-sm text-[#133C2A]/58">{title}</p>
          <p className={`mt-2 text-2xl leading-none ${valueClassName}`}>{value}</p>
          {change ? <p className="mt-2 text-xs text-[#133C2A]/50">{change}</p> : null}
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

export function MoneyOverview({
  stats,
  monthlyData,
  payments,
  activeSubscriptionsCount,
  endingSoonCount,
  onCreateInvoice,
  onOpenExpenses,
  onOpenWaiting,
  onOpenOverdue,
  onOpenEndingSoon,
  onOpenSubscriptions,
}: {
  stats: FinanceStats | null;
  monthlyData: MonthlyData[];
  payments: AdminPaymentRecord[];
  activeSubscriptionsCount: number;
  endingSoonCount: number;
  onCreateInvoice: () => void;
  onOpenExpenses: () => void;
  onOpenWaiting: () => void;
  onOpenOverdue: () => void;
  onOpenEndingSoon: () => void;
  onOpenSubscriptions?: () => void;
}) {
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState('month');

  const pendingPayments = useMemo(() => payments.filter((payment) => payment.status === 'pending' || payment.status === 'unpaid'), [payments]);
  const overduePayments = useMemo(() => payments.filter((payment) => payment.status === 'overdue'), [payments]);
  const recentPayments = useMemo(
    () =>
      [...payments]
        .sort((left, right) => new Date(right.updatedAt || right.createdAt).getTime() - new Date(left.updatedAt || left.createdAt).getTime())
        .slice(0, 5),
    [payments],
  );

  const summaryCards = [
    {
      title: 'Получено',
      value: formatMoney(stats?.totalIncome || 0),
      change: `${Math.round(stats?.revenueGrowth || 0) >= 0 ? '+' : ''}${Math.round(stats?.revenueGrowth || 0)}% к прошлому периоду`,
      icon: TrendingUp,
      iconClassName: 'bg-[#EEF5F0] text-[#133C2A]',
    },
    {
      title: 'Расходы',
      value: formatMoney(stats?.totalExpenses || 0),
      change: 'Расходы студии и операционные списания',
      icon: TrendingDown,
      iconClassName: 'bg-[#FCEBEC] text-[#B84949]',
      valueClassName: 'text-[#B84949]',
    },
    {
      title: 'Чистый результат',
      value: formatMoney(stats?.netProfit || 0),
      change: 'Чистый результат по текущим данным',
      icon: Wallet,
      iconClassName: 'bg-[#F8F4E3] text-[#8B6B00]',
    },
    {
      title: 'Активные абонементы',
      value: String(activeSubscriptionsCount),
      change: `${endingSoonCount} скоро закончатся`,
      icon: CreditCard,
      iconClassName: 'bg-[#EEF5F0] text-[#133C2A]',
    },
  ] as const;

  const quickActions = [
    {
      title: 'Новый счет',
      subtitle: 'Выставить оплату',
      Icon: Plus,
      onClick: onCreateInvoice,
    },
    {
      title: 'Расход',
      subtitle: 'Добавить списание',
      Icon: Receipt,
      onClick: onOpenExpenses,
    },
    {
      title: 'Просрочки',
      subtitle: 'Открыть долги',
      Icon: AlertCircle,
      onClick: onOpenOverdue,
    },
    {
      title: 'Прайс',
      subtitle: 'Тарифы и продления',
      Icon: CreditCard,
      onClick: () => onOpenSubscriptions?.(),
    },
  ] as const;

  return (
    <div className={isMobile ? 'space-y-4' : 'space-y-6'}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A]">Обзор денег</h1>
          <p className="mt-1 text-sm text-[#133C2A]/60">Что происходит с оплатами, расходами и абонементами прямо сейчас.</p>
        </div>
        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          className="w-full rounded-2xl border border-[#133C2A]/12 bg-white px-4 py-3 text-sm text-[#133C2A] outline-none md:w-[220px]"
        >
          <option value="week">Неделя</option>
          <option value="month">Месяц</option>
          <option value="quarter">Квартал</option>
          <option value="year">Год</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {quickActions.map((item) => {
          const Icon = item.Icon;
          return (
            <button
              key={item.title}
              type="button"
              onClick={item.onClick}
              className="flex min-h-[104px] flex-col justify-between rounded-3xl border border-[#133C2A]/10 bg-white/92 p-4 text-left shadow-[0_12px_28px_rgba(19,60,42,0.06)] transition hover:border-[#D4AF37]/30"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F8F4E3] text-[#133C2A]">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm leading-tight text-[#133C2A]">{item.title}</p>
                <p className="mt-1 text-xs leading-tight text-[#133C2A]/55">{item.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      <Card className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-[#8B6B00]" />
            <CardTitle className="text-[#133C2A]">Требуют внимания</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingPayments.length > 0 ? (
            <button
              type="button"
              onClick={onOpenWaiting}
              className="w-full rounded-2xl bg-[#FFF5DB] p-4 text-left transition hover:bg-[#FDF0C5]"
            >
              <p className="text-sm text-[#133C2A]">{pendingPayments.length} счетов ждут оплату</p>
              <p className="mt-1 text-sm text-[#133C2A]/62">
                На сумму {formatMoney(pendingPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0))}
              </p>
            </button>
          ) : null}
          {endingSoonCount > 0 ? (
            <button
              type="button"
              onClick={onOpenEndingSoon}
              className="w-full rounded-2xl bg-[#F8F4E3] p-4 text-left transition hover:bg-[#F4EBCF]"
            >
              <p className="text-sm text-[#133C2A]">{endingSoonCount} абонементов скоро закончатся</p>
              <p className="mt-1 text-sm text-[#133C2A]/62">Осталось мало занятий или подходит срок окончания.</p>
            </button>
          ) : null}
          {overduePayments.length > 0 ? (
            <button
              type="button"
              onClick={onOpenOverdue}
              className="w-full rounded-2xl bg-[#FCEBEC] p-4 text-left transition hover:bg-[#F9DFE1]"
            >
              <p className="text-sm text-[#133C2A]">{overduePayments.length} платежей просрочены</p>
              <p className="mt-1 text-sm text-[#133C2A]/62">Нужно связаться с родителем или проверить оплату вручную.</p>
            </button>
          ) : null}
          {pendingPayments.length === 0 && endingSoonCount === 0 && overduePayments.length === 0 ? (
            <MoneyEmptyState title="Критичных финансовых задач нет" description="Счета, продления и просрочки под контролем." />
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="min-w-0 border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
          <CardHeader>
            <CardTitle className="text-[#133C2A]">Динамика доходов и расходов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] min-w-0 w-full">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={monthlyData}>
                  <CartesianGrid stroke="#E7E1CD" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#6A7A70', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6A7A70', fontSize: 12 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                  <Tooltip formatter={(value) => formatMoney(Number(value || 0))} />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#133C2A" strokeWidth={3} dot={false} name="Доходы" />
                  <Line type="monotone" dataKey="expenses" stroke="#B84949" strokeWidth={2.5} dot={false} name="Расходы" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
          <CardHeader>
            <CardTitle className="text-[#133C2A]">Доходы по месяцам</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] min-w-0 w-full">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData}>
                  <CartesianGrid stroke="#E7E1CD" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#6A7A70', fontSize: 12 }} />
                  <YAxis hide />
                  <Tooltip formatter={(value) => formatMoney(Number(value || 0))} />
                  <Bar dataKey="income" fill="#D4AF37" radius={[10, 10, 0, 0]} name="Доходы" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      <Card className="max-w-4xl border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-[#133C2A]">Последние транзакции</CardTitle>
          <Button variant="ghost" className="rounded-2xl text-[#133C2A]/68" onClick={onOpenWaiting}>
            Смотреть все
          </Button>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <MoneyEmptyState title="Платежей пока нет" description="Когда появятся счета и оплаты, последние транзакции будут показаны здесь." />
          ) : isMobile ? (
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="rounded-2xl border border-[#133C2A]/10 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-[#133C2A]">{payment.childName || payment.parentName || '—'}</p>
                      <p className="mt-1 text-sm text-[#133C2A]/60">{payment.subscriptionName || payment.invoiceComment || 'Назначение не указано'}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${statusChipClassName(payment.status)}`}>{getPaymentStatusLabel(payment.status)}</span>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-lg text-[#133C2A]">{formatMoney(payment.amount)}</p>
                    <p className="text-xs text-[#133C2A]/50">{new Date(payment.createdAt).toLocaleDateString('ru-RU')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#133C2A]/10">
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Дата</th>
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Назначение</th>
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Клиент</th>
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Сумма</th>
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-[#133C2A]/8">
                      <td className="px-4 py-3 text-sm text-[#133C2A]/62">{new Date(payment.createdAt).toLocaleDateString('ru-RU')}</td>
                      <td className="px-4 py-3 text-sm text-[#133C2A]">{payment.subscriptionName || payment.invoiceComment || 'Назначение не указано'}</td>
                      <td className="px-4 py-3 text-sm text-[#133C2A]/62">{payment.childName || payment.parentName || '—'}</td>
                      <td className={`px-4 py-3 text-sm ${payment.status === 'paid' ? 'text-[#133C2A]' : 'text-[#B84949]'}`}>{formatMoney(payment.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs ${statusChipClassName(payment.status)}`}>{getPaymentStatusLabel(payment.status)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
