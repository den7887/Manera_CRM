import { useState } from 'react';
import { ArrowUpRight, MoreHorizontal } from 'lucide-react';
import { Group } from '../../types';
import { ClientStatusBadge } from './ClientStatusBadge';
import { ClientTemperatureBadge } from './ClientTemperatureBadge';
import { ClientWorkspaceEntry } from './clientsWorkspaceTypes';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { MobileClientActionsSheet } from './MobileClientActionsSheet';

function sourceLabel(entry: ClientWorkspaceEntry): string {
  return entry.child.profile?.sourceChannel || entry.child.landingLead?.discoverySource || 'Не указан';
}

function primaryAction(entry: ClientWorkspaceEntry) {
  if (entry.stage === 'waiting_payment') {
    return entry.latestOpenPayment ? 'Напомнить' : 'Открыть оплаты';
  }
  if (entry.stage === 'risk') {
    return 'Разобрать';
  }
  return 'Открыть';
}

export function MobileClientCard({
  entry,
  groups,
  highlight,
  onOpen,
  onOpenPayments,
  onCreateInvoice,
  onRemind,
  onOpenTasks,
  onAssignGroup,
  onOpenComments,
  isInvoicing,
  isReminding,
}: {
  entry: ClientWorkspaceEntry;
  groups: Group[];
  highlight?: string;
  onOpen: () => void;
  onOpenPayments: () => void;
  onCreateInvoice: () => void;
  onRemind?: () => void;
  onOpenTasks: () => void;
  onAssignGroup: () => void;
  onOpenComments: () => void;
  isInvoicing?: boolean;
  isReminding?: boolean;
}) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  const handlePrimary = () => {
    if (entry.stage === 'waiting_payment') {
      if (entry.latestOpenPayment && onRemind) {
        onRemind();
        return;
      }
      onOpenPayments();
      return;
    }
    onOpen();
  };

  return (
    <>
      <Card className="border-[#133C2A]/10 bg-white/94 shadow-[0_10px_24px_rgba(19,60,42,0.06)]">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-1.5">
                <ClientStatusBadge stage={entry.stage} />
                <ClientTemperatureBadge temperature={entry.temperature} />
              </div>
              <p className="mt-3 truncate text-[17px] text-[#133C2A]">{entry.child.fullName || 'Ученик'}</p>
              <p className="mt-1 text-sm text-[#133C2A]/62">
                {entry.child.age ?? '—'} лет · {entry.child.parentName || 'Родитель не указан'}
              </p>
              <p className="mt-1 text-sm text-[#133C2A]/55">Источник: {sourceLabel(entry)}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-2xl border-[#133C2A]/12"
              onClick={() => setIsActionsOpen(true)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-2xl bg-[#F8F4E3]/72 px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#133C2A]/42">Следующее действие</p>
            <p className="mt-1 text-sm text-[#133C2A]">{entry.nextAction.title}</p>
            <p className="mt-1 text-xs text-[#133C2A]/50">{entry.nextAction.dueLabel}</p>
          </div>

          {entry.latestOpenPayment ? (
            <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#FFF9E8] px-3 py-2.5 text-sm text-[#8B6B00]">
              Открытый счет: {Number(entry.latestOpenPayment.amount || 0).toLocaleString('ru-RU')} ₽
            </div>
          ) : null}

          {highlight ? <p className="text-sm text-[#133C2A]/58">{highlight}</p> : null}

          <div className="flex items-center gap-2">
            <Button onClick={handlePrimary} className="flex-1 rounded-2xl bg-[#133C2A] text-white hover:bg-[#133C2A]/92">
              {primaryAction(entry)}
            </Button>
            <Button variant="outline" className="rounded-2xl border-[#133C2A]/12 px-3" onClick={onOpen}>
              <ArrowUpRight className="mr-1.5 h-4 w-4" />
              Открыть
            </Button>
          </div>
        </CardContent>
      </Card>

      <MobileClientActionsSheet
        open={isActionsOpen}
        onOpenChange={setIsActionsOpen}
        child={entry.child}
        outstandingPayment={entry.latestOpenPayment}
        onOpen={onOpen}
        onOpenPayments={onOpenPayments}
        onCreateInvoice={onCreateInvoice}
        onRemind={onRemind}
        onOpenTasks={onOpenTasks}
        onOpenComments={onOpenComments}
        onOpenGroup={onAssignGroup}
        isInvoicing={isInvoicing}
        isReminding={isReminding}
      />
    </>
  );
}
