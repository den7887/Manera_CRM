export type OwnerPaymentsStatusFilter =
  | 'all'
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'overdue'
  | 'cancelled';

export type OwnerPaymentsMethodFilter = 'all' | 'cash' | 'online';

export interface OwnerPaymentsNavigationContext {
  requestId: number;
  searchQuery?: string;
  statusFilter?: OwnerPaymentsStatusFilter;
  methodFilter?: OwnerPaymentsMethodFilter;
  showOnlyOutstanding?: boolean;
  invoiceClientId?: string;
  sourceLabel?: string;
}
