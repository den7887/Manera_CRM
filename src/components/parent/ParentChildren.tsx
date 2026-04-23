import { useState } from 'react';
import { Plus, Edit, Info, AlertCircle, Bell, CreditCard, FileText, TrendingUp } from 'lucide-react';
import { Child } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner@2.0.3';

interface ParentChildrenProps {
  children: Child[];
}

export function ParentChildren({ children }: ParentChildrenProps) {
  const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
  const [isEditChildDialogOpen, setIsEditChildDialogOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [newChildName, setNewChildName] = useState('');
  const [newChildAge, setNewChildAge] = useState('');

  const childrenNeedingRenewal = children.filter(child => child.remainingClasses <= 2);

  const handleAddChild = () => {
    if (!newChildName || !newChildAge) {
      toast.error('Ошибка', {
        description: 'Пожалуйста, заполните все поля',
        duration: 2000,
      });
      return;
    }

    toast.success('Ребёнок добавлен!', {
      description: `${newChildName}, ${newChildAge} лет успешно зарегистрирован(а)`,
      duration: 3000,
    });
    
    setNewChildName('');
    setNewChildAge('');
    setIsAddChildDialogOpen(false);
  };

  const handleEditChild = (childId: string) => {
    setSelectedChildId(childId);
    setIsEditChildDialogOpen(true);
  };

  const handleSaveChildEdit = () => {
    const child = children.find(c => c.id === selectedChildId);
    if (child) {
      toast.success('Профиль обновлён', {
        description: `Изменения в профиле ${child.name} сохранены`,
        duration: 2000,
      });
    }
    setIsEditChildDialogOpen(false);
    setSelectedChildId(null);
  };

  const handleRenewSubscription = (childName: string) => {
    toast.info('Переход к оплате', {
      description: `Открываем форму оплаты абонемента для ${childName}`,
      duration: 2000,
    });
    // В реальности здесь будет переход на страницу платежей
  };

  const handleViewStatistics = (childName: string) => {
    toast.info('Статистика', {
      description: `Открываем подробную статистику для ${childName}`,
      duration: 2000,
    });
  };

  const handlePayForAll = () => {
    const total = childrenNeedingRenewal.length;
    toast.info('Групповая оплата', {
      description: `Открываем форму оплаты для ${total} ${total === 1 ? 'ребёнка' : 'детей'}`,
      duration: 2000,
    });
  };

  const handleChoosePlan = () => {
    toast.info('Выбор плана', {
      description: 'Открываем каталог доступных абонементов',
      duration: 2000,
    });
  };

  const selectedChild = selectedChildId ? children.find(c => c.id === selectedChildId) : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[#133C2A] mb-2">Мои дети</h1>
          <p className="text-[#133C2A]/60">Управление профилями ваших детей</p>
        </div>
        
        <Dialog open={isAddChildDialogOpen} onOpenChange={setIsAddChildDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
            <Plus className="w-5 h-5" />
            Добавить ребенка
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-[#133C2A]">Добавить нового ребёнка</DialogTitle>
              <DialogDescription>
                Введите информацию о вашем ребёнке для регистрации в студии
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="child-name">Имя ребёнка</Label>
                <Input
                  id="child-name"
                  placeholder="Введите имя"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="child-age">Возраст</Label>
                <Input
                  id="child-age"
                  type="number"
                  placeholder="Введите возраст"
                  value={newChildAge}
                  onChange={(e) => setNewChildAge(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <Button
                onClick={handleAddChild}
                className="w-full rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
              >
                Добавить ребёнка
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Reminder Alert */}
      {childrenNeedingRenewal.length > 0 && (
        <Alert className="border-[#D4AF37] bg-gradient-to-r from-[#D4AF37]/10 to-[#D4AF37]/5">
          <AlertCircle className="h-5 w-5 text-[#D4AF37]" />
          <AlertTitle className="text-[#133C2A]">
            Необходимо продлить абонемент
          </AlertTitle>
          <AlertDescription className="text-[#133C2A]/70 space-y-3">
            <div>
              {childrenNeedingRenewal.map((child) => (
                <div key={child.id} className="mt-2">
                  <span className="font-medium text-[#133C2A]">{child.name}</span>:{' '}
                  осталось <span className="font-medium text-[#D4AF37]">{child.remainingClasses}</span>{' '}
                  {child.remainingClasses === 1 ? 'занятие' : 'занятия'}.
                  {child.remainingClasses === 0 && ' Абонемент закончился!'}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePayForAll();
                }}
                className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
                size="sm"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Оплатить абонемент
              </Button>
              <Button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleChoosePlan();
                }}
                variant="outline"
                className="rounded-xl border-[#133C2A]/20 hover:bg-[#133C2A]/5"
                size="sm"
              >
                Выбрать другой план
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* General Subscription Info Banner */}
      <Card className="border-none bg-gradient-to-br from-[#F8F4E3] to-[#D4AF37]/10 soft-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-[#133C2A]">Важная информация об абонементах</h3>
              <div className="space-y-2 text-sm text-[#133C2A]/70">
                <p className="flex items-start gap-2">
                  <span className="text-[#D4AF37]">•</span>
                  <span>Абонемент действует в течение месяца с момента его приобретения</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-[#D4AF37]">•</span>
                  <span>Занятия при пропуске сгорают</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children.map((child) => {
          const needsRenewal = child.remainingClasses <= 2;
          const isUrgent = child.remainingClasses === 0;
          
          return (
            <Card 
              key={child.id} 
              className={`border-none soft-shadow hover-lift ${
                needsRenewal ? 'ring-2 ring-[#D4AF37]' : ''
              }`}
            >
              <div className={`h-3 rounded-t-2xl ${
                isUrgent 
                  ? 'bg-gradient-to-r from-[#D14343] to-[#D4AF37]'
                  : needsRenewal
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#D4AF37]/70'
                  : 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37]'
              }`} />
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <Avatar className="w-20 h-20 border-4 border-[#D4AF37]">
                    <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white text-2xl">
                      {child.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <Button 
                    onClick={() => handleEditChild(child.id)}
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl border-[#133C2A]/20 hover:bg-[#133C2A]/5"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-[#133C2A]">{child.name}</CardTitle>
                  {needsRenewal && (
                    <Bell className={`w-4 h-4 ${isUrgent ? 'text-[#D14343]' : 'text-[#D4AF37]'} animate-pulse`} />
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="border-[#133C2A]/20 text-[#133C2A]">
                    {child.age} лет
                  </Badge>
                  <Badge className="bg-[#D4AF37]/20 text-[#133C2A] border-[#D4AF37]/30">
                    {child.groupName}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Renewal Warning */}
                {needsRenewal && (
                  <div className={`p-3 rounded-xl border ${
                    isUrgent
                      ? 'bg-[#D14343]/5 border-[#D14343]/30'
                      : 'bg-[#D4AF37]/5 border-[#D4AF37]/30'
                  }`}>
                    <div className="flex items-start gap-2">
                      <AlertCircle className={`w-4 h-4 mt-0.5 ${isUrgent ? 'text-[#D14343]' : 'text-[#D4AF37]'}`} />
                      <div className="text-sm">
                        <p className={`font-medium ${isUrgent ? 'text-[#D14343]' : 'text-[#D4AF37]'}`}>
                          {isUrgent ? 'Абонемент закончился!' : 'Заканчивается абонемент'}
                        </p>
                        <p className="text-[#133C2A]/70 text-xs mt-1">
                          {isUrgent 
                            ? 'Продлите абонемент для продолжения занятий' 
                            : `Осталось ${child.remainingClasses} ${child.remainingClasses === 1 ? 'занятие' : 'занятия'}`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Subscription Info */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#D4AF37]/10 to-[#133C2A]/5 border border-[#D4AF37]/20">
                  <div className="text-sm text-[#133C2A]/70 mb-2">Текущий абонемент</div>
                  <div className="text-[#133C2A] mb-3">{child.subscriptionName}</div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#133C2A]/70">Дата приобретения:</span>
                      <span className="text-[#133C2A]">
                        {child.purchaseDate.toLocaleDateString('ru-RU', { 
                          day: 'numeric', 
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#133C2A]/70">Куплено занятий:</span>
                      <span className="text-[#133C2A]">{child.totalClasses}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#133C2A]/70">Посещено:</span>
                      <span className="text-[#133C2A]">{child.attendedClasses}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#133C2A]/70">Осталось занятий:</span>
                      <span className={`font-semibold ${
                        isUrgent 
                          ? 'text-[#D14343]'
                          : needsRenewal
                          ? 'text-[#D4AF37]'
                          : 'text-[#1C8C64]'
                      }`}>
                        {child.remainingClasses}
                      </span>
                    </div>
                    
                    <div className="mt-3">
                      <Progress 
                        value={(child.attendedClasses / child.totalClasses) * 100} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                </div>

                {/* Admin Notes Section */}
                {child.adminNotes && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#133C2A]/5 to-[#D4AF37]/5 border border-[#133C2A]/10">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-[#D4AF37]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm text-[#133C2A] mb-2">Заметка от администратора</h4>
                        <p className="text-sm text-[#133C2A]/70 leading-relaxed">
                          {child.adminNotes}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Buttons */}
                <div className="space-y-2">
                  {needsRenewal && (
                    <Button 
                      onClick={() => handleRenewSubscription(child.name)}
                      className={`w-full rounded-xl ${
                        isUrgent
                          ? 'bg-gradient-to-r from-[#D14343] to-[#D4AF37] hover:opacity-90'
                          : 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90'
                      }`}
                      size="sm"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      {isUrgent ? 'Срочно продлить' : 'Продлить абонемент'}
                    </Button>
                  )}
                  <Button 
                    onClick={() => handleViewStatistics(child.name)}
                    className="w-full rounded-2xl border border-[#133C2A]/20 hover:bg-[#133C2A]/5" 
                    variant="outline" 
                    size="sm"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Подробная статистика
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Add Child Card */}
        <button
          onClick={() => setIsAddChildDialogOpen(true)}
          className="border-2 border-dashed border-[#133C2A]/20 bg-[#F8F4E3]/50 hover:border-[#D4AF37] transition-all rounded-2xl soft-shadow hover-lift"
        >
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-6">
            <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/20 flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-[#D4AF37]" />
            </div>
            <h3 className="text-[#133C2A] mb-2">Добавить ребенка</h3>
            <p className="text-sm text-[#133C2A]/60 text-center">
              Зарегистрируйте профиль для нового ученика
            </p>
          </div>
        </button>
      </div>

      {/* Edit Child Dialog */}
      <Dialog open={isEditChildDialogOpen} onOpenChange={setIsEditChildDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">Редактировать профиль</DialogTitle>
            <DialogDescription>
              Изменение информации о {selectedChild?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedChild && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F8F4E3]">
                <Avatar className="w-16 h-16 border-4 border-[#D4AF37]">
                  <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white text-xl">
                    {selectedChild.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[#133C2A] font-medium">{selectedChild.name}</p>
                  <p className="text-sm text-[#133C2A]/60">{selectedChild.age} лет • {selectedChild.groupName}</p>
                </div>
              </div>
              
              <div className="p-4 rounded-xl border border-[#133C2A]/10 bg-[#F8F4E3]/50">
                <p className="text-sm text-[#133C2A]/70 mb-2">Функция редактирования находится в разработке</p>
                <p className="text-xs text-[#133C2A]/50">
                  Для изменения данных обратитесь к администратору студии
                </p>
              </div>

              <Button
                onClick={handleSaveChildEdit}
                className="w-full rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
              >
                Понятно
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}