import { useState } from 'react';
import { User, Group, Event } from '../../types';
import { TeacherHome } from './TeacherHome';
import { TeacherGroups } from './TeacherGroups';
import { TeacherSchedule } from './TeacherSchedule';
import { TeacherStudents } from './TeacherStudents';
import { TeacherProfile } from './TeacherProfile';
import { MobileNav } from '../layout/MobileNav';
import { DesktopSidebar } from '../layout/DesktopSidebar';
import { FeatureInDevelopment } from '../FeatureInDevelopment';

interface TeacherDashboardProps {
  user: User;
  groups: Group[];
  events: Event[];
  onLogout: () => void;
}

export function TeacherDashboard({ user, groups, events, onLogout }: TeacherDashboardProps) {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <TeacherHome user={user} groups={groups} events={events} onNavigate={setCurrentPage} />;
      case 'groups':
        return <TeacherGroups groups={groups} />;
      case 'attendance':
        return <TeacherSchedule events={events} />;
      case 'communication':
        return <FeatureInDevelopment sectionName="Сообщения" roleLabel="Преподаватель" description="Чат преподавателя будет подключен к общей системе коммуникаций после backend-доступа для роли teacher." />;
      case 'schedule':
        return <TeacherSchedule events={events} />;
      case 'students':
        return <TeacherStudents groups={groups} />;
      case 'profile':
        return <TeacherProfile user={user} onLogout={onLogout} />;
      default:
        return <TeacherHome user={user} groups={groups} events={events} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F4E3] via-[#F8F4E3] to-[#133C2A]/5">
      <DesktopSidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        role="teacher"
        user={user}
        onLogout={onLogout}
      />
      
      <main className="md:pl-24 pb-24 md:pb-8">
        <div className="p-4 md:p-8">
          {renderPage()}
        </div>
      </main>

      <MobileNav currentPage={currentPage} onNavigate={setCurrentPage} role="teacher" />
    </div>
  );
}
