import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useState } from 'react';
import { toast } from 'sonner';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, Copy, ExternalLink, Info, Plus, QrCode } from 'lucide-react';
import { Group } from '../../types';
import { confirmClientCashPaymentWithActivation, createClientByAdmin } from '../../lib/backendApi';
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
  existingClient: boolean;
  markAsPaid: boolean;
  serviceStartDate?: Date;
}

interface CompletionState {
  mode: 'activation' | 'payment';
  title: string;
  description: string;
  url: string;
  qrCode?: string | null;
  expiresAt?: string | null;
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
    existingClient: false,
    markCurrentPeriodPaid: false,
    serviceStartDate: undefined as Date | undefined,
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
  const [completionState, setCompletionState] = useState<CompletionState | null>(null);

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

  const formatDateTime = (value?: string | null): string => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Ссылка скопирована');
    } catch {
      toast.error('Не удалось скопировать ссылку');
    }
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
      existingClient: false,
      markCurrentPeriodPaid: false,
      serviceStartDate: undefined,
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
      existingClient: formData.existingClient,
      markAsPaid: formData.markCurrentPeriodPaid,
      serviceStartDate: formData.serviceStartDate,
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
    let backendClientId: string | undefined;
    let createdActivation: CompletionState | null = null;
    let createdPaymentSession: CompletionState | null = null;
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
        mark_as_paid: submission.markAsPaid,
        service_start_date: submission.serviceStartDate ? toIsoDate(submission.serviceStartDate) : undefined,
      });
      savedViaBackend = true;
      backendPaymentId = created?.payment?.id;
      backendClientId = created?.client?.id;
      if (created?.activation?.activation_url) {
        createdActivation = {
          mode: 'activation',
          title: 'Клиент оплачен. Дайте ему отсканировать QR-код для создания PIN.',
          description: 'После создания PIN клиент сможет входить в кабинет по телефону и PIN-коду.',
          url: created.activation.activation_url,
          qrCode: created.activation.qr_code,
          expiresAt: created.activation.expires_at,
        };
      }
      if (created?.payment_session?.payment_session_url) {
        createdPaymentSession = {
          mode: 'payment',
          title: 'Ссылка на страницу оплаты создана',
          description: 'Клиент увидит только страницу оплаты. После успешной онлайн-оплаты система переведёт его на создание PIN.',
          url: created.payment_session.payment_session_url,
          expiresAt: created.payment_session.expires_at,
        };
      }

      if (!submission.markAsPaid && options.confirmCashImmediately && backendClientId) {
        const cashResult = await confirmClientCashPaymentWithActivation(backendClientId, {
          amount: submission.payableAmount,
          comment: 'Оплата наличными внесена при выдаче доступа администратором',
        });
        cashConfirmedOnBackend = true;
        createdActivation = {
          mode: 'activation',
          title: 'Клиент оплачен. Дайте ему отсканировать QR-код для создания PIN.',
          description: 'После создания PIN клиент сможет входить в кабинет по телефону и PIN-коду.',
          url: cashResult.activation_url,
          qrCode: cashResult.qr_code,
          expiresAt: cashResult.expires_at,
        };
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
    const effectivePeriodStart = submission.serviceStartDate ?? paymentCreatedAt;
    const nextPaymentDate = new Date(effectivePeriodStart);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    const isPaidNow = submission.markAsPaid || options.confirmCashImmediately || cashConfirmedOnBackend;

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
      status: isPaidNow ? 'active' : 'inactive',
      attendedClasses: 0,
      totalClasses: submission.subscription.classes,
      missedClasses: 0,
      startDate: effectivePeriodStart,
      subscriptionName: submission.subscription.name,
      subscriptionClasses: submission.subscription.classes,
      remainingClasses: submission.subscription.classes,
      lastPaymentDate: effectivePeriodStart,
      lastPaymentAmount: submission.payableAmount,
      paymentStatus: isPaidNow ? 'paid' : 'pending',
      nextPaymentDate,
      purchaseDate: effectivePeriodStart,
      notes: '',
    };

    onStudentCreated?.(student);

    if (savedViaBackend) {
      if (submission.markAsPaid) {
        toast.success('Клиент добавлен в базу. Дальше нужно выдать ссылку или QR для создания PIN.');
      } else if (submission.paymentMethod === 'cash') {
        if (isPaidNow) {
          toast.success('Оплата внесена. Покажите клиенту QR-код или ссылку для создания PIN.');
        } else {
          toast.success('Ученик добавлен: после подтверждения наличной оплаты можно будет выдать QR для активации кабинета');
        }
      } else {
        toast.success('Ученик добавлен: отправьте клиенту ссылку на страницу оплаты');
      }
    } else {
      if (submission.markAsPaid) {
        toast.success('Клиент добавлен в локальную базу как действующий с уже оплаченным периодом');
      } else if (submission.paymentMethod === 'cash' && isPaidNow) {
        toast.success('Оплата внесена в демо-режиме, доступ считается открытым');
      } else {
        toast.success('Ученик добавлен в локальный демо-список');
      }
    }

    resetForm();
    setCashPaymentDialogOpen(false);
    if (createdActivation) {
      setCompletionState(createdActivation);
    } else if (createdPaymentSession) {
      setCompletionState(createdPaymentSession);
    } else {
      onClose();
    }
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

    if (!submission.markAsPaid && submission.paymentMethod === 'cash') {
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
            Добавить ученика в базу
          </DialogTitle>
          <DialogDescription>
            Можно создать нового ученика или перенести действующего клиента студии с уже оплаченным текущим периодом
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="rounded-3xl border border-[#133C2A]/10 bg-[#FCFBF6] p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="existing-client"
                checked={formData.existingClient}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    existingClient: checked === true,
                    markCurrentPeriodPaid: checked === true,
                    serviceStartDate: checked === true ? (formData.serviceStartDate ?? new Date()) : undefined,
                  })
                }
              />
              <div className="space-y-1">
                <Label htmlFor="existing-client" className="cursor-pointer text-[#133C2A]">
                  Это действующий клиент студии
                </Label>
                <p className="text-sm text-[#133C2A]/62">
                  Используйте этот режим при переносе уже существующей базы в систему.
                </p>
              </div>
            </div>

            {formData.existingClient && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="mark-current-period-paid"
                      checked={formData.markCurrentPeriodPaid}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          markCurrentPeriodPaid: checked === true,
                        })
                      }
                    />
                    <Label htmlFor="mark-current-period-paid" className="cursor-pointer text-[#133C2A]">
                      Текущий период уже оплачен
                    </Label>
                  </div>
                  <p className="text-sm text-[#133C2A]/62">
                    Клиент будет создан сразу со статусом оплаты `Оплачено`.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#133C2A]">Дата начала текущего периода</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left rounded-2xl border-[#133C2A]/20 hover:border-[#D4AF37]"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formatDate(formData.serviceStartDate)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.serviceStartDate}
                        onSelect={(date) => setFormData({ ...formData, serviceStartDate: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>

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
                        {sub.classes > 0 ? `${sub.classes} занятий` : 'без учёта лимита'} • {sub.price.toLocaleString('ru-RU')} ₽
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
            className="rounded-2xl"
          >
            {isSubmitting ? 'Сохраняем...' : formData.paymentMethod === 'cash' ? 'Оплата и доступ в кабинет' : 'Создать оплату'}
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
                {(pendingSubmission?.payableAmount ?? 0).toLocaleString('ru-RU')} ₽
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
              className="rounded-2xl"
            >
              {isSubmitting ? 'Сохраняем...' : 'Оплата получена, создать QR'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(completionState)}
        onOpenChange={(open) => {
          if (!open) {
            setCompletionState(null);
            onClose();
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">{completionState?.title}</DialogTitle>
            <DialogDescription className="text-[#133C2A]/70">
              {completionState?.description}
            </DialogDescription>
          </DialogHeader>

          {completionState ? (
            <div className="space-y-4">
              {completionState.qrCode ? (
                <div className="rounded-3xl border border-[#133C2A]/10 bg-[#FCFBF6] p-5 text-center">
                  <img src={completionState.qrCode} alt="QR-код активации кабинета" className="mx-auto h-56 w-56 rounded-2xl border border-[#133C2A]/10 bg-white p-3" />
                </div>
              ) : (
                <div className="rounded-3xl border border-[#133C2A]/10 bg-[#FCFBF6] p-5">
                  <div className="flex items-center gap-3 text-[#133C2A]">
                    <QrCode className="h-5 w-5 text-[#D4AF37]" />
                    <p className="text-sm">Используйте ссылку ниже, чтобы открыть нужный сценарий на телефоне клиента.</p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-[#133C2A]/10 bg-white p-4">
                <p className="text-xs text-[#133C2A]/55">Ссылка</p>
                <p className="mt-1 break-all text-sm text-[#133C2A]">{completionState.url}</p>
              </div>

              <div className="rounded-2xl border border-[#133C2A]/10 bg-white p-4">
                <p className="text-xs text-[#133C2A]/55">Срок действия</p>
                <p className="mt-1 text-sm text-[#133C2A]">{formatDateTime(completionState.expiresAt)}</p>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-2xl border-[#133C2A]/15"
              onClick={() => completionState && void copyToClipboard(completionState.url)}
            >
              <Copy className="mr-2 h-4 w-4" />
              Скопировать ссылку
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl border-[#133C2A]/15"
              onClick={() => completionState && window.open(completionState.url, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Открыть
            </Button>
            <Button
              className="rounded-2xl"
              onClick={() => {
                setCompletionState(null);
                onClose();
              }}
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
