import { MoneyWorkspace } from '../money/MoneyWorkspace';
import { OwnerPaymentsNavigationContext } from './paymentsNavigation';

export function OwnerFinancePanel({
  paymentsNavigationContext,
  onPaymentsNavigationContextApplied,
  onNavigateSection,
}: {
  paymentsNavigationContext?: OwnerPaymentsNavigationContext;
  onPaymentsNavigationContextApplied?: () => void;
  onNavigateSection?: (page: string) => void;
}) {
  return (
    <MoneyWorkspace
      paymentsNavigationContext={paymentsNavigationContext}
      onPaymentsNavigationContextApplied={onPaymentsNavigationContextApplied}
      onNavigateSection={onNavigateSection}
    />
  );
}
