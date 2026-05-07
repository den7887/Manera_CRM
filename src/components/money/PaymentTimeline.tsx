import { MoneyJournalEntry, formatDateTime, formatMoney } from './moneyTypes';

const eventLabels: Record<string, string> = {
  'payment.created': 'Платеж создан',
  'payment.invoice_created': 'Счет создан',
  'payment.status_changed': 'Статус изменен',
  'payment.due_date_changed': 'Срок оплаты изменен',
  'payment.confirmed_cash': 'Оплата подтверждена вручную',
  'payment.confirmed_online': 'Оплата подтверждена эквайрингом',
  'payment.failed_online': 'Онлайн-оплата не прошла',
  'payment.reminder_sent': 'Напоминание отправлено',
  'payment.user_confirmed': 'Родитель нажал «Я оплатил»',
};

function buildDescription(entry: MoneyJournalEntry): string {
  const meta = entry.metadata || {};
  if (entry.eventType === 'payment.invoice_created' && typeof meta.dueDate === 'string') {
    return `Срок оплаты до ${new Date(meta.dueDate).toLocaleDateString('ru-RU')}`;
  }
  if (entry.eventType === 'payment.confirmed_cash' && typeof meta.paidAmount === 'number') {
    return `Подтверждено на сумму ${formatMoney(meta.paidAmount)}`;
  }
  if (entry.eventType === 'payment.due_date_changed' && typeof meta.dueDate === 'string') {
    return `Новый срок оплаты: ${new Date(meta.dueDate).toLocaleDateString('ru-RU')}`;
  }
  if (entry.eventType === 'payment.reminder_sent' && typeof meta.reminderCount === 'number') {
    return `Напоминание №${meta.reminderCount}`;
  }
  if (entry.previousStatus && entry.newStatus && entry.previousStatus !== entry.newStatus) {
    return `${entry.previousStatus} → ${entry.newStatus}`;
  }
  return '';
}

export function PaymentTimeline({ entries }: { entries: MoneyJournalEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#133C2A]/15 bg-[#FBF7E8]/60 p-4 text-sm text-[#133C2A]/62">
        История пока собирается из платежей и ручных действий.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-2xl border border-[#133C2A]/10 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[#133C2A]">{eventLabels[entry.eventType] || entry.eventType}</p>
            <p className="text-xs text-[#133C2A]/52">{formatDateTime(entry.createdAt)}</p>
          </div>
          {buildDescription(entry) ? <p className="mt-1 text-xs text-[#133C2A]/60">{buildDescription(entry)}</p> : null}
        </div>
      ))}
    </div>
  );
}
