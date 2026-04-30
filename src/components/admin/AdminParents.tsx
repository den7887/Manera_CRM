import { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MessageSquare, 
  Edit, 
  Users, 
  UserCheck,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { AddParentDialog } from './AddParentDialog';
import { EditParentDialog } from './EditParentDialog';

// Мок-данные для родителей
const mockParents = [
  {
    id: '1',
    name: 'Иванова Анна Сергеевна',
    phone: '+7 (999) 123-45-67',
    email: 'anna.ivanova@email.com',
    registrationDate: new Date('2024-01-15'),
    children: [
      { id: '1', name: 'Иванова Мария', group: 'Средняя группа (7-10 лет)' }
    ],
    activeSubscriptions: 1,
    totalDebt: 0,
    notes: 'Всегда вовремя оплачивает абонементы',
  },
  {
    id: '2',
    name: 'Петрова Елена Михайловна',
    phone: '+7 (999) 234-56-78',
    email: 'elena.petrova@email.com',
    registrationDate: new Date('2023-09-20'),
    children: [
      { id: '2', name: 'Петрова София', group: 'Младшая группа (4-6 лет)' },
      { id: '3', name: 'Петрова Александра', group: 'Средняя группа (7-10 лет)' }
    ],
    activeSubscriptions: 2,
    totalDebt: 0,
    notes: 'Две дочери в студии',
  },
  {
    id: '3',
    name: 'Смирнова Ольга Дмитриевна',
    phone: '+7 (999) 345-67-89',
    email: 'olga.smirnova@email.com',
    registrationDate: new Date('2024-02-10'),
    children: [
      { id: '4', name: 'Смирнова Екатерина', group: 'Старшая группа (11-14 лет)' }
    ],
    activeSubscriptions: 1,
    totalDebt: 0,
    notes: '',
  },
  {
    id: '4',
    name: 'Кузнецова Мария Александровна',
    phone: '+7 (999) 456-78-90',
    email: 'maria.kuznetsova@email.com',
    registrationDate: new Date('2023-11-05'),
    children: [
      { id: '5', name: 'Кузнецова Анастасия', group: 'Средняя группа (7-10 лет)' }
    ],
    activeSubscriptions: 1,
    totalDebt: 3500,
    notes: 'Задолженность за февраль',
  },
  {
    id: '5',
    name: 'Новикова Татьяна Игоревна',
    phone: '+7 (999) 567-89-01',
    email: 'tatyana.novikova@email.com',
    registrationDate: new Date('2024-03-01'),
    children: [
      { id: '6', name: 'Новикова Полина', group: 'Младшая группа (4-6 лет)' }
    ],
    activeSubscriptions: 1,
    totalDebt: 0,
    notes: 'Новый родитель',
  },
  {
    id: '6',
    name: 'Морозова Виктория Олеговна',
    phone: '+7 (999) 678-90-12',
    email: 'victoria.morozova@email.com',
    registrationDate: new Date('2023-08-12'),
    children: [
      { id: '7', name: 'Морозова Дарья', group: 'Старшая группа (11-14 лет)' }
    ],
    activeSubscriptions: 1,
    totalDebt: 0,
    notes: '',
  },
];

export function AdminParents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<typeof mockParents[0] | null>(null);

  // Фильтрация родителей
  const filteredParents = mockParents.filter(parent => 
    parent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    parent.phone.includes(searchQuery) ||
    parent.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Статистика
  const totalParents = mockParents.length;
  const activeParents = mockParents.filter(p => p.activeSubscriptions > 0).length;
  const newThisMonth = mockParents.filter(p => {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return p.registrationDate >= monthAgo;
  }).length;
  const totalDebt = mockParents.reduce((sum, p) => sum + p.totalDebt, 0);

  // Обработчики
  const handleEdit = (parent: typeof mockParents[0]) => {
    setSelectedParent(parent);
    setIsEditDialogOpen(true);
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleMessage = (phone: string) => {
    // В реальном приложении здесь будет открытие мессенджера
    console.log('Отправить сообщение:', phone);
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[#133C2A] mb-2">Родители</h1>
          <p className="text-[#133C2A]/60">
            Управление родителями и контактной информацией
          </p>
        </div>
        <Button 
          onClick={() => setIsAddDialogOpen(true)}
          className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#1C8C64] text-white hover:opacity-90 gap-2"
        >
          <Plus className="w-4 h-4" />
          Добавить родителя
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 rounded-3xl border-[#133C2A]/10 bg-gradient-to-br from-white to-[#F8F4E3]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#133C2A]/60 mb-1">Всего родителей</p>
              <p className="text-3xl text-[#133C2A]">{totalParents}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#133C2A]/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-[#133C2A]" />
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-3xl border-[#133C2A]/10 bg-gradient-to-br from-white to-[#D4AF37]/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#133C2A]/60 mb-1">Активные</p>
              <p className="text-3xl text-[#133C2A]">{activeParents}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-[#D4AF37]" />
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-3xl border-[#133C2A]/10 bg-gradient-to-br from-white to-[#1C8C64]/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#133C2A]/60 mb-1">Новые за месяц</p>
              <p className="text-3xl text-[#133C2A]">{newThisMonth}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#1C8C64]/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[#1C8C64]" />
            </div>
          </div>
        </Card>

        <Card className={`p-6 rounded-3xl border-[#133C2A]/10 ${totalDebt > 0 ? 'bg-gradient-to-br from-white to-red-50' : 'bg-gradient-to-br from-white to-[#F8F4E3]/30'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#133C2A]/60 mb-1">Задолженность</p>
              <p className={`text-3xl ${totalDebt > 0 ? 'text-red-600' : 'text-[#133C2A]'}`}>
                {totalDebt.toLocaleString('ru-RU')} ₽
              </p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${totalDebt > 0 ? 'bg-red-100' : 'bg-[#133C2A]/10'}`}>
              <Calendar className={`w-6 h-6 ${totalDebt > 0 ? 'text-red-600' : 'text-[#133C2A]'}`} />
            </div>
          </div>
        </Card>
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/40" />
        <Input
          type="text"
          placeholder="Поиск по имени, телефону или email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
        />
      </div>

      {/* Список родителей */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredParents.map((parent) => (
          <Card 
            key={parent.id} 
            className="p-6 rounded-3xl border-[#133C2A]/10 hover:border-[#D4AF37]/30 transition-all duration-200 hover:shadow-lg"
          >
            {/* Заголовок карточки */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-[#133C2A] mb-1">{parent.name}</h3>
                <p className="text-sm text-[#133C2A]/60">
                  Регистрация: {parent.registrationDate.toLocaleDateString('ru-RU', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(parent)}
                className="rounded-xl border-[#133C2A]/20 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10"
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>

            {/* Контактная информация */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#133C2A]/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-[#133C2A]" />
                </div>
                <span className="text-[#133C2A]">{parent.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#133C2A]/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-[#133C2A]" />
                </div>
                <span className="text-sm text-[#133C2A]/70 truncate">{parent.email}</span>
              </div>
            </div>

            {/* Дети */}
            <div className="mb-4">
              <p className="text-sm text-[#133C2A]/60 mb-2">
                {parent.children.length === 1 ? 'Ребёнок:' : 'Дети:'}
              </p>
              <div className="space-y-2">
                {parent.children.map((child) => (
                  <div 
                    key={child.id} 
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#F8F4E3]/50 border border-[#133C2A]/5"
                  >
                    <div>
                      <p className="text-sm text-[#133C2A]">{child.name}</p>
                      <p className="text-xs text-[#133C2A]/60">{child.group}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Статус и действия */}
            <div className="flex items-center justify-between pt-4 border-t border-[#133C2A]/10">
              <div className="flex gap-2">
                <Badge 
                  variant={parent.activeSubscriptions > 0 ? 'default' : 'secondary'}
                  className={`rounded-xl ${parent.activeSubscriptions > 0 ? 'bg-[#1C8C64] hover:bg-[#1C8C64]/90' : ''}`}
                >
                  {parent.activeSubscriptions} {parent.activeSubscriptions === 1 ? 'абонемент' : 'абонемента'}
                </Badge>
                {parent.totalDebt > 0 && (
                  <Badge variant="destructive" className="rounded-xl">
                    Долг: {parent.totalDebt.toLocaleString('ru-RU')} ₽
                  </Badge>
                )}
              </div>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCall(parent.phone)}
                  className="rounded-xl hover:bg-[#133C2A]/10"
                  title="Позвонить"
                >
                  <Phone className="w-4 h-4 text-[#133C2A]" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEmail(parent.email)}
                  className="rounded-xl hover:bg-[#133C2A]/10"
                  title="Написать email"
                >
                  <Mail className="w-4 h-4 text-[#133C2A]" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMessage(parent.phone)}
                  className="rounded-xl hover:bg-[#133C2A]/10"
                  title="Отправить сообщение"
                >
                  <MessageSquare className="w-4 h-4 text-[#133C2A]" />
                </Button>
              </div>
            </div>

            {/* Примечания */}
            {parent.notes && (
              <div className="mt-4 p-3 rounded-2xl bg-[#D4AF37]/5 border border-[#D4AF37]/20">
                <p className="text-xs text-[#133C2A]/70">{parent.notes}</p>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Пустое состояние */}
      {filteredParents.length === 0 && (
        <Card className="p-12 rounded-3xl border-[#133C2A]/10 text-center">
          <Users className="w-16 h-16 text-[#133C2A]/20 mx-auto mb-4" />
          <h3 className="text-[#133C2A] mb-2">Родители не найдены</h3>
          <p className="text-[#133C2A]/60 mb-6">
            {searchQuery 
              ? 'Попробуйте изменить параметры поиска' 
              : 'Начните добавлять родителей в систему'}
          </p>
          {!searchQuery && (
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#1C8C64] text-white hover:opacity-90 gap-2"
            >
              <Plus className="w-4 h-4" />
              Добавить родителя
            </Button>
          )}
        </Card>
      )}

      {/* Диалоги */}
      <AddParentDialog 
        isOpen={isAddDialogOpen} 
        onClose={() => setIsAddDialogOpen(false)} 
      />
      <EditParentDialog 
        isOpen={isEditDialogOpen} 
        onClose={() => setIsEditDialogOpen(false)}
        parent={selectedParent}
      />
    </div>
  );
}
