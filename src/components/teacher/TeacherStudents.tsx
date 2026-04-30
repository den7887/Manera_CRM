import { Search, Users, CheckCircle, XCircle, Calendar, Phone, MessageSquare, FileText, History, MoreVertical, Cake, TrendingUp, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { Group, Student } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';

interface TeacherStudentsProps {
  groups: Group[];
}

// Mock student data
const mockStudents: Student[] = [
  { 
    id: '1', 
    name: 'София Петрова', 
    birthDate: new Date(2017, 2, 15), // 15 марта 2017
    groupId: '1', 
    attendedClasses: 10, 
    totalClasses: 12, 
    missedClasses: 2,
    startDate: new Date(2023, 8, 1), // Сентябрь 2023
    parentName: 'Анна Петрова',
    parentPhone: '+7 (999) 123-45-67',
    notes: 'Хорошо схватывает новые движения'
  },
  { 
    id: '2', 
    name: 'Даша Иванова', 
    birthDate: new Date(2015, 5, 22), // 22 июня 2015
    groupId: '2', 
    attendedClasses: 14, 
    totalClasses: 16, 
    missedClasses: 2,
    startDate: new Date(2022, 9, 1), // Октябрь 2022
    parentName: 'Елена Иванова',
    parentPhone: '+7 (999) 234-56-78'
  },
  { 
    id: '3', 
    name: 'Мария Смирнова', 
    birthDate: new Date(2016, 10, 8), // 8 ноября 2016
    groupId: '1', 
    attendedClasses: 11, 
    totalClasses: 12, 
    missedClasses: 1,
    startDate: new Date(2024, 0, 10), // Январь 2024
    parentName: 'Ольга Смирнова',
    parentPhone: '+7 (999) 345-67-89'
  },
  { 
    id: '4', 
    name: 'Анна Козлова', 
    birthDate: new Date(2014, 3, 30), // 30 апреля 2014
    groupId: '2', 
    attendedClasses: 13, 
    totalClasses: 16, 
    missedClasses: 3,
    startDate: new Date(2021, 8, 15), // Сентябрь 2021
    parentName: 'Ирина Козлова',
    parentPhone: '+7 (999) 456-78-90'
  },
  { 
    id: '5', 
    name: 'Екатерина Волкова', 
    birthDate: new Date(2018, 7, 5), // 5 августа 2018
    groupId: '1', 
    attendedClasses: 10, 
    totalClasses: 12, 
    missedClasses: 2,
    startDate: new Date(2023, 9, 5), // Октябрь 2023
    parentName: 'Мария Волкова',
    parentPhone: '+7 (999) 567-89-01'
  },
];

// Функция для расчета возраста
const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Функция для расчета лет посещения
const calculateYearsAttending = (startDate: Date): string => {
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - startDate.getTime());
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  
  if (diffYears < 1) {
    const months = Math.floor(diffYears * 12);
    return `${months} мес.`;
  } else {
    const years = Math.floor(diffYears);
    return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`;
  }
};

// Форматирование даты
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Custom Dropdown Menu Component
function CustomDropdown({ 
  student, 
  onContactParent, 
  onSendMessage, 
  onOpenNote, 
  onViewHistory 
}: { 
  student: Student;
  onContactParent: (student: Student) => void;
  onSendMessage: (student: Student) => void;
  onOpenNote: (student: Student) => void;
  onViewHistory: (student: Student) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button 
        variant="outline" 
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 w-10 rounded-full border-[#133C2A]/20 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]"
      >
        <MoreVertical className="w-5 h-5 text-[#133C2A]" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-56 bg-white rounded-lg border border-[#133C2A]/20 shadow-lg z-50 py-2 animate-in fade-in slide-in-from-top-2">
          <button
            onClick={() => handleAction(() => onContactParent(student))}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#133C2A] hover:bg-[#F8F4E3] w-full text-left transition-colors"
          >
            <Phone className="w-4 h-4" />
            Связаться с родителем
          </button>
          <button
            onClick={() => handleAction(() => onSendMessage(student))}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#133C2A] hover:bg-[#F8F4E3] w-full text-left transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Отправить сообщение
          </button>
          <div className="h-px bg-[#133C2A]/10 my-1 mx-2" />
          <button
            onClick={() => handleAction(() => onOpenNote(student))}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#133C2A] hover:bg-[#F8F4E3] w-full text-left transition-colors"
          >
            <FileText className="w-4 h-4" />
            {student.notes ? 'Редактировать примечание' : 'Добавить примечание'}
          </button>
          <button
            onClick={() => handleAction(() => onViewHistory(student))}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#133C2A] hover:bg-[#F8F4E3] w-full text-left transition-colors"
          >
            <History className="w-4 h-4" />
            История посещений
          </button>
        </div>
      )}
    </div>
  );
}

export function TeacherStudents({ groups }: TeacherStudentsProps) {
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [noteText, setNoteText] = useState('');

  const handleContactParent = (student: Student) => {
    window.location.href = `tel:${student.parentPhone}`;
    toast.success(`Звоним ${student.parentName}`);
  };

  const handleOpenNoteDialog = (student: Student) => {
    setSelectedStudent(student);
    setNoteText(student.notes || '');
    setNoteDialogOpen(true);
  };

  const handleSaveNote = () => {
    toast.success('Примечание сохранено');
    setNoteDialogOpen(false);
    setSelectedStudent(null);
  };

  const handleViewHistory = (student: Student) => {
    toast.info(`История посещений для ${student.name}`);
  };

  const handleSendMessage = (student: Student) => {
    toast.info(`Открыть чат с ${student.parentName}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      <div>
        <h1 className="text-[#133C2A] mb-2">Все ученики</h1>
        <p className="text-[#133C2A]/60">База данных учеников и их прогресс</p>
      </div>

      {/* Search and Filters */}
      <Card className="border-none soft-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/40" />
              <Input
                placeholder="Поиск учеников..."
                className="pl-12 h-12 rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {groups.map((group) => (
                <Badge
                  key={group.id}
                  variant="outline"
                  className="cursor-pointer border-[#133C2A]/20 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] transition-smooth px-4 py-2"
                  style={{ borderLeftWidth: '4px', borderLeftColor: group.color }}
                >
                  {group.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <div className="grid gap-4">
        {mockStudents.map((student) => {
          const group = groups.find(g => g.id === student.groupId);
          const age = calculateAge(student.birthDate);
          const yearsAttending = calculateYearsAttending(student.startDate);
          
          return (
            <Card key={student.id} className="border-none soft-shadow hover-lift">
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  <Avatar className="w-16 h-16 border-2 border-[#D4AF37]">
                    <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white text-xl">
                      {student.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Колонка 1: Информация о ученике */}
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-[#133C2A] mb-2">{student.name}</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          {group && (
                            <Badge 
                              className="border-0 text-white"
                              style={{ backgroundColor: group.color }}
                            >
                              {group.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-[#133C2A]/70">
                          <Cake className="w-4 h-4" />
                          <span>{formatDate(student.birthDate)} ({age} лет)</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#133C2A]/70">
                          <TrendingUp className="w-4 h-4" />
                          <span>Занимается {yearsAttending}</span>
                        </div>
                      </div>
                    </div>

                    {/* Колонка 2: Посещаемость */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-[#133C2A]" />
                        <span className="text-sm text-[#133C2A]/70">Посещаемость</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#133C2A]/60">Посещено:</span>
                          <span className="text-sm text-[#1C8C64]">{student.attendedClasses} из {student.totalClasses}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#133C2A]/60">Пропущено:</span>
                          <span className="text-sm text-[#D4AF37]">{student.missedClasses}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Phone className="w-3 h-3 text-[#133C2A]/60" />
                          <span className="text-xs text-[#133C2A]/60">{student.parentName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Колонка 3: Действия */}
                    <div className="flex items-start justify-end">
                      <CustomDropdown
                        student={student}
                        onContactParent={handleContactParent}
                        onSendMessage={handleSendMessage}
                        onOpenNote={handleOpenNoteDialog}
                        onViewHistory={handleViewHistory}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Статистика</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-2xl bg-[#F8F4E3]">
              <Users className="w-8 h-8 text-[#133C2A] mx-auto mb-2" />
              <p className="text-2xl text-[#133C2A] mb-1">{mockStudents.length}</p>
              <p className="text-sm text-[#133C2A]/60">Всего учеников</p>
            </div>
            <div className="text-center p-4 rounded-2xl bg-[#F8F4E3]">
              <CheckCircle className="w-8 h-8 text-[#1C8C64] mx-auto mb-2" />
              <p className="text-2xl text-[#133C2A] mb-1">{Math.round((mockStudents.reduce((sum, s) => sum + s.attendedClasses, 0) / mockStudents.reduce((sum, s) => sum + s.totalClasses, 0)) * 100)}%</p>
              <p className="text-sm text-[#133C2A]/60">Посещаемость</p>
            </div>
            <div className="text-center p-4 rounded-2xl bg-[#F8F4E3]">
              <XCircle className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
              <p className="text-2xl text-[#133C2A] mb-1">{mockStudents.reduce((sum, s) => sum + s.missedClasses, 0)}</p>
              <p className="text-sm text-[#133C2A]/60">Всего пропусков</p>
            </div>
            <div className="text-center p-4 rounded-2xl bg-[#F8F4E3]">
              <Users className="w-8 h-8 text-[#FADADD] mx-auto mb-2" />
              <p className="text-2xl text-[#133C2A] mb-1">{groups.length}</p>
              <p className="text-sm text-[#133C2A]/60">Активных групп</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">
              {selectedStudent?.notes ? 'Редактировать примечание' : 'Добавить примечание'}
            </DialogTitle>
            <DialogDescription>
              Примечание для {selectedStudent?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Введите примечание о ученике..."
              className="min-h-[150px] border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNoteDialogOpen(false)}
              className="border-[#133C2A]/20 hover:bg-[#133C2A]/5"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSaveNote}
              className="bg-gradient-to-r from-[#133C2A] to-[#1C8C64] text-white hover:opacity-90"
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
