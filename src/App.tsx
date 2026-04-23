import { useState } from 'react';
import { Landing } from './components/Landing';
import { Login } from './components/auth/Login';
import { OTPVerification } from './components/auth/OTPVerification';
import { ParentDashboard } from './components/parent/ParentDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { OwnerDashboard } from './components/owner/OwnerDashboard';
import { Toaster } from './components/ui/sonner';
import { UserRole, Task, Notification, News, Document } from './types';
import { mockUsers, mockChildren, mockEvents, mockPayments, mockGroups, mockEmployees, mockFinanceStats, mockMonthlyData, mockTasks, mockPricingProducts, mockNews, mockDocuments, mockExpenses } from './data/mockData';
import { mockTasksNew, mockAutomationRules } from './data/tasksMockData';
import { createNewsNotification, createEventNotification, createEventUpdateNotification } from './utils/notifications';

type AppState = 'landing' | 'login' | 'otp' | 'dashboard';

export default function App() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('parent');
  const [tasks, setTasks] = useState<Task[]>(mockTasksNew);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newsEvents, setNewsEvents] = useState<News[]>(mockNews);
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);

  const currentUser = mockUsers.find(u => u.role === currentUserRole) || mockUsers[0];
  const userChildren = mockChildren.filter(c => c.parentId === currentUser.id);
  const userEvents = currentUserRole === 'parent' 
    ? mockEvents.filter(e => userChildren.some(c => c.groupId === e.groupId))
    : mockEvents;
  const userPayments = mockPayments.filter(p => p.userId === currentUser.id);

  // Фильтрация сотрудников (администраторы и преподаватели)
  const employees = mockEmployees.filter(e => e.role === 'admin' || e.role === 'teacher');
  
  // Фильтрация клиентов (родителей)
  const clients = mockUsers.filter(u => u.role === 'parent');

  const handleLogin = (phone: string) => {
    setPhoneNumber(phone);
    setAppState('otp');
  };

  const handleVerify = (role: UserRole) => {
    setCurrentUserRole(role);
    setAppState('dashboard');
  };

  const handleLogout = () => {
    setAppState('landing');
    setPhoneNumber('');
  };

  const handleGuestBrowse = () => {
    // For demo, just show landing page with scroll to pricing
    window.scrollTo({ top: 600, behavior: 'smooth' });
  };

  // Функция для добавления задачи
  const addTask = (task: Task) => {
    setTasks(prev => [task, ...prev]);
  };

  // Функция для добавления уведомления
  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  // Функции для управления новостями и мероприятиями
  const handleCreateNewsEvent = (newsEvent: Partial<News>) => {
    const newNewsEvent: News = {
      id: `news-${Date.now()}`,
      title: newsEvent.title || '',
      content: newsEvent.content || '',
      date: new Date(),
      published: newsEvent.published ?? false,
      image: newsEvent.image,
      isEvent: newsEvent.isEvent ?? false,
      eventType: newsEvent.eventType,
      eventDate: newsEvent.eventDate,
      eventLocation: newsEvent.eventLocation,
      eventFee: newsEvent.eventFee,
      eventDeadline: newsEvent.eventDeadline,
      requiresPayment: newsEvent.requiresPayment,
      maxParticipants: newsEvent.maxParticipants,
      currentParticipants: newsEvent.currentParticipants ?? 0,
    };

    setNewsEvents(prev => [newNewsEvent, ...prev]);

    // Создаем уведомление для родителей, если публикуется
    if (newNewsEvent.published) {
      if (newNewsEvent.isEvent) {
        addNotification(createEventNotification(newNewsEvent));
      } else {
        addNotification(createNewsNotification(newNewsEvent));
      }
    }
  };

  const handleUpdateNewsEvent = (id: string, updates: Partial<News>) => {
    setNewsEvents(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, ...updates };
          
          // Если мероприятие только что опубликовали
          if (!item.published && updates.published && updatedItem.isEvent) {
            addNotification(createEventNotification(updatedItem));
          }
          // Если новость только что опубликовали
          else if (!item.published && updates.published && !updatedItem.isEvent) {
            addNotification(createNewsNotification(updatedItem));
          }
          // Если уже было опубликовано и обновили важные поля мероприятия
          else if (item.published && updatedItem.isEvent && 
                   (updates.eventDate || updates.eventLocation || updates.eventFee || updates.eventDeadline)) {
            addNotification(createEventUpdateNotification(updatedItem));
          }
          
          return updatedItem;
        }
        return item;
      });
      return updated;
    });
  };

  const handleDeleteNewsEvent = (id: string) => {
    setNewsEvents(prev => prev.filter(item => item.id !== id));
  };

  // Функции для управления документами
  const handleAddDocument = (document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newDocument: Document = {
      ...document,
      id: `doc-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setDocuments(prev => [newDocument, ...prev]);
  };

  const handleUpdateDocument = (id: string, updates: Partial<Document>) => {
    setDocuments(prev => {
      const updated = prev.map(doc => {
        if (doc.id === id) {
          return { ...doc, ...updates, updatedAt: new Date() };
        }
        return doc;
      });
      return updated;
    });
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  return (
    <div className="min-h-screen">
      {appState === 'landing' && (
        <Landing 
          onLogin={() => setAppState('login')} 
          onGuestBrowse={handleGuestBrowse}
          onAddTask={addTask}
          onAddNotification={addNotification}
        />
      )}

      {appState === 'login' && (
        <Login
          onBack={() => setAppState('landing')}
          onLogin={handleLogin}
        />
      )}

      {appState === 'otp' && (
        <OTPVerification
          phone={phoneNumber}
          onVerify={handleVerify}
          onBack={() => setAppState('login')}
        />
      )}

      {appState === 'dashboard' && currentUserRole === 'parent' && (
        <ParentDashboard
          user={currentUser}
          children={userChildren}
          events={userEvents}
          payments={userPayments}
          newsEvents={newsEvents}
          onLogout={handleLogout}
          notifications={notifications}
        />
      )}

      {appState === 'dashboard' && currentUserRole === 'teacher' && (
        <TeacherDashboard
          user={currentUser}
          groups={mockGroups}
          events={mockEvents}
          onLogout={handleLogout}
        />
      )}

      {appState === 'dashboard' && currentUserRole === 'admin' && (
        <AdminDashboard
          user={currentUser}
          groups={mockGroups}
          events={mockEvents}
          tasks={tasks}
          automationRules={mockAutomationRules}
          employees={employees}
          clients={clients}
          children={mockChildren}
          products={mockPricingProducts}
          newsEvents={newsEvents}
          documents={documents}
          onLogout={handleLogout}
          notifications={notifications}
          onCreateNewsEvent={handleCreateNewsEvent}
          onUpdateNewsEvent={handleUpdateNewsEvent}
          onDeleteNewsEvent={handleDeleteNewsEvent}
          onAddDocument={handleAddDocument}
          onUpdateDocument={handleUpdateDocument}
          onDeleteDocument={handleDeleteDocument}
        />
      )}

      {appState === 'dashboard' && currentUserRole === 'owner' && (
        <OwnerDashboard
          user={currentUser}
          groups={mockGroups}
          events={mockEvents}
          employees={mockEmployees}
          stats={mockFinanceStats}
          monthlyData={mockMonthlyData}
          payments={mockPayments}
          expenses={mockExpenses}
          tasks={tasks}
          automationRules={mockAutomationRules}
          children={mockChildren}
          products={mockPricingProducts}
          newsEvents={newsEvents}
          onLogout={handleLogout}
          notifications={notifications}
          onCreateNewsEvent={handleCreateNewsEvent}
          onUpdateNewsEvent={handleUpdateNewsEvent}
          onDeleteNewsEvent={handleDeleteNewsEvent}
        />
      )}

      <Toaster 
        position="top-right"
        expand={false}
        richColors
        closeButton
        duration={3000}
      />
    </div>
  );
}