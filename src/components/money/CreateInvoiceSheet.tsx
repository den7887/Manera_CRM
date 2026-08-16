import { addDays } from 'date-fns';
import { useMemo } from 'react';
import { Banknote, CreditCard, ReceiptText } from 'lucide-react';
import { AdminClientRecord, OwnerPricingPlanDto } from '../../lib/backendApi';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { MoneyInvoiceDraft, formatMoney, moneyInvoiceTargetLabels } from './moneyTypes';

function dueDatePreset(days: number): string {
  return addDays(new Date(), days).toISOString().slice(0, 10);
}

function paymentTypeUsesPlan(type: MoneyInvoiceDraft['paymentType']): boolean {
  return ['subscription', 'renewal'].includes(type);
}

function paymentTypeSupportsCustomStart(type: MoneyInvoiceDraft['paymentType']): boolean {
  return ['subscription', 'renewal'].includes(type);
}

export function CreateInvoiceSheet({
  open,
  onOpenChange,
  clients,
  pricingPlans,
  draft,
  onChange,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: AdminClientRecord[];
  pricingPlans: OwnerPricingPlanDto[];
  draft: MoneyInvoiceDraft;
  onChange: (draft: MoneyInvoiceDraft) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}) {
  const showPlanField = paymentTypeUsesPlan(draft.paymentType);
  const showStartDateToggle = paymentTypeSupportsCustomStart(draft.paymentType);
  const selectedPlan = pricingPlans.find((plan) => plan.code === draft.planCode);
  const parentOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; phone: string }>();
    clients.forEach((client) => {
      if (!client.parentUserId) return;
      if (!map.has(client.parentUserId)) {
        map.set(client.parentUserId, {
          id: client.parentUserId,
          name: client.parentName || 'Родитель',
          phone: client.parentPhone || '',
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);
  const childrenForParent = useMemo(() => {
    const source = draft.parentUserId
      ? clients.filter((client) => client.parentUserId === draft.parentUserId)
      : clients;
    return source
      .map((client) => ({
        clientId: client.id,
        childName: client.childFullName || 'Ребенок',
      }))
      .sort((a, b) => a.childName.localeCompare(b.childName));
  }, [clients, draft.parentUserId]);
  const isNewParentFlow = !draft.parentUserId;
  const isNewChildFlow = draft.parentUserId ? !draft.clientId : true;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] rounded-t-[28px] border-none bg-[#FCFBF6]">
        <DrawerHeader>
          <DrawerTitle className="text-[#133C2A]">Выставить счет</DrawerTitle>
          <DrawerDescription>Новый платеж за пробное, абонемент или продление. После создания счет попадет в очередь оплат.</DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-5 overflow-y-auto px-4 pb-2">
          <section className="space-y-3">
            <Label>1. Родитель и контакт</Label>
            <Select
              value={draft.parentUserId || 'new'}
              onValueChange={(value) => {
                if (value === 'new') {
                  onChange({ ...draft, parentUserId: '', clientId: '' });
                  return;
                }
                const selectedParent = parentOptions.find((parent) => parent.id === value);
                const parentChildren = clients.filter((client) => client.parentUserId === value);
                onChange({
                  ...draft,
                  parentUserId: value,
                  parentPhone: selectedParent?.phone || draft.parentPhone,
                  parentFullName: selectedParent?.name || draft.parentFullName,
                  clientId: parentChildren.length === 1 ? parentChildren[0].id : '',
                  childFullName: '',
                });
              }}
            >
              <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Выберите родителя" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">+ Новый родитель</SelectItem>
                {parentOptions.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name} · {parent.phone || 'без телефона'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Телефон родителя</Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="+7 999 000-00-00"
                  className="rounded-2xl"
                  value={draft.parentPhone}
                  onChange={(event) => onChange({ ...draft, parentPhone: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Имя родителя</Label>
                <Input
                  type="text"
                  placeholder="ФИО родителя"
                  className="rounded-2xl"
                  value={draft.parentFullName}
                  onChange={(event) => onChange({ ...draft, parentFullName: event.target.value })}
                  disabled={!isNewParentFlow}
                />
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <Label>2. Ребенок</Label>
            <Select
              value={isNewChildFlow ? 'new' : draft.clientId}
              onValueChange={(value) => {
                if (value === 'new') {
                  onChange({ ...draft, clientId: '' });
                  return;
                }
                const selectedClient = clients.find((client) => client.id === value);
                onChange({
                  ...draft,
                  clientId: value,
                  childFullName: '',
                  parentUserId: selectedClient?.parentUserId || draft.parentUserId,
                  parentPhone: selectedClient?.parentPhone || draft.parentPhone,
                  parentFullName: selectedClient?.parentName || draft.parentFullName,
                });
              }}
            >
              <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Выберите ребенка" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">+ Добавить нового ребенка</SelectItem>
                {childrenForParent.map((item) => (
                  <SelectItem key={item.clientId} value={item.clientId}>
                    {item.childName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isNewChildFlow ? (
              <Input
                type="text"
                className="rounded-2xl"
                placeholder="Имя нового ребенка"
                value={draft.childFullName}
                onChange={(event) => onChange({ ...draft, childFullName: event.target.value })}
              />
            ) : null}
          </section>

          <section className="space-y-3">
            <Label>3. За что</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(moneyInvoiceTargetLabels).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    const nextType = value as MoneyInvoiceDraft['paymentType'];
                    const nextNeedsPlan = paymentTypeUsesPlan(nextType);
                    const nextSupportsStart = paymentTypeSupportsCustomStart(nextType);
                    onChange({
                      ...draft,
                      paymentType: nextType,
                      planCode: nextNeedsPlan ? draft.planCode : '',
                      useCustomStartsAt: nextSupportsStart ? draft.useCustomStartsAt : false,
                    });
                  }}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    draft.paymentType === value ? 'border-[#133C2A] bg-[#EEF5F0] text-[#133C2A]' : 'border-[#133C2A]/12 bg-white text-[#133C2A]/68'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {showPlanField ? (
            <section className="space-y-2">
              <Label>3. Тариф</Label>
              <Select
                value={draft.planCode}
                onValueChange={(value) => {
                  const plan = pricingPlans.find((entry) => entry.code === value);
                  onChange({
                    ...draft,
                    planCode: value,
                    amount: plan ? String(plan.price) : draft.amount,
                    comment: plan && !draft.comment ? `${moneyInvoiceTargetLabels[draft.paymentType]} · ${plan.title}` : draft.comment,
                  });
                }}
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue placeholder="Выберите тариф" />
                </SelectTrigger>
                <SelectContent>
                  {pricingPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.code}>
                      {plan.title} · {formatMoney(plan.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPlan ? (
                <div className="rounded-2xl border border-[#133C2A]/10 bg-[#F8F4E3]/60 p-3 text-sm text-[#133C2A]/62">
                  {selectedPlan.classes_tracked ? `${selectedPlan.classes_count || 0} занятий` : 'Учет по сроку'} · действует {selectedPlan.duration_days} дней
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>4. Сумма</Label>
              <Input type="number" className="rounded-2xl" value={draft.amount} onChange={(event) => onChange({ ...draft, amount: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>5. Срок оплаты</Label>
              <Input type="date" className="rounded-2xl" value={draft.dueDate} onChange={(event) => onChange({ ...draft, dueDate: event.target.value })} />
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Сегодня', value: dueDatePreset(0) },
              { label: 'Завтра', value: dueDatePreset(1) },
              { label: 'Через 3 дня', value: dueDatePreset(3) },
            ].map((preset) => (
              <Button key={preset.label} type="button" variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={() => onChange({ ...draft, dueDate: preset.value })}>
                {preset.label}
              </Button>
            ))}
          </div>

          {showStartDateToggle ? (
            <section className="space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-[#133C2A]/10 bg-white p-4">
                <Checkbox
                  id="invoice-custom-start-date"
                  checked={draft.useCustomStartsAt}
                  onCheckedChange={(checked) => onChange({ ...draft, useCustomStartsAt: checked === true })}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="invoice-custom-start-date" className="text-sm text-[#133C2A]">
                    Перенести начало действия
                  </Label>
                  <p className="text-sm text-[#133C2A]/58">По умолчанию абонемент начнется в день оплаты. Включите, если старт должен быть позже.</p>
                </div>
              </div>

              {draft.useCustomStartsAt ? (
                <>
                  <div className="space-y-2">
                    <Label>6. Начало действия</Label>
                    <Input type="date" className="rounded-2xl" value={draft.startsAt} onChange={(event) => onChange({ ...draft, startsAt: event.target.value })} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Старт сегодня', value: dueDatePreset(0) },
                      { label: 'Старт завтра', value: dueDatePreset(1) },
                      { label: 'Старт через 3 дня', value: dueDatePreset(3) },
                    ].map((preset) => (
                      <Button key={preset.label} type="button" variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={() => onChange({ ...draft, startsAt: preset.value })}>
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </>
              ) : null}
            </section>
          ) : null}

          <section className="space-y-3">
            <Label>{showStartDateToggle ? '7. Способ оплаты' : '6. Способ оплаты'}</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onChange({ ...draft, paymentMethod: 'online' })}
                className={`rounded-2xl border-2 p-4 text-left transition ${
                  draft.paymentMethod === 'online' ? 'border-[#133C2A] bg-[#EEF5F0]' : 'border-[#133C2A]/10 bg-white'
                }`}
              >
                <CreditCard className="h-5 w-5 text-[#133C2A]" />
                <p className="mt-3 text-sm text-[#133C2A]">Онлайн</p>
                <p className="mt-1 text-xs text-[#133C2A]/58">Ссылка для родителя или эквайринг</p>
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...draft, paymentMethod: 'cash' })}
                className={`rounded-2xl border-2 p-4 text-left transition ${
                  draft.paymentMethod === 'cash' ? 'border-[#133C2A] bg-[#EEF5F0]' : 'border-[#133C2A]/10 bg-white'
                }`}
              >
                <Banknote className="h-5 w-5 text-[#133C2A]" />
                <p className="mt-3 text-sm text-[#133C2A]">Наличные</p>
                <p className="mt-1 text-xs text-[#133C2A]/58">Потребуется ручное подтверждение</p>
              </button>
            </div>
          </section>

          <section className="space-y-2">
            <Label>{showStartDateToggle ? '8. Комментарий' : '7. Комментарий'}</Label>
            <Textarea
              className="min-h-[110px] rounded-2xl"
              value={draft.comment}
              onChange={(event) => onChange({ ...draft, comment: event.target.value })}
              placeholder="Например: пробное занятие 10 мая, отправить ссылку маме в WhatsApp"
            />
          </section>

          <div className="rounded-3xl bg-[#133C2A] p-4 text-white">
            <div className="flex items-center gap-2 text-sm text-white/72">
              <ReceiptText className="h-4 w-4" />
              <span>Что будет создано</span>
            </div>
            <p className="mt-3 text-lg">
              {selectedPlan?.title || moneyInvoiceTargetLabels[draft.paymentType]} · {draft.amount ? formatMoney(Number(draft.amount)) : 'Сумма не указана'}
            </p>
            <p className="mt-1 text-sm text-white/72">
              {draft.dueDate ? `До ${new Date(draft.dueDate).toLocaleDateString('ru-RU')}` : 'Срок оплаты не выбран'} · {draft.paymentMethod === 'cash' ? 'Наличные' : 'Онлайн'}
            </p>
            {showStartDateToggle && draft.useCustomStartsAt ? (
              <p className="mt-1 text-sm text-white/72">
                Начало действия с {new Date(draft.startsAt).toLocaleDateString('ru-RU')}
              </p>
            ) : null}
          </div>
        </div>
        <DrawerFooter>
          <Button className="rounded-2xl" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Создаем...' : 'Создать счет'}
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
