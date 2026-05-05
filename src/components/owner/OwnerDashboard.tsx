import { useState } from 'react';
import {
  Employee,
  Event,
  Expense,
  FinanceStats,
  Group,
  MonthlyData,
  Notification,
  Payment,
  Task,
  User,
} from '../../types';
import { DesktopSidebar } from '../layout/DesktopSidebar';
import { MobileNav } from '../layout/MobileNav';
import { FeatureInDevelopment } from '../FeatureInDevelopment';
import { OwnerHome } from './OwnerHome';
import { OwnerProfile } from './OwnerProfile';
import { OwnerClientsPanel } from './OwnerClientsPanel';
import { OwnerGroupsPanel } from './OwnerGroupsPanel';
import { OwnerTeamPanel } from './OwnerTeamPanel';
import { OwnerFinancePanel } from './OwnerFinancePanel';
import { OwnerAnalyticsPanel } from './OwnerAnalyticsPanel';
import { OwnerTasksPanel } from './OwnerTasksPanel';
import { OwnerAutomationsPanel } from './OwnerAutomationsPanel';
import { OwnerContentPanel } from './OwnerContentPanel';
import { OwnerDocumentsPanel } from './OwnerDocumentsPanel';
import { OwnerCommunicationPanel } from './OwnerCommunicationPanel';
import { OwnerSettings } from './OwnerSettings';
import { LandingSettings } from './LandingSettings';
import { OwnerPricingPanel } from './OwnerPricingPanel';
import { OwnerPaymentsNavigationContext } from './paymentsNavigation';

interface OwnerDashboardProps {
  user: User;
  onLogout: () => void;
  tasks: Task[];
  events: Event[];
  payments: Payment[];
  groups: Group[];
  employees: Employee[];
  stats: FinanceStats;
  monthlyData: MonthlyData[];
  expenses: Expense[];
  notifications: Notification[];
  automationCount: number;
}

type OwnerPage =
  | 'home'
  | 'analytics'
  | 'team'
  | 'groups'
  | 'tasks'
  | 'finance'
  | 'automations'
  | 'communication'
  | 'content'
  | 'documents'
  | 'settings'
  | 'landing-settings'
  | 'pricing'
  | 'profile'
  | 'clients';

const ownerPages = new Set<OwnerPage>([
  'home',
  'analytics',
  'team',
  'groups',
  'tasks',
  'finance',
  'automations',
  'communication',
  'content',
  'documents',
  'settings',
  'landing-settings',
  'pricing',
  'profile',
  'clients',
]);

function normalizeOwnerPage(page: string): OwnerPage {
  let normalized = page;
  if (normalized === 'staff') normalized = 'team';
  if (normalized === 'expenses') normalized = 'finance';
  if (normalized === 'leads') normalized = 'clients';
  if (normalized === 'parents') normalized = 'clients';
  if (normalized === 'journal' || normalized === 'payments') normalized = 'finance';
  if (normalized === 'news' || normalized === 'events-management') normalized = 'content';
  return ownerPages.has(normalized as OwnerPage) ? (normalized as OwnerPage) : 'home';
}

function readOwnerPageFromUrl(): OwnerPage {
  if (typeof window === 'undefined') {
    return 'home';
  }
  const params = new URLSearchParams(window.location.search);
  return normalizeOwnerPage(params.get('ownerPage') || params.get('page') || 'home');
}

function writeOwnerPageToUrl(page: OwnerPage) {
  if (typeof window === 'undefined') {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  params.set('ownerPage', page);
  params.delete('parentPage');
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', nextUrl);
}

export function OwnerDashboard({
  user,
  onLogout,
  tasks,
  events,
  payments,
  groups,
  employees,
  stats,
  monthlyData,
  expenses,
  notifications,
  automationCount,
}: OwnerDashboardProps) {
  const [currentPage, setCurrentPage] = useState<OwnerPage>(() => readOwnerPageFromUrl());
  const [paymentsNavigationContext, setPaymentsNavigationContext] = useState<OwnerPaymentsNavigationContext | null>(null);

  const totalStudents = groups.reduce((sum, group) => sum + group.studentCount, 0);
  const totalTeachers = employees.filter((item) => item.role === 'teacher').length;

  const openPayments = (context?: Omit<OwnerPaymentsNavigationContext, 'requestId'>) => {
    setPaymentsNavigationContext({
      requestId: Date.now(),
      ...(context || {}),
    });
    navigate('finance');
  };

  const navigate = (page: string) => {
    const normalizedPage = normalizeOwnerPage(page);
    setCurrentPage(normalizedPage);
    writeOwnerPageToUrl(normalizedPage);
  };

  const renderStub = (sectionName: string, description?: string) => (
    <FeatureInDevelopment sectionName={sectionName} roleLabel="Владелец" description={description} />
  );

  const renderPage = () => {
    if (currentPage === 'home') {
      return (
        <OwnerHome
          user={user}
          events={events}
          stats={stats}
          totalStudents={totalStudents}
          totalTeachers={totalTeachers}
          tasks={tasks}
          employees={employees}
          notifications={notifications}
          automationCount={automationCount}
          onNavigate={navigate}
        />
      );
    }
    if (currentPage === 'profile') {
      return <OwnerProfile user={user} onLogout={onLogout} />;
    }
    if (currentPage === 'clients') {
      return <OwnerClientsPanel groups={groups} onNavigatePayments={openPayments} />;
    }
    if (currentPage === 'analytics') {
      return <OwnerAnalyticsPanel />;
    }
    if (currentPage === 'team') {
      return <OwnerTeamPanel />;
    }
    if (currentPage === 'groups') {
      return <OwnerGroupsPanel />;
    }
    if (currentPage === 'tasks') {
      return <OwnerTasksPanel />;
    }
    if (currentPage === 'finance') {
      return (
        <OwnerFinancePanel
          paymentsNavigationContext={paymentsNavigationContext || undefined}
          onPaymentsNavigationContextApplied={() => setPaymentsNavigationContext(null)}
        />
      );
    }
    if (currentPage === 'settings') {
      return (
        <OwnerSettings
          onNavigateToAutomations={() => navigate('automations')}
          onNavigateToLanding={() => navigate('landing-settings')}
        />
      );
    }
    if (currentPage === 'landing-settings') {
      return <LandingSettings />;
    }
    if (currentPage === 'automations') {
      return <OwnerAutomationsPanel />;
    }
    if (currentPage === 'communication') {
      return <OwnerCommunicationPanel />;
    }
    if (currentPage === 'content') {
      return <OwnerContentPanel />;
    }
    if (currentPage === 'documents') {
      return <OwnerDocumentsPanel />;
    }
    if (currentPage === 'pricing') {
      return <OwnerPricingPanel />;
    }
    return renderStub('Раздел');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F4E3] via-[#F8F4E3] to-[#133C2A]/5">
      <DesktopSidebar
        currentPage={currentPage}
        onNavigate={navigate}
        role="owner"
        user={user}
        onLogout={onLogout}
      />

      <main className="md:pl-24 mobile-safe-bottom md:pb-8">
        <div className="px-3 py-4 md:p-8 space-y-4 md:space-y-6">
          {renderPage()}
        </div>
      </main>

      <MobileNav
        currentPage={currentPage}
        onNavigate={navigate}
        role="owner"
      />
    </div>
  );
}
