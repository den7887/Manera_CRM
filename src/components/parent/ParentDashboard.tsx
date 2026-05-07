import { useMemo, useState } from 'react';
import { User, Child, Event, Payment, News, Notification, Document as StudioDocument } from '../../types';
import { ParentAccessInfo } from '../../lib/backendApi';
import { ParentHome } from './ParentHome';
import { ParentChildren } from './ParentChildren';
import { ParentSchedule } from './ParentSchedule';
import { ParentPayments } from './ParentPayments';
import { ParentEvents } from './ParentEvents';
import { ParentProfile } from './ParentProfile';
import { ParentNotifications } from './ParentNotifications';
import { ParentCommunication } from './ParentCommunication';
import { ParentDocuments } from './ParentDocuments';
import { MobileNav } from '../layout/MobileNav';
import { DesktopSidebar } from '../layout/DesktopSidebar';
import {
  AlertCircle,
  Bell,
  Calendar,
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  LockKeyhole,
  Megaphone,
  MessageSquare,
  UserCircle,
  Users,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface ParentDashboardProps {
  user: User;
  children: Child[];
  events: Event[];
  payments: Payment[];
  newsEvents: News[];
  documents: StudioDocument[];
  onLogout: () => void;
  notifications?: Notification[];
  accessInfo?: ParentAccessInfo | null;
  onPayOnline: (paymentId: string) => Promise<void>;
  onConfirmManualPayment: (paymentId: string) => Promise<void>;
  onMarkNotificationRead: (notificationId: string) => Promise<void> | void;
  onMarkAllNotificationsRead: () => Promise<void> | void;
}

const pageMap = {
  home: {
    title: 'Главная',
    description: 'Самое важное по ребенку, занятиям и оплате',
    icon: Home,
  },
  children: {
    title: 'Мои дети',
    description: 'Профили детей и остаток занятий',
    icon: Users,
  },
  schedule: {
    title: 'Расписание',
    description: 'Когда и где проходят занятия',
    icon: Calendar,
  },
  payments: {
    title: 'Оплата',
    description: 'Что оплачено и что нужно оплатить',
    icon: CreditCard,
  },
  events: {
    title: 'События',
    description: 'Конкурсы, выступления и объявления студии',
    icon: Megaphone,
  },
  documents: {
    title: 'Документы',
    description: 'Договоры, памятки и файлы студии',
    icon: FileText,
  },
  notifications: {
    title: 'Уведомления',
    description: 'Важные сообщения от студии',
    icon: Bell,
  },
  communication: {
    title: 'Чат со студией',
    description: 'Переписка с сотрудниками студии',
    icon: MessageSquare,
  },
  profile: {
    title: 'Профиль',
    description: 'Личные данные и настройки входа',
    icon: UserCircle,
  },
} satisfies Record<string, { title: string; description: string; icon: any }>;

type ParentPage = keyof typeof pageMap;

function normalizeParentPage(page: string): ParentPage {
  return Object.prototype.hasOwnProperty.call(pageMap, page) ? (page as ParentPage) : 'home';
}

function readParentPageFromUrl(): ParentPage {
  if (typeof window === 'undefined') {
    return 'home';
  }
  const params = new URLSearchParams(window.location.search);
  return normalizeParentPage(params.get('parentPage') || params.get('page') || 'home');
}

function writeParentPageToUrl(page: ParentPage) {
  if (typeof window === 'undefined') {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  params.set('parentPage', page);
  params.delete('ownerPage');
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', nextUrl);
}

export function ParentDashboard({
  user,
  children,
  events,
  payments,
  newsEvents,
  documents,
  onLogout,
  notifications = [],
  accessInfo,
  onPayOnline,
  onConfirmManualPayment,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}: ParentDashboardProps) {
  const [currentPage, setCurrentPage] = useState<ParentPage>(() => readParentPageFromUrl());
  const pageInfo = pageMap[currentPage] || pageMap.home;
  const PageIcon = pageInfo.icon;

  const isAccessRestricted = accessInfo ? !accessInfo.canUseDashboard : false;

  const navigate = (page: string) => {
    const normalizedPage = normalizeParentPage(page);
    setCurrentPage(normalizedPage);
    writeParentPageToUrl(normalizedPage);
  };

  const quickStats = useMemo(() => {
    const upcomingClasses = events.filter((item) => new Date(item.date) >= new Date()).length;
    const pendingPayments = payments.filter((item) =>
      ['pending', 'waiting_confirmation', 'overdue', 'unpaid', 'failed'].includes(item.status),
    );
    const pendingAmount = pendingPayments.reduce((sum, item) => sum + item.amount, 0);
    const unreadNotifications = notifications.filter((item) => !item.read).length;
    const childrenNeedingRenewal = children.filter((item) => item.totalClasses > 0 && item.remainingClasses <= 2).length;
    return {
      upcomingClasses,
      pendingAmount,
      unreadNotifications,
      childrenCount: children.length,
      childrenNeedingRenewal,
    };
  }, [events, payments, notifications, children]);

  const renderRestricted = () => (
    <Card className="border-none soft-shadow max-w-3xl">
      <CardContent className="p-6 md:p-8 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center shrink-0">
            <LockKeyhole className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <h2 className="text-xl text-[#133C2A]">Доступ ограничен до оплаты</h2>
            <p className="text-[#133C2A]/70 text-sm mt-1">
              После подтверждения оплаты кабинет откроется автоматически.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#133C2A]/10 bg-[#F8F4E3] p-4">
            <p className="text-xs text-[#133C2A]/60">Статус аккаунта</p>
            <p className="text-[#133C2A] mt-1">{accessInfo?.accountStatus || 'payment_pending'}</p>
          </div>
          <div className="rounded-xl border border-[#133C2A]/10 bg-[#F8F4E3] p-4">
            <p className="text-xs text-[#133C2A]/60">Неоплаченных счетов</p>
            <p className="text-[#133C2A] mt-1">{accessInfo?.pendingPaymentsCount ?? 0}</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => navigate('payments')}
            className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
          >
            Перейти к оплате
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('profile')}
            className="rounded-xl border-[#133C2A]/20 hover:bg-[#133C2A]/5"
          >
            Профиль
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderPage = () => {
    if (isAccessRestricted && !['payments', 'profile'].includes(currentPage)) {
      return renderRestricted();
    }

    switch (currentPage) {
      case 'home':
        return (
          <ParentHome
            user={user}
            children={children}
            events={events}
            payments={payments}
            newsEvents={newsEvents}
            onNavigate={navigate}
          />
        );
      case 'children':
        return <ParentChildren children={children} onNavigate={navigate} />;
      case 'schedule':
        return <ParentSchedule events={events} children={children} />;
      case 'payments':
        return (
          <ParentPayments
            payments={payments}
            children={children}
            onPayOnline={onPayOnline}
            onConfirmManualPayment={onConfirmManualPayment}
            accessInfo={accessInfo}
          />
        );
      case 'events':
        return <ParentEvents events={newsEvents} userId={user.id} />;
      case 'documents':
        return <ParentDocuments documents={documents} currentUserId={user.id} />;
      case 'notifications':
        return (
          <ParentNotifications
            notifications={notifications}
            onMarkRead={onMarkNotificationRead}
            onMarkAllRead={onMarkAllNotificationsRead}
          />
        );
      case 'communication':
        return <ParentCommunication />;
      case 'profile':
        return <ParentProfile user={user} onLogout={onLogout} />;
      default:
        return (
          <ParentHome
            user={user}
            children={children}
            events={events}
            payments={payments}
            newsEvents={newsEvents}
            onNavigate={navigate}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#f7f1df_0%,#f8f4e3_45%,#f2ecdb_100%)]">
      <DesktopSidebar
        currentPage={currentPage}
        onNavigate={navigate}
        role="parent"
        user={user}
        onLogout={onLogout}
      />

      <main className="md:pl-24 mobile-safe-bottom md:pb-8">
        <div className="sticky top-0 z-20 border-b border-[#133C2A]/10 bg-[#F8F4E3]/92 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-3 md:px-7 py-3 md:py-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-[#133C2A]/60 mb-2">
              <Home className="w-3.5 h-3.5" />
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[#133C2A]">{pageInfo.title}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center shrink-0">
                  <PageIcon className="w-[18px] h-[18px] md:w-5 md:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-[#133C2A] text-xl md:text-2xl truncate">{pageInfo.title}</h1>
                  <p className="hidden sm:block text-xs md:text-sm text-[#133C2A]/60 truncate">{pageInfo.description}</p>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="rounded-full border-[#133C2A]/20 text-[#133C2A]">
                  Детей: {quickStats.childrenCount}
                </Badge>
                <Badge variant="outline" className="rounded-full border-[#133C2A]/20 text-[#133C2A]">
                  Занятий: {quickStats.upcomingClasses}
                </Badge>
                {quickStats.unreadNotifications > 0 && (
                  <Badge className="rounded-full bg-[#D14343] text-white">
                    Новых: {quickStats.unreadNotifications}
                  </Badge>
                )}
                {quickStats.childrenNeedingRenewal > 0 && (
                  <Badge variant="outline" className="rounded-full border-[#D4AF37]/35 text-[#B8941F]">
                    Продлить: {quickStats.childrenNeedingRenewal}
                  </Badge>
                )}
              </div>
            </div>

            <div className="md:hidden mobile-scroll-x mt-3">
              <Badge variant="outline" className="rounded-full border-[#133C2A]/20 text-[#133C2A]">
                Детей: {quickStats.childrenCount}
              </Badge>
              <Badge variant="outline" className="rounded-full border-[#133C2A]/20 text-[#133C2A]">
                Занятий: {quickStats.upcomingClasses}
              </Badge>
              {quickStats.unreadNotifications > 0 && (
                <Badge className="rounded-full bg-[#D14343] text-white">
                  Новых: {quickStats.unreadNotifications}
                </Badge>
              )}
              {quickStats.childrenNeedingRenewal > 0 && (
                <Badge variant="outline" className="rounded-full border-[#D4AF37]/35 text-[#B8941F]">
                  Продлить: {quickStats.childrenNeedingRenewal}
                </Badge>
              )}
            </div>

            {currentPage === 'home' && quickStats.childrenNeedingRenewal > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-[#D14343]/8 border border-[#D14343]/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-[#D14343] shrink-0" />
                  <p className="text-sm text-[#133C2A] sm:truncate">
                    У части абонементов заканчиваются занятия. Проверьте блок оплаты на главной.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate('payments')}
                  className="rounded-lg bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 shrink-0"
                >
                  К оплате
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-3 md:px-7 py-4 md:py-5 space-y-4">
          {renderPage()}
        </div>
      </main>

      <MobileNav currentPage={currentPage} onNavigate={navigate} role="parent" />
    </div>
  );
}
