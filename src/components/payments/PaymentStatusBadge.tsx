import { Badge } from '../ui/badge';

const paymentStatusLabels: Record<string, string> = {
  unpaid: 'Ожидает оплату',
  pending: 'На проверке',
  paid: 'Оплачено',
  failed: 'Ошибка',
  refunded: 'Возврат',
  overdue: 'Просрочено',
  cancelled: 'Отменено',
  expired: 'Истекло',
};

const paymentStatusClassName: Record<string, string> = {
  paid: 'border-green-200 bg-green-50 text-green-700',
  pending: 'border-blue-200 bg-blue-50 text-blue-700',
  unpaid: 'border-[#D4AF37]/30 bg-[#FFF9E8] text-[#8B6B00]',
  overdue: 'border-red-200 bg-red-50 text-red-700',
  failed: 'border-red-200 bg-red-50 text-red-700',
  refunded: 'border-slate-200 bg-slate-100 text-slate-700',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-700',
  expired: 'border-slate-200 bg-slate-100 text-slate-700',
};

interface PaymentStatusBadgeProps {
  status?: string | null;
  className?: string;
}

export function paymentStatusLabel(status?: string | null): string {
  return paymentStatusLabels[String(status || '')] || String(status || 'Не задано');
}

export function isOutstandingPaymentStatus(status?: string | null): boolean {
  return ['unpaid', 'pending', 'failed', 'overdue'].includes(String(status || ''));
}

export function PaymentStatusBadge({ status, className = '' }: PaymentStatusBadgeProps) {
  const normalizedStatus = String(status || '');
  const tone = paymentStatusClassName[normalizedStatus] || 'border-slate-200 bg-slate-100 text-slate-700';

  return (
    <Badge variant="outline" className={`rounded-full border ${tone} ${className}`.trim()}>
      {paymentStatusLabel(normalizedStatus)}
    </Badge>
  );
}
