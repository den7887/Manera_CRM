import { Calendar as CalendarIcon, Clock, MapPin, User, Users } from 'lucide-react';
import { Event, Child } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface ParentScheduleProps {
  events: Event[];
  children: Child[];
}

export function ParentSchedule({ events, children }: ParentScheduleProps) {
  const getWeekDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays();

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  // Получить имя ребенка по groupId
  const getChildNameByGroupId = (groupId: string) => {
    const child = children.find(c => c.groupId === groupId);
    return child ? child.name : null;
  };

  // Фильтруем дни: показываем только те, где есть занятия
  const daysWithEvents = weekDays.filter(date => {
    const dayEvents = getEventsForDate(date);
    return dayEvents.length > 0;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      <div>
        <h1 className="text-[#133C2A] mb-2">Расписание занятий</h1>
        <p className="text-[#133C2A]/60">Календарь и график занятий ваших детей</p>
      </div>

      <Tabs defaultValue="week" className="w-full">
        <TabsList className="bg-white border border-[#133C2A]/10">
          <TabsTrigger value="week" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#133C2A] data-[state=active]:to-[#D4AF37] data-[state=active]:text-white">
            Неделя
          </TabsTrigger>
          <TabsTrigger value="month" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#133C2A] data-[state=active]:to-[#D4AF37] data-[state=active]:text-white">
            Месяц
          </TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="mt-6">
          {daysWithEvents.length > 0 ? (
            <div className="grid gap-4">
              {daysWithEvents.map((date, index) => {
                const dayEvents = getEventsForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <Card 
                    key={index} 
                    className={`border-none soft-shadow ${isToday ? 'ring-2 ring-[#D4AF37]' : ''}`}
                  >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center ${
                          isToday 
                            ? 'bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white' 
                            : 'bg-[#F8F4E3] text-[#133C2A]'
                        }`}>
                          <span className="text-xs">
                            {date.toLocaleDateString('ru-RU', { weekday: 'short' })}
                          </span>
                          <span className="text-xl">{date.getDate()}</span>
                        </div>
                        <div>
                          <CardTitle className="text-[#133C2A]">
                            {date.toLocaleDateString('ru-RU', { weekday: 'long' })}
                          </CardTitle>
                          <p className="text-sm text-[#133C2A]/60">
                            {date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                          </p>
                        </div>
                      </div>
                      {isToday && (
                        <Badge className="bg-[#D4AF37]/20 text-[#133C2A] border-[#D4AF37]/30">
                          Сегодня
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {dayEvents.map((event) => {
                          const childName = getChildNameByGroupId(event.groupId);
                          
                          return (
                            <div
                              key={event.id}
                              className="p-4 rounded-2xl bg-[#F8F4E3] hover:bg-[#F8F4E3]/70 transition-smooth"
                            >
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center text-white flex-shrink-0">
                                  <CalendarIcon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-[#133C2A]">{event.groupName}</h4>
                                    {childName && (
                                      <Badge className="bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white border-none">
                                        {childName}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-[#133C2A]/70">
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-[#D4AF37]" />
                                      {event.startTime} - {event.endTime}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <User className="w-4 h-4 text-[#D4AF37]" />
                                      {event.teacherName}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4 text-[#D4AF37]" />
                                      Зал 1
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-none soft-shadow">
              <CardContent className="p-12">
                <div className="text-center text-[#133C2A]/60">
                  <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-[#133C2A] mb-2">Нет запланированных занятий</h3>
                  <p className="text-sm">На этой неделе пока нет занятий в расписании</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="month" className="mt-6">
          <Card className="border-none soft-shadow">
            <CardContent className="p-6">
              <div className="text-center py-12 text-[#133C2A]/60">
                <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Представление месяца будет доступно в следующей версии</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
