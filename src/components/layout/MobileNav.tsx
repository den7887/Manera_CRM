import { Home, Users, Calendar, CreditCard, Settings, GraduationCap, Coins, MessageSquare, UserCog, CheckSquare, Menu, UserCircle, Target, Tag, Sparkles, Bell, FileText, BarChart3, LineChart, Globe } from 'lucide-react';
import { UserRole } from '../../types';
import { useState } from 'react';
import { MobileMenuDrawer } from './MobileMenuDrawer';

interface MobileNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  role: UserRole;
}

export function MobileNav({ currentPage, onNavigate, role }: MobileNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const parentMainTabs = [
    { id: 'home', label: 'Главная', icon: Home },
    { id: 'schedule', label: 'Расписание', icon: Calendar },
    { id: 'payments', label: 'Оплата', icon: CreditCard },
  ];

  const teacherMainTabs = [
    { id: 'home', label: 'Главная', icon: Home },
    { id: 'groups', label: 'Группы', icon: Users },
    { id: 'schedule', label: 'Расписание', icon: Calendar },
    { id: 'students', label: 'Ученики', icon: GraduationCap },
  ];

  const adminMainTabs = [
    { id: 'home', label: 'Главная', icon: Home },
    { id: 'students', label: 'Ученики', icon: Users },
    { id: 'schedule', label: 'Расписание', icon: Calendar },
    { id: 'tasks', label: 'Задачи', icon: CheckSquare },
  ];

  const ownerMainTabs = [
    { id: 'home', label: 'Главная', icon: Home },
    { id: 'clients', label: 'Клиенты', icon: Users },
    { id: 'finance', label: 'Деньги', icon: BarChart3 },
  ];

  // Дополнительные разделы для меню
  const parentMenuItems = [
    { id: 'children', label: 'Дети', icon: Users, group: 'Учеба' },
    { id: 'events', label: 'События', icon: Sparkles, group: 'Учеба' },
    { id: 'documents', label: 'Документы', icon: FileText, group: 'Учеба' },
    { id: 'notifications', label: 'Уведомления', icon: Bell, group: 'Связь' },
    { id: 'communication', label: 'Чат со студией', icon: MessageSquare, group: 'Связь' },
    { id: 'profile', label: 'Профиль', icon: Settings, group: 'Аккаунт' },
  ];

  const teacherMenuItems = [
    { id: 'profile', label: 'Профиль', icon: Settings },
  ];

  const adminMenuItems = [
    { id: 'leads', label: 'База клиентов', icon: Target },
    { id: 'pricing', label: 'Прайс', icon: Tag },
    { id: 'events-management', label: 'Мероприятия', icon: Sparkles },
    { id: 'groups', label: 'Группы', icon: GraduationCap },
    { id: 'parents', label: 'Родители', icon: UserCircle },
    { id: 'communication', label: 'Сообщения', icon: MessageSquare },
    { id: 'staff', label: 'Сотрудники', icon: UserCog, desktopOnly: true },
    { id: 'profile', label: 'Профиль', icon: Settings },
  ];

  const ownerMenuItems = [
    { id: 'groups', label: 'Группы', icon: GraduationCap, group: 'Работа' },
    { id: 'tasks', label: 'Задачи', icon: CheckSquare, group: 'Работа' },
    { id: 'communication', label: 'Сообщения', icon: MessageSquare, group: 'Работа' },
    { id: 'analytics', label: 'Отчеты', icon: LineChart, group: 'Контроль' },
    { id: 'team', label: 'Команда', icon: Users, group: 'Контроль' },
    { id: 'documents', label: 'Документы', icon: FileText, group: 'Контроль' },
    { id: 'pricing', label: 'Абонементы', icon: Tag, group: 'Настройка' },
    { id: 'content', label: 'Новости', icon: Sparkles, group: 'Настройка' },
    { id: 'automations', label: 'Автодействия', icon: CheckSquare, group: 'Настройка' },
    { id: 'landing-settings', label: 'Сайт', icon: Globe, group: 'Настройка' },
    { id: 'settings', label: 'Настройки', icon: Settings, group: 'Аккаунт' },
    { id: 'profile', label: 'Профиль', icon: Settings, group: 'Аккаунт' },
  ];

  const mainTabs = 
    role === 'parent' ? parentMainTabs :
    role === 'teacher' ? teacherMainTabs :
    role === 'admin' ? adminMainTabs :
    ownerMainTabs;

  const menuItems = 
    role === 'parent' ? parentMenuItems :
    role === 'teacher' ? teacherMenuItems :
    role === 'admin' ? adminMenuItems :
    ownerMenuItems;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="bg-[#fbf7e8]/95 backdrop-blur-xl border-t border-[#133C2A]/10 shadow-[0_-8px_24px_rgba(19,60,42,0.08)]">
          <div className="grid grid-cols-4 gap-1 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentPage === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  className={`min-w-0 h-14 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-smooth ${
                    isActive
                      ? 'bg-white text-[#133C2A] border border-[#D4AF37]/40 shadow-sm'
                      : 'text-[#133C2A]/60 hover:text-[#133C2A]'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="text-[11px] leading-tight truncate max-w-full px-1">{tab.label}</span>
                </button>
              );
            })}
            
            <button
              onClick={() => setIsMenuOpen(true)}
              className="min-w-0 h-14 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-smooth bg-[#133C2A] text-white shadow-sm"
            >
              <Menu className="w-5 h-5 shrink-0" />
              <span className="text-[11px] leading-tight truncate max-w-full px-1">Меню</span>
            </button>
          </div>
        </div>
      </nav>

      <MobileMenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        menuItems={menuItems}
        currentPage={currentPage}
        onNavigate={onNavigate}
      />
    </>
  );
}
