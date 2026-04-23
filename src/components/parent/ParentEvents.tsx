import { useState } from 'react';
import { Calendar, MapPin, Users, Clock, CreditCard, Trophy, Music, GraduationCap, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { News } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { toast } from 'sonner@2.0.3';

interface ParentEventsProps {
  events: News[];
  userId: string;
}

export function ParentEvents({ events, userId }: ParentEventsProps) {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const eventTypes = {
    competition: { label: 'Конкурс', icon: Trophy, color: '#D4AF37' },
    concert: { label: 'Концерт', icon: Music, color: '#133C2A' },
    masterclass: { label: 'Мастер-класс', icon: GraduationCap, color: '#1C8C64' },
    other: { label: 'Мероприятие', icon: Sparkles, color: '#9333EA' },
  };

  // Фильтруем только мероприятия
  const allEvents = events.filter(e => e.isEvent && e.published);
  const upcomingEvents = allEvents.filter(e => e.eventDate && e.eventDate > new Date());
  const pastEvents = allEvents.filter(e => e.eventDate && e.eventDate <= new Date());

  const handlePayment = (event: News) => {
    setSelectedEvent(event.id);
    // Имитация создания платежа
    setTimeout(() => {
      toast.success(`Платеж на ${event.eventFee} ₽ создан`, {
        description: `Вы записаны на "${event.title}"`,
      });
      setSelectedEvent(null);
    }, 1000);
  };

  const isDeadlinePassed = (deadline?: Date) => {
    if (!deadline) return false;
    return deadline < new Date();
  };

  const isFull = (event: News) => {
    if (!event.maxParticipants || !event.currentParticipants) return false;
    return event.currentParticipants >= event.maxParticipants;
  };

  const canRegister = (event: News) => {
    return !isDeadlinePassed(event.eventDeadline) && !isFull(event);
  };

  const renderEventCard = (event: News) => {
    const eventTypeInfo = event.eventType ? eventTypes[event.eventType] : eventTypes.other;
    const Icon = eventTypeInfo.icon;
    const spotsLeft = event.maxParticipants && event.currentParticipants 
      ? event.maxParticipants - event.currentParticipants 
      : 0;

    return (
      <Card key={event.id} className="border-none soft-shadow hover-lift overflow-hidden">
        {event.image && (
          <div className="relative">
            <ImageWithFallback
              src={event.image}
              alt={event.title}
              className="w-full h-48 object-cover"
            />
            <div 
              className="absolute top-4 left-4 px-3 py-1.5 rounded-xl flex items-center gap-2"
              style={{ backgroundColor: `${eventTypeInfo.color}15`, border: `1px solid ${eventTypeInfo.color}30` }}
            >
              <Icon className="w-4 h-4" style={{ color: eventTypeInfo.color }} />
              <span className="text-sm" style={{ color: eventTypeInfo.color }}>
                {eventTypeInfo.label}
              </span>
            </div>
            
            {!canRegister(event) && (
              <div className="absolute top-4 right-4">
                {isFull(event) ? (
                  <Badge className="bg-[#D14343] text-white border-none">Мест нет</Badge>
                ) : (
                  <Badge className="bg-[#133C2A]/80 text-white border-none">Регистрация закрыта</Badge>
                )}
              </div>
            )}
          </div>
        )}

        <CardHeader>
          <CardTitle className="text-[#133C2A]">{event.title}</CardTitle>
          <div className="space-y-2 text-sm text-[#133C2A]/60">
            {event.eventDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#D4AF37]" />
                <span>
                  {event.eventDate.toLocaleDateString('ru-RU', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric',
                    weekday: 'long'
                  })}
                </span>
              </div>
            )}
            {event.eventLocation && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#D4AF37]" />
                <span>{event.eventLocation}</span>
              </div>
            )}
            {event.maxParticipants && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#D4AF37]" />
                <span>
                  {event.currentParticipants || 0} / {event.maxParticipants} участников
                  {spotsLeft > 0 && spotsLeft <= 10 && (
                    <span className="text-[#D14343] ml-2">осталось {spotsLeft} мест!</span>
                  )}
                </span>
              </div>
            )}
            {event.eventDeadline && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D4AF37]" />
                <span>
                  Регистрация до {event.eventDeadline.toLocaleDateString('ru-RU', { 
                    day: 'numeric', 
                    month: 'long'
                  })}
                </span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-[#133C2A]/80 leading-relaxed">{event.content}</p>

          {event.requiresPayment && event.eventFee !== undefined && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#D4AF37]/10 to-[#133C2A]/10 border border-[#D4AF37]/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#133C2A]/60">Стоимость участия</p>
                    <p className="text-2xl text-[#133C2A]">{event.eventFee} ₽</p>
                  </div>
                </div>

                {canRegister(event) ? (
                  <Button
                    onClick={() => handlePayment(event)}
                    disabled={selectedEvent === event.id}
                    className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 transition-opacity"
                  >
                    {selectedEvent === event.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Обработка...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Записаться и оплатить
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="text-sm text-[#133C2A]/60 text-right">
                    {isFull(event) ? (
                      <div className="flex items-center gap-2 text-[#D14343]">
                        <AlertCircle className="w-4 h-4" />
                        Нет мест
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Регистрация закрыта
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!event.requiresPayment && (
            <div className="flex items-center gap-2 text-[#1C8C64] p-3 rounded-xl bg-[#1C8C64]/10">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">Участие бесплатное</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      <div>
        <h1 className="text-[#133C2A] mb-2">Мероприятия</h1>
        <p className="text-[#133C2A]/60">Конкурсы, концерты и мастер-классы студии</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Предстоящие</p>
                <p className="text-2xl text-[#133C2A]">{upcomingEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#133C2A]/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#133C2A]" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Всего участников</p>
                <p className="text-2xl text-[#133C2A]">
                  {allEvents.reduce((sum, e) => sum + (e.currentParticipants || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#1C8C64]/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#1C8C64]" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Открыта регистрация</p>
                <p className="text-2xl text-[#133C2A]">
                  {upcomingEvents.filter(e => canRegister(e)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Tabs */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="bg-white border border-[#133C2A]/10">
          <TabsTrigger 
            value="upcoming" 
            className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#133C2A] data-[state=active]:to-[#D4AF37] data-[state=active]:text-white"
          >
            Предстоящие ({upcomingEvents.length})
          </TabsTrigger>
          <TabsTrigger 
            value="past"
            className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#133C2A] data-[state=active]:to-[#D4AF37] data-[state=active]:text-white"
          >
            Прошедшие ({pastEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-6 mt-6">
          {upcomingEvents.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {upcomingEvents.map(renderEventCard)}
            </div>
          ) : (
            <Card className="border-none soft-shadow">
              <CardContent className="p-12 text-center">
                <Calendar className="w-16 h-16 text-[#133C2A]/20 mx-auto mb-4" />
                <h3 className="text-[#133C2A] mb-2">Нет предстоящих мероприятий</h3>
                <p className="text-[#133C2A]/60">Следите за новостями!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-6 mt-6">
          {pastEvents.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {pastEvents.map(renderEventCard)}
            </div>
          ) : (
            <Card className="border-none soft-shadow">
              <CardContent className="p-12 text-center">
                <CheckCircle className="w-16 h-16 text-[#133C2A]/20 mx-auto mb-4" />
                <h3 className="text-[#133C2A] mb-2">Нет прошедших мероприятий</h3>
                <p className="text-[#133C2A]/60">История мероприятий появится здесь</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
