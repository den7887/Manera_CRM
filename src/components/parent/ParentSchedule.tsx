import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, User } from 'lucide-react';
import { Event, Child } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { EmptyState } from '../EmptyState';

interface ParentScheduleProps {
  events: Event[];
  children: Child[];
}

function getWeekDays() {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date);
  }
  return days;
}

export function ParentSchedule({ events, children }: ParentScheduleProps) {
  const weekDays = useMemo(() => getWeekDays(), []);
  const [selectedDate, setSelectedDate] = useState<Date>(weekDays[0] || new Date());
  const [selectedChildId, setSelectedChildId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'day' | 'list'>('day');

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const event of events) {
      const dateKey = new Date(event.date).toDateString();
      const current = map.get(dateKey) || [];
      current.push(event);
      map.set(dateKey, current);
    }
    for (const [key, list] of map.entries()) {
      list.sort((left, right) => String(left.startTime || '').localeCompare(String(right.startTime || ''), 'ru'));
      map.set(key, list);
    }
    return map;
  }, [events]);

  const getEventsForDate = (date: Date) => eventsByDate.get(date.toDateString()) || [];
  const getChildNameByGroupId = (groupId: string) => children.find((item) => item.groupId === groupId)?.name;
  const selectedChild = selectedChildId === 'all' ? null : children.find((item) => item.id === selectedChildId) || null;

  const filteredEvents = useMemo(() => {
    if (!selectedChild?.groupId) {
      return [...events];
    }
    return events.filter((event) => String(event.groupId || '') === String(selectedChild.groupId || ''));
  }, [events, selectedChild]);

  const upcomingEvents = [...filteredEvents]
    .filter((event) => new Date(event.date).getTime() >= Date.now())
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
  const nextEvent = upcomingEvents[0];
  const selectedDayEvents = useMemo(
    () => getEventsForDate(selectedDate).filter((event) => !selectedChild?.groupId || String(event.groupId || '') === String(selectedChild.groupId || '')),
    [selectedDate, selectedChild, eventsByDate],
  );
  const weeklyEventsCount = useMemo(
    () =>
      weekDays.reduce((sum, day) => {
        const list = getEventsForDate(day).filter((event) => !selectedChild?.groupId || String(event.groupId || '') === String(selectedChild.groupId || ''));
        return sum + list.length;
      }, 0),
    [weekDays, selectedChild, eventsByDate],
  );
  const activeDaysCount = useMemo(
    () =>
      weekDays.filter((day) =>
        getEventsForDate(day).some((event) => !selectedChild?.groupId || String(event.groupId || '') === String(selectedChild.groupId || '')),
      ).length,
    [weekDays, selectedChild, eventsByDate],
  );

  const renderEventCard = (event: Event) => (
    <div key={event.id} className="rounded-xl border border-[#133C2A]/10 p-3 bg-white">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[#133C2A]">{event.groupName}</p>
          <p className="mt-1 text-xs text-[#133C2A]/60">
            {new Date(event.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
          </p>
        </div>
        {getChildNameByGroupId(event.groupId) && (
          <Badge variant="outline" className="rounded-full border-[#133C2A]/20 text-[#133C2A]">
            {getChildNameByGroupId(event.groupId)}
          </Badge>
        )}
      </div>
      <div className="mt-3 space-y-1.5 text-sm text-[#133C2A]/72">
        <div className="flex items-center gap-1.5">
          <Clock3 className="w-3.5 h-3.5 shrink-0" />
          <span>{event.startTime} - {event.endTime}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 shrink-0" />
          <span>{event.teacherName}</span>
        </div>
      </div>
    </div>
  );

  const selectedDateLabel = selectedDate.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="space-y-4 animate-scale-in">
      <div>
        <h2 className="text-[#133C2A] text-xl">Расписание</h2>
        <p className="text-sm text-[#133C2A]/60">План занятий на неделю с деталями по дням и детям</p>
      </div>

      <Card className="border-none soft-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-xs text-[#133C2A]/50">Фильтр по ребенку</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={selectedChildId === 'all' ? 'default' : 'outline'}
                  className={selectedChildId === 'all' ? 'rounded-xl bg-[#133C2A]' : 'rounded-xl border-[#133C2A]/20'}
                  onClick={() => setSelectedChildId('all')}
                >
                  Все дети
                </Button>
                {children.map((child) => (
                  <Button
                    key={child.id}
                    type="button"
                    size="sm"
                    variant={selectedChildId === child.id ? 'default' : 'outline'}
                    className={selectedChildId === child.id ? 'rounded-xl bg-[#133C2A]' : 'rounded-xl border-[#133C2A]/20'}
                    onClick={() => setSelectedChildId(child.id)}
                  >
                    {child.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#133C2A]/70">
              <CheckCircle2 className="h-4 w-4 text-[#1C8C64]" />
              {selectedChild ? `Фильтр: ${selectedChild.name}` : 'Показаны занятия всех детей'}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-[#133C2A]/50">Ближайшее занятие</p>
            <p className="mt-1 text-[#133C2A]">
              {nextEvent
                ? `${new Date(nextEvent.date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}, ${nextEvent.startTime}`
                : 'Не запланировано'}
            </p>
            {nextEvent ? (
              <p className="mt-1 text-sm text-[#133C2A]/60">{nextEvent.groupName}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-[#133C2A]/50">Занятий на 7 дней</p>
            <p className="mt-1 text-2xl text-[#133C2A]">{weeklyEventsCount}</p>
            <p className="mt-1 text-sm text-[#133C2A]/60">Активных дней: {activeDaysCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-[#133C2A]">Неделя</CardTitle>
            <div className="inline-flex rounded-xl border border-[#133C2A]/15 bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode('day')}
                className={`rounded-lg px-3 py-1 text-xs transition ${
                  viewMode === 'day' ? 'bg-[#133C2A] text-white' : 'text-[#133C2A]/70 hover:bg-[#133C2A]/6'
                }`}
              >
                По дням
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`rounded-lg px-3 py-1 text-xs transition ${
                  viewMode === 'list' ? 'bg-[#133C2A] text-white' : 'text-[#133C2A]/70 hover:bg-[#133C2A]/6'
                }`}
              >
                Списком
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {weekDays.map((date) => {
              const dayEvents = getEventsForDate(date).filter((event) => !selectedChild?.groupId || String(event.groupId || '') === String(selectedChild.groupId || ''));
              const isToday = date.toDateString() === new Date().toDateString();
              const isSelected = date.toDateString() === selectedDate.toDateString();
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={`rounded-2xl border px-2 py-2 text-left transition ${
                    isSelected
                      ? 'border-[#133C2A] bg-[#133C2A] text-white'
                      : 'border-[#133C2A]/12 bg-white text-[#133C2A] hover:border-[#133C2A]/35'
                  }`}
                >
                  <p className={`text-[11px] ${isSelected ? 'text-white/80' : 'text-[#133C2A]/58'}`}>
                    {date.toLocaleDateString('ru-RU', { weekday: 'short' })}
                  </p>
                  <p className="mt-0.5 text-sm">{date.toLocaleDateString('ru-RU', { day: '2-digit' })}</p>
                  <p className={`mt-1 text-[11px] ${isSelected ? 'text-white/85' : 'text-[#133C2A]/65'}`}>
                    {dayEvents.length} зан.
                  </p>
                  {isToday && !isSelected ? (
                    <span className="mt-1 inline-flex rounded-full bg-[#D4AF37]/22 px-1.5 py-0.5 text-[10px] text-[#8B6B00]">Сегодня</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {viewMode === 'day' ? (
        <Card className="border-none soft-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-[#133C2A] text-base capitalize">{selectedDateLabel}</CardTitle>
              {selectedDate.toDateString() === new Date().toDateString() ? (
                <Badge className="rounded-full bg-[#D4AF37]/20 text-[#133C2A] border-[#D4AF37]/30">Сегодня</Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedDayEvents.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Занятий нет" description="На выбранный день занятий не запланировано." />
            ) : (
              selectedDayEvents.map((event) => (
                <div key={event.id} className="relative pl-6">
                  <span className="absolute left-2 top-0 bottom-0 w-px bg-[#133C2A]/12" />
                  <span className="absolute left-[5px] top-5 h-2.5 w-2.5 rounded-full bg-[#133C2A]" />
                  {renderEventCard(event)}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none soft-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#133C2A] text-base">Ближайшие занятия списком</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingEvents.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Занятий пока нет" description="Ближайшие занятия появятся здесь." />
            ) : (
              upcomingEvents.slice(0, 20).map(renderEventCard)
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
