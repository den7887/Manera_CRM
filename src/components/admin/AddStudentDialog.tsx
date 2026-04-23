import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, Info, Plus } from 'lucide-react';
import { Group } from '../../types';

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
}

export function AddStudentDialog({
  isOpen,
  onClose,
  groups,
  parents,
  subscriptions,
}: AddStudentDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    birthDate: undefined as Date | undefined,
    gender: '',
    groupId: '',
    parentId: '',
    subscriptionId: '',
    usedClasses: 0,
    purchaseDate: new Date(),
    notes: '',
    medicalNotes: '',
  });

  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  const [isNewParent, setIsNewParent] = useState(false);
  const [newParentData, setNewParentData] = useState({
    name: '',
    phone: '',
    email: '',
  });

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
  const remainingClasses = selectedSubscription ? selectedSubscription.classes - formData.usedClasses : 0;

  // Форматирование даты
  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'Выберите дату';
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // Обработчик сохранения
  const handleSave = () => {
    // Валидация обязательных полей
    if (!formData.name.trim()) {
      toast.error('Введите ФИО ученика');
      return;
    }
    if (!formData.birthDate) {
      toast.error('Выберите дату рождения');
      return;
    }
    if (!formData.gender) {
      toast.error('Выберите пол');
      return;
    }
    if (!formData.groupId) {
      toast.error('Выберите группу');
      return;
    }
    if (!formData.parentId) {
      toast.error('Выберите родителя');
      return;
    }
    
    // Валидация данных нового родителя
    if (isNewParent) {
      if (!newParentData.name.trim()) {
        toast.error('Введите ФИО родителя');
        return;
      }
      if (!newParentData.phone.trim()) {
        toast.error('Введите телефон родителя');
        return;
      }
    }
    
    if (!formData.subscriptionId) {
      toast.error('Выберите абонемент');
      return;
    }

    // Здесь будет логика сохранения в базу данных
    if (isNewParent) {
      console.log('Создание нового родителя:', newParentData);
    }
    console.log('Создание нового студента:', formData);

    toast.success('Ученик успешно добавлен!');
    
    // Сброс формы
    setFormData({
      name: '',
      birthDate: undefined,
      gender: '',
      groupId: '',
      parentId: '',
      subscriptionId: '',
      usedClasses: 0,
      purchaseDate: new Date(),
      notes: '',
      medicalNotes: '',
    });
    setCalculatedAge(null);
    setIsNewParent(false);
    setNewParentData({
      name: '',
      phone: '',
      email: '',
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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

          {/* Дата рождения и пол */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="gender" className="text-[#133C2A]">
                Пол <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                <SelectTrigger className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]">
                  <SelectValue placeholder="Выберите пол" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Женский</SelectItem>
                  <SelectItem value="male">Мужской</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Группа */}
          <div className="space-y-2">
            <Label htmlFor="group" className="text-[#133C2A]">
              Группа <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.groupId} onValueChange={(value) => setFormData({ ...formData, groupId: value })}>
              <SelectTrigger className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]">
                <SelectValue placeholder="Выберите группу" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: group.color }}
                      />
                      {group.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* Абонемент */}
          <div className="space-y-2">
            <Label htmlFor="subscription" className="text-[#133C2A]">
              Абонемент <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.subscriptionId} onValueChange={(value) => setFormData({ ...formData, subscriptionId: value })}>
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

          {/* Использовано занятий и дата покупки */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usedClasses" className="text-[#133C2A]">
                Использовано занятий
              </Label>
              <Input
                id="usedClasses"
                type="number"
                min="0"
                max={selectedSubscription?.classes || 0}
                value={formData.usedClasses}
                onChange={(e) => setFormData({ ...formData, usedClasses: parseInt(e.target.value) || 0 })}
                className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
              {selectedSubscription && (
                <p className="text-sm text-[#133C2A]/60">
                  Осталось: {remainingClasses} из {selectedSubscription.classes}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[#133C2A]">Дата покупки абонемента</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left rounded-2xl border-[#133C2A]/20 hover:border-[#D4AF37]"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDate(formData.purchaseDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.purchaseDate}
                    onSelect={(date) => setFormData({ ...formData, purchaseDate: date || new Date() })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Заметки администратора */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-[#133C2A]">
              Заметки администратора
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Успехи, особенности, рекомендации..."
              className="min-h-[80px] rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20">
              <Info className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
              <span className="text-xs text-[#133C2A]/70">
                Эта заметка будет видна родителю ученика
              </span>
            </div>
          </div>

          {/* Медицинские ограничения */}
          <div className="space-y-2">
            <Label htmlFor="medicalNotes" className="text-[#133C2A]">
              Медицинские ограничения
            </Label>
            <Textarea
              id="medicalNotes"
              value={formData.medicalNotes}
              onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
              placeholder="Аллергии, противопоказания, особенности здоровья..."
              className="min-h-[80px] rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-2xl border-[#133C2A]/20 hover:bg-[#133C2A]/5"
          >
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#1C8C64] text-white hover:opacity-90"
          >
            Добавить ученика
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}