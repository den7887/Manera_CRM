import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { UserPlus, X } from 'lucide-react';

interface AddParentDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddParentDialog({ isOpen, onClose }: AddParentDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });

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
    console.log('Создание нового родителя:', formData);

    toast.success('Родитель успешно добавлен!');
    
    // Сброс формы
    setFormData({
      name: '',
      phone: '',
      email: '',
      notes: '',
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#133C2A] text-2xl">
            Добавить родителя
          </DialogTitle>
          <DialogDescription>
            Заполните контактную информацию нового родителя
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
            <UserPlus className="w-4 h-4" />
            Добавить родителя
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
