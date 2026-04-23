import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { Save, X, Plus } from 'lucide-react';
import { Badge } from '../ui/badge';

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

interface LeadData {
  id: string;
  parentName: string;
  phone: string;
  email: string;
  childName: string;
  childAge: number;
  status: string;
  source: string;
  nextContactDate: Date | null;
  nextAction: string;
  createdDate: Date;
  notes: string;
  tags: string[];
  history: Array<{
    date: Date;
    type: string;
    text: string;
  }>;
}

interface EditLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadData | null;
}

export function EditLeadDialog({ isOpen, onClose, lead }: EditLeadDialogProps) {
  const [formData, setFormData] = useState({
    parentName: '',
    phone: '',
    email: '',
    childName: '',
    childAge: 0,
    status: 'new',
    source: 'Сайт',
    nextContactDate: '',
    nextAction: '',
    notes: '',
  });

  const [newHistoryEntry, setNewHistoryEntry] = useState('');

  // Предзаполнение формы
  useEffect(() => {
    if (lead && isOpen) {
      setFormData({
        parentName: lead.parentName,
        phone: lead.phone,
        email: lead.email,
        childName: lead.childName,
        childAge: lead.childAge,
        status: lead.status,
        source: lead.source,
        nextContactDate: lead.nextContactDate 
          ? lead.nextContactDate.toISOString().split('T')[0] 
          : '',
        nextAction: lead.nextAction,
        notes: lead.notes,
      });
    }
  }, [lead, isOpen]);

  const handleSave = () => {
    if (!formData.parentName.trim()) {
      toast.error('Введите имя родителя');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Введите телефон');
      return;
    }

    console.log('Обновление клиента:', formData);
    toast.success('Данные клиента успешно обновлены!');
    onClose();
  };

  const handleAddHistoryEntry = () => {
    if (!newHistoryEntry.trim()) {
      toast.error('Введите текст записи');
      return;
    }

    console.log('Добавление записи в историю:', newHistoryEntry);
    toast.success('Запись добавлена в историю');
    setNewHistoryEntry('');
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#133C2A] text-2xl">
            Редактирование клиента
          </DialogTitle>
          <DialogDescription>
            Обновите информацию и добавьте записи в историю
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Основная информация */}
          <div className="space-y-2">
            <Label htmlFor="parentName" className="text-[#133C2A]">
              ФИО родителя <span className="text-red-500">*</span>
            </Label>
            <Input
              id="parentName"
              value={formData.parentName}
              onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
              className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
          </div>

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
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="childName" className="text-[#133C2A]">
                Имя ребёнка
              </Label>
              <Input
                id="childName"
                value={formData.childName}
                onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="childAge" className="text-[#133C2A]">
                Возраст
              </Label>
              <Input
                id="childAge"
                type="number"
                value={formData.childAge}
                onChange={(e) => setFormData({ ...formData, childAge: parseInt(e.target.value) })}
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
          <div className="p-4 rounded-xl bg-[#F8F4E3]/50 border border-[#133C2A]/10 space-y-3">
            <Label className="text-[#133C2A]">Планирование следующего контакта</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="nextContactDate" className="text-xs text-[#133C2A]/70">
                  Дата
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
                <Label htmlFor="nextAction" className="text-xs text-[#133C2A]/70">
                  Действие
                </Label>
                <Input
                  id="nextAction"
                  value={formData.nextAction}
                  onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
                  placeholder="Перезвонить"
                  className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>
            </div>
          </div>

          {/* Добавить запись в историю */}
          <div className="p-4 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 space-y-3">
            <Label className="text-[#133C2A]">Добавить запись в историю</Label>
            <div className="flex gap-2">
              <Input
                value={newHistoryEntry}
                onChange={(e) => setNewHistoryEntry(e.target.value)}
                placeholder="Состоялся звонок, договорились о встрече..."
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
              <Button
                onClick={handleAddHistoryEntry}
                className="rounded-xl bg-[#D4AF37] text-white hover:bg-[#D4AF37]/90 flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* История взаимодействий (последние 3) */}
          {lead.history.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[#133C2A]">Последние записи</Label>
              <div className="space-y-2">
                {lead.history.slice(-3).reverse().map((entry, index) => (
                  <div key={index} className="p-3 rounded-xl bg-white border border-[#133C2A]/10">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs">
                        {entry.type === 'call' && '📞 Звонок'}
                        {entry.type === 'visit' && '✅ Посещение'}
                        {entry.type === 'meeting' && '🤝 Встреча'}
                        {entry.type === 'purchase' && '💰 Покупка'}
                      </Badge>
                      <span className="text-xs text-[#133C2A]/60">
                        {entry.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-sm text-[#133C2A]">{entry.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Примечания */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-[#133C2A]">
              Примечания
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="min-h-[80px] rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
          </div>

          {/* Теги */}
          {lead.tags.length > 0 && (
            <div className="flex gap-2">
              {lead.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="rounded-lg">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Дата создания */}
          <div className="p-3 rounded-xl bg-[#133C2A]/5 border border-[#133C2A]/10">
            <p className="text-xs text-[#133C2A]/60">
              Заявка создана: {lead.createdDate.toLocaleDateString('ru-RU', { 
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
            className="rounded-xl border-[#133C2A]/20 hover:bg-[#133C2A]/5 gap-2"
          >
            <X className="w-4 h-4" />
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#1C8C64] text-white hover:opacity-90 gap-2"
          >
            <Save className="w-4 h-4" />
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
