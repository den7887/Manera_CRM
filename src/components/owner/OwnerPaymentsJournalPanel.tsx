import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, RefreshCw, Send, TimerReset } from 'lucide-react';
import {
  AdminPaymentRecord,
  confirmCashPayment,
  createAdminInvoice,
  loadAdminClients,
  loadAdminPayments,
  loadPaymentJournal,
  runAdminPaymentReminders,
  sendAdminPaymentReminder,
  updateAdminPaymentStatus,
} from '../../lib/backendApi';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type StatusFilter = 'all' | 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | 'overdue' | 'cancelled';
type MethodFilter = 'all' | 'cash' | 'online';

const statusLabel: Record<string, string> = {
  unpaid: 'Не оплачено',
  pending: 'Ожидает',
  paid: 'Оплачено',
  failed: 'Ошибка',
  refunded: 'Возврат',
  overdue: 'Просрочено',
  cancelled: 'Отменено',
  expired: 'Истекло',
};

const statusUpdateOptions: Array<{ value: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled' | 'overdue'; label: string }> = [
  { value: 'unpaid', label: 'Не оплачено' },
  { value: 'pending', label: 'Ожидает' },
  { value: 'paid', label: 'Оплачено' },
  { value: 'overdue', label: 'Просрочено' },
  { value: 'failed', label: 'Ошибка' },
  { value: 'cancelled', label: 'Отменено' },
  { value: 'refunded', label: 'Возврат' },
];

const isOutstanding = (status: string) => ['unpaid', 'pending', 'failed', 'overdue'].includes(status);

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

export function OwnerPaymentsJournalPanel() {
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [journal, setJournal] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [statusDraftById, setStatusDraftById] = useState<Record<string, string>>({});

  const [invoiceClientId, setInvoiceClientId] = useState<string>('');
  const [invoiceMethod, setInvoiceMethod] = useState<'cash' | 'online'>('online');
  const [invoiceAmount, setInvoiceAmount] = useState<string>('');
  const [invoiceDueDate, setInvoiceDueDate] = useState<string>('');
  const [invoiceComment, setInvoiceComment] = useState<string>('');
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isRunningReminders, setIsRunningReminders] = useState(false);
  const [isSendingReminderId, setIsSendingReminderId] = useState<string | null>(null);
  const [isUpdatingStatusId, setIsUpdatingStatusId] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [paymentRows, journalRows, clientRows] = await Promise.all([
        loadAdminPayments(statusFilter === 'all' ? undefined : statusFilter, methodFilter === 'all' ? undefined : methodFilter),
        loadPaymentJournal(),
        loadAdminClients(),
      ]);
      setPayments(paymentRows);
      setJournal(journalRows);
      setClients(clientRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить платежи');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [statusFilter, methodFilter]);

  const stats = useMemo(() => {
    const paid = payments.filter((item) => item.status === 'paid');
    const outstanding = payments.filter((item) => isOutstanding(item.status));
    const overdue = payments.filter((item) => item.status === 'overdue');
    return {
      total: payments.length,
      paid: paid.length,
      outstanding: outstanding.length,
      overdue: overdue.length,
      paidAmount: paid.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    };
  }, [payments]);

  const confirmCash = async (payment: AdminPaymentRecord) => {
    if (payment.paymentMethod !== 'cash') return;
    setConfirmingId(String(payment.id));
    try {
      await confirmCashPayment(String(payment.id), {
        paid_amount: Number(payment.amount || 0),
        comment: 'Подтверждено владельцем',
      });
      toast.success('Наличный платеж подтвержден');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось подтвердить оплату');
    } finally {
      setConfirmingId(null);
    }
  };

  const submitInvoice = async () => {
    if (!invoiceClientId) {
      toast.error('Выберите клиента');
      return;
    }
    setIsCreatingInvoice(true);
    try {
      const amountValue = invoiceAmount.trim() ? Number(invoiceAmount) : undefined;
      if (amountValue !== undefined && (!Number.isFinite(amountValue) || amountValue <= 0)) {
        toast.error('Сумма должна быть больше 0');
        return;
      }
      await createAdminInvoice({
        client_id: invoiceClientId,
        payment_method: invoiceMethod,
        amount: amountValue,
        due_date: invoiceDueDate || undefined,
        comment: invoiceComment.trim() || undefined,
      });
      toast.success('Счет выставлен');
      setInvoiceAmount('');
      setInvoiceComment('');
      setInvoiceDueDate('');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось выставить счет');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const runReminders = async () => {
    setIsRunningReminders(true);
    try {
      const result = await runAdminPaymentReminders();
      toast.success(`Напоминания отправлены: ${result.processed}`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось запустить напоминания');
    } finally {
      setIsRunningReminders(false);
    }
  };

  const sendReminder = async (payment: AdminPaymentRecord) => {
    setIsSendingReminderId(payment.id);
    try {
      await sendAdminPaymentReminder(payment.id);
      toast.success('Напоминание отправлено');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось отправить напоминание');
    } finally {
      setIsSendingReminderId(null);
    }
  };

  const applyStatus = async (payment: AdminPaymentRecord) => {
    const nextStatus = statusDraftById[payment.id];
    if (!nextStatus || nextStatus === payment.status) {
      return;
    }
    setIsUpdatingStatusId(payment.id);
    try {
      const statusValue = nextStatus as 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled' | 'overdue';
      await updateAdminPaymentStatus(payment.id, { status: statusValue });
      toast.success('Статус обновлен');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить статус');
    } finally {
      setIsUpdatingStatusId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[#133C2A] mb-2">Платежи и счета</h1>
          <p className="text-[#133C2A]/60">Выставление счетов, контроль оплат и напоминания</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-2xl" onClick={() => void runReminders()} disabled={isRunningReminders}>
            <TimerReset className="w-4 h-4 mr-2" />
            {isRunningReminders ? 'Проверяем...' : 'Запустить напоминания'}
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={() => void refresh()} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Всего счетов</p><p className="text-3xl text-[#133C2A]">{stats.total}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Оплачено</p><p className="text-3xl text-[#133C2A]">{stats.paid}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Открытые</p><p className="text-3xl text-[#133C2A]">{stats.outstanding}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Просроченные</p><p className="text-3xl text-[#D14343]">{stats.overdue}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Сумма оплат</p><p className="text-3xl text-[#133C2A]">{stats.paidAmount.toLocaleString('ru-RU')} ₽</p></CardContent></Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#133C2A]">Выставить счет</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-5 gap-3">
          <Select value={invoiceClientId} onValueChange={setInvoiceClientId}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Клиент" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.childFullName || 'Ученик'} • {client.parentPhone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={invoiceMethod} onValueChange={(v: 'cash' | 'online') => setInvoiceMethod(v)}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="online">Онлайн</SelectItem>
              <SelectItem value="cash">Наличные</SelectItem>
            </SelectContent>
          </Select>
          <Input
            className="rounded-xl"
            placeholder="Сумма (опционально)"
            value={invoiceAmount}
            onChange={(event) => setInvoiceAmount(event.target.value)}
          />
          <Input
            className="rounded-xl"
            type="date"
            value={invoiceDueDate}
            onChange={(event) => setInvoiceDueDate(event.target.value)}
          />
          <Button
            className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]"
            onClick={() => void submitInvoice()}
            disabled={isCreatingInvoice}
          >
            {isCreatingInvoice ? 'Создаем...' : 'Выставить счет'}
          </Button>
          <Input
            className="rounded-xl md:col-span-5"
            placeholder="Комментарий к счету (опционально)"
            value={invoiceComment}
            onChange={(event) => setInvoiceComment(event.target.value)}
          />
        </CardContent>
      </Card>

      <Card className="border-none soft-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#133C2A] flex items-center gap-2"><CreditCard className="w-5 h-5 text-[#D4AF37]" />Платежи</CardTitle>
          <div className="grid md:grid-cols-2 gap-2">
            <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="unpaid">Не оплачено</SelectItem>
                <SelectItem value="pending">Ожидает</SelectItem>
                <SelectItem value="overdue">Просрочено</SelectItem>
                <SelectItem value="paid">Оплачено</SelectItem>
                <SelectItem value="failed">Ошибка</SelectItem>
                <SelectItem value="cancelled">Отменено</SelectItem>
                <SelectItem value="refunded">Возврат</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={(value: MethodFilter) => setMethodFilter(value)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все методы</SelectItem>
                <SelectItem value="cash">Наличные</SelectItem>
                <SelectItem value="online">Онлайн</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-[#133C2A]/60">Загрузка...</p>
          ) : payments.length === 0 ? (
            <p className="text-[#133C2A]/60">Платежей пока нет</p>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-[#133C2A]/10 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <p className="text-[#133C2A]">{payment.subscriptionName || 'Абонемент'}</p>
                    <p className="text-sm text-[#133C2A]/70">
                      {payment.parentName || payment.parentPhone || '—'}
                      {payment.childName ? ` • ${payment.childName}` : ''}
                    </p>
                    <p className="text-xs text-[#133C2A]/55">
                      Счет: {payment.invoiceNumber || '—'} • Создан: {formatDateTime(payment.createdAt)}
                    </p>
                    <p className="text-xs text-[#133C2A]/55">
                      Дедлайн: {formatDate(payment.dueDate)} • Напоминаний: {payment.reminderCount || 0}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl text-[#133C2A]">{Number(payment.amount || 0).toLocaleString('ru-RU')} ₽</p>
                    <Badge variant="outline" className="rounded-xl mt-1">{statusLabel[payment.status] || payment.status}</Badge>
                    <p className="text-xs text-[#133C2A]/55 mt-1">{payment.paymentMethod === 'cash' ? 'Наличные' : 'Онлайн'}</p>
                    {payment.lastReminderAt && (
                      <p className="text-xs text-[#133C2A]/55 mt-1">Последнее: {formatDateTime(payment.lastReminderAt)}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  {payment.paymentMethod === 'cash' && payment.status !== 'paid' ? (
                    <Button
                      size="sm"
                      onClick={() => void confirmCash(payment)}
                      disabled={confirmingId === payment.id}
                      className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {confirmingId === payment.id ? 'Подтверждаем...' : 'Подтвердить оплату'}
                    </Button>
                  ) : null}
                  {isOutstanding(payment.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      disabled={isSendingReminderId === payment.id}
                      onClick={() => void sendReminder(payment)}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {isSendingReminderId === payment.id ? 'Отправляем...' : 'Напомнить'}
                    </Button>
                  )}
                  <Select
                    value={statusDraftById[payment.id] || payment.status}
                    onValueChange={(value) => setStatusDraftById((prev) => ({ ...prev, [payment.id]: value }))}
                  >
                    <SelectTrigger className="w-[190px] rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusUpdateOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    disabled={isUpdatingStatusId === payment.id}
                    onClick={() => void applyStatus(payment)}
                  >
                    Применить статус
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Журнал событий оплат</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-[#133C2A]/60">Загрузка...</p>
          ) : journal.length === 0 ? (
            <p className="text-[#133C2A]/60">Журнал пуст</p>
          ) : (
            journal.slice(0, 50).map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-[#133C2A]/10 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-[#133C2A]">{entry.eventType}</p>
                  <p className="text-xs text-[#133C2A]/55">{formatDateTime(entry.createdAt)}</p>
                </div>
                <p className="text-sm text-[#133C2A]/70 mt-1">Платеж: {entry.paymentId} • Статус: {entry.newStatus}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
