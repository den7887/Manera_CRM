import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Bot,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit,
  FileText,
  Filter,
  GraduationCap,
  MessageSquare,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  Users,
  WalletCards,
} from 'lucide-react';
import { AutomationRule, Employee } from '../../types';
import {
  createOwnerAutomation,
  deleteOwnerAutomation,
  loadOwnerAutomations,
  loadOwnerEmployees,
  updateOwnerAutomation,
} from '../../lib/backendApi';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';

type StatusFilter = 'all' | 'active' | 'disabled';
type WizardStep = 0 | 1 | 2 | 3 | 4;
type AutomationScopeKey =
  | 'clients'
  | 'finance'
  | 'groups'
  | 'communications'
  | 'tasks'
  | 'content'
  | 'documents'
  | 'team';
type AutomationActionType =
  | 'create_task'
  | 'send_sms'
  | 'send_whatsapp'
  | 'create_notification'
  | 'change_client_status'
  | 'add_tag'
  | 'send_payment_reminder'
  | 'assign_group'
  | 'publish_parent_notice';

interface AutomationEventOption {
  key: string;
  title: string;
  description: string;
  data: string[];
}

interface AutomationScopeOption {
  key: AutomationScopeKey;
  title: string;
  description: string;
  icon: typeof Users;
  events: AutomationEventOption[];
}

interface AutomationActionOption {
  type: AutomationActionType;
  title: string;
  description: string;
  defaults: Partial<ActionDraft>;
}

interface ActionDraft {
  id: string;
  type: AutomationActionType;
  title: string;
  recipient: 'parent' | 'employee' | 'owner' | 'responsible_employee';
  channel: 'crm' | 'sms' | 'whatsapp';
  message: string;
  taskTitle: string;
  taskDescription: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDays: number;
  status: string;
  tags: string;
  assigneeEmployeeId: string;
  notifyEmployeeId: string;
}

interface AutomationDraft {
  id: string;
  name: string;
  scope: AutomationScopeKey;
  triggerKey: string;
  delayAmount: number;
  delayUnit: 'minutes' | 'hours' | 'days';
  onlyIfNotPaid: boolean;
  onlyIfActiveClient: boolean;
  onlyIfNoOpenTask: boolean;
  cooldownHours: number;
  stopAfterSuccess: boolean;
  actions: ActionDraft[];
}

const steps: Array<{ title: string; description: string }> = [
  { title: 'Раздел', description: 'Где возникает событие' },
  { title: 'Событие', description: 'Что запускает сценарий' },
  { title: 'Условия', description: 'Когда правило применимо' },
  { title: 'Действия', description: 'Что система должна сделать' },
  { title: 'Проверка', description: 'Итоговая схема' },
];

const scopes: AutomationScopeOption[] = [
  {
    key: 'clients',
    title: 'Клиенты',
    description: 'Заявки, ученики, родители, группы, остаток занятий',
    icon: Users,
    events: [
      {
        key: 'lead.created',
        title: 'Новая заявка с лендинга',
        description: 'Родитель оставил анкету на сайте',
        data: ['Родитель', 'Телефон', 'Ученик', 'Комментарий', 'Источник'],
      },
      {
        key: 'client.created',
        title: 'Клиент добавлен в CRM',
        description: 'Сотрудник создал карточку ученика и родителя',
        data: ['Родитель', 'Ученик', 'Абонемент', 'Способ оплаты'],
      },
      {
        key: 'child.group_assigned',
        title: 'Ученик назначен в группу',
        description: 'У ребенка появилась учебная группа',
        data: ['Ученик', 'Группа', 'Педагог', 'Расписание'],
      },
      {
        key: 'subscription.visits_running_low',
        title: 'Осталось мало занятий',
        description: 'По абонементу подходит лимит занятий',
        data: ['Ученик', 'Абонемент', 'Осталось занятий'],
      },
      {
        key: 'birthday.student.upcoming',
        title: 'Скоро день рождения ученика',
        description: 'Система заранее видит дату рождения',
        data: ['Ученик', 'Дата рождения', 'Родитель'],
      },
    ],
  },
  {
    key: 'finance',
    title: 'Финансы',
    description: 'Счета, оплаты, долги, продления, возвраты',
    icon: WalletCards,
    events: [
      {
        key: 'payment.created',
        title: 'Выставлен счет',
        description: 'Для клиента создан платеж или счет',
        data: ['Сумма', 'Абонемент', 'Срок оплаты', 'Родитель'],
      },
      {
        key: 'payment.pending_before_due',
        title: 'Скоро срок оплаты',
        description: 'Счет еще не оплачен, дедлайн близко',
        data: ['Сумма', 'Дата оплаты', 'Родитель', 'Ученик'],
      },
      {
        key: 'payment.overdue',
        title: 'Оплата просрочена',
        description: 'Платеж не закрыт после срока оплаты',
        data: ['Сумма', 'Просрочка', 'Родитель', 'Ученик'],
      },
      {
        key: 'payment.paid',
        title: 'Оплата получена',
        description: 'Платеж переведен в оплаченный статус',
        data: ['Сумма', 'Дата оплаты', 'Абонемент'],
      },
      {
        key: 'payment.failed',
        title: 'Оплата не прошла',
        description: 'Провайдер или сотрудник отметил ошибку оплаты',
        data: ['Сумма', 'Причина', 'Родитель'],
      },
    ],
  },
  {
    key: 'groups',
    title: 'Группы и занятия',
    description: 'Расписание, посещаемость, отмены, заполненность',
    icon: GraduationCap,
    events: [
      {
        key: 'group.capacity_high',
        title: 'Группа почти заполнена',
        description: 'Количество учеников близко к лимиту',
        data: ['Группа', 'Заполненность', 'Педагог'],
      },
      {
        key: 'lesson.cancelled',
        title: 'Занятие отменено',
        description: 'В расписании появилась отмена занятия',
        data: ['Группа', 'Дата', 'Педагог'],
      },
      {
        key: 'lesson.rescheduled',
        title: 'Занятие перенесено',
        description: 'Изменилась дата или время занятия',
        data: ['Старая дата', 'Новая дата', 'Группа'],
      },
      {
        key: 'attendance.absent',
        title: 'Ученик отсутствовал',
        description: 'В посещаемости отмечен пропуск',
        data: ['Ученик', 'Группа', 'Дата занятия'],
      },
    ],
  },
  {
    key: 'communications',
    title: 'Коммуникации',
    description: 'Чаты, уведомления, входящие сообщения',
    icon: MessageSquare,
    events: [
      {
        key: 'message.incoming_unanswered',
        title: 'Сообщение без ответа',
        description: 'Родитель написал, но сотрудник не ответил',
        data: ['Родитель', 'Чат', 'Последнее сообщение'],
      },
      {
        key: 'notification.unread_long',
        title: 'Уведомление долго не прочитано',
        description: 'Важное сообщение осталось без просмотра',
        data: ['Получатель', 'Уведомление', 'Дата'],
      },
    ],
  },
  {
    key: 'tasks',
    title: 'Задачи',
    description: 'Контроль поручений, просрочки, комментарии',
    icon: Check,
    events: [
      {
        key: 'task.created',
        title: 'Задача создана',
        description: 'Владелец или система поставили задачу',
        data: ['Исполнитель', 'Срок', 'Приоритет'],
      },
      {
        key: 'task.overdue',
        title: 'Задача просрочена',
        description: 'Срок выполнения прошел, статус не закрыт',
        data: ['Исполнитель', 'Задача', 'Просрочка'],
      },
      {
        key: 'task.completed',
        title: 'Задача выполнена',
        description: 'Исполнитель отметил задачу выполненной',
        data: ['Исполнитель', 'Комментарий', 'Дата'],
      },
    ],
  },
  {
    key: 'content',
    title: 'Новости и мероприятия',
    description: 'Публикации, события, дедлайны, участники',
    icon: CalendarClock,
    events: [
      {
        key: 'event.created',
        title: 'Создано мероприятие',
        description: 'Появилась новая публикация с событием',
        data: ['Название', 'Дата', 'Стоимость', 'Дедлайн'],
      },
      {
        key: 'event.deadline_soon',
        title: 'Скоро дедлайн мероприятия',
        description: 'До окончания записи или оплаты осталось мало времени',
        data: ['Мероприятие', 'Дедлайн', 'Участники'],
      },
      {
        key: 'event.registration_full',
        title: 'Места закончились',
        description: 'Количество участников достигло лимита',
        data: ['Мероприятие', 'Лимит', 'Участники'],
      },
    ],
  },
  {
    key: 'documents',
    title: 'Документы',
    description: 'Договоры, справки, файлы для родителей и команды',
    icon: FileText,
    events: [
      {
        key: 'document.created',
        title: 'Документ добавлен',
        description: 'В системе появился новый документ',
        data: ['Тип', 'Доступ', 'Автор'],
      },
      {
        key: 'document.expiring',
        title: 'Документ скоро истекает',
        description: 'Подходит срок действия документа',
        data: ['Документ', 'Дата окончания', 'Ответственный'],
      },
    ],
  },
  {
    key: 'team',
    title: 'Команда',
    description: 'Сотрудники, роли, активность, дни рождения',
    icon: Bot,
    events: [
      {
        key: 'employee.created',
        title: 'Сотрудник добавлен',
        description: 'Владелец создал сотрудника',
        data: ['Имя', 'Роль', 'Телефон'],
      },
      {
        key: 'employee.inactive',
        title: 'Сотрудник неактивен',
        description: 'Долгое время не было действий в CRM',
        data: ['Сотрудник', 'Роль', 'Последняя активность'],
      },
      {
        key: 'employee.birthday_upcoming',
        title: 'Скоро день рождения сотрудника',
        description: 'Система заранее видит дату рождения',
        data: ['Сотрудник', 'Дата рождения'],
      },
    ],
  },
];

const actionCatalog: AutomationActionOption[] = [
  {
    type: 'create_task',
    title: 'Создать задачу',
    description: 'Поставить задачу владельцу или ответственному сотруднику',
    defaults: {
      recipient: 'responsible_employee',
      taskTitle: 'Связаться с родителем',
      taskDescription: 'Проверить ситуацию и оставить комментарий в карточке клиента',
      priority: 'high',
      dueDays: 1,
    },
  },
  {
    type: 'send_payment_reminder',
    title: 'Напомнить об оплате',
    description: 'Отправить родителю короткое напоминание по оплате',
    defaults: {
      recipient: 'parent',
      channel: 'crm',
      message: 'Здравствуйте! Напоминаем об оплате абонемента для {child.name}.',
    },
  },
  {
    type: 'send_sms',
    title: 'Отправить SMS',
    description: 'Короткое сообщение родителю или сотруднику',
    defaults: {
      recipient: 'parent',
      channel: 'sms',
      message: 'Здравствуйте! Для вас есть важное уведомление от студии Манера.',
    },
  },
  {
    type: 'send_whatsapp',
    title: 'Отправить WhatsApp',
    description: 'Сообщение через WhatsApp после подключения провайдера',
    defaults: {
      recipient: 'parent',
      channel: 'whatsapp',
      message: 'Здравствуйте! Пишем из студии Манера по вопросу {child.name}.',
    },
  },
  {
    type: 'create_notification',
    title: 'Создать уведомление',
    description: 'Показать уведомление в личном кабинете',
    defaults: {
      recipient: 'parent',
      channel: 'crm',
      message: 'Новое уведомление от студии Манера.',
    },
  },
  {
    type: 'change_client_status',
    title: 'Изменить статус клиента',
    description: 'Пометить клиента для дальнейшей обработки',
    defaults: {
      status: 'needs_attention',
    },
  },
  {
    type: 'add_tag',
    title: 'Добавить тег',
    description: 'Поставить внутреннюю метку в карточку клиента',
    defaults: {
      tags: 'требует внимания',
    },
  },
  {
    type: 'assign_group',
    title: 'Назначить группу',
    description: 'Подготовить действие распределения ученика в группу',
    defaults: {
      taskTitle: 'Назначить ученика в группу',
      taskDescription: 'Проверить возраст, расписание и подобрать подходящую группу',
      priority: 'medium',
      dueDays: 1,
    },
  },
  {
    type: 'publish_parent_notice',
    title: 'Сообщить родителям',
    description: 'Опубликовать уведомление для связанных родителей',
    defaults: {
      recipient: 'parent',
      channel: 'crm',
      message: 'В студии обновилась информация по вашему ребенку.',
    },
  },
];

const createAction = (type: AutomationActionType): ActionDraft => {
  const preset = actionCatalog.find((item) => item.type === type) || actionCatalog[0];
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: preset.type,
    title: preset.title,
    recipient: 'owner',
    channel: 'crm',
    message: '',
    taskTitle: preset.title,
    taskDescription: '',
    priority: 'medium',
    dueDays: 1,
    status: '',
    tags: '',
    assigneeEmployeeId: '',
    notifyEmployeeId: '',
    ...preset.defaults,
  };
};

const defaultDraft = (): AutomationDraft => ({
  id: '',
  name: '',
  scope: 'clients',
  triggerKey: 'lead.created',
  delayAmount: 0,
  delayUnit: 'minutes',
  onlyIfNotPaid: false,
  onlyIfActiveClient: true,
  onlyIfNoOpenTask: true,
  cooldownHours: 24,
  stopAfterSuccess: true,
  actions: [createAction('create_task')],
});

const scopeByKey = new Map(scopes.map((item) => [item.key, item]));
const eventByKey = new Map(scopes.flatMap((scope) => scope.events.map((event) => [event.key, event])));
const actionByType = new Map(actionCatalog.map((item) => [item.type, item]));

function getRuleParams(rule: AutomationRule): Record<string, any> {
  return rule.actionParams && typeof rule.actionParams === 'object' ? (rule.actionParams as Record<string, any>) : {};
}

function getScopeFromTrigger(triggerKey: string): AutomationScopeKey {
  const found = scopes.find((scope) => scope.events.some((event) => event.key === triggerKey));
  return found?.key || 'clients';
}

function normalizeAction(raw: any, fallbackType: string): ActionDraft {
  const type = actionByType.has(raw?.type) ? raw.type : actionByType.has(fallbackType) ? fallbackType : 'create_task';
  return {
    ...createAction(type),
    ...raw,
    type,
    id: raw?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  };
}

function draftFromRule(rule: AutomationRule): AutomationDraft {
  const params = getRuleParams(rule);
  const scope = (params.scope && scopeByKey.has(params.scope) ? params.scope : getScopeFromTrigger(rule.triggerKey)) as AutomationScopeKey;
  const actions = Array.isArray(params.actions)
    ? params.actions.map((item: any) => normalizeAction(item, rule.actionType))
    : [normalizeAction(params, rule.actionType)];

  return {
    ...defaultDraft(),
    id: rule.id,
    name: rule.name,
    scope,
    triggerKey: rule.triggerKey,
    delayAmount: Number(params.delay?.amount ?? params.delayAmount ?? 0),
    delayUnit: params.delay?.unit || params.delayUnit || 'minutes',
    onlyIfNotPaid: Boolean(params.conditions?.onlyIfNotPaid ?? params.onlyIfNotPaid ?? false),
    onlyIfActiveClient: Boolean(params.conditions?.onlyIfActiveClient ?? params.onlyIfActiveClient ?? true),
    onlyIfNoOpenTask: Boolean(params.conditions?.onlyIfNoOpenTask ?? params.onlyIfNoOpenTask ?? true),
    cooldownHours: Number(params.limits?.cooldownHours ?? params.cooldownHours ?? 24),
    stopAfterSuccess: Boolean(params.limits?.stopAfterSuccess ?? params.stopAfterSuccess ?? true),
    actions,
  };
}

function buildParams(draft: AutomationDraft): Record<string, any> {
  const scope = scopeByKey.get(draft.scope);
  const event = eventByKey.get(draft.triggerKey);
  return {
    builderVersion: 2,
    scope: draft.scope,
    scopeTitle: scope?.title || draft.scope,
    triggerLabel: event?.title || draft.triggerKey,
    triggerDescription: event?.description || '',
    delay: {
      amount: Math.max(0, Number(draft.delayAmount) || 0),
      unit: draft.delayUnit,
    },
    conditions: {
      onlyIfNotPaid: draft.onlyIfNotPaid,
      onlyIfActiveClient: draft.onlyIfActiveClient,
      onlyIfNoOpenTask: draft.onlyIfNoOpenTask,
    },
    limits: {
      cooldownHours: Math.max(0, Number(draft.cooldownHours) || 0),
      stopAfterSuccess: draft.stopAfterSuccess,
    },
    actions: draft.actions.map((action, index) => ({
      order: index + 1,
      type: action.type,
      title: actionByType.get(action.type)?.title || action.title,
      recipient: action.recipient,
      channel: action.channel,
      message: action.message,
      taskTitle: action.taskTitle,
      taskDescription: action.taskDescription,
      priority: action.priority,
      dueDays: Number(action.dueDays) || 0,
      status: action.status,
      assigneeEmployeeId: action.assigneeEmployeeId || null,
      notifyEmployeeId: action.notifyEmployeeId || null,
      tags: action.tags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    })),
  };
}

function formatDelay(draft: AutomationDraft): string {
  if (!draft.delayAmount) return 'Сразу';
  const unitLabel = draft.delayUnit === 'minutes' ? 'мин.' : draft.delayUnit === 'hours' ? 'ч.' : 'дн.';
  return `Через ${draft.delayAmount} ${unitLabel}`;
}

function conditionSummary(draft: AutomationDraft): string[] {
  const result = [];
  if (draft.onlyIfActiveClient) result.push('только активные клиенты');
  if (draft.onlyIfNotPaid) result.push('только если не оплачено');
  if (draft.onlyIfNoOpenTask) result.push('если нет открытой задачи');
  if (draft.cooldownHours > 0) result.push(`не чаще 1 раза в ${draft.cooldownHours} ч.`);
  return result;
}

function ruleDescription(rule: AutomationRule): { scope: string; trigger: string; actions: string; details: string } {
  const params = getRuleParams(rule);
  const scope = params.scopeTitle || scopeByKey.get(params.scope)?.title || scopeByKey.get(getScopeFromTrigger(rule.triggerKey))?.title || 'Сценарий';
  const trigger = params.triggerLabel || eventByKey.get(rule.triggerKey)?.title || rule.triggerKey;
  const actions = Array.isArray(params.actions)
    ? params.actions.map((item: any) => item.title || actionByType.get(item.type)?.title || item.type).join(' -> ')
    : actionByType.get(rule.actionType as AutomationActionType)?.title || rule.actionType;
  const delay = params.delay?.amount ? `${params.delay.amount} ${params.delay.unit}` : 'сразу';
  return {
    scope,
    trigger,
    actions,
    details: `Запуск: ${delay}`,
  };
}

export function OwnerAutomationsPanel() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<AutomationDraft>(defaultDraft);
  const [step, setStep] = useState<WizardStep>(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const employeeMap = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees]);

  const currentScope = scopeByKey.get(draft.scope) || scopes[0];
  const currentEvent = eventByKey.get(draft.triggerKey) || currentScope.events[0];

  const refresh = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const [rulesResult, employeesResult] = await Promise.allSettled([
        loadOwnerAutomations(),
        loadOwnerEmployees(),
      ]);

      if (rulesResult.status === 'fulfilled') {
        setRules(rulesResult.value);
      } else {
        throw rulesResult.reason;
      }

      if (employeesResult.status === 'fulfilled') {
        setEmployees(employeesResult.value.filter((employee) => employee.status === 'active'));
      } else {
        setEmployees([]);
        toast.error('Не удалось загрузить сотрудников для автоматизаций');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить автоматизации');
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filteredRules = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rules
      .filter((rule) => {
        const description = ruleDescription(rule);
        const matchesSearch =
          !query ||
          [rule.name, rule.triggerKey, rule.actionType, description.scope, description.trigger, description.actions]
            .join(' ')
            .toLowerCase()
            .includes(query);
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && rule.isActive) ||
          (statusFilter === 'disabled' && !rule.isActive);
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }, [rules, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: rules.length,
      active: rules.filter((item) => item.isActive).length,
      disabled: rules.filter((item) => !item.isActive).length,
      workflows: rules.filter((item) => Array.isArray(getRuleParams(item).actions) && getRuleParams(item).actions.length > 1).length,
    }),
    [rules],
  );

  const openCreate = () => {
    setDraft(defaultDraft());
    setStep(0);
    setIsDialogOpen(true);
  };

  const openEdit = (rule: AutomationRule) => {
    setDraft(draftFromRule(rule));
    setStep(0);
    setIsDialogOpen(true);
  };

  const duplicateRule = async (rule: AutomationRule) => {
    try {
      const created = await createOwnerAutomation({
        name: `${rule.name} (копия)`,
        trigger_key: rule.triggerKey,
        action_type: rule.actionType,
        action_params: getRuleParams(rule),
        is_active: false,
      });
      setRules((prev) => [created, ...prev]);
      toast.success('Правило продублировано');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось продублировать правило');
    }
  };

  const validateStep = (targetStep = step): boolean => {
    if (targetStep === 0 && !draft.scope) {
      toast.error('Выберите раздел');
      return false;
    }
    if (targetStep === 1 && !draft.triggerKey) {
      toast.error('Выберите событие');
      return false;
    }
    if (targetStep === 3 && draft.actions.length === 0) {
      toast.error('Добавьте хотя бы одно действие');
      return false;
    }
    if (targetStep === 3) {
      const hasInvalidRecipient = draft.actions.some(
        (action) => action.recipient === 'employee' && !action.notifyEmployeeId,
      );
      if (hasInvalidRecipient) {
        toast.error('Для действия на сотрудника выберите получателя');
        return false;
      }
    }
    if (targetStep === 4 && !draft.name.trim()) {
      toast.error('Введите название сценария');
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setStep((prev) => Math.min(4, prev + 1) as WizardStep);
  };

  const saveRule = async () => {
    if (!validateStep(4)) return;

    const params = buildParams(draft);
    const actionType = draft.actions.length > 1 ? 'workflow' : draft.actions[0]?.type || 'create_task';
    setIsSaving(true);
    try {
      if (draft.id) {
        const existing = rules.find((item) => item.id === draft.id);
        if (!existing) {
          toast.error('Правило не найдено');
          return;
        }
        const updated = await updateOwnerAutomation(draft.id, {
          name: draft.name.trim(),
          trigger_key: draft.triggerKey,
          action_type: actionType,
          action_params: params,
          is_active: existing.isActive,
        });
        setRules((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        toast.success('Сценарий обновлен');
      } else {
        const created = await createOwnerAutomation({
          name: draft.name.trim(),
          trigger_key: draft.triggerKey,
          action_type: actionType,
          action_params: params,
          is_active: true,
        });
        setRules((prev) => [created, ...prev]);
        toast.success('Сценарий создан');
      }
      setDraft(defaultDraft());
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить сценарий');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRule = async (rule: AutomationRule) => {
    try {
      const updated = await updateOwnerAutomation(rule.id, {
        name: rule.name,
        trigger_key: rule.triggerKey,
        action_type: rule.actionType,
        action_params: getRuleParams(rule),
        is_active: !rule.isActive,
      });
      setRules((prev) => prev.map((item) => (item.id === rule.id ? updated : item)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить правило');
    }
  };

  const toggleAll = async (nextActive: boolean) => {
    const target = rules.filter((item) => item.isActive !== nextActive);
    if (target.length === 0) {
      toast.info(nextActive ? 'Все сценарии уже активны' : 'Все сценарии уже отключены');
      return;
    }
    setIsBulkUpdating(true);
    try {
      const results = await Promise.allSettled(
        target.map((rule) =>
          updateOwnerAutomation(rule.id, {
            name: rule.name,
            trigger_key: rule.triggerKey,
            action_type: rule.actionType,
            action_params: getRuleParams(rule),
            is_active: nextActive,
          }),
        ),
      );
      const success = results.filter((item) => item.status === 'fulfilled').length;
      const failed = results.length - success;
      if (success > 0) toast.success(nextActive ? `Включено сценариев: ${success}` : `Отключено сценариев: ${success}`);
      if (failed > 0) toast.error(`Не удалось обновить сценариев: ${failed}`);
      await refresh(true);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Удалить сценарий автоматизации?')) return;
    try {
      await deleteOwnerAutomation(id);
      setRules((prev) => prev.filter((item) => item.id !== id));
      toast.success('Сценарий удален');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить сценарий');
    }
  };

  const updateAction = (id: string, updates: Partial<ActionDraft>) => {
    setDraft((prev) => ({
      ...prev,
      actions: prev.actions.map((action) => (action.id === id ? { ...action, ...updates } : action)),
    }));
  };

  const addAction = (type: AutomationActionType) => {
    setDraft((prev) => ({ ...prev, actions: [...prev.actions, createAction(type)] }));
  };

  const removeAction = (id: string) => {
    setDraft((prev) => ({ ...prev, actions: prev.actions.filter((action) => action.id !== id) }));
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {scopes.map((scope) => {
            const Icon = scope.icon;
            const selected = draft.scope === scope.key;
            return (
              <button
                key={scope.key}
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    scope: scope.key,
                    triggerKey: scope.events[0]?.key || prev.triggerKey,
                  }))
                }
                className={`text-left rounded-2xl border p-3 min-h-[148px] transition ${
                  selected ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#133C2A]/10 hover:border-[#133C2A]/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-[#133C2A]/10 flex items-center justify-center text-[#133C2A] shrink-0">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[#133C2A]">{scope.title}</span>
                    <span className="block text-sm text-[#133C2A]/60 mt-1 line-clamp-2">{scope.description}</span>
                    <span className="block text-xs text-[#133C2A]/45 mt-1.5">{scope.events.length} событий</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="rounded-xl bg-[#133C2A]">{currentScope.title}</Badge>
            <span className="text-sm text-[#133C2A]/60">Выберите событие, от которого стартует сценарий</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {currentScope.events.map((event) => {
              const selected = draft.triggerKey === event.key;
              return (
                <button
                  key={event.key}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, triggerKey: event.key }))}
                  className={`text-left rounded-2xl border p-4 transition ${
                    selected ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#133C2A]/10 hover:border-[#133C2A]/30'
                  }`}
                >
                  <span className="block text-[#133C2A]">{event.title}</span>
                  <span className="block text-sm text-[#133C2A]/60 mt-1">{event.description}</span>
                  <span className="flex gap-1 flex-wrap mt-3">
                    {event.data.map((item) => (
                      <Badge key={item} variant="outline" className="rounded-xl text-[11px]">
                        {item}
                      </Badge>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_160px] gap-3">
            <div className="space-y-2">
              <Label>Когда запускать</Label>
              <Select value={draft.delayUnit} onValueChange={(value: AutomationDraft['delayUnit']) => setDraft((prev) => ({ ...prev, delayUnit: value }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Через минуты</SelectItem>
                  <SelectItem value="hours">Через часы</SelectItem>
                  <SelectItem value="days">Через дни</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Задержка</Label>
              <Input
                type="number"
                min={0}
                value={draft.delayAmount}
                onChange={(event) => setDraft((prev) => ({ ...prev, delayAmount: Number(event.target.value) }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Повтор</Label>
              <Input
                type="number"
                min={0}
                value={draft.cooldownHours}
                onChange={(event) => setDraft((prev) => ({ ...prev, cooldownHours: Number(event.target.value) }))}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                key: 'onlyIfActiveClient',
                title: 'Только для активных клиентов',
                description: 'Сценарий не сработает по архивным или заблокированным клиентам',
                checked: draft.onlyIfActiveClient,
              },
              {
                key: 'onlyIfNotPaid',
                title: 'Только если нет оплаты',
                description: 'Полезно для счетов, продлений и напоминаний',
                checked: draft.onlyIfNotPaid,
              },
              {
                key: 'onlyIfNoOpenTask',
                title: 'Не создавать дубль задачи',
                description: 'Если похожая задача уже открыта, сценарий не создаст новую',
                checked: draft.onlyIfNoOpenTask,
              },
              {
                key: 'stopAfterSuccess',
                title: 'Остановиться после успеха',
                description: 'После успешного действия сценарий не продолжает повторяться',
                checked: draft.stopAfterSuccess,
              },
            ].map((item) => (
              <label key={item.key} className="flex items-start gap-3 rounded-2xl border border-[#133C2A]/10 p-4">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, [item.key]: Boolean(checked) }))}
                  className="mt-1"
                />
                <span>
                  <span className="block text-[#133C2A]">{item.title}</span>
                  <span className="block text-sm text-[#133C2A]/60">{item.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {actionCatalog.map((action) => (
              <Button
                key={action.type}
                type="button"
                variant="outline"
                className="h-auto justify-start rounded-2xl p-3 text-left whitespace-normal"
                onClick={() => addAction(action.type)}
              >
                <Plus className="w-4 h-4 mr-2 shrink-0" />
                <span>
                  <span className="block">{action.title}</span>
                  <span className="block text-xs text-[#133C2A]/55 font-normal">{action.description}</span>
                </span>
              </Button>
            ))}
          </div>
          <Separator />
          <div className="space-y-3">
            {draft.actions.map((action, index) => (
              <div key={action.id} className="rounded-2xl border border-[#133C2A]/10 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="rounded-xl bg-[#133C2A]">{index + 1}</Badge>
                      <p className="text-[#133C2A]">{actionByType.get(action.type)?.title || action.title}</p>
                    </div>
                    <p className="text-sm text-[#133C2A]/60 mt-1">{actionByType.get(action.type)?.description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => removeAction(action.id)}
                    disabled={draft.actions.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Получатель</Label>
                    <Select value={action.recipient} onValueChange={(value: ActionDraft['recipient']) => updateAction(action.id, { recipient: value })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parent">Родитель</SelectItem>
                        <SelectItem value="responsible_employee">Ответственный сотрудник</SelectItem>
                        <SelectItem value="employee">Сотрудник</SelectItem>
                        <SelectItem value="owner">Владелец</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Канал</Label>
                    <Select value={action.channel} onValueChange={(value: ActionDraft['channel']) => updateAction(action.id, { channel: value })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="crm">Личный кабинет</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Приоритет</Label>
                    <Select value={action.priority} onValueChange={(value: ActionDraft['priority']) => updateAction(action.id, { priority: value })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Низкий</SelectItem>
                        <SelectItem value="medium">Средний</SelectItem>
                        <SelectItem value="high">Высокий</SelectItem>
                        <SelectItem value="urgent">Срочный</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(action.type === 'create_task' || action.type === 'assign_group') && (
                  <div className="space-y-2">
                    <Label>Исполнитель</Label>
                    <Select
                      value={action.assigneeEmployeeId || '__none__'}
                      onValueChange={(value) =>
                        updateAction(action.id, { assigneeEmployeeId: value === '__none__' ? '' : value })
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Выберите сотрудника" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Не назначать автоматически</SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name} ({employee.role === 'teacher' ? 'преподаватель' : 'администратор'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {action.recipient === 'employee' && (
                  <div className="space-y-2">
                    <Label>Получатель (сотрудник)</Label>
                    <Select
                      value={action.notifyEmployeeId || '__none__'}
                      onValueChange={(value) =>
                        updateAction(action.id, { notifyEmployeeId: value === '__none__' ? '' : value })
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Выберите сотрудника" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Не выбран</SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name} ({employee.role === 'teacher' ? 'преподаватель' : 'администратор'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(action.type === 'create_task' || action.type === 'assign_group') && (
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3">
                    <div className="space-y-2">
                      <Label>Задача</Label>
                      <Input
                        value={action.taskTitle}
                        onChange={(event) => updateAction(action.id, { taskTitle: event.target.value })}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Срок, дней</Label>
                      <Input
                        type="number"
                        min={0}
                        value={action.dueDays}
                        onChange={(event) => updateAction(action.id, { dueDays: Number(event.target.value) })}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Описание задачи</Label>
                      <Textarea
                        value={action.taskDescription}
                        onChange={(event) => updateAction(action.id, { taskDescription: event.target.value })}
                        className="min-h-[80px] rounded-xl"
                      />
                    </div>
                  </div>
                )}
                {['send_payment_reminder', 'send_sms', 'send_whatsapp', 'create_notification', 'publish_parent_notice'].includes(action.type) && (
                  <div className="space-y-2">
                    <Label>Текст сообщения</Label>
                    <Textarea
                      value={action.message}
                      onChange={(event) => updateAction(action.id, { message: event.target.value })}
                      className="min-h-[90px] rounded-xl"
                    />
                  </div>
                )}
                {action.type === 'change_client_status' && (
                  <div className="space-y-2">
                    <Label>Новый статус</Label>
                    <Select value={action.status || 'needs_attention'} onValueChange={(value) => updateAction(action.id, { status: value })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="needs_attention">Требует внимания</SelectItem>
                        <SelectItem value="payment_pending">Ожидает оплату</SelectItem>
                        <SelectItem value="ready_for_group">Готов к группе</SelectItem>
                        <SelectItem value="retention_risk">Риск ухода</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {action.type === 'add_tag' && (
                  <div className="space-y-2">
                    <Label>Теги через запятую</Label>
                    <Input
                      value={action.tags}
                      onChange={(event) => updateAction(action.id, { tags: event.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <Label>Название сценария</Label>
          <Input
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            placeholder={`${currentEvent.title}: ${draft.actions[0] ? actionByType.get(draft.actions[0].type)?.title : 'действие'}`}
            className="rounded-xl"
          />
        </div>
        <div className="rounded-2xl border border-[#133C2A]/10 p-4 space-y-4">
          <div>
            <p className="text-sm text-[#133C2A]/55">Раздел и событие</p>
            <p className="text-[#133C2A]">
              {currentScope.title} {'->'} {currentEvent.title}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#133C2A]/55">Запуск и условия</p>
            <div className="flex gap-2 flex-wrap mt-2">
              <Badge variant="outline" className="rounded-xl">{formatDelay(draft)}</Badge>
              {conditionSummary(draft).map((item) => (
                <Badge key={item} variant="outline" className="rounded-xl">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-[#133C2A]/55">Действия</p>
            <div className="space-y-2 mt-2">
              {draft.actions.map((action, index) => (
                <div key={action.id} className="flex items-center gap-2 text-sm text-[#133C2A]">
                  <Badge className="rounded-xl bg-[#133C2A]">{index + 1}</Badge>
                  <span>{actionByType.get(action.type)?.title || action.title}</span>
                  <span className="text-[#133C2A]/45">для</span>
                  <span>{action.recipient === 'parent' ? 'родителя' : action.recipient === 'owner' ? 'владельца' : 'сотрудника'}</span>
                  {(action.assigneeEmployeeId || action.notifyEmployeeId) && (
                    <span className="text-[#133C2A]/55">
                      ({employeeMap.get(action.assigneeEmployeeId || action.notifyEmployeeId || '')?.name || 'сотрудник не найден'})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[#133C2A] mb-2">Автоматизации</h1>
          <p className="text-[#133C2A]/60">Конструктор сценариев для процессов студии</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" className="rounded-2xl" onClick={() => void toggleAll(true)} disabled={isBulkUpdating}>
            <Power className="w-4 h-4 mr-2" />
            Включить
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={() => void toggleAll(false)} disabled={isBulkUpdating}>
            <Power className="w-4 h-4 mr-2" />
            Выключить
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={() => void refresh(true)} disabled={isRefreshing}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {isRefreshing ? 'Обновляем...' : 'Обновить'}
          </Button>
          <Button onClick={openCreate} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
            <Plus className="w-4 h-4 mr-2" />
            Создать сценарий
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <p className="text-sm text-[#133C2A]/60">Всего</p>
            <p className="text-3xl text-[#133C2A]">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <p className="text-sm text-[#133C2A]/60">Активные</p>
            <p className="text-3xl text-[#133C2A]">{stats.active}</p>
          </CardContent>
        </Card>
        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <p className="text-sm text-[#133C2A]/60">Цепочки</p>
            <p className="text-3xl text-[#133C2A]">{stats.workflows}</p>
          </CardContent>
        </Card>
        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <p className="text-sm text-[#133C2A]/60">Отключены</p>
            <p className="text-3xl text-[#133C2A]">{stats.disabled}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList className="rounded-2xl bg-white border border-[#133C2A]/10 w-full justify-start overflow-x-auto">
          <TabsTrigger value="rules" className="rounded-xl">Сценарии</TabsTrigger>
          <TabsTrigger value="catalog" className="rounded-xl">Карта процессов</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Правила
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#133C2A]/40" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Поиск по сценариям, разделам и действиям"
                    className="pl-9 rounded-xl"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                  <SelectTrigger className="rounded-xl">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="active">Активные</SelectItem>
                    <SelectItem value="disabled">Отключенные</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <p className="text-[#133C2A]/60">Загрузка...</p>
              ) : filteredRules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#133C2A]/20 p-6 text-center">
                  <Bell className="w-8 h-8 mx-auto text-[#133C2A]/40 mb-2" />
                  <p className="text-[#133C2A]">Сценариев по текущему фильтру нет</p>
                  <p className="text-sm text-[#133C2A]/55">Создайте первый сценарий через конструктор</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRules.map((rule) => {
                    const description = ruleDescription(rule);
                    return (
                      <div key={rule.id} className="rounded-2xl border border-[#133C2A]/10 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Bot className="w-4 h-4 text-[#133C2A]/70" />
                              <p className="text-[#133C2A]">{rule.name}</p>
                              <Badge variant={rule.isActive ? 'default' : 'outline'} className="rounded-xl">
                                {rule.isActive ? 'Активно' : 'Отключено'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="rounded-xl">{description.scope}</Badge>
                              <Badge variant="outline" className="rounded-xl">{description.trigger}</Badge>
                              <Badge variant="outline" className="rounded-xl">{description.details}</Badge>
                            </div>
                            <p className="text-sm text-[#133C2A]/70 line-clamp-2">{description.actions}</p>
                            <p className="text-xs text-[#133C2A]/50">
                              Обновлено: {new Date(rule.updatedAt || rule.createdAt).toLocaleString('ru-RU')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Switch checked={rule.isActive} onCheckedChange={() => void toggleRule(rule)} />
                            <Button size="sm" variant="outline" onClick={() => openEdit(rule)} className="rounded-xl" title="Редактировать">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void duplicateRule(rule)} className="rounded-xl" title="Дублировать">
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void remove(rule.id)} className="rounded-xl" title="Удалить">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catalog">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {scopes.map((scope) => {
              const Icon = scope.icon;
              return (
                <Card key={scope.key} className="border-none soft-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="w-10 h-10 rounded-2xl bg-[#133C2A]/10 flex items-center justify-center text-[#133C2A] shrink-0">
                        <Icon className="w-5 h-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[#133C2A]">{scope.title}</p>
                        <p className="text-sm text-[#133C2A]/60">{scope.description}</p>
                        <div className="flex gap-1 flex-wrap mt-3">
                          {scope.events.map((event) => (
                            <Badge key={event.key} variant="outline" className="rounded-xl">
                              {event.title}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-3xl w-[96vw] !max-w-[96vw] sm:!max-w-[96vw] xl:!max-w-[1240px] 2xl:!max-w-[1320px]">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">{draft.id ? 'Редактирование сценария' : 'Новый сценарий автоматизации'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {steps.map((item, index) => {
                const active = step === index;
                const done = step > index;
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setStep(index as WizardStep)}
                    className={`rounded-xl border px-3 py-2 text-left transition ${
                      active
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                        : done
                          ? 'border-[#133C2A]/20 bg-[#133C2A]/5'
                          : 'border-[#133C2A]/10'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm text-[#133C2A]">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${done ? 'bg-[#133C2A] text-white' : 'bg-white border border-[#133C2A]/15'}`}>
                        {done ? <Check className="w-3 h-3" /> : index + 1}
                      </span>
                      {item.title}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-[#133C2A]/60">{steps[step].description}</p>

            {renderStep()}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-2xl">
              Отмена
            </Button>
            <Button
              variant="outline"
              onClick={() => setStep((prev) => Math.max(0, prev - 1) as WizardStep)}
              className="rounded-2xl"
              disabled={step === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            {step < 4 ? (
              <Button onClick={goNext} className="rounded-2xl bg-[#133C2A]">
                Далее
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={() => void saveRule()} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" disabled={isSaving}>
                {isSaving ? 'Сохраняем...' : draft.id ? 'Сохранить' : 'Создать сценарий'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
