import { Badge } from '../ui/badge';
import { ClientStage, clientStageClassName, clientStageLabel } from './clientStatus';

export function ClientStatusBadge({ stage }: { stage: ClientStage }) {
  return (
    <Badge variant="outline" className={`rounded-full border ${clientStageClassName[stage]}`}>
      {clientStageLabel[stage]}
    </Badge>
  );
}
