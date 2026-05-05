import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, RefreshCw, Receipt, TrendingUp, Users } from 'lucide-react';
import {
  AdminClientRecord,
  AdminPaymentRecord,
  OwnerFinanceSummaryResponse,
  loadAdminClients,
  loadAdminPayments,
  loadOwnerEmployees,
  loadOwnerFinanceSummary,
  loadOwnerGroups,
} from '../../lib/backendApi';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type PeriodFilter = '30d' | '90d' | '365d' | 'all';

interface AnalyticsSnapshot {
  clients: AdminClientRecord[];
  groups: any[];
  employees: any[];
  finance: OwnerFinanceSummaryResponse | null;
  payments: AdminPaymentRecord[];
}

function isRecent(dateValue: string | undefined, period: PeriodFilter): boolean {
  if (period === 'all') return true;
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const edge = new Date();
  edge.setDate(edge.getDate() - days);
  return date >= edge;
}

export function OwnerAnalyticsPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>('90d');
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot>({
    clients: [],
    groups: [],
    employees: [],
    finance: null,
    payments: [],
  });
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const refresh = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const [clients, groups, employees, finance, payments] = await Promise.all([
        loadAdminClients(),
        loadOwnerGroups(),
        loadOwnerEmployees(),
        loadOwnerFinanceSummary(),
        loadAdminPayments(),
      ]);
      setSnapshot({ clients, groups, employees, finance, payments });
      setLastUpdatedAt(new Date());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить аналитику');
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const metrics = useMemo(() => {
    const filteredPayments = snapshot.payments.filter((item) => isRecent(item.createdAt, period));
    const filteredClients = snapshot.clients.filter((item) => isRecent(item.createdAt, period));
    const clientsWithDebt = filteredClients.filter((item) =>
      ['unpaid', 'pending', 'failed', 'overdue'].includes(item.paymentStatus),
    ).length;
    const paidClients = filteredClients.filter((item) => item.paymentStatus === 'paid');
    const averageTicket = paidClients.length > 0
      ? Math.round(
          paidClients.reduce((sum, item) => sum + Number(item.subscriptionAmount || 0), 0) / paidClients.length,
        )
      : 0;
    const groupsHighLoad = snapshot.groups.filter((group) => {
      const maxCapacity = Math.max(1, Number((group as any).maxCapacity || 12));
      return Number(group.studentCount || 0) / maxCapacity >= 0.9;
    }).length;
    const groupsNeedEnrollment = snapshot.groups.filter((group) => {
      const maxCapacity = Math.max(1, Number((group as any).maxCapacity || 12));
      return Number(group.studentCount || 0) / maxCapacity < 0.45;
    }).length;
    const paidAmountPeriod = filteredPayments
      .filter((item) => item.status === 'paid')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const outstandingPayments = filteredPayments.filter((item) =>
      ['unpaid', 'pending', 'failed', 'overdue'].includes(item.status),
    ).length;
    const overduePayments = filteredPayments.filter((item) => item.status === 'overdue').length;

    return {
      clientsTotal: filteredClients.length,
      clientsPaid: paidClients.length,
      clientsWithDebt,
      groupsTotal: snapshot.groups.length,
      groupsHighLoad,
      groupsNeedEnrollment,
      employeesTotal: snapshot.employees.length,
      totalIncome: snapshot.finance?.stats.totalIncome || 0,
      totalExpenses: snapshot.finance?.stats.totalExpenses || 0,
      netProfit: snapshot.finance?.stats.netProfit || 0,
      revenueGrowth: snapshot.finance?.stats.revenueGrowth || 0,
      outstandingPayments,
      overduePayments,
      averageTicket,
      paidAmountPeriod,
    };
  }, [snapshot, period]);

  const topDebtors = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; amount: number; count: number }>();
    snapshot.payments
      .filter((item) => ['unpaid', 'pending', 'failed', 'overdue'].includes(item.status))
      .forEach((item) => {
        const key = item.parentUserId || item.parentPhone || item.id;
        const current = map.get(key) || {
          name: item.parentName || item.parentPhone || 'Родитель',
          phone: item.parentPhone || '—',
          amount: 0,
          count: 0,
        };
        current.amount += Number(item.amount || 0);
        current.count += 1;
        map.set(key, current);
      });
    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [snapshot.payments]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Аналитика</h1>
          <p className="text-[#133C2A]/60">Сводка студии на реальных данных</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
          <Select value={period} onValueChange={(value: PeriodFilter) => setPeriod(value)}>
            <SelectTrigger className="w-full rounded-xl md:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Последние 30 дней</SelectItem>
              <SelectItem value="90d">Последние 90 дней</SelectItem>
              <SelectItem value="365d">Последний год</SelectItem>
              <SelectItem value="all">За все время</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-xl" onClick={() => void refresh(true)} disabled={isRefreshing}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {isRefreshing ? 'Обновляем...' : 'Обновить'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="border-none soft-shadow">
          <CardContent className="p-6 text-[#133C2A]/60">Загрузка аналитики...</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="border-none soft-shadow">
              <CardContent className="p-3 md:p-5">
                <div className="flex items-center gap-2 text-[#133C2A]/70 text-sm">
                  <Users className="w-4 h-4" />
                  Клиенты
                </div>
                <p className="text-2xl text-[#133C2A] mt-2 md:text-3xl">{metrics.clientsTotal}</p>
                <p className="text-sm text-[#133C2A]/60 mt-1">Оплатили: {metrics.clientsPaid}</p>
                <p className="text-xs text-[#D14343] mt-1">С долгом: {metrics.clientsWithDebt}</p>
              </CardContent>
            </Card>

            <Card className="border-none soft-shadow">
              <CardContent className="p-3 md:p-5">
                <div className="flex items-center gap-2 text-[#133C2A]/70 text-sm">
                  <BarChart3 className="w-4 h-4" />
                  Группы
                </div>
                <p className="text-2xl text-[#133C2A] mt-2 md:text-3xl">{metrics.groupsTotal}</p>
                <p className="text-sm text-[#133C2A]/60 mt-1">Сотрудники: {metrics.employeesTotal}</p>
                <p className="text-xs text-[#B8941F] mt-1">Почти полные: {metrics.groupsHighLoad}</p>
              </CardContent>
            </Card>

            <Card className="border-none soft-shadow">
              <CardContent className="p-3 md:p-5">
                <div className="flex items-center gap-2 text-[#133C2A]/70 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  Доход (общий)
                </div>
                <p className="text-xl text-[#133C2A] mt-2 md:text-3xl">{metrics.totalIncome.toLocaleString('ru-RU')} ₽</p>
                <p className="text-sm text-[#133C2A]/60 mt-1">Рост: {metrics.revenueGrowth}%</p>
                <p className="text-xs text-[#133C2A]/50 mt-1">Средний чек: {metrics.averageTicket.toLocaleString('ru-RU')} ₽</p>
              </CardContent>
            </Card>

            <Card className="border-none soft-shadow">
              <CardContent className="p-3 md:p-5">
                <div className="flex items-center gap-2 text-[#133C2A]/70 text-sm">
                  <Receipt className="w-4 h-4" />
                  Прибыль (общая)
                </div>
                <p className="text-xl text-[#133C2A] mt-2 md:text-3xl">{metrics.netProfit.toLocaleString('ru-RU')} ₽</p>
                <p className="text-sm text-[#133C2A]/60 mt-1">Расходы: {metrics.totalExpenses.toLocaleString('ru-RU')} ₽</p>
                <p className="text-xs text-[#D14343] mt-1">Просрочек: {metrics.overduePayments}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A]">Ключевые выводы</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[#133C2A]/80">
              <p>Подтверждено оплат за период: {metrics.paidAmountPeriod.toLocaleString('ru-RU')} ₽</p>
              <p>Конверсия в оплату: {metrics.clientsTotal > 0 ? Math.round((metrics.clientsPaid / metrics.clientsTotal) * 100) : 0}%</p>
              <p>Средний доход на клиента: {metrics.clientsPaid > 0 ? Math.round(metrics.totalIncome / metrics.clientsPaid).toLocaleString('ru-RU') : 0} ₽</p>
              <p>Текущая рентабельность: {metrics.totalIncome > 0 ? Math.round((metrics.netProfit / metrics.totalIncome) * 100) : 0}%</p>
              <p>Открытых счетов: {metrics.outstandingPayments}</p>
              <p>Группам нужен набор: {metrics.groupsNeedEnrollment}</p>
            </CardContent>
          </Card>

          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#D4AF37]" />
                Зоны риска
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topDebtors.length === 0 ? (
                <p className="text-[#133C2A]/60">Критичных долгов сейчас нет</p>
              ) : (
                topDebtors.map((debtor, index) => (
                  <div key={`${debtor.phone}-${index}`} className="rounded-xl border border-[#133C2A]/10 p-3">
                    <p className="text-[#133C2A]">{debtor.name}</p>
                    <p className="text-sm text-[#133C2A]/65">{debtor.phone}</p>
                    <p className="text-sm text-[#D14343] mt-1">
                      Открыто счетов: {debtor.count} • Сумма: {debtor.amount.toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                ))
              )}
              <p className="text-xs text-[#133C2A]/50">
                Последнее обновление: {lastUpdatedAt ? lastUpdatedAt.toLocaleString('ru-RU') : '—'}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
