import { ArrowUpRight, CreditCard, MoreHorizontal, Phone, Plus, Send, Users } from 'lucide-react';
import { AdminChildRecord, AdminPaymentRecord } from '../../lib/backendApi';
import { Group } from '../../types';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ClientNextAction } from './ClientNextAction';
import { ClientStage, ClientTemperature, clientStageLabel } from './clientStatus';
import { ClientStatusBadge } from './ClientStatusBadge';
import { ClientTemperatureBadge } from './ClientTemperatureBadge';
import { paymentStatusLabel } from '../payments/PaymentStatusBadge';

function childInitials(fullName?: string | null): string {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'У';
  return parts.slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
}

function formatRuDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

export function ClientCard({
  child,
  stage,
  temperature,
  nextAction,
  outstandingPayment,
  groups,
  onOpen,
  onOpenPayments,
  onCreateInvoice,
  onRemind,
  onAssignGroup,
  onOpenTasks,
  isAssigning,
  isInvoicing,
  isReminding,
  sectionLabel,
}: {
  child: AdminChildRecord;
  stage: ClientStage;
  temperature: ClientTemperature;
  nextAction: {
    title: string;
    dueLabel: string;
    description: string;
    concrete: boolean;
  };
  outstandingPayment?: AdminPaymentRecord | null;
  groups: Group[];
  onOpen: () => void;
  onOpenPayments: () => void;
  onCreateInvoice: () => void;
  onRemind?: () => void;
  onAssignGroup: (groupId: string | null) => void;
  onOpenTasks: () => void;
  isAssigning?: boolean;
  isInvoicing?: boolean;
  isReminding?: boolean;
  sectionLabel?: string;
}) {
  const primaryAction =
    stage === 'waiting_payment'
      ? {
          label: outstandingPayment ? 'Напомнить' : 'Выставить счет',
          onClick: outstandingPayment ? onRemind : onCreateInvoice,
          disabled: outstandingPayment ? isReminding : isInvoicing,
        }
      : stage === 'lead_new' || stage === 'contact_needed' || stage === 'in_dialog' || stage === 'trial_scheduled' || stage === 'thinking'
        ? { label: 'Открыть карточку', onClick: onOpen, disabled: false }
        : stage === 'risk'
          ? { label: 'Разобрать карточку', onClick: onOpen, disabled: false }
          : { label: 'Открыть карточку', onClick: onOpen, disabled: false };

  return (
    <Card className="overflow-hidden border-[#133C2A]/10 bg-white/92 shadow-[0_10px_30px_rgba(19,60,42,0.06)]">
      <CardContent className="p-0">
        <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr_260px]">
          <div className="p-4 md:p-5">
            <div className="flex items-start gap-3">
              <Avatar className="h-14 w-14 border border-[#D4AF37]/20">
                <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white">
                  {childInitials(child.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button type="button" onClick={onOpen} className="text-left text-lg leading-tight text-[#133C2A] hover:underline">
                      {child.fullName || 'Ученик'}
                    </button>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#133C2A]/66">
                      <span>{child.age ?? '—'} лет</span>
                      <span>•</span>
                      <span>{child.parentName || 'Родитель не указан'}</span>
                      <span>•</span>
                      <span>{child.parentPhone || 'Телефон не указан'}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <ClientStatusBadge stage={stage} />
                      <ClientTemperatureBadge temperature={temperature} />
                      {sectionLabel ? (
                        <Badge variant="outline" className="rounded-full border-[#133C2A]/12 text-[#133C2A]/70">
                          {sectionLabel}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 rounded-xl border-[#133C2A]/15 px-3">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem onSelect={onOpen}>
                        <ArrowUpRight className="mr-2 h-4 w-4" />
                        Открыть карточку
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={onOpenPayments}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Открыть оплаты
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={onCreateInvoice} disabled={!child.clientId}>
                        <Plus className="mr-2 h-4 w-4" />
                        Выставить счет
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={onOpenTasks}>
                        <Users className="mr-2 h-4 w-4" />
                        Открыть задачи
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled>
                        <Phone className="mr-2 h-4 w-4" />
                        Связь будет подключена позже
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {child.profile?.internalComment ? (
                  <div className="mt-4 rounded-2xl border border-[#D4AF37]/25 bg-[#FFF9E8] px-3 py-3 text-sm text-[#8B6B00]">
                    Важно: {child.profile.internalComment}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 text-sm">
                  <div className="rounded-2xl bg-[#F8F4E3]/70 p-3">
                    <p className="text-xs text-[#133C2A]/45">Группа</p>
                    <p className="mt-1 text-[#133C2A]">{child.groupName || 'Не назначена'}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F8F4E3]/70 p-3">
                    <p className="text-xs text-[#133C2A]/45">Абонемент</p>
                    <p className="mt-1 text-[#133C2A]">
                      {child.subscriptionName || 'Не выбран'}
                      {child.subscriptionAmount ? ` • ${Number(child.subscriptionAmount).toLocaleString('ru-RU')} ₽` : ''}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F8F4E3]/70 p-3">
                    <p className="text-xs text-[#133C2A]/45">Последнее обновление</p>
                    <p className="mt-1 text-[#133C2A]">{formatRuDate(child.updatedAt || child.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-y border-[#133C2A]/8 bg-[#fbf7e8]/72 p-4 md:p-5 xl:border-x xl:border-y-0">
            <div className="space-y-3">
              <ClientNextAction nextAction={nextAction} compact />

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.14em] text-[#133C2A]/40">Группа и оплата</p>
                <Select value={child.groupId || 'none'} onValueChange={(value) => onAssignGroup(value === 'none' ? null : value)} disabled={isAssigning}>
                  <SelectTrigger className="rounded-xl bg-white">
                    <SelectValue placeholder="Без группы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без группы</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="rounded-2xl border border-[#133C2A]/10 bg-white px-3 py-3 text-sm text-[#133C2A]/68">
                  <p className="text-xs text-[#133C2A]/45">Статус оплаты</p>
                  <p className="mt-1 text-[#133C2A]">
                    {paymentStatusLabel(outstandingPayment?.status || child.paymentStatus)}
                    {outstandingPayment?.amount ? ` • ${Number(outstandingPayment.amount).toLocaleString('ru-RU')} ₽` : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-5">
            <div className="flex h-full flex-col gap-2">
              <Button onClick={primaryAction.onClick} disabled={primaryAction.disabled} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
                {primaryAction.label}
              </Button>
              <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={onOpenPayments}>
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Открыть оплаты
              </Button>
              <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={onOpenTasks}>
                <Users className="mr-2 h-4 w-4" />
                Задачи
              </Button>
              {outstandingPayment ? (
                <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={onRemind} disabled={!onRemind || isReminding}>
                  <Send className="mr-2 h-4 w-4" />
                  {isReminding ? 'Отправляем...' : 'Напомнить'}
                </Button>
              ) : (
                <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={onCreateInvoice} disabled={!child.clientId || isInvoicing}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {isInvoicing ? 'Создаем...' : 'Выставить счет'}
                </Button>
              )}

              <div className="mt-auto rounded-2xl border border-dashed border-[#133C2A]/12 px-3 py-3 text-sm text-[#133C2A]/48">
                Следующий backend-этап: статусы пробного, архивные причины и история контактов.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
