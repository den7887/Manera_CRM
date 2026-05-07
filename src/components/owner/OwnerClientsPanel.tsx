import { ClientsManagement } from '../admin/ClientsManagement';
import { Task, User } from '../../types';
import { OwnerPaymentsNavigationContext } from './paymentsNavigation';

interface OwnerClientsPanelProps {
  tasks: Task[];
  currentUser: User;
  onNavigatePayments?: (context?: Omit<OwnerPaymentsNavigationContext, 'requestId'>) => void;
  onNavigateSection?: (page: string) => void;
}

function mapPaymentsContext(
  context?: {
    searchQuery?: string;
    queue?: 'review' | 'waiting' | 'overdue' | 'paid' | 'problem' | 'all';
    sourceLabel?: string;
    invoiceClientId?: string;
  },
): Omit<OwnerPaymentsNavigationContext, 'requestId'> | undefined {
  if (!context) return undefined;

  const mapped: Omit<OwnerPaymentsNavigationContext, 'requestId'> = {
    searchQuery: context.searchQuery,
    invoiceClientId: context.invoiceClientId,
    sourceLabel: context.sourceLabel,
  };

  if (context.queue === 'review') {
    mapped.statusFilter = 'pending';
  } else if (context.queue === 'waiting') {
    mapped.statusFilter = 'unpaid';
  } else if (context.queue === 'overdue') {
    mapped.statusFilter = 'overdue';
  } else if (context.queue === 'paid') {
    mapped.statusFilter = 'paid';
  } else if (context.queue === 'problem') {
    mapped.showOnlyOutstanding = true;
  }

  return mapped;
}

export function OwnerClientsPanel({
  tasks,
  currentUser,
  onNavigatePayments,
  onNavigateSection,
}: OwnerClientsPanelProps) {
  return (
    <ClientsManagement
      tasks={tasks}
      currentUser={currentUser}
      onNavigatePayments={(context) => onNavigatePayments?.(mapPaymentsContext(context))}
      onNavigateSection={(page) => {
        if (!onNavigateSection) return;
        if (page === 'tasks-management') {
          onNavigateSection('tasks');
          return;
        }
        onNavigateSection(page);
      }}
    />
  );
}
