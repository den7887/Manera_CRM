import { Button } from '../ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { MoneyPaymentFiltersState } from './moneyTypes';

export function MoneyFiltersSheet({
  open,
  onOpenChange,
  filters,
  onChange,
  onReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: MoneyPaymentFiltersState;
  onChange: (next: MoneyPaymentFiltersState) => void;
  onReset: () => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[86vh] rounded-t-[28px] border-none bg-[#FCFBF6]">
        <DrawerHeader>
          <DrawerTitle className="text-[#133C2A]">Фильтры оплат</DrawerTitle>
          <DrawerDescription>Период и клиент добавим отдельным backend-этапом. Сейчас доступны главные фильтры по статусу, способу и типу платежа.</DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-4 px-4 pb-2">
          <div className="space-y-2">
            <Label>Статус</Label>
            <Select value={filters.status} onValueChange={(value: MoneyPaymentFiltersState['status']) => onChange({ ...filters, status: value })}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="unpaid">Ждет оплату</SelectItem>
                <SelectItem value="pending">Нужно проверить</SelectItem>
                <SelectItem value="overdue">Просрочено</SelectItem>
                <SelectItem value="paid">Оплачено</SelectItem>
                <SelectItem value="failed">Ошибка</SelectItem>
                <SelectItem value="cancelled">Отменено</SelectItem>
                <SelectItem value="refunded">Возврат</SelectItem>
                <SelectItem value="expired">Ссылка истекла</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Способ оплаты</Label>
            <Select value={filters.method} onValueChange={(value: MoneyPaymentFiltersState['method']) => onChange({ ...filters, method: value })}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все способы</SelectItem>
                <SelectItem value="cash">Наличные</SelectItem>
                <SelectItem value="online">Онлайн</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Тип платежа</Label>
            <Select value={filters.type} onValueChange={(value: MoneyPaymentFiltersState['type']) => onChange({ ...filters, type: value })}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="trial">Пробное</SelectItem>
                <SelectItem value="subscription">Абонемент</SelectItem>
                <SelectItem value="renewal">Продление</SelectItem>
                <SelectItem value="event">Мероприятие</SelectItem>
                <SelectItem value="individual">Индивидуальное</SelectItem>
                <SelectItem value="custom">Другое</SelectItem>
                <SelectItem value="debt">Долг</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Поиск</Label>
            <Input value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} className="rounded-2xl" />
          </div>
        </div>
        <DrawerFooter>
          <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" onClick={() => onOpenChange(false)}>
            Применить
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={onReset}>
            Сбросить
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

