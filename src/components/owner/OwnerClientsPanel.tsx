import { useEffect, useMemo, useState } from 'react';
import {
  Baby,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Mail,
  Phone,
  Plus,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Group } from '../../types';
import { AddStudentDialog } from '../admin/AddStudentDialog';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AdminClientRecord, loadAdminClients, loadOwnerPricing, OwnerPricingPlanDto } from '../../lib/backendApi';
import { toast } from 'sonner';

interface OwnerClientsPanelProps {
  groups: Group[];
}

const paymentStatusLabels: Record<string, string> = {
  unpaid: 'Не оплачено',
  pending: 'Ожидает оплату',
  paid: 'Оплачено',
  failed: 'Ошибка',
  refunded: 'Возврат',
  overdue: 'Просрочено',
  cancelled: 'Отменено',
};

const accountStatusLabels: Record<string, string> = {
  invited: 'Приглашен',
  payment_pending: 'Ожидает оплату',
  active: 'Активен',
  suspended: 'Приостановлен',
};

const accountBadgeClass: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700 border-green-200',
  payment_pending: 'bg-blue-500/10 text-blue-700 border-blue-200',
  invited: 'bg-[#D4AF37]/15 text-[#B8941F] border-[#D4AF37]/30',
  suspended: 'bg-orange-500/10 text-orange-700 border-orange-200',
};

function formatRuDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

function normalizeClient(record: AdminClientRecord) {
  return {
    id: record.id,
    parentName: record.parentName || record.parentPhone,
    parentPhone: record.parentPhone,
    parentEmail: '',
    childName: record.childFullName || 'Ученик',
    childBirthDate: record.childBirthDate || null,
    subscriptionName: record.subscriptionName,
    subscriptionAmount: record.subscriptionAmount,
    paymentMethod: record.paymentMethod,
    paymentStatus: record.paymentStatus,
    accountStatus: record.accountStatus,
    createdAt: record.createdAt,
    notes: record.notes || '',
  };
}

export function OwnerClientsPanel({ groups }: OwnerClientsPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState<AdminClientRecord[]>([]);
  const [pricingPlans, setPricingPlans] = useState<OwnerPricingPlanDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const refreshClients = async () => {
    setIsLoading(true);
    try {
      const [listResult, plansResult] = await Promise.allSettled([
        loadAdminClients(),
        loadOwnerPricing(),
      ]);
      if (listResult.status === 'fulfilled') {
        setRecords(listResult.value);
      } else {
        throw listResult.reason;
      }
      if (plansResult.status === 'fulfilled') {
        setPricingPlans(plansResult.value.filter((plan) => plan.is_active));
      } else {
        setPricingPlans([]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось загрузить клиентов';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshClients();
  }, []);

  const clients = useMemo(() => records.map(normalizeClient), [records]);

  const selectedClient = useMemo(
    () => clients.find((item) => item.id === selectedClientId) || null,
    [clients, selectedClientId],
  );

  const filteredClients = useMemo(
    () =>
      clients.filter((client) => {
        const matchesSearch =
          client.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.parentPhone.includes(searchQuery) ||
          client.childName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.subscriptionName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || client.accountStatus === statusFilter;
        const matchesPayment = paymentFilter === 'all' || client.paymentStatus === paymentFilter;
        return matchesSearch && matchesStatus && matchesPayment;
      }),
    [clients, searchQuery, statusFilter, paymentFilter],
  );

  const stats = useMemo(
    () => ({
      total: clients.length,
      active: clients.filter((item) => item.accountStatus === 'active').length,
      paymentPending: clients.filter((item) => item.accountStatus === 'payment_pending').length,
      revenue: clients
        .filter((item) => item.paymentStatus === 'paid')
        .reduce((sum, item) => sum + item.subscriptionAmount, 0),
    }),
    [clients],
  );

  const parentOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string; phone: string }>();
    for (const record of records) {
      const key = record.parentUserId || record.parentPhone;
      if (!key || map.has(key)) continue;
      map.set(key, {
        id: key,
        name: record.parentName || record.parentPhone,
        email: '',
        phone: record.parentPhone,
      });
    }
    return Array.from(map.values());
  }, [records]);

  const subscriptions = pricingPlans.map((item) => ({
    id: item.code as string,
    name: item.title,
    classes: typeof item.classes_count === 'number' ? item.classes_count : 0,
    price: item.price,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60 mb-1">Всего клиентов</p>
                <p className="text-3xl text-[#133C2A]">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#133C2A] to-[#1C8C64] flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60 mb-1">Активные</p>
                <p className="text-3xl text-[#133C2A]">{stats.active}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60 mb-1">Ожидают оплату</p>
                <p className="text-3xl text-[#133C2A]">{stats.paymentPending}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60 mb-1">Подтверждено оплат</p>
                <p className="text-3xl text-[#133C2A]">{stats.revenue.toLocaleString('ru-RU')} ₽</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#133C2A] flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-[#133C2A]">
              <Users className="w-6 h-6" />
              Управление клиентами
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void refreshClients()} className="rounded-2xl">
                Обновить
              </Button>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить клиента
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по родителю, телефону, ученику, абонементу"
                className="pl-10 rounded-2xl border-[#133C2A]/20"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[220px] rounded-2xl border-[#133C2A]/20">
                <SelectValue placeholder="Фильтр статуса" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активен</SelectItem>
                <SelectItem value="payment_pending">Ожидает оплату</SelectItem>
                <SelectItem value="invited">Приглашен</SelectItem>
                <SelectItem value="suspended">Приостановлен</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full md:w-[220px] rounded-2xl border-[#133C2A]/20">
                <SelectValue placeholder="Фильтр оплаты" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все оплаты</SelectItem>
                <SelectItem value="paid">Оплачено</SelectItem>
                <SelectItem value="pending">Ожидает оплату</SelectItem>
                <SelectItem value="unpaid">Не оплачено</SelectItem>
                <SelectItem value="failed">Ошибка оплаты</SelectItem>
                <SelectItem value="refunded">Возврат</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-[#133C2A]/60">Загрузка клиентов...</div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-[#133C2A]/20 mx-auto mb-4" />
              <p className="text-[#133C2A]/60">Клиенты не найдены</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClients.map((client) => (
                <Card key={client.id} className="border-[#133C2A]/10 hover-lift transition-smooth">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12 border-2 border-[#D4AF37]/20">
                        <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white">
                          {client.parentName.split(' ').map((n) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="text-[#133C2A] mb-1">{client.parentName}</h3>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-[#133C2A]/60">
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {client.parentPhone}
                              </span>
                            </div>
                          </div>
                          <Badge className={`${accountBadgeClass[client.accountStatus] || ''} border`}>
                            {accountStatusLabels[client.accountStatus] || client.accountStatus}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Baby className="w-4 h-4 text-[#D4AF37]" />
                            <span className="text-[#133C2A]">{client.childName}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#133C2A]/60">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            С {formatRuDate(client.createdAt)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            {client.subscriptionName}: {client.subscriptionAmount.toLocaleString('ru-RU')} ₽
                          </span>
                          <span>•</span>
                          <span>{paymentStatusLabels[client.paymentStatus] || client.paymentStatus}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedClientId(client.id);
                            setIsViewDialogOpen(true);
                          }}
                          className="rounded-xl"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl">
          {selectedClient && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#133C2A] flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-[#D4AF37]/20">
                    <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white">
                      {selectedClient.parentName.split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {selectedClient.parentName}
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="info" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-[#F8F4E3]">
                  <TabsTrigger value="info" className="rounded-xl">Информация</TabsTrigger>
                  <TabsTrigger value="students" className="rounded-xl">Дети</TabsTrigger>
                  <TabsTrigger value="history" className="rounded-xl">История</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-6">
                  <Card className="border-[#133C2A]/10">
                    <CardHeader>
                      <CardTitle className="text-sm text-[#133C2A]/60">Контактная информация</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-[#D4AF37]" />
                        <div>
                          <p className="text-xs text-[#133C2A]/60">Телефон</p>
                          <p className="text-[#133C2A]">{selectedClient.parentPhone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-[#D4AF37]" />
                        <div>
                          <p className="text-xs text-[#133C2A]/60">Email</p>
                          <p className="text-[#133C2A]">{selectedClient.parentEmail || '—'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="students" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <Avatar className="w-10 h-10 border-2 border-[#D4AF37]/20">
                          <AvatarFallback className="bg-gradient-to-br from-[#FADADD] to-[#FFC0CB] text-[#133C2A]">
                            {selectedClient.childName.split(' ').map((n) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="text-[#133C2A] mb-1">{selectedClient.childName}</h3>
                          <p className="text-sm text-[#133C2A]/60">
                            Дата рождения: {formatRuDate(selectedClient.childBirthDate)}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-[#133C2A]/70">
                        Абонемент: {selectedClient.subscriptionName}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardContent className="p-6 space-y-2">
                      <div className="text-[#133C2A]">
                        Статус оплаты: {paymentStatusLabels[selectedClient.paymentStatus] || selectedClient.paymentStatus}
                      </div>
                      <div className="text-[#133C2A]/70">
                        Статус доступа: {accountStatusLabels[selectedClient.accountStatus] || selectedClient.accountStatus}
                      </div>
                      <div className="text-[#133C2A]/70">
                        Сумма: {selectedClient.subscriptionAmount.toLocaleString('ru-RU')} ₽
                      </div>
                      <div className="text-[#133C2A]/70">
                        Дата создания: {formatRuDate(selectedClient.createdAt)}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AddStudentDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        groups={groups}
        parents={parentOptions}
        subscriptions={subscriptions}
        onStudentCreated={() => {
          void refreshClients();
        }}
      />
    </div>
  );
}
