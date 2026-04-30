import { useEffect, useMemo, useState } from 'react';
import { Bot, Plus, Trash2 } from 'lucide-react';
import { AutomationRule } from '../../types';
import {
  createOwnerAutomation,
  deleteOwnerAutomation,
  loadOwnerAutomations,
  updateOwnerAutomation,
} from '../../lib/backendApi';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';

const defaults = {
  name: '',
  triggerKey: 'subscription.expired',
  actionType: 'create_task',
  actionParams: '{"title":"Связаться с родителем"}',
};

export function OwnerAutomationsPanel() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draft, setDraft] = useState(defaults);

  const refresh = async () => {
    setIsLoading(true);
    try {
      setRules(await loadOwnerAutomations());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить автоматизации');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const stats = useMemo(
    () => ({
      total: rules.length,
      active: rules.filter((item) => item.isActive).length,
      disabled: rules.filter((item) => !item.isActive).length,
    }),
    [rules],
  );

  const createRule = async () => {
    if (!draft.name.trim()) {
      toast.error('Введите имя правила');
      return;
    }
    try {
      const params = draft.actionParams.trim() ? JSON.parse(draft.actionParams) : {};
      const created = await createOwnerAutomation({
        name: draft.name.trim(),
        trigger_key: draft.triggerKey.trim(),
        action_type: draft.actionType.trim(),
        action_params: params,
        is_active: true,
      });
      setRules((prev) => [created, ...prev]);
      setDraft(defaults);
      setIsDialogOpen(false);
      toast.success('Правило создано');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать правило');
    }
  };

  const toggleRule = async (rule: AutomationRule) => {
    try {
      const updated = await updateOwnerAutomation(rule.id, {
        name: rule.name,
        trigger_key: rule.triggerKey,
        action_type: rule.actionType,
        action_params: rule.actionParams as Record<string, any>,
        is_active: !rule.isActive,
      });
      setRules((prev) => prev.map((item) => (item.id === rule.id ? updated : item)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить правило');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Удалить правило автоматизации?')) {
      return;
    }
    try {
      await deleteOwnerAutomation(id);
      setRules((prev) => prev.filter((item) => item.id !== id));
      toast.success('Правило удалено');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить правило');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Автоматизации</h1>
          <p className="text-[#133C2A]/60">Триггеры и автоматические действия</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
          <Plus className="w-4 h-4 mr-2" />
          Новое правило
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Всего</p><p className="text-3xl text-[#133C2A]">{stats.total}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Активные</p><p className="text-3xl text-[#133C2A]">{stats.active}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Отключенные</p><p className="text-3xl text-[#133C2A]">{stats.disabled}</p></CardContent></Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader><CardTitle className="text-[#133C2A]">Правила</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-[#133C2A]/60">Загрузка...</p>
          ) : rules.length === 0 ? (
            <p className="text-[#133C2A]/60">Правил пока нет</p>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="rounded-2xl border border-[#133C2A]/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-[#133C2A]/70" />
                      <p className="text-[#133C2A]">{rule.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-xl">{rule.triggerKey}</Badge>
                      <Badge variant="outline" className="rounded-xl">{rule.actionType}</Badge>
                      <Badge variant="outline" className="rounded-xl">{rule.isActive ? 'Активно' : 'Отключено'}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={rule.isActive} onCheckedChange={() => void toggleRule(rule)} />
                    <Button size="sm" variant="outline" onClick={() => void remove(rule.id)} className="rounded-xl">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle className="text-[#133C2A]">Новое правило автоматизации</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Название</Label>
              <Input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Триггер</Label>
              <Input value={draft.triggerKey} onChange={(e) => setDraft((prev) => ({ ...prev, triggerKey: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Действие</Label>
              <Input value={draft.actionType} onChange={(e) => setDraft((prev) => ({ ...prev, actionType: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Параметры (JSON)</Label>
              <Textarea value={draft.actionParams} onChange={(e) => setDraft((prev) => ({ ...prev, actionParams: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-2xl">Отмена</Button>
            <Button onClick={() => void createRule()} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
