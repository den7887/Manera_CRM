import { useState } from 'react';
import { CalendarClock, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { OwnerEventsPanel } from './OwnerEventsPanel';
import { OwnerNewsPanel } from './OwnerNewsPanel';

type ContentTab = 'news' | 'events';

interface OwnerContentPanelProps {
  initialTab?: ContentTab;
}

export function OwnerContentPanel({ initialTab = 'news' }: OwnerContentPanelProps) {
  const [activeTab, setActiveTab] = useState<ContentTab>(initialTab);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#133C2A]/10 bg-white/70 p-2 sm:inline-flex">
        <Button
          variant={activeTab === 'news' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('news')}
          className={activeTab === 'news' ? 'rounded-xl bg-[#133C2A] text-white hover:bg-[#133C2A]/90' : 'rounded-xl text-[#133C2A]/80'}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Новости
        </Button>
        <Button
          variant={activeTab === 'events' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('events')}
          className={activeTab === 'events' ? 'rounded-xl bg-[#133C2A] text-white hover:bg-[#133C2A]/90' : 'rounded-xl text-[#133C2A]/80'}
        >
          <CalendarClock className="w-4 h-4 mr-2" />
          Мероприятия
        </Button>
      </div>

      {activeTab === 'news' ? <OwnerNewsPanel /> : <OwnerEventsPanel />}
    </div>
  );
}
