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
import { OwnerEventsPanel } from './OwnerEventsPanel';
import { OwnerNewsPanel } from './OwnerNewsPanel';
import { OwnerDocumentsPanel } from './OwnerDocumentsPanel';
import { OwnerCommunicationPanel } from './OwnerCommunicationPanel';
import { OwnerParentsPanel } from './OwnerParentsPanel';
import { OwnerSettings } from './OwnerSettings';
import { LandingSettings } from './LandingSettings';
import { OwnerPricingPanel } from './OwnerPricingPanel';
import { OwnerPaymentsJournalPanel } from './OwnerPaymentsJournalPanel';

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
  | 'expenses'
  | 'automations'
  | 'communication'
  | 'news'
  | 'documents'
  | 'parents'
  | 'staff'
  | 'settings'
  | 'landing-settings'
  | 'leads'
  | 'pricing'
  | 'events-management'
  | 'profile'
  | 'clients'
  | 'payments'
  | 'journal';

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
  const [currentPage, setCurrentPage] = useState<OwnerPage>('home');

  const totalStudents = groups.reduce((sum, group) => sum + group.studentCount, 0);
  const totalTeachers = employees.filter((item) => item.role === 'teacher').length;

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
          onNavigate={(page) => setCurrentPage((page as OwnerPage) || 'home')}
        />
      );
    }
    if (currentPage === 'profile') {
      return <OwnerProfile user={user} onLogout={onLogout} />;
    }
    if (currentPage === 'clients') {
      return <OwnerClientsPanel groups={groups} />;
    }
    if (currentPage === 'analytics') {
      return <OwnerAnalyticsPanel />;
    }
    if (currentPage === 'team' || currentPage === 'staff') {
      return <OwnerTeamPanel />;
    }
    if (currentPage === 'groups') {
      return <OwnerGroupsPanel />;
    }
    if (currentPage === 'tasks') {
      return <OwnerTasksPanel />;
    }
    if (currentPage === 'finance') {
      return <OwnerFinancePanel />;
    }
    if (currentPage === 'expenses') {
      return <OwnerFinancePanel />;
    }
    if (currentPage === 'settings') {
      return (
        <OwnerSettings
          onNavigateToAutomations={() => setCurrentPage('automations')}
          onNavigateToLanding={() => setCurrentPage('landing-settings')}
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
    if (currentPage === 'news') {
      return <OwnerNewsPanel />;
    }
    if (currentPage === 'documents') {
      return <OwnerDocumentsPanel />;
    }
    if (currentPage === 'parents') {
      return <OwnerParentsPanel />;
    }
    if (currentPage === 'leads') {
      return <OwnerClientsPanel groups={groups} />;
    }
    if (currentPage === 'pricing') {
      return <OwnerPricingPanel />;
    }
    if (currentPage === 'events-management') {
      return <OwnerEventsPanel />;
    }
    if (currentPage === 'payments' || currentPage === 'journal') {
      return <OwnerPaymentsJournalPanel />;
    }
    return renderStub('Раздел');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F4E3] via-[#F8F4E3] to-[#133C2A]/5">
      <DesktopSidebar
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage((page as OwnerPage) || 'home')}
        role="owner"
        user={user}
        onLogout={onLogout}
      />

      <main className="md:pl-24 pb-24 md:pb-8">
        <div className="p-4 md:p-8 space-y-6">{renderPage()}</div>
      </main>

      <MobileNav
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage((page as OwnerPage) || 'home')}
        role="owner"
      />
    </div>
  );
}
