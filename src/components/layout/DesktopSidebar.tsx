import { useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  CreditCard,
  FileText,
  Globe,
  GraduationCap,
  Home,
  LineChart,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Sparkles,
  Tag,
  UserCheck,
  UserCircle,
  Users,
} from 'lucide-react';
import { UserRole, User } from '../../types';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import logoImage from 'figma:asset/580482af71d4ad8de5d55c498eda06ff734efd66.png';

interface DesktopSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  role: UserRole;
  user: User;
  onLogout: () => void;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: typeof Home;
  group?: string;
}

const parentPrimaryMenu: SidebarItem[] = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'schedule', label: 'Расписание', icon: Calendar },
  { id: 'payments', label: 'Оплата', icon: CreditCard },
  { id: 'communication', label: 'Сообщения', icon: MessageSquare },
  { id: 'profile', label: 'Профиль', icon: Settings },
];

const teacherPrimaryMenu: SidebarItem[] = [
  { id: 'home', label: 'Сегодня', icon: Home },
  { id: 'groups', label: 'Мои группы', icon: Users },
  { id: 'attendance', label: 'Посещаемость', icon: ClipboardCheck },
  { id: 'communication', label: 'Сообщения', icon: MessageSquare },
  { id: 'profile', label: 'Профиль', icon: Settings },
];

const adminPrimaryMenu: SidebarItem[] = [
  { id: 'home', label: 'Сегодня', icon: Home },
  { id: 'clients-management', label: 'Клиенты и заявки', icon: Users },
  { id: 'schedule', label: 'Расписание', icon: Calendar },
  { id: 'payments', label: 'Оплаты', icon: CreditCard },
  { id: 'communication', label: 'Сообщения', icon: MessageSquare },
];

const adminSecondaryMenu: SidebarItem[] = [
  { id: 'groups', label: 'Группы', icon: GraduationCap, group: 'Справочники' },
  { id: 'attendance-management', label: 'Посещаемость', icon: ClipboardCheck, group: 'Справочники' },
  { id: 'pricing', label: 'Абонементы', icon: Tag, group: 'Справочники' },
  { id: 'events-management', label: 'Новости и события', icon: Sparkles, group: 'Работа' },
  { id: 'documents-management', label: 'Документы', icon: FileText, group: 'Работа' },
  { id: 'tasks-management', label: 'Задачи', icon: CheckSquare, group: 'Команда' },
  { id: 'settings', label: 'Настройки', icon: Settings, group: 'Аккаунт' },
  { id: 'profile', label: 'Профиль', icon: UserCircle, group: 'Аккаунт' },
];

const ownerPrimaryMenu: SidebarItem[] = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'finance', label: 'Деньги', icon: BarChart3 },
  { id: 'clients', label: 'Клиенты и заявки', icon: Users },
  { id: 'team', label: 'Команда', icon: UserCheck },
  { id: 'analytics', label: 'Отчеты', icon: LineChart },
];

const ownerSecondaryMenu: SidebarItem[] = [
  { id: 'groups', label: 'Группы', icon: GraduationCap, group: 'Работа' },
  { id: 'tasks', label: 'Задачи', icon: CheckSquare, group: 'Работа' },
  { id: 'communication', label: 'Сообщения', icon: MessageSquare, group: 'Работа' },
  { id: 'documents', label: 'Документы', icon: FileText, group: 'Контроль' },
  { id: 'pricing', label: 'Абонементы', icon: Tag, group: 'Контроль' },
  { id: 'content', label: 'Новости и события', icon: Sparkles, group: 'Настройка' },
  { id: 'automations', label: 'Автодействия', icon: CheckSquare, group: 'Настройка' },
  { id: 'landing-settings', label: 'Сайт', icon: Globe, group: 'Настройка' },
  { id: 'settings', label: 'Настройки', icon: Settings, group: 'Аккаунт' },
  { id: 'profile', label: 'Профиль', icon: UserCircle, group: 'Аккаунт' },
];

function isItemActive(currentPage: string, itemId: string): boolean {
  return currentPage === itemId || (itemId === 'pricing' && currentPage === 'pricing-form');
}

export function DesktopSidebar({ currentPage, onNavigate, role, user, onLogout }: DesktopSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSecondaryOpen, setIsSecondaryOpen] = useState(false);

  const primaryMenu =
    role === 'parent'
      ? parentPrimaryMenu
      : role === 'teacher'
        ? teacherPrimaryMenu
        : role === 'admin'
          ? adminPrimaryMenu
          : ownerPrimaryMenu;

  const secondaryMenu = role === 'admin' ? adminSecondaryMenu : role === 'owner' ? ownerSecondaryMenu : [];
  const hasActiveSecondary = secondaryMenu.some((item) => isItemActive(currentPage, item.id));

  const secondaryGroups = useMemo(() => {
    return secondaryMenu.reduce<Array<{ title: string; items: SidebarItem[] }>>((groups, item) => {
      const title = item.group || 'Дополнительно';
      const existing = groups.find((group) => group.title === title);
      if (existing) {
        existing.items.push(item);
        return groups;
      }
      return [...groups, { title, items: [item] }];
    }, []);
  }, [secondaryMenu]);

  const renderItem = (item: SidebarItem, compact = false) => {
    const Icon = item.icon;
    const active = isItemActive(currentPage, item.id);

    return (
      <button
        key={item.id}
        onClick={() => {
          onNavigate(item.id);
          setIsSecondaryOpen(false);
        }}
        className={`relative flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-smooth ${
          active
            ? 'bg-[#D4AF37]/10 text-[#D4AF37]'
            : 'text-[#133C2A]/64 hover:bg-[#133C2A]/5 hover:text-[#133C2A]'
        } ${compact ? 'py-2.5 text-sm' : ''}`}
      >
        {active ? <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r bg-[#D4AF37]" /> : null}
        <Icon className={`${compact ? 'h-4.5 w-4.5' : 'h-5 w-5'} shrink-0`} />
        <span className="min-w-0 truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <aside
      className={`hidden md:block fixed left-0 top-0 h-screen bg-white border-r border-[#133C2A]/10 transition-smooth z-40 ${
        isExpanded ? 'w-80' : 'w-24'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => {
        setIsExpanded(false);
        setIsSecondaryOpen(false);
      }}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-[#133C2A]/10 p-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-2xl bg-white">
              <img src={logoImage} alt="Manera Logo" className="h-full w-full object-contain p-1" />
            </div>
            {isExpanded ? (
              <div className="min-w-0 animate-slide-up">
                <h3 className="whitespace-nowrap text-[#133C2A]">Manera</h3>
                <p className="whitespace-nowrap text-sm text-[#133C2A]/60">Dance Studio CRM</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <nav className="h-full overflow-y-auto px-3 py-6">
            <ul className="space-y-2">
              {primaryMenu.map((item) => (
                <li key={item.id}>{renderItem(item)}</li>
              ))}
            </ul>

            {secondaryMenu.length > 0 ? (
              <>
                <div className="my-5 border-t border-[#133C2A]/8" />
                {isExpanded ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-3">
                      <Menu className="h-4 w-4 text-[#133C2A]/40" />
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#133C2A]/40">Еще</p>
                    </div>
                    {secondaryGroups.map((group) => (
                      <section key={group.title} className="space-y-1">
                        <p className="px-3 pb-1 text-[11px] uppercase tracking-[0.14em] text-[#133C2A]/35">{group.title}</p>
                        <div className="space-y-1">{group.items.map((item) => renderItem(item, true))}</div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    <Button
                      variant={hasActiveSecondary || isSecondaryOpen ? 'default' : 'outline'}
                      className={hasActiveSecondary || isSecondaryOpen ? 'w-full rounded-2xl bg-[#133C2A]' : 'w-full rounded-2xl border-[#133C2A]/15'}
                      onClick={() => setIsSecondaryOpen((prev) => !prev)}
                    >
                      <Menu className="h-5 w-5" />
                    </Button>

                    {isSecondaryOpen ? (
                      <div className="absolute left-[72px] top-0 z-50 w-[280px] rounded-[28px] border border-[#133C2A]/10 bg-[#fbf7e8] p-3 shadow-[0_22px_55px_rgba(19,60,42,0.16)]">
                        <p className="px-2 pb-2 text-[11px] uppercase tracking-[0.16em] text-[#133C2A]/42">Дополнительно</p>
                        <div className="space-y-3">
                          {secondaryGroups.map((group) => (
                            <section key={group.title} className="space-y-1">
                              <p className="px-2 pb-1 text-[11px] uppercase tracking-[0.14em] text-[#133C2A]/35">{group.title}</p>
                              <div className="space-y-1">{group.items.map((item) => renderItem(item, true))}</div>
                            </section>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </>
            ) : null}
          </nav>
        </div>

        <div className="border-t border-[#133C2A]/10 p-4">
          <div className="mb-3 flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-[#D4AF37]">
              <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {isExpanded ? (
              <div className="min-w-0 animate-slide-up">
                <p className="truncate text-[#133C2A]">{user.name}</p>
                <p className="truncate text-sm text-[#133C2A]/60">{user.phone}</p>
              </div>
            ) : null}
          </div>
          <button
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2 text-[#D14343] transition-smooth hover:bg-[#D14343]/10"
          >
            <LogOut className="h-5 w-5" />
            {isExpanded ? <span>Выйти</span> : null}
          </button>
        </div>
      </div>
    </aside>
  );
}
