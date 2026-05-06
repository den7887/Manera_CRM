import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Calendar, Clock, Users, Bell, CheckCircle, AlertCircle, Briefcase, UserPlus, Circle, CheckSquare, ArrowRight, Cake, ClipboardCheck } from 'lucide-react';
import { User, Event, Group, Task, Notification } from '../../types';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { UpcomingBirthdays } from './UpcomingBirthdays';
import { CreateChecklistDialog } from './CreateChecklistDialog';

interface AdminHomeProps {
  user: User;
  events: Event[];
  groups: Group[];
  tasks: Task[];
  onNavigate: (page: string) => void;
  notifications: Notification[];
}

export function AdminHome({ user, events, groups, tasks, onNavigate, notifications }: AdminHomeProps) {
  const today = new Date();
  
  const birthdays = [];
  
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
    low: { color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
    medium: { color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200' },
    high: { color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200' },
    urgent: { color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' },
  };

  const statusIcons = {
    todo: Circle,
    done: CheckCircle,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="animate-scale-in">
        <h1 className="text-[#133C2A] mb-2">
          Сегодня
        </h1>
        <p className="text-[#133C2A]/60">
          {user.name.split(' ')[0]}, ниже только рабочие очереди и действия на день.
        </p>
      </div>

      {/* Today's Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Занятий сегодня</p>
                <p className="text-3xl text-[#133C2A]">{todayEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Студентов посетят</p>
                <p className="text-3xl text-[#133C2A]">{todayAttending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1C8C64] to-[#133C2A] flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Активных групп</p>
                <p className="text-3xl text-[#133C2A]">{groups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FADADD] to-[#FFC0CB] flex items-center justify-center">
                <Users className="w-6 h-6 text-[#133C2A]" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Всего учеников</p>
                <p className="text-3xl text-[#133C2A]">{totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
              <Badge className="bg-red-50 text-red-600 border-red-200 ml-2">
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
                        ? 'bg-red-50 border border-red-200 hover:bg-red-100' 
                        : 'bg-[#F8F4E3] hover:bg-[#F8F4E3]/70'
                    }`}
                    onClick={() => onNavigate('tasks')}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        task.status === 'in-progress' ? 'bg-blue-100' : 'bg-white/50'
                      }`}>
                        <StatusIcon className={`w-5 h-5 ${
                          task.status === 'in-progress' ? 'text-blue-500' : 'text-[#133C2A]/40'
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`text-[#133C2A] line-clamp-1 ${overdue ? '' : ''}`}>
                            {task.title}
                          </h4>
                          <Badge className={`${priorityConfig[task.priority].bgColor} ${priorityConfig[task.priority].color} border text-xs whitespace-nowrap`}>
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
                            <Badge className="bg-purple-50 text-purple-600 border-purple-200 text-xs">
                              Авто
                            </Badge>
                          )}
                          <span>От: {task.createdByName}</span>
                          {task.dueDate && (
                            <span className={overdue ? 'text-red-500 flex items-center gap-1' : ''}>
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
            <div className="text-center py-12 text-[#133C2A]/60">
              <CheckSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="mb-1">Все задачи выполнены!</p>
              <p className="text-sm">Отличная работа! 🎉</p>
            </div>
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
            <Badge className="bg-[#D4AF37]/20 text-[#133C2A] border-[#D4AF37]/30">
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
                <div className="text-center py-8 text-[#133C2A]/60">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Сегодня занятий нет</p>
                </div>
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
                    notification.type === 'attendance' ? 'border-[#FF6B6B]/20 bg-[#FF6B6B]/5' :
                    'border-[#133C2A]/20 bg-[#133C2A]/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {notification.type === 'trial_class' && <UserPlus className="w-5 h-5 text-[#1C8C64] flex-shrink-0 mt-0.5" />}
                    {notification.type === 'payment' && <AlertCircle className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />}
                    {notification.type === 'attendance' && <AlertCircle className="w-5 h-5 text-[#FF6B6B] flex-shrink-0 mt-0.5" />}
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
              <div className="text-center py-8 text-[#133C2A]/60">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Нет новых уведомлений</p>
              </div>
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
                  <Badge variant="outline" className="border-[#133C2A]/20 text-[#133C2A]">
                    {group.teacherName.split(' ')[0]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Birthdays */}
      <UpcomingBirthdays birthdays={birthdays} />
    </div>
  );
}
