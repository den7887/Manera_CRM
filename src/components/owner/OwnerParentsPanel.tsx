import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Phone,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Users,
} from 'lucide-react';
import {
  AdminClientRecord,
  AdminPaymentRecord,
  confirmCashPayment,
  createAdminInvoice,
  loadAdminClients,
  loadAdminPayments,
  sendAdminPaymentReminder,
} from '../../lib/backendApi';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { OwnerPaymentsNavigationContext } from './paymentsNavigation';

type ParentPaymentState = 'all' | 'paid' | 'pending';
type ParentSort = 'activity' | 'debt';

interface ParentRow {
  parentUserId: string;
  parentName: string;
  parentPhone: string;
  clientIds: string[];
  childrenCount: number;
  paidCount: number;
  pendingCount: number;
  totalBilled: number;
  totalPaid: number;
  latestActivity: string;
}

interface OwnerParentsPanelProps {
  onNavigatePayments?: (context?: Omit<OwnerPaymentsNavigationContext, 'requestId'>) => void;
}

function isOutstandingStatus(status: string): boolean {
  return ['unpaid', 'pending', 'failed', 'overdue'].includes(status);
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    unpaid: 'Не оплачено',
    pending: 'Ожидает',
    paid: 'Оплачено',
    failed: 'Ошибка',
    refunded: 'Возврат',
    overdue: 'Просрочено',
    cancelled: 'Отменено',
    expired: 'Истекло',
  };
  return map[status] || status;
}

function accountStatusLabel(status: string): string {
  const map: Record<string, string> = {
    invited: 'Приглашен',
    payment_pending: 'Ожидает оплату',
    active: 'Активен',
    suspended: 'Приостановлен',
  };
  return map[status] || status;
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

function toParentRows(records: AdminClientRecord[]): ParentRow[] {
  const map = new Map<string, ParentRow>();
  records.forEach((record) => {
    const key = record.parentUserId || record.parentPhone;
    if (!key) return;
    const current = map.get(key) || {
      parentUserId: record.parentUserId || key,
      parentName: record.parentName || record.parentPhone,
      parentPhone: record.parentPhone,
      clientIds: [],
      childrenCount: 0,
      paidCount: 0,
      pendingCount: 0,
      totalBilled: 0,
      totalPaid: 0,
      latestActivity: record.updatedAt || record.createdAt,
    };

    current.childrenCount += 1;
    current.clientIds.push(record.id);
    current.totalBilled += Number(record.subscriptionAmount || 0);
    if (record.paymentStatus === 'paid') {
      current.paidCount += 1;
      current.totalPaid += Number(record.subscriptionAmount || 0);
    } else if (['pending', 'unpaid', 'failed', 'overdue'].includes(record.paymentStatus)) {
      current.pendingCount += 1;
    }

    const candidateActivity = new Date(record.updatedAt || record.createdAt);
    const currentActivity = new Date(current.latestActivity);
    if (!Number.isNaN(candidateActivity.getTime()) && (Number.isNaN(currentActivity.getTime()) || candidateActivity > currentActivity)) {
      current.latestActivity = candidateActivity.toISOString();
    }
    map.set(key, current);
  });

  return Array.from(map.values()).sort((a, b) => {
    const left = new Date(a.latestActivity).getTime();
    const right = new Date(b.latestActivity).getTime();
    return right - left;
  });
}

export function OwnerParentsPanel({ onNavigatePayments }: OwnerParentsPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<ParentRow[]>([]);
  const [clientRecords, setClientRecords] = useState<AdminClientRecord[]>([]);
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [search, setSearch] = useState('');
  const [paymentState, setPaymentState] = useState<ParentPaymentState>('all');
  const [sortBy, setSortBy] = useState<ParentSort>('activity');
  const [isInvoicingParentId, setIsInvoicingParentId] = useState<string | null>(null);
  const [isRemindingParentId, setIsRemindingParentId] = useState<string | null>(null);
  const [isBulkReminding, setIsBulkReminding] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isInvoiceClientId, setIsInvoiceClientId] = useState<string | null>(null);
  const [isReminderPaymentId, setIsReminderPaymentId] = useState<string | null>(null);
  const [isConfirmCashPaymentId, setIsConfirmCashPaymentId] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [records, paymentRows] = await Promise.all([loadAdminClients(), loadAdminPayments()]);
      setClientRecords(records);
      setRows(toParentRows(records));
      setPayments(paymentRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить родителей');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const stats = useMemo(() => {
    const totalParents = rows.length;
    const paidParents = rows.filter((item) => item.pendingCount === 0 && item.paidCount > 0).length;
    const pendingParents = rows.filter((item) => item.pendingCount > 0).length;
    const totalPaid = rows.reduce((sum, item) => sum + item.totalPaid, 0);
    const outstandingPayments = payments.filter((item) => isOutstandingStatus(item.status)).length;
    return { totalParents, paidParents, pendingParents, totalPaid, outstandingPayments };
  }, [rows, payments]);

  const outstandingByClientId = useMemo(() => {
    const map = new Map<string, AdminPaymentRecord>();
    payments
      .filter((payment) => isOutstandingStatus(payment.status))
      .forEach((payment) => {
        const clientId = String(payment.clientId || '');
        if (!clientId || map.has(clientId)) return;
        map.set(clientId, payment);
      });
    return map;
  }, [payments]);

  const outstandingByParent = useMemo(() => {
    const map = new Map<string, AdminPaymentRecord[]>();
    rows.forEach((row) => {
      const list = row.clientIds
        .map((clientId) => outstandingByClientId.get(clientId))
        .filter((item): item is AdminPaymentRecord => Boolean(item));
      map.set(row.parentUserId, list);
    });
    return map;
  }, [rows, outstandingByClientId]);

  const debtAmountByParent = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row) => {
      const total = (outstandingByParent.get(row.parentUserId) || []).reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      );
      map.set(row.parentUserId, total);
    });
    return map;
  }, [rows, outstandingByParent]);

  const filtered = useMemo(() => {
    const base = rows.filter((item) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || item.parentName.toLowerCase().includes(query) || item.parentPhone.includes(query);
      const matchesState =
        paymentState === 'all' ||
        (paymentState === 'paid' && item.pendingCount === 0 && item.paidCount > 0) ||
        (paymentState === 'pending' && item.pendingCount > 0);
      return matchesSearch && matchesState;
    });
    return [...base].sort((a, b) => {
      if (sortBy === 'debt') {
        return (debtAmountByParent.get(b.parentUserId) || 0) - (debtAmountByParent.get(a.parentUserId) || 0);
      }
      return new Date(b.latestActivity).getTime() - new Date(a.latestActivity).getTime();
    });
  }, [rows, search, paymentState, sortBy, debtAmountByParent]);

  const selectedParent = useMemo(
    () => rows.find((item) => item.parentUserId === selectedParentId) || null,
    [rows, selectedParentId],
  );

  const selectedParentClients = useMemo(
    () => clientRecords.filter((item) => (item.parentUserId || item.parentPhone) === selectedParentId),
    [clientRecords, selectedParentId],
  );

  const selectedParentPayments = useMemo(
    () =>
      payments
        .filter((item) => (item.parentUserId || item.parentPhone) === selectedParentId)
        .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()),
    [payments, selectedParentId],
  );

  const openParentDetail = (parentId: string) => {
    setSelectedParentId(parentId);
    setIsDetailOpen(true);
  };

  const createInvoiceForClient = async (clientId: string, amount?: number) => {
    setIsInvoiceClientId(clientId);
    try {
      await createAdminInvoice({
        client_id: clientId,
        payment_method: 'online',
        amount: amount && amount > 0 ? amount : undefined,
      });
      toast.success('Счет выставлен');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось выставить счет');
    } finally {
      setIsInvoiceClientId(null);
    }
  };

  const createInvoicesForParent = async (parentId: string) => {
    const row = rows.find((item) => item.parentUserId === parentId);
    if (!row) return;
    const clientIds = row.clientIds.filter((clientId) => !outstandingByClientId.get(clientId));
    if (clientIds.length === 0) {
      toast.info('У родителя уже есть открытые счета по всем детям');
      return;
    }

    setIsInvoicingParentId(parentId);
    try {
      const results = await Promise.allSettled(
        clientIds.map((clientId) => {
          const record = clientRecords.find((item) => item.id === clientId);
          return createAdminInvoice({
            client_id: clientId,
            payment_method: 'online',
            amount: record?.subscriptionAmount || undefined,
          });
        }),
      );
      const successCount = results.filter((item) => item.status === 'fulfilled').length;
      const failedCount = results.length - successCount;
      if (successCount > 0) toast.success(`Счета выставлены: ${successCount}`);
      if (failedCount > 0) toast.error(`Не удалось выставить счетов: ${failedCount}`);
      await refresh();
    } finally {
      setIsInvoicingParentId(null);
    }
  };

  const sendReminderForPayment = async (paymentId: string) => {
    setIsReminderPaymentId(paymentId);
    try {
      await sendAdminPaymentReminder(paymentId);
      toast.success('Напоминание отправлено');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось отправить напоминание');
    } finally {
      setIsReminderPaymentId(null);
    }
  };

  const sendRemindersForParent = async (parentId: string) => {
    const targetPayments = outstandingByParent.get(parentId) || [];
    if (targetPayments.length === 0) {
      toast.info('По родителю нет открытых счетов');
      return;
    }
    setIsRemindingParentId(parentId);
    try {
      const results = await Promise.allSettled(targetPayments.map((payment) => sendAdminPaymentReminder(payment.id)));
      const successCount = results.filter((item) => item.status === 'fulfilled').length;
      const failedCount = results.length - successCount;
      if (successCount > 0) toast.success(`Напоминания отправлены: ${successCount}`);
      if (failedCount > 0) toast.error(`Не удалось отправить напоминания: ${failedCount}`);
      await refresh();
    } finally {
      setIsRemindingParentId(null);
    }
  };

  const sendRemindersForAllPending = async () => {
    const targetPayments = filtered.flatMap((row) => outstandingByParent.get(row.parentUserId) || []);
    if (targetPayments.length === 0) {
      toast.info('Нет открытых счетов в текущем фильтре');
      return;
    }
    setIsBulkReminding(true);
    try {
      const results = await Promise.allSettled(targetPayments.map((payment) => sendAdminPaymentReminder(payment.id)));
      const successCount = results.filter((item) => item.status === 'fulfilled').length;
      const failedCount = results.length - successCount;
      if (successCount > 0) toast.success(`Напоминания отправлены: ${successCount}`);
      if (failedCount > 0) toast.error(`Не удалось отправить напоминания: ${failedCount}`);
      await refresh();
    } finally {
      setIsBulkReminding(false);
    }
  };

  const confirmCashForPayment = async (payment: AdminPaymentRecord) => {
    if (payment.paymentMethod !== 'cash') return;
    setIsConfirmCashPaymentId(payment.id);
    try {
      await confirmCashPayment(payment.id, {
        paid_amount: Number(payment.amount || 0),
        comment: 'Подтверждено владельцем из карточки родителя',
      });
      toast.success('Наличный платеж подтвержден');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось подтвердить оплату');
    } finally {
      setIsConfirmCashPaymentId(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Родители</h1>
          <p className="text-[#133C2A]/60">Статусы оплат, доступ и полное досье по каждому родителю</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 md:flex md:items-center">
          <Button
            variant="outline"
            className="rounded-xl border-[#133C2A]/20"
            onClick={() =>
              onNavigatePayments?.({
                showOnlyOutstanding: true,
                sourceLabel: 'Проблемные оплаты из раздела "Родители"',
              })
            }
            disabled={!onNavigatePayments}
          >
            <Receipt className="w-4 h-4 mr-2" />
            В журнал оплат
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => void sendRemindersForAllPending()}
            disabled={isBulkReminding}
          >
            <Send className="w-4 h-4 mr-2" />
            {isBulkReminding ? 'Отправляем...' : 'Напомнить всем с долгом'}
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => void refresh()} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-5"><p className="text-xs text-[#133C2A]/60 md:text-sm">Всего родителей</p><p className="text-2xl text-[#133C2A] md:text-3xl">{stats.totalParents}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-5"><p className="text-xs text-[#133C2A]/60 md:text-sm">Оплатили</p><p className="text-2xl text-[#133C2A] md:text-3xl">{stats.paidParents}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-5"><p className="text-xs text-[#133C2A]/60 md:text-sm">Ожидают оплату</p><p className="text-2xl text-[#133C2A] md:text-3xl">{stats.pendingParents}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-5"><p className="text-xs text-[#133C2A]/60 md:text-sm">Открытых счетов</p><p className="text-2xl text-[#D14343] md:text-3xl">{stats.outstandingPayments}</p></CardContent></Card>
        <Card className="border-none soft-shadow col-span-2 md:col-span-1"><CardContent className="p-3 md:p-5"><p className="text-xs text-[#133C2A]/60 md:text-sm">Подтверждено оплат</p><p className="text-xl text-[#133C2A] md:text-3xl">{stats.totalPaid.toLocaleString('ru-RU')} ₽</p></CardContent></Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#133C2A]">Список родителей</CardTitle>
          <div className="grid md:grid-cols-[1fr_220px_220px] gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#133C2A]/40" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по ФИО или телефону" className="pl-9 rounded-xl" />
            </div>
            <Select value={paymentState} onValueChange={(value: ParentPaymentState) => setPaymentState(value)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="paid">Оплачено</SelectItem>
                <SelectItem value="pending">Ожидают оплату</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: ParentSort) => setSortBy(value)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activity">Сначала активные</SelectItem>
                <SelectItem value="debt">Сначала с долгом</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-[#133C2A]/60">Загрузка...</p>
          ) : filtered.length === 0 ? (
            <p className="text-[#133C2A]/60">Данных по родителям пока нет</p>
          ) : (
            filtered.map((item) => (
              <div
                key={item.parentUserId}
                className="rounded-2xl border border-[#133C2A]/10 p-3 cursor-pointer hover:bg-[#F8F4E3]/60 transition-smooth md:p-4"
                onClick={() => openParentDetail(item.parentUserId)}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1 min-w-0">
                    <p className="text-[#133C2A] truncate">{item.parentName}</p>
                    <p className="text-sm text-[#133C2A]/70 flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {item.parentPhone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="rounded-xl border-[#133C2A]/20 text-[#133C2A]">
                      <Users className="w-3.5 h-3.5 mr-1" />
                      Детей: {item.childrenCount}
                    </Badge>
                    <Badge variant="outline" className="rounded-xl border-green-200 text-green-700">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Оплат: {item.paidCount}
                    </Badge>
                    <Badge variant="outline" className="rounded-xl border-blue-200 text-blue-700">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      Ожидание: {item.pendingCount}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 grid md:grid-cols-2 gap-2 text-sm text-[#133C2A]/75">
                  <div className="rounded-xl bg-[#F8F4E3] px-3 py-2">
                    <span className="text-[#133C2A]/60">Счетов выставлено:</span>{' '}
                    <span>{item.totalBilled.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="rounded-xl bg-[#F8F4E3] px-3 py-2">
                    <span className="text-[#133C2A]/60">Оплачено:</span>{' '}
                    <span>{item.totalPaid.toLocaleString('ru-RU')} ₽</span>
                  </div>
                </div>
                <div className="mt-2 rounded-xl border border-[#D4AF37]/30 bg-[#FFF9E8] px-3 py-2 text-sm text-[#8B6B00]">
                  Открытый долг: {(debtAmountByParent.get(item.parentUserId) || 0).toLocaleString('ru-RU')} ₽
                </div>
                <div className="mt-2 text-xs text-[#133C2A]/50 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  Последняя активность: {new Date(item.latestActivity).toLocaleString('ru-RU')}
                </div>
                <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap" onClick={(event) => event.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl border-[#133C2A]/20"
                    onClick={() => openParentDetail(item.parentUserId)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Открыть профиль
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl border-[#133C2A]/20"
                    onClick={() => void createInvoicesForParent(item.parentUserId)}
                    disabled={isInvoicingParentId === item.parentUserId}
                  >
                    {isInvoicingParentId === item.parentUserId ? 'Создаем...' : 'Выставить счета'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl border-[#D4AF37]/30 text-[#B8941F]"
                    onClick={() => void sendRemindersForParent(item.parentUserId)}
                    disabled={isRemindingParentId === item.parentUserId}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    {isRemindingParentId === item.parentUserId ? 'Отправка...' : 'Напомнить'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-5xl max-h-[92dvh] overflow-y-auto rounded-3xl">
          {selectedParent ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#133C2A] flex items-center justify-between gap-3 flex-wrap">
                  <span>{selectedParent.parentName}</span>
                  <span className="text-sm text-[#133C2A]/70 flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {selectedParent.parentPhone}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-[#133C2A]/10"><CardContent className="p-4"><p className="text-xs text-[#133C2A]/60">Детей</p><p className="text-2xl text-[#133C2A]">{selectedParent.childrenCount}</p></CardContent></Card>
                <Card className="border-[#133C2A]/10"><CardContent className="p-4"><p className="text-xs text-[#133C2A]/60">Открытый долг</p><p className="text-2xl text-[#D14343]">{(debtAmountByParent.get(selectedParent.parentUserId) || 0).toLocaleString('ru-RU')} ₽</p></CardContent></Card>
                <Card className="border-[#133C2A]/10"><CardContent className="p-4"><p className="text-xs text-[#133C2A]/60">Оплачено</p><p className="text-2xl text-[#133C2A]">{selectedParent.totalPaid.toLocaleString('ru-RU')} ₽</p></CardContent></Card>
                <Card className="border-[#133C2A]/10"><CardContent className="p-4"><p className="text-xs text-[#133C2A]/60">Последняя активность</p><p className="text-sm text-[#133C2A] mt-1">{formatDateTime(selectedParent.latestActivity)}</p></CardContent></Card>
              </div>

              <div className="grid gap-2 sm:flex sm:flex-wrap">
                <Button
                  variant="outline"
                  className="rounded-xl border-[#133C2A]/20"
                  onClick={() => void createInvoicesForParent(selectedParent.parentUserId)}
                  disabled={isInvoicingParentId === selectedParent.parentUserId}
                >
                  {isInvoicingParentId === selectedParent.parentUserId ? 'Создаем...' : 'Выставить счета всем детям'}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-[#D4AF37]/30 text-[#B8941F]"
                  onClick={() => void sendRemindersForParent(selectedParent.parentUserId)}
                  disabled={isRemindingParentId === selectedParent.parentUserId}
                >
                  <Send className="w-4 h-4 mr-1" />
                  {isRemindingParentId === selectedParent.parentUserId ? 'Отправка...' : 'Напомнить по долгам'}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-[#133C2A]/20"
                  onClick={() =>
                    onNavigatePayments?.({
                      searchQuery: `${selectedParent.parentPhone} ${selectedParent.parentName}`,
                      showOnlyOutstanding: true,
                      sourceLabel: `Родитель: ${selectedParent.parentName}`,
                    })
                  }
                  disabled={!onNavigatePayments}
                >
                  <Receipt className="w-4 h-4 mr-1" />
                  Открыть в журнале оплат
                </Button>
              </div>

              <Tabs defaultValue="overview" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-[#F8F4E3]">
                  <TabsTrigger value="overview" className="rounded-xl">Обзор</TabsTrigger>
                  <TabsTrigger value="children" className="rounded-xl">Дети и абонементы</TabsTrigger>
                  <TabsTrigger value="payments" className="rounded-xl">Платежи</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-3">
                  <Card className="border-[#133C2A]/10">
                    <CardContent className="p-5 space-y-2">
                      <p className="text-[#133C2A]">Родитель: {selectedParent.parentName}</p>
                      <p className="text-[#133C2A]/70">Телефон: {selectedParent.parentPhone}</p>
                      <p className="text-[#133C2A]/70">Всего выставлено: {selectedParent.totalBilled.toLocaleString('ru-RU')} ₽</p>
                      <p className="text-[#133C2A]/70">Оплачено: {selectedParent.totalPaid.toLocaleString('ru-RU')} ₽</p>
                      <p className="text-[#D14343]">Открытый долг: {(debtAmountByParent.get(selectedParent.parentUserId) || 0).toLocaleString('ru-RU')} ₽</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="children" className="space-y-3">
                  {selectedParentClients.length === 0 ? (
                    <p className="text-[#133C2A]/60">У этого родителя нет детей в базе</p>
                  ) : (
                    selectedParentClients.map((client) => (
                      <div key={client.id} className="rounded-2xl border border-[#133C2A]/10 p-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <p className="text-[#133C2A]">{client.childFullName || 'Ученик'}</p>
                            <p className="text-sm text-[#133C2A]/65">Дата рождения: {formatDate(client.childBirthDate)}</p>
                            <p className="text-sm text-[#133C2A]/70 mt-1">
                              {client.subscriptionName} • {Number(client.subscriptionAmount || 0).toLocaleString('ru-RU')} ₽
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="rounded-xl">{statusLabel(client.paymentStatus)}</Badge>
                            <Badge variant="outline" className="rounded-xl">{accountStatusLabel(client.accountStatus)}</Badge>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-[#133C2A]/20"
                            onClick={() => void createInvoiceForClient(client.id, Number(client.subscriptionAmount || 0))}
                            disabled={isInvoiceClientId === client.id}
                          >
                            {isInvoiceClientId === client.id ? 'Создаем...' : 'Выставить счет'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-[#133C2A]/20"
                            onClick={() =>
                              onNavigatePayments?.({
                                searchQuery: `${selectedParent.parentPhone} ${client.childFullName || ''}`,
                                showOnlyOutstanding: true,
                                invoiceClientId: client.id,
                                sourceLabel: `Родитель: ${selectedParent.parentName} / ${client.childFullName || 'Ученик'}`,
                              })
                            }
                            disabled={!onNavigatePayments}
                          >
                            Контроль оплаты
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="payments" className="space-y-3">
                  {selectedParentPayments.length === 0 ? (
                    <p className="text-[#133C2A]/60">Платежей по родителю пока нет</p>
                  ) : (
                    selectedParentPayments.map((payment) => (
                      <div key={payment.id} className="rounded-2xl border border-[#133C2A]/10 p-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="space-y-1">
                            <p className="text-[#133C2A]">{payment.subscriptionName || 'Абонемент'}</p>
                            <p className="text-sm text-[#133C2A]/70">{payment.childName || 'Ученик'}</p>
                            <p className="text-xs text-[#133C2A]/55">Счет: {payment.invoiceNumber || '—'}</p>
                            <p className="text-xs text-[#133C2A]/55">Создан: {formatDateTime(payment.createdAt)} • Дедлайн: {formatDate(payment.dueDate)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl text-[#133C2A]">{Number(payment.amount || 0).toLocaleString('ru-RU')} ₽</p>
                            <Badge variant="outline" className="rounded-xl mt-1">{statusLabel(payment.status)}</Badge>
                            <p className="text-xs text-[#133C2A]/55 mt-1">{payment.paymentMethod === 'cash' ? 'Наличные' : 'Онлайн'}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {isOutstandingStatus(payment.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-[#D4AF37]/30 text-[#B8941F]"
                              onClick={() => void sendReminderForPayment(payment.id)}
                              disabled={isReminderPaymentId === payment.id}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              {isReminderPaymentId === payment.id ? 'Отправка...' : 'Отправить напоминание'}
                            </Button>
                          )}
                          {payment.paymentMethod === 'cash' && payment.status !== 'paid' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-[#133C2A]/20"
                              onClick={() => void confirmCashForPayment(payment)}
                              disabled={isConfirmCashPaymentId === payment.id}
                            >
                              {isConfirmCashPaymentId === payment.id ? 'Подтверждаем...' : 'Подтвердить наличные'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-[#133C2A]/20"
                            onClick={() =>
                              onNavigatePayments?.({
                                searchQuery: `${selectedParent.parentPhone} ${payment.childName || ''}`,
                                sourceLabel: `Платеж ${payment.invoiceNumber || payment.id}`,
                              })
                            }
                            disabled={!onNavigatePayments}
                          >
                            Перейти в журнал
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
