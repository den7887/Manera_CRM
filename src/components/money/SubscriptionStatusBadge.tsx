import { Badge } from '../ui/badge';
import { MoneySubscriptionStatus, getSubscriptionStatusLabel } from './moneyTypes';

const toneByStatus: Record<MoneySubscriptionStatus, string> = {
  not_started: 'border-slate-200 bg-slate-100 text-slate-700',
  active: 'border-green-200 bg-green-50 text-green-700',
  ending_soon: 'border-[#D4AF37]/30 bg-[#FFF9E8] text-[#8B6B00]',
  expired_by_date: 'border-red-200 bg-red-50 text-red-700',
  finished_by_lessons: 'border-red-200 bg-red-50 text-red-700',
  frozen: 'border-sky-200 bg-sky-50 text-sky-700',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-700',
  payment_required: 'border-red-200 bg-red-50 text-red-700',
};

export function SubscriptionStatusBadge({ status }: { status: MoneySubscriptionStatus }) {
  return (
    <Badge variant="outline" className={`rounded-full border ${toneByStatus[status]}`}>
      {getSubscriptionStatusLabel(status)}
    </Badge>
  );
}

