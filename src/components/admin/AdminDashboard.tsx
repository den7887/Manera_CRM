import { useState } from 'react';
import { User, Group, Event, Task, AutomationRule, Child, Notification, Product, News, Document } from '../../types';
import { AdminHome } from './AdminHome';
import { AdminStudents } from './AdminStudents';
import { AdminParents } from './AdminParents';
import { AdminLeads } from './AdminLeads';
import { AdminGroups } from './AdminGroups';
import { AdminSchedule } from './AdminSchedule';
import { AdminCommunication } from './AdminCommunication';
import { AdminProfile } from './AdminProfile';
import { AdminTasks } from './AdminTasks';
import { TasksManagement } from './TasksManagement';
import { AdminAutomations } from './AdminAutomations';
import { AdminSettings } from './AdminSettings';
import { PricingManagement } from './PricingManagement';
import { PricingForm } from './PricingForm';
import { EventsManagement } from './EventsManagement';
import { DocumentsManagement } from './DocumentsManagement';
import { AttendanceManagement } from './AttendanceManagement';
import { ClientsManagement } from './ClientsManagement';
import { ScheduleManagement } from './ScheduleManagement';
import { MobileNav } from '../layout/MobileNav';
import { DesktopSidebar } from '../layout/DesktopSidebar';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { Card, CardContent } from '../ui/card';
import { Monitor } from 'lucide-react';

interface AdminDashboardProps {
  user: User;
  groups: Group[];
  events: Event[];
  tasks: Task[];
  automationRules: AutomationRule[];
  employees: User[];
  clients: User[];
  children: Child[];
  products: Product[];
  newsEvents: News[]; // Добавляем мероприятия
  documents: Document[];
  onLogout: () => void;
  notifications: Notification[];
  onCreateNewsEvent?: (newsEvent: Partial<News>) => void;
  onUpdateNewsEvent?: (id: string, updates: Partial<News>) => void;
  onDeleteNewsEvent?: (id: string) => void;
  onAddDocument?: (document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateDocument?: (id: string, updates: Partial<Document>) => void;
  onDeleteDocument?: (id: string) => void;
}

export function AdminDashboard({ 
  user, 
  groups, 
  events, 
  tasks, 
  automationRules, 
  employees, 
  clients, 
  children, 
  products, 
  newsEvents, 
  documents,
  onLogout, 
  notifications,
  onCreateNewsEvent,
  onUpdateNewsEvent,
  onDeleteNewsEvent,
  onAddDocument,
  onUpdateDocument,
  onDeleteDocument
}: AdminDashboardProps) {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
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
    // Блокировка тяжелых функций на мобильных
    if (isMobile && currentPage === 'automations') {
      return <DesktopOnlyMessage feature="Автоматизации" />;
    }
    if (isMobile && currentPage === 'tasks-management') {
      return <DesktopOnlyMessage feature="Задачи" />;
    }
    if (isMobile && currentPage === 'groups') {
      return <DesktopOnlyMessage feature="Создание и редактирование групп" />;
    }

    switch (currentPage) {
      case 'home':
        return <AdminHome user={user} events={events} groups={groups} tasks={tasks} onNavigate={setCurrentPage} notifications={notifications} />;
      case 'students':
        return <AdminStudents groups={groups} />;
      case 'parents':
        return <AdminParents />;
      case 'leads':
        return <AdminLeads />;
      case 'groups':
        return <AdminGroups groups={groups} />;
      case 'schedule':
        return <AdminSchedule events={events} groups={groups} />;
      case 'tasks':
        return <AdminTasks tasks={tasks} />;
      case 'communication':
        return <AdminCommunication />;
      case 'profile':
        return <AdminProfile user={user} onLogout={onLogout} />;
      case 'tasks-management':
        return <TasksManagement tasks={tasks} employees={employees} clients={clients} children={children} currentUser={user} />;
      case 'automations':
        return <AdminAutomations rules={automationRules} employees={employees} />;
      case 'settings':
        return <AdminSettings />;
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
        return <EventsManagement events={newsEvents} onCreate={onCreateNewsEvent} onUpdate={onUpdateNewsEvent} onDelete={onDeleteNewsEvent} />;
      case 'documents-management':
        return <DocumentsManagement 
          documents={documents} 
          employees={employees}
          parents={clients}
          currentUserId={user.id}
          currentUserName={user.name}
          onAddDocument={onAddDocument || (() => {})} 
          onUpdateDocument={onUpdateDocument || (() => {})} 
          onDeleteDocument={onDeleteDocument || (() => {})} 
        />; 
      case 'attendance-management':
        return <AttendanceManagement />;
      case 'clients-management':
        return <ClientsManagement />;
      case 'schedule-management':
        return <ScheduleManagement />;
      default:
        return <AdminHome user={user} events={events} groups={groups} tasks={tasks} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F4E3] via-[#F8F4E3] to-[#133C2A]/5">
      <DesktopSidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        role="admin"
        user={user}
        onLogout={onLogout}
      />
      
      <main className="md:pl-24 pb-24 md:pb-8">
        <div className="p-4 md:p-8">
          {renderPage()}
        </div>
      </main>

      <MobileNav currentPage={currentPage} onNavigate={setCurrentPage} role="admin" />
    </div>
  );
}