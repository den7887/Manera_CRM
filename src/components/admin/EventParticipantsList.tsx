import { useState } from 'react';
import { X, Search, Phone, CheckCircle2, Eye, DollarSign, Calendar, User, Users2, Filter, Download } from 'lucide-react';
import { EventParticipant, EventParticipantStatus } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Avatar, AvatarFallback } from '../ui/avatar';

interface EventParticipantsListProps {
  eventTitle: string;
  participants: EventParticipant[];
  onClose: () => void;
  onUpdateParticipant?: (participantId: string, updates: Partial<EventParticipant>) => void;
}

export function EventParticipantsList({ 
  eventTitle, 
  participants, 
  onClose,
  onUpdateParticipant 
}: EventParticipantsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const statusConfig = {
    viewed: { 
      label: 'Просмотрел', 
      icon: Eye, 
      color: '#9333EA',
      bgColor: '#9333EA15'
    },
    interested: { 
      label: 'Откликнулся', 
      icon: CheckCircle2, 
      color: '#1C8C64',
      bgColor: '#1C8C6415'
    },
    paid: { 
      label: 'Оплатил', 
      icon: DollarSign, 
      color: '#D4AF37',
      bgColor: '#D4AF3715'
    }
  };

  // Фильтрация участников
  const filteredParticipants = participants.filter(p => {
    const matchesSearch = 
      p.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.parentPhone.includes(searchQuery) ||
      (p.childName && p.childName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Статистика
  const stats = {
    total: participants.length,
    viewed: participants.filter(p => p.status === 'viewed').length,
    interested: participants.filter(p => p.status === 'interested').length,
    paid: participants.filter(p => p.status === 'paid').length,
    totalAmount: participants
      .filter(p => p.status === 'paid' && p.paidAmount)
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0)
  };

  const handleStatusChange = (participantId: string, newStatus: EventParticipantStatus) => {
    const now = new Date();
    const updates: Partial<EventParticipant> = { status: newStatus };
    
    if (newStatus === 'viewed' && !participants.find(p => p.id === participantId)?.viewedAt) {
      updates.viewedAt = now;
    } else if (newStatus === 'interested' && !participants.find(p => p.id === participantId)?.respondedAt) {
      updates.respondedAt = now;
    } else if (newStatus === 'paid' && !participants.find(p => p.id === participantId)?.paidAt) {
      updates.paidAt = now;
    }
    
    onUpdateParticipant?.(participantId, updates);
  };

  const exportToCSV = () => {
    const headers = ['ФИО родителя', 'Телефон', 'Ребенок', 'Статус', 'Сумма оплаты', 'Дата просмотра', 'Дата отклика', 'Дата оплаты', 'Заметки'];
    const rows = filteredParticipants.map(p => [
      p.parentName,
      p.parentPhone,
      p.childName || '-',
      statusConfig[p.status].label,
      p.paidAmount ? `${p.paidAmount} ₽` : '-',
      p.viewedAt ? new Date(p.viewedAt).toLocaleDateString('ru-RU') : '-',
      p.respondedAt ? new Date(p.respondedAt).toLocaleDateString('ru-RU') : '-',
      p.paidAt ? new Date(p.paidAt).toLocaleDateString('ru-RU') : '-',
      p.notes || '-'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `участники_${eventTitle}_${new Date().toLocaleDateString('ru-RU')}.csv`;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-[#133C2A]/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden border-none soft-shadow flex flex-col">
        <CardHeader className="border-b border-[#133C2A]/10 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-[#133C2A] mb-1">Участники мероприятия</CardTitle>
              <p className="text-[#133C2A]/60 text-sm">{eventTitle}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-xl hover:bg-[#133C2A]/5 -mt-2"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <div className="p-3 rounded-xl bg-[#133C2A]/5">
              <p className="text-xs text-[#133C2A]/60 mb-1">Всего</p>
              <p className="text-2xl text-[#133C2A]">{stats.total}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#9333EA]/10">
              <p className="text-xs text-[#9333EA]/80 mb-1">Просмотрели</p>
              <p className="text-2xl text-[#9333EA]">{stats.viewed}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#1C8C64]/10">
              <p className="text-xs text-[#1C8C64]/80 mb-1">Откликнулись</p>
              <p className="text-2xl text-[#1C8C64]">{stats.interested}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#D4AF37]/10">
              <p className="text-xs text-[#D4AF37]/80 mb-1">Оплатили</p>
              <p className="text-2xl text-[#D4AF37]">{stats.paid}</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#133C2A]/10 to-[#D4AF37]/10">
              <p className="text-xs text-[#133C2A]/60 mb-1">Сумма оплат</p>
              <p className="text-lg text-[#133C2A]">{stats.totalAmount.toLocaleString()} ₽</p>
            </div>
          </div>

          {/* Фильтры */}
          <div className="flex flex-col md:flex-row gap-3 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#133C2A]/40 w-4 h-4" />
              <Input
                placeholder="Поиск по имени, телефону..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl border-[#133C2A]/10 focus:border-[#D4AF37]"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48 rounded-xl border-[#133C2A]/10">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="viewed">Просмотрели</SelectItem>
                <SelectItem value="interested">Откликнулись</SelectItem>
                <SelectItem value="paid">Оплатили</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={exportToCSV}
              className="rounded-xl border-[#133C2A]/10 hover:bg-[#133C2A]/5"
            >
              <Download className="w-4 h-4 mr-2" />
              Экспорт
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredParticipants.length > 0 ? (
            filteredParticipants.map((participant) => {
              const statusInfo = statusConfig[participant.status];
              const StatusIcon = statusInfo.icon;

              return (
                <Card key={participant.id} className="border-none soft-shadow hover-lift">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Аватар и основная информация */}
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="w-12 h-12 border-2 border-[#133C2A]/10">
                          <AvatarFallback className="bg-[#133C2A]/10 text-[#133C2A]">
                            {participant.parentName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-3.5 h-3.5 text-[#133C2A]/60" />
                            <p className="text-[#133C2A] truncate">{participant.parentName}</p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-[#133C2A]/60">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{participant.parentPhone}</span>
                          </div>
                          {participant.childName && (
                            <div className="flex items-center gap-2 text-sm text-[#133C2A]/60 mt-1">
                              <Users2 className="w-3.5 h-3.5" />
                              <span>{participant.childName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Статус */}
                      <div className="flex items-center gap-3">
                        <Select
                          value={participant.status}
                          onValueChange={(value) => handleStatusChange(participant.id, value as EventParticipantStatus)}
                        >
                          <SelectTrigger 
                            className="w-44 rounded-xl border-none"
                            style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
                          >
                            <div className="flex items-center gap-2">
                              <StatusIcon className="w-4 h-4" />
                              <span>{statusInfo.label}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([key, config]) => {
                              const Icon = config.icon;
                              return (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="w-4 h-4" style={{ color: config.color }} />
                                    <span>{config.label}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>

                        {participant.status === 'paid' && participant.paidAmount && (
                          <div 
                            className="px-3 py-2 rounded-xl text-sm"
                            style={{ backgroundColor: '#D4AF3715', color: '#D4AF37' }}
                          >
                            {participant.paidAmount.toLocaleString()} ₽
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Временные метки */}
                    <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[#133C2A]/10 text-xs text-[#133C2A]/60">
                      {participant.viewedAt && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Просмотр: {new Date(participant.viewedAt).toLocaleDateString('ru-RU')}</span>
                        </div>
                      )}
                      {participant.respondedAt && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Отклик: {new Date(participant.respondedAt).toLocaleDateString('ru-RU')}</span>
                        </div>
                      )}
                      {participant.paidAt && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Оплата: {new Date(participant.paidAt).toLocaleDateString('ru-RU')}</span>
                        </div>
                      )}
                    </div>

                    {/* Заметки */}
                    {participant.notes && (
                      <div className="mt-3 p-2.5 rounded-lg bg-[#133C2A]/5">
                        <p className="text-xs text-[#133C2A]/80">{participant.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-[#133C2A]/20 mx-auto mb-4" />
              <h3 className="text-[#133C2A] mb-2">Участников не найдено</h3>
              <p className="text-[#133C2A]/60">
                {searchQuery || filterStatus !== 'all'
                  ? 'Попробуйте изменить фильтры'
                  : 'Пока нет откликов на это мероприятие'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}