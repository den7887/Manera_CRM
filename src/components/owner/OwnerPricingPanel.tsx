import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, Tag, Undo2 } from 'lucide-react';
import { loadOwnerPricing, OwnerPricingPlanDto, updateOwnerPricingPlan } from '../../lib/backendApi';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface PlanDraft {
  title: string;
  price: string;
  classes_count: string;
  classes_tracked: boolean;
  duration_days: string;
  is_active: boolean;
}

type ActiveFilter = 'all' | 'active' | 'inactive';

function toDraft(plan: OwnerPricingPlanDto): PlanDraft {
  return {
    title: plan.title,
    price: String(plan.price),
    classes_count: typeof plan.classes_count === 'number' ? String(plan.classes_count) : '',
    classes_tracked: Boolean(plan.classes_tracked),
    duration_days: String(plan.duration_days || 30),
    is_active: Boolean(plan.is_active),
  };
}

function isDraftEqual(left: PlanDraft, right: PlanDraft): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function OwnerPricingPanel() {
  const [plans, setPlans] = useState<OwnerPricingPlanDto[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PlanDraft>>({});
  const [initialDrafts, setInitialDrafts] = useState<Record<string, PlanDraft>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');

  const refresh = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const list = await loadOwnerPricing();
      const sorted = [...list].sort((a, b) => a.code.localeCompare(b.code));
      setPlans(sorted);
      const nextDrafts: Record<string, PlanDraft> = {};
      sorted.forEach((plan) => {
        nextDrafts[plan.code] = toDraft(plan);
      });
      setDrafts(nextDrafts);
      setInitialDrafts(nextDrafts);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить прайс');
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      if (activeFilter === 'active') return plan.is_active;
      if (activeFilter === 'inactive') return !plan.is_active;
      return true;
    });
  }, [plans, activeFilter]);

  const summary = useMemo(() => {
    const activeCount = plans.filter((item) => item.is_active).length;
    const average = plans.length > 0 ? Math.round(plans.reduce((sum, item) => sum + item.price, 0) / plans.length) : 0;
    const dirtyCount = plans.filter((plan) => {
      const draft = drafts[plan.code];
      const initial = initialDrafts[plan.code];
      return draft && initial && !isDraftEqual(draft, initial);
    }).length;
    return { activeCount, average, total: plans.length, dirtyCount };
  }, [plans, drafts, initialDrafts]);

  const resetPlan = (planCode: string) => {
    const initial = initialDrafts[planCode];
    if (!initial) return;
    setDrafts((prev) => ({ ...prev, [planCode]: { ...initial } }));
  };

  const savePlan = async (plan: OwnerPricingPlanDto) => {
    const draft = drafts[plan.code];
    if (!draft) {
      return;
    }
    const price = Number(draft.price);
    const durationDays = Number(draft.duration_days);
    const classesCountRaw = draft.classes_count.trim();
    const classesCount = classesCountRaw ? Number(classesCountRaw) : null;

    if (!draft.title.trim()) {
      toast.error('Название абонемента не может быть пустым');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Некорректная стоимость');
      return;
    }
    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      toast.error('Некорректный срок действия');
      return;
    }
    if (draft.classes_tracked && (classesCount === null || !Number.isFinite(classesCount) || classesCount < 0)) {
      toast.error('Укажите количество занятий');
      return;
    }

    setSavingCode(plan.code);
    try {
      const updated = await updateOwnerPricingPlan(plan.code, {
        title: draft.title.trim(),
        price,
        classes_count: draft.classes_tracked ? classesCount : null,
        classes_tracked: draft.classes_tracked,
        duration_days: durationDays,
        is_active: draft.is_active,
      });
      const nextDraft = toDraft(updated);
      setPlans((prev) => prev.map((item) => (item.code === updated.code ? updated : item)));
      setDrafts((prev) => ({ ...prev, [updated.code]: nextDraft }));
      setInitialDrafts((prev) => ({ ...prev, [updated.code]: nextDraft }));
      toast.success(`План "${updated.title}" сохранен`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить план');
    } finally {
      setSavingCode(null);
    }
  };

  const saveAllChanged = async () => {
    const changedPlans = filteredPlans.filter((plan) => {
      const draft = drafts[plan.code];
      const initial = initialDrafts[plan.code];
      return draft && initial && !isDraftEqual(draft, initial);
    });
    if (changedPlans.length === 0) {
      toast.info('Нет изменений для сохранения');
      return;
    }
    setIsSavingAll(true);
    try {
      for (const plan of changedPlans) {
        await savePlan(plan);
      }
      toast.success(`Сохранено планов: ${changedPlans.length}`);
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Прайс</h1>
          <p className="text-[#133C2A]/60">Тарифы для добавления клиентов и выставления оплат</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
          <Button variant="outline" onClick={() => void refresh(true)} className="rounded-2xl" disabled={isRefreshing}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {isRefreshing ? 'Обновляем...' : 'Обновить'}
          </Button>
          <Button onClick={() => void saveAllChanged()} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" disabled={isSavingAll || summary.dirtyCount === 0}>
            <Save className="w-4 h-4 mr-2" />
            {isSavingAll ? 'Сохраняем...' : `Сохранить все (${summary.dirtyCount})`}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-5"><p className="text-xs text-[#133C2A]/60 md:text-sm">Тарифов</p><p className="text-2xl text-[#133C2A] md:text-3xl">{summary.total}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-5"><p className="text-xs text-[#133C2A]/60 md:text-sm">Активных</p><p className="text-2xl text-[#133C2A] md:text-3xl">{summary.activeCount}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-5"><p className="text-xs text-[#133C2A]/60 md:text-sm">Средняя цена</p><p className="text-xl text-[#133C2A] md:text-3xl">{summary.average.toLocaleString('ru-RU')} ₽</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-5"><p className="text-xs text-[#133C2A]/60 md:text-sm">Изменено</p><p className="text-2xl text-[#B8941F] md:text-3xl">{summary.dirtyCount}</p></CardContent></Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-[#133C2A] flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#D4AF37]" />
              Тарифные планы
            </CardTitle>
            <Select value={activeFilter} onValueChange={(value: ActiveFilter) => setActiveFilter(value)}>
              <SelectTrigger className="w-full rounded-xl sm:w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все планы</SelectItem>
                <SelectItem value="active">Только активные</SelectItem>
                <SelectItem value="inactive">Только неактивные</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-[#133C2A]/60">Загрузка...</p>
          ) : filteredPlans.length === 0 ? (
            <p className="text-[#133C2A]/60">Планы не найдены</p>
          ) : (
            filteredPlans.map((plan) => {
              const draft = drafts[plan.code];
              const initial = initialDrafts[plan.code];
              if (!draft || !initial) return null;
              const isDirty = !isDraftEqual(draft, initial);
              return (
                <div key={plan.id} className="rounded-2xl border border-[#133C2A]/10 p-3 space-y-3 md:p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <p className="text-[#133C2A]">{plan.code.toUpperCase()}</p>
                      <Badge variant="outline" className="rounded-xl">{draft.is_active ? 'Активен' : 'Выключен'}</Badge>
                      {isDirty && <Badge className="rounded-xl bg-[#FFF9E8] border border-[#D4AF37]/40 text-[#B8941F]">Есть изменения</Badge>}
                    </div>
                    <p className="text-xs text-[#133C2A]/50">Обновлен: {new Date(plan.updated_at).toLocaleString('ru-RU')}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Название</Label>
                      <Input value={draft.title} onChange={(e) => setDrafts((prev) => ({ ...prev, [plan.code]: { ...draft, title: e.target.value } }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Стоимость, ₽</Label>
                      <Input type="number" value={draft.price} onChange={(e) => setDrafts((prev) => ({ ...prev, [plan.code]: { ...draft, price: e.target.value } }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Срок действия, дней</Label>
                      <Input type="number" value={draft.duration_days} onChange={(e) => setDrafts((prev) => ({ ...prev, [plan.code]: { ...draft, duration_days: e.target.value } }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Количество занятий</Label>
                      <Input
                        type="number"
                        value={draft.classes_count}
                        disabled={!draft.classes_tracked}
                        placeholder={draft.classes_tracked ? 'Например: 8' : 'Учет выключен'}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [plan.code]: { ...draft, classes_count: e.target.value } }))}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#133C2A]/10 p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[#133C2A]">Учет занятий</p>
                      <p className="text-sm text-[#133C2A]/60">Для Про обычно выключен, для Хобби включен</p>
                    </div>
                    <Switch
                      checked={draft.classes_tracked}
                      onCheckedChange={(checked) => setDrafts((prev) => ({
                        ...prev,
                        [plan.code]: {
                          ...draft,
                          classes_tracked: checked,
                          classes_count: checked ? draft.classes_count : '',
                        },
                      }))}
                    />
                  </div>

                  <div className="rounded-2xl border border-[#133C2A]/10 p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[#133C2A]">План активен</p>
                      <p className="text-sm text-[#133C2A]/60">Неактивный план нельзя выбрать при добавлении клиента</p>
                    </div>
                    <Switch
                      checked={draft.is_active}
                      onCheckedChange={(checked) => setDrafts((prev) => ({ ...prev, [plan.code]: { ...draft, is_active: checked } }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                    <Button variant="outline" className="rounded-2xl" onClick={() => resetPlan(plan.code)} disabled={!isDirty || savingCode === plan.code}>
                      <Undo2 className="w-4 h-4 mr-2" />
                      Сбросить
                    </Button>
                    <Button
                      onClick={() => void savePlan(plan)}
                      disabled={savingCode === plan.code || !isDirty}
                      className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {savingCode === plan.code ? 'Сохраняем...' : 'Сохранить план'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
