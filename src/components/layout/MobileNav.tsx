import { Home, Users, Calendar, CreditCard, Settings, GraduationCap, Coins, MessageSquare, UserCog, CheckSquare, Menu, UserCircle, Target, Tag, Sparkles, Bell, FileText, BarChart3, Receipt, LineChart, Wallet, Globe } from 'lucide-react';
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

  // Основные табы (4 шт) для нижней панели
  const parentMainTabs = [
    { id: 'home', label: 'Главная', icon: Home },
    { id: 'children', label: 'Дети', icon: Users },
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
    { id: 'finance', label: 'Финансы', icon: BarChart3 },
    { id: 'tasks', label: 'Задачи', icon: CheckSquare },
  ];

  // Дополнительные разделы для меню
  const parentMenuItems = [
    { id: 'notifications', label: 'Уведомления', icon: Bell },
    { id: 'communication', label: 'Коммуникации', icon: MessageSquare },
    { id: 'events', label: 'Мероприятия', icon: Sparkles },
    { id: 'profile', label: 'Профиль', icon: Settings },
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
    { id: 'analytics', label: 'Аналитика', icon: LineChart },
    { id: 'team', label: 'Команда', icon: Users },
    { id: 'groups', label: 'Группы', icon: GraduationCap },
    { id: 'payments', label: 'Платежи', icon: Receipt },
    { id: 'expenses', label: 'Расходы', icon: Wallet },
    { id: 'leads', label: 'База клиентов', icon: Target },
    { id: 'pricing', label: 'Прайс', icon: Tag },
    { id: 'events-management', label: 'Мероприятия', icon: Sparkles },
    { id: 'automations', label: 'Автоматизации', icon: CheckSquare },
    { id: 'communication', label: 'Сообщения', icon: MessageSquare },
    { id: 'news', label: 'Новости', icon: Sparkles },
    { id: 'documents', label: 'Документы', icon: FileText },
    { id: 'parents', label: 'Родители', icon: UserCircle },
    { id: 'staff', label: 'Сотрудники', icon: UserCog },
    { id: 'landing-settings', label: 'Лендинг', icon: Globe },
    { id: 'settings', label: 'Настройки', icon: Settings },
    { id: 'profile', label: 'Профиль', icon: Settings },
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
        <div className="h-20 bg-gradient-to-r from-[#F8F4E3] to-[#133C2A]/10 backdrop-blur-md border-t border-[#133C2A]/10">
          <div className="flex items-center justify-around h-full px-2">
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentPage === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-smooth ${
                    isActive
                      ? 'text-[#D4AF37] -translate-y-1 gold-glow'
                      : 'text-[#133C2A]/60 hover:text-[#133C2A]'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'animate-scale-in' : ''}`} />
                  <span className="text-xs">{tab.label}</span>
                </button>
              );
            })}
            
            {/* Menu Button */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-smooth text-[#133C2A]/60 hover:text-[#133C2A]"
            >
              <Menu className="w-6 h-6" />
              <span className="text-xs">Меню</span>
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
