import { MoreHorizontal, Phone, Send } from 'lucide-react';
import { AdminPaymentRecord } from '../../lib/backendApi';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { PaymentStatusBadge } from '../payments/PaymentStatusBadge';
import { PaymentTypeBadge } from './PaymentTypeBadge';
import { MoneyPaymentType, derivePaymentType, formatMoney, formatShortDate, getPaymentStatusLabel } from './moneyTypes';

function primaryActionLabel(payment: AdminPaymentRecord, type: MoneyPaymentType): string {
  if (payment.status === 'pending') return 'Проверить';
  if (payment.status === 'overdue') return 'Напомнить';
  if (payment.status === 'unpaid' && type === 'trial') return 'Напомнить';
  if (payment.status === 'paid') return 'Открыть';
  return 'Открыть';
}

export function PaymentCard({
  payment,
  onOpen,
  onRemind,
  onCopyLink,
  onConfirm,
  onCancel,
  onMarkCash,
  onChangeDueDate,
  onOpenClient,
}: {
  payment: AdminPaymentRecord;
  onOpen: (payment: AdminPaymentRecord) => void;
  onRemind?: (payment: AdminPaymentRecord) => void;
  onCopyLink?: (payment: AdminPaymentRecord) => void;
  onConfirm?: (payment: AdminPaymentRecord) => void;
  onCancel?: (payment: AdminPaymentRecord) => void;
  onMarkCash?: (payment: AdminPaymentRecord) => void;
  onChangeDueDate?: (payment: AdminPaymentRecord) => void;
  onOpenClient?: (payment: AdminPaymentRecord) => void;
}) {
  const paymentType = derivePaymentType(payment);
  const mainAction = primaryActionLabel(payment, paymentType);

  return (
    <Card className={`border-none bg-white/95 shadow-[0_12px_28px_rgba(19,60,42,0.06)] ${payment.status === 'overdue' ? 'ring-1 ring-[#D14343]/20' : ''}`}>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PaymentStatusBadge status={payment.status} />
              <PaymentTypeBadge type={paymentType} />
            </div>
            <p className="mt-3 text-lg leading-tight text-[#133C2A]">{payment.childName || 'Ребенок не указан'}</p>
            <p className="mt-1 text-sm text-[#133C2A]/62">
              Мама: {payment.parentName || payment.parentPhone || '—'}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="rounded-2xl text-[#133C2A]/60">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl">
              <DropdownMenuItem onClick={() => onOpen(payment)}>Открыть</DropdownMenuItem>
              {onOpenClient ? <DropdownMenuItem onClick={() => onOpenClient(payment)}>Открыть клиента</DropdownMenuItem> : null}
              {onCopyLink ? <DropdownMenuItem onClick={() => onCopyLink(payment)}>Скопировать ссылку</DropdownMenuItem> : null}
              {onChangeDueDate ? <DropdownMenuItem onClick={() => onChangeDueDate(payment)}>Изменить срок</DropdownMenuItem> : null}
              {onMarkCash && payment.paymentMethod === 'cash' && payment.status !== 'paid' ? (
                <DropdownMenuItem onClick={() => onMarkCash(payment)}>Отметить наличными</DropdownMenuItem>
              ) : null}
              {onConfirm && payment.status === 'pending' ? <DropdownMenuItem onClick={() => onConfirm(payment)}>Подтвердить</DropdownMenuItem> : null}
              {onCancel && !['paid', 'cancelled', 'refunded'].includes(payment.status) ? (
                <DropdownMenuItem onClick={() => onCancel(payment)}>Отменить счет</DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(payment.parentPhone || '')}>
                <Phone className="mr-2 h-4 w-4" />
                Скопировать телефон
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-[#133C2A]/68">{payment.subscriptionName}</p>
          <p className="text-3xl leading-none text-[#133C2A]">{formatMoney(payment.amount)}</p>
          <p className="text-sm text-[#133C2A]/60">
            {getPaymentStatusLabel(payment.status)}
            {payment.dueDate ? ` до ${formatShortDate(payment.dueDate)}` : ''}
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8F4E3]/70 p-3 text-sm text-[#133C2A]/62">
          <p>Счет: {payment.invoiceNumber || '—'}</p>
          <p className="mt-1">Напоминаний: {payment.reminderCount || 0}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {mainAction === 'Напомнить' && onRemind ? (
            <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" onClick={() => onRemind(payment)}>
              <Send className="mr-2 h-4 w-4" />
              Напомнить
            </Button>
          ) : (
            <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" onClick={() => onOpen(payment)}>
              {mainAction}
            </Button>
          )}
          <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={() => onOpen(payment)}>
            Открыть
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

