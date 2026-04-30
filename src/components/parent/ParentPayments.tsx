import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Receipt, ShieldAlert } from 'lucide-react';
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

export function ParentPayments({ payments, accessInfo, onPayOnline }: ParentPaymentsProps) {
  const [subscriptions, setSubscriptions] = useState<ParentSubscriptionDto[]>([]);
  const tempPaymentsEnabled = String(import.meta.env.VITE_TEMP_PAYMENTS_ENABLED || '').toLowerCase() === 'true';

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

  return (
    <div className="space-y-4 animate-scale-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[#133C2A] text-xl">Оплата и абонементы</h2>
          <p className="text-sm text-[#133C2A]/60">Контроль счетов, платежей и активных периодов обучения</p>
        </div>
        <Badge variant="outline" className="rounded-full border-[#D14343]/30 text-[#D14343]">
          К оплате: {dueAmount.toLocaleString('ru-RU')} ₽
        </Badge>
      </div>

      {!tempPaymentsEnabled && (
        <Card className="border-none soft-shadow">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-start gap-2 text-sm text-[#133C2A]/70">
              <ShieldAlert className="w-4 h-4 text-[#D4AF37] mt-0.5 shrink-0" />
              <p>Временный платежный контур отключен. Переходим на постоянную схему оплаты.</p>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[#133C2A]">{item.plan_title}</p>
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
                        className="mt-2 rounded-lg border-[#133C2A]/20"
                        onClick={() => void onPayOnline(payment.id)}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Открыть оплату
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
