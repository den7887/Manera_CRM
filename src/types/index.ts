export type UserRole = 'parent' | 'teacher' | 'admin' | 'owner';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  avatar?: string;
}

// Landing Settings Types
export interface LandingTeacher {
  id: string;
  name: string;
  role: string;
  experience: string;
  specialization: string;
  achievements: string;
  emoji: string;
}

export interface LandingTestimonial {
  id: string;
  name: string;
  role: string;
  rating: number;
  text: string;
  image: string;
}

export interface LandingGalleryImage {
  id: string;
  url: string;
  alt: string;
}

export interface LandingContactInfo {
  phone: string;
  email: string;
  address: string;
  metro: string;
  workingHours: {
    weekdays: string;
    weekends: string;
  };
  instagram: string;
  mapEmbedUrl: string;
}

export interface LandingHeroContent {
  badge: string;
  title: string;
  subtitle: string;
  heroImageUrl: string;
  stats: {
    rating: string;
    students: string;
  };
}

export interface LandingAboutContent {
  title: string;
  description: string;
}

export interface LandingVideoContent {
  title: string;
  subtitle: string;
  description: string;
  thumbnailUrl: string;
  videoUrl?: string;
}

export interface LandingSettings {
  hero: LandingHeroContent;
  about: LandingAboutContent;
  benefits: string[];
  teachers: LandingTeacher[];
  testimonials: LandingTestimonial[];
  gallery: LandingGalleryImage[];
  video: LandingVideoContent;
  contact: LandingContactInfo;
}

// Типы абонементов (продуктов)
export type ProductType = 'individual' | 'group';
export type AgeGroup = 'kids_3_6' | 'kids_7_10' | 'teens_11_14' | 'teens_15_17' | 'adults_18plus' | 'all_ages';
export type DanceLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional' | 'all_levels';

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  description: string;
  price: number;
  classesCount: number; // Количество занятий в абонементе
  validityDays: number; // Срок действия абонемента в днях
  ageGroup: AgeGroup;
  level: DanceLevel;
  isActive: boolean; // Активен ли продукт (показывается клиентам)
  features: string[]; // Особенности/преимущества (например, "Индивидуальный подход", "Малые группы")
  discountPercent?: number; // Процент скидки, если есть
  originalPrice?: number; // Оригинальная цена до скидки
  maxStudents?: number; // Максимальное количество учеников (для групповых)
  durationMinutes?: number; // Длительность одного занятия в минутах
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationType = 'trial_class' | 'payment' | 'attendance' | 'general';
export type NotificationPriority = 'low' | 'medium' | 'high';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  additionalInfo?: string;
  highlightedData?: {
    parentName?: string;
    parentPhone?: string;
  };
  createdAt: Date;
  forRoles: UserRole[]; // Для каких ролей это уведомление
  metadata?: any; // Дополнительные данные из формы
  read?: boolean;
  readAt?: Date;
}

export interface Child {
  id: string;
  name: string;
  age: number;
  photo?: string;
  groupId: string;
  groupName: string;
  progress: number;
  parentId: string;
  subscriptionId: string;
  subscriptionName: string;
  totalClasses: number;
  remainingClasses: number;
  attendedClasses: number;
  purchaseDate: Date;
  adminNotes?: string; // Заметки администратора, видимые родителям
}

export interface Group {
  id: string;
  name: string;
  ageRange: string;
  teacherId: string;
  teacherName: string;
  studentCount: number;
  schedule: string;
  color: string;
}

export interface Event {
  id: string;
  title: string;
  groupId: string;
  groupName: string;
  date: Date;
  startTime: string;
  endTime: string;
  teacherId: string;
  teacherName: string;
  attendance?: { studentId: string; present: boolean }[];
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  date: Date;
  status: 'paid' | 'pending' | 'waiting_confirmation' | 'overdue' | 'unpaid' | 'failed' | 'refunded' | 'cancelled' | 'expired';
  type: 'subscription' | 'single';
  description: string;
  paymentMethod?: 'cash' | 'online' | 'sbp_manual';
  paidAt?: Date;
  paymentReference?: string;
  paymentComment?: string;
  paymentUrl?: string;
  provider?: string;
  userConfirmedAt?: Date;
  invoiceNumber?: string;
  dueDate?: Date;
  reminderCount?: number;
  lastReminderAt?: Date;
}

export interface Subscription {
  id: string;
  name: string;
  price: number;
  duration: string;
  lessonsCount: number;
  features: string[];
}

export interface News {
  id: string;
  title: string;
  content: string;
  date: Date;
  image?: string;
  published: boolean;
  // Поля для мероприятий с взносами
  isEvent?: boolean; // Является ли мероприятием (конкурс, концерт, мастер-класс)
  eventType?: 'competition' | 'concert' | 'masterclass' | 'other'; // Тип мероприятия
  eventDate?: Date; // Дата проведения мероприятия
  eventLocation?: string; // Место проведения
  eventFee?: number; // Взнос за участие
  eventDeadline?: Date; // Дедлайн для оплаты взноса
  requiresPayment?: boolean; // Требуется ли оплата
  maxParticipants?: number; // Максимальное количество участников
  currentParticipants?: number; // Текущее количество участников
  eventParticipants?: EventParticipant[]; // Список участников с их статусами
}

// Статусы участников мероприятий
export type EventParticipantStatus = 'viewed' | 'interested' | 'paid';

export interface EventParticipant {
  id: string;
  parentId: string; // ID родителя
  parentName: string;
  parentPhone: string;
  childId?: string; // ID ребенка (если применимо)
  childName?: string;
  status: EventParticipantStatus;
  viewedAt?: Date; // Когда просмотрел
  respondedAt?: Date; // Когда откликнулся
  paidAt?: Date; // Когда оплатил
  paidAmount?: number; // Сумма оплаты
  notes?: string; // Заметки
}

export interface Employee {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone: string;
  avatar?: string;
  lastLogin?: Date;
  groupsAssigned?: number;
  status: 'active' | 'inactive';
  birthDate?: Date;
  permissions?: string[]; // Список разрешенных функций
  experience?: string; // Опыт работы
  location?: string; // Место жительства
}

export interface FinanceStats {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  revenueGrowth: number;
  churnRate: number;
  trialConversion: number;
}

// Аналитические метрики
export interface RetentionData {
  period: string; // '3 months', '6 months', '12 months'
  retentionRate: number; // процент удержания
  totalStudents: number; // всего учеников в начале периода
  retainedStudents: number; // осталось учеников
  leftStudents: number; // ушло учеников
}

export interface ChurnAnalysis {
  month: string;
  churnRate: number; // процент оттока за месяц
  newStudents: number; // новых учеников
  leftStudents: number; // ушедших учеников
  totalStudents: number; // всего на конец месяца
}

export interface ChurnReason {
  reason: string;
  count: number;
  percentage: number;
}

// LTV и ARPU метрики
export interface LTVData {
  month: string;
  ltv: number; // средний LTV
  arpu: number; // средний доход на пользователя
}

export interface CustomerSegmentValue {
  segment: string; // 'VIP', 'Стандарт', 'Новички'
  ltv: number;
  arpu: number;
  studentCount: number;
  avgMonthsStaying: number; // среднее время обучения в месяцах
}

// Метрики заполняемости групп
export interface GroupCapacityData {
  groupId: string;
  groupName: string;
  currentStudents: number;
  maxCapacity: number;
  fillPercentage: number;
  trend: 'up' | 'down' | 'stable'; // тренд заполняемости
  waitlist: number; // количество в листе ожидания
}

export interface CapacityTrend {
  month: string;
  avgFillPercentage: number; // средняя заполняемость всех групп
  totalStudents: number;
  totalCapacity: number;
}

export interface TimeSlotOccupancy {
  timeSlot: string; // '10:00', '12:00', '18:00'
  dayOfWeek: string; // 'Пн', 'Вт', 'Ср'
  occupancy: number; // процент заполняемости в это время
  groupsCount: number; // количество групп в это время
}

// Метрики прогнозирования выручки
export interface RevenueForecast {
  month: string;
  actualRevenue: number | null; // фактическая выручка (null для будущих месяцев)
  forecastRevenue: number; // прогнозируемая выручка
  pessimistic: number; // пессимистичный прогноз
  optimistic: number; // оптимистичный прогноз
}

export interface RevenueSource {
  source: string; // 'Абонементы', 'Разовые занятия', 'Мероприятия'
  currentMonth: number; // выручка в текущем месяце
  forecastNextMonth: number; // прогноз на следующий месяц
  percentage: number; // доля в общей выручке
}

export interface SubscriptionForecast {
  type: string; // 'Безлимит', '8 занятий', '4 занятия'
  activeCount: number; // активных абонементов
  renewalRate: number; // процент продления
  expectedRevenue: number; // ожидаемая выручка
}

// Метрики источников лидов и маркетинга
export interface LeadSource {
  source: string; // 'Instagram', 'Google', 'Сарафанное радио', 'VK', 'Сайт'
  leadsCount: number; // количество лидов
  percentage: number; // процент от всех лидов
  convertedCount: number; // сколько конвертировалось в клиентов
  conversionRate: number; // процент конверсии
}

export interface MarketingROI {
  channel: string; // канал маркетинга
  investment: number; // вложения
  revenue: number; // полученная выручка
  roi: number; // возврат инвестиций в процентах
  cac: number; // стоимость привлечения клиента
  customersAcquired: number; // привлечено клиентов
}

export interface ConversionFunnel {
  stage: string; // этап воронки
  count: number; // количество на этом этапе
  conversionRate: number; // процент конверсии на следующий этап
}

export interface LeadSourceTrend {
  month: string;
  instagram: number;
  google: number;
  referral: number; // сарафанное радио
  other: number;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

// Категории расходов
export type ExpenseCategory = 
  | 'rent' // Аренда
  | 'salaries' // Зарплаты
  | 'utilities' // Коммунальные услуги
  | 'equipment' // Оборудование
  | 'marketing' // Маркетинг и реклама
  | 'materials' // Материалы и костюмы
  | 'maintenance' // Обслуживание и ремонт
  | 'taxes' // Налоги и сборы
  | 'insurance' // Страхование
  | string; // Пользовательские категории

// Расход
export interface Expense {
  id: string;
  category: ExpenseCategory;
  customCategoryName?: string; // Название пользовательской категории
  amount: number;
  date: Date;
  description: string;
  paymentMethod?: 'cash' | 'card' | 'transfer'; // Способ оплаты
  recipientName?: string; // Получатель платежа
  notes?: string; // Дополнительные заметки
  createdBy: string; // ID создателя (владелец)
  createdByName: string; // Имя создателя
  createdAt: Date;
  attachments?: string[]; // URL прикрепленных документов (чеки, счета)
}

// Пользовательская категория расходов
export interface CustomExpenseCategory {
  id: string;
  name: string;
  icon?: string; // Название иконки из lucide-react
  color?: string; // Цвет категории
  createdAt: Date;
}

export interface Student {
  id: string;
  name: string;
  birthDate: Date;
  groupId: string;
  attendedClasses: number;
  totalClasses: number;
  missedClasses: number;
  startDate: Date; // Дата начала посещения танцев
  parentName: string;
  parentPhone: string;
  notes?: string; // Примечания преподавателя
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'done'; // Изменено на todo/done
export type TaskType = 'payment' | 'student' | 'schedule' | 'communication' | 'general' | 'system';

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeId: string; // ID исполнителя (администратора или преподавателя)
  assigneeName: string; // Имя исполнителя
  createdBy: string; // ID создателя (владелец или система)
  createdByName: string; // Ия создателя
  createdAt: Date;
  dueDate?: Date;
  scheduledDate?: Date; // Дата, когда задача должна стать активной (для отложенных задач)
  completedAt?: Date;
  relatedUserId?: string; // ID связанного клиента (родителя)
  relatedUserName?: string; // Имя связанного клиента
  relatedChildId?: string; // ID связанного ребенка
  relatedChildName?: string; // Имя связанного ребенка
  notes?: string;
  assigneeComment?: string; // Комментарий исполнителя
  ownerComment?: string; // Комментарий владельца
  isAutoGenerated: boolean;
}

// Триггеры автоматизации
export type AutomationTrigger = 
  | 'user.created'
  | 'subscription.activated'
  | 'subscription.visits_running_low'
  | 'subscription.finished'
  | 'subscription.expired'
  // 🎯 Триггеры для лидов (база клиентов)
  | 'lead.created'
  | 'lead.contact_date_reached'
  | 'lead.contact_overdue'
  | 'lead.status_changed.scheduled'
  | 'lead.status_changed.visited'
  | 'lead.status_changed.thinking'
  | 'lead.status_changed.waiting_discount'
  | 'lead.status_changed.converted'
  | 'lead.status_changed.rejected'
  | 'lead.status_changed.returned'
  // 🎂 Триггеры для дней рождений
  | 'birthday.student.today'
  | 'birthday.student.upcoming'
  | 'birthday.parent.today'
  | 'birthday.parent.upcoming';

// ипы действий автоматизации
export type AutomationActionType = 
  | 'create_task'
  | 'send_email'
  | 'send_sms'
  | 'send_whatsapp'
  | 'create_notification'
  | 'change_lead_status'
  | 'add_tag';

// Параметры действия "Создать задачу"
export interface CreateTaskActionParams {
  title: string; // Может содержать плейсхолдеры: {user.name}, {child.first_name}, {product.name}, {visits_left}
  description: string; // Может содержать плейсхолдеры
  dueDateOffsetDays: number; // Срок выполнения через N дней
  assigneeId: string; // ID сотрудника, на которого назначается задача
  priority?: 'urgent' | 'high' | 'medium' | 'low'; // Приоритет задачи (опционально)
}

// Параметры действия "Отправить Email"
export interface SendEmailActionParams {
  to: 'lead' | 'parent' | 'custom'; // Кому отправить
  customEmail?: string; // Если to === 'custom'
  subject: string; // Тема письма (может содержать плейсхолдеры)
  body: string; // Текст письма (может содержать плейсхолдеры)
  templateId?: string; // ID шаблона письма (опционально)
}

// Параметры действия "Отправить SMS"
export interface SendSmsActionParams {
  to: 'lead' | 'parent' | 'custom'; // Кому отправить
  customPhone?: string; // Если to === 'custom'
  message: string; // Ткст SMS (может содержать плейсхолдеры)
  templateId?: string; // ID шаблона SMS (опционально)
}

// Параметры действия "Отправить WhatsApp"
export interface SendWhatsAppActionParams {
  to: 'lead' | 'parent' | 'custom'; // Кому отправить
  customPhone?: string; // Если to === 'custom'
  message: string; // Текст сообщения (может содержать плейсхолдеры)
  templateId?: string; // ID шаблона сообщения (опционально)
}

// Параметры действия "Создать уведомление"
export interface CreateNotificationActionParams {
  title: string; // Заголовок уведомления (может содержать плейсхолдеры)
  message: string; // Текст уведомления (может содержать плейсхолдеры)
  recipientId: string; // ID получателя (сотрудник)
  type: 'info' | 'warning' | 'success' | 'error'; // Тип уведомления
}

// Параметры действия "Изменить статус лид"
export interface ChangeLeadStatusActionParams {
  newStatus: 'new' | 'contacted' | 'scheduled' | 'visited' | 'thinking' | 'callback' | 'waiting_discount' | 'converted' | 'rejected' | 'returned'; // Новый статус
  addNote?: string; // Добавить заметку (может содержать плейсхолдеры)
}

// Параметры действия "Добавить тег"
export interface AddTagActionParams {
  tags: string[]; // Список тегов для добавления
  createIfNotExists: boolean; // Создать тег, если его нет
}

// Объединенный тип параметров действий
export type AutomationActionParams = 
  | CreateTaskActionParams
  | SendEmailActionParams
  | SendSmsActionParams
  | SendWhatsAppActionParams
  | CreateNotificationActionParams
  | ChangeLeadStatusActionParams
  | AddTagActionParams;

// Правило автоматизации
export interface AutomationRule {
  id: string;
  name: string;
  triggerKey: AutomationTrigger;
  actionType: AutomationActionType;
  actionParams: AutomationActionParams;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Документы
export type DocumentCategory = 
  | 'contract' // Договоры
  | 'policy' // Политики и правила
  | 'instruction' // Инструкции
  | 'template' // Шаблоны
  | 'certificate' // Сертификаты и лицензии
  | 'report' // Отчеты
  | 'checklist' // Чек-листы
  | 'other'; // Прочее

export type DocumentAccessType = 'all' | 'employees' | 'parents' | 'specific';

export interface Document {
  id: string;
  name: string;
  description?: string;
  category: DocumentCategory;
  fileName: string;
  fileType: string; // например: 'pdf', 'docx', 'xlsx', 'jpg', 'png'
  fileSize: number; // размер в байтах
  fileUrl: string; // URL файла или base64
  accessType: DocumentAccessType; // Тип доступа
  assignedEmployees: string[]; // ID сотрудников, которым доступен документ
  assignedParents: string[]; // ID родителей, которым доступен документ
  createdBy: string; // ID создателя
  createdByName: string; // Имя создателя
  createdAt: Date;
  updatedAt: Date;
  tags?: string[]; // Теги для дополнительной фильтрации
  checklistItems?: string[]; // Элементы чек-листа (только для category === 'checklist')
}
