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
  MessageCircle,
  Calendar,
  Eye,
  Filter,
  LayoutGrid,
  LayoutList,
  TrendingUp,
  Users,
  AlertCircle,
  Clock
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { AddLeadDialog } from './AddLeadDialog';
import { EditLeadDialog } from './EditLeadDialog';
import { LeadHistoryDialog } from './LeadHistoryDialog';
import { LeadsAutomationsInfo } from './LeadsAutomationsInfo';

// Типы и статусы
const leadStatuses = {
  new: { label: 'Новая заявка', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  contacted: { label: 'Первый контакт', color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50' },
  scheduled: { label: 'Записан на пробное', color: 'bg-indigo-500', textColor: 'text-indigo-700', bgLight: 'bg-indigo-50' },
  visited: { label: 'Был на пробном', color: 'bg-cyan-500', textColor: 'text-cyan-700', bgLight: 'bg-cyan-50' },
  thinking: { label: 'Думает', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  callback: { label: 'Перезвонить позже', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  waiting_discount: { label: 'Ждёт акцию', color: 'bg-pink-500', textColor: 'text-pink-700', bgLight: 'bg-pink-50' },
  converted: { label: 'Стал клиентом', color: 'bg-[#1C8C64]', textColor: 'text-[#1C8C64]', bgLight: 'bg-[#1C8C64]/10' },
  rejected: { label: 'Отказ', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  returned: { label: 'Вернулся', color: 'bg-[#D4AF37]', textColor: 'text-[#D4AF37]', bgLight: 'bg-[#D4AF37]/10' },
};

const sources = ['Сайт', 'Instagram', 'Рекомендация', 'Реклама', 'Прохожие', 'Другое'];

// Мок-данные
const mockLeads = [
  {
    id: '1',
    parentName: 'Соколова Мария Петровна',
    phone: '+7 (999) 111-22-33',
    email: 'sokolova@email.com',
    childName: 'София',
    childAge: 5,
    status: 'callback' as keyof typeof leadStatuses,
    source: 'Instagram',
    nextContactDate: new Date('2024-03-20'),
    nextAction: 'Перезвонить после 15:00',
    createdDate: new Date('2024-03-10'),
    notes: 'Хочет попробовать, но сейчас на каникулах. Просила связаться после 20 марта.',
    tags: ['горячий'],
    history: [
      { date: new Date('2024-03-10'), type: 'call', text: 'Первый звонок. Заинтересована, но сейчас на отдыхе.' }
    ]
  },
  {
    id: '2',
    parentName: 'Белова Анна Ивановна',
    phone: '+7 (999) 222-33-44',
    email: 'belova@email.com',
    childName: 'Алиса',
    childAge: 7,
    status: 'thinking' as keyof typeof leadStatuses,
    source: 'Сайт',
    nextContactDate: new Date('2024-03-18'),
    nextAction: 'Отправить видео с занятий',
    createdDate: new Date('2024-03-12'),
    notes: 'Была на пробном 15.03. Понравилось, но хочет посоветоваться с мужем.',
    tags: ['теплый'],
    history: [
      { date: new Date('2024-03-15'), type: 'visit', text: 'Пробное занятие. Всё понравилось.' },
      { date: new Date('2024-03-12'), type: 'call', text: 'Записалась на пробное.' }
    ]
  },
  {
    id: '3',
    parentName: 'Павлова Екатерина Сергеевна',
    phone: '+7 (999) 333-44-55',
    email: '',
    childName: 'Виктория',
    childAge: 6,
    status: 'new' as keyof typeof leadStatuses,
    source: 'Рекомендация',
    nextContactDate: new Date('2024-03-17'),
    nextAction: 'Первый звонок',
    createdDate: new Date('2024-03-16'),
    notes: 'Заявка с сайта. Пока не связывались.',
    tags: [],
    history: []
  },
  {
    id: '4',
    parentName: 'Григорьева Ольга Дмитриевна',
    phone: '+7 (999) 444-55-66',
    email: 'grigorieva@email.com',
    childName: 'Дарья',
    childAge: 8,
    status: 'scheduled' as keyof typeof leadStatuses,
    source: 'Сайт',
    nextContactDate: new Date('2024-03-22'),
    nextAction: 'Пробное занятие 22.03 в 16:00',
    createdDate: new Date('2024-03-14'),
    notes: 'Записана на пробное 22 марта.',
    tags: ['горячий'],
    history: [
      { date: new Date('2024-03-14'), type: 'call', text: 'Записалась на пробное 22.03 в 16:00' }
    ]
  },
  {
    id: '5',
    parentName: 'Федорова Татьяна Александровна',
    phone: '+7 (999) 555-66-77',
    email: 'fedorova@email.com',
    childName: 'Анна',
    childAge: 9,
    status: 'rejected' as keyof typeof leadStatuses,
    source: 'Реклама',
    nextContactDate: null,
    nextAction: '',
    createdDate: new Date('2024-02-20'),
    notes: 'Не подошло по расписанию. Возможно, вернется в сентябре.',
    tags: ['холодный'],
    history: [
      { date: new Date('2024-02-25'), type: 'call', text: 'Отказ. Не подходит расписание.' },
      { date: new Date('2024-02-20'), type: 'call', text: 'Первый контакт.' }
    ]
  },
  {
    id: '6',
    parentName: 'Захарова Наталья Олеговна',
    phone: '+7 (999) 666-77-88',
    email: 'zakharova@email.com',
    childName: 'Мария',
    childAge: 6,
    status: 'converted' as keyof typeof leadStatuses,
    source: 'Рекомендация',
    nextContactDate: null,
    nextAction: '',
    createdDate: new Date('2024-03-01'),
    notes: 'Стала клиентом. Купила абонемент на 8 занятий.',
    tags: ['VIP'],
    history: [
      { date: new Date('2024-03-10'), type: 'purchase', text: 'Купила абонемент на 8 занятий.' },
      { date: new Date('2024-03-05'), type: 'visit', text: 'Пробное занятие.' },
      { date: new Date('2024-03-01'), type: 'call', text: 'Первый контакт. Записалась на пробное.' }
    ]
  },
  {
    id: '7',
    parentName: 'Романова Светлана Викторовна',
    phone: '+7 (999) 777-88-99',
    email: 'romanova@email.com',
    childName: 'Полина',
    childAge: 7,
    status: 'waiting_discount' as keyof typeof leadStatuses,
    source: 'Instagram',
    nextContactDate: new Date('2024-03-25'),
    nextAction: 'Сообщить о мартовской акции',
    createdDate: new Date('2024-03-08'),
    notes: 'Ждёт акцию на абонементы. Сказала, что купит при скидке 15%.',
    tags: ['теплый'],
    history: [
      { date: new Date('2024-03-08'), type: 'call', text: 'Интересуется скидками и акциями.' }
    ]
  },
  {
    id: '8',
    parentName: 'Лебедева Ирина Павловна',
    phone: '+7 (999) 888-99-00',
    email: '',
    childName: 'Кристина',
    childAge: 5,
    status: 'contacted' as keyof typeof leadStatuses,
    source: 'Прохожие',
    nextContactDate: new Date('2024-03-19'),
    nextAction: 'Отправить информацию о группах',
    createdDate: new Date('2024-03-16'),
    notes: 'Зашла в студию. Интересуется младшей группой.',
    tags: [],
    history: [
      { date: new Date('2024-03-16'), type: 'meeting', text: 'Личная встреча в студии.' }
    ]
  },
];

export function AdminLeads() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<typeof mockLeads[0] | null>(null);

  // Фильтрация
  const filteredLeads = mockLeads.filter(lead => {
    const matchesSearch = 
      lead.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      lead.childName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesSource;
  });

  // Статистика
  const totalLeads = mockLeads.length;
  const activeLeads = mockLeads.filter(l => !['converted', 'rejected'].includes(l.status)).length;
  const todayContacts = mockLeads.filter(l => {
    if (!l.nextContactDate) return false;
    const today = new Date();
    return l.nextContactDate.toDateString() === today.toDateString();
  }).length;
  const overdueContacts = mockLeads.filter(l => {
    if (!l.nextContactDate) return false;
    return l.nextContactDate < new Date();
  }).length;
  const conversionRate = Math.round((mockLeads.filter(l => l.status === 'converted').length / totalLeads) * 100);

  // Обработчики
  const handleEdit = (lead: typeof mockLeads[0]) => {
    setSelectedLead(lead);
    setIsEditDialogOpen(true);
  };

  const handleViewHistory = (lead: typeof mockLeads[0]) => {
    setSelectedLead(lead);
    setIsHistoryDialogOpen(true);
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[#133C2A] mb-2">База клиентов</h1>
          <p className="text-[#133C2A]/60">
            Управление всеми контактами и потенциальными клиентами
          </p>
        </div>
        <Button 
          onClick={() => setIsAddDialogOpen(true)}
          className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#1C8C64] text-white hover:opacity-90 gap-2"
        >
          <Plus className="w-4 h-4" />
          Добавить клиента
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 rounded-2xl border-[#133C2A]/10 bg-gradient-to-br from-white to-[#F8F4E3]/30">
          <p className="text-xs text-[#133C2A]/60 mb-1">Всего клиентов</p>
          <p className="text-2xl text-[#133C2A]">{totalLeads}</p>
        </Card>

        <Card className="p-4 rounded-2xl border-[#133C2A]/10 bg-gradient-to-br from-white to-blue-50">
          <p className="text-xs text-[#133C2A]/60 mb-1">В работе</p>
          <p className="text-2xl text-blue-600">{activeLeads}</p>
        </Card>

        <Card className="p-4 rounded-2xl border-[#133C2A]/10 bg-gradient-to-br from-white to-orange-50">
          <p className="text-xs text-[#133C2A]/60 mb-1">Связаться сегодня</p>
          <p className="text-2xl text-orange-600">{todayContacts}</p>
        </Card>

        <Card className="p-4 rounded-2xl border-[#133C2A]/10 bg-gradient-to-br from-white to-red-50">
          <p className="text-xs text-[#133C2A]/60 mb-1">Просрочено</p>
          <p className="text-2xl text-red-600">{overdueContacts}</p>
        </Card>

        <Card className="p-4 rounded-2xl border-[#133C2A]/10 bg-gradient-to-br from-white to-[#1C8C64]/10">
          <p className="text-xs text-[#133C2A]/60 mb-1">Конверсия</p>
          <p className="text-2xl text-[#1C8C64]">{conversionRate}%</p>
        </Card>
      </div>

      {/* Фильтры и поиск */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#133C2A]/40" />
          <Input
            type="text"
            placeholder="Поиск по имени, телефону, ребёнку..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[200px] rounded-xl border-[#133C2A]/20">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(leadStatuses).map(([key, status]) => (
              <SelectItem key={key} value={key}>{status.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-full md:w-[200px] rounded-xl border-[#133C2A]/20">
            <SelectValue placeholder="Все источники" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все источники</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source} value={source}>{source}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="rounded-xl"
          >
            <LayoutList className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="rounded-xl"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Табличный вид */}
      {viewMode === 'table' && (
        <Card className="rounded-2xl border-[#133C2A]/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F8F4E3]/50 border-b border-[#133C2A]/10">
                <tr>
                  <th className="text-left p-3 text-xs text-[#133C2A]/70">Родитель / Ребёнок</th>
                  <th className="text-left p-3 text-xs text-[#133C2A]/70">Контакты</th>
                  <th className="text-left p-3 text-xs text-[#133C2A]/70">Статус</th>
                  <th className="text-left p-3 text-xs text-[#133C2A]/70">Следующий контакт</th>
                  <th className="text-left p-3 text-xs text-[#133C2A]/70">Источник</th>
                  <th className="text-right p-3 text-xs text-[#133C2A]/70">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const status = leadStatuses[lead.status];
                  const isOverdue = lead.nextContactDate && lead.nextContactDate < new Date();
                  const isToday = lead.nextContactDate && lead.nextContactDate.toDateString() === new Date().toDateString();

                  return (
                    <tr key={lead.id} className="border-b border-[#133C2A]/5 hover:bg-[#F8F4E3]/30 transition-colors">
                      <td className="p-3">
                        <div>
                          <p className="text-sm text-[#133C2A]">{lead.parentName}</p>
                          <p className="text-xs text-[#133C2A]/60">{lead.childName}, {lead.childAge} лет</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <p className="text-xs text-[#133C2A]">{lead.phone}</p>
                          {lead.email && <p className="text-xs text-[#133C2A]/60">{lead.email}</p>}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={`${status.color} text-white rounded-lg text-xs`}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {lead.nextContactDate ? (
                          <div>
                            <p className={`text-xs ${isOverdue ? 'text-red-600' : isToday ? 'text-orange-600' : 'text-[#133C2A]'}`}>
                              {lead.nextContactDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            </p>
                            <p className="text-xs text-[#133C2A]/60 truncate max-w-[200px]">{lead.nextAction}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-[#133C2A]/40">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-[#133C2A]/60">{lead.source}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCall(lead.phone)}
                            className="h-8 w-8 p-0 rounded-lg hover:bg-[#133C2A]/10"
                            title="Позвонить"
                          >
                            <Phone className="w-3.5 h-3.5 text-[#133C2A]" />
                          </Button>
                          {lead.email && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEmail(lead.email)}
                              className="h-8 w-8 p-0 rounded-lg hover:bg-[#133C2A]/10"
                              title="Email"
                            >
                              <Mail className="w-3.5 h-3.5 text-[#133C2A]" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleWhatsApp(lead.phone)}
                            className="h-8 w-8 p-0 rounded-lg hover:bg-[#133C2A]/10"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-[#133C2A]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewHistory(lead)}
                            className="h-8 w-8 p-0 rounded-lg hover:bg-[#133C2A]/10"
                            title="История"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#133C2A]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(lead)}
                            className="h-8 w-8 p-0 rounded-lg hover:bg-[#D4AF37]/10"
                            title="Редактировать"
                          >
                            <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredLeads.length === 0 && (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-[#133C2A]/20 mx-auto mb-3" />
              <p className="text-[#133C2A]/60">Клиенты не найдены</p>
            </div>
          )}
        </Card>
      )}

      {/* Карточный вид */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => {
            const status = leadStatuses[lead.status];
            const isOverdue = lead.nextContactDate && lead.nextContactDate < new Date();
            const isToday = lead.nextContactDate && lead.nextContactDate.toDateString() === new Date().toDateString();

            return (
              <Card key={lead.id} className="p-4 rounded-2xl border-[#133C2A]/10 hover:border-[#D4AF37]/30 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-sm text-[#133C2A] mb-1">{lead.parentName}</h3>
                    <p className="text-xs text-[#133C2A]/60">{lead.childName}, {lead.childAge} лет</p>
                  </div>
                  <Badge className={`${status.color} text-white rounded-lg text-xs`}>
                    {status.label}
                  </Badge>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-xs text-[#133C2A]">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{lead.phone}</span>
                  </div>
                  {lead.email && (
                    <div className="flex items-center gap-2 text-xs text-[#133C2A]/70">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                </div>

                {lead.nextContactDate && (
                  <div className={`p-2 rounded-xl mb-3 ${isOverdue ? 'bg-red-50' : isToday ? 'bg-orange-50' : 'bg-[#F8F4E3]/50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-600' : isToday ? 'text-orange-600' : 'text-[#133C2A]/60'}`} />
                      <p className={`text-xs ${isOverdue ? 'text-red-600' : isToday ? 'text-orange-600' : 'text-[#133C2A]'}`}>
                        {lead.nextContactDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                    <p className="text-xs text-[#133C2A]/60 pl-5">{lead.nextAction}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-[#133C2A]/10">
                  <span className="text-xs text-[#133C2A]/60">{lead.source}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCall(lead.phone)}
                      className="h-7 w-7 p-0 rounded-lg"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewHistory(lead)}
                      className="h-7 w-7 p-0 rounded-lg"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(lead)}
                      className="h-7 w-7 p-0 rounded-lg"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Диалоги */}
      <AddLeadDialog 
        isOpen={isAddDialogOpen} 
        onClose={() => setIsAddDialogOpen(false)} 
      />
      <EditLeadDialog 
        isOpen={isEditDialogOpen} 
        onClose={() => setIsEditDialogOpen(false)}
        lead={selectedLead}
      />
      <LeadHistoryDialog
        isOpen={isHistoryDialogOpen}
        onClose={() => setIsHistoryDialogOpen(false)}
        lead={selectedLead}
      />
      
      {/* Информация об автоматизациях */}
      <LeadsAutomationsInfo />
    </div>
  );
}