import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { UserPlus, X } from 'lucide-react';

const leadStatuses = [
  { value: 'new', label: 'Новая заявка' },
  { value: 'contacted', label: 'Первый контакт' },
  { value: 'scheduled', label: 'Записан на пробное' },
  { value: 'visited', label: 'Был на пробном' },
  { value: 'thinking', label: 'Думает' },
  { value: 'callback', label: 'Перезвонить позже' },
  { value: 'waiting_discount', label: 'Ждёт акцию' },
  { value: 'converted', label: 'Стал клиентом' },
  { value: 'rejected', label: 'Отказ' },
  { value: 'returned', label: 'Вернулся' },
];

const sources = ['Сайт', 'Instagram', 'Рекомендация', 'Реклама', 'Прохожие', 'Другое'];

interface AddLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddLeadDialog({ isOpen, onClose }: AddLeadDialogProps) {
  const [formData, setFormData] = useState({
    parentName: '',
    phone: '',
    email: '',
    childName: '',
    childAge: '',
    status: 'new',
    source: 'Сайт',
    nextContactDate: '',
    nextAction: '',
    notes: '',
  });

  const handleSave = () => {
    // Валидация
    if (!formData.parentName.trim()) {
      toast.error('Введите имя родителя');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Введите телефон');
      return;
    }
    if (!formData.childName.trim()) {
      toast.error('Введите имя ребёнка');
      return;
    }
    if (!formData.childAge) {
      toast.error('Введите возраст ребёнка');
      return;
    }

    console.log('Создание нового клиента:', formData);
    toast.success('Клиент успешно добавлен!');
    
    // Сброс формы
    setFormData({
      parentName: '',
      phone: '',
      email: '',
      childName: '',
      childAge: '',
      status: 'new',
      source: 'Сайт',
      nextContactDate: '',
      nextAction: '',
      notes: '',
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#133C2A] text-2xl">
            Добавить клиента
          </DialogTitle>
          <DialogDescription>
            Заполните информацию о новом клиенте
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Родитель */}
          <div className="space-y-2">
            <Label htmlFor="parentName" className="text-[#133C2A]">
              ФИО родителя <span className="text-red-500">*</span>
            </Label>
            <Input
              id="parentName"
              value={formData.parentName}
              onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
              placeholder="Иванова Анна Сергеевна"
              className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
          </div>

          {/* Контакты */}
          <div className="grid grid-cols-2 gap-3">
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
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#133C2A]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* Ребёнок */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="childName" className="text-[#133C2A]">
                Имя ребёнка <span className="text-red-500">*</span>
              </Label>
              <Input
                id="childName"
                value={formData.childName}
                onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                placeholder="Мария"
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="childAge" className="text-[#133C2A]">
                Возраст <span className="text-red-500">*</span>
              </Label>
              <Input
                id="childAge"
                type="number"
                min="3"
                max="18"
                value={formData.childAge}
                onChange={(e) => setFormData({ ...formData, childAge: e.target.value })}
                placeholder="7"
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* Статус и источник */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="status" className="text-[#133C2A]">
                Статус
              </Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="rounded-xl border-[#133C2A]/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {leadStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source" className="text-[#133C2A]">
                Источник
              </Label>
              <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                <SelectTrigger className="rounded-xl border-[#133C2A]/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Следующий контакт */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="nextContactDate" className="text-[#133C2A]">
                Дата следующего контакта
              </Label>
              <Input
                id="nextContactDate"
                type="date"
                value={formData.nextContactDate}
                onChange={(e) => setFormData({ ...formData, nextContactDate: e.target.value })}
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextAction" className="text-[#133C2A]">
                Следующее действие
              </Label>
              <Input
                id="nextAction"
                value={formData.nextAction}
                onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
                placeholder="Перезвонить после 15:00"
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
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
              placeholder="Дополнительная информация о клиенте..."
              className="min-h-[80px] rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl border-[#133C2A]/20 hover:bg-[#133C2A]/5 gap-2"
          >
            <X className="w-4 h-4" />
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#1C8C64] text-white hover:opacity-90 gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
