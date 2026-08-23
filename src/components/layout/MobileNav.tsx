import { Home, Users, Calendar, CreditCard, Settings, GraduationCap, MessageSquare, UserCog, CheckSquare, Menu, UserCircle, Tag, Sparkles, Bell, FileText, BarChart3, LineChart, Globe, ClipboardCheck } from 'lucide-react';
import { UserRole } from '../../types';
import { useState } from 'react';
import { MobileMenuDrawer } from './MobileMenuDrawer';
import { hasPermission } from '../../lib/permissions';

interface MobileNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  role: UserRole;
  /** Map of tab/menu item id -> whether it should show an unread dot. */
  badges?: Record<string, boolean>;
  /** The current admin/teacher's granted permission keys (owner ignores this -- always sees everything). */
  permissions?: string[];
}

// Same mapping as DesktopSidebar's sidebarItemPermission -- an id missing
// here has no specific permission tied to it and stays visible.
const navItemPermission: Record<string, string> = {
  home: 'dashboard.view',
  'clients-management': 'clients.view',
  clients: 'clients.view',
  schedule: 'groups.view',
  payments: 'finance.view',
  finance: 'finance.view',
  communication: 'communications.view',
  groups: 'groups.view',
  'attendance-management': 'groups.attendance',
  attendance: 'groups.attendance',
  pricing: 'finance.view',
  'events-management': 'content.view',
  content: 'content.view',
  'documents-management': 'documents.view',
  documents: 'documents.view',
  'tasks-management': 'tasks.view',
  tasks: 'tasks.view',
  students: 'clients.view',
  automations: 'automations.view',
  team: 'team.view',
};

export function MobileNav({ currentPage, onNavigate, role, badges, permissions }: MobileNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const parentMainTabs = [
    { id: 'home', label: 'Главная', icon: Home },
    { id: 'schedule', label: 'Расписание', icon: Calendar },
    { id: 'payments', label: 'Оплата', icon: CreditCard },
    { id: 'communication', label: 'Сообщения', icon: MessageSquare },
    { id: 'profile', label: 'Профиль', icon: Settings },
  ];

  const teacherMainTabs = [
    { id: 'home', label: 'Сегодня', icon: Home },
    { id: 'groups', label: 'Группы', icon: Users },
    { id: 'attendance', label: 'Отметить', icon: ClipboardCheck },
    { id: 'communication', label: 'Сообщения', icon: MessageSquare },
  ];

  const adminMainTabs = [
    { id: 'home', label: 'Сегодня', icon: Home },
    { id: 'clients-management', label: 'Клиенты', icon: Users },
    { id: 'schedule', label: 'Расписание', icon: Calendar },
    { id: 'payments', label: 'Оплаты', icon: CreditCard },
  ];

  const ownerMainTabs = [
    { id: 'home', label: 'Главная', icon: Home },
    { id: 'finance', label: 'Деньги', icon: BarChart3 },
    { id: 'clients', label: 'Клиенты', icon: Users },
    { id: 'team', label: 'Команда', icon: UserCog },
  ];

  // Дополнительные разделы для меню
  const parentMenuItems = [
    { id: 'children', label: 'Данные ребёнка', icon: Users, group: 'Профиль' },
    { id: 'events', label: 'События', icon: Sparkles, group: 'Профиль' },
    { id: 'documents', label: 'Документы', icon: FileText, group: 'Профиль' },
    { id: 'notifications', label: 'Уведомления', icon: Bell, group: 'Профиль' },
    { id: 'profile', label: 'Профиль', icon: Settings, group: 'Профиль' },
  ];

  const teacherMenuItems = [
    { id: 'schedule', label: 'Расписание', icon: Calendar, group: 'Работа' },
    { id: 'students', label: 'Ученики', icon: GraduationCap, group: 'Работа' },
    { id: 'profile', label: 'Профиль', icon: Settings, group: 'Аккаунт' },
  ];

  const adminMenuItems = [
    { id: 'communication', label: 'Сообщения', icon: MessageSquare, group: 'Работа' },
    { id: 'groups', label: 'Группы', icon: GraduationCap, group: 'Справочники' },
    { id: 'attendance-management', label: 'Посещаемость', icon: ClipboardCheck, group: 'Справочники' },
    { id: 'pricing', label: 'Прайс', icon: Tag, group: 'Справочники' },
    { id: 'events-management', label: 'Новости и события', icon: Sparkles, group: 'Справочники' },
    { id: 'documents-management', label: 'Документы', icon: FileText, group: 'Справочники' },
    { id: 'tasks-management', label: 'Задачи', icon: CheckSquare, group: 'Команда' },
    { id: 'settings', label: 'Настройки', icon: Settings, group: 'Аккаунт' },
    { id: 'profile', label: 'Профиль', icon: UserCircle, group: 'Аккаунт' },
  ];

  const ownerMenuItems = [
    { id: 'analytics', label: 'Отчеты', icon: LineChart, group: 'Контроль' },
    { id: 'groups', label: 'Группы', icon: GraduationCap, group: 'Работа' },
    { id: 'attendance', label: 'Посещаемость', icon: ClipboardCheck, group: 'Работа' },
    { id: 'tasks', label: 'Задачи', icon: CheckSquare, group: 'Работа' },
    { id: 'communication', label: 'Сообщения', icon: MessageSquare, group: 'Работа' },
    { id: 'documents', label: 'Документы', icon: FileText, group: 'Контроль' },
    { id: 'pricing', label: 'Прайс', icon: Tag, group: 'Настройка' },
    { id: 'content', label: 'Новости и события', icon: Sparkles, group: 'Настройка' },
    { id: 'automations', label: 'Автодействия', icon: CheckSquare, group: 'Настройка' },
    { id: 'landing-settings', label: 'Сайт', icon: Globe, group: 'Настройка' },
    { id: 'settings', label: 'Настройки', icon: Settings, group: 'Аккаунт' },
    { id: 'profile', label: 'Профиль', icon: Settings, group: 'Аккаунт' },
  ];

  const rawMainTabs =
    role === 'parent' ? parentMainTabs :
    role === 'teacher' ? teacherMainTabs :
    role === 'admin' ? adminMainTabs :
    ownerMainTabs;

  const rawMenuItems =
    role === 'parent' ? parentMenuItems :
    role === 'teacher' ? teacherMenuItems :
    role === 'admin' ? adminMenuItems :
    ownerMenuItems;

  // "нет раздела" -- an admin/teacher without the matching permission never
  // sees the tab/menu item at all. Owner (and parent, which has no entries
  // in navItemPermission) is unaffected.
  const visibleForUser = (item: { id: string }) => {
    const requiredPermission = navItemPermission[item.id];
    if (!requiredPermission) return true;
    return hasPermission({ role, permissions }, requiredPermission);
  };
  const mainTabs = rawMainTabs.filter(visibleForUser);
  const menuItems = rawMenuItems.filter(visibleForUser);
  const hasMenu = menuItems.some((item) => !item.desktopOnly);
  const visibleMainTabs = hasMenu ? mainTabs.slice(0, 4) : mainTabs.slice(0, 5);
  const columnCount = visibleMainTabs.length + (hasMenu ? 1 : 0);
  const visibleTabIds = new Set(visibleMainTabs.map((tab) => tab.id));
  // Items tucked away behind "Ещё" don't show their own dot, so surface a
  // single aggregate dot on the "Ещё" button when any of them has one.
  const moreHasBadge = menuItems.some((item) => !visibleTabIds.has(item.id) && badges?.[item.id]);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="bg-[#fbf7e8]/95 backdrop-blur-xl border-t border-[#133C2A]/10 shadow-[0_-8px_24px_rgba(19,60,42,0.08)]">
          <div
            className="grid gap-1 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
            style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
          >
            {visibleMainTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentPage === tab.id;
              
              const hasBadge = Boolean(badges?.[tab.id]);

              return (
                <button
                  key={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  className={`relative min-w-0 h-14 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-smooth ${
                    isActive
                      ? 'bg-white text-[#133C2A] border border-[#D4AF37]/40 shadow-sm'
                      : 'text-[#133C2A]/60 hover:text-[#133C2A]'
                  }`}
                >
                  <span className="relative">
                    <Icon className="w-5 h-5 shrink-0" />
                    {hasBadge && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#D14343] ring-2 ring-[#fbf7e8]" />
                    )}
                  </span>
                  <span className="text-[11px] leading-tight truncate max-w-full px-1">{tab.label}</span>
                </button>
              );
            })}

            {hasMenu && (
              <button
                onClick={() => setIsMenuOpen(true)}
                className="relative min-w-0 h-14 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-smooth bg-[#133C2A] text-white shadow-sm"
              >
                <span className="relative">
                  <Menu className="w-5 h-5 shrink-0" />
                  {moreHasBadge && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#D14343] ring-2 ring-[#133C2A]" />
                  )}
                </span>
                <span className="text-[11px] leading-tight truncate max-w-full px-1">Ещё</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <MobileMenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        menuItems={menuItems}
        currentPage={currentPage}
        onNavigate={onNavigate}
        badges={badges}
      />
    </>
  );
}
