import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Calendar, Clock, Users, Bell, CheckCircle, AlertCircle, Briefcase, UserPlus, Circle, CheckSquare, ArrowRight, ClipboardCheck } from 'lucide-react';
import { User, Event, Group, Task, Notification } from '../../types';
import { type AttendanceDayGroupDto, loadAttendanceDay } from '../../lib/backendApi';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CreateChecklistDialog } from './CreateChecklistDialog';
import { EmptyState } from '../EmptyState';

interface AdminHomeProps {
  user: User;
  events: Event[];
  groups: Group[];
  tasks: Task[];
  onNavigate: (page: string) => void;
  notifications: Notification[];
}

function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function AdminHome({ user, events, groups, tasks, onNavigate, notifications }: AdminHomeProps) {
  const today = new Date();

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

  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.date);
    return eventDate.toDateString() === today.toDateString();
  });

  const totalStudents = groups.reduce((sum, g) => sum + g.studentCount, 0);
  const todayAttending = todayEvents.reduce((sum, e) => {
    const group = groups.find(g => g.id === e.groupId);
    return sum + (group?.studentCount || 0);
  }, 0);

  // Фильтрация активных задач
  const activeTasks = tasks.filter(t => t.status === 'todo');
  const urgentTasks = activeTasks.filter(t => t.priority === 'urgent' || t.priority === 'high');
  
  // Фильтрация отложенных задач - показываем только те, которые уже доступны
  const availableActiveTasks = activeTasks.filter(task => {
    if (!task.scheduledDate) return true; // Задача без scheduledDate всегда видима
    return new Date(task.scheduledDate) <= new Date(); // Показываем только если дата начала наступила
  });
  
  const availableUrgentTasks = availableActiveTasks.filter(t => t.priority === 'urgent' || t.priority === 'high');
  
  // Проверка на просроченные задачи
  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'done') return false;
    return new Date(task.dueDate) < new Date();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long'
    });
  };

  const priorityConfig = {
    low: { color: 'text-[#1C8C64]', bgColor: 'bg-[#1C8C64]/8 border-[#1C8C64]/20' },
    medium: { color: 'text-[#8B6B00]', bgColor: 'bg-[#D4AF37]/10 border-[#D4AF37]/25' },
    high: { color: 'text-[#B85A2E]', bgColor: 'bg-[#FFF1E8] border-[#B85A2E]/20' },
    urgent: { color: 'text-[#D14343]', bgColor: 'bg-[#D14343]/8 border-[#D14343]/20' },
  };

  const statusIcons = {
    todo: Circle,
    done: CheckCircle,
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="rounded-[28px] border border-[#133C2A]/10 bg-gradient-to-r from-[#133C2A] to-[#1d5a3f] px-5 py-5 text-white animate-scale-in">
        <p className="text-xs uppercase tracking-[0.16em] text-white/65">Сегодня в работе</p>
        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl">Рабочий день студии</h2>
            <p className="mt-1 text-sm text-white/72">Занятия, посещаемость и срочные задачи на сегодня.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-white/72">
            <span>{todayEvents.length} занятий сегодня</span>
            <span>•</span>
            <span>{attendancePendingGroups.length} групп без отметки</span>
            <span>•</span>
            <span>{availableUrgentTasks.length} срочных задач</span>
          </div>
        </div>
      </div>

      {/* Welcome Header */}
      <div>
        <h1 className="text-[#133C2A] mb-2">
          Сегодня
        </h1>
        <p className="text-[#133C2A]/60">
          {user.name.split(' ')[0]}, ниже только рабочие очереди и действия на день.
        </p>
      </div>

      {/* Today's Summary */}
      <Card className="border-none soft-shadow">
        <CardContent className="grid grid-cols-2 divide-x divide-[#133C2A]/8 md:grid-cols-4 md:divide-x-0 md:gap-6 p-0 md:p-6">
          {[
            { label: 'Занятий сегодня', value: todayEvents.length, Icon: Calendar },
            { label: 'Студентов посетят', value: todayAttending, Icon: Users },
            { label: 'Активных групп', value: groups.length, Icon: CheckCircle },
            { label: 'Всего учеников', value: totalStudents, Icon: Users },
          ].map((item, index) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 p-4 md:p-0 ${index >= 2 ? 'border-t border-[#133C2A]/8 md:border-t-0' : ''}`}
            >
              <item.Icon className="h-5 w-5 shrink-0 text-[#D4AF37]" />
              <div className="min-w-0">
                <p className="text-2xl leading-none text-[#133C2A]">{item.value}</p>
                <p className="mt-1.5 text-xs text-[#133C2A]/58">{item.label}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Attendance today */}
      <Card className="border-none soft-shadow">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[#133C2A] flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[#D4AF37]" />
            Посещаемость сегодня
          </CardTitle>
          <Button
            variant="ghost"
            onClick={() => onNavigate('attendance-management')}
            className="text-[#D4AF37] hover:text-[#133C2A] hover:bg-[#D4AF37]/10 rounded-xl"
          >
            Открыть
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {isAttendanceLoading ? (
            <p className="text-sm text-[#133C2A]/60">Загрузка...</p>
          ) : attendanceGroups.length === 0 ? (
            <p className="text-sm text-[#133C2A]/60">На сегодня занятий в расписании нет.</p>
          ) : (
            <>
              <p className="text-2xl text-[#133C2A]">
                {attendanceMarkedGroups}{' '}
                <span className="text-base text-[#133C2A]/50">из {attendanceGroups.length} групп размечено</span>
              </p>
              {attendancePendingGroups.length > 0 ? (
                <div className="mt-3 grid gap-1.5 md:grid-cols-2">
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

      {/* Quick Actions */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-5 gap-4">
            <Button 
              onClick={() => onNavigate('schedule-management')}
              className="h-auto p-6 rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 flex flex-col items-center gap-3"
            >
              <Calendar className="w-8 h-8" />
              <span>Добавить занятие</span>
            </Button>

            <Button 
              onClick={() => onNavigate('students')}
              variant="outline"
              className="h-auto p-6 rounded-2xl border-[#133C2A]/20 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 flex flex-col items-center gap-3"
            >
              <Users className="w-8 h-8 text-[#D4AF37]" />
              <span className="text-[#133C2A]">Добавить ученика</span>
            </Button>

            <Button 
              onClick={() => onNavigate('groups')}
              variant="outline"
              className="h-auto p-6 rounded-2xl border-[#133C2A]/20 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 flex flex-col items-center gap-3"
            >
              <Users className="w-8 h-8 text-[#D4AF37]" />
              <span className="text-[#133C2A]">Назначить в группу</span>
            </Button>

            <Button 
              onClick={() => onNavigate('communication')}
              variant="outline"
              className="h-auto p-6 rounded-2xl border-[#133C2A]/20 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 flex flex-col items-center gap-3"
            >
              <Bell className="w-8 h-8 text-[#D4AF37]" />
              <span className="text-[#133C2A]">Отправить уведомление</span>
            </Button>

            <CreateChecklistDialog user={user} />
          </div>
        </CardContent>
      </Card>

      {/* My Tasks Widget */}
      <Card className="border-none soft-shadow">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[#133C2A] flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#D4AF37]" />
            Мои задачи
            {availableUrgentTasks.length > 0 && (
              <Badge className="rounded-full bg-[#D14343]/8 text-[#D14343] border-[#D14343]/20 ml-2">
                {availableUrgentTasks.length} срочных
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            onClick={() => onNavigate('tasks')}
            className="text-[#D4AF37] hover:text-[#133C2A] hover:bg-[#D4AF37]/10 rounded-xl"
          >
            Все задачи
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {availableActiveTasks.length > 0 ? (
            <div className="space-y-3">
              {availableActiveTasks.slice(0, 5).map((task) => {
                const StatusIcon = statusIcons[task.status];
                const overdue = isOverdue(task);
                
                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-2xl transition-smooth cursor-pointer ${
                      overdue
                        ? 'bg-[#D14343]/8 border border-[#D14343]/20 hover:bg-[#D14343]/12'
                        : 'bg-[#F8F4E3] hover:bg-[#F8F4E3]/70'
                    }`}
                    onClick={() => onNavigate('tasks')}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        task.status === 'in-progress' ? 'bg-[#D4AF37]/15' : 'bg-white/50'
                      }`}>
                        <StatusIcon className={`w-5 h-5 ${
                          task.status === 'in-progress' ? 'text-[#8B6B00]' : 'text-[#133C2A]/40'
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`text-[#133C2A] line-clamp-1 ${overdue ? '' : ''}`}>
                            {task.title}
                          </h4>
                          <Badge className={`rounded-full ${priorityConfig[task.priority].bgColor} ${priorityConfig[task.priority].color} border text-xs whitespace-nowrap`}>
                            {task.priority === 'urgent' ? 'Срочно' : 
                             task.priority === 'high' ? 'Высокий' : 
                             task.priority === 'medium' ? 'Средний' : 'Низкий'}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-[#133C2A]/60 line-clamp-1 mb-2">
                          {task.description}
                        </p>
                        
                        <div className="flex items-center gap-3 text-xs text-[#133C2A]/50">
                          {task.isAutoGenerated && (
                            <Badge className="rounded-full bg-[#D4AF37]/12 text-[#8B6B00] border-[#D4AF37]/25 text-xs">
                              Авто
                            </Badge>
                          )}
                          <span>От: {task.createdByName}</span>
                          {task.dueDate && (
                            <span className={overdue ? 'text-[#D14343] flex items-center gap-1' : ''}>
                              {overdue && <AlertCircle className="w-3 h-3" />}
                              До: {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {availableActiveTasks.length > 5 && (
                <Button
                  variant="outline"
                  onClick={() => onNavigate('tasks')}
                  className="w-full rounded-xl border-[#133C2A]/20 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 text-[#133C2A]"
                >
                  Показать ещё {availableActiveTasks.length - 5} задач
                </Button>
              )}
            </div>
          ) : (
            <EmptyState icon={CheckSquare} title="Все задачи выполнены" description="Отличная работа — на сегодня активных задач нет." />
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <Card className="lg:col-span-2 border-none soft-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[#133C2A] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#D4AF37]" />
              Расписание на сегодня
            </CardTitle>
            <Badge className="rounded-full bg-[#D4AF37]/20 text-[#133C2A] border-[#D4AF37]/30">
              {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayEvents.length > 0 ? (
                todayEvents.map((event) => {
                  const group = groups.find(g => g.id === event.groupId);
                  return (
                    <div
                      key={event.id}
                      className="p-4 rounded-2xl bg-[#F8F4E3] hover:bg-[#F8F4E3]/70 transition-smooth"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex flex-col items-center justify-center text-white">
                          <span className="text-xs">{event.startTime}</span>
                          <span className="text-xs">-</span>
                          <span className="text-xs">{event.endTime}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[#133C2A] mb-1">{event.groupName}</h4>
                          <p className="text-sm text-[#133C2A]/60">
                            Преподаватель: {event.teacherName} • {group?.studentCount || 0} учеников
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState icon={Calendar} title="Сегодня занятий нет" description="Расписание на сегодня свободно." />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-none soft-shadow">
          <CardHeader>
            <CardTitle className="text-[#133C2A] flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#D4AF37]" />
              Важные уведомления
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-2xl border ${
                    notification.type === 'trial_class' ? 'border-[#1C8C64]/20 bg-[#1C8C64]/5' :
                    notification.type === 'payment' ? 'border-[#D4AF37]/20 bg-[#D4AF37]/5' :
                    notification.type === 'attendance' ? 'border-[#D14343]/20 bg-[#D14343]/5' :
                    'border-[#133C2A]/20 bg-[#133C2A]/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {notification.type === 'trial_class' && <UserPlus className="w-5 h-5 text-[#1C8C64] flex-shrink-0 mt-0.5" />}
                    {notification.type === 'payment' && <AlertCircle className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />}
                    {notification.type === 'attendance' && <AlertCircle className="w-5 h-5 text-[#D14343] flex-shrink-0 mt-0.5" />}
                    {notification.type === 'general' && <Bell className="w-5 h-5 text-[#133C2A] flex-shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <p className="text-sm text-[#133C2A] mb-1">{notification.title}</p>
                      <p className="text-sm text-[#133C2A]/70 mb-2">{notification.message}</p>
                      {notification.highlightedData && (
                        <div className="space-y-1">
                          {notification.highlightedData.parentName && (
                            <p className="text-sm">
                              <span className="text-[#133C2A]/60">Родитель: </span>
                              <span className="text-[#133C2A]">{notification.highlightedData.parentName}</span>
                            </p>
                          )}
                          {notification.highlightedData.parentPhone && (
                            <p className="text-sm">
                              <span className="text-[#133C2A]/60">Телефон: </span>
                              <span className="text-[#133C2A]">{notification.highlightedData.parentPhone}</span>
                            </p>
                          )}
                        </div>
                      )}
                      {notification.additionalInfo && (
                        <p className="text-xs text-[#133C2A]/60 mt-2">{notification.additionalInfo}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState icon={Bell} title="Нет новых уведомлений" description="Здесь появятся важные события, когда они возникнут." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Groups Overview */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Обзор групп</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {groups.map((group) => (
              <div
                key={group.id}
                className="p-4 rounded-2xl border border-[#133C2A]/10 hover:border-[#D4AF37]/30 transition-smooth"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: group.color }}
                  >
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[#133C2A]">{group.name}</h4>
                    <p className="text-xs text-[#133C2A]/60">{group.ageRange}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#133C2A]/70">{group.studentCount} учеников</span>
                  <Badge variant="outline" className="rounded-full border-[#133C2A]/20 text-[#133C2A]">
                    {group.teacherName.split(' ')[0]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
