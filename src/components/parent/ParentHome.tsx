import { Calendar, Clock, CreditCard, TrendingUp, Bell, AlertCircle } from 'lucide-react';
import { User, Child, Event, Payment } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { mockNews } from '../../data/mockData';

interface ParentHomeProps {
  user: User;
  children: Child[];
  events: Event[];
  payments: Payment[];
  onNavigate: (page: string) => void;
}

export function ParentHome({ user, children, events, payments, onNavigate }: ParentHomeProps) {
  const upcomingEvents = events
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue');
  
  // Проверка детей с остатком ≤2 занятий
  const childrenNeedingRenewal = children.filter(child => child.remainingClasses <= 2);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="animate-scale-in">
        <h1 className="text-[#133C2A] mb-2">
          Здравствуйте, {user.name.split(' ')[0]}! 👋
        </h1>
        <p className="text-[#133C2A]/60">Добро пожаловать в личный кабинет студии Manera</p>
      </div>

      {/* Payment Reminder Alert */}
      {childrenNeedingRenewal.length > 0 && (
        <Alert className="border-[#D4AF37] bg-gradient-to-r from-[#D4AF37]/10 to-[#D4AF37]/5 animate-scale-in">
          <AlertCircle className="h-5 w-5 text-[#D4AF37]" />
          <AlertTitle className="text-[#133C2A]">
            Напоминание об оплате абонемента
          </AlertTitle>
          <AlertDescription className="text-[#133C2A]/70 space-y-3">
            <div>
              {childrenNeedingRenewal.length === 1 ? (
                <>
                  У <span className="font-medium text-[#133C2A]">{childrenNeedingRenewal[0].name}</span> осталось{' '}
                  <span className="font-medium text-[#D4AF37]">
                    {childrenNeedingRenewal[0].remainingClasses} {childrenNeedingRenewal[0].remainingClasses === 1 ? 'занятие' : 'занятия'}
                  </span>.
                  Рекомендуем продлить абонемент заранее, чтобы избежать перерыва в обучении.
                </>
              ) : (
                <>
                  У нескольких детей заканчиваются занятия:{' '}
                  {childrenNeedingRenewal.map((child, idx) => (
                    <span key={child.id}>
                      <span className="font-medium text-[#133C2A]">{child.name}</span>{' '}
                      (<span className="text-[#D4AF37]">{child.remainingClasses} {child.remainingClasses === 1 ? 'занятие' : 'занятия'}</span>)
                      {idx < childrenNeedingRenewal.length - 1 && ', '}
                    </span>
                  ))}
                  . Рекомендуем продлить абонементы заранее.
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => onNavigate('payments')}
                className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
                size="sm"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Оплатить абонемент
              </Button>
              <Button 
                onClick={() => onNavigate('payments')}
                variant="outline"
                className="rounded-xl border-[#133C2A]/20 hover:bg-[#133C2A]/5"
                size="sm"
              >
                Выбрать другой план
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Children Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {children.map((child) => {
          const needsRenewal = child.remainingClasses <= 2;
          const isUrgent = child.remainingClasses === 0;
          
          return (
            <Card 
              key={child.id} 
              className={`border-none soft-shadow hover-lift overflow-hidden ${
                needsRenewal ? 'ring-2 ring-[#D4AF37]' : ''
              }`}
            >
              <div className={`h-2 ${
                isUrgent 
                  ? 'bg-gradient-to-r from-[#D14343] to-[#D4AF37]'
                  : needsRenewal
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#D4AF37]/70'
                  : 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37]'
              }`} />
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 border-2 border-[#D4AF37]">
                    <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white text-xl">
                      {child.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-[#133C2A]">{child.name}</CardTitle>
                      {needsRenewal && (
                        <Bell className={`w-4 h-4 ${isUrgent ? 'text-[#D14343]' : 'text-[#D4AF37]'} animate-pulse`} />
                      )}
                    </div>
                    <p className="text-sm text-[#133C2A]/60">{child.age} лет • {child.groupName}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Subscription Status */}
                  <div className="p-3 rounded-xl bg-[#F8F4E3]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-[#133C2A]/60">Абонемент</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          isUrgent 
                            ? 'border-[#D14343] text-[#D14343] bg-[#D14343]/5'
                            : needsRenewal
                            ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10'
                            : 'border-[#1C8C64] text-[#1C8C64] bg-[#1C8C64]/5'
                        }`}
                      >
                        {isUrgent ? 'Закончился' : needsRenewal ? 'Заканчивается' : 'Активен'}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#133C2A]/70">Осталось занятий</span>
                      <span className={`font-medium ${
                        isUrgent 
                          ? 'text-[#D14343]'
                          : needsRenewal 
                          ? 'text-[#D4AF37]' 
                          : 'text-[#1C8C64]'
                      }`}>
                        {child.remainingClasses} из {child.totalClasses}
                      </span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#133C2A]/70">Прогресс</span>
                      <span className="text-[#D4AF37]">{child.progress}%</span>
                    </div>
                    <Progress value={child.progress} className="h-2" />
                  </div>

                  {/* Renew Button */}
                  {needsRenewal && (
                    <Button 
                      onClick={() => onNavigate('payments')}
                      className={`w-full rounded-xl ${
                        isUrgent
                          ? 'bg-gradient-to-r from-[#D14343] to-[#D4AF37] hover:opacity-90'
                          : 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90'
                      }`}
                      size="sm"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      {isUrgent ? 'Срочно продлить' : 'Продлить абонемент'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming Classes */}
        <Card className="lg:col-span-2 border-none soft-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[#133C2A] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#D4AF37]" />
              Ближайшие занятия
            </CardTitle>
            <Badge className="bg-[#D4AF37]/20 text-[#133C2A] border-[#D4AF37]/30">
              {upcomingEvents.length} занятий
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-[#F8F4E3] hover:bg-[#F8F4E3]/70 transition-smooth"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex flex-col items-center justify-center text-white">
                      <span className="text-xs">{new Date(event.date).toLocaleDateString('ru-RU', { month: 'short' })}</span>
                      <span className="text-xl">{new Date(event.date).getDate()}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[#133C2A]">{event.groupName}</h4>
                      <div className="flex items-center gap-3 text-sm text-[#133C2A]/60 mt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {event.startTime} - {event.endTime}
                        </div>
                        <span>•</span>
                        <span>{event.teacherName}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-[#133C2A]/60">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Нет запланированных занятий</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card className="border-none soft-shadow">
          <CardHeader>
            <CardTitle className="text-[#133C2A] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#D4AF37]" />
              Оплата
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingPayments.length > 0 ? (
              <>
                <div className="p-4 rounded-2xl bg-[#FADADD]/20 border border-[#D14343]/20">
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 text-[#D14343] mt-0.5" />
                    <div>
                      <p className="text-sm text-[#D14343]">Требуется оплата</p>
                      <p className="text-xs text-[#133C2A]/60 mt-1">
                        {pendingPayments.length} счетов ожидают оплаты
                      </p>
                    </div>
                  </div>
                </div>
                <Button className="w-full rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90">
                  Оплатить {pendingPayments.reduce((sum, p) => sum + p.amount, 0)} ₽
                </Button>
              </>
            ) : (
              <div className="p-4 rounded-2xl bg-[#1C8C64]/10 border border-[#1C8C64]/20">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-[#1C8C64] mt-0.5" />
                  <div>
                    <p className="text-sm text-[#1C8C64]">Все оплачено</p>
                    <p className="text-xs text-[#133C2A]/60 mt-1">У вас нет задолженностей</p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#133C2A]/10">
              <h4 className="text-sm text-[#133C2A] mb-3">История платежей</h4>
              <div className="space-y-2">
                {payments.slice(0, 3).map((payment) => (
                  <div key={payment.id} className="flex justify-between text-sm">
                    <span className="text-[#133C2A]/70">{payment.description}</span>
                    <span className="text-[#133C2A]">{payment.amount} ₽</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* News */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Новости студии</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {mockNews.filter(n => n.published).slice(0, 2).map((news) => (
              <div
                key={news.id}
                className="p-4 rounded-2xl bg-[#F8F4E3] hover:bg-[#F8F4E3]/70 transition-smooth"
              >
                <h4 className="text-[#133C2A] mb-2">{news.title}</h4>
                <p className="text-sm text-[#133C2A]/70 mb-2">{news.content}</p>
                <p className="text-xs text-[#133C2A]/50">
                  {new Date(news.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}