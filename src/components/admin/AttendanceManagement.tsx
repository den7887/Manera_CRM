import { useState } from 'react';
import { Calendar as CalendarIcon, Check, X, Users, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from '../../utils/toast';

interface Student {
  id: string;
  name: string;
  groupId: string;
  avatarUrl?: string;
}

interface AttendanceRecord {
  studentId: string;
  status: 'present' | 'absent' | 'late' | 'excused';
}

interface ClassSession {
  id: string;
  groupId: string;
  groupName: string;
  date: Date;
  time: string;
  students: Student[];
}

export function AttendanceManagement() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});

  // Mock данные для демонстрации
  const mockGroups = [
    { id: 'group-1', name: 'Contemporary Начинающие', color: '#1C8C64' },
    { id: 'group-2', name: 'Hip-Hop Средний', color: '#D4AF37' },
    { id: 'group-3', name: 'Балет Продвинутые', color: '#9B59B6' },
  ];

  const mockSessions: ClassSession[] = [
    {
      id: 'session-1',
      groupId: 'group-1',
      groupName: 'Contemporary Начинающие',
      date: new Date(),
      time: '10:00 - 11:30',
      students: [
        { id: 's1', name: 'Анна Иванова', groupId: 'group-1' },
        { id: 's2', name: 'Мария Петрова', groupId: 'group-1' },
        { id: 's3', name: 'София Сидорова', groupId: 'group-1' },
        { id: 's4', name: 'Екатерина Смирнова', groupId: 'group-1' },
      ],
    },
    {
      id: 'session-2',
      groupId: 'group-2',
      groupName: 'Hip-Hop Средний',
      date: new Date(),
      time: '14:00 - 15:30',
      students: [
        { id: 's5', name: 'Максим Кузнецов', groupId: 'group-2' },
        { id: 's6', name: 'Артём Волков', groupId: 'group-2' },
        { id: 's7', name: 'Даниил Морозов', groupId: 'group-2' },
      ],
    },
  ];

  const filteredSessions = mockSessions.filter(
    (session) =>
      selectedGroup === 'all' || session.groupId === selectedGroup
  );

  const markAttendance = (sessionId: string, studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    const key = `${sessionId}-${studentId}`;
    setAttendance((prev) => ({
      ...prev,
      [key]: { studentId, status },
    }));
  };

  const getAttendanceStatus = (sessionId: string, studentId: string) => {
    const key = `${sessionId}-${studentId}`;
    return attendance[key]?.status;
  };

  const getSessionStats = (session: ClassSession) => {
    const total = session.students.length;
    const present = session.students.filter(
      (s) => getAttendanceStatus(session.id, s.id) === 'present'
    ).length;
    const absent = session.students.filter(
      (s) => getAttendanceStatus(session.id, s.id) === 'absent'
    ).length;
    const late = session.students.filter(
      (s) => getAttendanceStatus(session.id, s.id) === 'late'
    ).length;

    return { total, present, absent, late };
  };

  const exportAttendance = () => {
    toast.info('Функция экспорта будет доступна после подключения бэкенда');
  };

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl text-[#133C2A]">
            Отметка посещаемости
          </h1>
          <p className="text-sm text-[#133C2A]/60 mt-1">
            Отмечайте присутствие учеников на занятиях
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="rounded-2xl border-[#133C2A]/20"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                {format(selectedDate, 'dd MMMM yyyy', { locale: ru })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                locale={ru}
              />
            </PopoverContent>
          </Popover>

          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-[200px] rounded-2xl border-[#133C2A]/20">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Все группы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все группы</SelectItem>
              {mockGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={exportAttendance}
            className="rounded-2xl bg-[#133C2A] hover:bg-[#133C2A]/90"
          >
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Список занятий */}
      {filteredSessions.length === 0 ? (
        <Card className="border-none soft-shadow">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-[#133C2A]/20" />
            <h3 className="text-lg text-[#133C2A] mb-2">Нет занятий</h3>
            <p className="text-sm text-[#133C2A]/60">
              На выбранную дату занятий не запланировано
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredSessions.map((session) => {
            const stats = getSessionStats(session);
            const group = mockGroups.find((g) => g.id === session.groupId);

            return (
              <Card key={session.id} className="border-none soft-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl text-[#133C2A] mb-2">
                        {session.groupName}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-[#133C2A]/60">
                        <span>{session.time}</span>
                        <Badge
                          style={{
                            backgroundColor: `${group?.color}20`,
                            color: group?.color,
                          }}
                        >
                          {session.students.length} учеников
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-2xl text-[#1C8C64]">{stats.present}</p>
                        <p className="text-xs text-[#133C2A]/60">Пришли</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl text-[#D4AF37]">{stats.late}</p>
                        <p className="text-xs text-[#133C2A]/60">Опоздали</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl text-red-500">{stats.absent}</p>
                        <p className="text-xs text-[#133C2A]/60">Отсутствуют</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {session.students.map((student) => {
                      const status = getAttendanceStatus(session.id, student.id);

                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F4E3]/50 hover:bg-[#F8F4E3] transition-smooth"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center text-white">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-[#133C2A]">{student.name}</p>
                              {status && (
                                <p className="text-xs text-[#133C2A]/60">
                                  {status === 'present' && 'Присутствует'}
                                  {status === 'absent' && 'Отсутствует'}
                                  {status === 'late' && 'Опоздал(а)'}
                                  {status === 'excused' && 'Уважительная причина'}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={status === 'present' ? 'default' : 'outline'}
                              onClick={() => markAttendance(session.id, student.id, 'present')}
                              className={`rounded-xl ${
                                status === 'present'
                                  ? 'bg-[#1C8C64] hover:bg-[#1C8C64]/90'
                                  : 'border-[#1C8C64] text-[#1C8C64] hover:bg-[#1C8C64]/10'
                              }`}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Пришёл
                            </Button>
                            <Button
                              size="sm"
                              variant={status === 'late' ? 'default' : 'outline'}
                              onClick={() => markAttendance(session.id, student.id, 'late')}
                              className={`rounded-xl ${
                                status === 'late'
                                  ? 'bg-[#D4AF37] hover:bg-[#D4AF37]/90'
                                  : 'border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10'
                              }`}
                            >
                              Опоздал
                            </Button>
                            <Button
                              size="sm"
                              variant={status === 'absent' ? 'default' : 'outline'}
                              onClick={() => markAttendance(session.id, student.id, 'absent')}
                              className={`rounded-xl ${
                                status === 'absent'
                                  ? 'bg-red-500 hover:bg-red-500/90'
                                  : 'border-red-500 text-red-500 hover:bg-red-500/10'
                              }`}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Нет
                            </Button>
                            <Button
                              size="sm"
                              variant={status === 'excused' ? 'default' : 'outline'}
                              onClick={() => markAttendance(session.id, student.id, 'excused')}
                              className={`rounded-xl ${
                                status === 'excused'
                                  ? 'bg-blue-500 hover:bg-blue-500/90'
                                  : 'border-blue-500 text-blue-500 hover:bg-blue-500/10'
                              }`}
                            >
                              Уваж
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}