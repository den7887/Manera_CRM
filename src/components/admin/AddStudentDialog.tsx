import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useState } from 'react';
import { toast } from 'sonner';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, Info, Plus } from 'lucide-react';
import { Group } from '../../types';
import { confirmCashPayment, createClientByAdmin } from '../../lib/backendApi';
import { Checkbox } from '../ui/checkbox';

export interface AdminStudentViewModel {
  id: string;
  name: string;
  birthDate: Date;
  age: number;
  groupId: string;
  groupName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  status: 'active' | 'inactive' | 'trial' | 'frozen';
  attendedClasses: number;
  totalClasses: number;
  missedClasses: number;
  startDate: Date;
  subscriptionName: string;
  subscriptionClasses: number;
  remainingClasses: number;
  lastPaymentDate: Date;
  lastPaymentAmount: number;
  paymentStatus: 'paid' | 'pending' | 'overdue';
  nextPaymentDate: Date;
  purchaseDate: Date;
  notes: string;
}

interface AddStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  parents: {
    id: string;
    name: string;
    email: string;
    phone: string;
  }[];
  subscriptions: {
    id: string;
    name: string;
    classes: number;
    price: number;
  }[];
  onStudentCreated?: (student: AdminStudentViewModel) => void;
}

interface SubmissionData {
  studentName: string;
  birthDate: Date;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  groupId: string;
  groupName: string;
  subscription: {
    id: string;
    name: string;
    classes: number;
    price: number;
  };
  payableAmount: number;
  paymentMethod: 'cash' | 'online';
}

export function AddStudentDialog({
  isOpen,
  onClose,
  groups,
  parents,
  subscriptions,
  onStudentCreated,
}: AddStudentDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    birthDate: undefined as Date | undefined,
    parentId: '',
    groupId: '',
    subscriptionId: '',
    discountEnabled: false,
    discountedAmount: '',
    paymentMethod: 'cash' as 'cash' | 'online',
  });

  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  const [isNewParent, setIsNewParent] = useState(false);
  const [newParentData, setNewParentData] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cashPaymentDialogOpen, setCashPaymentDialogOpen] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<SubmissionData | null>(null);

  // Функция для расчета возраста
  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Обработчик изменения даты рождения
  const handleBirthDateChange = (date: Date | undefined) => {
    setFormData({ ...formData, birthDate: date });
    if (date) {
      const age = calculateAge(date);
      setCalculatedAge(age);
    } else {
      setCalculatedAge(null);
    }
  };

  // Получаем выбранный абонемент
  const selectedSubscription = subscriptions.find(s => s.id === formData.subscriptionId);

  // Форматирование даты
  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'Выберите дату';
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const toIsoDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      birthDate: undefined,
      parentId: '',
      groupId: '',
      subscriptionId: '',
      discountEnabled: false,
      discountedAmount: '',
      paymentMethod: 'cash',
    });
    setCalculatedAge(null);
    setIsNewParent(false);
    setNewParentData({
      name: '',
      phone: '',
      email: '',
    });
    setPendingSubmission(null);
  };

  const validateAndBuildSubmission = (): SubmissionData | null => {
    // Валидация обязательных полей
    if (!formData.name.trim()) {
      toast.error('Введите ФИО ученика');
      return null;
    }
    if (!formData.birthDate) {
      toast.error('Выберите дату рождения');
      return null;
    }
    if (!isNewParent && !formData.parentId) {
      toast.error('Выберите родителя');
      return null;
    }
    
    // Валидация данных нового родителя
    if (isNewParent) {
      if (!newParentData.name.trim()) {
        toast.error('Введите ФИО родителя');
        return null;
      }
      if (!newParentData.phone.trim()) {
        toast.error('Введите телефон родителя');
        return null;
      }
    }
    
    if (!formData.subscriptionId) {
      toast.error('Выберите абонемент');
      return null;
    }

    const selectedParent = !isNewParent ? parents.find((p) => p.id === formData.parentId) : null;
    if (!isNewParent && !selectedParent) {
      toast.error('Не удалось определить выбранного родителя');
      return null;
    }

    if (!selectedSubscription) {
      toast.error('Не удалось определить выбранный абонемент');
      return null;
    }

    let payableAmount = selectedSubscription.price;
    if (formData.discountEnabled) {
      const customAmount = Number(formData.discountedAmount);
      if (!Number.isFinite(customAmount) || customAmount <= 0) {
        toast.error('Введите корректную сумму со скидкой');
        return null;
      }
      if (customAmount > selectedSubscription.price) {
        toast.error('Сумма со скидкой не может быть выше базовой стоимости абонемента');
        return null;
      }
      payableAmount = customAmount;
    }

    const parentName = isNewParent ? newParentData.name.trim() : selectedParent!.name;
    const parentPhone = isNewParent ? newParentData.phone.trim() : selectedParent!.phone;
    const parentEmail = isNewParent ? newParentData.email.trim() : (selectedParent!.email || '');
    const selectedGroup = groups.find((group) => group.id === formData.groupId);
    return {
      studentName: formData.name.trim(),
      birthDate: formData.birthDate,
      parentName,
      parentPhone,
      parentEmail,
      groupId: formData.groupId || '',
      groupName: selectedGroup?.name || 'Не назначена',
      subscription: selectedSubscription,
      payableAmount,
      paymentMethod: formData.paymentMethod,
    };
  };

  const submitStudent = async (submission: SubmissionData, options: { confirmCashImmediately: boolean }) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    let savedViaBackend = false;
    let cashConfirmedOnBackend = false;
    let backendPaymentId: string | undefined;
    const paymentCreatedAt = new Date();

    try {
      const created = await createClientByAdmin({
        parent_full_name: submission.parentName,
        child_full_name: submission.studentName,
        child_birth_date: toIsoDate(submission.birthDate),
        parent_phone: submission.parentPhone,
        subscription_name: submission.subscription.name,
        subscription_amount: submission.payableAmount,
        payment_method: submission.paymentMethod,
        group_id: submission.groupId || undefined,
        notes: undefined,
      });
      savedViaBackend = true;
      backendPaymentId = created?.payment?.id;

      if (options.confirmCashImmediately && backendPaymentId) {
        await confirmCashPayment(backendPaymentId, {
          paid_amount: submission.payableAmount,
          comment: 'Оплата наличными внесена при выдаче доступа администратором',
        });
        cashConfirmedOnBackend = true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      const lowered = message.toLowerCase();
      const isBackendUnavailable =
        lowered.includes('failed to fetch') ||
        lowered.includes('network') ||
        lowered.includes('load failed') ||
        lowered.includes('http 500') ||
        lowered.includes('http 502') ||
        lowered.includes('http 503') ||
        lowered.includes('http 504');

      if (!isBackendUnavailable) {
        toast.error(message);
        setIsSubmitting(false);
        return;
      }

      toast.warning('Backend недоступен: запись создана только в локальном демо-режиме');
    }

    const age = calculateAge(submission.birthDate);
    const nextPaymentDate = new Date(paymentCreatedAt);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    const isCashFlow = submission.paymentMethod === 'cash';
    const isPaidNow = options.confirmCashImmediately || cashConfirmedOnBackend;

    const student: AdminStudentViewModel = {
      id: `student-${Date.now()}`,
      name: submission.studentName,
      birthDate: submission.birthDate,
      age,
      groupId: submission.groupId,
      groupName: submission.groupName,
      parentName: submission.parentName,
      parentEmail: submission.parentEmail,
      parentPhone: submission.parentPhone,
      status: isCashFlow && isPaidNow ? 'active' : 'inactive',
      attendedClasses: 0,
      totalClasses: submission.subscription.classes,
      missedClasses: 0,
      startDate: paymentCreatedAt,
      subscriptionName: submission.subscription.name,
      subscriptionClasses: submission.subscription.classes,
      remainingClasses: submission.subscription.classes,
      lastPaymentDate: paymentCreatedAt,
      lastPaymentAmount: submission.payableAmount,
      paymentStatus: isCashFlow && isPaidNow ? 'paid' : 'pending',
      nextPaymentDate,
      purchaseDate: paymentCreatedAt,
      notes: '',
    };

    onStudentCreated?.(student);

    if (savedViaBackend) {
      if (submission.paymentMethod === 'cash') {
        if (isPaidNow) {
          toast.success('Оплата внесена. Родителю сразу открыт полный доступ в кабинет');
        } else {
          toast.success('Ученик добавлен: доступ родителя откроется после подтверждения наличной оплаты');
        }
      } else {
        toast.success('Ученик добавлен: доступ родителя откроется автоматически после онлайн-оплаты');
      }
    } else {
      if (submission.paymentMethod === 'cash' && isPaidNow) {
        toast.success('Оплата внесена в демо-режиме, доступ считается открытым');
      } else {
        toast.success('Ученик добавлен в локальный демо-список');
      }
    }

    resetForm();
    setCashPaymentDialogOpen(false);
    onClose();
    setIsSubmitting(false);
  };

  // Обработчик первичной кнопки
  const handleProvideAccess = async () => {
    if (isSubmitting) {
      return;
    }

    const submission = validateAndBuildSubmission();
    if (!submission) {
      return;
    }

    if (submission.paymentMethod === 'cash') {
      setPendingSubmission(submission);
      setCashPaymentDialogOpen(true);
      return;
    }

    await submitStudent(submission, { confirmCashImmediately: false });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#133C2A] text-2xl">
            Добавить нового ученика
          </DialogTitle>
          <DialogDescription>
            Заполните информацию о новом ученике студии
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* ФИО */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[#133C2A]">
              ФИО ученика <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Иванова Мария Александровна"
              className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
          </div>

          {/* Дата рождения */}
          <div className="space-y-2">
            <Label className="text-[#133C2A]">
              Дата рождения <span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left rounded-2xl border-[#133C2A]/20 hover:border-[#D4AF37]"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDate(formData.birthDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.birthDate}
                  onSelect={handleBirthDateChange}
                  initialFocus
                  defaultMonth={new Date(2015, 0)}
                />
              </PopoverContent>
            </Popover>
            {calculatedAge !== null && (
              <p className="text-sm text-[#133C2A]/60">
                Возраст: {calculatedAge} {calculatedAge === 1 ? 'год' : calculatedAge < 5 ? 'года' : 'лет'}
              </p>
            )}
          </div>

          {/* Родитель */}
          <div className="space-y-2">
            <Label htmlFor="parent" className="text-[#133C2A]">
              Родитель <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={isNewParent ? 'new' : formData.parentId} 
              onValueChange={(value) => {
                if (value === 'new') {
                  setIsNewParent(true);
                  setFormData({ ...formData, parentId: 'new' });
                } else {
                  setIsNewParent(false);
                  setFormData({ ...formData, parentId: value });
                }
              }}
            >
              <SelectTrigger className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]">
                <SelectValue placeholder="Выберите родителя" />
              </SelectTrigger>
              <SelectContent>
                {parents.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    <div className="space-y-1">
                      <div>{parent.name}</div>
                      <div className="text-xs text-[#133C2A]/60">{parent.phone}</div>
                    </div>
                  </SelectItem>
                ))}
                <SelectItem value="new">
                  <div className="flex items-center gap-2 text-[#D4AF37]">
                    <Plus className="w-4 h-4" />
                    <span>Добавить нового родителя</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Новый родитель - поля ввода */}
          {isNewParent && (
            <div className="space-y-4 p-4 rounded-2xl bg-[#D4AF37]/5 border border-[#D4AF37]/20 animate-in slide-in-from-top-4">
              <div className="flex items-center gap-2 text-[#133C2A]">
                <Info className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-sm">Данные нового родителя</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newParentName" className="text-[#133C2A]">
                  ФИО родителя <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="newParentName"
                  value={newParentData.name}
                  onChange={(e) => setNewParentData({ ...newParentData, name: e.target.value })}
                  placeholder="Иванова Анна Сергеевна"
                  className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newParentPhone" className="text-[#133C2A]">
                  Телефон <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="newParentPhone"
                  value={newParentData.phone}
                  onChange={(e) => setNewParentData({ ...newParentData, phone: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                  className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newParentEmail" className="text-[#133C2A]">
                  Email
                </Label>
                <Input
                  id="newParentEmail"
                  type="email"
                  value={newParentData.email}
                  onChange={(e) => setNewParentData({ ...newParentData, email: e.target.value })}
                  placeholder="anna.ivanova@email.com"
                  className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>
            </div>
          )}

          {/* Группа */}
          <div className="space-y-2">
            <Label htmlFor="group" className="text-[#133C2A]">Группа (необязательно)</Label>
            <Select
              value={formData.groupId || 'none'}
              onValueChange={(value) => setFormData({ ...formData, groupId: value === 'none' ? '' : value })}
            >
              <SelectTrigger className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]">
                <SelectValue placeholder="Без назначения в группу" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без назначения в группу</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Абонемент */}
          <div className="space-y-2">
            <Label htmlFor="subscription" className="text-[#133C2A]">
              Абонемент <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.subscriptionId}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  subscriptionId: value,
                  discountEnabled: false,
                  discountedAmount: '',
                })
              }
            >
              <SelectTrigger className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]">
                <SelectValue placeholder="Выберите абонемент" />
              </SelectTrigger>
              <SelectContent>
                {subscriptions.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{sub.name}</span>
                      <span className="text-sm text-[#133C2A]/60">
                        {sub.classes} занятий • {sub.price} ₽
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Способ оплаты */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod" className="text-[#133C2A]">
              Способ оплаты <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value: 'cash' | 'online') => setFormData({ ...formData, paymentMethod: value })}
            >
              <SelectTrigger className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]">
                <SelectValue placeholder="Выберите способ оплаты" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Наличные (подтверждает администратор)</SelectItem>
                <SelectItem value="online">Онлайн (через платежный сервис)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="discount-enabled"
                checked={formData.discountEnabled}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    discountEnabled: checked === true,
                    discountedAmount: checked === true ? formData.discountedAmount : '',
                  })
                }
              />
              <Label htmlFor="discount-enabled" className="cursor-pointer text-[#133C2A]">
                Применить скидку
              </Label>
            </div>
            {formData.discountEnabled && (
              <div className="space-y-2 pt-1">
                <Label htmlFor="discountedAmount" className="text-[#133C2A]">
                  Новая сумма к оплате
                </Label>
                <Input
                  id="discountedAmount"
                  type="number"
                  min="1"
                  value={formData.discountedAmount}
                  onChange={(e) => setFormData({ ...formData, discountedAmount: e.target.value })}
                  placeholder={selectedSubscription ? `${selectedSubscription.price}` : 'Введите сумму'}
                  className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>
            )}
          </div>

        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-2xl border-[#133C2A]/20 hover:bg-[#133C2A]/5"
          >
            Отмена
          </Button>
          <Button
            onClick={handleProvideAccess}
            disabled={isSubmitting}
            className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#1C8C64] text-white hover:opacity-90"
          >
            {isSubmitting ? 'Сохраняем...' : 'Предоставить доступ'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={cashPaymentDialogOpen} onOpenChange={setCashPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">Подтверждение наличной оплаты</DialogTitle>
            <DialogDescription className="text-[#133C2A]/70">
              Примите оплату наличными средствами{' '}
              <span className="font-semibold text-[#133C2A]">
                {pendingSubmission?.payableAmount.toLocaleString('ru-RU')} ₽
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCashPaymentDialogOpen(false)}
              disabled={isSubmitting}
              className="rounded-2xl border-[#133C2A]/20 hover:bg-[#133C2A]/5"
            >
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (pendingSubmission) {
                  submitStudent(pendingSubmission, { confirmCashImmediately: true });
                }
              }}
              disabled={isSubmitting || !pendingSubmission}
              className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white hover:opacity-90"
            >
              {isSubmitting ? 'Сохраняем...' : 'Оплата внесена'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
