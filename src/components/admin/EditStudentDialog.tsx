import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner@2.0.3';
import { Save, X, Plus, Info } from 'lucide-react';
import { Group } from '../../types';

// Тип для данных студента (расширенный)
interface StudentData {
  id: string;
  name: string;
  birthDate: Date;
  gender?: 'male' | 'female';
  age: number;
  groupId: string;
  groupName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  subscriptionName: string;
  subscriptionClasses: number;
  attendedClasses: number;
  remainingClasses: number;
  purchaseDate: Date;
  notes?: string;
  medicalRestrictions?: string;
}

interface EditStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentData | null;
  groups: Group[];
  parents: { id: string; name: string; email: string; phone: string }[];
  subscriptions: { id: string; name: string; lessonsCount: number }[];
}

export function EditStudentDialog({ 
  isOpen, 
  onClose, 
  student, 
  groups, 
  parents,
  subscriptions 
}: EditStudentDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    gender: '' as 'male' | 'female' | '',
    groupId: '',
    parentId: '',
    subscriptionId: '',
    totalClasses: 0,
    attendedClasses: 0,
    purchaseDate: '',
    notes: '',
    medicalRestrictions: '',
  });

  // Функция для расчета возраста
  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Вычисляемое поле: осталось занятий
  const remainingClasses = formData.totalClasses - formData.attendedClasses;

  // Предзаполнение формы при открытии
  useEffect(() => {
    if (student && isOpen) {
      // Находим parentId по имени родителя
      const parentData = parents.find(p => p.name === student.parentName);
      
      // Находим subscriptionId по имени абонемента
      const subscriptionData = subscriptions.find(s => s.name === student.subscriptionName);

      setFormData({
        name: student.name,
        birthDate: student.birthDate.toISOString().split('T')[0],
        gender: student.gender || '',
        groupId: student.groupId,
        parentId: parentData?.id || '',
        subscriptionId: subscriptionData?.id || '',
        totalClasses: student.subscriptionClasses,
        attendedClasses: student.attendedClasses,
        purchaseDate: student.purchaseDate.toISOString().split('T')[0],
        notes: student.notes || '',
        medicalRestrictions: student.medicalRestrictions || '',
      });
    }
  }, [student, isOpen, parents, subscriptions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    if (!formData.name.trim()) {
      toast.error('Введите ФИО ребенка');
      return;
    }
    if (!formData.birthDate) {
      toast.error('Укажите дату рождения');
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
    if (!formData.subscriptionId) {
      toast.error('Выберите абонемент');
      return;
    }
    if (formData.attendedClasses > formData.totalClasses) {
      toast.error('Посещено занятий не может быть больше общего количества');
      return;
    }

    // Здесь будет сохранение в БД (после интеграции с backend)
    toast.success(`Данные ученика ${formData.name} успешно обновлены!`);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  // Обработчик изменения абонемента (автоматическое заполнение totalClasses)
  const handleSubscriptionChange = (subscriptionId: string) => {
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    setFormData(prev => ({
      ...prev,
      subscriptionId,
      totalClasses: subscription?.lessonsCount || 0,
    }));
  };

  if (!student) return null;

  const age = calculateAge(formData.birthDate);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-[#133C2A] text-xl">
            Редактирование ученика
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Секция 1: Основная информация */}
          <div className="space-y-4">
            <h3 className="text-[#133C2A] pb-2 border-b border-[#133C2A]/10">
              Основная информация
            </h3>

            {/* ФИО */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#133C2A]">
                ФИО ребенка <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Иванова Мария Александровна"
                required
                className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Дата рождения */}
              <div className="space-y-2">
                <Label htmlFor="birthDate" className="text-[#133C2A]">
                  Дата рождения <span className="text-red-500">*</span>
                  {formData.birthDate && (
                    <span className="text-[#D4AF37] ml-2">
                      (возраст: {age} {age === 1 ? 'год' : age >= 2 && age <= 4 ? 'года' : 'лет'})
                    </span>
                  )}
                </Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  required
                  className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>

              {/* Пол */}
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-[#133C2A]">
                  Пол
                </Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value: 'male' | 'female') => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]">
                    <SelectValue placeholder="Выберите пол" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Девочка</SelectItem>
                    <SelectItem value="male">Мальчик</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Группа */}
              <div className="space-y-2">
                <Label htmlFor="group" className="text-[#133C2A]">
                  Группа <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.groupId}
                  onValueChange={(value) => setFormData({ ...formData, groupId: value })}
                  required
                >
                  <SelectTrigger className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]">
                    <SelectValue placeholder="Выберите группу" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name} ({group.ageRange})
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
                  value={formData.parentId}
                  onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                  required
                >
                  <SelectTrigger className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]">
                    <SelectValue placeholder="Выберите родителя" />
                  </SelectTrigger>
                  <SelectContent>
                    {parents.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.name} ({parent.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Секция 2: Абонемент */}
          <div className="space-y-4">
            <h3 className="text-[#133C2A] pb-2 border-b border-[#133C2A]/10">
              Абонемент
            </h3>

            {/* Абонемент */}
            <div className="space-y-2">
              <Label htmlFor="subscription" className="text-[#133C2A]">
                Абонемент <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.subscriptionId}
                onValueChange={handleSubscriptionChange}
                required
              >
                <SelectTrigger className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]">
                  <SelectValue placeholder="Выберите абонемент" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptions.map((subscription) => (
                    <SelectItem key={subscription.id} value={subscription.id}>
                      {subscription.name} ({subscription.lessonsCount} занятий)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Всего занятий */}
              <div className="space-y-2">
                <Label htmlFor="totalClasses" className="text-[#133C2A]">
                  Всего занятий
                </Label>
                <Input
                  id="totalClasses"
                  type="number"
                  min="0"
                  value={formData.totalClasses}
                  onChange={(e) => setFormData({ ...formData, totalClasses: parseInt(e.target.value) || 0 })}
                  className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                  disabled
                />
              </div>

              {/* Использовано занятий */}
              <div className="space-y-2">
                <Label htmlFor="attendedClasses" className="text-[#133C2A]">
                  Использовано занятий
                </Label>
                <Input
                  id="attendedClasses"
                  type="number"
                  min="0"
                  max={formData.totalClasses}
                  value={formData.attendedClasses}
                  onChange={(e) => setFormData({ ...formData, attendedClasses: parseInt(e.target.value) || 0 })}
                  className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>

              {/* Осталось занятий (вычисляемое) */}
              <div className="space-y-2">
                <Label className="text-[#133C2A]">
                  Осталось занятий
                </Label>
                <div className="h-11 rounded-2xl border border-[#133C2A]/20 bg-[#F8F4E3] flex items-center justify-center">
                  <span className={`text-lg ${remainingClasses <= 2 ? 'text-[#D4AF37]' : 'text-[#133C2A]'}`}>
                    {remainingClasses}
                  </span>
                </div>
              </div>
            </div>

            {/* Дата покупки */}
            <div className="space-y-2">
              <Label htmlFor="purchaseDate" className="text-[#133C2A]">
                Дата покупки абонемента
              </Label>
              <Input
                id="purchaseDate"
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* Секция 3: Дополнительная информация */}
          <div className="space-y-4">
            <h3 className="text-[#133C2A] pb-2 border-b border-[#133C2A]/10">
              Дополнительная информация
            </h3>

            {/* Примечания администратора */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-[#133C2A]">
                Примечания администратора
                <span className="text-xs text-[#133C2A]/60 ml-2">(видимые родителю)</span>
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Например: Хорошо схватывает новые движения, активная..."
                className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37] min-h-[100px]"
              />
            </div>

            {/* Медицинские ограничения */}
            <div className="space-y-2">
              <Label htmlFor="medicalRestrictions" className="text-[#133C2A]">
                Медицинские ограничения
              </Label>
              <Textarea
                id="medicalRestrictions"
                value={formData.medicalRestrictions}
                onChange={(e) => setFormData({ ...formData, medicalRestrictions: e.target.value })}
                placeholder="Укажите, если есть какие-либо медицинские ограничения"
                className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37] min-h-[80px]"
              />
            </div>
          </div>

          {/* Кнопки */}
          <DialogFooter className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1 rounded-2xl border-[#133C2A]/20 gap-2"
            >
              <X className="w-4 h-4" />
              Отмена
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 gap-2"
            >
              <Save className="w-4 h-4" />
              Сохранить изменения
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}