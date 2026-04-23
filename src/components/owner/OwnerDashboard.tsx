import { useState } from 'react';
import { User, Group, Event, Employee, FinanceStats, MonthlyData, Payment, Task, AutomationRule, Child, Notification, Product, News, Expense } from '../../types';
import { OwnerHome } from './OwnerHome';
import { OwnerFinance } from './OwnerFinance';
import { OwnerTeam } from './OwnerTeam';
import { OwnerSettings } from './OwnerSettings';
import { LandingSettings } from './LandingSettings';
import { OwnerProfile } from './OwnerProfile';
import { OwnerTasks } from './OwnerTasks';
import { OwnerTasksMobile } from './OwnerTasksMobile';
import { Analytics } from './Analytics';
import { AdminStudents } from '../admin/AdminStudents';
import { AdminParents } from '../admin/AdminParents';
import { AdminLeads } from '../admin/AdminLeads';
import { AdminGroups } from '../admin/AdminGroups';
import { AdminSchedule } from '../admin/AdminSchedule';
import { AdminCommunication } from '../admin/AdminCommunication';
import { AdminAutomations } from '../admin/AdminAutomations';
import { PricingManagement } from '../admin/PricingManagement';
import { PricingForm } from '../admin/PricingForm';
import { EventsManagement } from '../admin/EventsManagement';
import { MobileNav } from '../layout/MobileNav';
import { DesktopSidebar } from '../layout/DesktopSidebar';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { Card, CardContent } from '../ui/card';
import { Monitor } from 'lucide-react';

interface OwnerDashboardProps {
  user: User;
  groups: Group[];
  events: Event[];
  employees: Employee[];
  stats: FinanceStats;
  monthlyData: MonthlyData[];
  payments: Payment[];
  expenses: Expense[];
  tasks: Task[];
  automationRules: AutomationRule[];
  children: Child[];
  products: Product[];
  newsEvents: News[]; // Добавляем мероприятия
  onLogout: () => void;
  notifications: Notification[];
  onCreateNewsEvent?: (newsEvent: Partial<News>) => void;
  onUpdateNewsEvent?: (id: string, updates: Partial<News>) => void;
  onDeleteNewsEvent?: (id: string) => void;
}

export function OwnerDashboard({ 
  user, 
  groups, 
  events, 
  employees,
  stats,
  monthlyData,
  payments,
  expenses,
  tasks,
  automationRules,
  children,
  products,
  newsEvents,
  onLogout,
  notifications,
  onCreateNewsEvent,
  onUpdateNewsEvent,
  onDeleteNewsEvent
}: OwnerDashboardProps) {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);

  const totalStudents = groups.reduce((sum, g) => sum + g.studentCount, 0);
  const totalTeachers = employees.filter(e => e.role === 'teacher').length;

  // Конвертация Employee[] в User[] для компонентов, которые ожидают User[]
  const employeesAsUsers: User[] = employees.map(emp => ({
    id: emp.id,
    name: emp.name,
    phone: emp.phone,
    email: emp.email,
    role: emp.role,
    avatar: emp.avatar,
  }));

  const isMobile = useIsMobile();

  // Компонент для блокировки тяжелых функций на мобильных
  const DesktopOnlyMessage = ({ feature }: { feature: string }) => (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="border-none soft-shadow max-w-md">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center mx-auto mb-6">
            <Monitor className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-[#133C2A] mb-3">Только для десктопа</h2>
          <p className="text-[#133C2A]/70 mb-6">
            {feature} доступны только на компьютере для более удобной работы с настройками и деталями.
          </p>
          <p className="text-sm text-[#133C2A]/60">
            Пожалуйста, воспользуйтесь компьютером для доступа к этому разделу.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderPage = () => {
    // Блокировка тяжелых функций на мобильных (кроме задач - там есть мобильная версия)
    if (isMobile && currentPage === 'automations') {
      return <DesktopOnlyMessage feature="Автоматизации" />;
    }

    switch (currentPage) {
      case 'home':
        return (
          <OwnerHome 
            user={user} 
            events={events} 
            stats={stats}
            totalStudents={totalStudents}
            totalTeachers={totalTeachers}
            tasks={tasks}
            employees={employees}
            onNavigate={setCurrentPage}
            notifications={notifications}
          />
        );
      case 'finance':
        return <OwnerFinance stats={stats} monthlyData={monthlyData} payments={payments} expenses={expenses} />;
      case 'students':
        return <AdminStudents groups={groups} />;
      case 'parents':
        return <AdminParents groups={groups} />;
      case 'leads':
        return <AdminLeads />;
      case 'groups':
        return <AdminGroups groups={groups} />;
      case 'schedule':
        return <AdminSchedule events={events} groups={groups} />;
      case 'team':
        return <OwnerTeam employees={employees} />;
      case 'communication':
        return <AdminCommunication />;
      case 'settings':
        return <OwnerSettings 
          onNavigateToAutomations={() => setCurrentPage('automations')} 
          onNavigateToLanding={() => setCurrentPage('landing-settings')}
        />;
      case 'landing-settings':
        return <LandingSettings />;
      case 'profile':
        return <OwnerProfile user={user} onLogout={onLogout} />;
      case 'tasks':
        return isMobile 
          ? <OwnerTasksMobile 
              tasks={tasks} 
              employees={employees.map(e => ({ id: e.id, name: e.name }))} 
            /> 
          : <OwnerTasks tasks={tasks} user={user} />;
      case 'automations':
        return <AdminAutomations rules={automationRules} employees={employeesAsUsers} />;
      case 'analytics':
        return <Analytics 
          user={user}
          events={events}
          stats={stats} 
          totalStudents={totalStudents}
          totalTeachers={totalTeachers}
        />;
      case 'staff':
        return <OwnerTeam employees={employees} />;
      case 'pricing':
        return (
          <PricingManagement 
            products={products} 
            onNavigateToCreate={() => {
              setSelectedProduct(undefined);
              setCurrentPage('pricing-form');
            }}
            onNavigateToEdit={(product) => {
              setSelectedProduct(product);
              setCurrentPage('pricing-form');
            }}
          />
        );
      case 'pricing-form':
        return (
          <PricingForm 
            product={selectedProduct} 
            onBack={() => {
              setSelectedProduct(undefined);
              setCurrentPage('pricing');
            }}
          />
        );
      case 'events-management':
        return <EventsManagement 
          events={newsEvents} 
          onCreate={onCreateNewsEvent}
          onUpdate={onUpdateNewsEvent}
          onDelete={onDeleteNewsEvent}
        />;
      default:
        return (
          <OwnerHome 
            user={user} 
            events={events} 
            stats={stats}
            totalStudents={totalStudents}
            totalTeachers={totalTeachers}
            tasks={tasks}
            employees={employees}
            onNavigate={setCurrentPage}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F4E3] via-[#F8F4E3] to-[#133C2A]/5">
      <DesktopSidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        role="owner"
        user={user}
        onLogout={onLogout}
      />
      
      <main className="md:pl-24 pb-24 md:pb-8">
        <div className="p-4 md:p-8">
          {renderPage()}
        </div>
      </main>

      <MobileNav currentPage={currentPage} onNavigate={setCurrentPage} role="owner" />
    </div>
  );
}