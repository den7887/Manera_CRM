import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { Save, X } from 'lucide-react';

interface ParentData {
  id: string;
  name: string;
  phone: string;
  email: string;
  registrationDate: Date;
  birthDate?: Date;
  children: Array<{
    id: string;
    name: string;
    group: string;
  }>;
  activeSubscriptions: number;
  totalDebt: number;
  notes: string;
}

interface EditParentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  parent: ParentData | null;
}

export function EditParentDialog({ isOpen, onClose, parent }: EditParentDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    birthDate: '',
    notes: '',
  });

  // Предзаполнение формы при открытии
  useEffect(() => {
    if (parent && isOpen) {
      setFormData({
        name: parent.name,
        phone: parent.phone,
        email: parent.email,
        notes: parent.notes,
      });
    }
  }, [parent, isOpen]);

  // Обработчик сохранения
  const handleSave = () => {
    // Валидация обязательных полей
    if (!formData.name.trim()) {
      toast.error('Введите ФИО родителя');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Введите телефон');
      return;
    }

    // Здесь будет логика сохранения в базу данных
    console.log('Обновление родителя:', { ...parent, ...formData });

    toast.success('Данные родителя успешно обновлены!');
    onClose();
  };

  if (!parent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#133C2A] text-2xl">
            Редактирование родителя
          </DialogTitle>
          <DialogDescription>
            Обновите контактную информацию родителя
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* ФИО */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[#133C2A]">
              ФИО родителя <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Иванова Анна Сергеевна"
              className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
          </div>

          {/* Телефон */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-[#133C2A]">
              Телефон <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+7 (999) 123-45-67"
              className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#133C2A]">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="anna.ivanova@email.com"
              className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
          </div>

          {/* Информация о детях (только для просмотра) */}
          <div className="space-y-2">
            <Label className="text-[#133C2A]">
              {parent.children.length === 1 ? 'Ребёнок' : 'Дети'}
            </Label>
            <div className="space-y-2">
              {parent.children.map((child) => (
                <div 
                  key={child.id}
                  className="p-3 rounded-2xl bg-[#F8F4E3]/50 border border-[#133C2A]/10"
                >
                  <p className="text-sm text-[#133C2A]">{child.name}</p>
                  <p className="text-xs text-[#133C2A]/60">{child.group}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20">
              <p className="text-xs text-[#133C2A]/60 mb-1">Активные абонементы</p>
              <p className="text-2xl text-[#133C2A]">{parent.activeSubscriptions}</p>
            </div>
            <div className={`p-4 rounded-2xl border ${parent.totalDebt > 0 ? 'bg-red-50 border-red-200' : 'bg-[#1C8C64]/10 border-[#1C8C64]/20'}`}>
              <p className="text-xs text-[#133C2A]/60 mb-1">Задолженность</p>
              <p className={`text-2xl ${parent.totalDebt > 0 ? 'text-red-600' : 'text-[#1C8C64]'}`}>
                {parent.totalDebt.toLocaleString('ru-RU')} ₽
              </p>
            </div>
          </div>

          {/* Примечания */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-[#133C2A]">
              Примечания
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Дополнительная информация о родителе..."
              className="min-h-[100px] rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
          </div>

          {/* Дата регистрации */}
          <div className="p-4 rounded-2xl bg-[#133C2A]/5 border border-[#133C2A]/10">
            <p className="text-xs text-[#133C2A]/60 mb-1">Дата регистрации</p>
            <p className="text-sm text-[#133C2A]">
              {parent.registrationDate.toLocaleDateString('ru-RU', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-2xl border-[#133C2A]/20 hover:bg-[#133C2A]/5 gap-2"
          >
            <X className="w-4 h-4" />
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#1C8C64] text-white hover:opacity-90 gap-2"
          >
            <Save className="w-4 h-4" />
            Сохранить изменения
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
