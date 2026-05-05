import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CalendarClock, RefreshCw } from 'lucide-react';
import { News } from '../../types';
import { createNews, deleteNews, loadNews, updateNews } from '../../lib/backendApi';
import { EventsManagement } from '../admin/EventsManagement';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { toast } from 'sonner';

export function OwnerEventsPanel() {
  const [events, setEvents] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const allNews = await loadNews();
      setEvents(allNews.filter((item) => item.isEvent));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить мероприятия');
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const published = events.filter((item) => item.published).length;
    const upcoming = events.filter((item) => item.eventDate && new Date(item.eventDate).getTime() >= now).length;
    return {
      total: events.length,
      published,
      drafts: events.length - published,
      upcoming,
    };
  }, [events]);

  const createEvent = async (payload: Partial<News>) => {
    const optimistic: News = {
      id: `event-${Date.now()}`,
      title: payload.title || 'Новое мероприятие',
      content: payload.content || '',
      date: new Date(),
      image: payload.image,
      published: payload.published ?? true,
      isEvent: true,
      eventType: payload.eventType,
      eventDate: payload.eventDate,
      eventLocation: payload.eventLocation,
      eventFee: payload.eventFee,
      eventDeadline: payload.eventDeadline,
      requiresPayment: payload.requiresPayment,
      maxParticipants: payload.maxParticipants,
      currentParticipants: payload.currentParticipants || 0,
      eventParticipants: payload.eventParticipants,
    };
    try {
      const created = await createNews({ ...optimistic, isEvent: true });
      setEvents((prev) => [created, ...prev]);
      toast.success('Мероприятие создано');
      void refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать мероприятие');
    }
  };

  const updateEvent = async (id: string, payload: Partial<News>) => {
    try {
      const updated = await updateNews(id, { ...payload, isEvent: true });
      setEvents((prev) => prev.map((item) => (item.id === id ? updated : item)));
      toast.success('Мероприятие обновлено');
      void refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить мероприятие');
    }
  };

  const removeEvent = async (id: string) => {
    if (!window.confirm('Удалить мероприятие?')) {
      return;
    }
    try {
      await deleteNews(id);
      setEvents((prev) => prev.filter((item) => item.id !== id));
      toast.success('Мероприятие удалено');
      void refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить мероприятие');
    }
  };

  if (isLoading) {
    return <div className="text-[#133C2A]/60">Загрузка мероприятий...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A]">Мероприятия</h1>
          <p className="text-[#133C2A]/60">Публикации, дедлайны и участие в событиях</p>
        </div>
        <Button variant="outline" className="rounded-2xl md:w-auto" onClick={() => void refresh(true)} disabled={isRefreshing}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {isRefreshing ? 'Обновляем...' : 'Обновить'}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-4"><p className="text-xs text-[#133C2A]/60">Всего</p><p className="text-xl text-[#133C2A] md:text-2xl">{stats.total}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-4"><p className="text-xs text-[#133C2A]/60">Опубликовано</p><p className="text-xl text-[#133C2A] md:text-2xl">{stats.published}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-4"><p className="text-xs text-[#133C2A]/60">Черновики</p><p className="text-xl text-[#133C2A] md:text-2xl">{stats.drafts}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-4"><p className="text-xs text-[#133C2A]/60">Предстоят</p><p className="text-xl text-[#133C2A] md:text-2xl">{stats.upcoming}</p></CardContent></Card>
      </div>

      <EventsManagement
        events={events}
        onCreate={(payload) => void createEvent(payload)}
        onUpdate={(id, payload) => void updateEvent(id, payload)}
        onDelete={(id) => void removeEvent(id)}
      />

      <div className="text-xs text-[#133C2A]/50 flex items-center gap-2">
        <CalendarClock className="w-3.5 h-3.5" />
        Синхронизация после каждого изменения выполняется автоматически
        <CalendarCheck className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}
