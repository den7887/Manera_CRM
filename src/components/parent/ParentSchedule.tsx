import { CalendarDays, Clock3, User } from 'lucide-react';
import { Event, Child } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

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
  const weekDays = getWeekDays();
  const getEventsForDate = (date: Date) =>
    events.filter((event) => new Date(event.date).toDateString() === date.toDateString());
  const daysWithEvents = weekDays.filter((date) => getEventsForDate(date).length > 0);
  const getChildNameByGroupId = (groupId: string) => children.find((item) => item.groupId === groupId)?.name;

  return (
    <div className="space-y-4 animate-scale-in">
      <div>
        <h2 className="text-[#133C2A] text-xl">Расписание</h2>
        <p className="text-sm text-[#133C2A]/60">План занятий на ближайшую неделю</p>
      </div>

      <Tabs defaultValue="week" className="w-full">
        <TabsList className="bg-white border border-[#133C2A]/10 rounded-xl">
          <TabsTrigger value="week" className="rounded-lg">Неделя</TabsTrigger>
          <TabsTrigger value="month" className="rounded-lg">Месяц</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="mt-4 space-y-3">
          {daysWithEvents.length === 0 ? (
            <Card className="border-none soft-shadow">
              <CardContent className="p-10 text-center text-[#133C2A]/60">
                <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>На ближайшие 7 дней занятия не запланированы.</p>
              </CardContent>
            </Card>
          ) : (
            daysWithEvents.map((date) => {
              const dayEvents = getEventsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <Card key={date.toISOString()} className="border-none soft-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-[#133C2A] text-base">
                        {date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </CardTitle>
                      {isToday && <Badge className="bg-[#D4AF37]/20 text-[#133C2A] border-[#D4AF37]/30">Сегодня</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dayEvents.map((event) => (
                      <div key={event.id} className="rounded-xl border border-[#133C2A]/10 p-3 bg-white">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="text-[#133C2A]">{event.groupName}</p>
                            <p className="text-xs text-[#133C2A]/60 mt-1">
                              <Clock3 className="w-3.5 h-3.5 inline mr-1" />
                              {event.startTime} - {event.endTime}
                              <span className="mx-1">•</span>
                              <User className="w-3.5 h-3.5 inline mr-1" />
                              {event.teacherName}
                            </p>
                          </div>
                          {getChildNameByGroupId(event.groupId) && (
                            <Badge variant="outline" className="rounded-full border-[#133C2A]/20 text-[#133C2A]">
                              {getChildNameByGroupId(event.groupId)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="month" className="mt-4">
          <Card className="border-none soft-shadow">
            <CardContent className="p-8 text-center text-[#133C2A]/60">
              Календарный режим месяца будет подключен на следующем этапе.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
