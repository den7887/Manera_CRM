import { ReactNode } from 'react';
import { ArrowUpRight, CheckCircle2, CreditCard, MessageSquareText, Receipt, Send } from 'lucide-react';
import { AdminPaymentRecord } from '../../lib/backendApi';
import { PaymentStatusBadge, isOutstandingPaymentStatus } from './PaymentStatusBadge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

interface PaymentCardProps {
  payment: AdminPaymentRecord;
  onConfirmCash?: (payment: AdminPaymentRecord) => void;
  onSendReminder?: (payment: AdminPaymentRecord) => void;
  onOpenClient?: (payment: AdminPaymentRecord) => void;
  onSetStatus?: (payment: AdminPaymentRecord) => void;
  isConfirming?: boolean;
  isReminding?: boolean;
  statusControl?: ReactNode;
  primaryActionLabel?: string;
}

export function PaymentCard({
  payment,
  onConfirmCash,
  onSendReminder,
  onOpenClient,
  onSetStatus,
  isConfirming,
  isReminding,
  statusControl,
}: PaymentCardProps) {
  const canConfirmCash = payment.paymentMethod === 'cash' && payment.status !== 'paid' && Boolean(onConfirmCash);
  const canRemind = isOutstandingPaymentStatus(payment.status) && Boolean(onSendReminder);

  return (
    <Card className="overflow-hidden border-[#133C2A]/10 bg-white/92 shadow-[0_10px_28px_rgba(19,60,42,0.06)]">
      <CardContent className="p-0">
        <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr_260px]">
          <div className="p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <PaymentStatusBadge status={payment.status} />
                  <span className="rounded-full border border-[#133C2A]/10 bg-[#F8F4E3] px-2.5 py-1 text-xs text-[#133C2A]/70">
                    {payment.paymentMethod === 'cash' ? 'Наличные' : 'Онлайн'}
                  </span>
                </div>
                <div>
                  <p className="text-lg leading-tight text-[#133C2A]">{payment.parentName || payment.parentPhone || 'Родитель'}</p>
                  <p className="mt-1 text-sm text-[#133C2A]/65">
                    {payment.childName || 'Ребенок не указан'}
                    {payment.subscriptionName ? ` • ${payment.subscriptionName}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-left xl:text-right">
                <p className="text-2xl text-[#133C2A]">{Number(payment.amount || 0).toLocaleString('ru-RU')} ₽</p>
                <p className="mt-1 text-xs text-[#133C2A]/55">
                  Счет: {payment.invoiceNumber || '—'}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-sm text-[#133C2A]/68 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl bg-[#F8F4E3]/65 p-3">
                <p className="text-xs text-[#133C2A]/45">Создан</p>
                <p className="mt-1 text-[#133C2A]">{formatDateTime(payment.createdAt)}</p>
              </div>
              <div className="rounded-2xl bg-[#F8F4E3]/65 p-3">
                <p className="text-xs text-[#133C2A]/45">Срок оплаты</p>
                <p className="mt-1 text-[#133C2A]">{formatDate(payment.dueDate)}</p>
              </div>
              <div className="rounded-2xl bg-[#F8F4E3]/65 p-3">
                <p className="text-xs text-[#133C2A]/45">Напоминаний</p>
                <p className="mt-1 text-[#133C2A]">
                  {payment.reminderCount || 0}
                  {payment.lastReminderAt ? ` • ${formatDate(payment.lastReminderAt)}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="border-y border-[#133C2A]/8 bg-[#fbf7e8]/72 p-4 md:p-5 xl:border-x xl:border-y-0">
            <div className="space-y-3">
              <div className="rounded-2xl border border-[#133C2A]/10 bg-white px-3 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[#133C2A]/38">Что важно</p>
                <p className="mt-2 text-sm leading-relaxed text-[#133C2A]">
                  {payment.status === 'pending'
                    ? 'Родитель отметил оплату. Нужно проверить и подтвердить.'
                    : payment.status === 'unpaid'
                      ? 'Счет выставлен, но оплата еще не поступила.'
                      : payment.status === 'overdue'
                        ? 'Срок оплаты прошел. Лучше отправить напоминание.'
                        : payment.status === 'paid'
                          ? 'Оплата закрыта. Дополнительных действий не требуется.'
                          : 'Платеж требует ручного внимания.'}
                </p>
              </div>

              <div className="space-y-2 text-sm text-[#133C2A]/68">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-[#D4AF37]" />
                  <span>{payment.invoiceComment || 'Без комментария к счету'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#D4AF37]" />
                  <span>{payment.parentPhone || 'Телефон не указан'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-5">
            <div className="flex h-full flex-col gap-2">
              {canConfirmCash ? (
                <Button
                  onClick={() => onConfirmCash?.(payment)}
                  disabled={isConfirming}
                  className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {isConfirming ? 'Подтверждаем...' : 'Подтвердить оплату'}
                </Button>
              ) : null}

              {canRemind ? (
                <Button
                  variant="outline"
                  onClick={() => onSendReminder?.(payment)}
                  disabled={isReminding}
                  className="rounded-2xl border-[#133C2A]/15"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isReminding ? 'Отправляем...' : 'Напомнить'}
                </Button>
              ) : null}

              {onOpenClient ? (
                <Button
                  variant="outline"
                  onClick={() => onOpenClient(payment)}
                  className="rounded-2xl border-[#133C2A]/15"
                >
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Открыть клиента
                </Button>
              ) : null}

              <Button
                variant="outline"
                disabled
                className="rounded-2xl border-dashed border-[#133C2A]/15 text-[#133C2A]/42"
              >
                <MessageSquareText className="mr-2 h-4 w-4" />
                Написать родителю
              </Button>

              {statusControl ? (
                <div className="mt-auto rounded-2xl border border-[#133C2A]/10 bg-[#F8F4E3]/55 p-3">
                  <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[#133C2A]/38">Статус</p>
                  {statusControl}
                  {onSetStatus ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full rounded-xl"
                      onClick={() => onSetStatus(payment)}
                    >
                      Применить
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
