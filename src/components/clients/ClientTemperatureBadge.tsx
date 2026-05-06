import { Badge } from '../ui/badge';
import { ClientTemperature, clientTemperatureClassName, clientTemperatureLabel } from './clientStatus';

export function ClientTemperatureBadge({ temperature }: { temperature: ClientTemperature }) {
  return (
    <Badge variant="outline" className={`rounded-full border ${clientTemperatureClassName[temperature]}`}>
      {clientTemperatureLabel[temperature]}
    </Badge>
  );
}
