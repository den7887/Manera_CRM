import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Zap, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

interface LeadsAutomationsInfoProps {
  onNavigateToAutomations?: () => void;
}

const leadAutomations = [
  {
    trigger: 'Новая заявка',
    action: 'Создаётся задача "Первый контакт"',
    timing: 'Через 1 день',
    isActive: true,
  },
  {
    trigger: 'Дата контакта наступила',
    action: 'Создаётся задача с запланированным действием',
    timing: 'В день контакта',
    isActive: true,
  },
  {
    trigger: 'Контакт просрочен',
    action: 'Создаётся срочная задача-напоминание',
    timing: 'Моментально',
    isActive: true,
  },
  {
    trigger: 'Статус → Записан на пробное',
    action: 'Создаётся задача "Подготовка к пробному"',
    timing: 'Через 1 день',
    isActive: true,
  },
  {
    trigger: 'Статус → Был на пробном',
    action: 'Создаётся задача "Обратная связь"',
    timing: 'Через 1 день',
    isActive: true,
  },
  {
    trigger: 'Статус → Думает',
    action: 'Создаётся задача повторного контакта',
    timing: 'Через 3 дня',
    isActive: true,
  },
  {
    trigger: 'Статус → Ждёт акцию',
    action: 'Создаётся задача об акциях',
    timing: 'Через 7 дней',
    isActive: true,
  },
  {
    trigger: 'Статус → Стал клиентом',
    action: 'Создаётся задача поздравления',
    timing: 'Моментально',
    isActive: true,
  },
  {
    trigger: 'Статус → Вернулся',
    action: 'Создаётся VIP-задача с высоким приоритетом',
    timing: 'Моментально',
    isActive: true,
  },
];

export function LeadsAutomationsInfo({ onNavigateToAutomations }: LeadsAutomationsInfoProps) {
  return (
    <Card className="p-6 rounded-2xl border-[#D4AF37]/20 bg-gradient-to-br from-white to-[#D4AF37]/5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-[#133C2A]">Автоматизации для лидов</h3>
            <p className="text-sm text-[#133C2A]/60">
              9 активных правил для автоматического создания задач
            </p>
          </div>
        </div>
        {onNavigateToAutomations && (
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToAutomations}
            className="rounded-xl border-[#D4AF37]/30 hover:bg-[#D4AF37]/10 text-[#D4AF37]"
          >
            Все правила
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {leadAutomations.slice(0, 5).map((automation, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#133C2A]/5 hover:border-[#D4AF37]/20 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
            
            <div className="flex-1 flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                {automation.trigger}
              </Badge>
              
              <ArrowRight className="w-3.5 h-3.5 text-[#133C2A]/30 flex-shrink-0" />
              
              <span className="text-[#133C2A]/70">{automation.action}</span>
            </div>

            <div className="flex items-center gap-1 text-xs text-[#133C2A]/50 flex-shrink-0">
              <Clock className="w-3.5 h-3.5" />
              <span>{automation.timing}</span>
            </div>
          </div>
        ))}
      </div>

      {leadAutomations.length > 5 && (
        <p className="text-xs text-[#133C2A]/50 mt-3 text-center">
          + ещё {leadAutomations.length - 5} правил автоматизации
        </p>
      )}

      <div className="mt-4 p-3 rounded-xl bg-[#1C8C64]/10 border border-[#1C8C64]/20">
        <p className="text-xs text-[#133C2A]">
          💡 <span className="text-[#133C2A]/70">Все автоматизации настроены и работают в фоновом режиме. Задачи создаются автоматически при изменении статусов и наступлении дат контактов.</span>
        </p>
      </div>
    </Card>
  );
}
