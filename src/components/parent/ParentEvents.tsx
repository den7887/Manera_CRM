import { Calendar, MapPin, Users, CreditCard, Sparkles } from 'lucide-react';
import { News } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { toast } from 'sonner';

interface ParentEventsProps {
  events: News[];
  userId: string;
}

export function ParentEvents({ events }: ParentEventsProps) {
  const allEvents = events.filter((item) => item.isEvent && item.published);
  const upcoming = allEvents.filter((item) => item.eventDate && item.eventDate > new Date());
  const past = allEvents.filter((item) => item.eventDate && item.eventDate <= new Date());

  const isDeadlinePassed = (deadline?: Date) => (deadline ? deadline < new Date() : false);
  const isFull = (event: News) => Boolean(event.maxParticipants && event.currentParticipants && event.currentParticipants >= event.maxParticipants);
  const canRegister = (event: News) => !isDeadlinePassed(event.eventDeadline) && !isFull(event);

  const handleRegister = (event: News) => {
    toast.info('Регистрация пока недоступна', {
      description: `Для мероприятия "${event.title}" подключение рабочего потока оплаты/записи выполняется на следующем этапе.`,
    });
  };

  const renderCard = (event: News) => (
    <Card key={event.id} className="border-none soft-shadow overflow-hidden">
      {event.image && <ImageWithFallback src={event.image} alt={event.title} className="w-full h-40 object-cover" />}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-[#133C2A] text-base">{event.title}</CardTitle>
          <Badge variant="outline" className="rounded-full border-[#133C2A]/20 text-[#133C2A]">
            {event.eventType || 'event'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 text-sm text-[#133C2A]/70">
          {event.eventDate && (
            <p>
              <Calendar className="w-3.5 h-3.5 inline mr-1.5" />
              {event.eventDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          {event.eventLocation && (
            <p>
              <MapPin className="w-3.5 h-3.5 inline mr-1.5" />
              {event.eventLocation}
            </p>
          )}
          {(event.maxParticipants || event.currentParticipants) && (
            <p>
              <Users className="w-3.5 h-3.5 inline mr-1.5" />
              {event.currentParticipants || 0} / {event.maxParticipants || 0}
            </p>
          )}
        </div>

        <p className="text-sm text-[#133C2A]/75 line-clamp-3">{event.content}</p>

        {event.requiresPayment && typeof event.eventFee === 'number' ? (
          <div className="rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/8 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-[#133C2A]/60">Взнос</p>
              <p className="text-[#133C2A]">{event.eventFee.toLocaleString('ru-RU')} ₽</p>
            </div>
            <Button
              size="sm"
              className="rounded-lg bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
              onClick={() => handleRegister(event)}
              disabled={!canRegister(event)}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {canRegister(event) ? 'Записаться' : 'Закрыто'}
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-[#1C8C64]/20 bg-[#1C8C64]/10 p-3 text-sm text-[#1C8C64]">
            Участие без взноса
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 animate-scale-in">
      <div>
        <h2 className="text-[#133C2A] text-xl">Мероприятия</h2>
        <p className="text-sm text-[#133C2A]/60">Плановые конкурсы, концерты и активности студии</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-xs text-[#133C2A]/60">Всего</p><p className="text-xl text-[#133C2A] mt-1">{allEvents.length}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-xs text-[#133C2A]/60">Предстоящие</p><p className="text-xl text-[#133C2A] mt-1">{upcoming.length}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-xs text-[#133C2A]/60">Прошедшие</p><p className="text-xl text-[#133C2A] mt-1">{past.length}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-xs text-[#133C2A]/60">Открыта запись</p><p className="text-xl text-[#133C2A] mt-1">{upcoming.filter(canRegister).length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="bg-white border border-[#133C2A]/10 rounded-xl">
          <TabsTrigger value="upcoming" className="rounded-lg">Предстоящие</TabsTrigger>
          <TabsTrigger value="past" className="rounded-lg">Прошедшие</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {upcoming.length === 0 ? (
            <Card className="border-none soft-shadow">
              <CardContent className="p-10 text-center text-[#133C2A]/60">
                <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-35" />
                <p>Предстоящих мероприятий пока нет.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{upcoming.map(renderCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {past.length === 0 ? (
            <Card className="border-none soft-shadow">
              <CardContent className="p-10 text-center text-[#133C2A]/60">История мероприятий пока пуста.</CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{past.map(renderCard)}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
