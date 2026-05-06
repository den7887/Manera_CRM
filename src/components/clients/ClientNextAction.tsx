import { CalendarClock } from 'lucide-react';
import { ClientNextAction as ClientNextActionType } from './clientStatus';

export function ClientNextAction({ nextAction, compact = false }: { nextAction: ClientNextActionType; compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-[#133C2A]/10 bg-[#F8F4E3]/70 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#133C2A]/40">
        <CalendarClock className="h-4 w-4" />
        Следующее действие
      </div>
      <p className={`mt-2 text-[#133C2A] ${compact ? 'text-sm' : 'text-base'}`}>{nextAction.title}</p>
      <p className="mt-1 text-sm text-[#133C2A]/62">{nextAction.description}</p>
      <p className="mt-2 text-xs text-[#133C2A]/48">{nextAction.dueLabel}</p>
    </div>
  );
}
