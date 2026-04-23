import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Plus, X, ClipboardCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Group, User } from '../../types';

interface CreateChecklistDialogProps {
  user: User;
}

export function CreateChecklistDialog({ user }: CreateChecklistDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [checklistType, setChecklistType] = useState('lesson');
  const [selectedGroup, setSelectedGroup] = useState<string>('none');
  const [items, setItems] = useState<string[]>(['']);

  // Mock groups - в реальном приложении это будут реальные группы учителя
  const groups: Group[] = [];

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
    const selectedGroupData = groups.find(g => g.id === selectedGroup);
    
    const content = `ЧЕК-ЛИСТ ПРЕПОДАВАТЕЛЯ\n${title}\n\nДата: ${dateString}\nТип: ${checklistType === 'lesson' ? 'Занятие' : checklistType === 'preparation' ? 'Подготовка к занятию' : 'Общий'}\n${selectedGroupData ? `Группа: ${selectedGroupData.name}\n` : ''}${description ? `\nОписание:\n${description}\n` : ''}\nПУНКТЫ ПРОВЕРКИ:\n${filteredItems.map((item, idx) => `${idx + 1}. [ ] ${item}`).join('\n')}\n\n---\nПреподаватель: ${user.name}\nДата создания: ${dateString}`;
    
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
    setChecklistType('lesson');
    setSelectedGroup('none');
    setItems(['']);
    setOpen(false);

    alert(`Чек-лист "${title}" успешно создан!\n\nПунктов: ${filteredItems.length}${selectedGroupData ? `\nГруппа: ${selectedGroupData.name}` : ''}`);
  };

  const canCreate = title.trim() !== '' && items.some(item => item.trim() !== '');

  return (
    <>
      <div className="h-auto p-6 rounded-2xl border border-[#133C2A]/20 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 flex flex-col items-center gap-3 cursor-pointer transition-smooth" onClick={() => setOpen(true)}>
        <div className="w-12 h-12 rounded-2xl bg-[#133C2A]/10 flex items-center justify-center">
          <ClipboardCheck className="w-6 h-6 text-[#133C2A]" />
        </div>
        <div className="text-center">
          <p className="text-[#133C2A]">Создать чек-лист</p>
          <p className="text-xs text-[#133C2A]/60 mt-1">Задачи на день</p>
        </div>
      </div>

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
                placeholder="Например: Подготовка к занятию"
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
                  <SelectItem value="lesson">Занятие</SelectItem>
                  <SelectItem value="preparation">Подготовка к занятию</SelectItem>
                  <SelectItem value="general">Общий</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Привязать к группе */}
            <div className="space-y-2">
              <Label htmlFor="group" className="text-[#133C2A]">
                Привязать к группе (опционально)
              </Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="rounded-xl border-[#133C2A]/20">
                  <SelectValue placeholder="Не привязывать" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не привязывать</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name} ({group.ageRange})
                    </SelectItem>
                  ))}
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