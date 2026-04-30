import { useState } from 'react';
import { Home, Users, Calendar, Settings, CreditCard, GraduationCap, Target, UserCircle, MessageSquare, CheckSquare, Zap, BarChart3, LogOut, ChevronRight, Menu, Tag, Sparkles, Bell, FileText, UserCheck, CalendarClock, Receipt, LineChart, Wallet, Globe } from 'lucide-react';
import { UserRole, User } from '../../types';
import { Avatar, AvatarFallback } from '../ui/avatar';
import logoImage from 'figma:asset/580482af71d4ad8de5d55c498eda06ff734efd66.png';

interface DesktopSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  role: UserRole;
  user: User;
  onLogout: () => void;
}

export function DesktopSidebar({ currentPage, onNavigate, role, user, onLogout }: DesktopSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const parentMenu = [
    { id: 'home', label: 'Главная', icon: Home },
    { id: 'notifications', label: 'Уведомления', icon: Bell },
    { id: 'communication', label: 'Коммуникации', icon: MessageSquare },
    { id: 'children', label: 'Мои дети', icon: Users },
    { id: 'schedule', label: 'Расписание', icon: Calendar },
    { id: 'events', label: 'Мероприятия', icon: Sparkles },
    { id: 'payments', label: 'Оплата', icon: CreditCard },
    { id: 'profile', label: 'Профиль', icon: Settings },
  ];

  const teacherMenu = [
    { id: 'home', label: 'Главная', icon: Home },
    { id: 'groups', label: 'Группы', icon: Users },
    { id: 'schedule', label: 'Расписание', icon: Calendar },
    { id: 'students', label: 'Ученики', icon: GraduationCap },
    { id: 'profile', label: 'Профиль', icon: Settings },
  ];

  const adminMenu = [
    { id: 'home', label: 'Главная', icon: Home },
    { id: 'leads', label: 'База клиентов', icon: Target },
    { id: 'pricing', label: 'Прайс', icon: Tag },
    { id: 'events-management', label: 'Мероприятия', icon: Sparkles },
    { id: 'groups', label: 'Группы', icon: GraduationCap },
    { id: 'students', label: 'Ученики', icon: Users },
    { id: 'parents', label: 'Родители', icon: UserCircle },
    { id: 'schedule', label: 'Расписание', icon: Calendar },
    { id: 'tasks-management', label: 'Задачи', icon: CheckSquare },
    { id: 'automations', label: 'Автоматизации', icon: Zap },
    { id: 'communication', label: 'Сообщения', icon: MessageSquare },
    { id: 'documents-management', label: 'Документы', icon: FileText },
    { id: 'settings', label: 'Настройки', icon: Settings },
    { id: 'profile', label: 'Профиль', icon: UserCircle },
  ];

  const ownerMenu = [
    { id: 'home', label: 'Главная', icon: Home },
    { id: 'clients', label: 'Клиенты', icon: Users },
    { id: 'analytics', label: 'Аналитика', icon: LineChart },
    { id: 'team', label: 'Команда', icon: UserCheck },
    { id: 'groups', label: 'Группы', icon: GraduationCap },
    { id: 'tasks', label: 'Задачи', icon: CheckSquare },
    { id: 'finance', label: 'Финансы', icon: BarChart3 },
    { id: 'payments', label: 'Платежи', icon: Receipt },
    { id: 'expenses', label: 'Расходы', icon: Wallet },
    { id: 'leads', label: 'База клиентов', icon: Target },
    { id: 'pricing', label: 'Прайс', icon: Tag },
    { id: 'events-management', label: 'Мероприятия', icon: Sparkles },
    { id: 'automations', label: 'Автоматизации', icon: Zap },
    { id: 'communication', label: 'Сообщения', icon: MessageSquare },
    { id: 'news', label: 'Новости', icon: Sparkles },
    { id: 'documents', label: 'Документы', icon: FileText },
    { id: 'parents', label: 'Родители', icon: UserCircle },
    { id: 'staff', label: 'Сотрудники', icon: UserCheck },
    { id: 'settings', label: 'Настройки', icon: Settings },
    { id: 'landing-settings', label: 'Лендинг', icon: Globe },
    { id: 'profile', label: 'Профиль', icon: Settings },
  ];

  const menu = 
    role === 'parent' ? parentMenu :
    role === 'teacher' ? teacherMenu :
    role === 'admin' ? adminMenu :
    ownerMenu;

  return (
    <aside
      className={`hidden md:block fixed left-0 top-0 h-screen bg-white border-r border-[#133C2A]/10 transition-smooth z-40 ${
        isExpanded ? 'w-72' : 'w-24'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-[#133C2A]/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
              <img src={logoImage} alt="Manera Logo" className="w-full h-full object-contain p-1" />
            </div>
            {isExpanded && (
              <div className="flex-1 overflow-hidden animate-slide-up">
                <h3 className="text-[#133C2A] whitespace-nowrap">Manera</h3>
                <p className="text-[#133C2A]/60 text-sm whitespace-nowrap">Dance Studio</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6">
          <ul className="space-y-2 px-3">
            {menu.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id || (item.id === 'pricing' && currentPage === 'pricing-form');
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-smooth relative ${
                      isActive
                        ? 'text-[#D4AF37] bg-[#D4AF37]/10'
                        : 'text-[#133C2A]/60 hover:text-[#133C2A] hover:bg-[#133C2A]/5'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D4AF37] rounded-r" />
                    )}
                    <Icon className="w-6 h-6 flex-shrink-0" />
                    {isExpanded && (
                      <span className="whitespace-nowrap overflow-hidden animate-slide-up">
                        {item.label}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-[#133C2A]/10">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-12 h-12 border-2 border-[#D4AF37]">
              <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {isExpanded && (
              <div className="flex-1 overflow-hidden animate-slide-up">
                <p className="text-[#133C2A] truncate">{user.name}</p>
                <p className="text-[#133C2A]/60 text-sm truncate">{user.phone}</p>
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-[#D14343] hover:bg-[#D14343]/10 transition-smooth"
          >
            <LogOut className="w-5 h-5" />
            {isExpanded && <span>Выйти</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
