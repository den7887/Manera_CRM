import {
  Activity,
  Calendar,
  CheckSquare,
  MessageCircleMore,
  Receipt,
  TicketPlus,
} from 'lucide-react';
import type { AdminLandingLeadRecord } from '../../lib/backendApi';
import { Event, FinanceStats, Group, Task, User } from '../../types';
import { Card, CardContent } from '../ui/card';
import { NotificationPermissionPrompt } from '../NotificationPermissionPrompt';

interface OwnerHomeProps {
  user: User;
  events: Event[];
  stats: FinanceStats;
  groups: Group[];
  tasks: Task[];
  payments: Array<{
    id: string;
    type: 'subscription' | 'single';
    status: 'paid' | 'pending' | 'waiting_confirmation' | 'overdue' | 'unpaid' | 'failed' | 'refunded' | 'cancelled' | 'expired';
  }>;
  onNavigate: (page: string) => void;
  onOpenOverduePayments: () => void;
  landingLeads: AdminLandingLeadRecord[];
  chatUnreadMessagesCount: number;
}

function getFirstName(name?: string | null): string {
  // ФИО в системе хранится как «Фамилия Имя Отчество» (см. ParentHome.tsx —
  // тот же порядок), поэтому имя — второе слово, а не первое: для
  // «Павлова Олеся Витальевна» это «Олеся», а не «Павлова».
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return parts[1] || parts[0] || '';
}

export function OwnerHome({
  user,
  events,
  stats,
  groups,
  tasks,
  payments,
  onNavigate,
  onOpenOverduePayments,
  landingLeads,
  chatUnreadMessagesCount,
}: OwnerHomeProps) {
  const today = new Date();
  const todayEvents = events.filter((event) => new Date(event.date).toDateString() === today.toDateString());
  const weekEvents = events.filter((event) => {
    const eventDate = new Date(event.date);
    const weekTo = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return eventDate >= today && eventDate <= weekTo;
  });

  const openTasks = tasks.filter((task) => task.status === 'todo');
  const urgentTasks = openTasks.filter((task) => task.priority === 'urgent' || task.priority === 'high');
  const newLeadsCount = landingLeads.filter((lead) => !lead.status || lead.status === 'new').length;
  const overdueSubscriptionsCount = payments.filter(
    (payment) => payment.type === 'subscription' && payment.status === 'overdue',
  ).length;
  const firstName = getFirstName(user.name);

  const todaySchedule = todayEvents
    .slice()
    .sort((left, right) => left.startTime.localeCompare(right.startTime))
    .slice(0, 3)
    .map((event) => {
      const group = groups.find((item) => item.id === event.groupId);
      return {
        id: event.id,
        title: event.groupName || event.title,
        time: `${event.startTime}–${event.endTime}`,
        people: group?.studentCount || 0,
      };
    });

  const heroSignals = [
    {
      key: 'messages',
      title: 'Новые сообщения',
      value: String(chatUnreadMessagesCount),
      note: 'Только непрочитанные сообщения из чатов',
      action: 'Открыть чаты',
      Icon: MessageCircleMore,
      tone: 'border-white/12 bg-white/[0.08] hover:bg-white/[0.12]',
      onClick: () => onNavigate('communication'),
    },
    {
      key: 'leads',
      title: 'Новые заявки',
      value: String(newLeadsCount),
      note: 'Свежие лиды с лендинга и формы записи',
      action: 'Открыть заявки',
      Icon: TicketPlus,
      tone: 'border-white/12 bg-white/[0.08] hover:bg-white/[0.12]',
      onClick: () => onNavigate('clients'),
    },
    {
      key: 'overdue-subscriptions',
      title: 'Просроченные абонементы',
      value: String(overdueSubscriptionsCount),
      note: 'Открывает оплаты с фильтром «Просрочено»',
      action: 'Открыть оплаты',
      Icon: Receipt,
      tone: 'border-[#F4D776]/30 bg-[#F4D776]/10 hover:bg-[#F4D776]/16',
      onClick: onOpenOverduePayments,
    },
  ];

  const quickActions = [
    {
      title: 'Группы и расписание',
      note: `${todayEvents.length} сегодня, ${weekEvents.length} на неделе`,
      page: 'groups',
      Icon: Calendar,
    },
    {
      title: 'Задачи',
      note: `${openTasks.length} открыто, срочных ${urgentTasks.length}`,
      page: 'tasks',
      Icon: CheckSquare,
    },
    {
      title: 'Отчеты',
      note: `Конверсия ${stats.trialConversion}%`,
      page: 'analytics',
      Icon: Activity,
    },
    {
      title: 'Деньги',
      note: 'Оплаты, расходы и абонементы',
      page: 'finance',
      Icon: Receipt,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">
      <NotificationPermissionPrompt />
      <section className="overflow-hidden rounded-[1.35rem] border border-[#133C2A]/10 bg-[#123827] text-white shadow-[0_18px_42px_rgba(19,60,42,0.16)] md:rounded-[2rem]">
        <div className="grid gap-3 p-3 md:grid-cols-[1.15fr_0.85fr] md:gap-4 md:p-7">
          <div className="min-w-0">
            <h1 className="max-w-2xl text-[1.75rem] leading-[1.05] md:text-5xl">
              {firstName ? `Здравствуйте, ${firstName}!` : 'Здравствуйте!'}
            </h1>

            <div className="mt-4 rounded-[1.15rem] border border-white/12 bg-white/[0.08] p-4 md:mt-6 md:max-w-xl md:rounded-[1.5rem]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/52">Сегодня в расписании</p>
                  <p className="mt-2 text-sm text-white/80">
                    {todayEvents.length > 0 ? `${todayEvents.length} занятий` : 'Занятий сегодня нет'}
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                  {todayEvents.length} событий
                </span>
              </div>

              {todaySchedule.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {todaySchedule.map((event) => (
                    <div key={event.id} className="flex items-center justify-between gap-3 rounded-2xl bg-black/10 px-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">{event.title}</p>
                        <p className="mt-1 text-xs text-white/64">{event.time}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm text-white">{event.people}</p>
                        <p className="mt-1 text-[11px] text-white/58">чел.</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-white/64">На сегодня в календаре нет активных занятий.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 md:grid-cols-1 md:gap-3">
            {heroSignals.map((signal) => {
              const Icon = signal.Icon;
              return (
                <button
                  key={signal.key}
                  type="button"
                  onClick={signal.onClick}
                  className={`rounded-[1.15rem] border p-3 text-left transition-smooth hover:-translate-y-0.5 md:rounded-[1.5rem] md:p-4 ${signal.tone}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/12 md:h-11 md:w-11">
                      <Icon className="h-4 w-4 text-white md:h-5 md:w-5" />
                    </span>
                    <div className="min-w-0 text-right">
                      <p className="text-2xl leading-none text-white md:text-3xl">{signal.value}</p>
                      <p className="mt-1 hidden text-xs uppercase tracking-[0.14em] text-white/45 md:block">сейчас</p>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-[11px] leading-tight text-white md:mt-4 md:text-base">
                    {signal.title}
                  </p>
                  <p className="mt-1 hidden text-sm leading-relaxed text-white/70 md:block">{signal.note}</p>
                  <p className="mt-4 hidden text-sm text-[#F4D776] md:block">{signal.action}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <Card className="border-none bg-white/92 shadow-[0_12px_40px_rgba(19,60,42,0.07)]">
          <CardContent className="p-3 md:p-5">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {quickActions.map((item) => {
                const Icon = item.Icon;
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => onNavigate(item.page)}
                    className="rounded-2xl border border-[#133C2A]/10 bg-[#fbf7e8] p-3 text-left transition-smooth hover:border-[#D4AF37]/35 md:p-4"
                  >
                    <Icon className="h-5 w-5 text-[#133C2A]" />
                    <p className="mt-3 text-sm text-[#133C2A]">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#133C2A]/58">{item.note}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
