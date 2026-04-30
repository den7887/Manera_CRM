import { useEffect, useState } from 'react';
import { Settings, Zap, Globe, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { loadOwnerSettings, updateOwnerSettings } from '../../lib/backendApi';
import { toast } from 'sonner';

interface OwnerSettingsProps {
  onNavigateToAutomations?: () => void;
  onNavigateToLanding?: () => void;
}

interface SettingsForm {
  studio_name: string;
  support_phone: string;
  support_email: string;
  city: string;
  address: string;
  timezone: string;
  currency: string;
  parent_registration_enabled: boolean;
}

const defaultForm: SettingsForm = {
  studio_name: '',
  support_phone: '',
  support_email: '',
  city: '',
  address: '',
  timezone: 'Europe/Moscow',
  currency: 'RUB',
  parent_registration_enabled: true,
};

export function OwnerSettings({ onNavigateToAutomations, onNavigateToLanding }: OwnerSettingsProps) {
  const [form, setForm] = useState<SettingsForm>(defaultForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const data = await loadOwnerSettings();
      setForm({
        studio_name: data.studio_name || '',
        support_phone: data.support_phone || '',
        support_email: data.support_email || '',
        city: data.city || '',
        address: data.address || '',
        timezone: data.timezone || 'Europe/Moscow',
        currency: data.currency || 'RUB',
        parent_registration_enabled: Boolean(data.parent_registration_enabled),
      });
      setUpdatedAt(data.updated_at || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить настройки');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const save = async () => {
    if (!form.studio_name.trim() || !form.support_phone.trim()) {
      toast.error('Заполните название студии и телефон');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await updateOwnerSettings({
        ...form,
        studio_name: form.studio_name.trim(),
        support_phone: form.support_phone.trim(),
        support_email: form.support_email.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        timezone: form.timezone.trim(),
        currency: form.currency.trim().toUpperCase(),
      });
      setForm({
        studio_name: updated.studio_name,
        support_phone: updated.support_phone,
        support_email: updated.support_email,
        city: updated.city,
        address: updated.address,
        timezone: updated.timezone,
        currency: updated.currency,
        parent_registration_enabled: updated.parent_registration_enabled,
      });
      setUpdatedAt(updated.updated_at || null);
      toast.success('Настройки сохранены');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить настройки');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[#133C2A] mb-2">Настройки студии</h1>
          <p className="text-[#133C2A]/60">Реальные параметры кабинета владельца</p>
        </div>
        {updatedAt ? (
          <p className="text-xs text-[#133C2A]/50">Обновлено: {new Date(updatedAt).toLocaleString('ru-RU')}</p>
        ) : null}
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#D4AF37]" />
            Основные параметры
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Название студии</Label>
            <Input value={form.studio_name} onChange={(e) => setForm((prev) => ({ ...prev, studio_name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Телефон поддержки</Label>
            <Input value={form.support_phone} onChange={(e) => setForm((prev) => ({ ...prev, support_phone: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Email поддержки</Label>
            <Input value={form.support_email} onChange={(e) => setForm((prev) => ({ ...prev, support_email: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Город</Label>
            <Input value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Адрес</Label>
            <Input value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Таймзона</Label>
            <Input value={form.timezone} onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Валюта</Label>
            <Input value={form.currency} onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} />
          </div>
          <div className="md:col-span-2 rounded-2xl border border-[#133C2A]/10 p-4 flex items-center justify-between">
            <div>
              <p className="text-[#133C2A]">Разрешить регистрацию родителей</p>
              <p className="text-sm text-[#133C2A]/60">Отключение блокирует создание родительских аккаунтов</p>
            </div>
            <Switch
              checked={form.parent_registration_enabled}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, parent_registration_enabled: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Переходы</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          <Button variant="outline" className="rounded-2xl justify-start gap-2" onClick={() => onNavigateToAutomations?.()}>
            <Zap className="w-4 h-4" />
            Автоматизации
          </Button>
          <Button variant="outline" className="rounded-2xl justify-start gap-2" onClick={() => onNavigateToLanding?.()}>
            <Globe className="w-4 h-4" />
            Лендинг
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={isLoading || isSaving} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Сохраняем...' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
}
