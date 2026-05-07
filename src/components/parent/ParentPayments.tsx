import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Receipt } from 'lucide-react';
import { Child, Payment } from '../../types';
import { ParentAccessInfo, ParentSubscriptionDto, loadMySubscriptions } from '../../lib/backendApi';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface ParentPaymentsProps {
  payments: Payment[];
  children: Child[];
  accessInfo?: ParentAccessInfo | null;
  onPayOnline: (paymentId: string) => Promise<void>;
  onConfirmManualPayment: (paymentId: string) => Promise<void>;
}

const paymentStatusLabels: Record<string, string> = {
  pending: 'Ожидает оплаты',
  waiting_confirmation: 'Ожидает подтверждения',
  paid: 'Оплачено',
  failed: 'Ошибка',
  cancelled: 'Отменено',
  expired: 'Истекло',
  overdue: 'Просрочено',
  unpaid: 'Не оплачено',
};

export function ParentPayments({ payments, accessInfo, onPayOnline, onConfirmManualPayment }: ParentPaymentsProps) {
  const [subscriptions, setSubscriptions] = useState<ParentSubscriptionDto[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setSubscriptions(await loadMySubscriptions());
      } catch {
        setSubscriptions([]);
      }
    };
    void load();
  }, []);

  const sortedPayments = useMemo(() => [...payments].sort((a, b) => b.date.getTime() - a.date.getTime()), [payments]);
  const duePayments = sortedPayments.filter((item) =>
    ['pending', 'waiting_confirmation', 'failed', 'unpaid', 'overdue'].includes(item.status),
  );
  const dueAmount = duePayments.reduce((sum, item) => sum + item.amount, 0);
  const primaryDuePayment = duePayments[0];

  return (
    <div className="space-y-4 animate-scale-in">
      <Card className={`border-none soft-shadow overflow-hidden ${duePayments.length > 0 ? 'bg-white' : 'bg-[#fbf7e8]'}`}>
        <div className={`h-1.5 ${duePayments.length > 0 ? 'bg-[#D14343]' : 'bg-[#1C8C64]'}`} />
        <CardContent className="p-5 md:p-6">
          {duePayments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-sm text-[#D14343]">К оплате</p>
                <h2 className="mt-1 text-3xl text-[#133C2A]">{dueAmount.toLocaleString('ru-RU')} ₽</h2>
                <p className="mt-2 text-sm text-[#133C2A]/65">
                  {primaryDuePayment?.description || 'Абонемент'}
                  {primaryDuePayment?.invoiceNumber ? ` · счет ${primaryDuePayment.invoiceNumber}` : ''}
                  {primaryDuePayment?.dueDate ? ` · до ${primaryDuePayment.dueDate.toLocaleDateString('ru-RU')}` : ''}
                </p>
              </div>
              {primaryDuePayment?.paymentMethod === 'online' ? (
                <Button
                  className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] px-6 hover:opacity-90"
                  onClick={() => void onPayOnline(primaryDuePayment.id)}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Оплатить
                </Button>
              ) : (
                <div className="flex flex-col items-start gap-2">
                  <Badge variant="outline" className="w-fit rounded-full border-[#D4AF37]/35 text-[#B8941F]">
                    Оплата через администратора
                  </Badge>
                  {primaryDuePayment?.status !== 'waiting_confirmation' ? (
                    <Button
                      variant="outline"
                      className="rounded-2xl border-[#133C2A]/20"
                      onClick={() => void onConfirmManualPayment(primaryDuePayment.id)}
                    >
                      Я оплатил
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-[#1C8C64]">Оплата</p>
                <h2 className="mt-1 text-2xl text-[#133C2A]">Счетов к оплате нет</h2>
                <p className="mt-2 text-sm text-[#133C2A]/65">История платежей и активные абонементы ниже.</p>
              </div>
              <Badge className="rounded-full bg-[#1C8C64] text-white hover:bg-[#1C8C64]">Оплачено</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-4">
        <Card className="border-none soft-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#133C2A]">Активные абонементы</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {subscriptions.length === 0 ? (
              <p className="text-sm text-[#133C2A]/60">Активных абонементов пока нет.</p>
            ) : (
              subscriptions.map((item) => (
                      <div key={item.id} className="rounded-xl border border-[#133C2A]/10 p-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[#133C2A] min-w-0">{item.plan_title}</p>
                    <Badge variant="outline" className="rounded-full">{item.status}</Badge>
                  </div>
                  <p className="text-xs text-[#133C2A]/60 mt-1">
                    {new Date(item.starts_at).toLocaleDateString('ru-RU')} - {new Date(item.expires_at).toLocaleDateString('ru-RU')}
                  </p>
                  {item.total_lessons !== null && (
                    <p className="text-xs text-[#133C2A]/65 mt-1">
                      Посещено {item.used_lessons} из {item.total_lessons}, осталось {item.remaining_lessons}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#133C2A] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#D4AF37]" />
              История платежей
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedPayments.length === 0 ? (
              <p className="text-sm text-[#133C2A]/60">Платежей пока нет.</p>
            ) : (
              sortedPayments.map((payment) => {
                const isDue = payment.status !== 'paid';
                return (
                  <div key={payment.id} className="rounded-xl border border-[#133C2A]/10 p-3 bg-white">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[#133C2A]">{payment.description}</p>
                      <p className="text-[#133C2A]">{payment.amount.toLocaleString('ru-RU')} ₽</p>
                    </div>
                    <p className="text-xs text-[#133C2A]/60 mt-1">
                      {payment.date.toLocaleString('ru-RU')} • {paymentStatusLabels[payment.status] || payment.status}
                      {payment.paymentReference ? ` • ${payment.paymentReference}` : ''}
                      {payment.invoiceNumber ? ` • Счет ${payment.invoiceNumber}` : ''}
                    </p>
                    {payment.dueDate && (
                      <p className="text-xs text-[#133C2A]/60 mt-1">
                        Оплатить до: {payment.dueDate.toLocaleDateString('ru-RU')}
                        {typeof payment.reminderCount === 'number' && payment.reminderCount > 0 ? ` • Напоминаний: ${payment.reminderCount}` : ''}
                      </p>
                    )}
                    {isDue && payment.paymentMethod === 'online' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full rounded-lg border-[#133C2A]/20 sm:w-auto"
                        onClick={() => void onPayOnline(payment.id)}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Открыть оплату
                      </Button>
                    )}
                    {isDue && payment.paymentMethod !== 'online' && payment.status !== 'waiting_confirmation' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full rounded-lg border-[#133C2A]/20 sm:w-auto"
                        onClick={() => void onConfirmManualPayment(payment.id)}
                      >
                        Я оплатил
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {accessInfo && !accessInfo.canUseDashboard && (
        <p className="text-xs text-[#133C2A]/60">
          Полный доступ к кабинету откроется автоматически после подтверждения статуса оплаты.
        </p>
      )}
    </div>
  );
}
