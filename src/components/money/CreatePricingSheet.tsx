import { Plus, Tag } from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { MoneyPricingDraft, formatMoney } from './moneyTypes';

export function CreatePricingSheet({
  open,
  onOpenChange,
  draft,
  onChange,
  onSubmit,
  isSubmitting,
  isEditing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: MoneyPricingDraft;
  onChange: (draft: MoneyPricingDraft) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  isEditing?: boolean;
}) {
  const finalPrice = Number(draft.hasDiscount ? draft.discountPrice : draft.basePrice) || 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] rounded-t-[28px] border-none bg-[#FCFBF6]">
        <DrawerHeader>
          <DrawerTitle className="text-[#133C2A]">{isEditing ? 'Редактировать тариф' : 'Новая позиция прайса'}</DrawerTitle>
          <DrawerDescription>
            {isEditing
              ? 'Изменения применятся ко всем новым продажам этого тарифа; уже оформленные абонементы не пересчитываются.'
              : 'Создайте новый тариф для продаж в разделе денег. Скидка при необходимости сразу применит новую стоимость.'}
          </DrawerDescription>
        </DrawerHeader>

        <div className="grid gap-5 overflow-y-auto px-4 pb-2">
          <section className="space-y-2">
            <Label>1. Название</Label>
            <Input
              className="rounded-2xl"
              value={draft.title}
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
              placeholder="Например: Летний абонемент"
            />
          </section>

          <section className="space-y-2">
            <Label>2. Стоимость</Label>
            <Input
              type="number"
              className="rounded-2xl"
              value={draft.basePrice}
              onChange={(event) => onChange({ ...draft, basePrice: event.target.value })}
              placeholder="0"
            />
          </section>

          <section className="space-y-3">
            <div className="flex items-start gap-3 rounded-2xl border border-[#133C2A]/10 bg-white p-4">
              <Checkbox
                id="pricing-classes-tracked"
                checked={draft.classesTracked}
                onCheckedChange={(checked) => onChange({ ...draft, classesTracked: checked === true })}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="pricing-classes-tracked" className="text-sm text-[#133C2A]">
                  Фиксированное число занятий
                </Label>
                <p className="text-sm text-[#133C2A]/58">
                  Включите для пакета вроде «8 занятий» — отметка посещения будет списывать одно занятие. Выключите для безлимитного тарифа по сроку (например, помесячного) — остаток занятий не считается.
                </p>
              </div>
            </div>
            {draft.classesTracked ? (
              <div className="space-y-2">
                <Label>Количество занятий</Label>
                <Input
                  type="number"
                  min="1"
                  className="rounded-2xl"
                  value={draft.classesCount}
                  onChange={(event) => onChange({ ...draft, classesCount: event.target.value })}
                  placeholder="8"
                />
              </div>
            ) : null}
          </section>

          <section className="space-y-3">
            <Label>3. Статус</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onChange({ ...draft, isActive: true })}
                className={`rounded-2xl border-2 p-4 text-left transition ${
                  draft.isActive ? 'border-[#133C2A] bg-[#EEF5F0]' : 'border-[#133C2A]/10 bg-white'
                }`}
              >
                <p className="text-sm text-[#133C2A]">Активен</p>
                <p className="mt-1 text-xs text-[#133C2A]/58">Можно продавать сразу</p>
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...draft, isActive: false })}
                className={`rounded-2xl border-2 p-4 text-left transition ${
                  !draft.isActive ? 'border-[#133C2A] bg-[#EEF5F0]' : 'border-[#133C2A]/10 bg-white'
                }`}
              >
                <p className="text-sm text-[#133C2A]">Неактивен</p>
                <p className="mt-1 text-xs text-[#133C2A]/58">Скрыт из продаж</p>
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-start gap-3 rounded-2xl border border-[#133C2A]/10 bg-white p-4">
              <Checkbox
                id="pricing-discount"
                checked={draft.hasDiscount}
                onCheckedChange={(checked) => onChange({ ...draft, hasDiscount: checked === true })}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="pricing-discount" className="text-sm text-[#133C2A]">
                  Есть скидка
                </Label>
                <p className="text-sm text-[#133C2A]/58">Включите, если эту позицию нужно продавать по сниженной цене.</p>
              </div>
            </div>

            {draft.hasDiscount ? (
              <div className="space-y-2">
                <Label>4. Новая стоимость</Label>
                <Input
                  type="number"
                  className="rounded-2xl"
                  value={draft.discountPrice}
                  onChange={(event) => onChange({ ...draft, discountPrice: event.target.value })}
                  placeholder="0"
                />
              </div>
            ) : null}
          </section>

          <div className="rounded-3xl bg-[#133C2A] p-4 text-white">
            <div className="flex items-center gap-2 text-sm text-white/72">
              <Tag className="h-4 w-4" />
              <span>{isEditing ? 'Что изменится' : 'Что будет создано'}</span>
            </div>
            <p className="mt-3 text-lg">{draft.title.trim() || 'Новая позиция прайса'}</p>
            <p className="mt-1 text-sm text-white/72">{finalPrice > 0 ? formatMoney(finalPrice) : 'Стоимость не указана'} · {draft.isActive ? 'Активен' : 'Неактивен'}</p>
            <p className="mt-1 text-sm text-white/72">
              {draft.classesTracked ? `${draft.classesCount || 0} занятий` : 'Без учёта лимита занятий'}
            </p>
            {draft.hasDiscount && draft.basePrice ? (
              <p className="mt-1 text-sm text-white/72">Базовая цена: {formatMoney(Number(draft.basePrice) || 0)}</p>
            ) : null}
          </div>
        </div>

        <DrawerFooter>
          <Button className="rounded-2xl" onClick={onSubmit} disabled={isSubmitting}>
            <Plus className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Сохраняем...' : isEditing ? 'Сохранить изменения' : 'Создать тариф'}
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
