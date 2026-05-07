import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { AdminChildRecord, AdminPaymentRecord } from '../../lib/backendApi';
import { Group } from '../../types';
import { Copy, CreditCard, MessageSquareText, ShieldCheck, UserPlus2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { PaymentStatusBadge, paymentStatusLabel } from '../payments/PaymentStatusBadge';
import { ClientNextAction } from './ClientNextAction';
import { ClientStatusBadge } from './ClientStatusBadge';
import { ClientTemperatureBadge } from './ClientTemperatureBadge';
import { ClientTimeline } from './ClientTimeline';
import { clientStageLabel, clientTemperatureLabel } from './clientStatus';
import { ClientWorkspaceEntry } from './clientsWorkspaceTypes';

function formatRuDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

function formatRuDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

function stageReason(stage: ClientWorkspaceEntry['stage']): string {
  switch (stage) {
    case 'lead_new':
      return 'Новая заявка недавно попала в CRM и еще не обработана.';
    case 'contact_needed':
      return 'Интерес есть, но первый контакт еще не закрыт.';
    case 'in_dialog':
      return 'Контакт уже есть, решение по следующему шагу еще не принято.';
    case 'trial_scheduled':
      return 'Пробный сценарий уже движется и требует контроля.';
    case 'thinking':
      return 'После пробного решения о покупке еще нет.';
    case 'waiting_payment':
      return 'Есть открытый счет или ожидание подтверждения оплаты.';
    case 'active':
      return 'Клиент занимается и находится в активной базе.';
    case 'risk':
      return 'Есть просрочка, нет группы или карточка зависла.';
    case 'paused':
      return 'Карточка временно выпала из активной работы.';
    case 'frozen':
      return 'Сценарий заморожен и требует ручного контроля.';
    case 'lost':
      return 'Сделка закрылась без продолжения.';
    case 'archived':
      return 'Карточка выведена из активной работы.';
    default:
      return 'Статус рассчитан по текущим данным карточки.';
  }
}

function sourceLabel(entry: ClientWorkspaceEntry): string {
  return entry.child.profile?.sourceChannel || entry.child.landingLead?.discoverySource || 'Не указан';
}

function buildFunnelSteps(entry: ClientWorkspaceEntry) {
  const order = ['lead_new', 'contact_needed', 'in_dialog', 'trial_scheduled', 'trial_attended', 'thinking', 'waiting_payment', 'active'];
  const currentIndex = order.indexOf(entry.stage);
  const steps = [
    { id: 'lead', label: 'Заявка', date: entry.child.createdAt || '' },
    { id: 'contact', label: 'Контакт', date: entry.child.updatedAt || '' },
    { id: 'trial', label: 'Пробное', date: entry.child.groupId ? entry.child.updatedAt || '' : '' },
    { id: 'decision', label: 'Решение', date: entry.child.updatedAt || '' },
    { id: 'payment', label: 'Оплата', date: entry.latestOpenPayment?.paidAt || entry.latestOpenPayment?.createdAt || '' },
    { id: 'active', label: 'Активный', date: entry.stage === 'active' ? entry.child.updatedAt || '' : '' },
  ];

  return steps.map((step, index) => ({
    ...step,
    state: currentIndex > index ? 'done' : currentIndex === index ? 'current' : 'pending',
  }));
}

async function copyPhone(phone?: string | null) {
  if (!phone) {
    toast.info('Телефон не указан');
    return;
  }
  try {
    await navigator.clipboard.writeText(phone);
    toast.success('Телефон скопирован');
  } catch {
    toast.error('Не удалось скопировать телефон');
  }
}

type ProfileDraft = {
  internalComment: string;
  healthNotes: string;
  behavioralNotes: string;
  goals: string;
  strengths: string;
  parentExpectations: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  communicationPreferences: string;
  sourceChannel: string;
  priorExperience: string;
  tagsInput: string;
};

export function MobileClientDetails({
  open,
  onOpenChange,
  entry,
  groups,
  profileDraft,
  setProfileDraft,
  isProfileSaving,
  onSaveProfile,
  onOpenPayments,
  onCreateInvoice,
  onRemind,
  onOpenTasks,
  onAssignGroup,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: ClientWorkspaceEntry | null;
  groups: Group[];
  profileDraft: ProfileDraft;
  setProfileDraft: Dispatch<SetStateAction<ProfileDraft>>;
  isProfileSaving: boolean;
  onSaveProfile: () => void;
  onOpenPayments: () => void;
  onCreateInvoice: () => void;
  onRemind?: () => void;
  onOpenTasks: () => void;
  onAssignGroup: (groupId: string | null) => void;
}) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const payments = useMemo(() => entry?.payments || [], [entry]);

  if (!entry) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 p-0 sm:max-w-none">
        <div className="flex h-full flex-col bg-[#FCFAF0]">
          <div className="sticky top-0 z-20 border-b border-[#133C2A]/10 bg-[#FCFAF0]/95 px-4 pb-4 pt-10 backdrop-blur">
            <div className="pr-10">
              <p className="text-[22px] leading-tight text-[#133C2A]">{entry.child.fullName || 'Ученик'}</p>
              <p className="mt-1 text-sm text-[#133C2A]/60">
                {entry.child.age ?? '—'} лет · мама: {entry.child.parentName || '—'}
              </p>
              <p className="mt-1 text-sm text-[#133C2A]/60">{entry.child.parentPhone || 'Телефон не указан'}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <ClientStatusBadge stage={entry.stage} />
                <ClientTemperatureBadge temperature={entry.temperature} />
                <Badge variant="outline" className="rounded-full border-[#133C2A]/12 text-[#133C2A]/68">
                  {sourceLabel(entry)}
                </Badge>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              <Button variant="outline" className="h-11 rounded-2xl border-[#133C2A]/12 px-2 text-xs" onClick={() => void copyPhone(entry.child.parentPhone)}>
                <Copy className="mb-1 h-4 w-4" />
                Телефон
              </Button>
              <Button variant="outline" className="h-11 rounded-2xl border-[#133C2A]/12 px-2 text-xs" onClick={onOpenPayments}>
                <CreditCard className="mb-1 h-4 w-4" />
                Оплаты
              </Button>
              <Button variant="outline" className="h-11 rounded-2xl border-[#133C2A]/12 px-2 text-xs" onClick={onOpenTasks}>
                <Users className="mb-1 h-4 w-4" />
                Задачи
              </Button>
              <Button variant="outline" className="h-11 rounded-2xl border-[#133C2A]/12 px-2 text-xs" onClick={() => setIsEditingNotes(true)}>
                <MessageSquareText className="mb-1 h-4 w-4" />
                Комментарий
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
            <div className="space-y-3">
              <Card className="border-[#133C2A]/10 bg-white/95">
                <CardContent className="p-4">
                  <ClientNextAction nextAction={entry.nextAction} />
                  <p className="mt-3 text-xs text-[#133C2A]/45">Рекомендовано системой</p>
                </CardContent>
              </Card>

              <Accordion type="multiple" className="space-y-3">
                <AccordionItem value="trial" className="rounded-[24px] border border-[#133C2A]/10 bg-white/95 px-4">
                  <AccordionTrigger className="text-[#133C2A] hover:no-underline">Пробное</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="rounded-2xl bg-[#F8F4E3]/72 p-3">
                      <p className="text-sm text-[#133C2A]">{entry.trialFacts.title}</p>
                      <p className="mt-1 text-sm text-[#133C2A]/60">{entry.trialFacts.note}</p>
                    </div>
                    <div className="space-y-2 text-sm text-[#133C2A]">
                      <p>Источник: {sourceLabel(entry)}</p>
                      <p>Интерес: {entry.child.landingLead?.comment || 'Не указан'}</p>
                      <p>Группа: {entry.child.groupName || 'Не назначена'}</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="payment" className="rounded-[24px] border border-[#133C2A]/10 bg-white/95 px-4">
                  <AccordionTrigger className="text-[#133C2A] hover:no-underline">Оплата</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    {entry.latestOpenPayment ? (
                      <>
                        <div className="rounded-2xl bg-[#F8F4E3]/72 p-3">
                          <p className="text-sm text-[#133C2A]">{paymentStatusLabel(entry.latestOpenPayment.status)}</p>
                          <p className="mt-1 text-lg text-[#133C2A]">{Number(entry.latestOpenPayment.amount || 0).toLocaleString('ru-RU')} ₽</p>
                          <p className="mt-1 text-xs text-[#133C2A]/55">
                            Срок: {formatRuDate(entry.latestOpenPayment.dueDate || entry.latestOpenPayment.createdAt)}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button className="rounded-2xl bg-[#133C2A] text-white" onClick={onOpenPayments}>
                            Открыть оплаты
                          </Button>
                          <Button variant="outline" className="rounded-2xl border-[#133C2A]/12" onClick={onRemind} disabled={!onRemind}>
                            Напомнить
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-[#133C2A]/58">Открытых платежей нет</p>
                        <Button className="rounded-2xl bg-[#133C2A] text-white" onClick={onCreateInvoice}>
                          Выставить счет
                        </Button>
                      </div>
                    )}

                    {payments.length > 0 ? (
                      <div className="space-y-2">
                        {payments.slice(0, 3).map((payment) => (
                          <div key={payment.id} className="rounded-2xl border border-[#133C2A]/10 px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm text-[#133C2A]">{payment.subscriptionName || entry.child.subscriptionName || 'Абонемент'}</p>
                                <p className="text-xs text-[#133C2A]/55">{formatRuDateTime(payment.createdAt)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-[#133C2A]">{Number(payment.amount || 0).toLocaleString('ru-RU')} ₽</p>
                                <PaymentStatusBadge status={payment.status} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="group" className="rounded-[24px] border border-[#133C2A]/10 bg-white/95 px-4">
                  <AccordionTrigger className="text-[#133C2A] hover:no-underline">Группа</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="rounded-2xl bg-[#F8F4E3]/72 p-3">
                      <p className="text-sm text-[#133C2A]">{entry.child.groupName || 'Группа не назначена'}</p>
                      <p className="mt-1 text-sm text-[#133C2A]/58">
                        {entry.child.groupName ? 'Группа связана с карточкой ученика.' : 'Назначьте группу, чтобы связать ребенка с расписанием.'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Назначить группу</Label>
                      <Select value={entry.child.groupId || 'none'} onValueChange={(value) => onAssignGroup(value === 'none' ? null : value)}>
                        <SelectTrigger className="rounded-2xl">
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
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="comments" className="rounded-[24px] border border-[#133C2A]/10 bg-white/95 px-4">
                  <AccordionTrigger className="text-[#133C2A] hover:no-underline">Комментарии</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="grid gap-3">
                      <div className="rounded-2xl bg-[#F8F4E3]/72 p-3">
                        <p className="text-xs text-[#133C2A]/45">Важное</p>
                        <p className="mt-1 text-sm text-[#133C2A]">{profileDraft.internalComment || 'Нет заметки'}</p>
                      </div>
                      <div className="rounded-2xl bg-[#F8F4E3]/72 p-3">
                        <p className="text-xs text-[#133C2A]/45">Здоровье</p>
                        <p className="mt-1 text-sm text-[#133C2A]">{profileDraft.healthNotes || 'Ограничений нет'}</p>
                      </div>
                      <div className="rounded-2xl bg-[#F8F4E3]/72 p-3">
                        <p className="text-xs text-[#133C2A]/45">Поведение</p>
                        <p className="mt-1 text-sm text-[#133C2A]">{profileDraft.behavioralNotes || 'Нет заметок'}</p>
                      </div>
                      <div className="rounded-2xl bg-[#F8F4E3]/72 p-3">
                        <p className="text-xs text-[#133C2A]/45">Цели</p>
                        <p className="mt-1 text-sm text-[#133C2A]">{profileDraft.goals || 'Не заполнено'}</p>
                      </div>
                      <div className="rounded-2xl bg-[#F8F4E3]/72 p-3">
                        <p className="text-xs text-[#133C2A]/45">Ожидания родителя</p>
                        <p className="mt-1 text-sm text-[#133C2A]">{profileDraft.parentExpectations || 'Не заполнено'}</p>
                      </div>
                      <div className="rounded-2xl bg-[#F8F4E3]/72 p-3">
                        <p className="text-xs text-[#133C2A]/45">Коммуникация</p>
                        <p className="mt-1 text-sm text-[#133C2A]">{profileDraft.communicationPreferences || 'Не заполнено'}</p>
                      </div>
                      <div className="rounded-2xl bg-[#F8F4E3]/72 p-3">
                        <p className="text-xs text-[#133C2A]/45">Теги</p>
                        <p className="mt-1 text-sm text-[#133C2A]">{profileDraft.tagsInput || 'Нет тегов'}</p>
                      </div>
                    </div>

                    {!isEditingNotes ? (
                      <Button variant="outline" className="w-full rounded-2xl border-[#133C2A]/12" onClick={() => setIsEditingNotes(true)}>
                        Редактировать заметки
                      </Button>
                    ) : (
                      <div className="space-y-3 rounded-[24px] border border-[#133C2A]/10 bg-[#FCFAF0] p-3">
                        <div className="space-y-1">
                          <Label>Важное</Label>
                          <Textarea value={profileDraft.internalComment} onChange={(event) => setProfileDraft((prev) => ({ ...prev, internalComment: event.target.value }))} className="min-h-[84px] rounded-2xl" />
                        </div>
                        <div className="space-y-1">
                          <Label>Здоровье</Label>
                          <Textarea value={profileDraft.healthNotes} onChange={(event) => setProfileDraft((prev) => ({ ...prev, healthNotes: event.target.value }))} className="min-h-[84px] rounded-2xl" />
                        </div>
                        <div className="space-y-1">
                          <Label>Поведение</Label>
                          <Textarea value={profileDraft.behavioralNotes} onChange={(event) => setProfileDraft((prev) => ({ ...prev, behavioralNotes: event.target.value }))} className="min-h-[84px] rounded-2xl" />
                        </div>
                        <div className="space-y-1">
                          <Label>Цели</Label>
                          <Textarea value={profileDraft.goals} onChange={(event) => setProfileDraft((prev) => ({ ...prev, goals: event.target.value }))} className="min-h-[84px] rounded-2xl" />
                        </div>
                        <div className="space-y-1">
                          <Label>Сильные стороны</Label>
                          <Textarea value={profileDraft.strengths} onChange={(event) => setProfileDraft((prev) => ({ ...prev, strengths: event.target.value }))} className="min-h-[84px] rounded-2xl" />
                        </div>
                        <div className="space-y-1">
                          <Label>Ожидания родителя</Label>
                          <Textarea value={profileDraft.parentExpectations} onChange={(event) => setProfileDraft((prev) => ({ ...prev, parentExpectations: event.target.value }))} className="min-h-[84px] rounded-2xl" />
                        </div>
                        <div className="space-y-1">
                          <Label>Коммуникация</Label>
                          <Input value={profileDraft.communicationPreferences} onChange={(event) => setProfileDraft((prev) => ({ ...prev, communicationPreferences: event.target.value }))} className="rounded-2xl" />
                        </div>
                        <div className="space-y-1">
                          <Label>Источник</Label>
                          <Input value={profileDraft.sourceChannel} onChange={(event) => setProfileDraft((prev) => ({ ...prev, sourceChannel: event.target.value }))} className="rounded-2xl" />
                        </div>
                        <div className="space-y-1">
                          <Label>Опыт</Label>
                          <Textarea value={profileDraft.priorExperience} onChange={(event) => setProfileDraft((prev) => ({ ...prev, priorExperience: event.target.value }))} className="min-h-[84px] rounded-2xl" />
                        </div>
                        <div className="space-y-1">
                          <Label>Теги</Label>
                          <Input value={profileDraft.tagsInput} onChange={(event) => setProfileDraft((prev) => ({ ...prev, tagsInput: event.target.value }))} className="rounded-2xl" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" className="rounded-2xl border-[#133C2A]/12" onClick={() => setIsEditingNotes(false)}>
                            Свернуть
                          </Button>
                          <Button className="rounded-2xl bg-[#133C2A] text-white" onClick={onSaveProfile} disabled={isProfileSaving}>
                            {isProfileSaving ? 'Сохраняем...' : 'Сохранить'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="history" className="rounded-[24px] border border-[#133C2A]/10 bg-white/95 px-4">
                  <AccordionTrigger className="text-[#133C2A] hover:no-underline">История</AccordionTrigger>
                  <AccordionContent>
                    <ClientTimeline entries={entry.timeline} />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="child" className="rounded-[24px] border border-[#133C2A]/10 bg-white/95 px-4">
                  <AccordionTrigger className="text-[#133C2A] hover:no-underline">Данные ребенка</AccordionTrigger>
                  <AccordionContent className="space-y-2 text-sm text-[#133C2A]">
                    <p>ФИО: {entry.child.fullName || '—'}</p>
                    <p>Возраст: {entry.child.age ?? '—'} лет</p>
                    <p>Дата рождения: {formatRuDate(entry.child.birthDate)}</p>
                    <p>Опыт: {profileDraft.priorExperience || entry.child.landingLead?.previousActivities || '—'}</p>
                    <p>Ограничения: {profileDraft.healthNotes || entry.child.landingLead?.medicalRestrictions || '—'}</p>
                    <p>Сильные стороны: {profileDraft.strengths || '—'}</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="parent" className="rounded-[24px] border border-[#133C2A]/10 bg-white/95 px-4">
                  <AccordionTrigger className="text-[#133C2A] hover:no-underline">Данные родителя</AccordionTrigger>
                  <AccordionContent className="space-y-2 text-sm text-[#133C2A]">
                    <p>Родитель: {entry.child.parentName || '—'}</p>
                    <p>Телефон: {entry.child.parentPhone || '—'}</p>
                    <p>Доступ в ЛК: {entry.child.parentAccountStatus || '—'}</p>
                    <p>Источник: {sourceLabel(entry)}</p>
                    <p>Ожидания: {profileDraft.parentExpectations || '—'}</p>
                    <p>Экстренный контакт: {profileDraft.emergencyContactName || '—'} {profileDraft.emergencyContactPhone ? `· ${profileDraft.emergencyContactPhone}` : ''}</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="overview" className="rounded-[24px] border border-[#133C2A]/10 bg-white/95 px-4">
                  <AccordionTrigger className="text-[#133C2A] hover:no-underline">Обзор</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-[#F8F4E3]/72 p-3">
                        <p className="text-xs text-[#133C2A]/45">Статус</p>
                        <p className="mt-1 text-sm text-[#133C2A]">{clientStageLabel[entry.stage]}</p>
                      </div>
                      <div className="rounded-2xl bg-[#F8F4E3]/72 p-3">
                        <p className="text-xs text-[#133C2A]/45">Температура</p>
                        <p className="mt-1 text-sm text-[#133C2A]">{clientTemperatureLabel[entry.temperature]}</p>
                      </div>
                      <div className="rounded-2xl bg-[#F8F4E3]/72 p-3">
                        <p className="text-xs text-[#133C2A]/45">Абонемент</p>
                        <p className="mt-1 text-sm text-[#133C2A]">{entry.child.subscriptionName || 'Не выбран'}</p>
                      </div>
                      <div className="rounded-2xl bg-[#F8F4E3]/72 p-3">
                        <p className="text-xs text-[#133C2A]/45">Оплата</p>
                        <p className="mt-1 text-sm text-[#133C2A]">{paymentStatusLabel(entry.latestOpenPayment?.status || entry.child.paymentStatus)}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-[#F8F4E3]/72 p-3 text-sm text-[#133C2A]">
                      <p className="text-xs text-[#133C2A]/45">Почему этот статус</p>
                      <p className="mt-1">{stageReason(entry.stage)}</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="funnel" className="rounded-[24px] border border-[#133C2A]/10 bg-white/95 px-4">
                  <AccordionTrigger className="text-[#133C2A] hover:no-underline">Воронка</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    {buildFunnelSteps(entry).map((step) => (
                      <div key={step.id} className="flex items-center gap-3 rounded-2xl border border-[#133C2A]/10 px-3 py-3">
                        <span className={`h-3 w-3 rounded-full ${step.state === 'done' ? 'bg-green-500' : step.state === 'current' ? 'bg-[#D4AF37]' : 'bg-[#133C2A]/15'}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-[#133C2A]">{step.label}</p>
                          <p className="text-xs text-[#133C2A]/50">{step.date ? formatRuDateTime(step.date) : 'Дата пока не хранится отдельно'}</p>
                        </div>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
