import { ChevronRight, CreditCard, Settings2 } from 'lucide-react';
import { OwnerPricingPlanDto } from '../../lib/backendApi';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { MoneySubscriptionFilter, MoneySubscriptionRecord } from './moneyTypes';
import { MoneySubscriptions } from './MoneySubscriptions';

export function MoneyMore({
  subscriptions,
  subscriptionFilter,
  pricingPlans,
  onCreateInvoice,
  onOpenSubscription,
  onOpenPayments,
  onOpenPricing,
}: {
  subscriptions: MoneySubscriptionRecord[];
  subscriptionFilter: MoneySubscriptionFilter;
  pricingPlans: OwnerPricingPlanDto[];
  onCreateInvoice: () => void;
  onOpenSubscription: (subscription: MoneySubscriptionRecord) => void;
  onOpenPayments: (subscription: MoneySubscriptionRecord) => void;
  onOpenPricing?: () => void;
}) {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-[#133C2A]">Еще</h1>
        <p className="mt-1 text-sm text-[#133C2A]/60">Здесь собраны абонементы и служебные переходы без перегруза основного money-раздела.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-3xl border border-[#133C2A]/10 bg-white/92 p-5 text-left shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF5F0] text-[#133C2A]">
              <CreditCard className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-base text-[#133C2A]">Абонементы</p>
          <p className="mt-1 text-sm text-[#133C2A]/60">Сроки, остатки занятий, продления и неоплаченные абонементы.</p>
        </div>

        <button
          type="button"
          onClick={onOpenPricing}
          className="rounded-3xl border border-[#133C2A]/10 bg-white/92 p-5 text-left shadow-[0_12px_28px_rgba(19,60,42,0.06)] transition hover:border-[#D4AF37]/30"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F8F4E3] text-[#8B6B00]">
              <Settings2 className="h-5 w-5" />
            </span>
            <ChevronRight className="h-4 w-4 text-[#133C2A]/45" />
          </div>
          <p className="mt-4 text-base text-[#133C2A]">Тарифы и общие настройки</p>
          <p className="mt-1 text-sm text-[#133C2A]/60">Переход в отдельный раздел, где настраиваются планы и бизнес-параметры.</p>
        </button>
      </div>

      <Card className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-[#133C2A]">Абонементы</CardTitle>
          <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={onOpenPricing}>
            Открыть тарифы
          </Button>
        </CardHeader>
        <CardContent>
          <MoneySubscriptions
            subscriptions={subscriptions}
            pricingPlans={pricingPlans}
            activeFilter={subscriptionFilter}
            onCreateInvoice={onCreateInvoice}
            onOpenSubscription={onOpenSubscription}
            onOpenPayments={onOpenPayments}
            onOpenPricing={onOpenPricing}
            compactHeader
          />
        </CardContent>
      </Card>
    </div>
  );
}
