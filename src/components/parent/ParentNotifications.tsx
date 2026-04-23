import { useState } from 'react';
import { Bell, Calendar, CreditCard, AlertCircle, Info, CheckCircle2, ChevronRight } from 'lucide-react';
import { Notification } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface ParentNotificationsProps {
  notifications: Notification[];
}

export function ParentNotifications({ notifications }: ParentNotificationsProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Фильтруем только уведомления для родителей
  const parentNotifications = notifications.filter(n => n.forRoles.includes('parent'));

  // В реальном приложении здесь будет состояние прочитанности из базы данных
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const markAsRead = (id: string) => {
    setReadIds(prev => new Set([...prev, id]));
  };

  const markAllAsRead = () => {
    setReadIds(new Set(parentNotifications.map(n => n.id)));
  };

  const filteredNotifications = filter === 'unread'
    ? parentNotifications.filter(n => !readIds.has(n.id))
    : parentNotifications;

  const unreadCount = parentNotifications.filter(n => !readIds.has(n.id)).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'trial_class':
        return Calendar;
      case 'payment':
        return CreditCard;
      case 'attendance':
        return CheckCircle2;
      case 'general':
      default:
        return Bell;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-[#D14343]/10 border-[#D14343]/20 text-[#D14343]';
      case 'medium':
        return 'bg-[#D4AF37]/10 border-[#D4AF37]/20 text-[#D4AF37]';
      case 'low':
        return 'bg-[#133C2A]/10 border-[#133C2A]/20 text-[#133C2A]';
      default:
        return 'bg-[#133C2A]/10 border-[#133C2A]/20 text-[#133C2A]';
    }
  };

  const getPriorityLabel = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'Высокий';
      case 'medium':
        return 'Средний';
      case 'low':
        return 'Низкий';
      default:
        return '';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes < 1 ? 'Только что' : `${minutes} мин назад`;
    }
    if (hours < 24) {
      return `${hours} ч назад`;
    }
    if (days < 7) {
      return `${days} д назад`;
    }
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-scale-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Уведомления</h1>
          <p className="text-[#133C2A]/60">
            {unreadCount > 0 ? `У вас ${unreadCount} непрочитанных уведомлений` : 'Все уведомления прочитаны'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={markAllAsRead}
            variant="outline"
            className="rounded-xl border-[#133C2A]/20 hover:bg-[#133C2A]/5"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Прочитать все
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
        <TabsList className="grid w-full grid-cols-2 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg">
            Все ({parentNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread" className="rounded-lg">
            Непрочитанные ({unreadCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4 mt-6">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const isUnread = !readIds.has(notification.id);

              return (
                <Card
                  key={notification.id}
                  className={`border-none soft-shadow hover-lift cursor-pointer transition-all ${
                    isUnread ? 'bg-[#D4AF37]/5 border-l-4 border-l-[#D4AF37]' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isUnread
                            ? 'bg-gradient-to-br from-[#133C2A] to-[#D4AF37]'
                            : 'bg-[#133C2A]/10'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isUnread ? 'text-white' : 'text-[#133C2A]/60'}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`${isUnread ? 'text-[#133C2A]' : 'text-[#133C2A]/80'}`}>
                              {notification.title}
                            </h3>
                            {isUnread && (
                              <Badge className="bg-[#D4AF37] text-white text-xs px-2 py-0.5">
                                Новое
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-[#133C2A]/60 whitespace-nowrap">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>

                        <p className={`text-sm mb-2 ${isUnread ? 'text-[#133C2A]' : 'text-[#133C2A]/60'}`}>
                          {notification.message}
                        </p>

                        {notification.additionalInfo && (
                          <p className="text-sm text-[#133C2A]/60 mb-3 whitespace-pre-line">
                            {notification.additionalInfo}
                          </p>
                        )}

                        <div className="flex items-center gap-2">
                          <Badge className={`${getPriorityColor(notification.priority)} text-xs px-2 py-1`}>
                            {getPriorityLabel(notification.priority)}
                          </Badge>

                          {notification.highlightedData && (
                            <div className="flex items-center gap-2 text-xs text-[#133C2A]/60">
                              {notification.highlightedData.parentName && (
                                <span>👤 {notification.highlightedData.parentName}</span>
                              )}
                              {notification.highlightedData.parentPhone && (
                                <span>📞 {notification.highlightedData.parentPhone}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {isUnread && (
                        <ChevronRight className="w-5 h-5 text-[#D4AF37] flex-shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="border-none soft-shadow">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-[#133C2A]/5 flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-10 h-10 text-[#133C2A]/20" />
                </div>
                <h3 className="text-[#133C2A] mb-2">Нет уведомлений</h3>
                <p className="text-[#133C2A]/60">
                  {filter === 'unread'
                    ? 'У вас нет непрочитанных уведомлений'
                    : 'Здесь будут отображаться все уведомления о мероприятиях, новостях и событиях'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
