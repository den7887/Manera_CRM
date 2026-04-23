import { useState } from 'react';
import { Plus, Search, Calendar, MapPin, Users, Edit2, Trash2, Trophy, Music, GraduationCap, Sparkles, Eye, UserCheck } from 'lucide-react';
import { News } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { EventForm } from './EventForm';
import { EventParticipantsList } from './EventParticipantsList';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface EventsManagementProps {
  events: News[];
  onCreate?: (event: Partial<News>) => void;
  onUpdate?: (id: string, event: Partial<News>) => void;
  onDelete?: (id: string) => void;
}

export function EventsManagement({ events, onCreate, onUpdate, onDelete }: EventsManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<News | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [viewingParticipants, setViewingParticipants] = useState<News | null>(null);

  const eventTypes = {
    competition: { label: 'Конкурс', icon: Trophy, color: '#D4AF37' },
    concert: { label: 'Концерт', icon: Music, color: '#133C2A' },
    masterclass: { label: 'Мастер-класс', icon: GraduationCap, color: '#1C8C64' },
    other: { label: 'Мероприятие', icon: Sparkles, color: '#9333EA' },
  };

  // Фильтруем только мероприятия
  const allEvents = events.filter(e => e.isEvent);

  // Применяем фильтры
  const filteredEvents = allEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || event.eventType === filterType;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'upcoming' && event.eventDate && event.eventDate > new Date()) ||
                         (filterStatus === 'past' && event.eventDate && event.eventDate <= new Date()) ||
                         (filterStatus === 'published' && event.published) ||
                         (filterStatus === 'draft' && !event.published);
    return matchesSearch && matchesType && matchesStatus;
  });

  // Статистика
  const stats = {
    total: allEvents.length,
    upcoming: allEvents.filter(e => e.eventDate && e.eventDate > new Date()).length,
    published: allEvents.filter(e => e.published).length,
    totalParticipants: allEvents.reduce((sum, e) => sum + (e.currentParticipants || 0), 0),
  };

  const handleEdit = (event: News) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingEvent(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEvent(null);
  };

  const handleFormSubmit = (eventData: Partial<News>) => {
    if (editingEvent) {
      onUpdate?.(editingEvent.id, eventData);
    } else {
      onCreate?.(eventData);
    }
    handleFormClose();
  };

  const getEventStatus = (event: News) => {
    if (!event.published) return { label: 'Черновик', color: 'bg-[#133C2A]/20 text-[#133C2A]' };
    if (!event.eventDate) return { label: 'Опубликовано', color: 'bg-[#1C8C64]/20 text-[#1C8C64]' };
    
    const now = new Date();
    if (event.eventDate < now) return { label: 'Завершено', color: 'bg-[#133C2A]/40 text-[#133C2A]' };
    if (event.eventDeadline && event.eventDeadline < now) return { label: 'Регистрация закрыта', color: 'bg-[#D14343]/20 text-[#D14343]' };
    if (event.maxParticipants && event.currentParticipants && event.currentParticipants >= event.maxParticipants) {
      return { label: 'Мест нет', color: 'bg-[#D14343]/20 text-[#D14343]' };
    }
    return { label: 'Открыта регистрация', color: 'bg-[#1C8C64]/20 text-[#1C8C64]' };
  };

  const renderEventCard = (event: News) => {
    const eventTypeInfo = event.eventType ? eventTypes[event.eventType] : eventTypes.other;
    const Icon = eventTypeInfo.icon;
    const status = getEventStatus(event);

    return (
      <Card key={event.id} className="border-none soft-shadow hover-lift overflow-hidden">
        {event.image && (
          <div className="relative">
            <ImageWithFallback
              src={event.image}
              alt={event.title}
              className="w-full h-40 object-cover"
            />
            <div 
              className="absolute top-3 left-3 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs"
              style={{ backgroundColor: `${eventTypeInfo.color}15`, border: `1px solid ${eventTypeInfo.color}30` }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: eventTypeInfo.color }} />
              <span style={{ color: eventTypeInfo.color }}>{eventTypeInfo.label}</span>
            </div>
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-[#133C2A] text-lg">{event.title}</CardTitle>
            <Badge className={`${status.color} border-none text-xs`}>{status.label}</Badge>
          </div>
          
          <div className="space-y-1.5 text-xs text-[#133C2A]/60">
            {event.eventDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{event.eventDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
            {event.eventLocation && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="truncate">{event.eventLocation}</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#133C2A]/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewingParticipants(event)}
              className="flex-1 rounded-xl hover:bg-[#1C8C64]/10 hover:text-[#1C8C64]"
            >
              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
              Участники ({event.eventParticipants?.length || 0})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(event)}
              className="rounded-xl hover:bg-[#133C2A]/5"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete?.(event.id)}
              className="rounded-xl hover:bg-[#D14343]/10 hover:text-[#D14343]"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (showForm) {
    return (
      <EventForm
        event={editingEvent || undefined}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
      />
    );
  }

  if (viewingParticipants) {
    return (
      <EventParticipantsList
        eventTitle={viewingParticipants.title}
        participants={viewingParticipants.eventParticipants || []}
        onClose={() => setViewingParticipants(null)}
        onUpdateParticipant={(participantId, updates) => {
          // Обновляем участника в мероприятии
          if (viewingParticipants.eventParticipants) {
            const updatedParticipants = viewingParticipants.eventParticipants.map(p =>
              p.id === participantId ? { ...p, ...updates } : p
            );
            onUpdate?.(viewingParticipants.id, { eventParticipants: updatedParticipants });
            setViewingParticipants({ ...viewingParticipants, eventParticipants: updatedParticipants });
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Управление мероприятиями</h1>
          <p className="text-[#133C2A]/60">Создание и управление конкурсами, концертами и мастер-классами</p>
        </div>
        <Button
          onClick={handleCreate}
          className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Создать мероприятие
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#133C2A]/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#133C2A]" />
              </div>
              <div>
                <p className="text-xs text-[#133C2A]/60">Всего</p>
                <p className="text-xl text-[#133C2A]">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1C8C64]/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#1C8C64]" />
              </div>
              <div>
                <p className="text-xs text-[#133C2A]/60">Предстоящие</p>
                <p className="text-xl text-[#133C2A]">{stats.upcoming}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-xs text-[#133C2A]/60">Опубликовано</p>
                <p className="text-xl text-[#133C2A]">{stats.published}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#9333EA]/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#9333EA]" />
              </div>
              <div>
                <p className="text-xs text-[#133C2A]/60">Участников</p>
                <p className="text-xl text-[#133C2A]">{stats.totalParticipants}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-none soft-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#133C2A]/40 w-4 h-4" />
              <Input
                placeholder="Поиск мероприятий..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl border-[#133C2A]/10 focus:border-[#D4AF37]"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48 rounded-xl border-[#133C2A]/10">
                <SelectValue placeholder="Тип мероприятия" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="competition">Конкурс</SelectItem>
                <SelectItem value="concert">Концерт</SelectItem>
                <SelectItem value="masterclass">Мастер-класс</SelectItem>
                <SelectItem value="other">Другое</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48 rounded-xl border-[#133C2A]/10">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="upcoming">Предстоящие</SelectItem>
                <SelectItem value="past">Прошедшие</SelectItem>
                <SelectItem value="published">Опубликовано</SelectItem>
                <SelectItem value="draft">Черновики</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events Grid */}
      {filteredEvents.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(renderEventCard)}
        </div>
      ) : (
        <Card className="border-none soft-shadow">
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-[#133C2A]/20 mx-auto mb-4" />
            <h3 className="text-[#133C2A] mb-2">Нет мероприятий</h3>
            <p className="text-[#133C2A]/60 mb-4">
              {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                ? 'Попробуйте изменить фильтры'
                : 'Создайте первое мероприятие для студии'}
            </p>
            <Button
              onClick={handleCreate}
              className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать мероприятие
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}