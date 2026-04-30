import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, CreditCard, Phone, Search, Users } from 'lucide-react';
import { loadAdminClients, AdminClientRecord } from '../../lib/backendApi';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

type ParentPaymentState = 'all' | 'paid' | 'pending';

interface ParentRow {
  parentUserId: string;
  parentName: string;
  parentPhone: string;
  childrenCount: number;
  paidCount: number;
  pendingCount: number;
  totalBilled: number;
  totalPaid: number;
  latestActivity: string;
}

function toParentRows(records: AdminClientRecord[]): ParentRow[] {
  const map = new Map<string, ParentRow>();
  records.forEach((record) => {
    const key = record.parentUserId || record.parentPhone;
    if (!key) {
      return;
    }
    const current = map.get(key) || {
      parentUserId: record.parentUserId || key,
      parentName: record.parentName || record.parentPhone,
      parentPhone: record.parentPhone,
      childrenCount: 0,
      paidCount: 0,
      pendingCount: 0,
      totalBilled: 0,
      totalPaid: 0,
      latestActivity: record.updatedAt || record.createdAt,
    };

    current.childrenCount += 1;
    current.totalBilled += Number(record.subscriptionAmount || 0);
    if (record.paymentStatus === 'paid') {
      current.paidCount += 1;
      current.totalPaid += Number(record.subscriptionAmount || 0);
    } else if (record.paymentStatus === 'pending' || record.paymentStatus === 'unpaid' || record.paymentStatus === 'failed') {
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

export function OwnerParentsPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<ParentRow[]>([]);
  const [search, setSearch] = useState('');
  const [paymentState, setPaymentState] = useState<ParentPaymentState>('all');

  const refresh = async () => {
    setIsLoading(true);
    try {
      const records = await loadAdminClients();
      setRows(toParentRows(records));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить родителей');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((item) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.parentName.toLowerCase().includes(query) ||
        item.parentPhone.includes(query);
      const matchesState =
        paymentState === 'all' ||
        (paymentState === 'paid' && item.pendingCount === 0 && item.paidCount > 0) ||
        (paymentState === 'pending' && item.pendingCount > 0);
      return matchesSearch && matchesState;
    });
  }, [rows, search, paymentState]);

  const stats = useMemo(() => {
    const totalParents = rows.length;
    const paidParents = rows.filter((item) => item.pendingCount === 0 && item.paidCount > 0).length;
    const pendingParents = rows.filter((item) => item.pendingCount > 0).length;
    const totalPaid = rows.reduce((sum, item) => sum + item.totalPaid, 0);
    return { totalParents, paidParents, pendingParents, totalPaid };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[#133C2A] mb-2">Родители</h1>
          <p className="text-[#133C2A]/60">Статусы оплат и доступа по родительским аккаунтам</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Всего родителей</p><p className="text-3xl text-[#133C2A]">{stats.totalParents}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Оплатили</p><p className="text-3xl text-[#133C2A]">{stats.paidParents}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Ожидают оплату</p><p className="text-3xl text-[#133C2A]">{stats.pendingParents}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Подтверждено оплат</p><p className="text-3xl text-[#133C2A]">{stats.totalPaid.toLocaleString('ru-RU')} ₽</p></CardContent></Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#133C2A]">Список родителей</CardTitle>
          <div className="grid md:grid-cols-[1fr_220px] gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#133C2A]/40" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по ФИО или телефону" className="pl-9 rounded-xl" />
            </div>
            <Select value={paymentState} onValueChange={(value: ParentPaymentState) => setPaymentState(value)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="paid">Оплачено</SelectItem>
                <SelectItem value="pending">Ожидают оплату</SelectItem>
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
              <div key={item.parentUserId} className="rounded-2xl border border-[#133C2A]/10 p-4">
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
                <div className="mt-2 text-xs text-[#133C2A]/50 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  Последняя активность: {new Date(item.latestActivity).toLocaleString('ru-RU')}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

