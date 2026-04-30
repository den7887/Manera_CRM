import { Construction, Database, Rocket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface FeatureInDevelopmentProps {
  sectionName: string;
  roleLabel: string;
  description?: string;
}

export function FeatureInDevelopment({
  sectionName,
  roleLabel,
  description,
}: FeatureInDevelopmentProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-2xl border border-[#133C2A]/10 soft-shadow">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white flex items-center justify-center">
              <Construction className="w-7 h-7" />
            </div>
            <Badge className="bg-[#D4AF37]/15 text-[#133C2A] border border-[#D4AF37]/30">
              В разработке
            </Badge>
          </div>
          <CardTitle className="text-[#133C2A]">
            Раздел «{sectionName}» подключается
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-[#133C2A]/75">
          <p>
            Для роли «{roleLabel}» этот раздел пока не подключен к серверной БД.
            {' '}После интеграции здесь появятся реальные данные и действия.
          </p>
          {description ? <p>{description}</p> : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-[#133C2A]/10 bg-white p-3 flex items-start gap-2">
              <Database className="w-4 h-4 mt-0.5 text-[#D4AF37]" />
              <p className="text-sm">Сейчас для демо-входа используются моковые данные.</p>
            </div>
            <div className="rounded-xl border border-[#133C2A]/10 bg-white p-3 flex items-start gap-2">
              <Rocket className="w-4 h-4 mt-0.5 text-[#D4AF37]" />
              <p className="text-sm">Подключение будет включаться поэтапно, без ломки текущего интерфейса.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
