import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import { AdminPaymentRecord } from '../../lib/backendApi';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { PaymentCard } from './PaymentCard';
import { MoneyEmptyState } from './MoneyEmptyState';
import { MoneyPaymentFiltersState, MoneyPaymentQueue, MoneyPaymentType, moneyQueueLabels } from './moneyTypes';

const queueOrder: MoneyPaymentQueue[] = ['all', 'review', 'waiting', 'overdue', 'paid', 'trial', 'cash', 'online', 'problem'];

export function MoneyPayments({
  payments,
  filters,
  onChangeFilters,
  onOpenFilters,
  onCreateInvoice,
  onOpenPayment,
  onRemind,
  onCopyLink,
  onConfirm,
  onCancel,
  onMarkCash,
  onChangeDueDate,
  activeContextLabel,
}: {
  payments: AdminPaymentRecord[];
  filters: MoneyPaymentFiltersState;
  onChangeFilters: (next: MoneyPaymentFiltersState) => void;
  onOpenFilters: () => void;
  onCreateInvoice: () => void;
  onOpenPayment: (payment: AdminPaymentRecord) => void;
  onRemind: (payment: AdminPaymentRecord) => void;
  onCopyLink: (payment: AdminPaymentRecord) => void;
  onConfirm: (payment: AdminPaymentRecord) => void;
  onCancel: (payment: AdminPaymentRecord) => void;
  onMarkCash: (payment: AdminPaymentRecord) => void;
  onChangeDueDate: (payment: AdminPaymentRecord) => void;
  activeContextLabel?: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A]">Оплаты</h1>
          <p className="mt-1 text-sm text-[#133C2A]/60">Все платежи, проверки, долги и ручные подтверждения.</p>
        </div>
        <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" onClick={onCreateInvoice}>
          <Plus className="mr-2 h-4 w-4" />
          Выставить счет
        </Button>
      </div>

      {activeContextLabel ? (
        <div className="rounded-2xl border border-[#D4AF37]/35 bg-[#FFF9E8] px-4 py-3 text-sm text-[#8B6B00]">
          {activeContextLabel}
        </div>
      ) : null}

      <div className="mobile-scroll-x rounded-2xl border border-[#133C2A]/10 bg-white/80 p-1">
        <div className="flex min-w-max gap-1">
          {queueOrder.map((queue) => (
            <Button
              key={queue}
              size="sm"
              variant={filters.queue === queue ? 'default' : 'ghost'}
              className={filters.queue === queue ? 'rounded-xl bg-[#133C2A]' : 'rounded-xl text-[#133C2A]/68'}
              onClick={() => onChangeFilters({ ...filters, queue })}
            >
              {moneyQueueLabels[queue]}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#133C2A]/40" />
          <Input
            className="rounded-2xl pl-9"
            placeholder="Поиск по ребенку, родителю, счету"
            value={filters.search}
            onChange={(event) => onChangeFilters({ ...filters, search: event.target.value })}
          />
        </div>
        <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={onOpenFilters}>
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Фильтры
        </Button>
      </div>

      {payments.length === 0 ? (
        <MoneyEmptyState
          title="Платежей пока нет"
          description="Создайте первый счет для пробного занятия или абонемента."
          action={
            <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" onClick={onCreateInvoice}>
              Выставить счет
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              onOpen={onOpenPayment}
              onRemind={onRemind}
              onCopyLink={onCopyLink}
              onConfirm={onConfirm}
              onCancel={onCancel}
              onMarkCash={onMarkCash}
              onChangeDueDate={onChangeDueDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

