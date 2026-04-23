import { useState } from 'react';
import { CreditCard, Download, CheckCircle, AlertCircle, Clock, Package, Users, Calendar, Zap, Receipt, ChevronRight, BadgeCheck, Gift } from 'lucide-react';
import { Payment } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { toast } from 'sonner@2.0.3';

interface ParentPaymentsProps {
  payments: Payment[];
}

// Типы абонементов
const subscriptionPlans = [
  {
    id: 'plan-4',
    name: '4 занятия',
    classes: 4,
    price: 3200,
    pricePerClass: 800,
    validity: '1 месяц',
    popular: false,
    savings: 0,
  },
  {
    id: 'plan-8',
    name: '8 занятий',
    classes: 8,
    price: 6000,
    pricePerClass: 750,
    validity: '1 месяц',
    popular: true,
    savings: 400,
  },
  {
    id: 'plan-12',
    name: '12 занятий',
    classes: 12,
    price: 8400,
    pricePerClass: 700,
    validity: '2 месяца',
    popular: false,
    savings: 1200,
  },
  {
    id: 'plan-unlimited',
    name: 'Безлимит',
    classes: null,
    price: 12000,
    pricePerClass: null,
    validity: '1 месяц',
    popular: false,
    savings: 0,
    badge: 'Премиум',
  },
];

// Мок-данные для детей (в реальности будут приходить из props)
const mockChildren = [
  { id: '1', name: 'Анна', remainingClasses: 2, groupName: 'Современный танец' },
  { id: '2', name: 'Мария', remainingClasses: 5, groupName: 'Балет' },
];

export function ParentPayments({ payments }: ParentPaymentsProps) {
  const [selectedPlan, setSelectedPlan] = useState('plan-8');
  const [selectedChild, setSelectedChild] = useState(mockChildren[0].id);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);

  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue');
  const paidPayments = payments.filter(p => p.status === 'paid');
  const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  const getStatusInfo = (status: Payment['status']) => {
    switch (status) {
      case 'paid':
        return { icon: CheckCircle, color: 'text-[#1C8C64]', bg: 'bg-[#1C8C64]/10', label: 'Оплачено' };
      case 'pending':
        return { icon: Clock, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10', label: 'Ожидает оплаты' };
      case 'overdue':
        return { icon: AlertCircle, color: 'text-[#D14343]', bg: 'bg-[#D14343]/10', label: 'Просрочено' };
    }
  };

  const handlePayment = (paymentId: string, amount: number) => {
    toast.success(`Платёж на сумму ${amount} ₽ успешно проведён`, {
      description: 'Квитанция отправлена на вашу электронную почту',
      duration: 3000,
    });
    setIsPaymentDialogOpen(false);
  };

  const handlePurchasePlan = () => {
    const plan = subscriptionPlans.find(p => p.id === selectedPlan);
    const child = mockChildren.find(c => c.id === selectedChild);
    
    if (plan && child) {
      toast.success(`Абонемент "${plan.name}" успешно приобретён для ${child.name}`, {
        description: `${plan.classes} занятий добавлено к остатку`,
        duration: 3000,
      });
      setIsPlanDialogOpen(false);
    }
  };

  const handleDownloadReceipt = (paymentId: string) => {
    toast.success('Квитанция загружена', {
      description: 'Файл сохранён в папку загрузок',
      duration: 2000,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Платежи и абонементы</h1>
          <p className="text-[#133C2A]/60">Управление оплатами и покупка абонементов</p>
        </div>
        
        <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
            <Package className="w-4 h-4" />
            Купить абонемент
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#133C2A] flex items-center gap-2">
                <Package className="w-5 h-5 text-[#D4AF37]" />
                Выберите абонемент
              </DialogTitle>
              <DialogDescription>
                Выберите подходящий план занятий для вашего ребёнка
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Child Selector */}
              <div className="space-y-3">
                <Label className="text-[#133C2A]">Для кого покупаем абонемент?</Label>
                <RadioGroup value={selectedChild} onValueChange={setSelectedChild}>
                  <div className="grid grid-cols-2 gap-3">
                    {mockChildren.map((child) => (
                      <div key={child.id}>
                        <RadioGroupItem value={child.id} id={child.id} className="peer sr-only" />
                        <Label
                          htmlFor={child.id}
                          className="flex flex-col items-start gap-2 rounded-2xl border-2 border-[#133C2A]/10 p-4 cursor-pointer peer-data-[state=checked]:border-[#D4AF37] peer-data-[state=checked]:bg-[#D4AF37]/5 transition-all hover:border-[#D4AF37]/50"
                        >
                          <div className="flex items-center gap-2 w-full">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center text-white">
                              {child.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-[#133C2A]">{child.name}</p>
                              <p className="text-xs text-[#133C2A]/60">{child.groupName}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10 text-xs">
                            Осталось: {child.remainingClasses} занятий
                          </Badge>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              {/* Plans */}
              <div className="space-y-3">
                <Label className="text-[#133C2A]">Выберите тариф</Label>
                <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan}>
                  <div className="grid gap-3">
                    {subscriptionPlans.map((plan) => (
                      <div key={plan.id}>
                        <RadioGroupItem value={plan.id} id={plan.id} className="peer sr-only" />
                        <Label
                          htmlFor={plan.id}
                          className={`flex items-center justify-between gap-4 rounded-2xl border-2 border-[#133C2A]/10 p-5 cursor-pointer peer-data-[state=checked]:border-[#D4AF37] peer-data-[state=checked]:bg-[#D4AF37]/5 transition-all hover:border-[#D4AF37]/50 ${
                            plan.popular ? 'ring-2 ring-[#D4AF37] ring-offset-2' : ''
                          }`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`w-14 h-14 rounded-2xl ${plan.popular ? 'bg-gradient-to-br from-[#D4AF37] to-[#133C2A]' : 'bg-[#133C2A]/10'} flex items-center justify-center`}>
                              <Package className={`w-7 h-7 ${plan.popular ? 'text-white' : 'text-[#133C2A]'}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-[#133C2A]">{plan.name}</p>
                                {plan.popular && (
                                  <Badge className="bg-[#D4AF37] text-white border-0">
                                    Популярный
                                  </Badge>
                                )}
                                {plan.badge && (
                                  <Badge className="bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white border-0">
                                    {plan.badge}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-[#133C2A]/60">
                                <span>{plan.classes ? `${plan.classes} занятий` : 'Неограниченно'}</span>
                                <span>•</span>
                                <span>Действует {plan.validity}</span>
                                {plan.pricePerClass && (
                                  <>
                                    <span>•</span>
                                    <span>{plan.pricePerClass} ₽/занятие</span>
                                  </>
                                )}
                              </div>
                              {plan.savings > 0 && (
                                <Badge variant="outline" className="mt-2 border-[#1C8C64] text-[#1C8C64] bg-[#1C8C64]/5">
                                  <Gift className="w-3 h-3 mr-1" />
                                  Экономия {plan.savings} ₽
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-medium text-[#133C2A]">{plan.price.toLocaleString()} ₽</p>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <Button
                onClick={handlePurchasePlan}
                className="w-full rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 h-12"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Оплатить {subscriptionPlans.find(p => p.id === selectedPlan)?.price.toLocaleString()} ₽
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-none soft-shadow overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-[#D14343] to-[#D4AF37]" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#D14343]/10 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-[#D14343]" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60 mb-1">К оплате</p>
                <p className="text-3xl text-[#133C2A]">{totalPending.toLocaleString()} ₽</p>
                <p className="text-xs text-[#D14343] mt-1">{pendingPayments.length} счетов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-[#1C8C64] to-[#D4AF37]" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1C8C64]/10 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-[#1C8C64]" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60 mb-1">Оплачено в этом месяце</p>
                <p className="text-3xl text-[#133C2A]">{totalPaid.toLocaleString()} ₽</p>
                <p className="text-xs text-[#1C8C64] mt-1">{paidPayments.length} платежей</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center">
                <Users className="w-7 h-7 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60 mb-1">Активные абонементы</p>
                <p className="text-3xl text-[#133C2A]">{mockChildren.length}</p>
                <p className="text-xs text-[#133C2A]/60 mt-1">
                  {mockChildren.reduce((sum, c) => sum + c.remainingClasses, 0)} занятий осталось
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Payment Alert */}
      {pendingPayments.length > 0 && (
        <Card className="border-none soft-shadow bg-gradient-to-r from-[#D14343]/5 to-[#D4AF37]/5 border-l-4 border-l-[#D14343]">
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#D14343]/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-[#D14343] animate-pulse" />
                </div>
                <div>
                  <CardTitle className="text-[#133C2A]">Требуется оплата</CardTitle>
                  <CardDescription className="mt-1">
                    У вас {pendingPayments.length} {pendingPayments.length === 1 ? 'неоплаченный счёт' : 'неоплаченных счёта'} на общую сумму {totalPending.toLocaleString()} ₽
                  </CardDescription>
                </div>
              </div>
              <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Оплатить всё ({totalPending.toLocaleString()} ₽)
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-[#133C2A]">Подтверждение оплаты</DialogTitle>
                    <DialogDescription>
                      Вы собираетесь оплатить {pendingPayments.length} счетов на сумму {totalPending.toLocaleString()} ₽
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-[#F8F4E3] p-4 space-y-2">
                      {pendingPayments.map((payment) => (
                        <div key={payment.id} className="flex justify-between text-sm">
                          <span className="text-[#133C2A]/70">{payment.description}</span>
                          <span className="text-[#133C2A] font-medium">{payment.amount} ₽</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-[#133C2A]/10 flex justify-between">
                        <span className="text-[#133C2A]">Итого:</span>
                        <span className="text-[#133C2A] text-lg">{totalPending.toLocaleString()} ₽</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handlePayment('all', totalPending)}
                      className="w-full rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
                    >
                      <BadgeCheck className="w-4 h-4 mr-2" />
                      Подтвердить оплату
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Children Subscriptions Status */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#D4AF37]" />
            Абонементы детей
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {mockChildren.map((child) => (
              <div
                key={child.id}
                className="p-5 rounded-2xl bg-gradient-to-r from-[#F8F4E3] to-white border border-[#133C2A]/10 hover:border-[#D4AF37] transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center text-white text-xl">
                    {child.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-[#133C2A]">{child.name}</p>
                    <p className="text-sm text-[#133C2A]/60">{child.groupName}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#133C2A]/60 mb-1">Осталось занятий</p>
                    <p className="text-2xl text-[#133C2A]">{child.remainingClasses}</p>
                  </div>
                  <Button
                    onClick={() => setIsPlanDialogOpen(true)}
                    size="sm"
                    className={`rounded-xl ${
                      child.remainingClasses <= 2
                        ? 'bg-gradient-to-r from-[#D14343] to-[#D4AF37]'
                        : 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37]'
                    } hover:opacity-90`}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Продлить
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment History Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-white border border-[#133C2A]/10 rounded-2xl p-1">
          <TabsTrigger 
            value="all" 
            className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#133C2A] data-[state=active]:to-[#D4AF37] data-[state=active]:text-white"
          >
            <Receipt className="w-4 h-4 mr-2" />
            Все платежи
          </TabsTrigger>
          <TabsTrigger 
            value="pending" 
            className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#133C2A] data-[state=active]:to-[#D4AF37] data-[state=active]:text-white"
          >
            <Clock className="w-4 h-4 mr-2" />
            Ожидают оплаты ({pendingPayments.length})
          </TabsTrigger>
          <TabsTrigger 
            value="paid" 
            className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#133C2A] data-[state=active]:to-[#D4AF37] data-[state=active]:text-white"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Оплаченные
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="space-y-3">
            {payments.length > 0 ? (
              payments.map((payment) => {
                const statusInfo = getStatusInfo(payment.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={payment.id} className="border-none soft-shadow hover-lift overflow-hidden group">
                    <div className={`h-1 ${payment.status === 'overdue' ? 'bg-[#D14343]' : payment.status === 'pending' ? 'bg-[#D4AF37]' : 'bg-[#1C8C64]'}`} />
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`w-14 h-14 rounded-2xl ${statusInfo.bg} flex items-center justify-center flex-shrink-0`}>
                            <StatusIcon className={`w-7 h-7 ${statusInfo.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[#133C2A] mb-1 font-medium">{payment.description}</h4>
                            <div className="flex items-center gap-3 text-sm text-[#133C2A]/60 flex-wrap">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(payment.date).toLocaleDateString('ru-RU', { 
                                  day: 'numeric', 
                                  month: 'long', 
                                  year: 'numeric' 
                                })}
                              </div>
                              <span>•</span>
                              <Badge variant="outline" className={`${statusInfo.bg} ${statusInfo.color} border-0`}>
                                {statusInfo.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl text-[#133C2A] font-medium">{payment.amount.toLocaleString()} ₽</p>
                          </div>
                          {payment.status === 'paid' ? (
                            <Button 
                              onClick={() => handleDownloadReceipt(payment.id)}
                              variant="outline" 
                              size="sm" 
                              className="rounded-xl border-[#133C2A]/20 hover:border-[#1C8C64] hover:bg-[#1C8C64]/5"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Квитанция
                            </Button>
                          ) : (
                            <Button 
                              onClick={() => handlePayment(payment.id, payment.amount)}
                              size="sm" 
                              className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Оплатить
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="border-none soft-shadow">
                <CardContent className="p-12 text-center text-[#133C2A]/60">
                  <Receipt className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg mb-2">Нет платежей</p>
                  <p className="text-sm">История транзакций пока пуста</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <div className="space-y-3">
            {pendingPayments.length > 0 ? (
              pendingPayments.map((payment) => {
                const statusInfo = getStatusInfo(payment.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={payment.id} className="border-none soft-shadow hover-lift overflow-hidden">
                    <div className={`h-1 ${payment.status === 'overdue' ? 'bg-[#D14343]' : 'bg-[#D4AF37]'}`} />
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`w-14 h-14 rounded-2xl ${statusInfo.bg} flex items-center justify-center`}>
                            <StatusIcon className={`w-7 h-7 ${statusInfo.color}`} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-[#133C2A] mb-1 font-medium">{payment.description}</h4>
                            <p className="text-sm text-[#133C2A]/60">
                              {new Date(payment.date).toLocaleDateString('ru-RU', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric' 
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-2xl text-[#133C2A] font-medium">{payment.amount.toLocaleString()} ₽</p>
                          <Button 
                            onClick={() => handlePayment(payment.id, payment.amount)}
                            size="sm" 
                            className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Оплатить
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="border-none soft-shadow">
                <CardContent className="p-12 text-center text-[#133C2A]/60">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-30 text-[#1C8C64]" />
                  <p className="text-lg mb-2 text-[#1C8C64]">Все счета оплачены!</p>
                  <p className="text-sm">У вас нет неоплаченных счетов</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="paid" className="mt-6">
          <div className="space-y-3">
            {paidPayments.length > 0 ? (
              paidPayments.map((payment) => {
                const statusInfo = getStatusInfo(payment.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={payment.id} className="border-none soft-shadow hover-lift overflow-hidden">
                    <div className="h-1 bg-[#1C8C64]" />
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`w-14 h-14 rounded-2xl ${statusInfo.bg} flex items-center justify-center`}>
                            <StatusIcon className={`w-7 h-7 ${statusInfo.color}`} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-[#133C2A] mb-1 font-medium">{payment.description}</h4>
                            <p className="text-sm text-[#133C2A]/60">
                              {new Date(payment.date).toLocaleDateString('ru-RU', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric' 
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-2xl text-[#133C2A] font-medium">{payment.amount.toLocaleString()} ₽</p>
                          <Button 
                            onClick={() => handleDownloadReceipt(payment.id)}
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl border-[#133C2A]/20 hover:border-[#1C8C64] hover:bg-[#1C8C64]/5"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Квитанция
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="border-none soft-shadow">
                <CardContent className="p-12 text-center text-[#133C2A]/60">
                  <Receipt className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg mb-2">Нет оплаченных счетов</p>
                  <p className="text-sm">История оплаченных транзакций пока пуста</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}