import { Group } from '../../types';
import { ArchiveFilter, StageFilter, TemperatureFilter } from './clientsWorkspaceTypes';
import { Button } from '../ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function MobileClientFiltersSheet({
  open,
  onOpenChange,
  groups,
  sourceOptions,
  groupFilter,
  paymentFilter,
  sourceFilter,
  stageFilter,
  temperatureFilter,
  onGroupFilterChange,
  onPaymentFilterChange,
  onSourceFilterChange,
  onStageFilterChange,
  onTemperatureFilterChange,
  onReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: Group[];
  sourceOptions: string[];
  groupFilter: string;
  paymentFilter: string;
  sourceFilter: string;
  stageFilter: StageFilter;
  temperatureFilter: TemperatureFilter;
  onGroupFilterChange: (value: string) => void;
  onPaymentFilterChange: (value: string) => void;
  onSourceFilterChange: (value: string) => void;
  onStageFilterChange: (value: StageFilter) => void;
  onTemperatureFilterChange: (value: TemperatureFilter) => void;
  onReset: () => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[28px] border-[#133C2A]/10 bg-[#FCFAF0]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-[#133C2A]">Фильтры CRM</DrawerTitle>
          <DrawerDescription className="text-[#133C2A]/58">
            Дополнительные фильтры для базы клиентов и заявок.
          </DrawerDescription>
        </DrawerHeader>
        <div className="space-y-3 px-4 pb-2">
          <Select value={groupFilter} onValueChange={onGroupFilterChange}>
            <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Группа" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все группы</SelectItem>
              <SelectItem value="ungrouped">Без группы</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={onPaymentFilterChange}>
            <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Оплата" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все оплаты</SelectItem>
              <SelectItem value="paid">Оплачено</SelectItem>
              <SelectItem value="pending">На проверке</SelectItem>
              <SelectItem value="unpaid">Ждет оплату</SelectItem>
              <SelectItem value="overdue">Просрочено</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
            <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Источник" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все источники</SelectItem>
              {sourceOptions.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stageFilter} onValueChange={(value) => onStageFilterChange(value as StageFilter)}>
            <SelectTrigger className="rounded-2xl"><SelectValue placeholder="CRM-статус" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="leads">Новые и в работе</SelectItem>
              <SelectItem value="trials">Пробные</SelectItem>
              <SelectItem value="waiting_payment">Ждут оплату</SelectItem>
              <SelectItem value="active">Активные</SelectItem>
              <SelectItem value="risk">Риск</SelectItem>
              <SelectItem value="archive">Архив</SelectItem>
            </SelectContent>
          </Select>
          <Select value={temperatureFilter} onValueChange={(value) => onTemperatureFilterChange(value as TemperatureFilter)}>
            <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Температура" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Любая температура</SelectItem>
              <SelectItem value="hot">Горячие</SelectItem>
              <SelectItem value="warm">Теплые</SelectItem>
              <SelectItem value="cold">Холодные</SelectItem>
              <SelectItem value="problem">Проблемные</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DrawerFooter>
          <Button className="rounded-2xl bg-[#133C2A] text-white" onClick={() => onOpenChange(false)}>
            Применить
          </Button>
          <Button variant="outline" className="rounded-2xl border-[#133C2A]/12" onClick={onReset}>
            Сбросить
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
