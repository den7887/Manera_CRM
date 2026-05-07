import { CalendarClock, CreditCard, ReceiptText, ShieldCheck, UserRound } from 'lucide-react';
import { AdminPaymentRecord } from '../../lib/backendApi';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { Button } from '../ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';
import { PaymentStatusBadge } from '../payments/PaymentStatusBadge';
import { PaymentTypeBadge } from './PaymentTypeBadge';
import { PaymentTimeline } from './PaymentTimeline';
import { MoneyJournalEntry, derivePaymentType, formatDateTime, formatMoney, formatShortDate } from './moneyTypes';

export function PaymentDetailsSheet({
  open,
  onOpenChange,
  payment,
  events,
  onRemind,
  onConfirm,
  onCancel,
  onMarkCash,
  onChangeDueDate,
  onOpenClient,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: AdminPaymentRecord | null;
  events: MoneyJournalEntry[];
  onRemind?: (payment: AdminPaymentRecord) => void;
  onConfirm?: (payment: AdminPaymentRecord) => void;
  onCancel?: (payment: AdminPaymentRecord) => void;
  onMarkCash?: (payment: AdminPaymentRecord) => void;
  onChangeDueDate?: (payment: AdminPaymentRecord) => void;
  onOpenClient?: (payment: AdminPaymentRecord) => void;
}) {
  const isMobile = useIsMobile();
  if (!payment) return null;

  const body = (
    <div className="space-y-5 overflow-y-auto px-4 pb-5">
      <div className="rounded-3xl bg-[#F8F4E3]/72 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <PaymentStatusBadge status={payment.status} />
          <PaymentTypeBadge type={derivePaymentType(payment)} />
        </div>
        <p className="mt-4 text-2xl leading-tight text-[#133C2A]">{payment.childName || 'Ребенок не указан'}</p>
        <p className="mt-1 text-sm text-[#133C2A]/62">Родитель: {payment.parentName || payment.parentPhone || '—'}</p>
        <p className="mt-3 text-3xl leading-none text-[#133C2A]">{formatMoney(payment.amount)}</p>
      </div>

      <section className="grid gap-3">
        <div className="rounded-2xl border border-[#133C2A]/10 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-[#133C2A]/55">
            <ReceiptText className="h-4 w-4" />
            <span>Главное</span>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-[#133C2A]">
            <p>Счет: {payment.invoiceNumber || '—'}</p>
            <p>Тип: {payment.subscriptionName}</p>
            <p>Срок оплаты: {formatShortDate(payment.dueDate)}</p>
            <p>Способ: {payment.paymentMethod === 'cash' ? 'Наличные' : 'Онлайн'}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#133C2A]/10 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-[#133C2A]/55">
            <UserRound className="h-4 w-4" />
            <span>Контакт</span>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-[#133C2A]">
            <p>{payment.parentName || 'Родитель не указан'}</p>
            <p>{payment.parentPhone || 'Телефон не указан'}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#133C2A]/10 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-[#133C2A]/55">
            <CalendarClock className="h-4 w-4" />
            <span>Действия</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {onRemind && !['paid', 'cancelled', 'refunded', 'expired'].includes(payment.status) ? (
              <Button variant="outline" className="rounded-2xl" onClick={() => onRemind(payment)}>Напомнить</Button>
            ) : null}
            {onConfirm && payment.status === 'pending' ? (
              <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" onClick={() => onConfirm(payment)}>Подтвердить</Button>
            ) : null}
            {onMarkCash && payment.paymentMethod === 'cash' && payment.status !== 'paid' ? (
              <Button variant="outline" className="rounded-2xl" onClick={() => onMarkCash(payment)}>Наличные</Button>
            ) : null}
            {onChangeDueDate ? (
              <Button variant="outline" className="rounded-2xl" onClick={() => onChangeDueDate(payment)}>Изменить срок</Button>
            ) : null}
            {onCancel && !['paid', 'cancelled', 'refunded'].includes(payment.status) ? (
              <Button variant="outline" className="rounded-2xl" onClick={() => onCancel(payment)}>Отменить</Button>
            ) : null}
            {onOpenClient ? (
              <Button variant="outline" className="rounded-2xl" onClick={() => onOpenClient(payment)}>Открыть клиента</Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-[#133C2A]/10 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-[#133C2A]/55">
            <ShieldCheck className="h-4 w-4" />
            <span>История платежа</span>
          </div>
          <div className="mt-3">
            <PaymentTimeline entries={events} />
          </div>
          <p className="mt-3 text-xs text-[#133C2A]/52">Создан: {formatDateTime(payment.createdAt)}</p>
        </div>
      </section>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh] rounded-t-[28px] border-none bg-[#FCFBF6]">
          <DrawerHeader>
            <DrawerTitle className="text-[#133C2A]">Платеж</DrawerTitle>
            <DrawerDescription>Детали, действия и история платежа</DrawerDescription>
          </DrawerHeader>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[560px] overflow-y-auto bg-[#FCFBF6] p-0">
        <SheetHeader className="border-b border-[#133C2A]/10">
          <SheetTitle className="text-[#133C2A]">Платеж</SheetTitle>
          <SheetDescription>Детали, действия и история платежа</SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  );
}

