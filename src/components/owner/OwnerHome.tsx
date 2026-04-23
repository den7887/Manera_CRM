import { TrendingUp, Users, Coins, Calendar, ArrowUp, ArrowDown, CheckSquare, AlertCircle, Clock, Zap, UserCheck, DollarSign, TrendingDown, Activity, Briefcase } from 'lucide-react';
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
}

export function OwnerHome({ user, events, stats, totalStudents, totalTeachers, tasks, employees, onNavigate, notifications }: OwnerHomeProps) {
  const thisWeekEvents = events.filter(e => {
    const eventDate = new Date(e.date);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return eventDate >= today && eventDate <= weekFromNow;
  });

  // Моковые данные для дней рождения (в будущем будут из базы данных)
  const mockBirthdays = [
    {
      id: '1',
      name: 'Катя Иванова',
      type: 'student' as const,
      birthDate: new Date(2015, 10, 20), // 20 ноября
      daysUntil: 3,
      age: 9,
      groupName: 'Дети 7-10 лет',
    },
    {
      id: '2',
      name: 'Мария Петрова',
      type: 'parent' as const,
      birthDate: new Date(1985, 10, 18), // 18 ноября
      daysUntil: 1,
      childrenNames: ['Андрей Петров', 'София Петрова'],
    },
    {
      id: '3',
      name: 'Андрей Смирнов',
      type: 'student' as const,
      birthDate: new Date(2012, 10, 17), // 17 ноября (сегодня для примера)
      daysUntil: 0,
      age: 12,
      groupName: 'Подростки 11-14 лет',
    },
    {
      id: '4',
      name: 'Полина Волкова',
      type: 'student' as const,
      birthDate: new Date(2014, 10, 25), // 25 ноября
      daysUntil: 8,
      age: 10,
      groupName: 'Дети 7-10 лет',
    },
    {
      id: '5',
      name: 'Елена Соколова',
      type: 'parent' as const,
      birthDate: new Date(1990, 11, 5), // 5 декабря
      daysUntil: 18,
      childrenNames: ['Мария Соколова'],
    },
  ];

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="animate-scale-in">
        <h1 className="text-[#133C2A] mb-2">
          Добро пожаловать, {user.name.split(' ')[0]}! 🎩
        </h1>
        <p className="text-[#133C2A]/60">
          Ваша студия растет — сегодня {totalStudents} учеников и {totalTeachers} преподавателей
        </p>
      </div>

      {/* Mini Analytics Widgets */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1C8C64] to-[#133C2A] flex items-center justify-center">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-[#1C8C64]/10 text-[#1C8C64] border-[#1C8C64]/20">
                <ArrowUp className="w-3 h-3 mr-1" />
                {stats.revenueGrowth}%
              </Badge>
            </div>
            <p className="text-sm text-[#133C2A]/60">Доход за месяц</p>
            <p className="text-2xl text-[#133C2A] mt-1">
              {stats.totalIncome.toLocaleString('ru-RU')} ₽
            </p>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-[#133C2A]/60">Активных учеников</p>
            <p className="text-2xl text-[#133C2A] mt-1">{totalStudents}</p>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-[#133C2A]/60">Преподавателей</p>
            <p className="text-2xl text-[#133C2A] mt-1">{totalTeachers}</p>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FADADD] to-[#FFC0CB] flex items-center justify-center">
                <Calendar className="w-6 h-6 text-[#133C2A]" />
              </div>
            </div>
            <p className="text-sm text-[#133C2A]/60">Занятий на неделе</p>
            <p className="text-2xl text-[#133C2A] mt-1">{thisWeekEvents.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-none soft-shadow">
          <CardHeader>
            <CardTitle className="text-[#133C2A] flex items-center justify-between">
              <span>Рост выручки</span>
              <TrendingUp className="w-5 h-5 text-[#1C8C64]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-[#1C8C64]/10 to-[#1C8C64]/5">
              <p className="text-4xl text-[#1C8C64] mb-2">+{stats.revenueGrowth}%</p>
              <p className="text-sm text-[#133C2A]/70">По сравнению с прошлым месяцем</p>
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
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5">
              <p className="text-4xl text-[#D4AF37] mb-2">{stats.churnRate}%</p>
              <p className="text-sm text-[#133C2A]/70">Процент ушедших студентов</p>
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
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-[#133C2A]/10 to-[#133C2A]/5">
              <p className="text-4xl text-[#133C2A] mb-2">{stats.trialConversion}%</p>
              <p className="text-sm text-[#133C2A]/70">Пробное → постоянный клиент</p>
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
          <div className="grid md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              onClick={() => onNavigate('finance')}
              className="h-auto p-6 rounded-2xl border-[#133C2A]/20 hover:border-[#1C8C64] hover:bg-[#1C8C64]/5 flex flex-col items-center gap-3 transition-smooth"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#1C8C64]/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#1C8C64]" />
              </div>
              <div className="text-center">
                <p className="text-[#133C2A]">Финансы</p>
                <p className="text-xs text-[#133C2A]/60 mt-1">Подробный отчет</p>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => onNavigate('analytics')}
              className="h-auto p-6 rounded-2xl border-[#133C2A]/20 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 flex flex-col items-center gap-3 transition-smooth"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div className="text-center">
                <p className="text-[#133C2A]">Аналитика</p>
                <p className="text-xs text-[#133C2A]/60 mt-1">Детальные отчеты</p>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => onNavigate('team')}
              className="h-auto p-6 rounded-2xl border-[#133C2A]/20 hover:border-[#133C2A] hover:bg-[#133C2A]/5 flex flex-col items-center gap-3 transition-smooth"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#133C2A]/10 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-[#133C2A]" />
              </div>
              <div className="text-center">
                <p className="text-[#133C2A]">Команда</p>
                <p className="text-xs text-[#133C2A]/60 mt-1">Управление командой</p>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => onNavigate('settings')}
              className="h-auto p-6 rounded-2xl border-[#133C2A]/20 hover:border-[#FADADD] hover:bg-[#FADADD]/20 flex flex-col items-center gap-3 transition-smooth"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#FADADD]/30 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-[#133C2A]" />
              </div>
              <div className="text-center">
                <p className="text-[#133C2A]">Настройки</p>
                <p className="text-xs text-[#133C2A]/60 mt-1">Настройки студии</p>
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
                    {events.filter(e => {
                      const today = new Date();
                      const eventDate = new Date(e.date);
                      return eventDate.toDateString() === today.toDateString();
                    }).length}
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
                  <p className="text-2xl text-[#133C2A]">5</p>
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
                    {adminTasks.length > 0 ? Math.round((doneAdminTasks.length / adminTasks.length) * 100) : 0}%
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
      <UpcomingBirthdays birthdays={mockBirthdays} />

      {/* Quote */}
      <Card className="border-none soft-shadow bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
        <CardContent className="p-8 text-center">
          <p className="text-xl text-white mb-3 italic">
            "Ты автор своего результата"
          </p>
          <p className="text-white/80">— Manera Dance Studio</p>
        </CardContent>
      </Card>
    </div>
  );
}
