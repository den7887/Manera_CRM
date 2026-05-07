import { ExternalLink, ShieldCheck, TestTube2, Webhook } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

export function AcquiringSettingsCard({ onOpenSettings }: { onOpenSettings?: () => void }) {
  return (
    <Card className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F8F4E3] text-[#133C2A]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[#133C2A]">Интернет-эквайринг</p>
            <p className="text-sm text-[#133C2A]/58">Сейчас раздел готов под подключение провайдера и webhook.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#F8F4E3]/70 p-3">
            <p className="text-xs text-[#133C2A]/45">Статус</p>
            <p className="mt-1 text-sm text-[#133C2A]">Не подключен</p>
          </div>
          <div className="rounded-2xl bg-[#F8F4E3]/70 p-3">
            <p className="text-xs text-[#133C2A]/45">Режим</p>
            <p className="mt-1 text-sm text-[#133C2A]">Ручной / тестовый</p>
          </div>
          <div className="rounded-2xl bg-[#F8F4E3]/70 p-3">
            <p className="text-xs text-[#133C2A]/45">Webhook</p>
            <p className="mt-1 text-sm text-[#133C2A]">Архитектурное место готово</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={onOpenSettings}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Настроить провайдера
          </Button>
          <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" disabled>
            <TestTube2 className="mr-2 h-4 w-4" />
            Создать тестовый платеж
          </Button>
          <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" disabled>
            <Webhook className="mr-2 h-4 w-4" />
            Проверить webhook
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
