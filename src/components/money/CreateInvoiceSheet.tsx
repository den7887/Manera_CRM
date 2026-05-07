import { AdminClientRecord } from '../../lib/backendApi';
import { Button } from '../ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { MoneyInvoiceDraft } from './moneyTypes';

export function CreateInvoiceSheet({
  open,
  onOpenChange,
  clients,
  draft,
  onChange,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: AdminClientRecord[];
  draft: MoneyInvoiceDraft;
  onChange: (draft: MoneyInvoiceDraft) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] rounded-t-[28px] border-none bg-[#FCFBF6]">
        <DrawerHeader>
          <DrawerTitle className="text-[#133C2A]">Выставить счет</DrawerTitle>
          <DrawerDescription>Выберите ребенка, сумму и срок оплаты. После создания счет появится в очереди оплат.</DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-4 px-4 pb-2">
          <div className="space-y-2">
            <Label>Кому</Label>
            <Select value={draft.clientId} onValueChange={(value) => onChange({ ...draft, clientId: value })}>
              <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Выберите ребенка" /></SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.childFullName || 'Ребенок'} · {client.parentName || client.parentPhone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Сумма</Label>
              <Input type="number" className="rounded-2xl" value={draft.amount} onChange={(event) => onChange({ ...draft, amount: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Способ</Label>
              <Select value={draft.paymentMethod} onValueChange={(value: 'cash' | 'online') => onChange({ ...draft, paymentMethod: value })}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Онлайн</SelectItem>
                  <SelectItem value="cash">Наличные</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Срок оплаты</Label>
            <Input type="date" className="rounded-2xl" value={draft.dueDate} onChange={(event) => onChange({ ...draft, dueDate: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Комментарий</Label>
            <Textarea className="min-h-[110px] rounded-2xl" value={draft.comment} onChange={(event) => onChange({ ...draft, comment: event.target.value })} />
          </div>
        </div>
        <DrawerFooter>
          <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" onClick={onSubmit} disabled={isSubmitting}>
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

