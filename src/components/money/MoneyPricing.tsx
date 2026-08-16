import { DollarSign, Plus, Tag, Wallet } from 'lucide-react';
import { OwnerPricingPlanDto } from '../../lib/backendApi';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { MoneyEmptyState } from './MoneyEmptyState';
import { formatMoney } from './moneyTypes';

export function MoneyPricing({
  pricingPlans,
  onCreateInvoice,
  onOpenPricing,
  onCreatePricing,
}: {
  pricingPlans: OwnerPricingPlanDto[];
  onCreateInvoice: () => void;
  onOpenPricing?: () => void;
  onCreatePricing: () => void;
}) {
  const activePlans = pricingPlans.filter((plan) => plan.is_active);
  const averagePrice = pricingPlans.length
    ? pricingPlans.reduce((sum, plan) => sum + Number(plan.price || 0), 0) / pricingPlans.length
    : 0;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A]">Прайс</h1>
          <p className="mt-1 text-sm text-[#133C2A]/60">Только тарифы: что продаем, по какой цене и на каких условиях.</p>
        </div>
        <Button className="rounded-2xl bg-[#133C2A]" onClick={onCreatePricing}>
          <Plus className="mr-2 h-4 w-4" />
          Создать тариф
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <PricingSummary title="Тарифов всего" value={String(pricingPlans.length)} subtitle="Все планы в системе" icon={Tag} iconClassName="bg-[#F8F4E3] text-[#8B6B00]" />
        <PricingSummary title="Активных" value={String(activePlans.length)} subtitle="Можно продавать сейчас" icon={Wallet} iconClassName="bg-[#EEF5F0] text-[#133C2A]" />
        <PricingSummary title="Средняя цена" value={formatMoney(averagePrice)} subtitle="По всем тарифам" icon={DollarSign} iconClassName="bg-[#FFF1E8] text-[#B85A2E]" />
      </div>

      {pricingPlans.length === 0 ? (
        <MoneyEmptyState title="Тарифов пока нет" description="Создайте первый тариф, чтобы продавать пробные и абонементы." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pricingPlans.map((plan) => (
            <Card key={plan.id} className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg text-[#133C2A]">{plan.title}</h3>
                    <p className="mt-1 text-sm text-[#133C2A]/58">
                      {plan.classes_tracked ? 'Пакет занятий' : 'Тариф по сроку'}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs ${plan.is_active ? 'bg-[#EEF5F0] text-[#133C2A]' : 'bg-slate-100 text-slate-600'}`}>
                    {plan.is_active ? 'Активен' : 'Выключен'}
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#133C2A]/58">Цена</span>
                    <span className="text-[#133C2A]">{formatMoney(plan.price)}</span>
                  </div>
                  {plan.classes_tracked ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[#133C2A]/58">Занятий</span>
                      <span className="text-[#133C2A]">{String(plan.classes_count || 0)}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-[#133C2A]/58">Срок действия</span>
                    <span className="text-[#133C2A]">{plan.duration_days} дней</span>
                  </div>
                </div>

                {onOpenPricing ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={onOpenPricing}>
                      Редактировать
                    </Button>
                    <Button className="rounded-2xl bg-[#133C2A]" onClick={onCreateInvoice}>
                      Продать
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full rounded-2xl bg-[#133C2A]" onClick={onCreateInvoice}>
                    Продать
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PricingSummary({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Tag;
  iconClassName: string;
}) {
  return (
    <Card className="border-none bg-white/92 shadow-[0_10px_24px_rgba(19,60,42,0.06)]">
      <CardContent className="flex items-start gap-4 p-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-[#133C2A]/58">{title}</p>
          <p className="mt-2 text-2xl text-[#133C2A]">{value}</p>
          <p className="mt-2 text-xs text-[#133C2A]/52">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}
