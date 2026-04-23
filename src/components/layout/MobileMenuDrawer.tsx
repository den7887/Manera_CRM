import { X, LucideIcon } from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
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
  const handleNavigate = (page: string) => {
    onNavigate(page);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden animate-slide-up">
        <div className="bg-gradient-to-br from-[#F8F4E3] to-white rounded-t-3xl shadow-2xl border-t border-[#133C2A]/10">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#133C2A]/10">
            <h3 className="text-[#133C2A]">Меню</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[#133C2A]/5 transition-smooth"
            >
              <X className="w-6 h-6 text-[#133C2A]/60" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {menuItems.filter(item => !item.desktopOnly).map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-smooth ${
                    isActive
                      ? 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white shadow-lg'
                      : 'bg-white/50 text-[#133C2A] hover:bg-white hover:shadow-md'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Padding for safe area */}
          <div className="h-4" />
        </div>
      </div>
    </>
  );
}