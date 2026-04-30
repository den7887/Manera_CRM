import { useEffect, useState } from 'react';
import { Globe, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { loadOwnerLandingSettings, updateOwnerLandingSettings } from '../../lib/backendApi';
import { toast } from 'sonner';

interface LandingForm {
  hero_title: string;
  hero_subtitle: string;
  cta_label: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  map_url: string;
  published: boolean;
}

const defaultForm: LandingForm = {
  hero_title: '',
  hero_subtitle: '',
  cta_label: 'Записаться на пробное занятие',
  contact_phone: '',
  contact_email: '',
  address: '',
  map_url: '',
  published: true,
};

export function LandingSettings() {
  const [form, setForm] = useState<LandingForm>(defaultForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const data = await loadOwnerLandingSettings();
      setForm({
        hero_title: data.hero_title || '',
        hero_subtitle: data.hero_subtitle || '',
        cta_label: data.cta_label || 'Записаться на пробное занятие',
        contact_phone: data.contact_phone || '',
        contact_email: data.contact_email || '',
        address: data.address || '',
        map_url: data.map_url || '',
        published: Boolean(data.published),
      });
      setUpdatedAt(data.updated_at || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить настройки лендинга');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const save = async () => {
    if (!form.hero_title.trim() || !form.contact_phone.trim()) {
      toast.error('Заполните заголовок и контактный телефон');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await updateOwnerLandingSettings({
        ...form,
        hero_title: form.hero_title.trim(),
        hero_subtitle: form.hero_subtitle.trim(),
        cta_label: form.cta_label.trim(),
        contact_phone: form.contact_phone.trim(),
        contact_email: form.contact_email.trim(),
        address: form.address.trim(),
        map_url: form.map_url.trim(),
      });
      setForm({
        hero_title: updated.hero_title,
        hero_subtitle: updated.hero_subtitle,
        cta_label: updated.cta_label,
        contact_phone: updated.contact_phone,
        contact_email: updated.contact_email,
        address: updated.address,
        map_url: updated.map_url,
        published: updated.published,
      });
      setUpdatedAt(updated.updated_at || null);
      toast.success('Лендинг обновлен');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить настройки лендинга');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[#133C2A] mb-2">Лендинг</h1>
          <p className="text-[#133C2A]/60">Настройки публичной страницы без мок-данных</p>
        </div>
        {updatedAt ? <p className="text-xs text-[#133C2A]/50">Обновлено: {new Date(updatedAt).toLocaleString('ru-RU')}</p> : null}
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A] flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#D4AF37]" />
            Контент
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Заголовок</Label>
            <Input value={form.hero_title} onChange={(e) => setForm((prev) => ({ ...prev, hero_title: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Подзаголовок</Label>
            <Textarea value={form.hero_subtitle} onChange={(e) => setForm((prev) => ({ ...prev, hero_subtitle: e.target.value }))} rows={3} />
          </div>
          <div className="space-y-1">
            <Label>Текст кнопки</Label>
            <Input value={form.cta_label} onChange={(e) => setForm((prev) => ({ ...prev, cta_label: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Контакты</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Телефон</Label>
            <Input value={form.contact_phone} onChange={(e) => setForm((prev) => ({ ...prev, contact_phone: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={form.contact_email} onChange={(e) => setForm((prev) => ({ ...prev, contact_email: e.target.value }))} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Адрес</Label>
            <Input value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Ссылка карты</Label>
            <Input value={form.map_url} onChange={(e) => setForm((prev) => ({ ...prev, map_url: e.target.value }))} />
          </div>
          <div className="md:col-span-2 rounded-2xl border border-[#133C2A]/10 p-4 flex items-center justify-between">
            <div>
              <p className="text-[#133C2A]">Лендинг опубликован</p>
              <p className="text-sm text-[#133C2A]/60">При выключении страница скрывается для клиентов</p>
            </div>
            <Switch checked={form.published} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, published: checked }))} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => void save()}
          disabled={isLoading || isSaving}
          className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Сохраняем...' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
}
