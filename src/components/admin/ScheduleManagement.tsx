import { useMemo, useState } from 'react';
import { CalendarDays, ClipboardCheck, Clock3, ArrowUpRight, Search, Users } from 'lucide-react';
import { Event, Group } from '../../types';
import { EmptyState } from '../EmptyState';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';

type ScheduleQueue = 'today' | 'week' | 'gaps' | 'attendance';

const queueLabels: Record<ScheduleQueue, string> = {
  today: 'Сегодня',
  week: 'Неделя',
  gaps: 'Свободные места',
  attendance: 'Посещаемость',
};

function formatRuDate(value: Date): string {
  return new Date(value).toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function isSameDay(left: Date, right: Date): boolean {
  return left.toDateString() === right.toDateString();
}

function isWithinWeek(date: Date): boolean {
  const today = new Date();
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 6);
  return date >= new Date(today.toDateString()) && date <= weekEnd;
}

export function ScheduleManagement({
  events,
  groups,
  onNavigate,
}: {
  events: Event[];
  groups: Group[];
  onNavigate: (page: string) => void;
}) {
  const [queue, setQueue] = useState<ScheduleQueue>('today');
  const [searchQuery, setSearchQuery] = useState('');

  const today = new Date();

  const enrichedEvents = useMemo(() => {
    return events
      .map((event) => {
        const group = groups.find((item) => item.id === event.groupId);
        const maxStudents = 12;
        const currentStudents = group?.studentCount || 0;
        return {
          ...event,
          group,
          currentStudents,
          freePlaces: Math.max(0, maxStudents - currentStudents),
          dateValue: new Date(event.date),
        };
      })
      .sort((a, b) => {
        const dayDiff = a.dateValue.getTime() - b.dateValue.getTime();
        if (dayDiff !== 0) return dayDiff;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [events, groups]);

  const visibleEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return enrichedEvents.filter((event) => {
      const matchesQuery =
        !query ||
        [event.groupName, event.teacherName, event.group?.ageRange || '']
          .join(' ')
          .toLowerCase()
          .includes(query);

      if (!matchesQuery) return false;

      if (queue === 'today') return isSameDay(event.dateValue, today);
      if (queue === 'week') return isWithinWeek(event.dateValue);
      if (queue === 'gaps') return event.freePlaces > 0;
      return true;
    });
  }, [enrichedEvents, queue, searchQuery, today]);

  const summary = useMemo(() => {
    const todayLessons = enrichedEvents.filter((event) => isSameDay(event.dateValue, today));
    const weekLessons = enrichedEvents.filter((event) => isWithinWeek(event.dateValue));
    const openGroups = groups.filter((group) => group.studentCount < 12);
    return {
      todayLessons: todayLessons.length,
      weekLessons: weekLessons.length,
      studentsToday: todayLessons.reduce((sum, event) => sum + event.currentStudents, 0),
      groupsWithPlaces: openGroups.length,
    };
  }, [enrichedEvents, groups, today]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Расписание</h1>
          <p className="text-[#133C2A]/60">Не таблица ради таблицы, а рабочая очередь по занятиям, заполняемости и посещаемости.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
          <Button variant="outline" className="rounded-2xl" onClick={() => onNavigate('attendance-management')}>
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Посещаемость
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={() => onNavigate('groups')}>
            <Users className="mr-2 h-4 w-4" />
            Группы
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Занятий сегодня</p><p className="mt-1 text-3xl text-[#133C2A]">{summary.todayLessons}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">На неделе</p><p className="mt-1 text-3xl text-[#133C2A]">{summary.weekLessons}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Учеников сегодня</p><p className="mt-1 text-3xl text-[#133C2A]">{summary.studentsToday}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Группы с местами</p><p className="mt-1 text-3xl text-[#133C2A]">{summary.groupsWithPlaces}</p></CardContent></Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader className="pb-3">
          <div className="space-y-3">
            <div className="mobile-scroll-x rounded-2xl border border-[#133C2A]/10 bg-[#fbf7e8]/70 p-1">
              <div className="flex min-w-max gap-1">
                {(Object.keys(queueLabels) as ScheduleQueue[]).map((queueId) => (
                  <Button
                    key={queueId}
                    type="button"
                    size="sm"
                    variant={queue === queueId ? 'default' : 'ghost'}
                    className={queue === queueId ? 'rounded-xl bg-[#133C2A]' : 'rounded-xl text-[#133C2A]/68'}
                    onClick={() => setQueue(queueId)}
                  >
                    {queueLabels[queueId]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#133C2A]/40" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск по группе или педагогу"
                className="rounded-2xl pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {queue === 'attendance' ? (
            <Card className="border border-[#133C2A]/10 bg-[#F8F4E3]/55">
              <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-lg text-[#133C2A]">Отметка посещаемости</p>
                  <p className="mt-1 text-sm text-[#133C2A]/60">
                    Отдельный рабочий поток. Открывает список занятий, где нужно отметить пришел, опоздал или отсутствовал.
                  </p>
                </div>
                <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" onClick={() => onNavigate('attendance-management')}>
                  Перейти к посещаемости
                </Button>
              </CardContent>
            </Card>
          ) : visibleEvents.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={queue === 'today' ? 'Сегодня занятий нет' : 'Подходящих занятий нет'}
              description={
                queue === 'gaps'
                  ? 'Свободных мест в текущих группах не найдено.'
                  : 'Измените очередь или проверьте расписание групп.'
              }
              actionLabel="Открыть группы"
              onAction={() => onNavigate('groups')}
            />
          ) : (
            visibleEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden border-[#133C2A]/10 bg-white/92 shadow-[0_10px_30px_rgba(19,60,42,0.06)]">
                <CardContent className="p-0">
                  <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr_250px]">
                    <div className="p-4 md:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="rounded-full border border-[#D4AF37]/25 bg-[#FFF9E8] text-[#8B6B00]">
                              {formatRuDate(event.dateValue)}
                            </Badge>
                            {isSameDay(event.dateValue, today) ? (
                              <Badge variant="outline" className="rounded-full border-green-200 bg-green-50 text-green-700">
                                Сегодня
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-3 text-lg leading-tight text-[#133C2A]">{event.groupName}</p>
                          <p className="mt-1 text-sm text-[#133C2A]/65">
                            {event.group?.ageRange || 'Возраст не указан'} • {event.teacherName}
                          </p>
                        </div>
                        <div className="text-left xl:text-right">
                          <p className="text-xl text-[#133C2A]">{event.startTime} - {event.endTime}</p>
                          <p className="mt-1 text-xs text-[#133C2A]/55">Педагог: {event.teacherName}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-y border-[#133C2A]/8 bg-[#fbf7e8]/72 p-4 md:p-5 xl:border-x xl:border-y-0">
                      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                        <div className="rounded-2xl bg-white p-3">
                          <p className="text-xs text-[#133C2A]/45">Состав</p>
                          <p className="mt-1 text-[#133C2A]">{event.currentStudents} учеников</p>
                        </div>
                        <div className="rounded-2xl bg-white p-3">
                          <p className="text-xs text-[#133C2A]/45">Свободные места</p>
                          <p className="mt-1 text-[#133C2A]">{event.freePlaces}</p>
                        </div>
                        <div className="rounded-2xl bg-white p-3">
                          <p className="text-xs text-[#133C2A]/45">Следующее действие</p>
                          <p className="mt-1 text-[#133C2A]">
                            {event.freePlaces > 0 ? 'Можно добавить пробного' : 'Группа заполнена'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 md:p-5">
                      <div className="flex h-full flex-col gap-2">
                        <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" onClick={() => onNavigate('attendance-management')}>
                          <ClipboardCheck className="mr-2 h-4 w-4" />
                          Посещаемость
                        </Button>
                        <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={() => onNavigate('groups')}>
                          <ArrowUpRight className="mr-2 h-4 w-4" />
                          Открыть группу
                        </Button>
                        <div className="mt-auto rounded-2xl border border-dashed border-[#133C2A]/12 px-3 py-3 text-sm text-[#133C2A]/48">
                          Перенос и редактирование занятия оставлены на следующий backend-этап.
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
