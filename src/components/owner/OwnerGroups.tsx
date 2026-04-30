import { useState } from 'react';
import { Group } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Plus, Users, Clock, Calendar, MapPin, Edit, Trash2, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner@2.0.3';

interface OwnerGroupsProps {
  groups: Group[];
}

const mockTeachers = [
  { id: '2', name: 'Елена Смирнова' },
  { id: '5', name: 'Анна Кузнецова' },
  { id: '6', name: 'Мария Павлова' },
  { id: '7', name: 'Ольга Соколова' },
];

const weekDays = [
  { id: 'monday', label: 'ПН' },
  { id: 'tuesday', label: 'ВТ' },
  { id: 'wednesday', label: 'СР' },
  { id: 'thursday', label: 'ЧТ' },
  { id: 'friday', label: 'ПТ' },
  { id: 'saturday', label: 'СБ' },
  { id: 'sunday', label: 'ВС' },
];

function normalizeScheduleDays(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === 'string');
  }
  if (typeof raw !== 'string') {
    return [];
  }
  const text = raw.toLowerCase();
  const map: Array<[string, string]> = [
    ['пн', 'monday'],
    ['mon', 'monday'],
    ['вт', 'tuesday'],
    ['tue', 'tuesday'],
    ['ср', 'wednesday'],
    ['wed', 'wednesday'],
    ['чт', 'thursday'],
    ['thu', 'thursday'],
    ['пт', 'friday'],
    ['fri', 'friday'],
    ['сб', 'saturday'],
    ['sat', 'saturday'],
    ['вс', 'sunday'],
    ['sun', 'sunday'],
  ];
  return map.filter(([key]) => text.includes(key)).map(([, value]) => value);
}

function scheduleLabel(raw: unknown): string {
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw;
  }
  const days = normalizeScheduleDays(raw);
  if (days.length === 0) {
    return 'Расписание не указано';
  }
  return days
    .map((day) => weekDays.find((item) => item.id === day)?.label ?? day)
    .join(', ');
}

const groupColors = [
  { name: 'Изумрудный', value: '#133C2A' },
  { name: 'Золотой', value: '#D4AF37' },
  { name: 'Коралловый', value: '#FF6B6B' },
  { name: 'Лавандовый', value: '#9B59B6' },
  { name: 'Бирюзовый', value: '#3498DB' },
  { name: 'Розовый', value: '#E91E63' },
];

export function OwnerGroups({ groups }: OwnerGroupsProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  const [newGroup, setNewGroup] = useState({
    name: '',
    ageRange: '',
    teacherId: '',
    teacherName: '',
    schedule: [] as string[],
    time: '',
    color: groupColors[0].value,
    maxCapacity: 12,
    currentCapacity: 0,
  });

  const handleOpenAddDialog = () => {
    setNewGroup({
      name: '',
      ageRange: '',
      teacherId: '',
      teacherName: '',
      schedule: [],
      time: '',
      color: groupColors[0].value,
      maxCapacity: 12,
      currentCapacity: 0,
    });
    setAddDialogOpen(true);
  };

  const handleOpenEditDialog = (group: Group) => {
    setSelectedGroup(group);
    setNewGroup({
      name: group.name,
      ageRange: group.ageRange,
      teacherId: group.teacherId,
      teacherName: group.teacherName,
      schedule: normalizeScheduleDays(group.schedule),
      time: (group as any).time || '',
      color: group.color || groupColors[0].value,
      maxCapacity: (group as any).maxCapacity || 12,
      currentCapacity: group.studentCount,
    });
    setEditDialogOpen(true);
  };

  const handleDayToggle = (dayId: string) => {
    setNewGroup(prev => ({
      ...prev,
      schedule: prev.schedule.includes(dayId)
        ? prev.schedule.filter(d => d !== dayId)
        : [...prev.schedule, dayId]
    }));
  };

  const handleSaveNewGroup = () => {
    if (!newGroup.name.trim()) {
      toast.error('Введите название группы');
      return;
    }
    if (!newGroup.ageRange.trim()) {
      toast.error('Введите возрастной диапазон');
      return;
    }
    if (!newGroup.teacherId) {
      toast.error('Выберите преподавателя');
      return;
    }
    if (newGroup.schedule.length === 0) {
      toast.error('Выберите хотя бы один день занятий');
      return;
    }
    if (!newGroup.time) {
      toast.error('Укажите время занятий');
      return;
    }

    toast.success(`Группа "${newGroup.name}" успешно создана!`);
    setAddDialogOpen(false);
  };

  const handleSaveEditGroup = () => {
    toast.success(`Группа "${newGroup.name}" успешно обновлена!`);
    setEditDialogOpen(false);
  };

  const handleDeleteGroup = (group: Group) => {
    if (confirm(`Вы уверены, что хотите удалить группу "${group.name}"?`)) {
      toast.success(`Группа "${group.name}" удалена`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Группы</h1>
          <p className="text-[#133C2A]/60">Управление танцевальными группами студии</p>
        </div>
        <Button 
          onClick={handleOpenAddDialog}
          className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 gap-2"
        >
          <Plus className="w-5 h-5" />
          Создать группу
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <Card 
            key={group.id} 
            className="border-none soft-shadow hover:shadow-xl transition-smooth overflow-hidden"
          >
            <div 
              className="h-2"
              style={{ backgroundColor: group.color || groupColors[0].value }}
            />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-[#133C2A] mb-2">{group.name}</CardTitle>
                  <Badge className="bg-[#F8F4E3] text-[#133C2A] border-[#133C2A]/20">
                    {group.ageRange}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEditDialog(group)}
                    className="w-8 h-8 p-0 rounded-xl hover:bg-[#D4AF37]/10"
                  >
                    <Edit className="w-4 h-4 text-[#D4AF37]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteGroup(group)}
                    className="w-8 h-8 p-0 rounded-xl hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F8F4E3] flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-[#133C2A]/60">Преподаватель</p>
                    <p className="text-[#133C2A] text-sm">{group.teacherName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F8F4E3] flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-[#133C2A]/60">Расписание</p>
                    <p className="text-[#133C2A] text-sm">{scheduleLabel(group.schedule)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F8F4E3] flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-[#133C2A]/60">Время</p>
                    <p className="text-[#133C2A] text-sm">{group.time}</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#133C2A]/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#133C2A]/60">Заполненность</span>
                  <span className="text-sm text-[#133C2A]">
                    {group.studentCount}/{group.maxCapacity || 12}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-[#F8F4E3] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#133C2A] to-[#D4AF37] transition-smooth"
                    style={{ 
                      width: `${Math.min((group.studentCount / (group.maxCapacity || 12)) * 100, 100)}%` 
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Group Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">Создать новую группу</DialogTitle>
            <DialogDescription>
              Заполните информацию о новой танцевальной группе
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#133C2A]">
                Название группы <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                placeholder="Например: Начинающие"
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ageRange" className="text-[#133C2A]">
                Возрастной диапазон <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ageRange"
                value={newGroup.ageRange}
                onChange={(e) => setNewGroup({ ...newGroup, ageRange: e.target.value })}
                placeholder="Например: 7-10 лет"
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacher" className="text-[#133C2A]">
                Преподаватель <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <select
                  id="teacher"
                  value={newGroup.teacherId}
                  onChange={(e) => {
                    const teacher = mockTeachers.find(t => t.id === e.target.value);
                    setNewGroup({ ...newGroup, teacherId: e.target.value, teacherName: teacher?.name || '' });
                  }}
                  className="w-full h-10 px-3 pr-10 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Выберите преподавателя</option>
                  {mockTeachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/50 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#133C2A]">
                Дни занятий <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2 flex-wrap">
                {weekDays.map((day) => (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => handleDayToggle(day.id)}
                    className={`w-12 h-12 rounded-xl transition-smooth ${
                      newGroup.schedule.includes(day.id)
                        ? 'bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white'
                        : 'bg-[#F8F4E3] text-[#133C2A] hover:bg-[#D4AF37]/20'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="text-[#133C2A]">
                Время занятий <span className="text-red-500">*</span>
              </Label>
              <Input
                id="time"
                value={newGroup.time}
                onChange={(e) => setNewGroup({ ...newGroup, time: e.target.value })}
                placeholder="Например: 16:00 - 17:30"
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxCapacity" className="text-[#133C2A]">
                Максимальное количество учеников
              </Label>
              <Input
                id="maxCapacity"
                type="number"
                min="1"
                max="30"
                value={newGroup.maxCapacity}
                onChange={(e) => setNewGroup({ ...newGroup, maxCapacity: parseInt(e.target.value) || 12 })}
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#133C2A]">Цвет группы</Label>
              <div className="flex gap-2 flex-wrap">
                {groupColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewGroup({ ...newGroup, color: color.value })}
                    className={`w-12 h-12 rounded-xl transition-smooth ${
                      newGroup.color === color.value
                        ? 'ring-2 ring-[#D4AF37] ring-offset-2'
                        : 'hover:ring-2 hover:ring-[#133C2A]/20'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              className="border-[#133C2A]/20 hover:bg-[#133C2A]/5 rounded-xl"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSaveNewGroup}
              className="bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white hover:opacity-90 rounded-xl"
            >
              Создать группу
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">Редактировать группу</DialogTitle>
            <DialogDescription>
              Внесите изменения в информацию о группе
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-[#133C2A]">
                Название группы
              </Label>
              <Input
                id="edit-name"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-ageRange" className="text-[#133C2A]">
                Возрастной диапазон
              </Label>
              <Input
                id="edit-ageRange"
                value={newGroup.ageRange}
                onChange={(e) => setNewGroup({ ...newGroup, ageRange: e.target.value })}
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-teacher" className="text-[#133C2A]">
                Преподаватель
              </Label>
              <div className="relative">
                <select
                  id="edit-teacher"
                  value={newGroup.teacherId}
                  onChange={(e) => {
                    const teacher = mockTeachers.find(t => t.id === e.target.value);
                    setNewGroup({ ...newGroup, teacherId: e.target.value, teacherName: teacher?.name || '' });
                  }}
                  className="w-full h-10 px-3 pr-10 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Выберите преподавателя</option>
                  {mockTeachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/50 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#133C2A]">Дни занятий</Label>
              <div className="flex gap-2 flex-wrap">
                {weekDays.map((day) => (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => handleDayToggle(day.id)}
                    className={`w-12 h-12 rounded-xl transition-smooth ${
                      newGroup.schedule.includes(day.id)
                        ? 'bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white'
                        : 'bg-[#F8F4E3] text-[#133C2A] hover:bg-[#D4AF37]/20'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-time" className="text-[#133C2A]">
                Время занятий
              </Label>
              <Input
                id="edit-time"
                value={newGroup.time}
                onChange={(e) => setNewGroup({ ...newGroup, time: e.target.value })}
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-maxCapacity" className="text-[#133C2A]">
                Максимальное количество учеников
              </Label>
              <Input
                id="edit-maxCapacity"
                type="number"
                min="1"
                max="30"
                value={newGroup.maxCapacity}
                onChange={(e) => setNewGroup({ ...newGroup, maxCapacity: parseInt(e.target.value) || 12 })}
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#133C2A]">Цвет группы</Label>
              <div className="flex gap-2 flex-wrap">
                {groupColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewGroup({ ...newGroup, color: color.value })}
                    className={`w-12 h-12 rounded-xl transition-smooth ${
                      newGroup.color === color.value
                        ? 'ring-2 ring-[#D4AF37] ring-offset-2'
                        : 'hover:ring-2 hover:ring-[#133C2A]/20'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="border-[#133C2A]/20 hover:bg-[#133C2A]/5 rounded-xl"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSaveEditGroup}
              className="bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white hover:opacity-90 rounded-xl"
            >
              Сохранить изменения
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
