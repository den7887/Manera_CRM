import { Search, X, LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  group?: string;
  desktopOnly?: boolean;
}

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function MobileMenuDrawer({ isOpen, onClose, menuItems, currentPage, onNavigate }: MobileMenuDrawerProps) {
  const [query, setQuery] = useState('');

  const handleNavigate = (page: string) => {
    onNavigate(page);
    onClose();
  };

  const groupedItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const visibleItems = menuItems
      .filter((item) => !item.desktopOnly)
      .filter((item) => {
        if (!normalizedQuery) return true;
        return `${item.label} ${item.group || ''}`.toLowerCase().includes(normalizedQuery);
      });

    return visibleItems.reduce<Array<{ title: string; items: MenuItem[] }>>((groups, item) => {
      const title = item.group || 'Другое';
      const existing = groups.find((group) => group.title === title);
      if (existing) {
        existing.items.push(item);
        return groups;
      }
      return [...groups, { title, items: [item] }];
    }, []);
  }, [menuItems, query]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/35 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
      />
      
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden animate-slide-up">
        <div className="bg-[#fbf7e8] rounded-t-[24px] shadow-2xl border-t border-[#133C2A]/10 max-h-[88dvh] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#133C2A]/10">
            <div>
              <h3 className="text-[#133C2A] text-lg">Разделы</h3>
              <p className="text-xs text-[#133C2A]/55">Быстрый переход по кабинету</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white border border-[#133C2A]/10 flex items-center justify-center transition-smooth"
            >
              <X className="w-5 h-5 text-[#133C2A]/70" />
            </button>
          </div>

          <div className="p-3 border-b border-[#133C2A]/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#133C2A]/38" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Найти раздел"
                className="h-11 w-full rounded-2xl border border-[#133C2A]/10 bg-white pl-9 pr-3 text-sm text-[#133C2A] outline-none focus:border-[#D4AF37]/60"
              />
            </div>
          </div>

          <div className="p-3 space-y-3 overflow-y-auto max-h-[calc(88dvh-132px)]">
            {groupedItems.length === 0 ? (
              <div className="rounded-2xl bg-white p-4 text-center text-sm text-[#133C2A]/60">
                Раздел не найден
              </div>
            ) : (
              groupedItems.map((group) => (
                <section key={group.title} className="space-y-1">
                  <p className="px-2 pb-1 text-[11px] uppercase tracking-[0.14em] text-[#133C2A]/42">{group.title}</p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentPage === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavigate(item.id)}
                          className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-smooth ${
                            isActive
                              ? 'bg-[#133C2A] text-white'
                              : 'bg-white text-[#133C2A] border border-[#133C2A]/8'
                          }`}
                        >
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            isActive ? 'bg-white/15' : 'bg-[#F8F4E3]'
                          }`}>
                            <Icon className="h-4.5 w-4.5 shrink-0" />
                          </span>
                          <span className="min-w-0 flex-1 text-sm leading-tight">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>

          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </>
  );
}
