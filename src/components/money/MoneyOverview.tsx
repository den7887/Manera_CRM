import { Clock3, CreditCard, ReceiptText } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { MoneyAttentionQueue } from './MoneyAttentionQueue';
import { MoneyEmptyState } from './MoneyEmptyState';
import { MoneySummaryCards } from './MoneySummaryCards';
import { MoneyJournalEntry, MoneyOverviewSummary, formatDateTime, formatMoney } from './moneyTypes';

export function MoneyOverview({
  summary,
  recentEvents,
  trialUnpaidCount,
  subscriptionWithoutPaymentCount,
  onOpenReview,
  onOpenWaiting,
  onOpenOverdue,
  onOpenEndingSoon,
  onOpenTrialUnpaid,
  onOpenSubscriptionIssues,
}: {
  summary: MoneyOverviewSummary;
  recentEvents: MoneyJournalEntry[];
  trialUnpaidCount: number;
  subscriptionWithoutPaymentCount: number;
  onOpenReview: () => void;
  onOpenWaiting: () => void;
  onOpenOverdue: () => void;
  onOpenEndingSoon: () => void;
  onOpenTrialUnpaid: () => void;
  onOpenSubscriptionIssues: () => void;
}) {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-[#133C2A]">Деньги</h1>
        <p className="mt-1 text-sm text-[#133C2A]/60">Контроль оплат, абонементов и продлений</p>
      </div>

      <MoneySummaryCards summary={summary} />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg text-[#133C2A]">Очереди внимания</p>
            <p className="text-sm text-[#133C2A]/58">Система раскладывает задачи по понятным очередям.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <MoneyAttentionQueue
            kind="review"
            title="Нужно проверить"
            description="Родитель подтвердил оплату или платеж требует ручной проверки."
            count={summary.reviewCount}
            onOpen={onOpenReview}
          />
          <MoneyAttentionQueue
            kind="waiting"
            title="Ждут оплату"
            description="Счета выставлены, но деньги пока не поступили."
            count={summary.waitingCount}
            onOpen={onOpenWaiting}
          />
          <MoneyAttentionQueue
            kind="overdue"
            title="Просрочено"
            description="Срок оплаты прошел, нужно напомнить или продлить срок."
            count={summary.overdueCount}
            onOpen={onOpenOverdue}
          />
          <MoneyAttentionQueue
            kind="ending"
            title="Скоро закончатся абонементы"
            description="Осталось мало занятий или близок срок окончания."
            count={summary.endingSoonCount}
            onOpen={onOpenEndingSoon}
          />
          <MoneyAttentionQueue
            kind="trial"
            title="Пробные без оплаты"
            description="Есть платное пробное, но платеж еще не закрыт."
            count={trialUnpaidCount}
            onOpen={onOpenTrialUnpaid}
          />
          <MoneyAttentionQueue
            kind="subscriptions"
            title="Абонементы без оплаты"
            description="У ученика есть сценарий абонемента, но платеж не закрыт."
            count={subscriptionWithoutPaymentCount}
            onOpen={onOpenSubscriptionIssues}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg text-[#133C2A]">Последние операции</p>
            <p className="text-sm text-[#133C2A]/58">Последние 5 событий по деньгам и абонементам.</p>
          </div>
        </div>
        {recentEvents.length === 0 ? (
          <MoneyEmptyState
            title="Пока нет финансовых событий"
            description="Когда появятся счета, оплаты и абонементы, события будут собраны здесь."
          />
        ) : (
          <div className="space-y-3">
            {recentEvents.map((entry) => (
              <Card key={entry.id} className="border-none bg-white/92 shadow-[0_10px_24px_rgba(19,60,42,0.06)]">
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F8F4E3] text-[#133C2A]">
                    {entry.eventType.includes('reminder') ? <Clock3 className="h-5 w-5" /> : entry.eventType.includes('subscription') ? <CreditCard className="h-5 w-5" /> : <ReceiptText className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#133C2A]">
                      {entry.eventType === 'payment.invoice_created'
                        ? 'Счет выставлен'
                        : entry.eventType === 'payment.confirmed_cash'
                          ? 'Оплата подтверждена наличными'
                          : entry.eventType === 'payment.confirmed_online'
                            ? 'Оплата подтверждена онлайн'
                            : entry.eventType === 'payment.reminder_sent'
                              ? 'Напоминание отправлено'
                              : entry.eventType === 'payment.failed_online'
                                ? 'Онлайн-оплата не прошла'
                                : 'Событие по оплате'}
                    </p>
                    <p className="mt-1 text-xs text-[#133C2A]/60">
                      {typeof entry.metadata?.amount === 'number' ? formatMoney(Number(entry.metadata.amount)) : 'Сумма в карточке платежа'} · {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
