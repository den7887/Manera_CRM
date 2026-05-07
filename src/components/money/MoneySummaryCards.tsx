import { Card, CardContent } from '../ui/card';
import { MoneyOverviewSummary, formatMoney } from './moneyTypes';

export function MoneySummaryCards({ summary }: { summary: MoneyOverviewSummary }) {
  const items = [
    { label: 'Оплачено сегодня', value: formatMoney(summary.todayPaidAmount), hint: `${summary.paidTodayCount} оплат` },
    { label: 'Ждут оплату', value: formatMoney(summary.waitingAmount), hint: `${summary.waitingCount} счетов` },
    { label: 'Просрочено', value: formatMoney(summary.overdueAmount), hint: `${summary.overdueCount} клиента`, tone: 'danger' },
    { label: 'Нужно проверить', value: String(summary.reviewCount), hint: 'Ручные подтверждения' },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
          <CardContent className="p-4">
            <p className="text-xs text-[#133C2A]/55">{item.label}</p>
            <p className={`mt-2 text-2xl leading-none ${item.tone === 'danger' ? 'text-[#C14B4B]' : 'text-[#133C2A]'}`}>{item.value}</p>
            <p className="mt-2 text-xs text-[#133C2A]/55">{item.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

