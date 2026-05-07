import { Badge } from '../ui/badge';
import { MoneyPaymentType, moneyPaymentTypeLabels } from './moneyTypes';

const toneByType: Record<MoneyPaymentType, string> = {
  trial: 'border-[#D4AF37]/30 bg-[#FFF9E8] text-[#8B6B00]',
  subscription: 'border-[#133C2A]/15 bg-[#F1F7F3] text-[#133C2A]',
  renewal: 'border-[#133C2A]/15 bg-[#F1F7F3] text-[#133C2A]',
  event: 'border-sky-200 bg-sky-50 text-sky-700',
  individual: 'border-purple-200 bg-purple-50 text-purple-700',
  custom: 'border-slate-200 bg-slate-100 text-slate-700',
  debt: 'border-red-200 bg-red-50 text-red-700',
};

export function PaymentTypeBadge({ type }: { type: MoneyPaymentType }) {
  return (
    <Badge variant="outline" className={`rounded-full border ${toneByType[type]}`}>
      {moneyPaymentTypeLabels[type]}
    </Badge>
  );
}

