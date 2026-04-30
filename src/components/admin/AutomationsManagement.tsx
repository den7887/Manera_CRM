import { useState } from 'react';
import { AutomationRule, AutomationTrigger, AutomationActionType, User } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Zap, 
  Power, 
  PowerOff, 
  ArrowRight, 
  Search,
  Target,
  CreditCard,
  Users,
  CheckSquare,
  Clock,
  TrendingUp,
  Layers,
  Mail,
  MessageSquare,
  Send,
  Bell,
  RefreshCw,
  Tag,
  Cake
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface AutomationsManagementProps {
  rules: AutomationRule[];
  onNavigateToCreate: () => void;
  onNavigateToEdit: (rule: AutomationRule) => void;
}

const triggerLabels: Record<AutomationTrigger, string> = {
  'user.created': 'Новый пользователь зарегистрировался',
  'subscription.activated': 'Абонемент активирован после оплаты',
  'subscription.visits_running_low': 'На абонементе заканчиваются занятия',
  'subscription.finished': 'На абонементе закончились все занятия',
  'subscription.expired': 'Срок действия абонемента истек',
  // 🎯 Триггеры для лидов
  'lead.created': 'Новая заявка создана',
  'lead.contact_date_reached': 'Наступила дата следующего контакта',
  'lead.contact_overdue': 'Контакт просрочен',
  'lead.status_changed.scheduled': 'Статус изменен → Записан на пробное',
  'lead.status_changed.visited': 'Статус изменен → Был на пробном',
  'lead.status_changed.thinking': 'Статус изменен → Думает',
  'lead.status_changed.waiting_discount': 'Статус изменен → Ждёт акцию',
  'lead.status_changed.converted': 'Статус изменен → Стал клиентом',
  'lead.status_changed.rejected': 'Статус изменен → Отказ',
  'lead.status_changed.returned': 'Статус изменен → Вернулся',
  // 🎂 Триггеры для дней рождения
  'birthday.student.today': 'День рождения ученика сегодня',
  'birthday.student.upcoming': 'Скоро день рождения ученика',
  'birthday.parent.today': 'День рождения родителя сегодня',
  'birthday.parent.upcoming': 'Скоро день рождения родителя',
};

const actionLabels: Record<AutomationActionType, string> = {
  'create_task': 'Создать задачу',
  'send_email': 'Отправить Email',
  'send_sms': 'Отправить SMS',
  'send_whatsapp': 'Отправить WhatsApp',
  'create_notification': 'Создать уведомление',
  'change_lead_status': 'Изменить статус лида',
  'add_tag': 'Добавить тег',
};

const actionIcons: Record<AutomationActionType, any> = {
  'create_task': CheckSquare,
  'send_email': Mail,
  'send_sms': MessageSquare,
  'send_whatsapp': Send,
  'create_notification': Bell,
  'change_lead_status': RefreshCw,
  'add_tag': Tag,
};

const categoryConfig = {
  leads: {
    label: 'База клиентов',
    icon: Target,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
  },
  subscriptions: {
    label: 'Абонементы',
    icon: CreditCard,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-200',
  },
  users: {
    label: 'Пользователи',
    icon: Users,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
  },
  birthdays: {
    label: 'Дни рождения',
    icon: Cake,
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-600',
    borderColor: 'border-pink-200',
  },
};

const getCategoryForRule = (trigger: AutomationTrigger): keyof typeof categoryConfig => {
  if (trigger.startsWith('lead.')) return 'leads';
  if (trigger.startsWith('subscription.')) return 'subscriptions';
  if (trigger.startsWith('birthday.')) return 'birthdays';
  return 'users';
};

const getPriorityLabel = (params: any) => {
  const priority = params.priority || 'medium';
  const config = {
    urgent: { label: 'Срочная', color: 'bg-red-100 text-red-700 border-red-300' },
    high: { label: 'Высокая', color: 'bg-orange-100 text-orange-700 border-orange-300' },
    medium: { label: 'Средняя', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    low: { label: 'Низкая', color: 'bg-gray-100 text-gray-600 border-gray-300' },
  };
  return config[priority as keyof typeof config] || config.medium;
};

export function AutomationsManagement({ rules, onNavigateToCreate, onNavigateToEdit }: AutomationsManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const handleToggleActive = (rule: AutomationRule) => {
    const action = rule.isActive ? 'деактивировано' : 'активировано';
    toast.success(`Правило "${rule.name}" ${action}`);
  };

  const handleDelete = (rule: AutomationRule) => {
    if (confirm(`Удалить правило "${rule.name}"?`)) {
      toast.success(`Правило "${rule.name}" удалено`);
    }
  };

  // Фильтрация правил
  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         triggerLabels[rule.triggerKey].toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || getCategoryForRule(rule.triggerKey) === filterCategory;
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && rule.isActive) ||
                         (filterStatus === 'inactive' && !rule.isActive);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Группировка по категориям
  const groupedRules = {
    leads: filteredRules.filter(r => getCategoryForRule(r.triggerKey) === 'leads'),
    subscriptions: filteredRules.filter(r => getCategoryForRule(r.triggerKey) === 'subscriptions'),
    users: filteredRules.filter(r => getCategoryForRule(r.triggerKey) === 'users'),
  };

  const activeRules = rules.filter(r => r.isActive);
  const inactiveRules = rules.filter(r => !r.isActive);

  const totalTasks = rules.reduce((sum, rule) => {
    return sum + (rule.actionType === 'create_task' ? 1 : 0);
  }, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[#133C2A] mb-2">⚡ Автоматизации</h1>
          <p className="text-[#133C2A]/60">Умная система автоматического создания задач</p>
        </div>

        <Button 
          onClick={onNavigateToCreate}
          className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 gap-2"
        >
          <Plus className="w-5 h-5" />
          Создать правило
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60">Всего правил</p>
                <p className="text-2xl md:text-3xl text-[#133C2A] mt-1">{rules.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                <Layers className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60">Активные</p>
                <p className="text-2xl md:text-3xl text-[#133C2A] mt-1">{activeRules.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <Power className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60">Неактивные</p>
                <p className="text-2xl md:text-3xl text-[#133C2A] mt-1">{inactiveRules.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <PowerOff className="w-6 h-6 text-gray-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60">Авто-задачи</p>
                <p className="text-2xl md:text-3xl text-[#133C2A] mt-1">{totalTasks}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1C8C64] to-[#133C2A] flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-none soft-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/40" />
              <Input
                placeholder="Поиск по названию или триггеру..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl border-[#133C2A]/10 focus:border-[#D4AF37]"
              />
            </div>

            {/* Category Filter */}
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-48 rounded-xl border-[#133C2A]/10">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                <SelectItem value="leads">🎯 База клиентов</SelectItem>
                <SelectItem value="subscriptions">💳 Абонементы</SelectItem>
                <SelectItem value="users">👥 Пользователи</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-40 rounded-xl border-[#133C2A]/10">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="inactive">Неактивные</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rules List by Category */}
      {rules.length === 0 ? (
        <Card className="border-none soft-shadow">
          <CardContent className="py-12 text-center">
            <Zap className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
            <h3 className="text-[#133C2A] mb-2">Нет правил автоматизации</h3>
            <p className="text-[#133C2A]/60 mb-4">
              Создайте первое правило для автоматизации работы
            </p>
            <Button 
              onClick={onNavigateToCreate}
              className="bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white hover:opacity-90 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать правило
            </Button>
          </CardContent>
        </Card>
      ) : filteredRules.length === 0 ? (
        <Card className="border-none soft-shadow">
          <CardContent className="py-12 text-center">
            <Search className="w-16 h-16 text-[#133C2A]/30 mx-auto mb-4" />
            <h3 className="text-[#133C2A] mb-2">Ничего не найдено</h3>
            <p className="text-[#133C2A]/60">
              Попробуйте изменить параметры фильтрации
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRules).map(([categoryKey, categoryRules]) => {
            if (categoryRules.length === 0) return null;
            
            const category = categoryConfig[categoryKey as keyof typeof categoryConfig];
            const CategoryIcon = category.icon;
            
            return (
              <div key={categoryKey}>
                {/* Category Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                    <CategoryIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl text-[#133C2A]">{category.label}</h2>
                    <p className="text-sm text-[#133C2A]/60">{categoryRules.length} правил</p>
                  </div>
                </div>

                {/* Rules */}
                <div className="space-y-3">
                  {categoryRules.map((rule) => {
                    const priority = getPriorityLabel(rule.actionParams);
                    
                    return (
                      <Card 
                        key={rule.id} 
                        className={`border-none soft-shadow hover:shadow-lg transition-smooth ${
                          !rule.isActive ? 'opacity-60' : ''
                        }`}
                      >
                        <CardContent className="p-4 md:p-6">
                          <div className="flex items-start gap-3 md:gap-4">
                            {/* Status Icon */}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              rule.isActive ? 'bg-green-50' : 'bg-gray-100'
                            }`}>
                              <Zap className={`w-6 h-6 ${rule.isActive ? 'text-green-500' : 'text-gray-400'}`} />
                            </div>

                            {/* Rule Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                                <div className="flex-1">
                                  <div className="flex items-start gap-2 mb-2">
                                    <h3 className="text-[#133C2A]">{rule.name}</h3>
                                    {rule.isActive && (
                                      <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                                        Активно
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {/* Rule Flow */}
                                  <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <Badge variant="outline" className={`${category.bgColor} ${category.textColor} ${category.borderColor} text-xs`}>
                                      {triggerLabels[rule.triggerKey]}
                                    </Badge>
                                    
                                    <ArrowRight className="w-3.5 h-3.5 text-[#133C2A]/40 flex-shrink-0" />
                                    
                                    <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 text-xs">
                                      {actionLabels[rule.actionType]}
                                    </Badge>

                                    {rule.actionType === 'create_task' && (
                                      <>
                                        <ArrowRight className="w-3.5 h-3.5 text-[#133C2A]/40 flex-shrink-0" />
                                        <Badge variant="outline" className={`${priority.color} text-xs`}>
                                          {priority.label}
                                        </Badge>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Active Toggle - Desktop */}
                                <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={rule.isActive}
                                      onChange={() => handleToggleActive(rule)}
                                      className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#D4AF37]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                  </label>
                                </div>
                              </div>

                              {/* Action Details */}
                              {rule.actionType === 'create_task' && (
                                <div className="p-3 rounded-xl bg-[#F8F4E3] text-sm">
                                  <div className="flex items-start gap-2 mb-2">
                                    <CheckSquare className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0" />
                                    <p className="text-[#133C2A]/80 flex-1">
                                      {rule.actionParams.title}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-[#133C2A]/60 ml-6">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      <span>
                                        {rule.actionParams.dueDateOffsetDays === 0 
                                          ? 'Моментально' 
                                          : `Через ${rule.actionParams.dueDateOffsetDays} дн.`}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Metadata */}
                              <div className="flex items-center gap-3 mt-3 text-xs text-[#133C2A]/50">
                                <span>
                                  Создано: {new Date(rule.createdAt).toLocaleDateString('ru-RU')}
                                </span>
                                {rule.updatedAt && rule.updatedAt.getTime() !== rule.createdAt.getTime() && (
                                  <span>
                                    Обновлено: {new Date(rule.updatedAt).toLocaleDateString('ru-RU')}
                                  </span>
                                )}
                              </div>

                              {/* Mobile Toggle */}
                              <div className="flex md:hidden items-center justify-between mt-3 pt-3 border-t border-[#133C2A]/10">
                                <span className="text-sm text-[#133C2A]/70">Статус</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={rule.isActive}
                                    onChange={() => handleToggleActive(rule)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#D4AF37]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                </label>
                              </div>
                            </div>

                            {/* Actions - Desktop */}
                            <div className="hidden md:flex gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onNavigateToEdit(rule)}
                                className="w-9 h-9 p-0 rounded-xl hover:bg-[#D4AF37]/10"
                              >
                                <Edit className="w-4 h-4 text-[#D4AF37]" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(rule)}
                                className="w-9 h-9 p-0 rounded-xl hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>

                          {/* Mobile Actions */}
                          <div className="flex md:hidden gap-2 mt-3 pt-3 border-t border-[#133C2A]/10">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onNavigateToEdit(rule)}
                              className="flex-1 rounded-xl border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Редактировать
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(rule)}
                              className="flex-1 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Удалить
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <Card className="border-none soft-shadow bg-gradient-to-br from-[#133C2A] to-[#1C8C64]">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-white">
              <h3 className="mb-2">Как работают автоматизации?</h3>
              <p className="text-white/80 text-sm mb-3">
                Автоматизации помогают не пропустить важные моменты в работе с клиентами. 
                Когда происходит триггерное событие (новая заявка, смена статуса, дата контакта), 
                система автоматически создаёт задачу для администратора.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-white/20 text-white border-white/30">
                  <Zap className="w-3 h-3 mr-1" />
                  {activeRules.length} активных правил
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30">
                  <CheckSquare className="w-3 h-3 mr-1" />
                  Автоматическое создание задач
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}