import { AdminChildRecord, AdminPaymentRecord } from '../../lib/backendApi';
import { Copy, CreditCard, MessageSquareText, Receipt, Trash2, UserPlus2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer';

async function copyPhone(phone?: string | null) {
  if (!phone) {
    toast.info('Телефон не указан');
    return;
  }
  try {
    await navigator.clipboard.writeText(phone);
    toast.success('Телефон скопирован');
  } catch {
    toast.error('Не удалось скопировать телефон');
  }
}

export function MobileClientActionsSheet({
  open,
  onOpenChange,
  child,
  outstandingPayment,
  onOpen,
  onOpenPayments,
  onCreateInvoice,
  onRemind,
  onOpenTasks,
  onOpenComments,
  onOpenGroup,
  onDelete,
  isInvoicing,
  isReminding,
  isDeleting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: AdminChildRecord;
  outstandingPayment?: AdminPaymentRecord | null;
  onOpen: () => void;
  onOpenPayments: () => void;
  onCreateInvoice: () => void;
  onRemind?: () => void;
  onOpenTasks: () => void;
  onOpenComments: () => void;
  onOpenGroup: () => void;
  onDelete?: () => void;
  isInvoicing?: boolean;
  isReminding?: boolean;
  isDeleting?: boolean;
}) {
  const closeAndRun = (handler: () => void) => {
    onOpenChange(false);
    handler();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[28px] border-[#133C2A]/10 bg-[#FCFAF0]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-[#133C2A]">Что сделать с клиентом</DrawerTitle>
          <DrawerDescription className="text-[#133C2A]/58">
            {child.fullName || 'Ученик'} · {child.parentName || 'Родитель'}
          </DrawerDescription>
        </DrawerHeader>
        <div className="space-y-2 px-4 pb-2">
          <Button variant="outline" className="h-12 w-full justify-start rounded-2xl border-[#133C2A]/12" onClick={() => closeAndRun(onOpen)}>
            <Users className="mr-2 h-4 w-4" />
            Открыть карточку
          </Button>
          <Button variant="outline" className="h-12 w-full justify-start rounded-2xl border-[#133C2A]/12" onClick={() => closeAndRun(onOpenPayments)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Открыть оплаты
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full justify-start rounded-2xl border-[#133C2A]/12"
            onClick={() => closeAndRun(onCreateInvoice)}
            disabled={!child.clientId || isInvoicing}
          >
            <Receipt className="mr-2 h-4 w-4" />
            {isInvoicing ? 'Создаем счет...' : 'Выставить счет'}
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full justify-start rounded-2xl border-[#133C2A]/12"
            onClick={() => onRemind && closeAndRun(onRemind)}
            disabled={!outstandingPayment || !onRemind || isReminding}
          >
            <MessageSquareText className="mr-2 h-4 w-4" />
            {isReminding ? 'Отправляем...' : 'Напомнить об оплате'}
          </Button>
          <Button variant="outline" className="h-12 w-full justify-start rounded-2xl border-[#133C2A]/12" onClick={() => closeAndRun(onOpenGroup)}>
            <UserPlus2 className="mr-2 h-4 w-4" />
            Назначить группу
          </Button>
          <Button variant="outline" className="h-12 w-full justify-start rounded-2xl border-[#133C2A]/12" onClick={() => closeAndRun(onOpenTasks)}>
            <Users className="mr-2 h-4 w-4" />
            Открыть задачи
          </Button>
          <Button variant="outline" className="h-12 w-full justify-start rounded-2xl border-[#133C2A]/12" onClick={() => closeAndRun(onOpenComments)}>
            <MessageSquareText className="mr-2 h-4 w-4" />
            Добавить комментарий
          </Button>
          <Button variant="outline" className="h-12 w-full justify-start rounded-2xl border-[#133C2A]/12" onClick={() => void copyPhone(child.parentPhone)}>
            <Copy className="mr-2 h-4 w-4" />
            Скопировать телефон
          </Button>
          {onDelete ? (
            <Button
              variant="outline"
              className="h-12 w-full justify-start rounded-2xl border-[#D14343]/25 text-[#D14343] hover:bg-[#D14343]/8 hover:text-[#D14343]"
              onClick={() => closeAndRun(onDelete)}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Удаляем...' : 'Удалить заявку'}
            </Button>
          ) : null}
        </div>
        <DrawerFooter>
          <Button variant="outline" className="rounded-2xl border-[#133C2A]/12" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
