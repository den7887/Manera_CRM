import { Button } from '../ui/button';

export function MobileQueueSummary({
  label,
  value,
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      onClick={onClick}
      className={
        active
          ? 'h-auto min-w-[96px] rounded-2xl bg-[#133C2A] px-4 py-3 text-left'
          : 'h-auto min-w-[96px] rounded-2xl border-[#133C2A]/12 bg-white/90 px-4 py-3 text-left text-[#133C2A]'
      }
    >
      <div className="flex flex-col items-start gap-1">
        <span className={`text-[11px] uppercase tracking-[0.14em] ${active ? 'text-white/70' : 'text-[#133C2A]/45'}`}>
          {label}
        </span>
        <span className="text-lg">{value}</span>
      </div>
    </Button>
  );
}
