import { useState, useMemo } from 'react';
import { AutomationRule, AutomationTrigger, AutomationActionType, User } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  ChevronDown, 
  ArrowLeft, 
  Plus, 
  Zap,
  Target,
  CreditCard,
  Users,
  CheckSquare,
  ArrowRight,
  Clock,
  AlertCircle,
  Sparkles,
  Info,
  Mail,
  MessageSquare,
  Send,
  Bell,
  RefreshCw,
  Tag,
  Cake
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface AutomationRuleFormProps {
  rule?: AutomationRule;
  employees: User[];
  onBack: () => void;
}

// Категории триггеров
const triggerCategories = {
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

type TriggerCategory = keyof typeof triggerCategories;

interface TriggerOption {
  value: AutomationTrigger;
  label: string;
  description: string;
  category: TriggerCategory;
  example: string;
}

const triggerOptions: TriggerOption[] = [
  // Лиды
  {
    value: 'lead.created',
    label: 'Новая заявка создана',
    description: 'Когда родитель оставляет заявку на пробное занятие',
    category: 'leads',
    example: 'Позвонить клиенту в течение 15 минут после заявки'
  },
  {
    value: 'lead.contact_date_reached',
    label: 'Наступила дата контакта',
    description: 'Когда подошла запланированная дата связи с родителем',
    category: 'leads',
    example: 'Напомнить менеджеру позвонить клиенту'
  },
  {
    value: 'lead.contact_overdue',
    label: 'Контакт просрочен',
    description: 'Когда дата контакта прошла, но связи не было',
    category: 'leads',
    example: 'Срочно связаться с клиентом'
  },
  {
    value: 'lead.status_changed.scheduled',
    label: 'Записан на пробное',
    description: 'Когда клиент записался на пробное занятие',
    category: 'leads',
    example: 'Напомнить о пробном за день'
  },
  {
    value: 'lead.status_changed.visited',
    label: 'Был на пробном',
    description: 'Когда клиент посетил пробное занятие',
    category: 'leads',
    example: 'Получить обратную связь через час после занятия'
  },
  {
    value: 'lead.status_changed.thinking',
    label: 'Думает',
    description: 'Когда клиент находится в раздумьях',
    category: 'leads',
    example: 'Связаться через 3 дня и предложить скидку'
  },
  {
    value: 'lead.status_changed.waiting_discount',
    label: 'Ждёт акцию',
    description: 'Когда клиент ожидает специального предложения',
    category: 'leads',
    example: 'Уведомить о начале акции'
  },
  {
    value: 'lead.status_changed.converted',
    label: 'Стал клиентом',
    description: 'Когда лид успешно преобразован в клиента',
    category: 'leads',
    example: 'Поздравить и отправить приветственное письмо'
  },
  {
    value: 'lead.status_changed.rejected',
    label: 'Отказ',
    description: 'Когда клиент отказался от услуг',
    category: 'leads',
    example: 'Попросить обратную связь о причинах отказа'
  },
  {
    value: 'lead.status_changed.returned',
    label: 'Вернулся',
    description: 'Когда клиент вернулся после отказа',
    category: 'leads',
    example: 'Приоритетно обработать возвращение'
  },
  // Абонементы
  {
    value: 'subscription.activated',
    label: 'Абонемент активирован',
    description: 'Когда клиент оплатил и активировал абонемент',
    category: 'subscriptions',
    example: 'Поблагодарить за покупку'
  },
  {
    value: 'subscription.visits_running_low',
    label: 'Занятия заканчиваются',
    description: 'Когда осталось мало занятий по абонементу',
    category: 'subscriptions',
    example: 'Предложить продление за 3 дня до конца'
  },
  {
    value: 'subscription.finished',
    label: 'Занятия закончились',
    description: 'Когда использованы все занятия абонемента',
    category: 'subscriptions',
    example: 'Предложить новый абонемент'
  },
  {
    value: 'subscription.expired',
    label: 'Срок истёк',
    description: 'Когда истекает срок действия абонемента',
    category: 'subscriptions',
    example: 'Уточнить планы на продолжение'
  },
  // Пользователи
  {
    value: 'user.created',
    label: 'Новый пользователь',
    description: 'Когда регистрируется новый клиент в системе',
    category: 'users',
    example: 'Отправить приветственное сообщение'
  },
  // Дни рождения
  {
    value: 'birthday.student.today',
    label: 'День рождения ученика сегодня',
    description: 'Когда у ученика день рождения',
    category: 'birthdays',
    example: 'Поздравить ученика и родителей с днём рождения'
  },
  {
    value: 'birthday.student.upcoming',
    label: 'Скоро день рождения ученика',
    description: 'За N дней до дня рождения ученика',
    category: 'birthdays',
    example: 'Подготовить подарок и поздравление заранее'
  },
  {
    value: 'birthday.parent.today',
    label: 'День рождения родителя сегодня',
    description: 'Когда у родителя день рождения',
    category: 'birthdays',
    example: 'Поздравить родителя с днём рождения'
  },
  {
    value: 'birthday.parent.upcoming',
    label: 'Скоро день рождения родителя',
    description: 'За N дней до дня рождения родителя',
    category: 'birthdays',
    example: 'Подготовиться к поздравлению родителя'
  },
];

interface ActionOption {
  value: AutomationActionType;
  label: string;
  description: string;
  icon: any;
  color: string;
  recommended: TriggerCategory[];
}

const actionOptions: ActionOption[] = [
  {
    value: 'create_task',
    label: 'Создать задачу',
    description: 'Автоматически создать задачу для сотрудника',
    icon: CheckSquare,
    color: 'from-blue-500 to-blue-600',
    recommended: ['leads', 'subscriptions', 'users', 'birthdays']
  },
  {
    value: 'send_email',
    label: 'Отправить Email',
    description: 'Отправить письмо клиенту или сотруднику',
    icon: Mail,
    color: 'from-purple-500 to-purple-600',
    recommended: ['leads', 'subscriptions', 'users', 'birthdays']
  },
  {
    value: 'send_sms',
    label: 'Отправить SMS',
    description: 'Отправить SMS-сообщение клиенту',
    icon: MessageSquare,
    color: 'from-green-500 to-green-600',
    recommended: ['leads', 'subscriptions', 'birthdays']
  },
  {
    value: 'send_whatsapp',
    label: 'Отправить WhatsApp',
    description: 'Отправить сообщение в WhatsApp',
    icon: Send,
    color: 'from-emerald-500 to-emerald-600',
    recommended: ['leads', 'subscriptions', 'birthdays']
  },
  {
    value: 'create_notification',
    label: 'Создать уведомление',
    description: 'Показать уведомление в системе',
    icon: Bell,
    color: 'from-orange-500 to-orange-600',
    recommended: ['leads', 'subscriptions', 'users', 'birthdays']
  },
  {
    value: 'change_lead_status',
    label: 'Изменить статус лида',
    description: 'Автоматически переместить лид в другой статус',
    icon: RefreshCw,
    color: 'from-indigo-500 to-indigo-600',
    recommended: ['leads']
  },
  {
    value: 'add_tag',
    label: 'Добавить тег',
    description: 'Автоматически пометить тегом для сегментации',
    icon: Tag,
    color: 'from-pink-500 to-pink-600',
    recommended: ['leads', 'users']
  },
];

// Плейсхолдеры для разных триггеров
const placeholders: Record<AutomationTrigger, { value: string; label: string; description: string }[]> = {
  'user.created': [
    { value: '{user.name}', label: 'Имя пользователя', description: 'ФИО клиента' },
    { value: '{user.phone}', label: 'Телефон', description: 'Номер телефона' },
    { value: '{user.email}', label: 'Email', description: 'Электронная почта' },
  ],
  'subscription.activated': [
    { value: '{user.name}', label: 'Имя клиента', description: 'ФИО клиента' },
    { value: '{product.name}', label: 'Абонемент', description: 'Название тарифа' },
    { value: '{child.first_name}', label: 'Имя ребенка', description: 'Имя ученика' },
  ],
  'subscription.visits_running_low': [
    { value: '{user.name}', label: 'Имя клиента', description: 'ФИО клиента' },
    { value: '{child.first_name}', label: 'Имя ребенка', description: 'Имя ученика' },
    { value: '{visits_left}', label: 'Осталось', description: 'Количество занятий' },
  ],
  'subscription.finished': [
    { value: '{user.name}', label: 'Имя клиента', description: 'ФИО клиента' },
    { value: '{child.first_name}', label: 'Имя ребенка', description: 'Имя ученика' },
    { value: '{product.name}', label: 'Абонемент', description: 'Название тарифа' },
  ],
  'subscription.expired': [
    { value: '{user.name}', label: 'Имя клиента', description: 'ФИО клиента' },
    { value: '{child.first_name}', label: 'Имя ребенка', description: 'Имя ученика' },
    { value: '{product.name}', label: 'Абонемент', description: 'Название тарифа' },
  ],
  'lead.created': [
    { value: '{lead.parent_name}', label: 'Имя родителя', description: 'ФИО родителя' },
    { value: '{lead.child_name}', label: 'Имя ребенка', description: 'Имя ребенка' },
    { value: '{lead.child_age}', label: 'Возраст', description: 'Возраст ребенка' },
    { value: '{lead.source}', label: 'Источник', description: 'Откуда узнали' },
    { value: '{lead.phone}', label: 'Телефон', description: 'Номер телефона' },
  ],
  'lead.contact_date_reached': [
    { value: '{lead.parent_name}', label: 'Имя родителя', description: 'ФИО родителя' },
    { value: '{lead.status}', label: 'Статус', description: 'Текущий статус' },
    { value: '{lead.next_action}', label: 'Действие', description: 'Что запланировано' },
    { value: '{lead.phone}', label: 'Телефон', description: 'Номер телефона' },
  ],
  'lead.contact_overdue': [
    { value: '{lead.parent_name}', label: 'Имя родителя', description: 'ФИО родителя' },
    { value: '{lead.status}', label: 'Статус', description: 'Текущий статус' },
    { value: '{lead.next_action}', label: 'Действие', description: 'Что было запланировано' },
    { value: '{lead.phone}', label: 'Телефон', description: 'Номер телефона' },
  ],
  'lead.status_changed.scheduled': [
    { value: '{lead.parent_name}', label: 'Имя родителя', description: 'ФИО родителя' },
    { value: '{lead.child_name}', label: 'Имя ребенка', description: 'Имя ребенка' },
    { value: '{lead.phone}', label: 'Телефон', description: 'Номер телефона' },
  ],
  'lead.status_changed.visited': [
    { value: '{lead.parent_name}', label: 'Имя родителя', description: 'ФИО родителя' },
    { value: '{lead.child_name}', label: 'Имя ребенка', description: 'Имя ребенка' },
    { value: '{lead.phone}', label: 'Телефон', description: 'Номер телефона' },
  ],
  'lead.status_changed.thinking': [
    { value: '{lead.parent_name}', label: 'Имя родителя', description: 'ФИО родителя' },
    { value: '{lead.child_name}', label: 'Имя ребенка', description: 'Имя ребенка' },
    { value: '{lead.phone}', label: 'Телефон', description: 'Номер телефона' },
  ],
  'lead.status_changed.waiting_discount': [
    { value: '{lead.parent_name}', label: 'Имя родителя', description: 'ФИО родителя' },
    { value: '{lead.child_name}', label: 'Имя ребенка', description: 'Имя ребенка' },
    { value: '{lead.phone}', label: 'Телефон', description: 'Номер телефона' },
  ],
  'lead.status_changed.converted': [
    { value: '{lead.parent_name}', label: 'Имя родителя', description: 'ФИО родителя' },
    { value: '{lead.child_name}', label: 'Имя ребенка', description: 'Имя ребенка' },
    { value: '{lead.phone}', label: 'Телефон', description: 'Номер телефона' },
  ],
  'lead.status_changed.rejected': [
    { value: '{lead.parent_name}', label: 'Имя родителя', description: 'ФИО родителя' },
    { value: '{lead.notes}', label: 'Причина', description: 'Причина отказа' },
    { value: '{lead.phone}', label: 'Телефон', description: 'Номер телефона' },
  ],
  'lead.status_changed.returned': [
    { value: '{lead.parent_name}', label: 'Имя родителя', description: 'ФИО родителя' },
    { value: '{lead.child_name}', label: 'Имя ребенка', description: 'Имя ребенка' },
    { value: '{lead.phone}', label: 'Телефон', description: 'Номер телефона' },
  ],
  'birthday.student.today': [
    { value: '{student.name}', label: 'Имя ученика', description: 'Полное имя ребенка' },
    { value: '{student.first_name}', label: 'Имя', description: 'Только имя' },
    { value: '{student.age}', label: 'Возраст', description: 'Сколько лет исполняется' },
    { value: '{parent.name}', label: 'Имя родителя', description: 'ФИО родителя' },
    { value: '{parent.phone}', label: 'Телефон родителя', description: 'Номер телефона' },
  ],
  'birthday.student.upcoming': [
    { value: '{student.name}', label: 'Имя ученика', description: 'Полное имя ребенка' },
    { value: '{student.first_name}', label: 'Имя', description: 'Только имя' },
    { value: '{student.age}', label: 'Возраст', description: 'Сколько лет исполнится' },
    { value: '{parent.name}', label: 'Имя родителя', description: 'ФИО родителя' },
    { value: '{parent.phone}', label: 'Телефон родителя', description: 'Номер телефона' },
    { value: '{days_until}', label: 'Дней до ДР', description: 'Сколько дней осталось' },
  ],
  'birthday.parent.today': [
    { value: '{parent.name}', label: 'Имя родителя', description: 'ФИО родителя' },
    { value: '{parent.first_name}', label: 'Имя', description: 'Только имя' },
    { value: '{parent.phone}', label: 'Телефон', description: 'Номер телефона' },
    { value: '{children.names}', label: 'Имена детей', description: 'Список имен детей через запятую' },
  ],
  'birthday.parent.upcoming': [
    { value: '{parent.name}', label: 'Имя родителя', description: 'ФИО родителя' },
    { value: '{parent.first_name}', label: 'Имя', description: 'Только имя' },
    { value: '{parent.phone}', label: 'Телефон', description: 'Номер телефона' },
    { value: '{children.names}', label: 'Имена детей', description: 'Список имен детей через запятую' },
    { value: '{days_until}', label: 'Дней до ДР', description: 'Сколько дней осталось' },
  ],
};

const priorityConfig = {
  urgent: { label: 'Срочная', color: 'bg-red-100 text-red-700 border-red-300', icon: '🔴' },
  high: { label: 'Высокая', color: 'bg-orange-100 text-orange-700 border-orange-300', icon: '🟠' },
  medium: { label: 'Средняя', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: '🔵' },
  low: { label: 'Низкая', color: 'bg-gray-100 text-gray-600 border-gray-300', icon: '⚪' },
};

const notificationTypes = {
  info: { label: 'Информация', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: '💡' },
  warning: { label: 'Предупреждение', color: 'bg-orange-100 text-orange-700 border-orange-300', icon: '⚠️' },
  success: { label: 'Успех', color: 'bg-green-100 text-green-700 border-green-300', icon: '✅' },
  error: { label: 'Ошибка', color: 'bg-red-100 text-red-700 border-red-300', icon: '❌' },
};

const leadStatuses = [
  { value: 'new', label: '🆕 Новая заявка' },
  { value: 'contacted', label: '📞 Первый контакт' },
  { value: 'scheduled', label: '📅 Записан на пробное' },
  { value: 'visited', label: '✅ Был на пробном' },
  { value: 'thinking', label: '🤔 Думает' },
  { value: 'callback', label: '📱 Перезвонить позже' },
  { value: 'waiting_discount', label: '💰 Ждёт акцию' },
  { value: 'converted', label: '🎉 Стал клиентом' },
  { value: 'rejected', label: '❌ Отказ' },
  { value: 'returned', label: '🔄 Вернулся' },
];

export function AutomationRuleForm({ rule, employees, onBack }: AutomationRuleFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Определяем начальные параметры в зависимости от типа действия
  const getInitialActionParams = () => {
    if (rule) return rule.actionParams;
    
    return {
      // create_task
      title: '',
      description: '',
      dueDateOffsetDays: 0,
      assigneeId: '',
      priority: 'medium',
      // send_email/sms/whatsapp
      to: 'lead',
      customEmail: '',
      customPhone: '',
      subject: '',
      body: '',
      message: '',
      templateId: '',
      // create_notification
      recipientId: '',
      type: 'info',
      // change_lead_status
      newStatus: 'contacted',
      addNote: '',
      // add_tag
      tags: [],
      createIfNotExists: true,
    } as any;
  };

  const [formData, setFormData] = useState({
    name: rule?.name || '',
    triggerKey: rule?.triggerKey || ('' as AutomationTrigger),
    actionType: rule?.actionType || ('create_task' as AutomationActionType),
    actionParams: getInitialActionParams(),
    isActive: rule?.isActive ?? true,
  });

  const [selectedCategory, setSelectedCategory] = useState<TriggerCategory | null>(null);
  const [titleCursorPos, setTitleCursorPos] = useState<number>(0);
  const [descCursorPos, setDescCursorPos] = useState<number>(0);
  const [newTag, setNewTag] = useState('');

  // Фильтрация триггеров по категории
  const filteredTriggers = useMemo(() => {
    if (!selectedCategory) return [];
    return triggerOptions.filter(t => t.category === selectedCategory);
  }, [selectedCategory]);

  const selectedTrigger = useMemo(() => 
    triggerOptions.find(t => t.value === formData.triggerKey),
    [formData.triggerKey]
  );

  const selectedAction = useMemo(() =>
    actionOptions.find(a => a.value === formData.actionType),
    [formData.actionType]
  );

  const availablePlaceholders = useMemo(() => 
    formData.triggerKey ? placeholders[formData.triggerKey] : [],
    [formData.triggerKey]
  );

  // Рекомендованные действия для выбранного триггера
  const recommendedActions = useMemo(() => {
    if (!selectedTrigger) return actionOptions;
    return actionOptions.filter(a => a.recommended.includes(selectedTrigger.category));
  }, [selectedTrigger]);

  const insertPlaceholder = (placeholder: string, field: string) => {
    const currentValue = (formData.actionParams as any)[field] || '';
    const cursorPos = field === 'title' || field === 'subject' ? titleCursorPos : descCursorPos;
    
    const before = currentValue.substring(0, cursorPos);
    const after = currentValue.substring(cursorPos);
    
    setFormData({
      ...formData,
      actionParams: {
        ...formData.actionParams,
        [field]: before + placeholder + after,
      } as any,
    });
    
    if (field === 'title' || field === 'subject') {
      setTitleCursorPos(cursorPos + placeholder.length);
    } else {
      setDescCursorPos(cursorPos + placeholder.length);
    }
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Введите название правила');
      return;
    }
    if (!formData.triggerKey) {
      toast.error('Выберите триггер');
      return;
    }

    // Валидация в зависимости от типа действия
    const params = formData.actionParams as any;
    
    switch (formData.actionType) {
      case 'create_task':
        if (!params.title?.trim()) {
          toast.error('Введите заголовок задачи');
          return;
        }
        if (!params.assigneeId) {
          toast.error('Выберите исполнителя');
          return;
        }
        break;
      
      case 'send_email':
        if (!params.subject?.trim()) {
          toast.error('Введите тему письма');
          return;
        }
        if (!params.body?.trim()) {
          toast.error('Введите текст письма');
          return;
        }
        if (params.to === 'custom' && !params.customEmail) {
          toast.error('Введите email получателя');
          return;
        }
        break;
      
      case 'send_sms':
      case 'send_whatsapp':
        if (!params.message?.trim()) {
          toast.error('Введите текст сообщения');
          return;
        }
        if (params.to === 'custom' && !params.customPhone) {
          toast.error('Введите номер телефона');
          return;
        }
        break;
      
      case 'create_notification':
        if (!params.title?.trim()) {
          toast.error('Введите заголовок уведомления');
          return;
        }
        if (!params.message?.trim()) {
          toast.error('Введите текст уведомления');
          return;
        }
        if (!params.recipientId) {
          toast.error('Выберите получателя');
          return;
        }
        break;
      
      case 'add_tag':
        if (!params.tags || params.tags.length === 0) {
          toast.error('Добавьте хотя бы один тег');
          return;
        }
        break;
    }

    const action = rule ? 'обновлено' : 'создано';
    toast.success(`Правило "${formData.name}" ${action}!`);
    onBack();
  };

  const steps = [
    { number: 1, label: 'Триггер', icon: Zap },
    { number: 2, label: 'Действие', icon: CheckSquare },
    { number: 3, label: 'Настройки', icon: Sparkles },
  ];

  const canProceedToStep2 = formData.triggerKey !== '';
  const canProceedToStep3 = canProceedToStep2 && formData.actionType !== '';

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-scale-in pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="w-10 h-10 p-0 rounded-xl hover:bg-[#133C2A]/5"
        >
          <ArrowLeft className="w-5 h-5 text-[#133C2A]" />
        </Button>
        <div className="flex-1">
          <h1 className="text-[#133C2A]">
            {rule ? 'Редактировать автоматизацию' : 'Создать автоматизацию'}
          </h1>
          <p className="text-[#133C2A]/60">
            Настройте умное правило для автоматизации работы
          </p>
        </div>
      </div>

      {/* Steps Progress */}
      <Card className="border-none soft-shadow overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-[#133C2A]/10">
              <div 
                className="h-full bg-gradient-to-r from-[#133C2A] to-[#D4AF37] transition-all duration-500"
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>

            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex flex-col items-center gap-2 relative z-10 flex-1">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isActive 
                        ? 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white scale-110' 
                        : isCompleted 
                        ? 'bg-[#1C8C64] text-white'
                        : 'bg-white border-2 border-[#133C2A]/20 text-[#133C2A]/40'
                    }`}
                  >
                    <StepIcon className="w-5 h-5" />
                  </div>
                  <span className={`text-sm ${
                    isActive ? 'text-[#133C2A]' : 'text-[#133C2A]/60'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Trigger Selection */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-scale-in">
          {/* Rule Name */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                Название правила
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Моментальный звонок при новой заявке"
                  className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F8F4E3]">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-[#133C2A]/20 text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer"
                />
                <Label htmlFor="isActive" className="text-[#133C2A] cursor-pointer flex-1 text-sm">
                  Правило активно (будет автоматически выполняться)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Category Selection */}
          {!selectedCategory ? (
            <Card className="border-none soft-shadow">
              <CardHeader>
                <CardTitle className="text-[#133C2A]">Выберите категорию триггера</CardTitle>
                <p className="text-sm text-[#133C2A]/60">
                  Определите, в какой области системы будет срабатывать автоматизация
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {Object.entries(triggerCategories).map(([key, cat]) => {
                    const CategoryIcon = cat.icon;
                    const count = triggerOptions.filter(t => t.category === key).length;
                    
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedCategory(key as TriggerCategory)}
                        className="p-6 rounded-2xl border-2 border-[#133C2A]/10 hover:border-[#D4AF37] bg-white hover:shadow-lg transition-all text-left group"
                      >
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                          <CategoryIcon className="w-7 h-7 text-white" />
                        </div>
                        <h3 className="text-[#133C2A] mb-2">{cat.label}</h3>
                        <p className="text-sm text-[#133C2A]/60">
                          {count} {count === 1 ? 'триггер' : 'триггеров'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none soft-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const cat = triggerCategories[selectedCategory];
                      const CategoryIcon = cat.icon;
                      return (
                        <>
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center`}>
                            <CategoryIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-[#133C2A]">{cat.label}</CardTitle>
                            <p className="text-sm text-[#133C2A]/60">Выберите триггер</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(null);
                      setFormData({ ...formData, triggerKey: '' as AutomationTrigger });
                    }}
                    className="text-[#133C2A]/60 hover:text-[#133C2A]"
                  >
                    Изменить категорию
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredTriggers.map((trigger) => {
                    const isSelected = formData.triggerKey === trigger.value;
                    
                    return (
                      <div
                        key={trigger.value}
                        onClick={() => setFormData({ ...formData, triggerKey: trigger.value })}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-md'
                            : 'border-[#133C2A]/10 hover:border-[#D4AF37]/50 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected 
                                ? 'border-[#D4AF37] bg-[#D4AF37]' 
                                : 'border-[#133C2A]/30'
                            }`}>
                              {isSelected && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-[#133C2A] mb-1">{trigger.label}</h4>
                            <p className="text-sm text-[#133C2A]/60 mb-2">{trigger.description}</p>
                            <div className="flex items-start gap-2 text-xs">
                              <Info className="w-3.5 h-3.5 text-[#D4AF37] mt-0.5 flex-shrink-0" />
                              <span className="text-[#133C2A]/50 italic">{trigger.example}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-end">
            <Button
              onClick={() => setCurrentStep(2)}
              disabled={!canProceedToStep2}
              className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 disabled:opacity-50 gap-2"
            >
              Далее: Выбрать действие
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Action Selection */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-scale-in">
          {/* Selected Trigger Preview */}
          {selectedTrigger && (
            <Card className="border-none soft-shadow bg-gradient-to-br from-[#F8F4E3] to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-[#D4AF37]" />
                  <div className="flex-1">
                    <p className="text-xs text-[#133C2A]/60 mb-0.5">Выбранный триггер:</p>
                    <p className="text-sm text-[#133C2A]">{selectedTrigger.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Selection */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A]">Выберите действие</CardTitle>
              <p className="text-sm text-[#133C2A]/60">
                Что должно произойти при срабатывании триггера?
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {recommendedActions.map((action) => {
                  const ActionIcon = action.icon;
                  const isSelected = formData.actionType === action.value;
                  
                  return (
                    <button
                      key={action.value}
                      onClick={() => setFormData({ ...formData, actionType: action.value })}
                      className={`p-5 rounded-2xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-lg'
                          : 'border-[#133C2A]/10 hover:border-[#D4AF37]/50 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'scale-110' : ''
                        } transition-transform`}>
                          <ActionIcon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[#133C2A] mb-1">{action.label}</h4>
                          <p className="text-sm text-[#133C2A]/60">{action.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Show other actions */}
              {recommendedActions.length < actionOptions.length && (
                <div className="mt-6 pt-6 border-t border-[#133C2A]/10">
                  <p className="text-sm text-[#133C2A]/60 mb-4">Другие действия:</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    {actionOptions.filter(a => !recommendedActions.includes(a)).map((action) => {
                      const ActionIcon = action.icon;
                      const isSelected = formData.actionType === action.value;
                      
                      return (
                        <button
                          key={action.value}
                          onClick={() => setFormData({ ...formData, actionType: action.value })}
                          className={`p-5 rounded-2xl border-2 transition-all text-left opacity-70 hover:opacity-100 ${
                            isSelected
                              ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-lg opacity-100'
                              : 'border-[#133C2A]/10 hover:border-[#D4AF37]/50 bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'scale-110' : ''
                            } transition-transform`}>
                              <ActionIcon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-[#133C2A] mb-1">{action.label}</h4>
                              <p className="text-sm text-[#133C2A]/60">{action.description}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="border-[#133C2A]/20 hover:bg-[#133C2A]/5 rounded-xl gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </Button>
            <Button
              onClick={() => setCurrentStep(3)}
              disabled={!canProceedToStep3}
              className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 disabled:opacity-50 gap-2"
            >
              Далее: Настроить параметры
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Action Parameters - will continue in next part */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-scale-in">
          {/* Preview */}
          <Card className="border-none soft-shadow bg-gradient-to-br from-[#133C2A] to-[#1C8C64]">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 text-white">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-white/80 text-sm mb-2">Предпросмотр правила:</p>
                  <h3 className="mb-3">{formData.name || 'Без названия'}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge className="bg-white/20 text-white border-white/30">
                      {selectedTrigger?.label || 'Не выбран'}
                    </Badge>
                    <ArrowRight className="w-4 h-4" />
                    <Badge className="bg-white/20 text-white border-white/30">
                      {selectedAction?.label || 'Не выбрано'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Parameters based on type - Продолжу в следующем сообщении из-за лимита длины */}
          <ActionParametersForm
            actionType={formData.actionType}
            actionParams={formData.actionParams as any}
            availablePlaceholders={availablePlaceholders}
            employees={employees}
            onParamsChange={(params) => setFormData({ ...formData, actionParams: params as any })}
            insertPlaceholder={insertPlaceholder}
            titleCursorPos={titleCursorPos}
            setTitleCursorPos={setTitleCursorPos}
            descCursorPos={descCursorPos}
            setDescCursorPos={setDescCursorPos}
            newTag={newTag}
            setNewTag={setNewTag}
          />

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(2)}
              className="border-[#133C2A]/20 hover:bg-[#133C2A]/5 rounded-xl gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onBack}
                className="border-[#133C2A]/20 hover:bg-[#133C2A]/5 rounded-xl"
              >
                Отменить
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white hover:opacity-90 rounded-xl gap-2 px-6"
              >
                <CheckSquare className="w-4 h-4" />
                {rule ? 'Сохранить изменения' : 'Создать правило'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Компонент для отображения параметров действия
interface ActionParametersFormProps {
  actionType: AutomationActionType;
  actionParams: any;
  availablePlaceholders: { value: string; label: string; description: string }[];
  employees: User[];
  onParamsChange: (params: any) => void;
  insertPlaceholder: (placeholder: string, field: string) => void;
  titleCursorPos: number;
  setTitleCursorPos: (pos: number) => void;
  descCursorPos: number;
  setDescCursorPos: (pos: number) => void;
  newTag: string;
  setNewTag: (tag: string) => void;
}

function ActionParametersForm({
  actionType,
  actionParams,
  availablePlaceholders,
  employees,
  onParamsChange,
  insertPlaceholder,
  titleCursorPos,
  setTitleCursorPos,
  descCursorPos,
  setDescCursorPos,
  newTag,
  setNewTag,
}: ActionParametersFormProps) {
  
  const updateParam = (key: string, value: any) => {
    onParamsChange({ ...actionParams, [key]: value });
  };

  // Common placeholders component
  const PlaceholdersList = ({ field }: { field: string }) => (
    availablePlaceholders.length > 0 && (
      <div className="p-4 rounded-xl bg-gradient-to-br from-[#D4AF37]/5 to-[#F8F4E3] border border-[#D4AF37]/20">
        <div className="flex items-start gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[#D4AF37] mt-0.5" />
          <div>
            <h4 className="text-sm text-[#133C2A] mb-1">Доступные переменные</h4>
            <p className="text-xs text-[#133C2A]/60">Нажмите, чтобы вставить</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {availablePlaceholders.map(ph => (
            <Badge
              key={ph.value}
              className="bg-white border-[#D4AF37] text-[#133C2A] cursor-pointer hover:bg-[#D4AF37] hover:text-white transition-all px-3 py-1.5"
              onClick={() => insertPlaceholder(ph.value, field)}
              title={ph.description}
            >
              <Plus className="w-3 h-3 mr-1" />
              {ph.label}
            </Badge>
          ))}
        </div>
      </div>
    )
  );

  return (
    <Card className="border-none soft-shadow">
      <CardHeader>
        <CardTitle className="text-[#133C2A] flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#D4AF37]" />
          Параметры действия
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CREATE_TASK */}
        {actionType === 'create_task' && (
          <>
            <PlaceholdersList field="title" />

            <div className="space-y-2">
              <Label htmlFor="taskTitle" className="text-[#133C2A]">
                Заголовок задачи <span className="text-red-500">*</span>
              </Label>
              <Input
                id="taskTitle"
                value={actionParams.title || ''}
                onChange={(e) => {
                  updateParam('title', e.target.value);
                  setTitleCursorPos(e.target.selectionStart || 0);
                }}
                onSelect={(e) => setTitleCursorPos((e.target as HTMLInputElement).selectionStart || 0)}
                placeholder="Позвонить {lead.parent_name} по поводу пробного занятия"
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskDescription" className="text-[#133C2A]">Описание задачи</Label>
              <textarea
                id="taskDescription"
                value={actionParams.description || ''}
                onChange={(e) => {
                  updateParam('description', e.target.value);
                  setDescCursorPos(e.target.selectionStart || 0);
                }}
                onSelect={(e) => setDescCursorPos((e.target as HTMLTextAreaElement).selectionStart || 0)}
                placeholder="Подробности о задаче..."
                className="w-full min-h-[100px] px-3 py-2 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none resize-none"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-[#133C2A]">Приоритет задачи</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(priorityConfig).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => updateParam('priority', key)}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        actionParams.priority === key
                          ? `${config.color} border-current shadow-md`
                          : 'border-[#133C2A]/10 hover:border-[#133C2A]/30 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{config.icon}</span>
                        <span className="text-sm">{config.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="dueDateOffset" className="text-[#133C2A]">Выполнить через</Label>
                <div className="relative">
                  <Input
                    id="dueDateOffset"
                    type="number"
                    min="0"
                    value={actionParams.dueDateOffsetDays || 0}
                    onChange={(e) => updateParam('dueDateOffsetDays', parseInt(e.target.value) || 0)}
                    className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37] pr-16"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#133C2A]/60">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">дней</span>
                  </div>
                </div>
                <p className="text-xs text-[#133C2A]/60">
                  {actionParams.dueDateOffsetDays === 0 
                    ? '⚡ Задача создается моментально' 
                    : `Задача будет создана через ${actionParams.dueDateOffsetDays} дн.`}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee" className="text-[#133C2A]">
                Назначить исполнителя <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <select
                  id="assignee"
                  value={actionParams.assigneeId || ''}
                  onChange={(e) => updateParam('assigneeId', e.target.value)}
                  className="w-full h-12 px-4 pr-10 rounded-xl border-2 border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Выберите сотрудника...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/50 pointer-events-none" />
              </div>
            </div>
          </>
        )}

        {/* SEND_EMAIL */}
        {actionType === 'send_email' && (
          <>
            <div className="space-y-2">
              <Label className="text-[#133C2A]">Получатель <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-3 gap-2">
                {['lead', 'parent', 'custom'].map((option) => (
                  <button
                    key={option}
                    onClick={() => updateParam('to', option)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      actionParams.to === option
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5'
                        : 'border-[#133C2A]/10 hover:border-[#133C2A]/30 bg-white'
                    }`}
                  >
                    {option === 'lead' ? 'Лид' : option === 'parent' ? 'Родитель' : 'Другой'}
                  </button>
                ))}
              </div>
            </div>

            {actionParams.to === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="customEmail" className="text-[#133C2A]">Email получателя</Label>
                <Input
                  id="customEmail"
                  type="email"
                  value={actionParams.customEmail || ''}
                  onChange={(e) => updateParam('customEmail', e.target.value)}
                  placeholder="example@email.com"
                  className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>
            )}

            <PlaceholdersList field="subject" />

            <div className="space-y-2">
              <Label htmlFor="emailSubject" className="text-[#133C2A]">
                Тема письма <span className="text-red-500">*</span>
              </Label>
              <Input
                id="emailSubject"
                value={actionParams.subject || ''}
                onChange={(e) => {
                  updateParam('subject', e.target.value);
                  setTitleCursorPos(e.target.selectionStart || 0);
                }}
                onSelect={(e) => setTitleCursorPos((e.target as HTMLInputElement).selectionStart || 0)}
                placeholder="Здравствуйте, {lead.parent_name}!"
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailBody" className="text-[#133C2A]">
                Текст письма <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="emailBody"
                value={actionParams.body || ''}
                onChange={(e) => {
                  updateParam('body', e.target.value);
                  setDescCursorPos(e.target.selectionStart || 0);
                }}
                onSelect={(e) => setDescCursorPos((e.target as HTMLTextAreaElement).selectionStart || 0)}
                placeholder="Благодарим за интерес к нашей студии..."
                className="w-full min-h-[150px] px-3 py-2 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none resize-none"
              />
            </div>
          </>
        )}

        {/* SEND_SMS */}
        {actionType === 'send_sms' && (
          <>
            <div className="space-y-2">
              <Label className="text-[#133C2A]">Получатель <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-3 gap-2">
                {['lead', 'parent', 'custom'].map((option) => (
                  <button
                    key={option}
                    onClick={() => updateParam('to', option)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      actionParams.to === option
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5'
                        : 'border-[#133C2A]/10 hover:border-[#133C2A]/30 bg-white'
                    }`}
                  >
                    {option === 'lead' ? 'Лид' : option === 'parent' ? 'Родитель' : 'Другой'}
                  </button>
                ))}
              </div>
            </div>

            {actionParams.to === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="customPhone" className="text-[#133C2A]">Номер телефона</Label>
                <Input
                  id="customPhone"
                  type="tel"
                  value={actionParams.customPhone || ''}
                  onChange={(e) => updateParam('customPhone', e.target.value)}
                  placeholder="+7 (999) 123-45-67"
                  className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>
            )}

            <PlaceholdersList field="message" />

            <div className="space-y-2">
              <Label htmlFor="smsMessage" className="text-[#133C2A]">
                Текст SMS <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="smsMessage"
                value={actionParams.message || ''}
                onChange={(e) => {
                  updateParam('message', e.target.value);
                  setDescCursorPos(e.target.selectionStart || 0);
                }}
                onSelect={(e) => setDescCursorPos((e.target as HTMLTextAreaElement).selectionStart || 0)}
                placeholder="Здравствуйте, {lead.parent_name}! Напоминаем..."
                className="w-full min-h-[120px] px-3 py-2 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none resize-none"
                maxLength={160}
              />
              <p className="text-xs text-[#133C2A]/60">
                {(actionParams.message || '').length} / 160 символов
              </p>
            </div>
          </>
        )}

        {/* SEND_WHATSAPP */}
        {actionType === 'send_whatsapp' && (
          <>
            <div className="space-y-2">
              <Label className="text-[#133C2A]">Получатель <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-3 gap-2">
                {['lead', 'parent', 'custom'].map((option) => (
                  <button
                    key={option}
                    onClick={() => updateParam('to', option)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      actionParams.to === option
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5'
                        : 'border-[#133C2A]/10 hover:border-[#133C2A]/30 bg-white'
                    }`}
                  >
                    {option === 'lead' ? 'Лид' : option === 'parent' ? 'Родитель' : 'Другой'}
                  </button>
                ))}
              </div>
            </div>

            {actionParams.to === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="customPhone" className="text-[#133C2A]">Номер телефона</Label>
                <Input
                  id="customPhone"
                  type="tel"
                  value={actionParams.customPhone || ''}
                  onChange={(e) => updateParam('customPhone', e.target.value)}
                  placeholder="+7 (999) 123-45-67"
                  className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>
            )}

            <PlaceholdersList field="message" />

            <div className="space-y-2">
              <Label htmlFor="whatsappMessage" className="text-[#133C2A]">
                Текст сообщения <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="whatsappMessage"
                value={actionParams.message || ''}
                onChange={(e) => {
                  updateParam('message', e.target.value);
                  setDescCursorPos(e.target.selectionStart || 0);
                }}
                onSelect={(e) => setDescCursorPos((e.target as HTMLTextAreaElement).selectionStart || 0)}
                placeholder="Здравствуйте, {lead.parent_name}! 👋"
                className="w-full min-h-[120px] px-3 py-2 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none resize-none"
              />
            </div>
          </>
        )}

        {/* CREATE_NOTIFICATION */}
        {actionType === 'create_notification' && (
          <>
            <PlaceholdersList field="title" />

            <div className="space-y-2">
              <Label htmlFor="notifTitle" className="text-[#133C2A]">
                Заголовок уведомления <span className="text-red-500">*</span>
              </Label>
              <Input
                id="notifTitle"
                value={actionParams.title || ''}
                onChange={(e) => {
                  updateParam('title', e.target.value);
                  setTitleCursorPos(e.target.selectionStart || 0);
                }}
                onSelect={(e) => setTitleCursorPos((e.target as HTMLInputElement).selectionStart || 0)}
                placeholder="Новая заявка от {lead.parent_name}"
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notifMessage" className="text-[#133C2A]">
                Текст уведомления <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="notifMessage"
                value={actionParams.message || ''}
                onChange={(e) => {
                  updateParam('message', e.target.value);
                  setDescCursorPos(e.target.selectionStart || 0);
                }}
                onSelect={(e) => setDescCursorPos((e.target as HTMLTextAreaElement).selectionStart || 0)}
                placeholder="Подробная информация..."
                className="w-full min-h-[100px] px-3 py-2 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none resize-none"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-[#133C2A]">Тип уведомления</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(notificationTypes).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => updateParam('type', key)}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        actionParams.type === key
                          ? `${config.color} border-current shadow-md`
                          : 'border-[#133C2A]/10 hover:border-[#133C2A]/30 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{config.icon}</span>
                        <span className="text-sm">{config.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient" className="text-[#133C2A]">
                  Получатель <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <select
                    id="recipient"
                    value={actionParams.recipientId || ''}
                    onChange={(e) => updateParam('recipientId', e.target.value)}
                    className="w-full h-12 px-4 pr-10 rounded-xl border-2 border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Выберите...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/50 pointer-events-none" />
                </div>
              </div>
            </div>
          </>
        )}

        {/* CHANGE_LEAD_STATUS */}
        {actionType === 'change_lead_status' && (
          <>
            <div className="space-y-2">
              <Label className="text-[#133C2A]">Новый статус <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {leadStatuses.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => updateParam('newStatus', status.value)}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      actionParams.newStatus === status.value
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-md'
                        : 'border-[#133C2A]/10 hover:border-[#D4AF37]/50 bg-white'
                    }`}
                  >
                    <span className="text-sm">{status.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addNote" className="text-[#133C2A]">Добавить заметку (опционально)</Label>
              <textarea
                id="addNote"
                value={actionParams.addNote || ''}
                onChange={(e) => updateParam('addNote', e.target.value)}
                placeholder="Автоматическая заметка при смене статуса..."
                className="w-full min-h-[80px] px-3 py-2 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none resize-none"
              />
            </div>
          </>
        )}

        {/* ADD_TAG */}
        {actionType === 'add_tag' && (
          <>
            <div className="space-y-2">
              <Label className="text-[#133C2A]">Теги <span className="text-red-500">*</span></Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newTag.trim()) {
                      const currentTags = actionParams.tags || [];
                      if (!currentTags.includes(newTag.trim())) {
                        updateParam('tags', [...currentTags, newTag.trim()]);
                        setNewTag('');
                      }
                    }
                  }}
                  placeholder="Введите тег и нажмите Enter"
                  className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newTag.trim()) {
                      const currentTags = actionParams.tags || [];
                      if (!currentTags.includes(newTag.trim())) {
                        updateParam('tags', [...currentTags, newTag.trim()]);
                        setNewTag('');
                      }
                    }
                  }}
                  className="rounded-xl bg-[#D4AF37] hover:bg-[#B8941F]"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {actionParams.tags && actionParams.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {actionParams.tags.map((tag: string, index: number) => (
                  <Badge
                    key={index}
                    className="bg-[#D4AF37] text-white cursor-pointer hover:bg-[#B8941F] px-3 py-1.5"
                    onClick={() => {
                      const newTags = actionParams.tags.filter((_: string, i: number) => i !== index);
                      updateParam('tags', newTags);
                    }}
                  >
                    {tag}
                    <span className="ml-2">×</span>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F8F4E3]">
              <input
                type="checkbox"
                id="createIfNotExists"
                checked={actionParams.createIfNotExists ?? true}
                onChange={(e) => updateParam('createIfNotExists', e.target.checked)}
                className="w-4 h-4 rounded border-[#133C2A]/20 text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer"
              />
              <Label htmlFor="createIfNotExists" className="text-[#133C2A] cursor-pointer flex-1 text-sm">
                Создавать тег, если его еще нет в системе
              </Label>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
