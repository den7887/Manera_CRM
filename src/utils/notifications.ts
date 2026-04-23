import { Notification, News, UserRole } from '../types';

/**
 * Создает уведомление для родителей о новой новости
 */
export function createNewsNotification(news: News): Notification {
  return {
    id: `notif-news-${news.id}-${Date.now()}`,
    type: 'general',
    priority: 'medium',
    title: 'Новая публикация',
    message: news.title,
    additionalInfo: news.content.substring(0, 100) + '...',
    createdAt: new Date(),
    forRoles: ['parent'],
  };
}

/**
 * Создает уведомление для родителей о новом мероприятии
 */
export function createEventNotification(event: News): Notification {
  const eventTypeLabels = {
    competition: 'конкурс',
    concert: 'концерт',
    masterclass: 'мастер-класс',
    other: 'мероприятие'
  };

  const eventTypeLabel = event.eventType ? eventTypeLabels[event.eventType] : 'мероприятие';
  
  let message = `Новый ${eventTypeLabel}: ${event.title}`;
  let additionalInfo = event.content.substring(0, 100);

  if (event.eventDate) {
    const dateStr = event.eventDate.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    additionalInfo = `Дата: ${dateStr}. ${additionalInfo}`;
  }

  if (event.requiresPayment && event.eventFee) {
    additionalInfo += `\nВзнос: ${event.eventFee} ₽`;
  }

  if (event.eventDeadline) {
    const deadlineStr = event.eventDeadline.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long'
    });
    additionalInfo += `\nДедлайн регистрации: ${deadlineStr}`;
  }

  return {
    id: `notif-event-${event.id}-${Date.now()}`,
    type: 'general',
    priority: event.requiresPayment ? 'high' : 'medium',
    title: `Новое мероприятие`,
    message,
    additionalInfo,
    createdAt: new Date(),
    forRoles: ['parent'],
  };
}

/**
 * Создает уведомление для родителей об обновлении мероприятия
 */
export function createEventUpdateNotification(event: News): Notification {
  const eventTypeLabels = {
    competition: 'конкурс',
    concert: 'концерт',
    masterclass: 'мастер-класс',
    other: 'мероприятие'
  };

  const eventTypeLabel = event.eventType ? eventTypeLabels[event.eventType] : 'мероприятие';

  return {
    id: `notif-event-update-${event.id}-${Date.now()}`,
    type: 'general',
    priority: 'medium',
    title: 'Изменения в мероприятии',
    message: `Обновлен ${eventTypeLabel}: ${event.title}`,
    additionalInfo: 'Пожалуйста, проверьте актуальную информацию о мероприятии',
    createdAt: new Date(),
    forRoles: ['parent'],
  };
}
