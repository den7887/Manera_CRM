import { useState } from 'react';
import { User, Child, Event, Payment, News, Notification } from '../../types';
import { ParentHome } from './ParentHome';
import { ParentChildren } from './ParentChildren';
import { ParentSchedule } from './ParentSchedule';
import { ParentPayments } from './ParentPayments';
import { ParentEvents } from './ParentEvents';
import { ParentProfile } from './ParentProfile';
import { ParentNotifications } from './ParentNotifications';
import { MobileNav } from '../layout/MobileNav';
import { DesktopSidebar } from '../layout/DesktopSidebar';
import { ChevronRight, Home, Users, Calendar, CreditCard, Megaphone, Bell, UserCircle, AlertCircle, Package } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface ParentDashboardProps {
  user: User;
  children: Child[];
  events: Event[];
  payments: Payment[];
  newsEvents: News[];
  onLogout: () => void;
  notifications?: Notification[];
}

export function ParentDashboard({ user, children, events, payments, newsEvents, onLogout, notifications = [] }: ParentDashboardProps) {
  const [currentPage, setCurrentPage] = useState('home');

  // Вычисляем важные метрики для quick stats
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue');
  const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const childrenNeedingRenewal = children.filter(child => child.remainingClasses <= 2);
  const unreadNotifications = notifications.filter(n => !n.read).length;
  const upcomingClasses = events.filter(e => new Date(e.date) >= new Date()).length;

  const getPageInfo = (page: string) => {
    const pageMap: Record<string, { title: string; icon: any; description: string }> = {
      home: { title: 'Главная', icon: Home, description: 'Обзор активности' },
      children: { title: 'Мои дети', icon: Users, description: 'Информация о детях' },
      schedule: { title: 'Расписание', icon: Calendar, description: 'Занятия и события' },
      payments: { title: 'Платежи', icon: CreditCard, description: 'Оплаты и абонементы' },
      events: { title: 'Мероприятия', icon: Megaphone, description: 'Новости и события' },
      notifications: { title: 'Уведомления', icon: Bell, description: 'Важные сообщения' },
      profile: { title: 'Профиль', icon: UserCircle, description: 'Личные данные' },
    };
    return pageMap[page] || pageMap.home;
  };

  const pageInfo = getPageInfo(currentPage);
  const PageIcon = pageInfo.icon;

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <ParentHome user={user} children={children} events={events} payments={payments} onNavigate={setCurrentPage} />;
      case 'children':
        return <ParentChildren children={children} />;
      case 'schedule':
        return <ParentSchedule events={events} children={children} />;
      case 'payments':
        return <ParentPayments payments={payments} />;
      case 'events':
        return <ParentEvents events={newsEvents} userId={user.id} />;
      case 'notifications':
        return <ParentNotifications notifications={notifications} />;
      case 'profile':
        return <ParentProfile user={user} onLogout={onLogout} />;
      default:
        return <ParentHome user={user} children={children} events={events} payments={payments} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F4E3] via-[#F8F4E3] to-[#133C2A]/5">
      <DesktopSidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        role="parent"
        user={user}
        onLogout={onLogout}
      />
      
      <main className="md:pl-24 pb-24 md:pb-8">
        {/* Page Header with Breadcrumbs and Quick Stats */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#F8F4E3] via-[#F8F4E3] to-white/80 backdrop-blur-md border-b border-[#133C2A]/10">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-[#133C2A]/60 mb-4">
              <Home className="w-4 h-4" />
              <ChevronRight className="w-4 h-4" />
              <span className="text-[#133C2A] font-medium">{pageInfo.title}</span>
            </div>

            {/* Page Title and Description */}
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center">
                  <PageIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl text-[#133C2A] mb-0">{pageInfo.title}</h1>
                  <p className="text-sm text-[#133C2A]/60">{pageInfo.description}</p>
                </div>
              </div>

              {/* Quick Action Buttons based on current page */}
              {currentPage === 'home' && totalPending > 0 && (
                <Button
                  onClick={() => setCurrentPage('payments')}
                  className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
                  size="sm"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Оплатить {totalPending.toLocaleString()} ₽
                </Button>
              )}
              {currentPage === 'payments' && (
                <Button
                  className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
                  size="sm"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Купить абонемент
                </Button>
              )}
            </div>

            {/* Quick Stats Bar - only on home page */}
            {currentPage === 'home' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => setCurrentPage('schedule')}
                  className="p-3 rounded-xl bg-white border border-[#133C2A]/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-xs text-[#133C2A]/60">Занятий</span>
                  </div>
                  <p className="text-xl text-[#133C2A] group-hover:text-[#D4AF37] transition-colors">
                    {upcomingClasses}
                  </p>
                </button>

                <button
                  onClick={() => setCurrentPage('payments')}
                  className="p-3 rounded-xl bg-white border border-[#133C2A]/10 hover:border-[#D14343] hover:bg-[#D14343]/5 transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-[#D14343]" />
                    <span className="text-xs text-[#133C2A]/60">К оплате</span>
                  </div>
                  <p className="text-xl text-[#133C2A] group-hover:text-[#D14343] transition-colors">
                    {totalPending.toLocaleString()} ₽
                  </p>
                </button>

                <button
                  onClick={() => setCurrentPage('children')}
                  className="p-3 rounded-xl bg-white border border-[#133C2A]/10 hover:border-[#1C8C64] hover:bg-[#1C8C64]/5 transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-[#1C8C64]" />
                    <span className="text-xs text-[#133C2A]/60">Детей</span>
                  </div>
                  <p className="text-xl text-[#133C2A] group-hover:text-[#1C8C64] transition-colors">
                    {children.length}
                  </p>
                </button>

                <button
                  onClick={() => setCurrentPage('notifications')}
                  className="p-3 rounded-xl bg-white border border-[#133C2A]/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all text-left group relative"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Bell className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-xs text-[#133C2A]/60">Уведомлений</span>
                  </div>
                  <p className="text-xl text-[#133C2A] group-hover:text-[#D4AF37] transition-colors">
                    {unreadNotifications}
                  </p>
                  {unreadNotifications > 0 && (
                    <Badge className="absolute -top-1 -right-1 bg-[#D14343] text-white border-0 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {unreadNotifications}
                    </Badge>
                  )}
                </button>
              </div>
            )}

            {/* Important Alerts */}
            {currentPage === 'home' && childrenNeedingRenewal.length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#133C2A]">
                    <span className="font-medium">Требует внимания:</span> У {childrenNeedingRenewal.length} {childrenNeedingRenewal.length === 1 ? 'ребёнка' : 'детей'} заканчиваются занятия
                  </p>
                </div>
                <Button
                  onClick={() => setCurrentPage('payments')}
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white flex-shrink-0"
                >
                  Продлить
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Page Content with Animation */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="animate-scale-in">
            {renderPage()}
          </div>
        </div>
      </main>

      <MobileNav currentPage={currentPage} onNavigate={setCurrentPage} role="parent" />
    </div>
  );
}
