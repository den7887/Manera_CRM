import { useEffect, useState } from 'react';
import {
  Activity,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  MessageCircleMore,
  Receipt,
  TicketPlus,
} from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { type AdminLandingLeadRecord, type AttendanceDayGroupDto, loadAttendanceDay } from '../../lib/backendApi';
import { Event, FinanceStats, Group, MonthlyData, Task, User } from '../../types';
import { Card, CardContent } from '../ui/card';
import { NotificationPermissionPrompt } from '../NotificationPermissionPrompt';
import { formatMoney } from '../money/moneyTypes';

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
  monthlyData: MonthlyData[];
  onNavigate: (page: string) => void;
  onOpenOverduePayments: () => void;
  landingLeads: AdminLandingLeadRecord[];
  chatUnreadMessagesCount: number;
}

function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#133C2A]/10 bg-white px-3 py-2 shadow-[0_12px_28px_rgba(19,60,42,0.12)]">
      <p className="text-xs text-[#133C2A]/60">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-sm text-[#133C2A]">
          {entry.dataKey === 'income' ? 'Доход' : 'Расход'}: {formatMoney(entry.value)}
        </p>
      ))}
    </div>
  );
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
  monthlyData,
  onNavigate,
  onOpenOverduePayments,
  landingLeads,
  chatUnreadMessagesCount,
}: OwnerHomeProps) {
  const [attendanceGroups, setAttendanceGroups] = useState<AttendanceDayGroupDto[]>([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadAttendanceDay(todayIso())
      .then((rows) => {
        if (active) setAttendanceGroups(rows);
      })
      .catch(() => {
        if (active) setAttendanceGroups([]);
      })
      .finally(() => {
        if (active) setIsAttendanceLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const attendanceMarkedGroups = attendanceGroups.filter(
    (group) => group.studentCount > 0 && group.markedCount >= group.studentCount,
  ).length;
  const attendancePendingGroups = attendanceGroups.filter((group) => group.markedCount < group.studentCount);

  const revenueTrend = (monthlyData || []).slice(-6);

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
    <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
      <NotificationPermissionPrompt />
      <section className="overflow-hidden rounded-[1.35rem] border border-[#133C2A]/10 bg-[#123827] text-white shadow-[0_18px_42px_rgba(19,60,42,0.16)] md:rounded-[2rem]">
        <div className="grid gap-3 p-3 md:grid-cols-[1.15fr_0.85fr] md:gap-4 md:p-7">
          <div className="min-w-0">
            <h1 className="max-w-2xl">
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

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="border-none bg-white/92 shadow-[0_12px_40px_rgba(19,60,42,0.07)]">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[#133C2A]">Динамика финансов</p>
                <p className="mt-1 text-xs text-[#133C2A]/55">Доход и расходы по месяцам</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('finance')}
                className="text-xs text-[#8B6B00] hover:text-[#133C2A]"
              >
                Все финансы
              </button>
            </div>
            {revenueTrend.length > 0 ? (
              <div className="mt-4 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueTrend} barGap={4}>
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#133C2A99', fontSize: 12 }}
                    />
                    <YAxis hide />
                    <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'rgba(19,60,42,0.04)' }} />
                    <Bar dataKey="income" name="Доход" fill="#133C2A" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="expenses" name="Расход" fill="#D4AF37" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-6 py-8 text-center text-sm text-[#133C2A]/55">
                Данные появятся после первых операций.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none bg-white/92 shadow-[0_12px_40px_rgba(19,60,42,0.07)]">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-[#8B6B00]" />
                <p className="text-[#133C2A]">Посещаемость сегодня</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('attendance')}
                className="text-xs text-[#8B6B00] hover:text-[#133C2A]"
              >
                Открыть
              </button>
            </div>
            {isAttendanceLoading ? (
              <p className="mt-4 text-sm text-[#133C2A]/55">Загрузка...</p>
            ) : attendanceGroups.length === 0 ? (
              <p className="mt-4 text-sm text-[#133C2A]/55">На сегодня занятий в расписании нет.</p>
            ) : (
              <>
                <p className="mt-3 text-2xl text-[#133C2A]">
                  {attendanceMarkedGroups} <span className="text-base text-[#133C2A]/50">из {attendanceGroups.length} групп размечено</span>
                </p>
                {attendancePendingGroups.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    {attendancePendingGroups.slice(0, 4).map((group) => (
                      <div
                        key={group.groupId}
                        className="flex items-center justify-between gap-2 rounded-xl bg-[#F8F4E3] px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate text-[#133C2A]">{group.groupName}</span>
                        <span className="shrink-0 text-xs text-[#133C2A]/55">
                          {group.time} · {group.markedCount}/{group.studentCount}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[#1C8C64]">Все группы отмечены.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
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
