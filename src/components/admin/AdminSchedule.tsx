import { Calendar as CalendarIcon, Clock, MapPin, Users, Plus, Edit, Trash2, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Event, Group } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { EmptyState } from '../EmptyState';
import { toast } from 'sonner@2.0.3';

interface AdminScheduleProps {
  events: Event[];
  groups: Group[];
}

// Список преподавателей (mock data)
const mockTeachers = [
  { id: '2', name: 'Елена Смирнова' },
  { id: '5', name: 'Анна Кузнецова' },
  { id: '6', name: 'Мария Павлова' },
  { id: '7', name: 'Ольга Соколова' },
];

// Список залов
const mockRooms = [
  { id: '1', name: 'Зал 1' },
  { id: '2', name: 'Зал 2' },
  { id: '3', name: 'Зал 3' },
];

export function AdminSchedule({ events, groups }: AdminScheduleProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bulkAddDialogOpen, setBulkAddDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  // Состояние формы нового занятия
  const [newEvent, setNewEvent] = useState({
    groupId: '',
    groupName: '',
    teacherId: '',
    teacherName: '',
    date: '',
    startTime: '',
    endTime: '',
    roomId: '1',
    roomName: 'Зал 1',
  });

  const getWeekDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays();

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  // Фильтруем только дни с занятиями
  const daysWithEvents = weekDays.filter(date => getEventsForDate(date).length > 0);

  const handleOpenAddDialog = () => {
    // Установить дату по умолчанию на сегодня
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    setNewEvent({
      groupId: '',
      groupName: '',
      teacherId: '',
      teacherName: '',
      date: dateStr,
      startTime: '',
      endTime: '',
      roomId: '1',
      roomName: 'Зал 1',
    });
    setAddDialogOpen(true);
  };

  const handleOpenEditDialog = (event: Event) => {
    setSelectedEvent(event);
    const dateStr = new Date(event.date).toISOString().split('T')[0];
    
    setNewEvent({
      groupId: event.groupId,
      groupName: event.groupName,
      teacherId: event.teacherId,
      teacherName: event.teacherName,
      date: dateStr,
      startTime: event.startTime,
      endTime: event.endTime,
      roomId: '1',
      roomName: 'Зал 1',
    });
    setEditDialogOpen(true);
  };

  const handleSaveNewEvent = () => {
    // Валидация
    if (!newEvent.groupId) {
      toast.error('Выберите группу');
      return;
    }
    if (!newEvent.teacherId) {
      toast.error('Выберите преподавателя');
      return;
    }
    if (!newEvent.date) {
      toast.error('Выберите дату');
      return;
    }
    if (!newEvent.startTime || !newEvent.endTime) {
      toast.error('Укажите время занятия');
      return;
    }

    toast.success('Занятие успешно добавлено!');
    setAddDialogOpen(false);
    console.log('Новое занятие:', newEvent);
  };

  const handleSaveEditEvent = () => {
    toast.success('Занятие успешно обновлено!');
    setEditDialogOpen(false);
  };

  const handleDeleteEvent = (event: Event) => {
    if (confirm(`Вы уверены, что хотите удалить занятие "${event.groupName}"?`)) {
      toast.success(`Занятие удалено`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Расписание занятий</h1>
          <p className="text-[#133C2A]/60">Управление календарем и графиком занятий</p>
        </div>
        <Button 
          onClick={handleOpenAddDialog}
          className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 gap-2"
        >
          <Plus className="w-5 h-5" />
          Добавить занятие
        </Button>
      </div>

      <Tabs defaultValue="week" className="w-full">
        <TabsList className="bg-white border border-[#133C2A]/10">
          <TabsTrigger value="week" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#133C2A] data-[state=active]:to-[#D4AF37] data-[state=active]:text-white">
            Неделя
          </TabsTrigger>
          <TabsTrigger value="month" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#133C2A] data-[state=active]:to-[#D4AF37] data-[state=active]:text-white">
            Месяц
          </TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="mt-6">
          {daysWithEvents.length > 0 ? (
            <div className="grid gap-4">
              {daysWithEvents.map((date, index) => {
              const dayEvents = getEventsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <Card 
                  key={index} 
                  className={`border-none soft-shadow ${isToday ? 'ring-2 ring-[#D4AF37]' : ''}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center ${
                          isToday 
                            ? 'bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white' 
                            : 'bg-[#F8F4E3] text-[#133C2A]'
                        }`}>
                          <span className="text-xs">
                            {date.toLocaleDateString('ru-RU', { weekday: 'short' })}
                          </span>
                          <span className="text-xl">{date.getDate()}</span>
                        </div>
                        <div>
                          <CardTitle className="text-[#133C2A]">
                            {date.toLocaleDateString('ru-RU', { weekday: 'long' })}
                          </CardTitle>
                          <p className="text-sm text-[#133C2A]/60">
                            {date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                          </p>
                        </div>
                      </div>
                      {isToday && (
                        <Badge className="bg-[#D4AF37]/20 text-[#133C2A] border-[#D4AF37]/30">
                          Сегодня
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="p-4 rounded-2xl bg-[#F8F4E3] hover:bg-[#F8F4E3]/70 transition-smooth"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center text-white flex-shrink-0">
                              <CalendarIcon className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="text-[#133C2A]">{event.groupName}</h4>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenEditDialog(event)}
                                    className="w-8 h-8 p-0 rounded-xl hover:bg-[#D4AF37]/10"
                                  >
                                    <Edit className="w-4 h-4 text-[#D4AF37]" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteEvent(event)}
                                    className="w-8 h-8 p-0 rounded-xl hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-[#133C2A]/70">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-[#D4AF37]" />
                                  {event.startTime} - {event.endTime}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-[#D4AF37]" />
                                  {event.teacherName}
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-[#D4AF37]" />
                                  Зал 1
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          ) : (
            <EmptyState 
              icon={CalendarIcon}
              title="Нет запланированных занятий"
              description="На этой неделе пока нет занятий"
            />
          )}
        </TabsContent>

        <TabsContent value="month" className="mt-6">
          <Card className="border-none soft-shadow">
            <CardContent className="p-6">
              <div className="text-center py-12 text-[#133C2A]/60">
                <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Представление месяца будет доступно в следующей версии</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Event Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">Добавить занятие</DialogTitle>
            <DialogDescription>
              Создайте новое занятие в расписании
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Группа */}
            <div className="space-y-2">
              <Label htmlFor="group" className="text-[#133C2A]">
                Группа <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <select
                  id="group"
                  value={newEvent.groupId}
                  onChange={(e) => {
                    const group = groups.find(g => g.id === e.target.value);
                    setNewEvent({ 
                      ...newEvent, 
                      groupId: e.target.value, 
                      groupName: group?.name || '',
                      teacherId: group?.teacherId || '',
                      teacherName: group?.teacherName || '',
                    });
                  }}
                  className="w-full h-10 px-3 pr-10 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Выберите группу</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.ageRange})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/50 pointer-events-none" />
              </div>
            </div>

            {/* Преподаватель */}
            <div className="space-y-2">
              <Label htmlFor="teacher" className="text-[#133C2A]">
                Преподаватель <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <select
                  id="teacher"
                  value={newEvent.teacherId}
                  onChange={(e) => {
                    const teacher = mockTeachers.find(t => t.id === e.target.value);
                    setNewEvent({ ...newEvent, teacherId: e.target.value, teacherName: teacher?.name || '' });
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

            {/* Дата */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-[#133C2A]">
                Дата <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            {/* Время */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-[#133C2A]">
                  Время начала <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                  className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-[#133C2A]">
                  Время окончания <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                  className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>
            </div>

            {/* Зал */}
            <div className="space-y-2">
              <Label htmlFor="room" className="text-[#133C2A]">
                Зал
              </Label>
              <div className="relative">
                <select
                  id="room"
                  value={newEvent.roomId}
                  onChange={(e) => {
                    const room = mockRooms.find(r => r.id === e.target.value);
                    setNewEvent({ ...newEvent, roomId: e.target.value, roomName: room?.name || '' });
                  }}
                  className="w-full h-10 px-3 pr-10 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none appearance-none cursor-pointer"
                >
                  {mockRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/50 pointer-events-none" />
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
              onClick={handleSaveNewEvent}
              className="bg-gradient-to-r from-[#133C2A] to-[#1C8C64] text-white hover:opacity-90 rounded-xl"
            >
              Добавить занятие
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">Редактировать занятие</DialogTitle>
            <DialogDescription>
              Внесите изменения в занятие
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Группа */}
            <div className="space-y-2">
              <Label htmlFor="edit-group" className="text-[#133C2A]">
                Группа
              </Label>
              <div className="relative">
                <select
                  id="edit-group"
                  value={newEvent.groupId}
                  onChange={(e) => {
                    const group = groups.find(g => g.id === e.target.value);
                    setNewEvent({ 
                      ...newEvent, 
                      groupId: e.target.value, 
                      groupName: group?.name || '',
                      teacherId: group?.teacherId || '',
                      teacherName: group?.teacherName || '',
                    });
                  }}
                  className="w-full h-10 px-3 pr-10 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Выберите группу</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.ageRange})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/50 pointer-events-none" />
              </div>
            </div>

            {/* Преподаватель */}
            <div className="space-y-2">
              <Label htmlFor="edit-teacher" className="text-[#133C2A]">
                Преподаватель
              </Label>
              <div className="relative">
                <select
                  id="edit-teacher"
                  value={newEvent.teacherId}
                  onChange={(e) => {
                    const teacher = mockTeachers.find(t => t.id === e.target.value);
                    setNewEvent({ ...newEvent, teacherId: e.target.value, teacherName: teacher?.name || '' });
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

            {/* Дата */}
            <div className="space-y-2">
              <Label htmlFor="edit-date" className="text-[#133C2A]">
                Дата
              </Label>
              <Input
                id="edit-date"
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            {/* Время */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startTime" className="text-[#133C2A]">
                  Время начала
                </Label>
                <Input
                  id="edit-startTime"
                  type="time"
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                  className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endTime" className="text-[#133C2A]">
                  Время окончания
                </Label>
                <Input
                  id="edit-endTime"
                  type="time"
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                  className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>
            </div>

            {/* Зал */}
            <div className="space-y-2">
              <Label htmlFor="edit-room" className="text-[#133C2A]">
                Зал
              </Label>
              <div className="relative">
                <select
                  id="edit-room"
                  value={newEvent.roomId}
                  onChange={(e) => {
                    const room = mockRooms.find(r => r.id === e.target.value);
                    setNewEvent({ ...newEvent, roomId: e.target.value, roomName: room?.name || '' });
                  }}
                  className="w-full h-10 px-3 pr-10 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none appearance-none cursor-pointer"
                >
                  {mockRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/50 pointer-events-none" />
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
              onClick={handleSaveEditEvent}
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