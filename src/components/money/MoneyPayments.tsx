import { useState } from 'react';
import { Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { AdminPaymentRecord } from '../../lib/backendApi';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { PaymentCard } from './PaymentCard';
import { MoneyEmptyState } from './MoneyEmptyState';
import { MoneyOverviewSummary, MoneyPaymentFiltersState, formatMoney, getDisplayPaymentStatus, getPaymentMethodLabel, getPaymentStatusLabel } from './moneyTypes';

export function MoneyPayments({
  payments,
  summary,
  filters,
  onChangeFilters,
  onOpenFilters,
  onCreateInvoice,
  onOpenPayment,
  onRemind,
  onCopyLink,
  onConfirm,
  onCancel,
  onMarkCash,
  onChangeMethod,
  onChangeDueDate,
  onDelete,
  isDeletingPaymentId,
  activeContextLabel,
}: {
  payments: AdminPaymentRecord[];
  summary: MoneyOverviewSummary;
  filters: MoneyPaymentFiltersState;
  onChangeFilters: (next: MoneyPaymentFiltersState) => void;
  onOpenFilters: () => void;
  onCreateInvoice: () => void;
  onOpenPayment: (payment: AdminPaymentRecord) => void;
  onRemind: (payment: AdminPaymentRecord) => void;
  onCopyLink: (payment: AdminPaymentRecord) => void;
  onConfirm: (payment: AdminPaymentRecord) => void;
  onCancel: (payment: AdminPaymentRecord) => void;
  onMarkCash: (payment: AdminPaymentRecord) => void;
  onChangeMethod: (
    payment: AdminPaymentRecord,
    nextMethod: 'cash' | 'online',
    options?: { confirmCashImmediately?: boolean },
  ) => Promise<void>;
  onChangeDueDate: (payment: AdminPaymentRecord) => void;
  onDelete?: (payment: AdminPaymentRecord) => void;
  isDeletingPaymentId?: string | null;
  activeContextLabel?: string | null;
}) {
  const isMobile = useIsMobile();
  const [phoneDialog, setPhoneDialog] = useState<{ name: string; phone: string } | null>(null);
  const [methodDialogPayment, setMethodDialogPayment] = useState<AdminPaymentRecord | null>(null);
  const [methodChoice, setMethodChoice] = useState<'cash' | 'online'>('online');
  const [isMethodSubmitting, setIsMethodSubmitting] = useState(false);
  const totalAmount = payments.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const pendingAmount = payments.filter((payment) => payment.status === 'pending' || payment.status === 'unpaid').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const handleCallParent = (payment: AdminPaymentRecord) => {
    const phone = payment.parentPhone?.trim();
    if (!phone) {
      return;
    }
    if (isMobile) {
      window.location.href = `tel:${phone}`;
      return;
    }
    setPhoneDialog({
      name: payment.parentName || payment.childName || 'Родитель',
      phone,
    });
  };

  const openMethodDialog = (payment: AdminPaymentRecord) => {
    setMethodDialogPayment(payment);
    setMethodChoice(payment.paymentMethod || 'online');
  };

  const submitMethodChange = async (confirmCashImmediately = false) => {
    if (!methodDialogPayment) return;
    setIsMethodSubmitting(true);
    try {
      await onChangeMethod(methodDialogPayment, methodChoice, { confirmCashImmediately });
      setMethodDialogPayment(null);
    } finally {
      setIsMethodSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="rounded-[28px] border border-[#133C2A]/10 bg-gradient-to-r from-[#133C2A] to-[#1d5a3f] px-5 py-5 text-white">
        <p className="text-xs uppercase tracking-[0.16em] text-white/65">Сегодня нужно обработать</p>
        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl">Оплаты клиентов</h2>
            <p className="mt-1 text-sm text-white/72">Счета, просрочки и проверка оплат в одном потоке.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-white/72">
            <span>{summary.reviewCount} на проверке</span>
            <span>•</span>
            <span>{summary.waitingCount} ждут оплату</span>
            <span>•</span>
            <span>{summary.overdueCount} просрочено</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A]">Оплаты клиентов</h1>
          <p className="mt-1 text-sm text-[#133C2A]/60">Счета, просрочки, проверка оплат и быстрые действия по каждому ребенку.</p>
        </div>
        <Button className="rounded-2xl bg-[#133C2A]" onClick={onCreateInvoice}>
          <Plus className="mr-2 h-4 w-4" />
          Выставить счет
        </Button>
      </div>

      {activeContextLabel ? (
        <div className="rounded-2xl border border-[#D4AF37]/35 bg-[#FFF9E8] px-4 py-3 text-sm text-[#8B6B00]">
          {activeContextLabel}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SummaryBox title="Всего получено" value={formatMoney(totalAmount)} valueClassName="text-[#133C2A]" />
        <SummaryBox title="Ожидает оплаты" value={formatMoney(pendingAmount)} valueClassName="text-[#8B6B00]" />
        <SummaryBox title="Всего платежей" value={String(payments.length)} valueClassName="text-[#133C2A]" />
      </div>

      <Card className="border-none bg-white/92 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Список платежей</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#133C2A]/38" />
              <Input
                className="rounded-2xl border-2 border-[#D4AF37]/30 bg-[#FFFEF8] pl-9"
                placeholder="Поиск по клиенту или описанию..."
                value={filters.search}
                onChange={(event) => onChangeFilters({ ...filters, search: event.target.value })}
              />
            </div>
            <select
              value={filters.status}
              onChange={(event) => onChangeFilters({ ...filters, status: event.target.value as MoneyPaymentFiltersState['status'] })}
              className="w-full rounded-2xl border border-[#133C2A]/12 bg-white px-4 py-3 text-sm text-[#133C2A] outline-none md:w-[220px]"
            >
              <option value="all">Все статусы</option>
              <option value="paid">Оплачено</option>
              <option value="unpaid">Не оплачено</option>
              <option value="overdue">Просрочено</option>
              <option value="cancelled">Отменен</option>
            </select>
            <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={onOpenFilters}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Фильтры
            </Button>
          </div>

          {payments.length === 0 ? (
            <MoneyEmptyState
              title="Платежи не найдены"
              description="Попробуйте изменить фильтры или создайте новый счет."
              action={
                <Button className="rounded-2xl bg-[#133C2A]" onClick={onCreateInvoice}>
                  Принять оплату
                </Button>
              }
            />
          ) : isMobile ? (
            <div className="space-y-3">
              {payments.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  onOpen={onOpenPayment}
                  onRemind={onRemind}
                  onCopyLink={onCopyLink}
                  onConfirm={onConfirm}
                  onCancel={onCancel}
                  onMarkCash={onMarkCash}
                  onChangeMethod={openMethodDialog}
                  onChangeDueDate={onChangeDueDate}
                  onCallParent={handleCallParent}
                  onDelete={onDelete}
                  isDeleting={isDeletingPaymentId === payment.id}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#133C2A]/10">
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">ID</th>
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Дата</th>
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Клиент</th>
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Описание</th>
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Способ</th>
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Сумма</th>
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Статус</th>
                    <th className="px-4 py-3 text-left text-sm text-[#133C2A]/58">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const displayStatus = getDisplayPaymentStatus(payment.status);
                    const statusTone =
                      displayStatus === 'paid'
                        ? 'bg-[#EEF5F0] text-[#133C2A]'
                        : displayStatus === 'overdue'
                          ? 'bg-[#FCEBEC] text-[#B84949]'
                          : displayStatus === 'cancelled'
                            ? 'bg-slate-100 text-slate-700'
                          : 'bg-[#FFF5DB] text-[#8B6B00]';
                    return (
                    <tr key={payment.id} className="border-b border-[#133C2A]/8 hover:bg-[#F8F4E3]/28">
                      <td className="px-4 py-3 text-sm text-[#133C2A]/62">#{payment.id}</td>
                      <td className="px-4 py-3 text-sm text-[#133C2A]/62">
                        {new Date(payment.createdAt).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#133C2A]">{payment.childName || payment.parentName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-[#133C2A]">{payment.subscriptionName}</td>
                      <td className="px-4 py-3 text-sm text-[#133C2A]/62">{getPaymentMethodLabel(payment.paymentMethod)}</td>
                      <td className="px-4 py-3 text-sm text-[#133C2A]">{formatMoney(payment.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${statusTone}`}>
                          {getPaymentStatusLabel(payment.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {payment.paymentMethod === 'cash' && !['paid', 'cancelled', 'refunded', 'expired'].includes(payment.status) ? (
                            <Button size="sm" variant="outline" className="rounded-xl border-[#133C2A]/15" onClick={() => onMarkCash(payment)}>
                              Подтвердить
                            </Button>
                          ) : null}
                          {!['paid', 'cancelled', 'refunded', 'expired'].includes(payment.status) ? (
                            <Button size="sm" variant="outline" className="rounded-xl border-[#133C2A]/15" onClick={() => openMethodDialog(payment)}>
                              Способ оплаты
                            </Button>
                          ) : null}
                          {payment.status === 'pending' && payment.paymentMethod !== 'cash' ? (
                            <Button size="sm" variant="outline" className="rounded-xl border-[#133C2A]/15" onClick={() => onConfirm(payment)}>
                              Подтвердить
                            </Button>
                          ) : null}
                          {payment.status === 'unpaid' || payment.status === 'overdue' ? (
                            <Button size="sm" variant="outline" className="rounded-xl border-[#133C2A]/15" onClick={() => onRemind(payment)}>
                              Напомнить
                            </Button>
                          ) : null}
                          <Button size="sm" className="rounded-xl bg-[#133C2A]" onClick={() => onOpenPayment(payment)}>
                            Открыть
                          </Button>
                          {onDelete && payment.status !== 'paid' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-xl px-2 text-[#133C2A]/40 hover:bg-[#D14343]/8 hover:text-[#D14343]"
                              onClick={() => onDelete(payment)}
                              disabled={isDeletingPaymentId === payment.id}
                              title="Удалить платеж"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(phoneDialog)} onOpenChange={(open) => !open && setPhoneDialog(null)}>
        <DialogContent className="rounded-3xl bg-[#FCFBF6] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">Телефон родителя</DialogTitle>
            <DialogDescription className="text-[#133C2A]/60">
              {phoneDialog?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-[#133C2A]/10 bg-white px-4 py-4 text-lg text-[#133C2A]">
            {phoneDialog?.phone}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={() => setPhoneDialog(null)}>
              Закрыть
            </Button>
            {phoneDialog?.phone ? (
              <Button className="rounded-2xl bg-[#133C2A]" onClick={() => window.location.href = `tel:${phoneDialog.phone}`}>
                Позвонить
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(methodDialogPayment)} onOpenChange={(open) => !open && setMethodDialogPayment(null)}>
        <DialogContent className="rounded-3xl bg-[#FCFBF6] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">Способ оплаты</DialogTitle>
            <DialogDescription className="text-[#133C2A]/60">
              {methodDialogPayment?.childName || methodDialogPayment?.parentName || 'Платеж'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#133C2A]">Выберите способ</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className={`rounded-2xl ${methodChoice === 'online' ? 'border-[#133C2A] bg-[#EEF5F0]' : 'border-[#133C2A]/15 bg-white'}`}
                  onClick={() => setMethodChoice('online')}
                >
                  Онлайн
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`rounded-2xl ${methodChoice === 'cash' ? 'border-[#133C2A] bg-[#EEF5F0]' : 'border-[#133C2A]/15 bg-white'}`}
                  onClick={() => setMethodChoice('cash')}
                >
                  Наличные
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-[#133C2A]/10 bg-white px-4 py-3 text-sm text-[#133C2A]/72">
              {methodChoice === 'cash'
                ? 'Если родитель платит наличными сейчас, можно сразу подтвердить оплату.'
                : 'Онлайн-счет останется активным и будет ожидать оплату через платежный сервис.'}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={() => setMethodDialogPayment(null)} disabled={isMethodSubmitting}>
              Отмена
            </Button>
            {methodChoice === 'cash' ? (
              <>
                <Button
                  variant="outline"
                  className="rounded-2xl border-[#133C2A]/15"
                  onClick={() => void submitMethodChange(false)}
                  disabled={isMethodSubmitting}
                >
                  Сохранить как наличные
                </Button>
                <Button
                  className="rounded-2xl bg-[#133C2A]"
                  onClick={() => void submitMethodChange(true)}
                  disabled={isMethodSubmitting}
                >
                  Подтвердить оплату
                </Button>
              </>
            ) : (
              <Button
                className="rounded-2xl bg-[#133C2A]"
                onClick={() => void submitMethodChange(false)}
                disabled={isMethodSubmitting}
              >
                Сохранить
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryBox({
  title,
  value,
  valueClassName,
}: {
  title: string;
  value: string;
  valueClassName: string;
}) {
  return (
    <Card className="border-none bg-white/92 shadow-[0_10px_24px_rgba(19,60,42,0.06)]">
      <CardContent className="p-4">
        <p className="text-sm text-[#133C2A]/58">{title}</p>
        <p className={`mt-2 text-2xl leading-none ${valueClassName}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
