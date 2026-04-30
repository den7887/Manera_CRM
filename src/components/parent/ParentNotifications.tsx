import { useMemo, useState } from 'react';
import { Bell, Calendar, CheckCircle2, CreditCard } from 'lucide-react';
import { Notification } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

interface ParentNotificationsProps {
  notifications: Notification[];
  onMarkRead: (id: string) => Promise<void> | void;
  onMarkAllRead: () => Promise<void> | void;
}

export function ParentNotifications({ notifications, onMarkRead, onMarkAllRead }: ParentNotificationsProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const parentNotifications = useMemo(
    () => notifications.filter((item) => item.forRoles.includes('parent')),
    [notifications],
  );
  const unreadCount = parentNotifications.filter((item) => !item.read).length;
  const filtered = filter === 'unread' ? parentNotifications.filter((item) => !item.read) : parentNotifications;

  const iconByType: Record<string, any> = {
    payment: CreditCard,
    trial_class: Calendar,
    attendance: CheckCircle2,
    general: Bell,
  };

  const priorityClasses: Record<string, string> = {
    high: 'border-[#D14343]/30 bg-[#D14343]/8 text-[#D14343]',
    medium: 'border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#B8941F]',
    low: 'border-[#133C2A]/20 bg-[#133C2A]/8 text-[#133C2A]',
  };

  return (
    <div className="space-y-4 animate-scale-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[#133C2A] text-xl">Уведомления</h2>
          <p className="text-sm text-[#133C2A]/60">События по оплатам, занятиям и изменениям кабинета</p>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" className="rounded-xl border-[#133C2A]/20" onClick={() => void onMarkAllRead()}>
            Прочитать все ({unreadCount})
          </Button>
        )}
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as 'all' | 'unread')}>
        <TabsList className="grid grid-cols-2 max-w-sm bg-white border border-[#133C2A]/10 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg">Все ({parentNotifications.length})</TabsTrigger>
          <TabsTrigger value="unread" className="rounded-lg">Новые ({unreadCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card className="border-none soft-shadow">
          <CardContent className="p-10 text-center text-[#133C2A]/60">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>{filter === 'unread' ? 'Новых уведомлений нет.' : 'Уведомлений пока нет.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const Icon = iconByType[item.type] || Bell;
            return (
              <button
                key={item.id}
                onClick={() => void onMarkRead(item.id)}
                className={`w-full text-left rounded-xl border p-3 bg-white hover:bg-[#133C2A]/[0.03] transition ${
                  item.read ? 'border-[#133C2A]/10' : 'border-[#D4AF37]/35'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.read ? 'bg-[#133C2A]/10' : 'bg-[#D4AF37]/15'}`}>
                    <Icon className={`w-4 h-4 ${item.read ? 'text-[#133C2A]/70' : 'text-[#B8941F]'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[#133C2A] truncate">{item.title}</p>
                      <span className="text-[11px] text-[#133C2A]/55 shrink-0">
                        {item.createdAt.toLocaleDateString('ru-RU')} {item.createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-[#133C2A]/70 mt-1 line-clamp-2">{item.message}</p>
                    {item.additionalInfo && <p className="text-xs text-[#133C2A]/55 mt-1 line-clamp-2">{item.additionalInfo}</p>}
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className={`rounded-full ${priorityClasses[item.priority] || priorityClasses.low}`}>
                        {item.priority}
                      </Badge>
                      {!item.read && <Badge className="rounded-full bg-[#D4AF37] text-white">Новое</Badge>}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
