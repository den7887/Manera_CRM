import { Calendar, Users, CheckCircle, Clock, MessageSquare, ClipboardCheck } from 'lucide-react';
import { User, Group, Event } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { CreateChecklistDialog } from './CreateChecklistDialog';

interface TeacherHomeProps {
  user: User;
  groups: Group[];
  events: Event[];
  onNavigate: (page: string) => void;
}

export function TeacherHome({ user, groups, events, onNavigate }: TeacherHomeProps) {
  const today = new Date();
  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.date);
    return eventDate.toDateString() === today.toDateString();
  });

  const totalStudents = groups.reduce((sum, g) => sum + g.studentCount, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="animate-scale-in">
        <h1 className="text-[#133C2A] mb-2">Сегодня</h1>
        <p className="text-[#133C2A]/60">
          {user.name.split(' ')[0]}, занятий сегодня: {todayEvents.length}
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#133C2A]/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#133C2A]" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Всего учеников</p>
                <p className="text-2xl text-[#133C2A]">{totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Групп</p>
                <p className="text-2xl text-[#133C2A]">{groups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#1C8C64]/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-[#1C8C64]" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Занятий сегодня</p>
                <p className="text-2xl text-[#133C2A]">{todayEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                todayEvents.map((event) => (
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
                          Зал 1 • {event.groupName.includes('Младшая') ? '12' : event.groupName.includes('Средняя') ? '15' : '10'} учеников
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-[#133C2A]/60">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Сегодня занятий нет</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Groups */}
        <Card className="border-none soft-shadow">
          <CardHeader>
            <CardTitle className="text-[#133C2A] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#D4AF37]" />
              Мои группы
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="p-4 rounded-2xl border border-[#133C2A]/10 hover:border-[#D4AF37]/30 transition-smooth cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: group.color }}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[#133C2A]">{group.name}</h4>
                    <p className="text-xs text-[#133C2A]/60">{group.ageRange}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#133C2A]/70">{group.studentCount} учеников</span>
                  <Badge variant="outline" className="border-[#133C2A]/20 text-[#133C2A]">
                    {group.schedule.split(' ')[0]}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <Button 
              onClick={() => onNavigate('groups')}
              variant="outline" 
              className="h-auto p-6 rounded-2xl border-[#133C2A]/20 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 flex flex-col items-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div className="text-center">
                <p className="text-[#133C2A]">Отправить сообщение</p>
                <p className="text-xs text-[#133C2A]/60 mt-1">Связь с родителями</p>
              </div>
            </Button>

            <Button 
              onClick={() => onNavigate('students')}
              variant="outline" 
              className="h-auto p-6 rounded-2xl border-[#133C2A]/20 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 flex flex-col items-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#1C8C64]/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#1C8C64]" />
              </div>
              <div className="text-center">
                <p className="text-[#133C2A]">Просмотреть учеников</p>
                <p className="text-xs text-[#133C2A]/60 mt-1">База данных</p>
              </div>
            </Button>

            <CreateChecklistDialog user={user} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
