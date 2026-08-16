import { Badge } from '../ui/badge';

const paymentStatusLabels: Record<string, string> = {
  unpaid: 'Не оплачено',
  pending: 'Не оплачено',
  paid: 'Оплачено',
  overdue: 'Просрочено',
  failed: 'Ошибка оплаты',
  refunded: 'Возврат',
  cancelled: 'Отменен',
  expired: 'Отменен',
};

const paymentStatusClassName: Record<string, string> = {
  paid: 'border-green-200 bg-green-50 text-green-700',
  unpaid: 'border-[#D4AF37]/30 bg-[#FFF9E8] text-[#8B6B00]',
  pending: 'border-[#D4AF37]/30 bg-[#FFF9E8] text-[#8B6B00]',
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
  const normalizedStatus = normalizePaymentStatus(status);
  return paymentStatusLabels[normalizedStatus] || 'Не задано';
}

export function isOutstandingPaymentStatus(status?: string | null): boolean {
  return ['unpaid', 'pending', 'failed', 'overdue'].includes(String(status || ''));
}

function normalizePaymentStatus(
  status?: string | null,
): 'paid' | 'unpaid' | 'pending' | 'overdue' | 'failed' | 'refunded' | 'cancelled' | 'expired' {
  const normalized = String(status || '');
  if (normalized === 'paid') return 'paid';
  if (normalized === 'cancelled') return 'cancelled';
  if (normalized === 'refunded') return 'refunded';
  if (normalized === 'failed') return 'failed';
  if (normalized === 'expired') return 'expired';
  if (normalized === 'pending') return 'pending';
  if (normalized === 'overdue') return 'overdue';
  return 'unpaid';
}

export function PaymentStatusBadge({ status, className = '' }: PaymentStatusBadgeProps) {
  const normalizedStatus = normalizePaymentStatus(status);
  const tone = paymentStatusClassName[normalizedStatus] || 'border-slate-200 bg-slate-100 text-slate-700';

  return (
    <Badge variant="outline" className={`rounded-full border ${tone} ${className}`.trim()}>
      {paymentStatusLabel(normalizedStatus)}
    </Badge>
  );
}
