import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Edit, 
  Trash2,
  Users,
  User,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { mockGroups, mockTeachers } from '../../data/mockData';
import { toast } from '../../utils/toast';

interface ScheduleEntry {
  id: string;
  groupId: string;
  teacherId: string;
  dayOfWeek: number; // 0-6 (Вс-Сб)
  startTime: string;
  endTime: string;
  room: string;
}

const daysOfWeek = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const daysShort = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export function ScheduleManagement() {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([
    {
      id: '1',
      groupId: '1',
      teacherId: '1',
      dayOfWeek: 1,
      startTime: '15:00',
      endTime: '16:30',
      room: 'Зал 1',
    },
    {
      id: '2',
      groupId: '1',
      teacherId: '1',
      dayOfWeek: 3,
      startTime: '15:00',
      endTime: '16:30',
      room: 'Зал 1',
    },
    {
      id: '3',
      groupId: '2',
      teacherId: '2',
      dayOfWeek: 2,
      startTime: '17:00',
      endTime: '18:30',
      room: 'Зал 2',
    },
    {
      id: '4',
      groupId: '2',
      teacherId: '2',
      dayOfWeek: 4,
      startTime: '17:00',
      endTime: '18:30',
      room: 'Зал 2',
    },
    {
      id: '5',
      groupId: '3',
      teacherId: '3',
      dayOfWeek: 1,
      startTime: '18:00',
      endTime: '19:30',
      room: 'Зал 1',
    },
    {
      id: '6',
      groupId: '3',
      teacherId: '3',
      dayOfWeek: 5,
      startTime: '18:00',
      endTime: '19:30',
      room: 'Зал 1',
    },
  ]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [filterGroup, setFilterGroup] = useState<string>('all');

  const [newEntry, setNewEntry] = useState({
    groupId: '',
    teacherId: '',
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    room: '',
  });

  const handleAddEntry = () => {
    const entry: ScheduleEntry = {
      id: `entry-${Date.now()}`,
      groupId: newEntry.groupId,
      teacherId: newEntry.teacherId,
      dayOfWeek: parseInt(newEntry.dayOfWeek),
      startTime: newEntry.startTime,
      endTime: newEntry.endTime,
      room: newEntry.room,
    };

    setSchedule([...schedule, entry]);
    setIsAddDialogOpen(false);
    setNewEntry({
      groupId: '',
      teacherId: '',
      dayOfWeek: '',
      startTime: '',
      endTime: '',
      room: '',
    });
    toast.success('Занятие успешно добавлено');
  };

  const handleDeleteEntry = (id: string) => {
    setSchedule(schedule.filter(e => e.id !== id));
    toast.success('Занятие удалено из расписания');
  };

  const getEntriesForDay = (day: number) => {
    return schedule
      .filter(entry => entry.dayOfWeek === day)
      .filter(entry => filterGroup === 'all' || entry.groupId === filterGroup)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const getGroupColor = (groupId: string) => {
    const colors = [
      'bg-blue-500/10 border-blue-500/20 text-blue-700',
      'bg-purple-500/10 border-purple-500/20 text-purple-700',
      'bg-pink-500/10 border-pink-500/20 text-pink-700',
      'bg-green-500/10 border-green-500/20 text-green-700',
      'bg-orange-500/10 border-orange-500/20 text-orange-700',
    ];
    const index = parseInt(groupId) % colors.length;
    return colors[index];
  };

  const timeSlots = Array.from({ length: 14 }, (_, i) => {
    const hour = 9 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60 mb-1">Всего занятий</p>
                <p className="text-3xl text-[#133C2A]">{schedule.length}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#133C2A] to-[#1C8C64] flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60 mb-1">Активных групп</p>
                <p className="text-3xl text-[#133C2A]">{new Set(schedule.map(s => s.groupId)).size}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#133C2A] flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60 mb-1">Преподавателей</p>
                <p className="text-3xl text-[#133C2A]">{new Set(schedule.map(s => s.teacherId)).size}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1C8C64] to-[#133C2A] flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Основная карточка */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-[#133C2A]">
              <CalendarIcon className="w-6 h-6" />
              Расписание занятий
            </CardTitle>
            <div className="flex items-center gap-3">
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-[200px] rounded-2xl border-[#133C2A]/20">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все группы</SelectItem>
                  {mockGroups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90">
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить занятие
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-[#133C2A]">Новое занятие</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Группа *</Label>
                      <Select value={newEntry.groupId} onValueChange={(value) => setNewEntry({ ...newEntry, groupId: value })}>
                        <SelectTrigger className="rounded-2xl">
                          <SelectValue placeholder="Выберите группу" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockGroups.map(group => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Преподаватель *</Label>
                      <Select value={newEntry.teacherId} onValueChange={(value) => setNewEntry({ ...newEntry, teacherId: value })}>
                        <SelectTrigger className="rounded-2xl">
                          <SelectValue placeholder="Выберите преподавателя" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockTeachers.map(teacher => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>День недели *</Label>
                      <Select value={newEntry.dayOfWeek} onValueChange={(value) => setNewEntry({ ...newEntry, dayOfWeek: value })}>
                        <SelectTrigger className="rounded-2xl">
                          <SelectValue placeholder="Выберите день" />
                        </SelectTrigger>
                        <SelectContent>
                          {daysOfWeek.map((day, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Начало *</Label>
                        <Input
                          type="time"
                          value={newEntry.startTime}
                          onChange={(e) => setNewEntry({ ...newEntry, startTime: e.target.value })}
                          className="rounded-2xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Конец *</Label>
                        <Input
                          type="time"
                          value={newEntry.endTime}
                          onChange={(e) => setNewEntry({ ...newEntry, endTime: e.target.value })}
                          className="rounded-2xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Зал *</Label>
                      <Select value={newEntry.room} onValueChange={(value) => setNewEntry({ ...newEntry, room: value })}>
                        <SelectTrigger className="rounded-2xl">
                          <SelectValue placeholder="Выберите зал" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Зал 1">Зал 1</SelectItem>
                          <SelectItem value="Зал 2">Зал 2</SelectItem>
                          <SelectItem value="Зал 3">Зал 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleAddEntry}
                        disabled={!newEntry.groupId || !newEntry.teacherId || !newEntry.dayOfWeek || !newEntry.startTime || !newEntry.endTime || !newEntry.room}
                        className="flex-1 rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]"
                      >
                        Добавить
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsAddDialogOpen(false)}
                        className="rounded-2xl"
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Переключатель видов */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                onClick={() => setViewMode('week')}
                className="rounded-xl"
              >
                Неделя
              </Button>
              <Button
                variant={viewMode === 'day' ? 'default' : 'outline'}
                onClick={() => setViewMode('day')}
                className="rounded-xl"
              >
                День
              </Button>
            </div>

            {viewMode === 'day' && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedDay((selectedDay - 1 + 7) % 7)}
                  className="rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-[#133C2A] min-w-[120px] text-center">
                  {daysOfWeek[selectedDay]}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedDay((selectedDay + 1) % 7)}
                  className="rounded-xl"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Вид недели */}
          {viewMode === 'week' && (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-7 gap-3">
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                    const entries = getEntriesForDay(day);
                    const isToday = day === new Date().getDay();

                    return (
                      <div key={day} className={`space-y-2 ${isToday ? 'ring-2 ring-[#D4AF37] rounded-2xl p-2' : ''}`}>
                        <div className="text-center pb-2 border-b border-[#133C2A]/10">
                          <p className="text-sm text-[#133C2A]">{daysShort[day]}</p>
                          {isToday && (
                            <Badge className="mt-1 text-xs bg-[#D4AF37] text-white">Сегодня</Badge>
                          )}
                        </div>
                        <div className="space-y-2 min-h-[400px]">
                          {entries.map((entry) => {
                            const group = mockGroups.find(g => g.id === entry.groupId);
                            const teacher = mockTeachers.find(t => t.id === entry.teacherId);

                            return (
                              <Card
                                key={entry.id}
                                className={`border ${getGroupColor(entry.groupId)} hover-lift cursor-pointer transition-smooth`}
                              >
                                <CardContent className="p-3 space-y-1">
                                  <div className="flex items-start justify-between gap-1">
                                    <p className="text-xs leading-tight">{group?.name}</p>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteEntry(entry.id)}
                                      className="h-6 w-6 p-0 hover:bg-red-100"
                                    >
                                      <Trash2 className="w-3 h-3 text-red-600" />
                                    </Button>
                                  </div>
                                  <p className="text-[10px] text-[#133C2A]/60">
                                    {entry.startTime} - {entry.endTime}
                                  </p>
                                  <p className="text-[10px] text-[#133C2A]/60">
                                    👤 {teacher?.name}
                                  </p>
                                  <p className="text-[10px] text-[#133C2A]/60">
                                    📍 {entry.room}
                                  </p>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Вид дня */}
          {viewMode === 'day' && (
            <div className="space-y-2">
              {getEntriesForDay(selectedDay).length > 0 ? (
                getEntriesForDay(selectedDay).map((entry) => {
                  const group = mockGroups.find(g => g.id === entry.groupId);
                  const teacher = mockTeachers.find(t => t.id === entry.teacherId);

                  return (
                    <Card
                      key={entry.id}
                      className={`border ${getGroupColor(entry.groupId)} hover-lift transition-smooth`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex items-center gap-2 text-[#133C2A]">
                                <Clock className="w-5 h-5" />
                                <span className="text-lg">
                                  {entry.startTime} - {entry.endTime}
                                </span>
                              </div>
                              <Badge variant="outline">{entry.room}</Badge>
                            </div>
                            <h3 className="text-[#133C2A] mb-2">{group?.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-[#133C2A]/60">
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {teacher?.name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {group?.currentStudents || 0}/{group?.maxStudents || 0} учеников
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="rounded-xl text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-12 text-[#133C2A]/60">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-[#133C2A]/20" />
                  <p>На этот день занятий не запланировано</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}