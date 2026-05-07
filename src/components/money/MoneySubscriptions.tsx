import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { SubscriptionMoneyCard } from './SubscriptionMoneyCard';
import { MoneyEmptyState } from './MoneyEmptyState';
import { MoneySubscriptionFilter, MoneySubscriptionRecord, moneySubscriptionStatusLabels } from './moneyTypes';

const filterOptions: Array<{ id: MoneySubscriptionFilter; label: string }> = [
  { id: 'active', label: 'Активные' },
  { id: 'ending_soon', label: 'Скоро закончатся' },
  { id: 'expired', label: 'Закончились' },
  { id: 'frozen', label: 'Заморозка' },
  { id: 'payment_required', label: 'Без оплаты' },
  { id: 'all', label: 'Все' },
];

export function MoneySubscriptions({
  subscriptions,
  filter,
  onChangeFilter,
  onCreateInvoice,
  onOpenSubscription,
  onOpenPayments,
}: {
  subscriptions: MoneySubscriptionRecord[];
  filter: MoneySubscriptionFilter;
  onChangeFilter: (filter: MoneySubscriptionFilter) => void;
  onCreateInvoice: () => void;
  onOpenSubscription: (subscription: MoneySubscriptionRecord) => void;
  onOpenPayments: (subscription: MoneySubscriptionRecord) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A]">Абонементы</h1>
          <p className="mt-1 text-sm text-[#133C2A]/60">Контроль доступа к занятиям, остатков и продлений.</p>
        </div>
        <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" onClick={onCreateInvoice}>
          <Plus className="mr-2 h-4 w-4" />
          Создать / продлить
        </Button>
      </div>

      <div className="mobile-scroll-x rounded-2xl border border-[#133C2A]/10 bg-white/80 p-1">
        <div className="flex min-w-max gap-1">
          {filterOptions.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={filter === item.id ? 'default' : 'ghost'}
              className={filter === item.id ? 'rounded-xl bg-[#133C2A]' : 'rounded-xl text-[#133C2A]/68'}
              onClick={() => onChangeFilter(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {subscriptions.length === 0 ? (
        <MoneyEmptyState
          title="Активных абонементов пока нет"
          description="После оплаты абонементы будут появляться здесь автоматически."
          action={
            <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" onClick={onCreateInvoice}>
              Создать счет
            </Button>
          }
        />
      ) : (
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
      )}
    </div>
  );
}

