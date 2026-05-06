import {
  Activity,
  AlertCircle,
  BarChart3,
  Calendar,
  CheckSquare,
  Coins,
  MessageSquareWarning,
  Receipt,
  TrendingDown,
  UserCheck,
  Users,
} from 'lucide-react';
import { Employee, Event, FinanceStats, Notification, Task, User } from '../../types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface OwnerHomeProps {
  user: User;
  events: Event[];
  stats: FinanceStats;
  totalStudents: number;
  totalTeachers: number;
  tasks: Task[];
  employees: Employee[];
  onNavigate: (page: string) => void;
  notifications: Notification[];
  automationCount: number;
}

function formatMoney(value: number): string {
  return `${value.toLocaleString('ru-RU')} ₽`;
}

export function OwnerHome({
  user,
  events,
  stats,
  totalStudents,
  totalTeachers,
  tasks,
  employees,
  onNavigate,
  notifications,
  automationCount,
}: OwnerHomeProps) {
  const today = new Date();
  const todayEvents = events.filter((event) => new Date(event.date).toDateString() === today.toDateString());
  const weekEvents = events.filter((event) => {
    const eventDate = new Date(event.date);
    const weekTo = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return eventDate >= today && eventDate <= weekTo;
  });

  const activeEmployees = employees.filter((employee) => employee.status === 'active').length;
  const adminCount = employees.filter((employee) => employee.role === 'admin' && employee.status === 'active').length;
  const openTasks = tasks.filter((task) => task.status === 'todo');
  const urgentTasks = openTasks.filter((task) => task.priority === 'urgent' || task.priority === 'high');
  const overdueTasks = openTasks.filter((task) => task.dueDate && new Date(task.dueDate) < today);
  const unreadNotifications = notifications.filter((item) => !item.read).length;
  const financeRisk = stats.totalIncome > 0 && stats.totalExpenses > stats.totalIncome;
  const hasBusinessData = totalStudents > 0 || stats.totalIncome > 0 || events.length > 0 || employees.length > 0;

  const mainSignal = financeRisk
    ? {
        label: 'Деньги',
        title: 'Расходы выше доходов',
        text: `Доход ${formatMoney(stats.totalIncome)}, расход ${formatMoney(stats.totalExpenses)}.`,
        action: 'Открыть деньги',
        page: 'finance',
        Icon: TrendingDown,
        tone: 'border-red-300/35 bg-red-400/12',
      }
    : overdueTasks.length > 0
      ? {
          label: 'Команда',
          title: 'Есть просроченные задачи',
          text: `${overdueTasks.length} задач просрочено, срочных всего: ${urgentTasks.length}.`,
          action: 'Открыть задачи',
          page: 'tasks',
          Icon: AlertCircle,
          tone: 'border-[#D4AF37]/35 bg-[#D4AF37]/14',
        }
      : unreadNotifications > 0
        ? {
            label: 'Связь',
            title: 'Есть входящие обращения',
            text: `${unreadNotifications} сообщений или уведомлений требуют ответа.`,
            action: 'Открыть сообщения',
            page: 'communication',
            Icon: MessageSquareWarning,
            tone: 'border-blue-300/35 bg-blue-400/12',
          }
        : {
            label: 'Контроль',
            title: hasBusinessData ? 'Критичных просадок нет' : 'Система без данных',
            text: hasBusinessData
              ? `${todayEvents.length} занятий сегодня, ${openTasks.length} открытых задач.`
              : 'Добавьте клиентов, группы и команду, чтобы появилась рабочая картина.',
            action: hasBusinessData ? 'Открыть клиентов' : 'Добавить клиента',
            page: 'clients',
            Icon: Activity,
            tone: 'border-green-300/35 bg-green-400/12',
          };

  const kpis = [
    {
      label: 'Выручка',
      value: formatMoney(stats.totalIncome),
      note: `Расходы: ${formatMoney(stats.totalExpenses)}`,
      page: 'finance',
      Icon: Coins,
    },
    {
      label: 'К оплате / риски',
      value: financeRisk ? formatMoney(stats.totalExpenses - stats.totalIncome) : formatMoney(Math.max(stats.netProfit, 0)),
      note: financeRisk ? 'Финансовый разрыв' : 'Чистый результат',
      page: 'finance',
      Icon: Receipt,
    },
    {
      label: 'Ученики',
      value: String(totalStudents),
      note: totalStudents > 0 ? 'активная база' : 'нужно добавить',
      page: 'clients',
      Icon: Users,
    },
    {
      label: 'Группы / занятия',
      value: `${todayEvents.length}/${weekEvents.length}`,
      note: 'сегодня / неделя',
      page: 'groups',
      Icon: Calendar,
    },
    {
      label: 'Команда',
      value: String(activeEmployees),
      note: `${adminCount} админ., ${totalTeachers} пед.`,
      page: 'team',
      Icon: UserCheck,
    },
    {
      label: 'Задачи',
      value: String(openTasks.length),
      note: `срочных: ${urgentTasks.length}`,
      page: 'tasks',
      Icon: CheckSquare,
    },
  ];

  const workQueues = [
    {
      title: 'Деньги',
      value: formatMoney(stats.netProfit),
      note: 'Доходы, расходы, открытые счета',
      action: 'Открыть',
      page: 'finance',
      Icon: BarChart3,
    },
    {
      title: 'Клиенты',
      value: `${totalStudents} учеников`,
      note: 'Карточки детей, родители, группы',
      action: 'Открыть',
      page: 'clients',
      Icon: Users,
    },
    {
      title: 'Команда',
      value: `${activeEmployees} сотрудников`,
      note: 'Права, нагрузка, задачи',
      action: 'Открыть',
      page: 'team',
      Icon: UserCheck,
    },
    {
      title: 'Отчеты',
      value: `${stats.trialConversion}%`,
      note: 'Конверсия и динамика',
      action: 'Открыть',
      page: 'analytics',
      Icon: Activity,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">
      <section className="overflow-hidden rounded-[1.6rem] border border-[#133C2A]/10 bg-[#123827] text-white shadow-[0_18px_42px_rgba(19,60,42,0.16)] md:rounded-[2rem]">
        <div className="grid gap-4 p-4 md:grid-cols-[1.15fr_0.85fr] md:p-7">
          <div className="min-w-0">
            <Badge className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/10">
              Состояние бизнеса
            </Badge>
            <h1 className="mt-3 max-w-2xl text-2xl leading-tight md:mt-4 md:text-5xl">
              {user.name ? `${user.name}, добрый день` : 'Добрый день'}
            </h1>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-2">
              <div className="rounded-xl bg-white/[0.06] px-2 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">выручка</p>
                <p className="mt-1 truncate text-sm text-white">{formatMoney(stats.totalIncome)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.06] px-2 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">ученики</p>
                <p className="mt-1 text-sm text-white">{totalStudents}</p>
              </div>
              <div className="rounded-xl bg-white/[0.06] px-2 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">сегодня</p>
                <p className="mt-1 text-sm text-white">{todayEvents.length} занятий</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate(mainSignal.page)}
            className={`rounded-[1.5rem] border p-5 text-left transition-smooth hover:-translate-y-0.5 ${mainSignal.tone}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12">
                <mainSignal.Icon className="h-6 w-6 text-white" />
              </span>
              <Badge className="rounded-full bg-white text-[#133C2A] hover:bg-white">{mainSignal.label}</Badge>
            </div>
            <p className="mt-5 text-xl text-white">{mainSignal.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">{mainSignal.text}</p>
            <p className="mt-5 text-sm text-[#F4D776]">{mainSignal.action}</p>
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-3 md:gap-3">
        {kpis.map((item) => {
          const Icon = item.Icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.page)}
              className="rounded-2xl border border-[#133C2A]/10 bg-white/90 p-3 text-left shadow-[0_10px_30px_rgba(19,60,42,0.06)] transition-smooth hover:border-[#D4AF37]/35 md:p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-[#133C2A]/55">{item.label}</p>
                  <p className="mt-1 truncate text-xl text-[#133C2A] md:text-2xl">{item.value}</p>
                </div>
                <span className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-[#F8F4E3] text-[#133C2A] sm:flex">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#133C2A]/60">{item.note}</p>
            </button>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="border-none bg-white/90 shadow-[0_12px_40px_rgba(19,60,42,0.07)]">
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg text-[#133C2A]">Рабочие центры</p>
                <p className="text-sm text-[#133C2A]/58">Открываются только те зоны, где владелец принимает решения.</p>
              </div>
              <Button variant="outline" className="rounded-xl" onClick={() => onNavigate('finance')}>
                Деньги
              </Button>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-4">
              {workQueues.map((queue) => {
                const Icon = queue.Icon;
                return (
                  <button
                    key={queue.title}
                    type="button"
                    onClick={() => onNavigate(queue.page)}
                    className="rounded-2xl border border-[#133C2A]/10 bg-[#fbf7e8] p-4 text-left transition-smooth hover:border-[#D4AF37]/35"
                  >
                    <Icon className="h-5 w-5 text-[#D4AF37]" />
                    <p className="mt-3 text-sm text-[#133C2A]">{queue.title}</p>
                    <p className="mt-1 text-lg text-[#133C2A]">{queue.value}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#133C2A]/58">{queue.note}</p>
                    <p className="mt-3 text-xs text-[#B8941F]">{queue.action}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-[#fbf7e8] shadow-[0_12px_40px_rgba(19,60,42,0.07)]">
          <CardContent className="p-4 md:p-5">
            <p className="text-lg text-[#133C2A]">Сегодня на контроле</p>
            <div className="mt-4 space-y-2">
              <button type="button" onClick={() => onNavigate('finance')} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white p-3 text-left">
                <span>
                  <span className="block text-sm text-[#133C2A]">Финансы</span>
                  <span className="block text-xs text-[#133C2A]/55">{financeRisk ? 'расходы выше доходов' : 'критичных рисков нет'}</span>
                </span>
                <Badge variant="outline" className="rounded-full">{formatMoney(stats.netProfit)}</Badge>
              </button>
              <button type="button" onClick={() => onNavigate('tasks')} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white p-3 text-left">
                <span>
                  <span className="block text-sm text-[#133C2A]">Задачи команды</span>
                  <span className="block text-xs text-[#133C2A]/55">Просрочено: {overdueTasks.length}</span>
                </span>
                <Badge variant="outline" className="rounded-full">{openTasks.length}</Badge>
              </button>
              <button type="button" onClick={() => onNavigate('communication')} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white p-3 text-left">
                <span>
                  <span className="block text-sm text-[#133C2A]">Обращения</span>
                  <span className="block text-xs text-[#133C2A]/55">Непрочитанные сообщения</span>
                </span>
                <Badge variant="outline" className="rounded-full">{unreadNotifications}</Badge>
              </button>
              <button type="button" onClick={() => onNavigate('automations')} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white p-3 text-left">
                <span>
                  <span className="block text-sm text-[#133C2A]">Автодействия</span>
                  <span className="block text-xs text-[#133C2A]/55">Активные сценарии</span>
                </span>
                <Badge variant="outline" className="rounded-full">{automationCount}</Badge>
              </button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
