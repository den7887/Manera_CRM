import { useState } from 'react';
import { Textarea } from '../ui/textarea';
import { EditStudentDialog } from './EditStudentDialog';
import { AddStudentDialog } from './AddStudentDialog';
import { mockUsers, mockPricingProducts } from '../../data/mockData';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { 
  Users, 
  CreditCard, 
  AlertCircle, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Edit,
  History,
  Calendar,
  Cake,
  TrendingUp,
  Coins,
  Clock,
  Info,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { Group } from '../../types';

interface AdminStudentsProps {
  groups: Group[];
}

// Extended mock student data with all information
const mockStudents = [
  { 
    id: '1', 
    name: 'София Петрова', 
    birthDate: new Date(2017, 2, 15), // 15 марта 2017
    age: 8, 
    groupId: '1',
    groupName: 'Младшая группа',
    parentName: 'Анна Петрова',
    parentEmail: 'anna.petrova@email.com',
    parentPhone: '+7 (999) 123-45-67',
    status: 'active',
    attendedClasses: 10,
    totalClasses: 12,
    missedClasses: 2,
    startDate: new Date(2023, 8, 1), // Сентябрь 2023
    subscriptionName: 'Абонемент 8 занятий',
    subscriptionClasses: 8,
    remainingClasses: 2,
    lastPaymentDate: new Date(2024, 10, 1), // 1 ноября 2024
    lastPaymentAmount: 4800,
    paymentStatus: 'paid' as const,
    nextPaymentDate: new Date(2024, 11, 1), // 1 декабря 2024
    purchaseDate: new Date(2024, 10, 1),
    notes: 'Хорошо схватывает новые движения, активная'
  },
  { 
    id: '2', 
    name: 'Даша Иванова', 
    birthDate: new Date(2015, 5, 22), // 22 июня 2015
    age: 10, 
    groupId: '2',
    groupName: 'Средняя группа',
    parentName: 'Ирина Иванова',
    parentEmail: 'irina.ivanova@email.com',
    parentPhone: '+7 (999) 234-56-78',
    status: 'active',
    attendedClasses: 14,
    totalClasses: 16,
    missedClasses: 2,
    startDate: new Date(2022, 9, 1), // Октябрь 2022
    subscriptionName: 'Абонемент 12 занятий',
    subscriptionClasses: 12,
    remainingClasses: 4,
    lastPaymentDate: new Date(2024, 9, 15), // 15 октября 2024
    lastPaymentAmount: 6500,
    paymentStatus: 'paid' as const,
    nextPaymentDate: new Date(2024, 11, 15), // 15 декабря 2024
    purchaseDate: new Date(2024, 9, 15),
    notes: ''
  },
  { 
    id: '3', 
    name: 'Мария Смирнова', 
    birthDate: new Date(2016, 10, 8), // 8 ноября 2016
    age: 9, 
    groupId: '1',
    groupName: 'Младшая группа',
    parentName: 'Елена Смирнова',
    parentEmail: 'elena.smirnova@email.com',
    parentPhone: '+7 (999) 345-67-89',
    status: 'active',
    attendedClasses: 11,
    totalClasses: 12,
    missedClasses: 1,
    startDate: new Date(2024, 0, 10), // Январь 2024
    subscriptionName: 'Абонемент 8 занятий',
    subscriptionClasses: 8,
    remainingClasses: 1,
    lastPaymentDate: new Date(2024, 10, 5), // 5 ноября 2024
    lastPaymentAmount: 4800,
    paymentStatus: 'pending' as const,
    nextPaymentDate: new Date(2024, 10, 20), // 20 ноября 2024
    purchaseDate: new Date(2024, 10, 5),
    notes: ''
  },
  { 
    id: '4', 
    name: 'Анна Козлова', 
    birthDate: new Date(2014, 3, 30), // 30 апреля 2014
    age: 11, 
    groupId: '2',
    groupName: 'Средняя группа',
    parentName: 'Ольга Козлова',
    parentEmail: 'olga.kozlova@email.com',
    parentPhone: '+7 (999) 456-78-90',
    status: 'active',
    attendedClasses: 13,
    totalClasses: 16,
    missedClasses: 3,
    startDate: new Date(2021, 8, 15), // Сентябрь 2021
    subscriptionName: 'Абонемент 12 занятий',
    subscriptionClasses: 12,
    remainingClasses: 7,
    lastPaymentDate: new Date(2024, 10, 10), // 10 ноября 2024
    lastPaymentAmount: 6500,
    paymentStatus: 'paid' as const,
    nextPaymentDate: new Date(2024, 11, 25), // 25 декабря 2024
    purchaseDate: new Date(2024, 10, 10),
    notes: 'Опытная ученица, помогает младшим'
  },
  { 
    id: '5', 
    name: 'Екатерина Волкова', 
    birthDate: new Date(2018, 7, 5), // 5 августа 2018
    age: 7, 
    groupId: '1',
    groupName: 'Младшая группа',
    parentName: 'Наталья Волкова',
    parentEmail: 'natalia.volkova@email.com',
    parentPhone: '+7 (999) 567-89-01',
    status: 'inactive',
    attendedClasses: 10,
    totalClasses: 12,
    missedClasses: 2,
    startDate: new Date(2023, 9, 5), // Октябрь 2023
    subscriptionName: 'Абонемент 8 занятий',
    subscriptionClasses: 8,
    remainingClasses: 0,
    lastPaymentDate: new Date(2024, 8, 1), // 1 сентября 2024
    lastPaymentAmount: 4800,
    paymentStatus: 'overdue' as const,
    nextPaymentDate: new Date(2024, 9, 1), // 1 октября 2024
    purchaseDate: new Date(2024, 8, 1),
    notes: 'Приостановила занятия на осень'
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

export function AdminStudents({ groups }: AdminStudentsProps) {
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<typeof mockStudents[0] | null>(null);
  const [noteText, setNoteText] = useState('');

  // Подготовка данных родителей для выпадающего списка
  const parentsData = mockUsers
    .filter(u => u.role === 'parent')
    .map(u => ({
      id: u.id,
      name: u.name,
      email: u.email || '',
      phone: u.phone,
    }));

  const toggleStudent = (studentId: string) => {
    const newExpanded = new Set(expandedStudents);
    if (newExpanded.has(studentId)) {
      newExpanded.delete(studentId);
    } else {
      newExpanded.add(studentId);
    }
    setExpandedStudents(newExpanded);
  };

  const handleOpenNoteDialog = (student: typeof mockStudents[0]) => {
    setSelectedStudent(student);
    setNoteText(student.notes || '');
    setNoteDialogOpen(true);
  };

  const handleSaveNote = () => {
    toast.success('Примечание сохранено');
    setNoteDialogOpen(false);
    setSelectedStudent(null);
  };

  const handleContactParent = (student: typeof mockStudents[0]) => {
    window.location.href = `tel:${student.parentPhone}`;
    toast.success(`Звоним ${student.parentName}`);
  };

  const handleSendEmail = (student: typeof mockStudents[0]) => {
    window.location.href = `mailto:${student.parentEmail}`;
    toast.success(`Открываем почту для ${student.parentName}`);
  };

  const handleSendMessage = (student: typeof mockStudents[0]) => {
    toast.info(`Открыть чат с ${student.parentName}`);
  };

  const handleViewHistory = (student: typeof mockStudents[0]) => {
    toast.info(`История посещений для ${student.name}`);
  };

  const handlePaymentReminder = (student: typeof mockStudents[0]) => {
    toast.success(`Напоминание об оплате отправлено ${student.parentName}`);
  };

  const handleOpenEditDialog = (student: typeof mockStudents[0]) => {
    setSelectedStudent(student);
    setEditDialogOpen(true);
  };

  const handleOpenAddDialog = () => {
    setAddDialogOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">База учеников</h1>
          <p className="text-[#133C2A]/60">Полная информация обо всех студентах студии</p>
        </div>
        <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 gap-2" onClick={handleOpenAddDialog}>
          <Plus className="w-5 h-5" />
          Добавить ученика
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
                <p className="text-sm text-[#133C2A]/60">Всего учеников</p>
                <p className="text-3xl text-[#133C2A]">{mockStudents.length}</p>
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
                <p className="text-sm text-[#133C2A]/60">Активных</p>
                <p className="text-3xl text-[#133C2A]">
                  {mockStudents.filter(s => s.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                <CreditCard className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Оплачено</p>
                <p className="text-3xl text-[#133C2A]">
                  {mockStudents.filter(s => s.paymentStatus === 'paid').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6B6B] to-[#FF5252] flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Задолженность</p>
                <p className="text-3xl text-[#133C2A]">
                  {mockStudents.filter(s => s.paymentStatus === 'overdue' || s.paymentStatus === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-none soft-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/40" />
              <Input
                placeholder="Поиск по имени, группе или родителю..."
                className="pl-12 h-12 rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" className="rounded-2xl border-[#133C2A]/20 gap-2">
                <Filter className="w-4 h-4" />
                Все статусы
              </Button>
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
          const isExpanded = expandedStudents.has(student.id);
          const age = calculateAge(student.birthDate);
          const yearsAttending = calculateYearsAttending(student.startDate);
          const attendanceRate = Math.round((student.attendedClasses / student.totalClasses) * 100);
          
          return (
            <Card key={student.id} className="border-none soft-shadow hover-lift">
              <CardContent className="p-6">
                {/* Main row - always visible */}
                <div 
                  className="flex items-center gap-6 cursor-pointer"
                  onClick={() => toggleStudent(student.id)}
                >
                  <Avatar className="w-16 h-16 border-2 border-[#D4AF37]">
                    <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white text-xl">
                      {student.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2">
                      <h4 className="text-[#133C2A] mb-1">{student.name}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="border-[#133C2A]/20 text-[#133C2A]">
                          {age} лет
                        </Badge>
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

                    <div>
                      <p className="text-sm text-[#133C2A]/60 mb-1">Родитель</p>
                      <p className="text-sm text-[#133C2A]">{student.parentName}</p>
                    </div>

                    <div>
                      <p className="text-sm text-[#133C2A]/60 mb-1">Посещаемость</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-[#F8F4E3] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#1C8C64] to-[#D4AF37] rounded-full transition-all"
                            style={{ width: `${attendanceRate}%` }}
                          />
                        </div>
                        <span className="text-sm text-[#133C2A]">{attendanceRate}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Badge 
                        variant="outline" 
                        className={
                          student.paymentStatus === 'paid'
                            ? 'bg-[#1C8C64]/10 border-[#1C8C64]/20 text-[#1C8C64]'
                            : student.paymentStatus === 'pending'
                            ? 'bg-[#D4AF37]/10 border-[#D4AF37]/20 text-[#D4AF37]'
                            : 'bg-[#FF6B6B]/10 border-[#FF6B6B]/20 text-[#FF6B6B]'
                        }
                      >
                        {student.paymentStatus === 'paid' ? 'Оплачено' : student.paymentStatus === 'pending' ? 'Ожидает' : 'Просрочено'}
                      </Badge>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStudent(student.id);
                        }}
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-[#133C2A]/10 animate-in slide-in-from-top-4">
                    <div className="grid md:grid-cols-3 gap-6">
                      {/* Column 1: Personal Info */}
                      <div className="space-y-4">
                        <div>
                          <h5 className="text-sm text-[#133C2A] mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#D4AF37]" />
                            Личная информация
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-[#133C2A]/70">
                              <Cake className="w-4 h-4" />
                              <span>{formatDate(student.birthDate)} ({age} лет)</span>
                            </div>
                            <div className="flex items-center gap-2 text-[#133C2A]/70">
                              <TrendingUp className="w-4 h-4" />
                              <span>Занимается {yearsAttending}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[#133C2A]/70">
                              <Calendar className="w-4 h-4" />
                              <span>Начало: {formatDate(student.startDate)}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="text-sm text-[#133C2A] mb-3 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-[#D4AF37]" />
                            Контакты родителя
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-[#133C2A]/70">
                              <Users className="w-4 h-4" />
                              <span>{student.parentName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[#133C2A]/70">
                              <Phone className="w-4 h-4" />
                              <span>{student.parentPhone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[#133C2A]/70">
                              <Mail className="w-4 h-4" />
                              <span className="truncate">{student.parentEmail}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Attendance & Subscription */}
                      <div className="space-y-4">
                        <div>
                          <h5 className="text-sm text-[#133C2A] mb-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#D4AF37]" />
                            Посещаемость
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-[#133C2A]/60">Посещено:</span>
                              <span className="text-[#1C8C64]">{student.attendedClasses} из {student.totalClasses}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#133C2A]/60">Пропущено:</span>
                              <span className="text-[#D4AF37]">{student.missedClasses}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#133C2A]/60">Процент:</span>
                              <span className="text-[#133C2A]">{attendanceRate}%</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="text-sm text-[#133C2A] mb-3 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-[#D4AF37]" />
                            Абонемент
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-[#133C2A]/60">Тариф:</span>
                              <span className="text-[#133C2A]">{student.subscriptionName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#133C2A]/60">Осталось занятий:</span>
                              <Badge variant="outline" className="border-[#1C8C64]/20 text-[#1C8C64]">
                                {student.remainingClasses} / {student.subscriptionClasses}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Column 3: Payment & Notes */}
                      <div className="space-y-4">
                        <div>
                          <h5 className="text-sm text-[#133C2A] mb-3 flex items-center gap-2">
                            <Coins className="w-4 h-4 text-[#D4AF37]\" />
                            Платежи
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-[#133C2A]/60">Последний платёж:</span>
                              <span className="text-[#133C2A]">{student.lastPaymentAmount} ₽</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#133C2A]/60">Дата:</span>
                              <span className="text-[#133C2A]/70 text-xs">{formatDate(student.lastPaymentDate)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#133C2A]/60">Следующий:</span>
                              <span className="text-[#133C2A]/70 text-xs">{formatDate(student.nextPaymentDate)}</span>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={
                                student.paymentStatus === 'paid'
                                  ? 'bg-[#1C8C64]/10 border-[#1C8C64]/20 text-[#1C8C64] w-full justify-center'
                                  : student.paymentStatus === 'pending'
                                  ? 'bg-[#D4AF37]/10 border-[#D4AF37]/20 text-[#D4AF37] w-full justify-center'
                                  : 'bg-[#FF6B6B]/10 border-[#FF6B6B]/20 text-[#FF6B6B] w-full justify-center'
                              }
                            >
                              {student.paymentStatus === 'paid' ? 'Оплачено' : student.paymentStatus === 'pending' ? 'Ожидает оплаты' : 'Просрочено'}
                            </Badge>
                          </div>
                        </div>

                        {student.notes && (
                          <div>
                            <h5 className="text-sm text-[#133C2A] mb-2 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[#D4AF37]" />
                              Примечания
                            </h5>
                            <p className="text-sm text-[#133C2A]/70 p-3 rounded-xl bg-[#F8F4E3]">
                              {student.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-6 pt-4 border-t border-[#133C2A]/10 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContactParent(student);
                        }}
                        className="rounded-xl border-[#133C2A]/20 hover:bg-[#1C8C64]/5 hover:border-[#1C8C64] gap-2"
                      >
                        <Phone className="w-4 h-4" />
                        Позвонить
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendEmail(student);
                        }}
                        className="rounded-xl border-[#133C2A]/20 hover:bg-[#D4AF37]/5 hover:border-[#D4AF37] gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendMessage(student);
                        }}
                        className="rounded-xl border-[#133C2A]/20 hover:bg-[#D4AF37]/5 hover:border-[#D4AF37] gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Сообщение
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNoteDialog(student);
                        }}
                        className="rounded-xl border-[#133C2A]/20 hover:bg-[#D4AF37]/5 hover:border-[#D4AF37] gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        {student.notes ? 'Редактировать примечание' : 'Добавить примечание'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewHistory(student);
                        }}
                        className="rounded-xl border-[#133C2A]/20 hover:bg-[#D4AF37]/5 hover:border-[#D4AF37] gap-2"
                      >
                        <History className="w-4 h-4" />
                        История
                      </Button>
                      {(student.paymentStatus === 'pending' || student.paymentStatus === 'overdue') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePaymentReminder(student);
                          }}
                          className="rounded-xl border-[#FF6B6B]/20 bg-[#FF6B6B]/5 hover:bg-[#FF6B6B]/10 hover:border-[#FF6B6B] text-[#FF6B6B] gap-2"
                        >
                          <Clock className="w-4 h-4" />
                          Напомнить об оплате
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditDialog(student);
                        }}
                        className="rounded-xl border-[#133C2A]/20 hover:bg-[#133C2A]/5 hover:border-[#133C2A] gap-2 ml-auto"
                      >
                        <Edit className="w-4 h-4" />
                        Редактировать
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">
              {selectedStudent?.notes ? 'Редактировать примечание' : 'Добавить примечание'}
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <div>Примечание для {selectedStudent?.name}</div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                <Info className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                <span className="text-xs text-[#133C2A]/70">
                  Эта заметка будет видна родителю ученика
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Введите примечание о ученике...&#10;&#10;Например: успехи, рекомендации, планы развития"
              className="min-h-[150px] border-[#133C2A]/20 focus:border-[#D4AF37] rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNoteDialogOpen(false)}
              className="border-[#133C2A]/20 hover:bg-[#133C2A]/5 rounded-xl"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSaveNote}
              className="bg-gradient-to-r from-[#133C2A] to-[#1C8C64] text-white hover:opacity-90 rounded-xl"
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <EditStudentDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        student={selectedStudent}
        groups={groups}
        parents={parentsData}
        subscriptions={mockPricingProducts}
      />

      {/* Add Student Dialog */}
      <AddStudentDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        groups={groups}
        parents={parentsData}
        subscriptions={mockPricingProducts}
      />
    </div>
  );
}