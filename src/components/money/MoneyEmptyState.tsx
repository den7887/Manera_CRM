import { ReactNode } from 'react';
import { Card, CardContent } from '../ui/card';

export function MoneyEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border-dashed border-[#133C2A]/15 bg-white/80 shadow-none">
      <CardContent className="p-5 text-center">
        <p className="text-base text-[#133C2A]">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-[#133C2A]/62">{description}</p>
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </CardContent>
    </Card>
  );
}

