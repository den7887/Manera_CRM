import { useMemo, useState } from 'react';
import { AdminPaymentRecord } from '../../lib/backendApi';
import { Group, Task } from '../../types';
import { AlertTriangle, ClipboardList, FolderArchive, Search, SlidersHorizontal, Workflow } from 'lucide-react';
import { EmptyState } from '../EmptyState';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import {
  ArchiveFilter,
  ClientWorkspaceEntry,
  ClientWorkspaceSection,
  MobileMoreTab,
  StageFilter,
  TaskTab,
  TemperatureFilter,
} from './clientsWorkspaceTypes';
import { MobileQueueSummary } from './MobileQueueSummary';
import { MobileClientCard } from './MobileClientCard';
import { MobileClientFiltersSheet } from './MobileClientFiltersSheet';
import { clientStageLabel } from './clientStatus';

function sourceLabel(entry: ClientWorkspaceEntry): string {
  return entry.child.profile?.sourceChannel || entry.child.landingLead?.discoverySource || 'Не указан';
}

function stageReason(stage: ClientWorkspaceEntry['stage']): string {
  switch (stage) {
    case 'lead_new':
      return 'Ждет первого контакта.';
    case 'contact_needed':
      return 'Нужно закрыть первый контакт.';
    case 'trial_scheduled':
      return 'Контроль до или после пробного.';
    case 'thinking':
      return 'Нужно уточнить решение после пробного.';
    case 'waiting_payment':
      return 'Есть счет или ожидание подтверждения.';
    case 'risk':
      return 'Просрочка, нет группы или зависшая карточка.';
    case 'active':
      return 'Действующий клиент студии.';
    default:
      return 'Рабочий сценарий CRM.';
  }
}

function archiveReasonLabel(entry: ClientWorkspaceEntry): string {
  if (entry.stage === 'lost') return 'Отказ';
  if (entry.stage === 'paused' || entry.stage === 'frozen') return 'Бывшие / пауза';
  return 'Причина пока не хранится';
}

function taskDueLabel(task: Task): string {
  if (!task.dueDate) return 'Без срока';
  return new Date(task.dueDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

export function MobileClientsWorkspace({
  isLoading,
  groups,
  searchQuery,
  setSearchQuery,
  groupFilter,
  setGroupFilter,
  paymentFilter,
  setPaymentFilter,
  sourceFilter,
  setSourceFilter,
  stageFilter,
  setStageFilter,
  temperatureFilter,
  setTemperatureFilter,
  archiveFilter,
  setArchiveFilter,
  sourceOptions,
  filteredClients,
  todaySummary,
  todaySections,
  funnelSections,
  trialSections,
  visibleTaskPool,
  taskTab,
  setTaskTab,
  archivePool,
  onOpenClient,
  onOpenPayments,
  onCreateInvoice,
  onRemind,
  onOpenTasks,
  onAssignGroup,
  onOpenComments,
  isInvoicingChildId,
  isReminderPaymentId,
  onNavigateSection,
}: {
  isLoading: boolean;
  groups: Group[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  groupFilter: string;
  setGroupFilter: (value: string) => void;
  paymentFilter: string;
  setPaymentFilter: (value: string) => void;
  sourceFilter: string;
  setSourceFilter: (value: string) => void;
  stageFilter: StageFilter;
  setStageFilter: (value: StageFilter) => void;
  temperatureFilter: TemperatureFilter;
  setTemperatureFilter: (value: TemperatureFilter) => void;
  archiveFilter: ArchiveFilter;
  setArchiveFilter: (value: ArchiveFilter) => void;
  sourceOptions: string[];
  filteredClients: ClientWorkspaceEntry[];
  todaySummary: {
    newRequests: number;
    trials: number;
    waitingDecision: number;
    waitingPayment: number;
    risk: number;
    withoutConcreteAction: number;
  };
  todaySections: ClientWorkspaceSection[];
  funnelSections: ClientWorkspaceSection[];
  trialSections: ClientWorkspaceSection[];
  visibleTaskPool: Task[];
  taskTab: TaskTab;
  setTaskTab: (value: TaskTab) => void;
  archivePool: ClientWorkspaceEntry[];
  onOpenClient: (childId: string) => void;
  onOpenPayments: (entry: ClientWorkspaceEntry) => void;
  onCreateInvoice: (entry: ClientWorkspaceEntry) => void;
  onRemind: (payment: AdminPaymentRecord) => void;
  onOpenTasks: (entry: ClientWorkspaceEntry) => void;
  onAssignGroup: (entry: ClientWorkspaceEntry) => void;
  onOpenComments: (entry: ClientWorkspaceEntry) => void;
  isInvoicingChildId: string | null;
  isReminderPaymentId: string | null;
  onNavigateSection?: (page: string) => void;
}) {
  const [mobileTab, setMobileTab] = useState<'today' | 'funnel' | 'trials' | 'base' | 'more'>('today');
  const [moreTab, setMoreTab] = useState<MobileMoreTab>('tasks');
  const [todayFocus, setTodayFocus] = useState<'all' | 'new' | 'trials' | 'after' | 'waiting' | 'risk' | 'no-action'>('all');
  const [activeFunnelId, setActiveFunnelId] = useState<string>('new');
  const [activeTrialId, setActiveTrialId] = useState<string>('new_request');
  const [baseQuickFilter, setBaseQuickFilter] = useState<'all' | 'active' | 'waiting' | 'ungrouped' | 'risk' | 'archive'>('all');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [expandedTodaySections, setExpandedTodaySections] = useState<string[]>([]);

  const sourceStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredClients.forEach((entry) => {
      const key = sourceLabel(entry);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredClients]);

  const visibleTodaySections = useMemo(() => {
    if (todayFocus === 'all') return todaySections;
    const targetIds =
      todayFocus === 'new'
        ? ['new']
        : todayFocus === 'trials'
          ? ['trials']
          : todayFocus === 'after'
            ? ['trials']
            : todayFocus === 'waiting'
              ? ['payments']
              : todayFocus === 'risk'
                ? ['risk']
                : ['no-action'];
    return todaySections.filter((section) => targetIds.includes(section.id));
  }, [todayFocus, todaySections]);

  const activeFunnelSection = useMemo(
    () => funnelSections.find((section) => section.id === activeFunnelId) || funnelSections[0] || null,
    [activeFunnelId, funnelSections],
  );

  const activeTrialSection = useMemo(
    () => trialSections.find((section) => section.id === activeTrialId) || trialSections[0] || null,
    [activeTrialId, trialSections],
  );

  const baseClients = useMemo(() => {
    return filteredClients.filter((entry) => {
      if (baseQuickFilter === 'active') return entry.stage === 'active';
      if (baseQuickFilter === 'waiting') return entry.stage === 'waiting_payment';
      if (baseQuickFilter === 'ungrouped') return !entry.child.groupId;
      if (baseQuickFilter === 'risk') return entry.stage === 'risk';
      if (baseQuickFilter === 'archive') return ['archived', 'paused', 'lost', 'frozen'].includes(entry.stage);
      return true;
    });
  }, [filteredClients, baseQuickFilter]);

  const resetFilters = () => {
    setGroupFilter('all');
    setPaymentFilter('all');
    setSourceFilter('all');
    setStageFilter('all');
    setTemperatureFilter('all');
    setArchiveFilter('all');
    setIsFiltersOpen(false);
  };

  const renderMobileCard = (entry: ClientWorkspaceEntry, highlight?: string) => (
    <MobileClientCard
      key={entry.child.id}
      entry={entry}
      groups={groups}
      highlight={highlight}
      onOpen={() => onOpenClient(entry.child.id)}
      onOpenPayments={() => onOpenPayments(entry)}
      onCreateInvoice={() => onCreateInvoice(entry)}
      onRemind={entry.latestOpenPayment ? () => onRemind(entry.latestOpenPayment as AdminPaymentRecord) : undefined}
      onOpenTasks={() => onOpenTasks(entry)}
      onAssignGroup={() => onAssignGroup(entry)}
      onOpenComments={() => onOpenComments(entry)}
      isInvoicing={isInvoicingChildId === entry.child.id}
      isReminding={entry.latestOpenPayment ? isReminderPaymentId === entry.latestOpenPayment.id : false}
    />
  );

  return (
    <div className="space-y-4 pb-6">
      <div className="rounded-[28px] border border-[#133C2A]/10 bg-gradient-to-br from-[#133C2A] to-[#1d5a3f] px-4 py-5 text-white">
        <p className="text-[23px] leading-tight">Клиенты и заявки</p>
        <p className="mt-2 text-sm text-white/72">
          Сегодня нужно обработать: {todaySummary.newRequests + todaySummary.waitingPayment + todaySummary.risk}
        </p>
      </div>

      <div className="mobile-scroll-x rounded-2xl border border-[#133C2A]/10 bg-[#F8F4E3]/75 p-1">
        <div className="flex min-w-max gap-1">
          {[
            { id: 'today', label: 'Сегодня' },
            { id: 'funnel', label: 'Воронка' },
            { id: 'trials', label: 'Пробные' },
            { id: 'base', label: 'База' },
            { id: 'more', label: 'Еще' },
          ].map((tab) => (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={mobileTab === tab.id ? 'default' : 'ghost'}
              className={mobileTab === tab.id ? 'rounded-xl bg-[#133C2A]' : 'rounded-xl text-[#133C2A]/68'}
              onClick={() => setMobileTab(tab.id as typeof mobileTab)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-[#133C2A]/60">Загрузка клиентской базы...</div>
      ) : mobileTab === 'today' ? (
        <div className="space-y-4">
          <div className="mobile-scroll-x">
            <div className="flex min-w-max gap-2 pb-1">
              <MobileQueueSummary label="Новые" value={todaySummary.newRequests} active={todayFocus === 'new'} onClick={() => setTodayFocus(todayFocus === 'new' ? 'all' : 'new')} />
              <MobileQueueSummary label="Пробные" value={todaySummary.trials} active={todayFocus === 'trials'} onClick={() => setTodayFocus(todayFocus === 'trials' ? 'all' : 'trials')} />
              <MobileQueueSummary label="После" value={todaySummary.waitingDecision} active={todayFocus === 'after'} onClick={() => setTodayFocus(todayFocus === 'after' ? 'all' : 'after')} />
              <MobileQueueSummary label="Оплата" value={todaySummary.waitingPayment} active={todayFocus === 'waiting'} onClick={() => setTodayFocus(todayFocus === 'waiting' ? 'all' : 'waiting')} />
              <MobileQueueSummary label="Риск" value={todaySummary.risk} active={todayFocus === 'risk'} onClick={() => setTodayFocus(todayFocus === 'risk' ? 'all' : 'risk')} />
              <MobileQueueSummary label="Без шага" value={todaySummary.withoutConcreteAction} active={todayFocus === 'no-action'} onClick={() => setTodayFocus(todayFocus === 'no-action' ? 'all' : 'no-action')} />
            </div>
          </div>

          {visibleTodaySections.every((section) => section.items.length === 0) ? (
            <EmptyState
              icon={ClipboardList}
              title="Сегодня нет клиентов в активной обработке"
              description="Когда появятся новые заявки, пробные или оплаты в работе, они будут собраны здесь по очередям."
            />
          ) : (
            visibleTodaySections.map((section) => {
              const expanded = expandedTodaySections.includes(section.id);
              const visibleItems = expanded ? section.items : section.items.slice(0, 3);
              return (
                <section key={section.id} className="rounded-[28px] border border-[#133C2A]/10 bg-[#FCFAF0] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[#133C2A]">{section.title}</h2>
                      <p className="mt-1 text-sm text-[#133C2A]/55">
                        {section.items.length === 0
                          ? 'В этой очереди сейчас пусто.'
                          : `${section.items.length} клиента ${section.title === 'Новые заявки' ? 'ждут первого контакта' : 'в этой очереди'}`
                        }
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full border-[#133C2A]/12 px-3 py-1 text-[#133C2A]/70">
                      {section.items.length}
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-3">
                    {section.items.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#133C2A]/12 bg-white/70 px-4 py-5 text-sm text-[#133C2A]/52">
                        В этой очереди сейчас пусто.
                      </div>
                    ) : (
                      visibleItems.map((entry) => renderMobileCard(entry, stageReason(entry.stage)))
                    )}
                  </div>
                  {section.items.length > 3 ? (
                    <Button
                      variant="ghost"
                      className="mt-3 w-full rounded-2xl text-[#133C2A]"
                      onClick={() =>
                        setExpandedTodaySections((prev) =>
                          prev.includes(section.id) ? prev.filter((item) => item !== section.id) : [...prev, section.id],
                        )
                      }
                    >
                      {expanded ? 'Свернуть' : 'Показать все'}
                    </Button>
                  ) : null}
                </section>
              );
            })
          )}
        </div>
      ) : mobileTab === 'funnel' ? (
        <div className="space-y-4">
          <div className="mobile-scroll-x">
            <div className="flex min-w-max gap-2 pb-1">
              {funnelSections.map((section) => (
                <MobileQueueSummary
                  key={section.id}
                  label={section.title}
                  value={section.items.length}
                  active={activeFunnelSection?.id === section.id}
                  onClick={() => setActiveFunnelId(section.id)}
                />
              ))}
            </div>
          </div>

          {activeFunnelSection ? (
            <section className="rounded-[28px] border border-[#133C2A]/10 bg-[#FCFAF0] p-4">
              <h2 className="text-[#133C2A]">{activeFunnelSection.title}</h2>
              <p className="mt-1 text-sm text-[#133C2A]/55">
                {activeFunnelSection.title === 'Новые'
                  ? 'Люди, с которыми еще не начали полноценную работу.'
                  : activeFunnelSection.title === 'Пробные'
                    ? 'Записаны, были на пробном или думают после него.'
                    : activeFunnelSection.title === 'Ждут оплату'
                      ? 'Есть счет или платеж еще не подтвержден.'
                      : activeFunnelSection.title === 'Активные'
                        ? 'Действующие ученики студии.'
                        : activeFunnelSection.title === 'Риск'
                          ? 'Просрочка, нет группы или зависшая карточка.'
                          : 'Неактуальные или закрытые карточки.'}
              </p>
              <div className="mt-4 space-y-3">
                {activeFunnelSection.items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#133C2A]/12 bg-white/70 px-4 py-5 text-sm text-[#133C2A]/52">
                    На этом этапе пока нет клиентов.
                  </div>
                ) : (
                  activeFunnelSection.items.map((entry) => renderMobileCard(entry, stageReason(entry.stage)))
                )}
              </div>
            </section>
          ) : null}
        </div>
      ) : mobileTab === 'trials' ? (
        <div className="space-y-4">
          <div className="mobile-scroll-x">
            <div className="flex min-w-max gap-2 pb-1">
              <MobileQueueSummary label="Все" value={trialSections.reduce((sum, section) => sum + section.items.length, 0)} active={activeTrialId === 'all'} onClick={() => setActiveTrialId('all')} />
              {trialSections.map((section) => (
                <MobileQueueSummary
                  key={section.id}
                  label={section.title}
                  value={section.items.length}
                  active={activeTrialId === section.id}
                  onClick={() => setActiveTrialId(section.id)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#133C2A]/10 bg-[#FCFAF0] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[#133C2A]">{activeTrialId === 'all' ? 'Пробные' : activeTrialSection?.title || 'Пробные'}</h2>
                <p className="mt-1 text-sm text-[#133C2A]/55">
                  {activeTrialId === 'all'
                    ? 'Все карточки, связанные с пробным сценарием.'
                    : 'Статус пробного рассчитан по заявке, группе и оплате. Для точной работы нужен backend `trial_lessons`.'}
                </p>
              </div>
              <Badge variant="outline" className="rounded-full border-[#133C2A]/12 px-3 py-1 text-[#133C2A]/70">
                {activeTrialId === 'all'
                  ? trialSections.reduce((sum, section) => sum + section.items.length, 0)
                  : activeTrialSection?.items.length || 0}
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              {(activeTrialId === 'all'
                ? trialSections.flatMap((section) => section.items)
                : activeTrialSection?.items || []
              ).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#133C2A]/12 bg-white/70 px-4 py-5 text-sm text-[#133C2A]/52">
                  Пробных сценариев пока нет.
                </div>
              ) : (
                (activeTrialId === 'all'
                  ? trialSections.flatMap((section) => section.items)
                  : activeTrialSection?.items || []
                ).map((entry) =>
                  renderMobileCard(
                    entry,
                    `${entry.trialFacts.title}. ${entry.nextAction.title} — ${entry.nextAction.dueLabel}.`,
                  ),
                )
              )}
            </div>
          </div>
        </div>
      ) : mobileTab === 'base' ? (
        <div className="space-y-4">
          <div className="space-y-3 rounded-[28px] border border-[#133C2A]/10 bg-[#FCFAF0] p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#133C2A]/40" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск по ребенку, родителю, телефону"
                className="rounded-2xl border-[#133C2A]/12 pl-9"
              />
            </div>
            <div className="mobile-scroll-x">
              <div className="flex min-w-max gap-2 pb-1">
                {[
                  { id: 'all', label: 'Все' },
                  { id: 'active', label: 'Активные' },
                  { id: 'waiting', label: 'Ждут оплату' },
                  { id: 'ungrouped', label: 'Без группы' },
                  { id: 'risk', label: 'Риск' },
                  { id: 'archive', label: 'Архив' },
                ].map((chip) => (
                  <Button
                    key={chip.id}
                    type="button"
                    size="sm"
                    variant={baseQuickFilter === chip.id ? 'default' : 'outline'}
                    className={baseQuickFilter === chip.id ? 'rounded-full bg-[#133C2A]' : 'rounded-full border-[#133C2A]/12 bg-white/90 text-[#133C2A]'}
                    onClick={() => setBaseQuickFilter(chip.id as typeof baseQuickFilter)}
                  >
                    {chip.label}
                  </Button>
                ))}
              </div>
            </div>
            <Button variant="outline" className="rounded-2xl border-[#133C2A]/12" onClick={() => setIsFiltersOpen(true)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Фильтры
            </Button>
          </div>

          <div className="space-y-3">
            {baseClients.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-[#133C2A]/12 bg-white/70 px-4 py-8 text-center text-sm text-[#133C2A]/52">
                По текущим фильтрам клиентов не найдено.
              </div>
            ) : (
              baseClients.map((entry) =>
                renderMobileCard(
                  entry,
                  `${entry.child.groupName || 'Без группы'} · ${clientStageLabel[entry.stage]}`,
                ),
              )
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'tasks', label: 'Задачи', note: 'Сроки и ответственные', Icon: ClipboardList },
              { id: 'archive', label: 'Архив', note: 'Бывшие и неактуальные', Icon: FolderArchive },
              { id: 'sources', label: 'Источники', note: 'Откуда приходят заявки', Icon: Workflow },
              { id: 'tech', label: 'Тех. CRM', note: 'Что пока считается', Icon: AlertTriangle },
            ].map((item) => (
              <Button
                key={item.id}
                type="button"
                variant={moreTab === item.id ? 'default' : 'outline'}
                className={moreTab === item.id ? 'h-auto flex-col items-start rounded-[24px] bg-[#133C2A] px-4 py-4 text-left' : 'h-auto flex-col items-start rounded-[24px] border-[#133C2A]/12 bg-white/94 px-4 py-4 text-left text-[#133C2A]'}
                onClick={() => setMoreTab(item.id as MobileMoreTab)}
              >
                <item.Icon className="h-5 w-5" />
                <span className="mt-3 text-sm">{item.label}</span>
                <span className={`mt-1 text-xs ${moreTab === item.id ? 'text-white/68' : 'text-[#133C2A]/55'}`}>{item.note}</span>
              </Button>
            ))}
          </div>

          {moreTab === 'tasks' ? (
            <div className="space-y-4">
              <div className="mobile-scroll-x rounded-2xl border border-[#133C2A]/10 bg-[#F8F4E3]/75 p-1">
                <div className="flex min-w-max gap-1">
                  {[
                    { id: 'mine', label: 'Мои' },
                    { id: 'today', label: 'Сегодня' },
                    { id: 'overdue', label: 'Просрочены' },
                    { id: 'unassigned', label: 'Без отв.' },
                    { id: 'done', label: 'Выполнены' },
                  ].map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      size="sm"
                      variant={taskTab === item.id ? 'default' : 'ghost'}
                      className={taskTab === item.id ? 'rounded-xl bg-[#133C2A]' : 'rounded-xl text-[#133C2A]/68'}
                      onClick={() => setTaskTab(item.id as TaskTab)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>

              {visibleTaskPool.length === 0 ? (
                <Card className="border-[#133C2A]/10 bg-[#FCFAF0]">
                  <CardContent className="space-y-4 p-5">
                    <div>
                      <p className="text-[#133C2A]">Задач по клиентам пока нет</p>
                      <p className="mt-1 text-sm text-[#133C2A]/58">
                        Сейчас раздел показывает вычисляемые следующие действия в карточках клиентов. Для полной связки нужны backend `client_id` и `child_id`.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Button className="rounded-2xl bg-[#133C2A] text-white" onClick={() => onNavigateSection?.('tasks-management')}>
                        Открыть общий раздел задач
                      </Button>
                      <Button variant="outline" className="rounded-2xl border-[#133C2A]/12" onClick={() => setMobileTab('today')}>
                        Открыть клиентов без следующего шага
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                visibleTaskPool.map((task) => {
                  const linkedClient = filteredClients.find(
                    (entry) => entry.child.id === task.relatedChildId || entry.child.parentUserId === task.relatedUserId,
                  );
                  return (
                    <Card key={task.id} className="border-[#133C2A]/10 bg-white/94">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[#133C2A]">{task.title}</p>
                            <p className="mt-1 text-sm text-[#133C2A]/58">{task.description}</p>
                          </div>
                          <Badge variant="outline" className="rounded-full border-[#133C2A]/12">
                            {task.status}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-[#133C2A]/60">
                          <p>Срок: {taskDueLabel(task)}</p>
                          <p>Ответственный: {task.assigneeName}</p>
                          {linkedClient ? <p>Клиент: {linkedClient.child.parentName || linkedClient.child.fullName}</p> : null}
                        </div>
                        <Button variant="outline" className="w-full rounded-2xl border-[#133C2A]/12" onClick={() => linkedClient ? onOpenClient(linkedClient.child.id) : onNavigateSection?.('tasks-management')}>
                          {linkedClient ? 'Открыть клиента' : 'Открыть задачи'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          ) : moreTab === 'archive' ? (
            <div className="space-y-4">
              <div className="mobile-scroll-x rounded-2xl border border-[#133C2A]/10 bg-[#F8F4E3]/75 p-1">
                <div className="flex min-w-max gap-1">
                  {[
                    { id: 'all', label: 'Все' },
                    { id: 'lost', label: 'Отказ' },
                    { id: 'former', label: 'Бывшие' },
                    { id: 'no_show', label: 'Не пришел' },
                    { id: 'other', label: 'Другое' },
                  ].map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      size="sm"
                      variant={archiveFilter === item.id ? 'default' : 'ghost'}
                      className={archiveFilter === item.id ? 'rounded-xl bg-[#133C2A]' : 'rounded-xl text-[#133C2A]/68'}
                      onClick={() => setArchiveFilter(item.id as ArchiveFilter)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>

              {archivePool.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-[#133C2A]/12 bg-white/70 px-4 py-8 text-center text-sm text-[#133C2A]/52">
                  Архивных карточек по текущему фильтру нет.
                </div>
              ) : (
                archivePool.map((entry) => renderMobileCard(entry, `Архив: ${archiveReasonLabel(entry)}`))
              )}
            </div>
          ) : moreTab === 'sources' ? (
            <div className="space-y-3">
              {sourceStats.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-[#133C2A]/12 bg-white/70 px-4 py-8 text-center text-sm text-[#133C2A]/52">
                  Источники пока не определены.
                </div>
              ) : (
                sourceStats.map(([source, count]) => (
                  <Card key={source} className="border-[#133C2A]/10 bg-white/94">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="text-[#133C2A]">{source}</p>
                        <p className="mt-1 text-sm text-[#133C2A]/58">Карточек в CRM: {count}</p>
                      </div>
                      <Badge variant="outline" className="rounded-full border-[#133C2A]/12 px-3 py-1 text-[#133C2A]/70">
                        {count}
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <Card className="border-[#133C2A]/10 bg-[#FCFAF0]">
              <CardContent className="space-y-3 p-5">
                <p className="text-[#133C2A]">Техническая информация CRM</p>
                <p className="text-sm text-[#133C2A]/58">
                  Часть CRM-статусов пока рассчитывается по заявке, группе, оплате и дате обновления. Для точной работы нужны backend-поля `crm_status`, `next_action`, `trial_lessons`, `client_timeline`.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <MobileClientFiltersSheet
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        groups={groups}
        sourceOptions={sourceOptions}
        groupFilter={groupFilter}
        paymentFilter={paymentFilter}
        sourceFilter={sourceFilter}
        stageFilter={stageFilter}
        temperatureFilter={temperatureFilter}
        onGroupFilterChange={setGroupFilter}
        onPaymentFilterChange={setPaymentFilter}
        onSourceFilterChange={setSourceFilter}
        onStageFilterChange={setStageFilter}
        onTemperatureFilterChange={setTemperatureFilter}
        onReset={resetFilters}
      />
    </div>
  );
}
