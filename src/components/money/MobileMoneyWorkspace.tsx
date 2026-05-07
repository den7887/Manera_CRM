import { Button } from '../ui/button';
import { MoneyTab } from './moneyTypes';

const tabMeta: Array<{ id: MoneyTab; label: string }> = [
  { id: 'overview', label: 'Обзор' },
  { id: 'payments', label: 'Оплаты' },
  { id: 'subscriptions', label: 'Абонементы' },
  { id: 'settings', label: 'Еще' },
];

export function MobileMoneyWorkspace({
  activeTab,
  onTabChange,
  children,
}: {
  activeTab: MoneyTab;
  onTabChange: (tab: MoneyTab) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-20 -mx-3 bg-[#F8F4E3]/95 px-3 pb-2 pt-1 backdrop-blur md:hidden">
        <div className="rounded-2xl border border-[#133C2A]/10 bg-white/90 p-1 shadow-[0_10px_24px_rgba(19,60,42,0.05)]">
          <div className="grid grid-cols-4 gap-1">
            {tabMeta.map((tab) => (
              <Button
                key={tab.id}
                size="sm"
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                className={activeTab === tab.id ? 'rounded-xl bg-[#133C2A] text-white' : 'rounded-xl text-[#133C2A]/68'}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

