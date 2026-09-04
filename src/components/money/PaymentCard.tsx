import { MoreHorizontal, Send } from 'lucide-react';
import { AdminPaymentRecord } from '../../lib/backendApi';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { ResponsiveActionMenu, ResponsiveActionMenuItem } from '../ui/responsive-action-menu';
import { PaymentTypeBadge } from './PaymentTypeBadge';
import { MoneyPaymentType, derivePaymentType, formatMoney, formatShortDate, getDisplayPaymentStatus, getPaymentMethodLabel, getPaymentStatusLabel } from './moneyTypes';

function primaryActionLabel(payment: AdminPaymentRecord, type: MoneyPaymentType): string {
  if (payment.paymentMethod === 'cash' && payment.status !== 'paid' && !['cancelled', 'refunded', 'expired'].includes(payment.status)) {
    return 'Подтвердить';
  }
  if (payment.status === 'pending') return 'Проверить';
  if (payment.status === 'overdue') return 'Напомнить';
  if (payment.status === 'unpaid' && type === 'trial') return 'Напомнить';
  if (payment.status === 'paid') return 'Открыть';
  return 'Открыть';
}

function getDueLine(payment: AdminPaymentRecord): string {
  if (!payment.dueDate) return getPaymentStatusLabel(payment.status);
  const dueDate = new Date(payment.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    return `${getPaymentStatusLabel(payment.status)} до ${formatShortDate(payment.dueDate)}`;
  }
  if (payment.status === 'overdue') {
    const now = new Date();
    const diffDays = Math.max(1, Math.ceil((now.getTime() - dueDate.getTime()) / 86_400_000));
    return `Просрочено на ${diffDays} дн.`;
  }
  return `${getPaymentStatusLabel(payment.status)} до ${formatShortDate(payment.dueDate)}`;
}

function canChangeMethod(payment: AdminPaymentRecord): boolean {
  return !['paid', 'cancelled', 'refunded', 'expired'].includes(payment.status);
}

function canDelete(payment: AdminPaymentRecord): boolean {
  return payment.status !== 'paid';
}

function statusBadgeTone(status?: string | null): string {
  const displayStatus = getDisplayPaymentStatus(status);
  if (displayStatus === 'paid') return 'border-green-200 bg-green-50 text-green-700';
  if (displayStatus === 'overdue') return 'border-red-200 bg-red-50 text-red-700';
  if (displayStatus === 'cancelled') return 'border-slate-200 bg-slate-100 text-slate-700';
  return 'border-[#D4AF37]/30 bg-[#FFF9E8] text-[#8B6B00]';
}

export function PaymentCard({
  payment,
  onOpen,
  onRemind,
  onCopyLink,
  onConfirm,
  onCancel,
  onMarkCash,
  onChangeMethod,
  onChangeDueDate,
  onOpenClient,
  onCallParent,
  onDelete,
  isDeleting,
}: {
  payment: AdminPaymentRecord;
  onOpen: (payment: AdminPaymentRecord) => void;
  onRemind?: (payment: AdminPaymentRecord) => void;
  onCopyLink?: (payment: AdminPaymentRecord) => void;
  onConfirm?: (payment: AdminPaymentRecord) => void;
  onCancel?: (payment: AdminPaymentRecord) => void;
  onMarkCash?: (payment: AdminPaymentRecord) => void;
  onChangeMethod?: (payment: AdminPaymentRecord) => void;
  onChangeDueDate?: (payment: AdminPaymentRecord) => void;
  onOpenClient?: (payment: AdminPaymentRecord) => void;
  onCallParent?: (payment: AdminPaymentRecord) => void;
  onDelete?: (payment: AdminPaymentRecord) => void;
  isDeleting?: boolean;
}) {
  const paymentType = derivePaymentType(payment);
  const mainAction = primaryActionLabel(payment, paymentType);

  const menuActions: ResponsiveActionMenuItem[] = [
    { key: 'open', label: 'Открыть', onClick: () => onOpen(payment) },
    ...(onOpenClient ? [{ key: 'open-client', label: 'Открыть клиента', onClick: () => onOpenClient(payment) }] : []),
    ...(onCopyLink ? [{ key: 'copy-link', label: 'Скопировать ссылку', onClick: () => onCopyLink(payment) }] : []),
    ...(onChangeDueDate ? [{ key: 'change-due', label: 'Изменить срок', onClick: () => onChangeDueDate(payment) }] : []),
    ...(onChangeMethod && canChangeMethod(payment)
      ? [{ key: 'change-method', label: 'Способ оплаты', onClick: () => onChangeMethod(payment) }]
      : []),
    ...(onMarkCash && payment.paymentMethod === 'cash' && !['paid', 'cancelled', 'refunded', 'expired'].includes(payment.status)
      ? [{ key: 'mark-cash', label: 'Подтвердить наличные', onClick: () => onMarkCash(payment) }]
      : []),
    ...(onConfirm && payment.status === 'pending' && payment.paymentMethod !== 'cash'
      ? [{ key: 'confirm', label: 'Подтвердить', onClick: () => onConfirm(payment) }]
      : []),
    ...(onCancel && !['paid', 'cancelled', 'refunded'].includes(payment.status)
      ? [{ key: 'cancel', label: 'Отменить счет', onClick: () => onCancel(payment) }]
      : []),
    ...(onCallParent && payment.parentPhone ? [{ key: 'call', label: 'Позвонить', onClick: () => onCallParent(payment) }] : []),
    ...(onDelete && canDelete(payment)
      ? [{ key: 'delete', label: isDeleting ? 'Удаляем...' : 'Удалить', onClick: () => onDelete(payment), disabled: isDeleting, destructive: true }]
      : []),
  ];

  return (
    <Card
      onClick={() => onOpen(payment)}
      className={`cursor-pointer border-none bg-white/95 shadow-[0_12px_28px_rgba(19,60,42,0.06)] transition-shadow hover:shadow-[0_16px_36px_rgba(19,60,42,0.12)] ${payment.status === 'overdue' ? 'ring-1 ring-[#D14343]/20' : ''}`}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={`rounded-full border ${statusBadgeTone(payment.status)}`}>
                {getPaymentStatusLabel(payment.status)}
              </Badge>
              <PaymentTypeBadge type={paymentType} />
            </div>
            <p className="mt-2 text-base leading-tight text-[#133C2A]">{payment.childName || 'Ребенок не указан'}</p>
            <p className="mt-1 text-sm text-[#133C2A]/62">
              Мама: {payment.parentName || payment.parentPhone || '—'}
            </p>
          </div>
          <ResponsiveActionMenu
            title="Что сделать со счетом"
            items={menuActions}
            trigger={
              <Button
                size="icon"
                variant="outline"
                className="shrink-0 rounded-2xl border-[#133C2A]/15 bg-white text-[#133C2A] shadow-sm hover:bg-[#F8F4E3]"
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            }
          />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm text-[#133C2A]/68">{payment.subscriptionName}</p>
            <p className="text-sm text-[#133C2A]/52">Способ: {getPaymentMethodLabel(payment.paymentMethod)}</p>
          </div>
          <p className="shrink-0 text-2xl leading-none text-[#133C2A]">{formatMoney(payment.amount)}</p>
        </div>

        <p className="text-sm text-[#133C2A]/60">{getDueLine(payment)}</p>

        <div className="grid grid-cols-2 gap-2" onClick={(event) => event.stopPropagation()}>
          {mainAction === 'Подтвердить' && onMarkCash ? (
            <Button className="rounded-2xl" onClick={() => onMarkCash(payment)}>
              Подтвердить
            </Button>
          ) : mainAction === 'Напомнить' && onRemind ? (
            <Button className="rounded-2xl" onClick={() => onRemind(payment)}>
              <Send className="mr-2 h-4 w-4" />
              Напомнить
            </Button>
          ) : (
            <Button className="rounded-2xl" onClick={() => onOpen(payment)}>
              {mainAction}
            </Button>
          )}
          {onChangeMethod && canChangeMethod(payment) ? (
            <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={() => onChangeMethod(payment)}>
              Способ оплаты
            </Button>
          ) : (
            <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={() => onOpen(payment)}>
              Открыть
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
