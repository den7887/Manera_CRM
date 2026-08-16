import { AlertCircle, CircleDollarSign, Clock3, Wallet } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { MoneyOverviewSummary, formatMoney } from './moneyTypes';

export function MoneySummaryCards({ summary }: { summary: MoneyOverviewSummary }) {
  const items = [
    {
      label: 'Оплачено сегодня',
      value: formatMoney(summary.todayPaidAmount),
      hint: `${summary.paidTodayCount} оплат`,
      icon: CircleDollarSign,
      iconClassName: 'bg-[#EAF5EE] text-[#133C2A]',
    },
    {
      label: 'Ждут оплату',
      value: formatMoney(summary.waitingAmount),
      hint: `${summary.waitingCount} счетов`,
      icon: Wallet,
      iconClassName: 'bg-[#F8F4E3] text-[#8B6B00]',
    },
    {
      label: 'Просрочено',
      value: formatMoney(summary.overdueAmount),
      hint: `${summary.overdueCount} клиента`,
      tone: 'danger',
      icon: AlertCircle,
      iconClassName: 'bg-[#FCEBEC] text-[#B84949]',
    },
    {
      label: 'Нужно проверить',
      value: String(summary.reviewCount),
      hint: 'Ручные подтверждения',
      icon: Clock3,
      iconClassName: 'bg-[#FFF5DB] text-[#8B6B00]',
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-[#133C2A]/45">{item.label}</p>
                <p className={`mt-3 text-2xl leading-none md:text-[30px] ${item.tone === 'danger' ? 'text-[#C14B4B]' : 'text-[#133C2A]'}`}>{item.value}</p>
                <p className="mt-3 text-xs text-[#133C2A]/55">{item.hint}</p>
              </div>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.iconClassName}`}>
                <item.icon className="h-5 w-5" />
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
