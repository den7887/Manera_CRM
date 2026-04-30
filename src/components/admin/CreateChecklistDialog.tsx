import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Plus, X, GripVertical, ClipboardCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { User } from '../../types';

interface CreateChecklistDialogProps {
  user: User;
}

export function CreateChecklistDialog({ user }: CreateChecklistDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [checklistType, setChecklistType] = useState('daily');
  const [assignTo, setAssignTo] = useState('all');
  const [items, setItems] = useState<string[]>(['']);

  const handleAddItem = () => {
    setItems([...items, '']);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const handleCreate = () => {
    const today = new Date();
    const dateString = today.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const filteredItems = items.filter(item => item.trim() !== '');
    
    const content = `ЧЕК-ЛИСТ СТУДИИ ТАНЦА "MANERA"\n${title}\n\nДата: ${dateString}\nТип: ${checklistType === 'daily' ? 'Ежедневный' : checklistType === 'weekly' ? 'Еженедельный' : 'Разовый'}\nНазначено: ${assignTo === 'all' ? 'Всем сотрудникам' : assignTo === 'teachers' ? 'Преподавателям' : 'Администраторам'}\n\n${description ? `Описание:\n${description}\n\n` : ''}ПУНКТЫ ПРОВЕРКИ:\n${filteredItems.map((item, idx) => `${idx + 1}. [ ] ${item}`).join('\n')}\n\n---\nСоставил: ${user.name}\nДата создания: ${dateString}`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `checklist-${title.toLowerCase().replace(/\s+/g, '-')}-${dateString.replace(/\./g, '-')}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    // Сброс формы
    setTitle('');
    setDescription('');
    setChecklistType('daily');
    setAssignTo('all');
    setItems(['']);
    setOpen(false);

    alert(`Чек-лист "${title}" успешно создан!\n\nПунктов: ${filteredItems.length}\nНазначено: ${assignTo === 'all' ? 'Всем сотрудникам' : assignTo === 'teachers' ? 'Преподавателям' : 'Администраторам'}`);
  };

  const canCreate = title.trim() !== '' && items.some(item => item.trim() !== '');

  return (
    <>
      <Button 
        variant="outline"
        className="h-auto p-6 rounded-2xl border-[#133C2A]/20 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 flex flex-col items-center gap-3"
        onClick={() => setOpen(true)}
      >
        <ClipboardCheck className="w-8 h-8 text-[#133C2A]" />
        <span className="text-[#133C2A]">Создать чек-лист</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#133C2A]">Создать чек-лист</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Название */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-[#133C2A]">
                Название чек-листа <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Ежедневная проверка студии"
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            {/* Описание */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[#133C2A]">
                Описание (опционально)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Краткое описание чек-листа"
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37] min-h-[80px]"
              />
            </div>

            {/* Тип чек-листа */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-[#133C2A]">
                Тип чек-листа
              </Label>
              <Select value={checklistType} onValueChange={setChecklistType}>
                <SelectTrigger className="rounded-xl border-[#133C2A]/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Ежедневный</SelectItem>
                  <SelectItem value="weekly">Еженедельный</SelectItem>
                  <SelectItem value="monthly">Ежемесячный</SelectItem>
                  <SelectItem value="onetime">Разовый</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Назначить */}
            <div className="space-y-2">
              <Label htmlFor="assign" className="text-[#133C2A]">
                Назначить
              </Label>
              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger className="rounded-xl border-[#133C2A]/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всем сотрудникам</SelectItem>
                  <SelectItem value="teachers">Только преподавателям</SelectItem>
                  <SelectItem value="admins">Только администраторам</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Пункты чек-листа */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[#133C2A]">
                  Пункты чек-листа <span className="text-red-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="rounded-xl border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Добавить пункт
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-[#133C2A]/5 flex items-center justify-center">
                      <span className="text-xs text-[#133C2A]/60">{index + 1}</span>
                    </div>
                    <Input
                      value={item}
                      onChange={(e) => handleItemChange(index, e.target.value)}
                      placeholder="Введите пункт проверки"
                      className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                    />
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                        className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl border-[#133C2A]/20 hover:bg-[#133C2A]/5"
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!canCreate}
              className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 disabled:opacity-50"
            >
              Создать чек-лист
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}