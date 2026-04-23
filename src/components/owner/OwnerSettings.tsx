import { Settings, MessageCircle, Lock, Shield, Download, Zap, Home, Eye, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface OwnerSettingsProps {
  onNavigateToAutomations?: () => void;
  onNavigateToLanding?: () => void;
}

export function OwnerSettings({ onNavigateToAutomations, onNavigateToLanding }: OwnerSettingsProps) {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-scale-in">
      <div>
        <h1 className="text-[#133C2A] mb-2">Настройки студии</h1>
        <p className="text-[#133C2A]/60">Управление информацией и интеграциями</p>
      </div>

      {/* Integrations */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]\">Интеграции и автоматизация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Public Landing Page Settings */}
          {!isMobile && onNavigateToLanding && (
            <button
              onClick={onNavigateToLanding}
              className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-[#1C8C64]/20 hover:border-[#1C8C64] hover:bg-[#1C8C64]/5 transition-smooth text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1C8C64] to-[#1C8C64]/70 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-[#133C2A] flex items-center gap-2">
                    Публичная страница
                    <span className="px-2 py-0.5 rounded-full bg-[#1C8C64] text-white text-xs">
                      Новое
                    </span>
                  </h4>
                  <p className="text-sm text-[#133C2A]/60">Настройка главной страницы сайта для клиентов</p>
                </div>
              </div>
              <div className="text-[#1C8C64]">→</div>
            </button>
          )}
          
          {/* Automations - Quick Link (только на десктопе) */}
          {!isMobile && onNavigateToAutomations && (
            <button
              onClick={onNavigateToAutomations}
              className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-[#D4AF37]/20 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 transition-smooth text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#D4AF37]/70 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-[#133C2A] flex items-center gap-2">
                    Автоматизации
                    <span className="px-2 py-0.5 rounded-full bg-[#D4AF37] text-white text-xs">
                      Премиум
                    </span>
                  </h4>
                  <p className="text-sm text-[#133C2A]/60">Настройка автоматических действий и уведомлений</p>
                </div>
              </div>
              <div className="text-[#D4AF37]">→</div>
            </button>
          )}

          <div className="flex items-center justify-between p-4 rounded-2xl border border-[#133C2A]/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <h4 className="text-[#133C2A]">Telegram Bot</h4>
                <p className="text-sm text-[#133C2A]/60">Автоматические уведомления</p>
              </div>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl border border-[#133C2A]/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#133C2A]/10 flex items-center justify-center">
                <Settings className="w-6 h-6 text-[#133C2A]" />
              </div>
              <div>
                <h4 className="text-[#133C2A]">Платежная система</h4>
                <p className="text-sm text-[#133C2A]/60">YooKassa / Stripe</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#D4AF37]" />
            Безопасность
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F4E3]">
            <div className="flex items-center gap-4">
              <Lock className="w-5 h-5 text-[#D4AF37]" />
              <div>
                <h4 className="text-[#133C2A]">Двухфакторная аутентификация</h4>
                <p className="text-sm text-[#133C2A]/60">Дополнительная защита аккаунта</p>
              </div>
            </div>
            <Switch />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>API Token</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value="••••••••••••••••••••••••••••••••"
                className="rounded-2xl border-[#133C2A]/20"
              />
              <Button variant="outline" className="rounded-2xl border-[#133C2A]/20">
                Копировать
              </Button>
            </div>
          </div>

          <Button variant="outline" className="w-full rounded-2xl border-[#133C2A]/20 text-[#133C2A]">
            Просмотреть журнал активности
          </Button>
        </CardContent>
      </Card>

      {/* Export */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Экспорт данных</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full rounded-2xl border-[#133C2A]/20 justify-start gap-3 h-auto py-4"
          >
            <Download className="w-5 h-5 text-[#D4AF37]" />
            <div className="text-left">
              <p className="text-[#133C2A]">Скачать отчет в CSV</p>
              <p className="text-xs text-[#133C2A]/60">Данные учеников и финансы</p>
            </div>
          </Button>

          <Button 
            variant="outline" 
            className="w-full rounded-2xl border-[#133C2A]/20 justify-start gap-3 h-auto py-4"
          >
            <Download className="w-5 h-5 text-[#D4AF37]" />
            <div className="text-left">
              <p className="text-[#133C2A]">Скачать PDF сводку</p>
              <p className="text-xs text-[#133C2A]/60">Сводка с логотипом и подписью</p>
            </div>
          </Button>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A] flex items-center gap-2">
            <Home className="w-5 h-5 text-[#D4AF37]" />
            Дополнительные настройки
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F4E3]">
            <div className="flex items-center gap-4">
              <Eye className="w-5 h-5 text-[#D4AF37]" />
              <div>
                <h4 className="text-[#133C2A]">Просмотреь журнал активности</h4>
                <p className="text-sm text-[#133C2A]/60">История действий в системе</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-2xl border-[#133C2A]/20">
              Просмотреть
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" className="rounded-2xl border-[#133C2A]/20">
          Отменить
        </Button>
        <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90">
          Сохранить изменения
        </Button>
      </div>
    </div>
  );
}