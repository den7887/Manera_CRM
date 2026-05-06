import { Clock3 } from 'lucide-react';
import { ClientTimelineEntry } from './clientStatus';

function formatRuDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

export function ClientTimeline({ entries }: { entries: ClientTimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#133C2A]/12 px-4 py-5 text-sm text-[#133C2A]/55">
        История пока собирается из заявки, оплат и изменений карточки. Для полной ленты нужен backend `client_timeline`.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-2xl border border-[#133C2A]/10 bg-white/90 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[#133C2A]">{entry.title}</p>
              <p className="mt-1 text-sm text-[#133C2A]/62">{entry.description}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#133C2A]/45">
              <Clock3 className="h-3.5 w-3.5" />
              <span>{formatRuDateTime(entry.occurredAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
