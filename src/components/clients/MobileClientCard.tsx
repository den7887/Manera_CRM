import { useState } from 'react';
import { Phone, MoreHorizontal } from 'lucide-react';
import { Group } from '../../types';
import { ClientStatusBadge } from './ClientStatusBadge';
import { ClientTemperatureBadge } from './ClientTemperatureBadge';
import { ClientWorkspaceEntry } from './clientsWorkspaceTypes';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { MobileClientActionsSheet } from './MobileClientActionsSheet';
import { portalStatusLabel } from '../../lib/portalStatus';

function sourceLabel(entry: ClientWorkspaceEntry): string {
  return entry.child.profile?.sourceChannel || entry.child.landingLead?.discoverySource || 'Не указан';
}

function formatRuDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function primaryAction(entry: ClientWorkspaceEntry) {
  if (entry.child.id.startsWith('lead::')) return 'Активировать';
  return 'Открыть карточку';
}

function normalizePhoneForCall(phone?: string | null) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith('7')) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  return String(phone || '').trim();
}

function isLikelyMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent || '');
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
  onOpenTaskComposer,
  onActivateLead,
  onAssignGroup,
  onOpenComments,
  onDelete,
  isInvoicing,
  isReminding,
  isDeleting,
}: {
  entry: ClientWorkspaceEntry;
  groups: Group[];
  highlight?: string;
  onOpen: () => void;
  onOpenPayments: () => void;
  onCreateInvoice: () => void;
  onRemind?: () => void;
  onOpenTasks: () => void;
  onOpenTaskComposer: () => void;
  onActivateLead?: () => void;
  onAssignGroup: () => void;
  onOpenComments: () => void;
  onDelete?: () => void;
  isInvoicing?: boolean;
  isReminding?: boolean;
  isDeleting?: boolean;
}) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const callPhone = normalizePhoneForCall(entry.child.parentPhone || entry.child.landingLead?.phone);
  const leadCreatedAt = entry.child.landingLead?.createdAt || entry.child.createdAt;

  const handlePrimary = () => {
    if (entry.child.id.startsWith('lead::')) {
      onActivateLead?.();
      return;
    }
    onOpen();
  };

  const handleCall = () => {
    if (!callPhone) {
      setCallDialogOpen(true);
      return;
    }
    if (isLikelyMobileDevice()) {
      window.location.href = `tel:${callPhone}`;
      return;
    }
    setCallDialogOpen(true);
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
                {entry.child.age ? `${entry.child.age} лет` : 'Возраст не указан'} · {entry.child.parentName || 'Родитель не указан'}
              </p>
              <p className="mt-1 text-sm text-[#133C2A]/55">{entry.child.parentPhone || 'Телефон не указан'}</p>
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

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl bg-[#F8F4E3]/72 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#133C2A]/42">Источник</p>
              <p className="mt-1 text-[#133C2A]">{sourceLabel(entry)}</p>
            </div>
            <div className="rounded-2xl bg-[#F8F4E3]/72 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#133C2A]/42">Заявка поступила</p>
              <p className="mt-1 text-[#133C2A]">{formatRuDateTime(leadCreatedAt)}</p>
            </div>
            <div className="rounded-2xl bg-[#F8F4E3]/72 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#133C2A]/42">Группа</p>
              <p className="mt-1 text-[#133C2A]">{entry.child.groupName || 'Без группы'}</p>
            </div>
            <div className="rounded-2xl bg-[#F8F4E3]/72 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#133C2A]/42">Абонемент</p>
              <p className="mt-1 text-[#133C2A]">{entry.child.subscriptionName || 'Не выбран'}</p>
            </div>
            <div className="rounded-2xl bg-[#F8F4E3]/72 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#133C2A]/42">Оплата</p>
              <p className="mt-1 text-[#133C2A]">
                {entry.latestOpenPayment
                  ? `Открыт счет ${Number(entry.latestOpenPayment.amount || 0).toLocaleString('ru-RU')} ₽`
                  : 'Без открытого счета'}
              </p>
            </div>
            <div className="rounded-2xl bg-[#F8F4E3]/72 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#133C2A]/42">Кабинет</p>
              <p className="mt-1 text-[#133C2A]">{portalStatusLabel(entry.child.parentPortalStatus)}</p>
            </div>
            <div className="rounded-2xl bg-[#F8F4E3]/72 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#133C2A]/42">Занятия</p>
              <p className="mt-1 text-[#133C2A]">
                {entry.child.lessonsTracked
                  ? `${entry.child.remainingClasses ?? 0} из ${entry.child.totalClasses ?? 0}`
                  : 'Без учета лимита'}
              </p>
            </div>
          </div>

          {entry.child.profile?.internalComment ? (
            <div className="rounded-2xl border border-[#D4AF37]/25 bg-[#FFF9E8] px-3 py-2.5 text-sm text-[#8B6B00]">
              {entry.child.profile.internalComment}
            </div>
          ) : null}

          <button
            type="button"
            className="w-full rounded-2xl bg-[#F8F4E3]/72 px-3 py-3 text-left transition-colors hover:bg-[#F4EEDB]"
            onClick={onOpenTaskComposer}
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#133C2A]/42">Следующее действие</p>
            <p className="mt-1 text-sm text-[#133C2A]">{entry.nextAction.title}</p>
            <p className="mt-1 text-xs text-[#133C2A]/50">{entry.nextAction.dueLabel}</p>
          </button>

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
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-2xl border-[#133C2A]/12 text-[#133C2A]"
            onClick={handleCall}
          >
            <Phone className="mr-2 h-4 w-4" />
            Позвонить
          </Button>
        </CardContent>
      </Card>

      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent className="max-w-[92vw] rounded-3xl bg-[#FFFCF3]">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">Позвонить родителю</DialogTitle>
            <DialogDescription className="text-[#133C2A]/62">
              Номер телефона для связи с родителем.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-2xl border border-[#133C2A]/10 bg-white px-4 py-3 text-lg text-[#133C2A]">
              {callPhone || 'Телефон не указан'}
            </div>
            {callPhone ? (
              <a
                href={`tel:${callPhone}`}
                className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#133C2A] text-sm font-medium text-white"
              >
                <Phone className="mr-2 h-4 w-4" />
                Открыть звонок
              </a>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

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
        onDelete={onDelete}
        isInvoicing={isInvoicing}
        isReminding={isReminding}
        isDeleting={isDeleting}
      />
    </>
  );
}
