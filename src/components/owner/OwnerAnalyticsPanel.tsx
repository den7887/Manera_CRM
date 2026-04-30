import { useEffect, useState } from 'react';
import { BarChart3, Receipt, TrendingUp, Users } from 'lucide-react';
import {
  loadAdminClients,
  loadOwnerEmployees,
  loadOwnerFinanceSummary,
  loadOwnerGroups,
} from '../../lib/backendApi';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function OwnerAnalyticsPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    clientsTotal: 0,
    clientsPaid: 0,
    groupsTotal: 0,
    employeesTotal: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    revenueGrowth: 0,
  });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [clients, groups, employees, finance] = await Promise.all([
          loadAdminClients(),
          loadOwnerGroups(),
          loadOwnerEmployees(),
          loadOwnerFinanceSummary(),
        ]);
        setMetrics({
          clientsTotal: clients.length,
          clientsPaid: clients.filter((item) => item.paymentStatus === 'paid').length,
          groupsTotal: groups.length,
          employeesTotal: employees.length,
          totalIncome: finance.stats.totalIncome,
          totalExpenses: finance.stats.totalExpenses,
          netProfit: finance.stats.netProfit,
          revenueGrowth: finance.stats.revenueGrowth,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Не удалось загрузить аналитику');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[#133C2A] mb-2">Аналитика</h1>
        <p className="text-[#133C2A]/60">Сводка студии на реальных данных</p>
      </div>

      {isLoading ? (
        <Card className="border-none soft-shadow">
          <CardContent className="p-6 text-[#133C2A]/60">Загрузка аналитики...</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-none soft-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-[#133C2A]/70 text-sm">
                  <Users className="w-4 h-4" />
                  Клиенты
                </div>
                <p className="text-3xl text-[#133C2A] mt-2">{metrics.clientsTotal}</p>
                <p className="text-sm text-[#133C2A]/60 mt-1">Оплатили: {metrics.clientsPaid}</p>
              </CardContent>
            </Card>
            <Card className="border-none soft-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-[#133C2A]/70 text-sm">
                  <BarChart3 className="w-4 h-4" />
                  Группы
                </div>
                <p className="text-3xl text-[#133C2A] mt-2">{metrics.groupsTotal}</p>
                <p className="text-sm text-[#133C2A]/60 mt-1">Сотрудники: {metrics.employeesTotal}</p>
              </CardContent>
            </Card>
            <Card className="border-none soft-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-[#133C2A]/70 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  Доход
                </div>
                <p className="text-3xl text-[#133C2A] mt-2">{metrics.totalIncome.toLocaleString('ru-RU')} ₽</p>
                <p className="text-sm text-[#133C2A]/60 mt-1">Рост: {metrics.revenueGrowth}%</p>
              </CardContent>
            </Card>
            <Card className="border-none soft-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-[#133C2A]/70 text-sm">
                  <Receipt className="w-4 h-4" />
                  Прибыль
                </div>
                <p className="text-3xl text-[#133C2A] mt-2">{metrics.netProfit.toLocaleString('ru-RU')} ₽</p>
                <p className="text-sm text-[#133C2A]/60 mt-1">Расходы: {metrics.totalExpenses.toLocaleString('ru-RU')} ₽</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A]">Ключевые выводы</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[#133C2A]/80">
              <p>Конверсия в оплату: {metrics.clientsTotal > 0 ? Math.round((metrics.clientsPaid / metrics.clientsTotal) * 100) : 0}%</p>
              <p>Средний доход на клиента: {metrics.clientsPaid > 0 ? Math.round(metrics.totalIncome / metrics.clientsPaid).toLocaleString('ru-RU') : 0} ₽</p>
              <p>Текущая рентабельность: {metrics.totalIncome > 0 ? Math.round((metrics.netProfit / metrics.totalIncome) * 100) : 0}%</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
