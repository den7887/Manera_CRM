import { Users, Calendar, TrendingUp, Plus, Edit, Trash2, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Group } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner@2.0.3';

interface AdminGroupsProps {
  groups: Group[];
}

// Предустановленные цвета для групп
const groupColors = [
  { name: 'Золотой', value: '#D4AF37' },
  { name: 'Изумрудный', value: '#133C2A' },
  { name: 'Зеленый', value: '#1C8C64' },
  { name: 'Бирюзовый', value: '#2DD4BF' },
  { name: 'Синий', value: '#3B82F6' },
  { name: 'Фиолетовый', value: '#8B5CF6' },
  { name: 'Розовый', value: '#EC4899' },
  { name: 'Красный', value: '#EF4444' },
  { name: 'Оранжевый', value: '#F97316' },
];

// Дни недели для расписания
const weekDays = [
  { id: 'mon', label: 'Пн' },
  { id: 'tue', label: 'Вт' },
  { id: 'wed', label: 'Ср' },
  { id: 'thu', label: 'Чт' },
  { id: 'fri', label: 'Пт' },
  { id: 'sat', label: 'Сб' },
  { id: 'sun', label: 'Вс' },
];

// Список преподавателей (mock data)
const mockTeachers = [
  { id: '2', name: 'Елена Смирнова' },
  { id: '5', name: 'Анна Кузнецова' },
  { id: '6', name: 'Мария Павлова' },
  { id: '7', name: 'Ольга Соколова' },
];

export function AdminGroups({ groups }: AdminGroupsProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  // Состояние формы новой группы
  const [newGroup, setNewGroup] = useState({
    name: '',
    ageRange: '',
    teacherId: '',
    teacherName: '',
    schedule: '',
    color: '#D4AF37',
    selectedDays: [] as string[],
    timeStart: '',
    timeEnd: '',
  });

  const handleOpenAddDialog = () => {
    setNewGroup({
      name: '',
      ageRange: '',
      teacherId: '',
      teacherName: '',
      schedule: '',
      color: '#D4AF37',
      selectedDays: [],
      timeStart: '',
      timeEnd: '',
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
      schedule: group.schedule,
      color: group.color,
      selectedDays: [],
      timeStart: '',
      timeEnd: '',
    });
    setEditDialogOpen(true);
  };

  const handleDayToggle = (dayId: string) => {
    setNewGroup(prev => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(dayId)
        ? prev.selectedDays.filter(d => d !== dayId)
        : [...prev.selectedDays, dayId]
    }));
  };

  const handleSaveNewGroup = () => {
    // Валидация
    if (!newGroup.name.trim()) {
      toast.error('Введите название группы');
      return;
    }
    if (!newGroup.ageRange.trim()) {
      toast.error('Введите возрастной диапазон');
      return;
    }
    if (!newGroup.teacherName.trim()) {
      toast.error('Введите имя преподавателя');
      return;
    }
    if (newGroup.selectedDays.length === 0) {
      toast.error('Выберите хотя бы один день занятий');
      return;
    }
    if (!newGroup.timeStart || !newGroup.timeEnd) {
      toast.error('Укажите время занятий');
      return;
    }

    // Формируем расписание
    const days = newGroup.selectedDays
      .map(dayId => weekDays.find(d => d.id === dayId)?.label)
      .join(', ');
    const schedule = `${days} ${newGroup.timeStart}-${newGroup.timeEnd}`;

    toast.success('Группа успешно создана!');
    setAddDialogOpen(false);
    console.log('Новая группа:', { ...newGroup, schedule });
  };

  const handleSaveEditGroup = () => {
    toast.success('Группа успешно обновлена!');
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
          <p className="text-[#133C2A]/60">Управление группами студии</p>
        </div>
        <Button 
          onClick={handleOpenAddDialog}
          className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 gap-2"
        >
          <Plus className="w-5 h-5" />
          Создать группу
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Всего групп</p>
                <p className="text-3xl text-[#133C2A]">{groups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1C8C64] to-[#133C2A] flex items-center justify-center">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Учеников</p>
                <p className="text-3xl text-[#133C2A]">
                  {groups.reduce((sum, g) => sum + g.studentCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Занятий/неделю</p>
                <p className="text-3xl text-[#133C2A]">{groups.length * 3}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1C8C64] to-[#D4AF37] flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Посещаемость</p>
                <p className="text-3xl text-[#133C2A]">87%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groups Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <Card key={group.id} className="border-none soft-shadow hover-lift">
            <div 
              className="h-3 rounded-t-2xl"
              style={{ backgroundColor: group.color }}
            />
            <CardHeader>
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white"
                  style={{ backgroundColor: group.color }}
                >
                  <Users className="w-8 h-8" />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEditDialog(group)}
                    className="w-9 h-9 p-0 rounded-xl hover:bg-[#D4AF37]/10"
                  >
                    <Edit className="w-4 h-4 text-[#D4AF37]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteGroup(group)}
                    className="w-9 h-9 p-0 rounded-xl hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <CardTitle className="text-[#133C2A]">{group.name}</CardTitle>
              <Badge variant="outline" className="border-[#133C2A]/20 text-[#133C2A] w-fit">
                {group.ageRange}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#F8F4E3]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#133C2A]/70">Учеников в группе</span>
                  <span className="text-2xl text-[#133C2A]">{group.studentCount}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <Users className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0" />
                  <span className="text-[#133C2A]/70">{group.teacherName}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0" />
                  <span className="text-[#133C2A]/70">{group.schedule}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-[#133C2A]/70">Посещаемость: 87%</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#133C2A]/10">
                <Button className="w-full rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90">
                  Просмотреть учеников
                </Button>
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
              Заполните информацию о новой группе
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Название */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#133C2A]">
                Название группы <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Например: Младшая группа"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            {/* Возрастной диапазон */}
            <div className="space-y-2">
              <Label htmlFor="ageRange" className="text-[#133C2A]">
                Возрастной диапазон <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ageRange"
                placeholder="Например: 6-9 лет"
                value={newGroup.ageRange}
                onChange={(e) => setNewGroup({ ...newGroup, ageRange: e.target.value })}
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            {/* Преподаватель */}
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

            {/* Дни недели */}
            <div className="space-y-2">
              <Label className="text-[#133C2A]">
                Дни занятий <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {weekDays.map((day) => (
                  <Button
                    key={day.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDayToggle(day.id)}
                    className={`rounded-xl ${
                      newGroup.selectedDays.includes(day.id)
                        ? 'bg-[#D4AF37] text-white border-[#D4AF37] hover:bg-[#B8941F] hover:text-white'
                        : 'border-[#133C2A]/20 hover:bg-[#F8F4E3]'
                    }`}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Время */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeStart" className="text-[#133C2A]">
                  Время начала <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="timeStart"
                  type="time"
                  value={newGroup.timeStart}
                  onChange={(e) => setNewGroup({ ...newGroup, timeStart: e.target.value })}
                  className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeEnd" className="text-[#133C2A]">
                  Время окончания <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="timeEnd"
                  type="time"
                  value={newGroup.timeEnd}
                  onChange={(e) => setNewGroup({ ...newGroup, timeEnd: e.target.value })}
                  className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>
            </div>

            {/* Цвет */}
            <div className="space-y-2">
              <Label className="text-[#133C2A]">Цвет группы</Label>
              <div className="grid grid-cols-5 md:grid-cols-9 gap-2">
                {groupColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewGroup({ ...newGroup, color: color.value })}
                    className={`w-10 h-10 rounded-xl transition-all ${
                      newGroup.color === color.value
                        ? 'ring-2 ring-[#133C2A] ring-offset-2 scale-110'
                        : 'hover:scale-105'
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
              className="bg-gradient-to-r from-[#133C2A] to-[#1C8C64] text-white hover:opacity-90 rounded-xl"
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
          
          <div className="space-y-6 py-4">
            {/* Название */}
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

            {/* Возрастной диапазон */}
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

            {/* Преподаватель */}
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

            {/* Цвет */}
            <div className="space-y-2">
              <Label className="text-[#133C2A]">Цвет группы</Label>
              <div className="grid grid-cols-5 md:grid-cols-9 gap-2">
                {groupColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewGroup({ ...newGroup, color: color.value })}
                    className={`w-10 h-10 rounded-xl transition-all ${
                      newGroup.color === color.value
                        ? 'ring-2 ring-[#133C2A] ring-offset-2 scale-110'
                        : 'hover:scale-105'
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
              className="bg-gradient-to-r from-[#133C2A] to-[#1C8C64] text-white hover:opacity-90 rounded-xl"
            >
              Сохранить изменения
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}