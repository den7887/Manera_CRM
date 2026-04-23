import { LucideIcon } from 'lucide-react';
import { Button } from './ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#133C2A]/10 to-[#D4AF37]/10 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-[#133C2A]/30" />
      </div>
      <h3 className="text-[#133C2A] mb-2">{title}</h3>
      <p className="text-[#133C2A]/60 max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
