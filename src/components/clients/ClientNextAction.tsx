import { CalendarClock } from 'lucide-react';
import { ClientNextAction as ClientNextActionType } from './clientStatus';

export function ClientNextAction({ nextAction, compact = false }: { nextAction: ClientNextActionType; compact?: boolean }) {
  const toneClass = nextAction.concrete
    ? 'border-[#D4AF37]/30 bg-[#FFF9E8] text-[#8B6B00]'
    : 'border-[#133C2A]/10 bg-[#F8F4E3]/70 text-[#133C2A]/62';

  return (
    <div className={`rounded-2xl border ${toneClass} ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#133C2A]/40">
          <CalendarClock className="h-4 w-4" />
          Следующее действие
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] ${nextAction.concrete ? 'bg-white/75 text-[#8B6B00]' : 'bg-white/60 text-[#133C2A]/55'}`}>
          {nextAction.dueLabel}
        </span>
      </div>
      <p className={`mt-2 text-[#133C2A] ${compact ? 'text-sm' : 'text-base'}`}>{nextAction.title}</p>
      <p className="mt-1 text-sm text-[#133C2A]/62">{nextAction.description}</p>
      {!nextAction.concrete ? <p className="mt-2 text-xs text-[#133C2A]/45">Срочного действия нет, это плановый контроль.</p> : null}
    </div>
  );
}
