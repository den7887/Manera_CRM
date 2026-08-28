import { useEffect, useState } from 'react';
import { Calendar, Users, CheckCircle, Clock, MessageSquare, ClipboardCheck, ArrowRight } from 'lucide-react';
import { User, Group, Event } from '../../types';
import { type AttendanceDayGroupDto, loadAttendanceDay } from '../../lib/backendApi';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { CreateChecklistDialog } from './CreateChecklistDialog';
import { EmptyState } from '../EmptyState';

interface TeacherHomeProps {
  user: User;
  groups: Group[];
  events: Event[];
  onNavigate: (page: string) => void;
}

function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function TeacherHome({ user, groups, events, onNavigate }: TeacherHomeProps) {
  const today = new Date();
  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.date);
    return eventDate.toDateString() === today.toDateString();
  });

  const totalStudents = groups.reduce((sum, g) => sum + g.studentCount, 0);

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

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="rounded-[28px] border border-[#133C2A]/10 bg-gradient-to-r from-[#133C2A] to-[#1d5a3f] px-5 py-5 text-white animate-scale-in">
        <p className="text-xs uppercase tracking-[0.16em] text-white/65">Сегодня на занятиях</p>
        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl">Рабочий день педагога</h2>
            <p className="mt-1 text-sm text-white/72">Занятия и посещаемость на сегодня.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-white/72">
            <span>{todayEvents.length} занятий сегодня</span>
            <span>•</span>
            <span>{attendancePendingGroups.length} групп без отметки</span>
            <span>•</span>
            <span>{totalStudents} учеников</span>
          </div>
        </div>
      </div>

      {/* Welcome Header */}
      <div>
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

      {/* Attendance today */}
      <Card className="border-none soft-shadow">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[#133C2A] flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[#D4AF37]" />
            Посещаемость сегодня
          </CardTitle>
          <Button
            variant="ghost"
            onClick={() => onNavigate('attendance')}
            className="text-[#D4AF37] hover:text-[#133C2A] hover:bg-[#D4AF37]/10 rounded-xl"
          >
            Отметить
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
                  const group = groups.find((g) => g.id === event.groupId);
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
                          <p className="text-sm text-[#133C2A]/60">{group?.studentCount || 0} учеников</p>
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
                  <Badge variant="outline" className="rounded-full border-[#133C2A]/20 text-[#133C2A]">
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
