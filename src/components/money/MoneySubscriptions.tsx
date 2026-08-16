import { useEffect, useMemo, useState } from 'react';
import { Plus, Users, Ticket, DollarSign } from 'lucide-react';
import { OwnerPricingPlanDto } from '../../lib/backendApi';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { SubscriptionMoneyCard } from './SubscriptionMoneyCard';
import { MoneyEmptyState } from './MoneyEmptyState';
import { MoneySubscriptionFilter, MoneySubscriptionRecord, formatMoney, moneySubscriptionStatusLabels } from './moneyTypes';

export function MoneySubscriptions({
  subscriptions,
  pricingPlans,
  activeFilter,
  onCreateInvoice,
  onOpenSubscription,
  onOpenPayments,
  onOpenPricing,
  compactHeader = false,
}: {
  subscriptions: MoneySubscriptionRecord[];
  pricingPlans: OwnerPricingPlanDto[];
  activeFilter?: MoneySubscriptionFilter;
  onCreateInvoice: () => void;
  onOpenSubscription: (subscription: MoneySubscriptionRecord) => void;
  onOpenPayments: (subscription: MoneySubscriptionRecord) => void;
  onOpenPricing?: () => void;
  compactHeader?: boolean;
}) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'tariffs' | 'subscriptions'>(activeFilter && activeFilter !== 'all' ? 'subscriptions' : 'tariffs');

  useEffect(() => {
    if (activeFilter && activeFilter !== 'all') {
      setActiveTab('subscriptions');
    }
  }, [activeFilter]);

  const activeSubs = useMemo(
    () => subscriptions.filter((subscription) => subscription.status === 'active' || subscription.status === 'not_started'),
    [subscriptions],
  );
  const totalRevenue = useMemo(
    () => activeSubs.reduce((sum, subscription) => sum + Number(subscription.amount || 0), 0),
    [activeSubs],
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {!compactHeader ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[#133C2A]">Абонементы</h1>
            <p className="mt-1 text-sm text-[#133C2A]/60">Управление тарифами и подписками</p>
          </div>
          <Button className="rounded-2xl bg-[#133C2A]" onClick={onOpenPricing || onCreateInvoice}>
            <Plus className="mr-2 h-4 w-4" />
            Создать тариф
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SummaryCard title="Активных абонементов" value={String(activeSubs.length)} subtitle="Доступ к занятиям открыт" icon={Ticket} iconClassName="bg-[#F8F0FF] text-[#7C3AED]" />
        <SummaryCard title="Тарифных планов" value={String(pricingPlans.length)} subtitle="Доступно для продажи" icon={Users} iconClassName="bg-[#EEF5F0] text-[#133C2A]" />
        <SummaryCard title="Выручка" value={formatMoney(totalRevenue)} subtitle="По активным абонементам" icon={DollarSign} iconClassName="bg-[#F8F4E3] text-[#8B6B00]" />
      </div>

      <div className="border-b border-[#133C2A]/10">
        <nav className="flex gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('tariffs')}
            className={`border-b-2 px-1 pb-4 pt-1 text-sm transition-colors ${activeTab === 'tariffs' ? 'border-[#133C2A] text-[#133C2A]' : 'border-transparent text-[#133C2A]/58'}`}
          >
            Тарифные планы
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            className={`border-b-2 px-1 pb-4 pt-1 text-sm transition-colors ${activeTab === 'subscriptions' ? 'border-[#133C2A] text-[#133C2A]' : 'border-transparent text-[#133C2A]/58'}`}
          >
            Активные подписки
          </button>
        </nav>
      </div>

      {activeTab === 'tariffs' ? (
        pricingPlans.length === 0 ? (
          <MoneyEmptyState title="Тарифных планов пока нет" description="Создайте первый тариф, чтобы продавать пробные и абонементы." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card key={plan.id} className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg text-[#133C2A]">{plan.title}</h3>
                      <p className="mt-1 text-sm text-[#133C2A]/58">
                        {plan.classes_tracked ? 'Пакет занятий' : 'Подписка по сроку'}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${plan.is_active ? 'bg-[#EEF5F0] text-[#133C2A]' : 'bg-slate-100 text-slate-600'}`}>
                      {plan.is_active ? 'Активен' : 'Выключен'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <Row label="Цена" value={formatMoney(plan.price)} />
                    {plan.classes_tracked ? <Row label="Занятий" value={String(plan.classes_count || 0)} /> : null}
                    <Row label="Срок действия" value={`${plan.duration_days} дней`} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={onOpenPricing}>
                      Редактировать
                    </Button>
                    <Button className="rounded-2xl bg-[#133C2A]" onClick={onCreateInvoice}>
                      Продать
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : subscriptions.length === 0 ? (
        <MoneyEmptyState title="Активных подписок пока нет" description="После оплаты и активации абонементы будут появляться здесь." />
      ) : isMobile ? (
        <div className="space-y-3">
          {subscriptions.map((subscription) => (
            <SubscriptionMoneyCard
              key={subscription.id}
              subscription={subscription}
              onOpen={onOpenSubscription}
              onOpenPayments={onOpenPayments}
            />
          ))}
        </div>
      ) : (
        <Card className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#133C2A]/10">
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Клиент</th>
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Тариф</th>
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Начало</th>
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Окончание</th>
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Остаток</th>
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Статус</th>
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((subscription) => (
                    <tr key={subscription.id} className="border-b border-[#133C2A]/8 hover:bg-[#F8F4E3]/28">
                      <td className="px-4 py-3 text-sm text-[#133C2A]">{subscription.childName}</td>
                      <td className="px-4 py-3 text-sm text-[#133C2A]">{subscription.planTitle}</td>
                      <td className="px-4 py-3 text-sm text-[#133C2A]/62">{subscription.startsAt ? new Date(subscription.startsAt).toLocaleDateString('ru-RU') : '—'}</td>
                      <td className="px-4 py-3 text-sm text-[#133C2A]/62">{subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString('ru-RU') : '—'}</td>
                      <td className="px-4 py-3 text-sm text-[#133C2A]">
                        {subscription.lessonsTracked ? `${subscription.remainingLessons ?? 0}` : '∞'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[#EEF5F0] px-2.5 py-1 text-xs text-[#133C2A]">
                          {moneySubscriptionStatusLabels[subscription.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="rounded-xl border-[#133C2A]/15" onClick={() => onOpenSubscription(subscription)}>
                            Открыть
                          </Button>
                          <Button size="sm" className="rounded-xl bg-[#133C2A]" onClick={() => onOpenPayments(subscription)}>
                            Продлить
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Ticket;
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[#133C2A]/58">{label}</span>
      <span className="text-[#133C2A]">{value}</span>
    </div>
  );
}
