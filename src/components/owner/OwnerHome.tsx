import { TrendingUp, Users, Coins, Calendar, ArrowUp, ArrowDown, CheckSquare, AlertCircle, Clock, Zap, UserCheck, DollarSign, TrendingDown, Activity, Briefcase, Receipt, MessageSquareWarning } from 'lucide-react';
import { User, Event, FinanceStats, Task, Employee, Notification } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { UpcomingBirthdays } from '../admin/UpcomingBirthdays';

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

function getTrendTone(value: number) {
  if (value > 0) return 'text-[#1C8C64] bg-[#1C8C64]/10 border-[#1C8C64]/20';
  if (value < 0) return 'text-[#D14343] bg-[#D14343]/10 border-[#D14343]/20';
  return 'text-[#133C2A]/60 bg-[#133C2A]/5 border-[#133C2A]/10';
}

export function OwnerHome({ user, events, stats, totalStudents, totalTeachers, tasks, employees, onNavigate, notifications, automationCount }: OwnerHomeProps) {
  const thisWeekEvents = events.filter(e => {
    const eventDate = new Date(e.date);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return eventDate >= today && eventDate <= weekFromNow;
  });

  const birthdays = [];

  // Задачи для администраторов
  const adminTasks = tasks.filter(t => {
    const assignee = employees.find(e => e.id === t.assigneeId);
    return assignee?.role === 'admin';
  });
  const todoAdminTasks = adminTasks.filter(t => t.status === 'todo');
  const doneAdminTasks = adminTasks.filter(t => t.status === 'done');
  const overdueAdminTasks = todoAdminTasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  });
  const urgentAdminTasks = todoAdminTasks.filter(t => t.priority === 'urgent');

  // Финансовые метрики
  const netProfit = stats.totalIncome - stats.totalExpenses;
  const profitMargin = stats.totalIncome > 0 ? ((netProfit / stats.totalIncome) * 100).toFixed(1) : 0;
  
  // Активные сотрудники
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const adminCount = employees.filter(e => e.role === 'admin' && e.status === 'active').length;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  const isMobile = useIsMobile();
  const hasClients = totalStudents > 0;
  const hasTeam = activeEmployees > 0;
  const hasSchedule = events.length > 0;
  const hasTasks = tasks.length > 0;
  const unreadNotifications = notifications.filter((item) => !item.read).length;
  const urgentTodoCount = tasks.filter((task) => task.status === 'todo' && (task.priority === 'urgent' || task.priority === 'high')).length;
  const overdueTodoCount = tasks.filter((task) => task.status === 'todo' && task.dueDate && new Date(task.dueDate) < new Date()).length;
  const financeRisk = stats.totalIncome > 0 && stats.totalExpenses > stats.totalIncome;
  const completedSetupSteps = [hasClients, hasTeam, hasSchedule, hasTasks].filter(Boolean).length;
  const needsSetupGuidance = completedSetupSteps < 4;
  const todayEventsCount = events.filter(e => {
    const today = new Date();
    const eventDate = new Date(e.date);
    return eventDate.toDateString() === today.toDateString();
  }).length;
  const taskCompletionRate = adminTasks.length > 0 ? Math.round((doneAdminTasks.length / adminTasks.length) * 100) : 0;
  const teacherText = totalTeachers === 1 ? '1 преподаватель' : `${totalTeachers} преподавателей`;
  const incomeHasData = stats.totalIncome > 0 || stats.totalExpenses > 0;
  const clientFlowSteps = [
    {
      title: 'Ребенок в базе',
      description: 'Карточка клиента, родитель, контакты и исходная анкета.',
      action: 'Открыть клиентов',
      page: 'clients',
      done: hasClients,
      Icon: Users,
    },
    {
      title: 'Группа и занятия',
      description: 'Назначение в группу, расписание и преподаватель.',
      action: 'Открыть группы',
      page: 'groups',
      done: hasSchedule,
      Icon: Calendar,
    },
    {
      title: 'Счет и оплата',
      description: 'Выставленный счет, статус оплаты и продление.',
      action: 'Проверить деньги',
      page: 'finance',
      done: stats.totalIncome > 0,
      Icon: Receipt,
    },
    {
      title: 'Доступ родителю',
      description: 'Родитель видит ребенка, расписание, оплату и сообщения.',
      action: 'Проверить карточку',
      page: 'clients',
      done: hasClients,
      Icon: UserCheck,
    },
    {
      title: 'Контроль',
      description: 'Задачи, обращения, напоминания и слабые места.',
      action: 'Открыть задачи',
      page: 'tasks',
      done: hasTasks && urgentTodoCount === 0,
      Icon: CheckSquare,
    },
  ];

  const openTaskCount = tasks.filter((task) => task.status === 'todo').length;
  const mainRisk = financeRisk
    ? {
        label: 'финансы',
        title: 'Финансовый разрыв',
        description: `Доход ${stats.totalIncome.toLocaleString('ru-RU')} ₽, расход ${stats.totalExpenses.toLocaleString('ru-RU')} ₽. На контроле оплаты и статьи расходов.`,
        action: 'Разобрать финансы',
        page: 'finance',
        tone: 'red',
        Icon: TrendingDown,
      }
    : urgentTodoCount > 0
      ? {
          label: 'задачи',
          title: overdueTodoCount > 0 ? 'Просроченные поручения' : 'Высокий приоритет',
          description: `${urgentTodoCount} важных задач, просроченных: ${overdueTodoCount}. Проверьте исполнителей, сроки и комментарии.`,
          action: 'Открыть доску задач',
          page: 'tasks',
          tone: 'gold',
          Icon: AlertCircle,
        }
      : unreadNotifications > 0
        ? {
            label: 'связь',
            title: 'Входящие обращения',
            description: `${unreadNotifications} непрочитанных сообщений. Важные вопросы родителей лучше закрывать до начала занятий.`,
            action: 'Открыть коммуникации',
            page: 'communication',
            tone: 'blue',
            Icon: MessageSquareWarning,
          }
        : {
            label: 'режим',
            title: 'Плановый контроль',
            description: `${todayEventsCount} занятий сегодня, ${openTaskCount} открытых задач, прибыль ${netProfit.toLocaleString('ru-RU')} ₽.`,
            action: 'Открыть клиентов',
            page: 'clients',
            tone: 'green',
            Icon: Activity,
          };

  const businessCounters = [
    {
      title: 'Клиенты',
      value: totalStudents,
      detail: hasClients ? 'дети в базе' : 'нужно добавить первого',
      page: 'clients',
      Icon: Users,
    },
    {
      title: 'Сегодня',
      value: todayEventsCount,
      detail: `занятий сегодня, ${thisWeekEvents.length} за неделю`,
      page: 'groups',
      Icon: Calendar,
    },
    {
      title: 'Деньги',
      value: `${netProfit.toLocaleString('ru-RU')} ₽`,
      detail: financeRisk ? 'нужно проверить баланс' : 'чистая прибыль',
      page: 'finance',
      Icon: Coins,
    },
    {
      title: 'Задачи',
      value: openTaskCount,
      detail: `${taskCompletionRate}% выполнено`,
      page: 'tasks',
      Icon: CheckSquare,
    },
  ];

  const primaryActions = [
    {
      title: 'Клиенты',
      metric: `${totalStudents}`,
      description: 'Карточки детей, родители, группы, доступы.',
      action: 'Открыть базу',
      page: 'clients',
      Icon: Users,
    },
    {
      title: 'Оплаты',
      metric: `${netProfit.toLocaleString('ru-RU')} ₽`,
      description: `Доход ${stats.totalIncome.toLocaleString('ru-RU')} ₽ · расход ${stats.totalExpenses.toLocaleString('ru-RU')} ₽`,
      action: 'Контроль денег',
      page: 'finance',
      Icon: Receipt,
    },
    {
      title: 'Занятия',
      metric: `${todayEventsCount}/${thisWeekEvents.length}`,
      description: 'Сегодня / ближайшая неделя, группы и преподаватели.',
      action: 'Расписание',
      page: 'groups',
      Icon: Calendar,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">
      <section className="overflow-hidden rounded-[1.6rem] border border-[#133C2A]/10 bg-[#123827] text-white shadow-[0_18px_42px_rgba(19,60,42,0.16)] md:rounded-[2rem]">
        <div className="grid gap-4 p-4 md:grid-cols-[1.25fr_0.75fr] md:p-7">
          <div className="min-w-0">
            <Badge className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/10">
              Оперативная сводка
            </Badge>
            <h1 className="mt-3 max-w-2xl text-2xl leading-tight md:mt-4 md:text-5xl">
              {user.name ? `${user.name}, добрый день` : 'Добрый день'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/68 md:text-base">
              На сегодня: {totalStudents} учеников, {todayEventsCount} занятий, {openTaskCount} открытых задач.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-2">
              <div className="rounded-xl bg-white/[0.06] px-2 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">прибыль</p>
                <p className="mt-1 truncate text-sm text-white">{netProfit.toLocaleString('ru-RU')} ₽</p>
              </div>
              <div className="rounded-xl bg-white/[0.06] px-2 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">занятия</p>
                <p className="mt-1 text-sm text-white">{todayEventsCount} сегодня</p>
              </div>
              <div className="rounded-xl bg-white/[0.06] px-2 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">задачи</p>
                <p className="mt-1 text-sm text-white">{openTaskCount} открыто</p>
              </div>
            </div>
            <div className="mobile-scroll-x mt-4 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
              {primaryActions.map((action) => {
                const Icon = action.Icon;
                return (
                  <button
                    key={action.title}
                    type="button"
                    onClick={() => onNavigate(action.page)}
                    className="w-[190px] rounded-2xl border border-white/12 bg-white/[0.08] p-3 text-left transition-smooth hover:bg-white/[0.14] sm:w-auto sm:p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Icon className="h-5 w-5 text-[#D4AF37]" />
                      <span className="max-w-[92px] truncate text-sm text-white">{action.metric}</span>
                    </div>
                    <p className="mt-3 text-sm text-white">{action.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/62">{action.description}</p>
                    <p className="mt-3 text-xs text-[#F4D776]">{action.action}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate(mainRisk.page)}
            className={`rounded-[1.5rem] border p-5 text-left transition-smooth hover:-translate-y-0.5 ${
              mainRisk.tone === 'red'
                ? 'border-red-300/30 bg-red-400/12'
                : mainRisk.tone === 'gold'
                  ? 'border-[#D4AF37]/35 bg-[#D4AF37]/14'
                  : mainRisk.tone === 'blue'
                    ? 'border-blue-300/30 bg-blue-400/12'
                    : 'border-green-300/30 bg-green-400/12'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12">
                <mainRisk.Icon className="h-6 w-6 text-white" />
              </span>
              <Badge className="rounded-full bg-white text-[#133C2A] hover:bg-white">{mainRisk.label}</Badge>
            </div>
            <p className="mt-5 text-xl text-white">{mainRisk.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">{mainRisk.description}</p>
            <p className="mt-5 text-sm text-[#F4D776]">{mainRisk.action}</p>
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-2 xl:grid-cols-4 md:gap-3">
        {businessCounters.map((item) => {
          const Icon = item.Icon;
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => onNavigate(item.page)}
              className="rounded-2xl border border-[#133C2A]/10 bg-white/88 p-3 text-left shadow-[0_10px_30px_rgba(19,60,42,0.06)] transition-smooth hover:-translate-y-0.5 hover:border-[#D4AF37]/35 md:rounded-[1.35rem] md:p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#133C2A]/55">{item.title}</p>
                  <p className="mt-1 text-xl text-[#133C2A] md:text-2xl">{item.value}</p>
                </div>
                <span className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-[#F8F4E3] text-[#133C2A] sm:flex">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#133C2A]/60 md:mt-3">{item.detail}</p>
            </button>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="border-none bg-white/90 shadow-[0_12px_40px_rgba(19,60,42,0.07)]">
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg text-[#133C2A]">Рабочий путь клиента</p>
                <p className="text-sm text-[#133C2A]/58">Одна линия вместо набора разрозненных блоков.</p>
              </div>
              <Button variant="outline" className="rounded-xl" onClick={() => onNavigate('clients')}>
                Открыть клиентов
              </Button>
            </div>
            <div className="mt-5 grid gap-2 md:grid-cols-5">
              {clientFlowSteps.map((step, index) => {
                const Icon = step.Icon;
                return (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => onNavigate(step.page)}
                    className={`rounded-2xl border p-3 text-left transition-smooth hover:bg-[#F8F4E3] ${
                      step.done ? 'border-[#1C8C64]/25 bg-[#1C8C64]/7' : 'border-[#133C2A]/10 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${step.done ? 'bg-[#1C8C64]/12 text-[#1C8C64]' : 'bg-[#F8F4E3] text-[#B8941F]'}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-xs text-[#133C2A]/45">0{index + 1}</span>
                    </div>
                    <p className="mt-3 text-sm text-[#133C2A]">{step.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#133C2A]/58">{step.description}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-[#fbf7e8] shadow-[0_12px_40px_rgba(19,60,42,0.07)]">
          <CardContent className="p-4 md:p-5">
            <p className="text-lg text-[#133C2A]">Сегодня проверить</p>
            <div className="mt-4 space-y-2">
              <button type="button" onClick={() => onNavigate('tasks')} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white p-3 text-left">
                <span>
                  <span className="block text-sm text-[#133C2A]">Открытые задачи</span>
                  <span className="block text-xs text-[#133C2A]/55">Срочных: {urgentTodoCount}</span>
                </span>
                <Badge variant="outline" className="rounded-full">{openTaskCount}</Badge>
              </button>
              <button type="button" onClick={() => onNavigate('communication')} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white p-3 text-left">
                <span>
                  <span className="block text-sm text-[#133C2A]">Сообщения</span>
                  <span className="block text-xs text-[#133C2A]/55">Новые обращения родителей</span>
                </span>
                <Badge variant="outline" className="rounded-full">{unreadNotifications}</Badge>
              </button>
              <button type="button" onClick={() => onNavigate('groups')} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white p-3 text-left">
                <span>
                  <span className="block text-sm text-[#133C2A]">Занятия</span>
                  <span className="block text-xs text-[#133C2A]/55">Сегодня и ближайшая неделя</span>
                </span>
                <Badge variant="outline" className="rounded-full">{todayEventsCount}</Badge>
              </button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto md:space-y-6">
      {/* Welcome Header */}
      <div className="animate-scale-in">
        <h1 className="text-[#133C2A] mb-2 text-2xl md:text-3xl">
          Панель владельца
        </h1>
        <p className="text-[#133C2A]/60">
          Сейчас в системе: {totalStudents} учеников, {teacherText}, {todayEventsCount} занятий сегодня.
        </p>
      </div>

      {needsSetupGuidance && (
        <Card className="border border-[#D4AF37]/30 bg-gradient-to-r from-[#FFF9E8] to-white soft-shadow">
          <CardContent className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[#133C2A]">Заполнение кабинета: {completedSetupSteps}/4</p>
                <p className="text-sm text-[#133C2A]/65 mt-1">
                  Добавьте базовые данные, чтобы сводка и контроль работали полноценно.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => onNavigate('clients')}
                className="w-full rounded-xl border-[#D4AF37]/50 text-[#B8941F] hover:bg-[#D4AF37]/10 sm:w-auto"
              >
                Добавить клиента
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
              <button
                onClick={() => onNavigate('clients')}
                className={`text-left rounded-xl border px-3 py-2 transition-smooth ${hasClients ? 'border-green-200 bg-green-50 text-green-700' : 'border-[#133C2A]/10 bg-white text-[#133C2A]/70 hover:bg-[#F8F4E3]'}`}
              >
                {hasClients ? 'Готово' : 'Нужно'}: Клиенты
              </button>
              <button
                onClick={() => onNavigate('team')}
                className={`text-left rounded-xl border px-3 py-2 transition-smooth ${hasTeam ? 'border-green-200 bg-green-50 text-green-700' : 'border-[#133C2A]/10 bg-white text-[#133C2A]/70 hover:bg-[#F8F4E3]'}`}
              >
                {hasTeam ? 'Готово' : 'Нужно'}: Команда
              </button>
              <button
                onClick={() => onNavigate('groups')}
                className={`text-left rounded-xl border px-3 py-2 transition-smooth ${hasSchedule ? 'border-green-200 bg-green-50 text-green-700' : 'border-[#133C2A]/10 bg-white text-[#133C2A]/70 hover:bg-[#F8F4E3]'}`}
              >
                {hasSchedule ? 'Готово' : 'Нужно'}: Расписание
              </button>
              <button
                onClick={() => onNavigate('tasks')}
                className={`text-left rounded-xl border px-3 py-2 transition-smooth ${hasTasks ? 'border-green-200 bg-green-50 text-green-700' : 'border-[#133C2A]/10 bg-white text-[#133C2A]/70 hover:bg-[#F8F4E3]'}`}
              >
                {hasTasks ? 'Готово' : 'Нужно'}: Задачи
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border border-[#133C2A]/10 bg-white/92 soft-shadow">
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#1C8C64]" />
                Как идет работа с клиентом
              </CardTitle>
              <p className="text-sm text-[#133C2A]/60 mt-1">
                Обычный путь: ребенок появился в базе, попал в группу, получил счет, родитель получил доступ, студия контролирует оплату и занятия.
              </p>
            </div>
            <Badge variant="outline" className="w-fit rounded-full border-[#133C2A]/15 text-[#133C2A]/70">
              рабочий сценарий
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-5">
            {clientFlowSteps.map((step, index) => {
              const Icon = step.Icon;
              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => onNavigate(step.page)}
                  className={`group rounded-2xl border p-4 text-left transition-smooth hover:-translate-y-0.5 hover:shadow-md ${
                    step.done
                      ? 'border-[#1C8C64]/25 bg-[#1C8C64]/6'
                      : 'border-[#D4AF37]/30 bg-[#FFF9E8]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                      step.done ? 'bg-[#1C8C64]/12 text-[#1C8C64]' : 'bg-[#D4AF37]/15 text-[#B8941F]'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <Badge variant="outline" className={`rounded-full text-[11px] ${
                      step.done ? 'border-[#1C8C64]/25 text-[#1C8C64]' : 'border-[#D4AF37]/35 text-[#B8941F]'
                    }`}>
                      {step.done ? 'готово' : `шаг ${index + 1}`}
                    </Badge>
                  </div>
                  <p className="mt-3 text-[#133C2A]">{step.title}</p>
                  <p className="mt-1 min-h-[3rem] text-sm leading-relaxed text-[#133C2A]/62">{step.description}</p>
                  <p className="mt-3 text-sm text-[#133C2A] underline-offset-4 group-hover:underline">
                    {step.action}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#133C2A]/10 soft-shadow">
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#D4AF37]" />
                Что требует внимания
              </CardTitle>
              <p className="text-sm text-[#133C2A]/60 mt-1">
                Короткая сводка по задачам, сообщениям и финансам. Нажмите на блок, чтобы открыть раздел.
              </p>
            </div>
            <Badge variant="outline" className="w-fit rounded-full border-[#133C2A]/15 text-[#133C2A]/70">
              обновляется из реальных данных CRM
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => onNavigate('tasks')}
              className="rounded-xl border border-[#D4AF37]/30 bg-[#FFF9E8] px-3 py-3 text-left transition-smooth hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-xs text-[#8B6B00]">Задачи с высоким приоритетом</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-2xl text-[#133C2A]">{urgentTodoCount}</p>
                <Badge variant="outline" className="rounded-full border-[#D4AF37]/30 text-[#8B6B00]">
                  всего открытых: {tasks.filter((task) => task.status === 'todo').length}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-[#133C2A]/65">
                {urgentTodoCount > 0 ? 'Есть задачи, которые лучше закрыть сегодня.' : 'Срочных задач сейчас нет.'}
              </p>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('communication')}
              className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-left transition-smooth hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-xs text-blue-700">Новые уведомления и обращения</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-2xl text-[#133C2A]">{unreadNotifications}</p>
                <Badge variant="outline" className="rounded-full border-blue-200 text-blue-700">
                  коммуникации
                </Badge>
              </div>
              <p className="mt-2 text-xs text-[#133C2A]/65">
                {unreadNotifications > 0 ? 'Проверьте входящие, чтобы не пропустить родителей.' : 'Новых уведомлений нет.'}
              </p>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('finance')}
              className={`rounded-xl border px-3 py-3 text-left transition-smooth hover:-translate-y-0.5 hover:shadow-md ${financeRisk ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}
            >
              <p className={`text-xs ${financeRisk ? 'text-red-700' : 'text-green-700'}`}>Деньги за текущий период</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-2xl text-[#133C2A]">{netProfit.toLocaleString('ru-RU')} ₽</p>
                <Badge variant="outline" className={`rounded-full ${financeRisk ? 'border-red-200 text-red-700' : 'border-green-200 text-green-700'}`}>
                  прибыль
                </Badge>
              </div>
              <p className="mt-2 text-xs text-[#133C2A]/65">
                Доходы {stats.totalIncome.toLocaleString('ru-RU')} ₽, расходы {stats.totalExpenses.toLocaleString('ru-RU')} ₽.
              </p>
            </button>
          </div>
          <div className="mobile-scroll-x md:flex md:flex-wrap md:overflow-visible md:pb-0">
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => onNavigate('finance')}>
              <Receipt className="w-4 h-4 mr-1" />
              Проверить оплаты
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => onNavigate('groups')}>
              <Calendar className="w-4 h-4 mr-1" />
              Проверить расписание
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => onNavigate('communication')}>
              <MessageSquareWarning className="w-4 h-4 mr-1" />
              Ответить на сообщения
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mini Analytics Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1C8C64] to-[#133C2A] flex items-center justify-center md:w-12 md:h-12">
                <Coins className="w-5 h-5 text-white md:w-6 md:h-6" />
              </div>
              <Badge className={`${getTrendTone(stats.revenueGrowth)} border`}>
                {stats.revenueGrowth >= 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                {stats.revenueGrowth > 0 ? '+' : ''}{stats.revenueGrowth}%
              </Badge>
            </div>
            <p className="text-xs uppercase tracking-[0.12em] text-[#133C2A]/45">Финансы</p>
            <p className="text-sm text-[#133C2A]/60 mt-1">Доходы за выбранный период</p>
            <p className="text-xl text-[#133C2A] mt-1 md:text-2xl">
              {stats.totalIncome.toLocaleString('ru-RU')} ₽
            </p>
            <p className="text-xs text-[#133C2A]/55 mt-2">
              {incomeHasData ? `Чистая прибыль: ${netProfit.toLocaleString('ru-RU')} ₽` : 'Пока нет оплаченных счетов.'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center md:w-12 md:h-12">
                <Users className="w-5 h-5 text-white md:w-6 md:h-6" />
              </div>
            </div>
            <p className="text-xs uppercase tracking-[0.12em] text-[#133C2A]/45">Клиенты</p>
            <p className="text-sm text-[#133C2A]/60 mt-1">Дети в клиентской базе</p>
            <p className="text-xl text-[#133C2A] mt-1 md:text-2xl">{totalStudents}</p>
            <p className="text-xs text-[#133C2A]/55 mt-2">
              {totalStudents > 0 ? 'Нажмите, чтобы открыть карточки детей.' : 'Добавьте первого клиента, чтобы появилась аналитика.'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center md:w-12 md:h-12">
                <Users className="w-5 h-5 text-white md:w-6 md:h-6" />
              </div>
            </div>
            <p className="text-xs uppercase tracking-[0.12em] text-[#133C2A]/45">Команда</p>
            <p className="text-sm text-[#133C2A]/60 mt-1">Активные преподаватели</p>
            <p className="text-xl text-[#133C2A] mt-1 md:text-2xl">{totalTeachers}</p>
            <p className="text-xs text-[#133C2A]/55 mt-2">
              Всего активных сотрудников: {activeEmployees}. Администраторов: {adminCount}.
            </p>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FADADD] to-[#FFC0CB] flex items-center justify-center md:w-12 md:h-12">
                <Calendar className="w-5 h-5 text-[#133C2A] md:w-6 md:h-6" />
              </div>
            </div>
            <p className="text-xs uppercase tracking-[0.12em] text-[#133C2A]/45">Расписание</p>
            <p className="text-sm text-[#133C2A]/60 mt-1">Занятия на ближайшие 7 дней</p>
            <p className="text-xl text-[#133C2A] mt-1 md:text-2xl">{thisWeekEvents.length}</p>
            <p className="text-xs text-[#133C2A]/55 mt-2">
              Сегодня: {todayEventsCount}. Всего запланировано: {events.length}.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 md:grid-cols-3 md:gap-6">
        <Card className="border-none soft-shadow">
          <CardHeader>
            <CardTitle className="text-[#133C2A] flex items-center justify-between">
              <span>Рост выручки</span>
              <TrendingUp className="w-5 h-5 text-[#1C8C64]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-[#1C8C64]/10 to-[#1C8C64]/5 md:p-6">
              <p className="text-3xl text-[#1C8C64] mb-2 md:text-4xl">+{stats.revenueGrowth}%</p>
              <p className="text-sm text-[#133C2A]/70">Динамика доходов относительно прошлого периода</p>
              <p className="text-xs text-[#133C2A]/55 mt-2">
                Показывает, растет ли поток оплат. Детализация находится в разделе “Финансы”.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardHeader>
            <CardTitle className="text-[#133C2A] flex items-center justify-between">
              <span>Отток клиентов</span>
              <ArrowDown className="w-5 h-5 text-[#D4AF37]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 md:p-6">
              <p className="text-3xl text-[#D4AF37] mb-2 md:text-4xl">{stats.churnRate}%</p>
              <p className="text-sm text-[#133C2A]/70">Доля клиентов, которые перестали заниматься</p>
              <p className="text-xs text-[#133C2A]/55 mt-2">
                Если показатель растет, стоит проверить продления и причины ухода.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardHeader>
            <CardTitle className="text-[#133C2A] flex items-center justify-between">
              <span>Конверсия пробных</span>
              <TrendingUp className="w-5 h-5 text-[#133C2A]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-[#133C2A]/10 to-[#133C2A]/5 md:p-6">
              <p className="text-3xl text-[#133C2A] mb-2 md:text-4xl">{stats.trialConversion}%</p>
              <p className="text-sm text-[#133C2A]/70">Пробные занятия, ставшие абонементом</p>
              <p className="text-xs text-[#133C2A]/55 mt-2">
                Показывает качество обработки заявок и первого занятия.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions for Owner */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A] flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#D4AF37]" />
            Быстрые действия
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Button
              variant="outline"
              onClick={() => onNavigate('finance')}
              className="h-auto p-4 rounded-2xl border-[#133C2A]/20 hover:border-[#1C8C64] hover:bg-[#1C8C64]/5 flex flex-col items-center gap-2 transition-smooth md:p-6 md:gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#1C8C64]/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#1C8C64]" />
              </div>
              <div className="text-center">
                <p className="text-[#133C2A]">Деньги</p>
                <p className="text-xs text-[#133C2A]/60 mt-1">Оплаты и долги</p>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => onNavigate('analytics')}
              className="h-auto p-4 rounded-2xl border-[#133C2A]/20 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 flex flex-col items-center gap-2 transition-smooth md:p-6 md:gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div className="text-center">
                <p className="text-[#133C2A]">Отчеты</p>
                <p className="text-xs text-[#133C2A]/60 mt-1">Что растет и проседает</p>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => onNavigate('team')}
              className="h-auto p-4 rounded-2xl border-[#133C2A]/20 hover:border-[#133C2A] hover:bg-[#133C2A]/5 flex flex-col items-center gap-2 transition-smooth md:p-6 md:gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#133C2A]/10 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-[#133C2A]" />
              </div>
              <div className="text-center">
                <p className="text-[#133C2A]">Команда</p>
                <p className="text-xs text-[#133C2A]/60 mt-1">Сотрудники и права</p>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => onNavigate('settings')}
              className="h-auto p-4 rounded-2xl border-[#133C2A]/20 hover:border-[#FADADD] hover:bg-[#FADADD]/20 flex flex-col items-center gap-2 transition-smooth md:p-6 md:gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#FADADD]/30 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-[#133C2A]" />
              </div>
              <div className="text-center">
                <p className="text-[#133C2A]">Настройки</p>
                <p className="text-xs text-[#133C2A]/60 mt-1">Правила кабинета</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Overview and Finance Details (только на десктопе) */}
      {!isMobile && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Admin Tasks Status */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#133C2A] flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-[#D4AF37]" />
                  Задачи администраторов
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('tasks')}
                  className="text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-xl"
                >
                  Все задачи →
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Task Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className="text-2xl text-blue-600">{todoAdminTasks.length}</span>
                  </div>
                  <p className="text-sm text-blue-700">К выполнению</p>
                </div>

                <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                  <div className="flex items-center justify-between mb-2">
                    <CheckSquare className="w-5 h-5 text-green-500" />
                    <span className="text-2xl text-green-600">{doneAdminTasks.length}</span>
                  </div>
                  <p className="text-sm text-green-700">Выполнено</p>
                </div>

                <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                  <div className="flex items-center justify-between mb-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-2xl text-red-600">{overdueAdminTasks.length}</span>
                  </div>
                  <p className="text-sm text-red-700">Просрочено</p>
                </div>

                <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
                  <div className="flex items-center justify-between mb-2">
                    <Zap className="w-5 h-5 text-orange-500" />
                    <span className="text-2xl text-orange-600">{urgentAdminTasks.length}</span>
                  </div>
                  <p className="text-sm text-orange-700">Срочные</p>
                </div>
              </div>

              {/* Recent Tasks */}
              {todoAdminTasks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-[#133C2A]">Ближайшие задачи:</p>
                  {todoAdminTasks.slice(0, 3).map(task => (
                    <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#F8F4E3] hover:bg-[#F8F4E3]/70 transition-smooth">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#133C2A] truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[#133C2A]/60">{task.assigneeName}</span>
                          {task.dueDate && (
                            <>
                              <span className="text-xs text-[#133C2A]/40">•</span>
                              <span className="text-xs text-[#133C2A]/60">{formatDate(task.dueDate)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {task.priority === 'urgent' && (
                        <Badge className="bg-red-50 text-red-600 border-red-200 text-xs flex-shrink-0">
                          Срочно
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Details */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#D4AF37]" />
                Финансовая сводка
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Net Profit */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1C8C64]/10 to-[#1C8C64]/5 border border-[#1C8C64]/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[#133C2A]/70">Чистая прибыль</p>
                  <TrendingUp className="w-5 h-5 text-[#1C8C64]" />
                </div>
                <p className="text-3xl text-[#1C8C64]">{netProfit.toLocaleString('ru-RU')} ₽</p>
                <p className="text-xs text-[#133C2A]/60 mt-1">Маржа: {profitMargin}%</p>
              </div>

              {/* Income/Expenses Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-green-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                      <ArrowUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-[#133C2A]/60">Доходы</p>
                      <p className="text-lg text-[#133C2A]">{stats.totalIncome.toLocaleString('ru-RU')} ₽</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-red-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-[#133C2A]/60">Расходы</p>
                      <p className="text-lg text-[#133C2A]">{stats.totalExpenses.toLocaleString('ru-RU')} ₽</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Link to Finance */}
              <Button
                variant="outline"
                onClick={() => onNavigate('finance')}
                className="w-full rounded-xl border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
              >
                Подробный отчет →
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Operational Metrics (только на десктопе) */}
      {!isMobile && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border-none soft-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-[#133C2A]/60">Всего сотрудников</p>
                  <p className="text-2xl text-[#133C2A]">{activeEmployees}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#133C2A]/60">
                <span>{adminCount} администраторов</span>
                <span>•</span>
                <span>{totalTeachers} преподавателей</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none soft-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-[#133C2A]/60">Занятий сегодня</p>
                  <p className="text-2xl text-[#133C2A]">
                    {todayEventsCount}
                  </p>
                </div>
              </div>
              <p className="text-xs text-[#133C2A]/60">На этой неделе: {thisWeekEvents.length}</p>
            </CardContent>
          </Card>

          <Card className="border-none soft-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-sm text-[#133C2A]/60">Автоматизации</p>
                  <p className="text-2xl text-[#133C2A]">{automationCount}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('automations')}
                className="text-xs text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg px-0"
              >
                Настроить →
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none soft-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-[#133C2A]/60">Выполнение задач</p>
                  <p className="text-2xl text-[#133C2A]">
                    {taskCompletionRate}%
                  </p>
                </div>
              </div>
              <p className="text-xs text-[#133C2A]/60">
                {doneAdminTasks.length} из {adminTasks.length} задач
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Birthdays */}
      <UpcomingBirthdays birthdays={birthdays} />

      {/* Quote */}
      <Card className="border-none soft-shadow bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
        <CardContent className="p-5 text-center md:p-8">
          <p className="text-lg text-white mb-3 italic md:text-xl">
            "Ты автор своего результата"
          </p>
          <p className="text-white/80">— Manera Dance Studio</p>
        </CardContent>
      </Card>
    </div>
  );
}
