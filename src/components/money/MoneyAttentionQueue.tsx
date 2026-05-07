import { ArrowRight, ReceiptText, ShieldAlert, WalletCards } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

const icons = {
  review: ShieldAlert,
  waiting: ReceiptText,
  overdue: WalletCards,
  ending: ReceiptText,
  trial: WalletCards,
  subscriptions: ShieldAlert,
};

export function MoneyAttentionQueue({
  title,
  description,
  count,
  onOpen,
  kind,
}: {
  title: string;
  description: string;
  count: number;
  onOpen: () => void;
  kind: keyof typeof icons;
}) {
  const Icon = icons[kind];

  return (
    <Card className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
      <CardContent className="flex items-start gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F8F4E3] text-[#133C2A]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[#133C2A]">{title}</p>
              <p className="mt-1 text-sm text-[#133C2A]/58">{description}</p>
            </div>
            <p className="text-2xl leading-none text-[#133C2A]">{count}</p>
          </div>
          <Button variant="outline" className="mt-4 rounded-2xl border-[#133C2A]/15" onClick={onOpen}>
            Открыть
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

