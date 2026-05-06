import { AlertCircle, Bell, Calendar, CreditCard, ArrowRight, Clock, Wallet } from 'lucide-react';
import { User, Child, Event, Payment, News } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface ParentHomeProps {
  user: User;
  children: Child[];
  events: Event[];
  payments: Payment[];
  newsEvents: News[];
  onNavigate: (page: string) => void;
}

export function ParentHome({ user, children, events, payments, newsEvents, onNavigate }: ParentHomeProps) {
  const upcomingEvents = events
    .filter((item) => new Date(item.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const pendingPayments = payments.filter((item) =>
    ['pending', 'waiting_confirmation', 'overdue', 'unpaid', 'failed'].includes(item.status),
  );
  const pendingAmount = pendingPayments.reduce((sum, item) => sum + item.amount, 0);
  const childrenNeedingRenewal = children.filter((child) => child.totalClasses > 0 && child.remainingClasses <= 2);
  const publishedNews = newsEvents.filter((item) => item.published).slice(0, 3);
  const primaryChild = children[0];
  const nextEvent = upcomingEvents[0];
  const latestNews = publishedNews[0];

  return (
    <div className="space-y-4 animate-scale-in">
      <Card className="border-none soft-shadow overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" />
        <CardContent className="p-5 md:p-6">
          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div className="min-w-0">
              <p className="text-sm text-[#133C2A]/58">Здравствуйте, {user.name.split(' ')[0]}</p>
              <h2 className="mt-1 text-2xl leading-tight text-[#133C2A]">
                {primaryChild ? primaryChild.name : 'Ребёнок пока не добавлен'}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-[#F8F4E3] p-3">
                  <p className="text-xs text-[#133C2A]/50">Следующее занятие</p>
                  <p className="mt-1 text-sm text-[#133C2A]">
                    {nextEvent
                      ? `${new Date(nextEvent.date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}, ${nextEvent.startTime}`
                      : 'Не запланировано'}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F8F4E3] p-3">
                  <p className="text-xs text-[#133C2A]/50">Осталось занятий</p>
                  <p className="mt-1 text-sm text-[#133C2A]">
                    {primaryChild && primaryChild.totalClasses > 0
                      ? `${primaryChild.remainingClasses} из ${primaryChild.totalClasses}`
                      : 'Без лимита'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#133C2A]/10 bg-[#fbf7e8] p-4">
              {pendingPayments.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-[#D14343]">К оплате</p>
                      <p className="mt-1 text-2xl text-[#133C2A]">{pendingAmount.toLocaleString('ru-RU')} ₽</p>
                    </div>
                    <Badge className="rounded-full bg-[#D14343] text-white hover:bg-[#D14343]">
                      {pendingPayments.length} счет
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    className="w-full rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
                    onClick={() => onNavigate('payments')}
                  >
                    Оплатить
                  </Button>
                </div>
              ) : latestNews ? (
                <button
                  type="button"
                  onClick={() => onNavigate('events')}
                  className="block w-full text-left"
                >
                  <p className="text-sm text-[#133C2A]/55">Последнее сообщение</p>
                  <p className="mt-1 line-clamp-2 text-[#133C2A]">{latestNews.title}</p>
                  <p className="mt-2 text-sm text-[#D4AF37]">Открыть</p>
                </button>
              ) : (
                <div>
                  <p className="text-sm text-[#133C2A]/55">Состояние</p>
                  <p className="mt-1 text-[#133C2A]">Срочных действий нет</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {childrenNeedingRenewal.length > 0 && (
        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-[#133C2A] flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#D14343]" />
                  Нужна оплата
                </p>
                <p className="text-sm text-[#133C2A]/70 mt-1">
                  У следующих учеников заканчиваются занятия:
                </p>
                <div className="mt-2 space-y-1.5">
                  {childrenNeedingRenewal.slice(0, 3).map((child) => (
                    <div key={child.id} className="text-sm text-[#133C2A]/75">
                      {child.name} • остаток: {Math.max(child.remainingClasses, 0)} из {child.totalClasses}
                    </div>
                  ))}
                  {childrenNeedingRenewal.length > 3 && (
                    <div className="text-xs text-[#133C2A]/60">
                      И еще: {childrenNeedingRenewal.length - 3}
                    </div>
                  )}
                </div>
                <p className="text-sm text-[#133C2A] mt-2">
                  {pendingPayments.length > 0
                    ? `К оплате: ${pendingAmount.toLocaleString('ru-RU')} ₽`
                    : 'Сумма к оплате будет показана после выставления счета.'}
                </p>
              </div>
              <Button
                size="sm"
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
                onClick={() => onNavigate('payments')}
              >
                Продлить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-4">
        <Card className="border-none soft-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#D4AF37]" />
                Ближайшие занятия
              </CardTitle>
              <Button variant="ghost" size="sm" className="rounded-lg text-[#133C2A]/70" onClick={() => onNavigate('schedule')}>
                Все
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-[#133C2A]/60 py-4">В расписании пока нет будущих занятий.</p>
            ) : (
              upcomingEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-[#133C2A]/10 p-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[#133C2A] min-w-0">{event.groupName}</p>
                    <Badge variant="outline" className="rounded-full border-[#133C2A]/20 text-[#133C2A]">
                      {new Date(event.date).toLocaleDateString('ru-RU')}
                    </Badge>
                  </div>
                  <p className="text-sm text-[#133C2A]/65 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {event.startTime} - {event.endTime} • {event.teacherName}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {(childrenNeedingRenewal.length > 0 || pendingPayments.length > 0) && (
            <Card className="border-none soft-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#133C2A] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#D4AF37]" />
                  Оплаты
                </CardTitle>
              </CardHeader>
              <CardContent>
                {childrenNeedingRenewal.length > 0 && pendingPayments.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-[#133C2A]/70">
                      Ожидает оплаты: {pendingPayments.length} • {pendingAmount.toLocaleString('ru-RU')} ₽
                    </p>
                    <Button
                      size="sm"
                      className="w-full rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
                      onClick={() => onNavigate('payments')}
                    >
                      Перейти к оплате
                    </Button>
                  </div>
                ) : pendingPayments.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-[#133C2A]/70">
                      Есть счета к оплате: {pendingPayments.length} • {pendingAmount.toLocaleString('ru-RU')} ₽
                    </p>
                    <Button
                      size="sm"
                      className="w-full rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
                      onClick={() => onNavigate('payments')}
                    >
                      Перейти к оплате
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-[#133C2A]/70">
                    Продление скоро понадобится. Счета пока не выставлены.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-none soft-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#D4AF37]" />
                Новости
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {publishedNews.length === 0 ? (
                <p className="text-sm text-[#133C2A]/60">Публикаций пока нет.</p>
              ) : (
                publishedNews.map((news) => (
                  <div key={news.id} className="rounded-xl border border-[#133C2A]/10 p-3 bg-white">
                    <p className="text-sm text-[#133C2A]">{news.title}</p>
                    <p className="text-xs text-[#133C2A]/60 mt-1 line-clamp-2">{news.content}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
