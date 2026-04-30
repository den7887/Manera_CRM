import { useEffect, useState } from 'react';
import { News } from '../../types';
import { createNews, deleteNews, loadNews, updateNews } from '../../lib/backendApi';
import { EventsManagement } from '../admin/EventsManagement';
import { toast } from 'sonner';

export function OwnerEventsPanel() {
  const [events, setEvents] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const allNews = await loadNews();
      setEvents(allNews.filter((item) => item.isEvent));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить мероприятия');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const createEvent = async (payload: Partial<News>) => {
    const optimistic: News = {
      id: `event-${Date.now()}`,
      title: payload.title || 'Новое мероприятие',
      content: payload.content || '',
      date: new Date(),
      image: payload.image,
      published: payload.published ?? false,
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать мероприятие');
    }
  };

  const updateEvent = async (id: string, payload: Partial<News>) => {
    try {
      const updated = await updateNews(id, { ...payload, isEvent: true });
      setEvents((prev) => prev.map((item) => (item.id === id ? updated : item)));
      toast.success('Мероприятие обновлено');
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить мероприятие');
    }
  };

  if (isLoading) {
    return <div className="text-[#133C2A]/60">Загрузка мероприятий...</div>;
  }

  return (
    <EventsManagement
      events={events}
      onCreate={(payload) => void createEvent(payload)}
      onUpdate={(id, payload) => void updateEvent(id, payload)}
      onDelete={(id) => void removeEvent(id)}
    />
  );
}

