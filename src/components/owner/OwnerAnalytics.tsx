import { TrendingUp, Users, Calendar, DollarSign, Target, Award, BarChart3, PieChart, TrendingDown, UserMinus, UserPlus, AlertCircle, Wallet, CreditCard, Activity, Clock, LineChart as LineChartIcon, Sparkles, Share2, ExternalLink, Building2, TrendingUpIcon, Download, Filter, FileText, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { FinanceStats, MonthlyData, Employee, Group, RetentionData, ChurnAnalysis, ChurnReason, LTVData, CustomerSegmentValue, GroupCapacityData, CapacityTrend, TimeSlotOccupancy, RevenueForecast, RevenueSource, SubscriptionForecast, LeadSource, MarketingROI, ConversionFunnel, LeadSourceTrend } from '../../types';
import { LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Funnel, FunnelChart } from 'recharts';
import { toast } from 'sonner@2.0.3';
import { useState } from 'react';

interface OwnerAnalyticsProps {
  stats: FinanceStats;
  monthlyData: MonthlyData[];
  employees: Employee[];
  groups: Group[];
}

export function OwnerAnalytics({ stats, monthlyData, employees, groups }: OwnerAnalyticsProps) {
  const [period, setPeriod] = useState('6months');
  
  const totalStudents = groups.reduce((sum, g) => sum + g.studentCount, 0);
  const totalTeachers = employees.filter(e => e.role === 'teacher').length;

  // Функция экспорта в PDF
  const handleExportPDF = () => {
    toast.success('Отчёт экспортируется в PDF...', {
      description: 'Скачивание начнётся через несколько секунд',
      duration: 3000,
    });
  };

  // Функция экспорта в Excel
  const handleExportExcel = () => {
    toast.success('Отчёт экспортируется в Excel...', {
      description: 'Скачивание начнётся через несколько секунд',
      duration: 3000,
    });
  };

  // Функция применения фильтра
  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    const periodNames: { [key: string]: string } = {
      '7days': 'Последние 7 дней',
      '30days': 'Последние 30 дней',
      '3months': 'Последние 3 месяца',
      '6months': 'Последние 6 месяцев',
      '1year': 'Последний год',
      'all': 'Всё время',
    };
    toast.info(`Период изменён: ${periodNames[value]}`, {
      duration: 2000,
    });
  };

  // Мок-данные для Retention & Churn
  const retentionData = [
    { month: 'Янв', retentionRate: 85 },
    { month: 'Фев', retentionRate: 87 },
    { month: 'Мар', retentionRate: 83 },
    { month: 'Апр', retentionRate: 89 },
    { month: 'Май', retentionRate: 91 },
    { month: 'Июн', retentionRate: 90 },
  ];

  const churnAnalysis = [
    { month: 'Янв', churnRate: 15, newStudents: 8, leftStudents: 5, totalStudents: 45 },
    { month: 'Фев', churnRate: 13, newStudents: 10, leftStudents: 4, totalStudents: 51 },
    { month: 'Мар', churnRate: 17, newStudents: 6, leftStudents: 7, totalStudents: 50 },
    { month: 'Апр', churnRate: 11, newStudents: 12, leftStudents: 3, totalStudents: 59 },
    { month: 'Май', churnRate: 9, newStudents: 9, leftStudents: 2, totalStudents: 66 },
    { month: 'Июн', churnRate: 10, newStudents: 7, leftStudents: 3, totalStudents: 70 },
  ];

  const churnReasons = [
    { reason: 'Переезд в другой город', count: 8, percentage: 32 },
    { reason: 'Высокая цена', count: 7, percentage: 28 },
    { reason: 'Неудобное расписание', count: 5, percentage: 20 },
    { reason: 'Потеря интереса', count: 3, percentage: 12 },
    { reason: 'Другое', count: 2, percentage: 8 },
  ];

  // Мок-данные для LTV и ARPU
  const ltvData: LTVData[] = [
    { month: 'Янв', ltv: 18500, arpu: 4200 },
    { month: 'Фев', ltv: 19200, arpu: 4350 },
    { month: 'Мар', ltv: 20100, arpu: 4500 },
    { month: 'Апр', ltv: 21300, arpu: 4650 },
    { month: 'Май', ltv: 22800, arpu: 4800 },
    { month: 'Июн', ltv: 24500, arpu: 5000 },
  ];

  const customerSegments: CustomerSegmentValue[] = [
    { 
      segment: 'VIP клиенты', 
      ltv: 45000, 
      arpu: 7500, 
      studentCount: 12,
      avgMonthsStaying: 18 
    },
    { 
      segment: 'Стандарт', 
      ltv: 22000, 
      arpu: 4800, 
      studentCount: 42,
      avgMonthsStaying: 12 
    },
    { 
      segment: 'Новички', 
      ltv: 8500, 
      arpu: 3200, 
      studentCount: 16,
      avgMonthsStaying: 4 
    },
  ];

  // Расчет средних значений LTV и ARPU
  const avgLTV = ltvData.length > 0 
    ? Math.round(ltvData.reduce((sum, d) => sum + d.ltv, 0) / ltvData.length)
    : 0;
  
  const avgARPU = ltvData.length > 0 
    ? Math.round(ltvData.reduce((sum, d) => sum + d.arpu, 0) / ltvData.length)
    : 0;

  // Мок-данные для заполняемости групп
  const groupCapacityData: GroupCapacityData[] = groups.map((group) => {
    const maxCapacity = 15;
    const fillPercentage = Math.round((group.studentCount / maxCapacity) * 100);
    return {
      groupId: group.id,
      groupName: group.name,
      currentStudents: group.studentCount,
      maxCapacity: maxCapacity,
      fillPercentage: fillPercentage,
      trend: fillPercentage >= 80 ? 'up' : fillPercentage >= 50 ? 'stable' : 'down',
      waitlist: fillPercentage >= 90 ? Math.floor(Math.random() * 5) + 1 : 0,
    };
  });

  const capacityTrend: CapacityTrend[] = [
    { month: 'Янв', avgFillPercentage: 65, totalStudents: 45, totalCapacity: 75 },
    { month: 'Фев', avgFillPercentage: 68, totalStudents: 51, totalCapacity: 75 },
    { month: 'Мар', avgFillPercentage: 67, totalStudents: 50, totalCapacity: 75 },
    { month: 'Апр', avgFillPercentage: 79, totalStudents: 59, totalCapacity: 75 },
    { month: 'Май', avgFillPercentage: 88, totalStudents: 66, totalCapacity: 75 },
    { month: 'Июн', avgFillPercentage: 93, totalStudents: 70, totalCapacity: 75 },
  ];

  const timeSlotOccupancy: TimeSlotOccupancy[] = [
    { timeSlot: '10:00', dayOfWeek: 'Пн-Пт', occupancy: 45, groupsCount: 1 },
    { timeSlot: '12:00', dayOfWeek: 'Пн-Пт', occupancy: 60, groupsCount: 1 },
    { timeSlot: '16:00', dayOfWeek: 'Пн-Пт', occupancy: 85, groupsCount: 2 },
    { timeSlot: '18:00', dayOfWeek: 'Пн-Пт', occupancy: 95, groupsCount: 2 },
    { timeSlot: '10:00', dayOfWeek: 'Сб-Вс', occupancy: 80, groupsCount: 2 },
    { timeSlot: '12:00', dayOfWeek: 'Сб-Вс', occupancy: 90, groupsCount: 2 },
  ];

  // Расчёт средней заполняемости
  const avgCapacity = groupCapacityData.length > 0
    ? Math.round(groupCapacityData.reduce((sum, g) => sum + g.fillPercentage, 0) / groupCapacityData.length)
    : 0;

  // Мок-данные для прогноза выручки
  const revenueForecast: RevenueForecast[] = [
    { month: 'Янв', actualRevenue: 280000, forecastRevenue: 280000, pessimistic: 260000, optimistic: 300000 },
    { month: 'Фев', actualRevenue: 295000, forecastRevenue: 295000, pessimistic: 275000, optimistic: 315000 },
    { month: 'Мар', actualRevenue: 310000, forecastRevenue: 310000, pessimistic: 290000, optimistic: 330000 },
    { month: 'Апр', actualRevenue: 340000, forecastRevenue: 340000, pessimistic: 320000, optimistic: 360000 },
    { month: 'Май', actualRevenue: 370000, forecastRevenue: 370000, pessimistic: 350000, optimistic: 390000 },
    { month: 'Июн', actualRevenue: 390000, forecastRevenue: 390000, pessimistic: 370000, optimistic: 410000 },
    { month: 'Июл', actualRevenue: null, forecastRevenue: 410000, pessimistic: 385000, optimistic: 435000 },
    { month: 'Авг', actualRevenue: null, forecastRevenue: 430000, pessimistic: 400000, optimistic: 460000 },
    { month: 'Сен', actualRevenue: null, forecastRevenue: 455000, pessimistic: 425000, optimistic: 485000 },
  ];

  const revenueSources: RevenueSource[] = [
    { source: 'Абонементы', currentMonth: 320000, forecastNextMonth: 350000, percentage: 82 },
    { source: 'Разовые занятия', currentMonth: 50000, forecastNextMonth: 45000, percentage: 13 },
    { source: 'Мероприятия', currentMonth: 20000, forecastNextMonth: 15000, percentage: 5 },
  ];

  const subscriptionForecast: SubscriptionForecast[] = [
    { type: 'Безлимит', activeCount: 28, renewalRate: 85, expectedRevenue: 182000 },
    { type: '8 занятий', activeCount: 32, renewalRate: 75, expectedRevenue: 144000 },
    { type: '4 занятия', activeCount: 10, renewalRate: 60, expectedRevenue: 24000 },
  ];

  // Расчёт прогнозной выручки на следующий месяц
  const nextMonthForecast = revenueForecast.find(r => r.actualRevenue === null);
  const nextMonthRevenue = nextMonthForecast ? nextMonthForecast.forecastRevenue : 0;

  // Мок-данные для источников лидов
  const leadSources: LeadSource[] = [
    { source: 'Instagram', leadsCount: 45, percentage: 45, convertedCount: 18, conversionRate: 40 },
    { source: 'Сарафанное радио', leadsCount: 25, percentage: 25, convertedCount: 15, conversionRate: 60 },
    { source: 'Google', leadsCount: 15, percentage: 15, convertedCount: 5, conversionRate: 33 },
    { source: 'VK', leadsCount: 10, percentage: 10, convertedCount: 3, conversionRate: 30 },
    { source: 'Сайт', leadsCount: 5, percentage: 5, convertedCount: 2, conversionRate: 40 },
  ];

  const marketingROI: MarketingROI[] = [
    { channel: 'Instagram реклама', investment: 25000, revenue: 180000, roi: 620, cac: 1389, customersAcquired: 18 },
    { channel: 'Google Ads', investment: 15000, revenue: 75000, roi: 400, cac: 3000, customersAcquired: 5 },
    { channel: 'VK реклама', investment: 8000, revenue: 45000, roi: 463, cac: 2667, customersAcquired: 3 },
    { channel: 'Сарафанное радио', investment: 0, revenue: 225000, roi: 0, cac: 0, customersAcquired: 15 },
  ];

  const conversionFunnel: ConversionFunnel[] = [
    { stage: 'Заявки', count: 100, conversionRate: 75 },
    { stage: 'Контакт установлен', count: 75, conversionRate: 67 },
    { stage: 'Запланировано пробное', count: 50, conversionRate: 80 },
    { stage: 'Пришли на пробное', count: 40, conversionRate: 53 },
    { stage: 'Купили абонемент', count: 21, conversionRate: 100 },
  ];

  const leadSourceTrend: LeadSourceTrend[] = [
    { month: 'Янв', instagram: 35, google: 12, referral: 20, other: 8 },
    { month: 'Фев', instagram: 38, google: 14, referral: 22, other: 9 },
    { month: 'Мар', instagram: 42, google: 15, referral: 24, other: 10 },
    { month: 'Апр', instagram: 45, google: 15, referral: 25, other: 12 },
    { month: 'Май', instagram: 48, google: 16, referral: 26, other: 13 },
    { month: 'Июн', instagram: 45, google: 15, referral: 25, other: 15 },
  ];

  // Расчёт общего количества лидов и конверсии
  const totalLeads = leadSources.reduce((sum, source) => sum + source.leadsCount, 0);
  const totalConverted = leadSources.reduce((sum, source) => sum + source.convertedCount, 0);
  const overallConversionRate = totalLeads > 0 ? Math.round((totalConverted / totalLeads) * 100) : 0;

  // НОВЫЕ АНАЛИТИЧЕСКИЕ ДАННЫЕ

  // Посещаемость занятий
  const attendanceData = [
    { month: 'Янв', attendanceRate: 82, avgStudentsPresent: 37, totalClasses: 96 },
    { month: 'Фев', attendanceRate: 85, avgStudentsPresent: 43, totalClasses: 96 },
    { month: 'Мар', attendanceRate: 79, avgStudentsPresent: 40, totalClasses: 104 },
    { month: 'Апр', attendanceRate: 88, avgStudentsPresent: 52, totalClasses: 104 },
    { month: 'Май', attendanceRate: 91, avgStudentsPresent: 60, totalClasses: 112 },
    { month: 'Июн', attendanceRate: 87, avgStudentsPresent: 61, totalClasses: 112 },
  ];

  // Средняя посещаемость
  const avgAttendance = attendanceData.length > 0 
    ? Math.round(attendanceData.reduce((sum, d) => sum + d.attendanceRate, 0) / attendanceData.length)
    : 0;

  // Финансовые показатели
  const financialMetrics = {
    avgCheck: 4650,
    profitMargin: 42,
    debtors: 18500,
    debtorsCount: 3,
    totalRevenue: 390000,
    totalExpenses: 226200,
    netProfit: 163800,
    breakEvenPoint: 185000,
  };

  // Структура расходов
  const expenseBreakdown = [
    { category: 'Зарплата', amount: 145000, percentage: 64 },
    { category: 'Аренда', amount: 50000, percentage: 22 },
    { category: 'Маркетинг', amount: 18000, percentage: 8 },
    { category: 'Коммунальные', amount: 8200, percentage: 4 },
    { category: 'Прочее', amount: 5000, percentage: 2 },
  ];

  // Сравнение периодов
  const periodComparison = {
    studentsGrowth: 24,
    revenueGrowth: 39,
    attendanceChange: 5,
    newStudents: 15,
    churnedStudents: 3,
  };

  // NPS и удовлетворённость
  const satisfactionMetrics = {
    nps: 68,
    promoters: 52,
    passives: 32,
    detractors: 16,
    avgRating: 4.6,
    reviewsCount: 38,
  };

  // Рейтинг преподавателей
  const teacherRatings = employees
    .filter(e => e.role === 'teacher')
    .map(teacher => ({
      name: teacher.name.split(' ')[0],
      rating: (Math.random() * (5 - 4.2) + 4.2).toFixed(1),
      reviewsCount: Math.floor(Math.random() * 20) + 5,
      attendance: Math.floor(Math.random() * 15) + 80,
      retention: Math.floor(Math.random() * 15) + 80,
    }));

  // Пробные занятия
  const trialLessons = [
    { month: 'Янв', scheduled: 18, attended: 14, converted: 8 },
    { month: 'Фев', scheduled: 22, attended: 18, converted: 11 },
    { month: 'Мар', scheduled: 19, attended: 15, converted: 9 },
    { month: 'Апр', scheduled: 25, attended: 21, converted: 13 },
    { month: 'Май', scheduled: 28, attended: 23, converted: 15 },
    { month: 'Июн', scheduled: 24, attended: 20, converted: 12 },
  ];

  // Сезонность (сравнение по месяцам за год)
  const seasonalityData = [
    { month: 'Янв', students2023: 45, students2024: 45, revenue2023: 210000, revenue2024: 280000 },
    { month: 'Фев', students2023: 48, students2024: 51, revenue2023: 225000, revenue2024: 295000 },
    { month: 'Мар', students2023: 52, students2024: 50, revenue2023: 240000, revenue2024: 310000 },
    { month: 'Апр', students2023: 55, students2024: 59, revenue2023: 255000, revenue2024: 340000 },
    { month: 'Май', students2023: 58, students2024: 66, revenue2023: 270000, revenue2024: 370000 },
    { month: 'Июн', students2023: 56, students2024: 70, revenue2023: 260000, revenue2024: 390000 },
  ];

  // Долги по абонементам
  const debtorsList = [
    { parentName: 'Мария Сидорова', studentName: 'Алиса Сидорова', amount: 6500, daysOverdue: 5 },
    { parentName: 'Дмитрий Кузнецов', studentName: 'Макар Кузнецов', amount: 8000, daysOverdue: 12 },
    { parentName: 'Елена Морозова', studentName: 'София Морозова', amount: 4000, daysOverdue: 3 },
  ];

  // ПРОГНОЗ ОТТОКА И РЕКОМЕНДАЦИИ

  // Прогноз риска ухода клиентов
  const churnRiskClients = [
    { 
      parentName: 'Дмитрий Кузнецов', 
      studentName: 'Макар Кузнецов', 
      riskScore: 85, 
      reasons: ['Пропущено 4 занятия подряд', 'Просрочка оплаты 12 дней', 'Низкая активность в чате'],
      groupName: 'Современная хореография 12+',
      lastAttendance: '7 дней назад',
      subscriptionEnds: '3 дня'
    },
    { 
      parentName: 'Ольга Петрова', 
      studentName: 'Даша Петрова', 
      riskScore: 72, 
      reasons: ['Посещаемость упала до 50%', 'Не продлила абонемент вовремя', 'Отрицательная динамика'],
      groupName: 'Балет 8-10 лет',
      lastAttendance: '3 дня назад',
      subscriptionEnds: '5 дней'
    },
    { 
      parentName: 'Анна Волкова', 
      studentName: 'Лиза Волкова', 
      riskScore: 68, 
      reasons: ['Пропущено 3 занятия', 'Жалоба на расписание', 'Низкая вовлечённость'],
      groupName: 'Hip-Hop Kids 10-12',
      lastAttendance: '5 дней назад',
      subscriptionEnds: '10 дней'
    },
    { 
      parentName: 'Елена Смирнова', 
      studentName: 'Максим Смирнов', 
      riskScore: 55, 
      reasons: ['Редкая посещаемость', 'Не отвечает на сообщения'],
      groupName: 'Contemporary 14+',
      lastAttendance: '4 дня назад',
      subscriptionEnds: '7 дней'
    },
  ];

  // Рекомендации по оптимизации
  const optimizationRecommendations = [
    {
      id: 1,
      priority: 'high',
      category: 'Удержание',
      title: 'Срочно: 4 клиента в зоне риска',
      description: 'Выявлено 4 ученика с высоким риском ухода (65%+). Рекомендуется персональный контакт в ближайшие 48 часов.',
      impact: 'Потенциальная потеря 32,000 ₽/мес',
      action: 'Связаться с родителями',
      icon: AlertCircle,
      color: 'red'
    },
    {
      id: 2,
      priority: 'high',
      category: 'Финансы',
      title: 'Низкая рентабельность группы "Балет 6-8 лет"',
      description: 'Группа заполнена только на 40% при высоких затратах на преподавателя. Рентабельность всего 18%.',
      impact: 'Потенциальная оптимизация: +15,000 ₽/мес',
      action: 'Увеличить набор или объединить группы',
      icon: TrendingDown,
      color: 'orange'
    },
    {
      id: 3,
      priority: 'medium',
      category: 'Маркетинг',
      title: 'Instagram даёт лучший ROI (620%)',
      description: 'Instagram реклама показывает в 2 раза лучший ROI, чем другие каналы. Рекомендуется увеличить бюджет.',
      impact: 'Прогноз: +8 учеников/мес, +45,000 ₽',
      action: 'Увеличить бюджет на 50%',
      icon: TrendingUp,
      color: 'green'
    },
    {
      id: 4,
      priority: 'medium',
      category: 'Операции',
      title: 'Пробные занятия: низкая конверсия в четверг',
      description: 'По четвергам конверсия пробных занятий на 30% ниже среднего. Возможно, неудачное время или преподаватель.',
      impact: 'Потеря 2-3 клиентов/мес',
      action: 'Изменить расписание или преподавателя',
      icon: Calendar,
      color: 'yellow'
    },
    {
      id: 5,
      priority: 'medium',
      category: 'Ценообразование',
      title: 'Средний чек на 15% ниже рынка',
      description: 'Анализ конкурентов показывает, что можно увеличить цены на 10-15% без риска оттока.',
      impact: 'Потенциальный доход: +45,000 ₽/мес',
      action: 'Пересмотреть прайс',
      icon: DollarSign,
      color: 'green'
    },
    {
      id: 6,
      priority: 'low',
      category: 'Команда',
      title: 'Неравномерная нагрузка преподавателей',
      description: 'У Алексея 45 учеников, у Марии всего 18. Рекомендуется перераспределить нагрузку.',
      impact: 'Улучшение качества обучения',
      action: 'Перераспределить группы',
      icon: Users,
      color: 'blue'
    },
    {
      id: 7,
      priority: 'low',
      category: 'Расписание',
      title: 'Слоты 18:00-19:00 заполнены на 95%',
      description: 'Пиковое время почти заполнено. Есть спрос на дополнительные группы в это время.',
      impact: 'Можно открыть 1-2 новые группы',
      action: 'Рассмотреть расширение',
      icon: Clock,
      color: 'blue'
    },
  ];

  // Метрики эффективности рекомендаций
  const recommendationsImpact = {
    totalPotentialRevenue: 145000,
    criticalActions: 2,
    mediumActions: 3,
    lowActions: 2,
    estimatedChurnPrevention: 4,
  };

  // Расчет среднего месячного дохода из monthlyData
  const avgMonthlyIncome = monthlyData.length > 0 
    ? monthlyData.reduce((sum, month) => sum + (month.income || 0), 0) / monthlyData.length
    : 0;

  // Данные для диаграммы распределения учеников по группам
  const groupDistribution = groups.map(g => ({
    name: g.name,
    students: g.studentCount,
  }));

  const COLORS = ['#133C2A', '#D4AF37', '#1C8C64', '#B8975A', '#0F2E1F'];

  // Данные по эффективности преподавателей
  const teacherStats = employees
    .filter(e => e.role === 'teacher')
    .map(teacher => {
      const teacherGroups = groups.filter(g => g.teacherId === teacher.id);
      const studentCount = teacherGroups.reduce((sum, g) => sum + g.studentCount, 0);
      return {
        name: teacher.name.split(' ')[0],
        students: studentCount,
        groups: teacherGroups.length,
      };
    });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[#133C2A] mb-2">Аналитика и отчеты</h1>
          <p className="text-[#133C2A]/60">Комплексный анализ эффективности студии</p>
        </div>
        
        {/* Фильтры и экспорт */}
        <div className="flex items-center gap-3">
          {/* Фильтр по периоду */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#133C2A]/60" />
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[180px] border-[#133C2A]/20 focus:ring-[#133C2A]">
                <SelectValue placeholder="Выберите период" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Последние 7 дней</SelectItem>
                <SelectItem value="30days">Последние 30 дней</SelectItem>
                <SelectItem value="3months">Последние 3 месяца</SelectItem>
                <SelectItem value="6months">Последние 6 месяцев</SelectItem>
                <SelectItem value="1year">Последний год</SelectItem>
                <SelectItem value="all">Всё время</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Кнопка экспорта */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="border-[#133C2A]/20 text-[#133C2A] hover:bg-[#133C2A]/5"
              >
                <Download className="w-4 h-4 mr-2" />
                Экспорт
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                <FileText className="w-4 h-4 mr-2 text-red-600" />
                <span>Экспорт в PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                <span>Экспорт в Excel</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-gradient-to-r from-[#133C2A] to-[#1C8C64] rounded-xl p-4 md:p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-white mb-2">🎯 Быстрые действия</h2>
            <p className="text-white/80 text-sm">
              {recommendationsImpact.criticalActions} критичных задачи требуют внимания • 
              Потенциал: <span className="text-[#D4AF37]">+{recommendationsImpact.totalPotentialRevenue.toLocaleString('ru-RU')} ₽/мес</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => toast.info('Открываем список клиентов в зоне риска...')}
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Риск оттока ({churnRiskClients.filter(c => c.riskScore >= 65).length})
            </Button>
            <Button
              className="bg-white text-[#133C2A] hover:bg-white/90"
              onClick={() => toast.info('Открываем долги...')}
            >
              <Wallet className="w-4 h-4 mr-2" />
              Дебиторка ({debtorsList.length})
            </Button>
            <Button
              variant="outline"
              className="bg-transparent border-white text-white hover:bg-white/10"
              onClick={() => toast.info('Открываем все рекомендации...')}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Все ({optimizationRecommendations.length})
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards - всегда видимые */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-none soft-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-[#133C2A]/60">Всего учеников</p>
                <p className="text-xl md:text-2xl text-[#133C2A]">{totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#133C2A] flex items-center justify-center">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-[#133C2A]/60">Доход/месяц</p>
                <p className="text-xl md:text-2xl text-[#133C2A]">{Math.round(avgMonthlyIncome).toLocaleString('ru-RU')} ₽</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-[#1C8C64] to-[#133C2A] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-[#133C2A]/60">Рост выручки</p>
                <p className="text-xl md:text-2xl text-[#1C8C64]">+{stats.revenueGrowth}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#1C8C64] flex items-center justify-center">
                <Target className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-[#133C2A]/60">Заполняемость</p>
                <p className="text-xl md:text-2xl text-[#133C2A]">{avgCapacity}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-[#1C8C64] to-[#D4AF37] flex items-center justify-center">
                <Activity className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-[#133C2A]/60">Посещаемость</p>
                <p className="text-xl md:text-2xl text-[#1C8C64]">{avgAttendance}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs для структурированной аналитики */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 bg-[#F8F4E3] p-1 rounded-xl">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-[#133C2A] text-xs md:text-sm">
            <BarChart3 className="w-4 h-4 mr-0 md:mr-2" />
            <span className="hidden md:inline">Обзор</span>
          </TabsTrigger>
          <TabsTrigger value="operational" className="data-[state=active]:bg-white data-[state=active]:text-[#133C2A] text-xs md:text-sm">
            <Activity className="w-4 h-4 mr-0 md:mr-2" />
            <span className="hidden md:inline">Операц.</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="data-[state=active]:bg-white data-[state=active]:text-[#133C2A] text-xs md:text-sm">
            <Users className="w-4 h-4 mr-0 md:mr-2" />
            <span className="hidden md:inline">Клиенты</span>
          </TabsTrigger>
          <TabsTrigger value="groups" className="data-[state=active]:bg-white data-[state=active]:text-[#133C2A] text-xs md:text-sm">
            <Target className="w-4 h-4 mr-0 md:mr-2" />
            <span className="hidden md:inline">Группы</span>
          </TabsTrigger>
          <TabsTrigger value="finance" className="data-[state=active]:bg-white data-[state=active]:text-[#133C2A] text-xs md:text-sm">
            <DollarSign className="w-4 h-4 mr-0 md:mr-2" />
            <span className="hidden md:inline">Финансы</span>
          </TabsTrigger>
          <TabsTrigger value="marketing" className="data-[state=active]:bg-white data-[state=active]:text-[#133C2A] text-xs md:text-sm">
            <Share2 className="w-4 h-4 mr-0 md:mr-2" />
            <span className="hidden md:inline">Маркетинг</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-white data-[state=active]:text-[#133C2A] text-xs md:text-sm">
            <Building2 className="w-4 h-4 mr-0 md:mr-2" />
            <span className="hidden md:inline">Команда</span>
          </TabsTrigger>
        </TabsList>

        {/* ОБЗОР */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Предупреждения и рекомендации */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border border-red-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-[#133C2A] mb-2">🚨 Требуют внимания</h3>
                <p className="text-[#133C2A]/70 text-sm">
                  {recommendationsImpact.criticalActions} критичных действия • 
                  Потенциальная выручка: <span className="text-[#1C8C64]">+{recommendationsImpact.totalPotentialRevenue.toLocaleString('ru-RU')} ₽</span> • 
                  Риск потери: <span className="text-red-600">{churnRiskClients.length} клиентов</span>
                </p>
              </div>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => toast.info('Открываем детальный отчёт...')}
              >
                Подробнее
              </Button>
            </div>
          </div>

          {/* Прогноз оттока клиентов */}
          <Card className="border-none soft-shadow border-l-4 border-l-red-600">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#133C2A] flex items-center gap-2">
                  <UserMinus className="w-5 h-5 text-red-600" />
                  Прогноз оттока клиентов (AI)
                </CardTitle>
                <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs">
                  {churnRiskClients.length} в зоне риска
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {churnRiskClients.map((client) => (
                  <div 
                    key={client.studentName} 
                    className={`p-4 rounded-xl border-2 ${
                      client.riskScore >= 80 ? 'bg-red-50 border-red-300' :
                      client.riskScore >= 65 ? 'bg-orange-50 border-orange-300' :
                      'bg-yellow-50 border-yellow-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-[#133C2A]">{client.studentName}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            client.riskScore >= 80 ? 'bg-red-600 text-white' :
                            client.riskScore >= 65 ? 'bg-orange-600 text-white' :
                            'bg-yellow-600 text-white'
                          }`}>
                            Риск: {client.riskScore}%
                          </span>
                        </div>
                        <p className="text-sm text-[#133C2A]/60">{client.parentName} • {client.groupName}</p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-[#133C2A] hover:bg-[#133C2A]/90 text-white"
                        onClick={() => toast.success(`Связываемся с ${client.parentName}...`)}
                      >
                        Связаться
                      </Button>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-2 mb-3 text-sm">
                      <div>
                        <span className="text-[#133C2A]/60">Последнее посещение:</span>
                        <span className="text-[#133C2A] ml-1">{client.lastAttendance}</span>
                      </div>
                      <div>
                        <span className="text-[#133C2A]/60">Абонемент истекает:</span>
                        <span className="text-red-600 ml-1">{client.subscriptionEnds}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {client.reasons.map((reason, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                          <span className="text-[#133C2A]/70">{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-[#F8F4E3] rounded-xl">
                <p className="text-sm text-[#133C2A]">
                  💡 <strong>Рекомендация AI:</strong> Свяжитесь с этими клиентами в течение 48 часов. 
                  Предложите персональную скидку 15% или заморозку абонемента.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Рекомендации по оптимизации */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#133C2A] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                  Рекомендации по оптимизации
                </CardTitle>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs">
                    {recommendationsImpact.criticalActions} критичных
                  </span>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-600 rounded-full text-xs">
                    {recommendationsImpact.mediumActions} средних
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs">
                    {recommendationsImpact.lowActions} низких
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {optimizationRecommendations.map((rec) => {
                  const IconComponent = rec.icon;
                  const priorityColors = {
                    high: { bg: 'bg-red-50', border: 'border-red-300', badge: 'bg-red-600', text: 'text-red-600' },
                    medium: { bg: 'bg-yellow-50', border: 'border-yellow-300', badge: 'bg-yellow-600', text: 'text-yellow-600' },
                    low: { bg: 'bg-blue-50', border: 'border-blue-300', badge: 'bg-blue-600', text: 'text-blue-600' }
                  };
                  const colors = priorityColors[rec.priority as keyof typeof priorityColors];

                  return (
                    <div 
                      key={rec.id} 
                      className={`p-4 rounded-xl border-2 ${colors.bg} ${colors.border}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0 border-2 ${colors.border}`}>
                          <IconComponent className={`w-5 h-5 ${colors.text}`} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-[#133C2A]">{rec.title}</h4>
                                <span className={`px-2 py-0.5 ${colors.badge} text-white rounded-full text-xs uppercase`}>
                                  {rec.category}
                                </span>
                              </div>
                              <p className="text-sm text-[#133C2A]/70">{rec.description}</p>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-3 mb-3">
                            <div className="p-2 bg-white/50 rounded-lg">
                              <p className="text-xs text-[#133C2A]/60 mb-1">Влияние</p>
                              <p className="text-sm text-[#133C2A]">{rec.impact}</p>
                            </div>
                            <div className="p-2 bg-white/50 rounded-lg">
                              <p className="text-xs text-[#133C2A]/60 mb-1">Действие</p>
                              <p className="text-sm text-[#133C2A]">{rec.action}</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-[#133C2A] hover:bg-[#133C2A]/90 text-white"
                              onClick={() => toast.success(`Применяем рекомендацию: ${rec.title}`)}
                            >
                              Применить
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toast.info('Подробности рекомендации...')}
                            >
                              Подробнее
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-[#133C2A]/5 to-[#1C8C64]/5 rounded-xl border border-[#133C2A]/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[#133C2A] mb-1">Суммарный потенциал оптимизации</h4>
                    <p className="text-sm text-[#133C2A]/60">
                      При выполнении всех рекомендаций прогнозируется увеличение выручки
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl text-[#1C8C64]">+{recommendationsImpact.totalPotentialRevenue.toLocaleString('ru-RU')} ₽</p>
                    <p className="text-sm text-[#133C2A]/60">в месяц</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Динамика доходов */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                Динамика доходов и расходов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
                  <XAxis dataKey="month" stroke="#133C2A" />
                  <YAxis stroke="#133C2A" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#F8F4E3', 
                      border: '1px solid #133C2A20',
                      borderRadius: '12px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    name="Доход" 
                    stroke="#133C2A" 
                    strokeWidth={2}
                    dot={{ fill: '#133C2A' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    name="Расход" 
                    stroke="#D4AF37" 
                    strokeWidth={2}
                    dot={{ fill: '#D4AF37' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ключевые метрики */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-none soft-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#133C2A]/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#133C2A]" />
                  </div>
                  <h3 className="text-[#133C2A]">Средняя загрузка групп</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl text-[#133C2A]">
                    {Math.round(groups.reduce((sum, g) => sum + g.studentCount, 0) / groups.length)}
                  </span>
                  <span className="text-[#133C2A]/60">учеников/группа</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none soft-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                    <Award className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <h3 className="text-[#133C2A]">Средняя нагрузка преподавателя</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl text-[#133C2A]">
                    {Math.round(totalStudents / totalTeachers)}
                  </span>
                  <span className="text-[#133C2A]/60">учеников</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none soft-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#1C8C64]/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-[#1C8C64]" />
                  </div>
                  <h3 className="text-[#133C2A]">Активных групп</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl text-[#133C2A]">{groups.length}</span>
                  <span className="text-[#133C2A]/60">групп</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ОПЕРАЦИОННЫЕ */}
        <TabsContent value="operational" className="space-y-6 mt-6">
          <div className="bg-gradient-to-r from-[#133C2A]/5 to-[#1C8C64]/5 rounded-xl p-6 border border-[#133C2A]/10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1C8C64] to-[#133C2A] flex items-center justify-center flex-shrink-0">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-[#133C2A] mb-2">Операционные показатели</h3>
                  <p className="text-[#133C2A]/70 text-sm">
                    Посещаемость: <span className="text-[#1C8C64]">{avgAttendance}%</span> • 
                    NPS: <span className="text-[#1C8C64]">{satisfactionMetrics.nps}</span> • 
                    Средняя оценка: <span className="text-[#D4AF37]">⭐ {satisfactionMetrics.avgRating}</span>
                  </p>
                </div>
              </div>
              <div className="hidden md:block px-3 py-1 bg-white/50 rounded-lg text-xs text-[#133C2A]/60">
                📅 {period === '7days' ? 'Последние 7 дней' : period === '30days' ? 'Последние 30 дней' : period === '3months' ? 'Последние 3 месяца' : period === '6months' ? 'Последние 6 месяцев' : period === '1year' ? 'Последний год' : 'Всё время'}
              </div>
            </div>
          </div>

          {/* Посещаемость и NPS */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none soft-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#133C2A] flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#1C8C64]" />
                    Посещаемость занятий
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => toast.success('График экспортирован!')}
                    className="text-[#133C2A]/60 hover:text-[#133C2A]"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
                    <XAxis dataKey="month" stroke="#133C2A" />
                    <YAxis stroke="#133C2A" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#F8F4E3', 
                        border: '1px solid #133C2A20',
                        borderRadius: '12px'
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="attendanceRate" 
                      name="Посещаемость (%)" 
                      stroke="#1C8C64" 
                      fill="#1C8C64" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none soft-shadow">
              <CardHeader>
                <CardTitle className="text-[#133C2A] flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#D4AF37]" />
                  NPS и удовлетворённость
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-5xl text-[#1C8C64] mb-2">{satisfactionMetrics.nps}</div>
                    <p className="text-[#133C2A]/60">Net Promoter Score</p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <span className="text-3xl">⭐</span>
                      <span className="text-2xl text-[#133C2A]">{satisfactionMetrics.avgRating}</span>
                      <span className="text-[#133C2A]/60">({satisfactionMetrics.reviewsCount} отзывов)</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-[#133C2A]">Промоутеры (9-10)</span>
                        <span className="text-sm text-[#1C8C64]">{satisfactionMetrics.promoters}%</span>
                      </div>
                      <div className="h-2 bg-[#133C2A]/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1C8C64]" style={{ width: `${satisfactionMetrics.promoters}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-[#133C2A]">Пассивные (7-8)</span>
                        <span className="text-sm text-[#D4AF37]">{satisfactionMetrics.passives}%</span>
                      </div>
                      <div className="h-2 bg-[#133C2A]/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#D4AF37]" style={{ width: `${satisfactionMetrics.passives}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-[#133C2A]">Критики (0-6)</span>
                        <span className="text-sm text-red-600">{satisfactionMetrics.detractors}%</span>
                      </div>
                      <div className="h-2 bg-[#133C2A]/10 rounded-full overflow-hidden">
                        <div className="h-full bg-red-600" style={{ width: `${satisfactionMetrics.detractors}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Пробные занятия */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <Target className="w-5 h-5 text-[#D4AF37]" />
                Пробные занятия и конверсия
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trialLessons}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
                  <XAxis dataKey="month" stroke="#133C2A" />
                  <YAxis stroke="#133C2A" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#F8F4E3', 
                      border: '1px solid #133C2A20',
                      borderRadius: '12px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="scheduled" name="Запланировано" fill="#133C2A" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="attended" name="Посетили" fill="#D4AF37" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="converted" name="Конвертировано" fill="#1C8C64" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl text-[#133C2A]">
                    {trialLessons.reduce((sum, t) => sum + t.scheduled, 0)}
                  </p>
                  <p className="text-sm text-[#133C2A]/60">Всего запланировано</p>
                </div>
                <div>
                  <p className="text-2xl text-[#D4AF37]">
                    {Math.round((trialLessons.reduce((sum, t) => sum + t.attended, 0) / trialLessons.reduce((sum, t) => sum + t.scheduled, 0)) * 100)}%
                  </p>
                  <p className="text-sm text-[#133C2A]/60">Явка на пробные</p>
                </div>
                <div>
                  <p className="text-2xl text-[#1C8C64]">
                    {Math.round((trialLessons.reduce((sum, t) => sum + t.converted, 0) / trialLessons.reduce((sum, t) => sum + t.attended, 0)) * 100)}%
                  </p>
                  <p className="text-sm text-[#133C2A]/60">Конверсия в покупку</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Сравнение периодов */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                Сравнение с предыдущим периодом
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-5 gap-4">
                <div className="p-4 bg-[#F8F4E3]/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-[#133C2A]" />
                    <span className="text-sm text-[#133C2A]/60">Рост учеников</span>
                  </div>
                  <p className="text-2xl text-[#1C8C64]">+{periodComparison.studentsGrowth}%</p>
                </div>
                <div className="p-4 bg-[#F8F4E3]/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-[#133C2A]" />
                    <span className="text-sm text-[#133C2A]/60">Рост выручки</span>
                  </div>
                  <p className="text-2xl text-[#1C8C64]">+{periodComparison.revenueGrowth}%</p>
                </div>
                <div className="p-4 bg-[#F8F4E3]/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-[#133C2A]" />
                    <span className="text-sm text-[#133C2A]/60">Посещаемость</span>
                  </div>
                  <p className="text-2xl text-[#1C8C64]">+{periodComparison.attendanceChange}%</p>
                </div>
                <div className="p-4 bg-[#F8F4E3]/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <UserPlus className="w-5 h-5 text-[#133C2A]" />
                    <span className="text-sm text-[#133C2A]/60">Новых</span>
                  </div>
                  <p className="text-2xl text-[#133C2A]">{periodComparison.newStudents}</p>
                </div>
                <div className="p-4 bg-[#F8F4E3]/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <UserMinus className="w-5 h-5 text-[#133C2A]" />
                    <span className="text-sm text-[#133C2A]/60">Ушедших</span>
                  </div>
                  <p className="text-2xl text-red-600">{periodComparison.churnedStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Сезонность */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <LineChartIcon className="w-5 h-5 text-[#D4AF37]" />
                Сезонность и тренды
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={seasonalityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
                  <XAxis dataKey="month" stroke="#133C2A" />
                  <YAxis stroke="#133C2A" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#F8F4E3', 
                      border: '1px solid #133C2A20',
                      borderRadius: '12px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="students2023" 
                    name="Ученики 2023" 
                    stroke="#133C2A" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#133C2A' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="students2024" 
                    name="Ученики 2024" 
                    stroke="#1C8C64" 
                    strokeWidth={3}
                    dot={{ fill: '#1C8C64' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* КЛИЕНТЫ */}
        <TabsContent value="customers" className="space-y-6 mt-6">
          <div className="bg-gradient-to-r from-[#133C2A]/5 to-[#D4AF37]/5 rounded-xl p-6 border border-[#133C2A]/10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-[#133C2A] mb-2">Анализ клиентской базы</h3>
                  <p className="text-[#133C2A]/70 text-sm">
                    Средний LTV: <span className="text-[#133C2A]">{avgLTV.toLocaleString('ru-RU')} ₽</span> • 
                    Средний ARPU: <span className="text-[#133C2A]">{avgARPU.toLocaleString('ru-RU')} ₽</span> • 
                    Удержание: <span className="text-[#1C8C64]">90%</span>
                  </p>
                </div>
              </div>
              <div className="hidden md:block px-3 py-1 bg-white/50 rounded-lg text-xs text-[#133C2A]/60">
                📅 {period === '7days' ? 'Последние 7 дней' : period === '30days' ? 'Последние 30 дней' : period === '3months' ? 'Последние 3 месяца' : period === '6months' ? 'Последние 6 месяцев' : period === '1year' ? 'Последний год' : 'Всё время'}
              </div>
            </div>
          </div>

          {/* Предупреждение о рисках */}
          {churnRiskClients.filter(c => c.riskScore >= 65).length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-600 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-[#133C2A] mb-1">⚠️ Внимание: Риск оттока клиентов</h4>
                  <p className="text-sm text-[#133C2A]/70">
                    <strong>{churnRiskClients.filter(c => c.riskScore >= 65).length} клиентов</strong> в зоне риска. 
                    Рекомендуется немедленный контакт для предотвращения потери ~32,000 ₽/мес.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => toast.info('Открываем список клиентов в зоне риска...')}
                >
                  Посмотреть
                </Button>
              </div>
            </div>
          )}

          {/* Retention & Churn */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none soft-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#133C2A] flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-[#D4AF37]" />
                    Коэффициент удержания
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => toast.success('График экспортирован!')}
                    className="text-[#133C2A]/60 hover:text-[#133C2A]"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={retentionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
                    <XAxis dataKey="month" stroke="#133C2A" />
                    <YAxis stroke="#133C2A" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#F8F4E3', 
                        border: '1px solid #133C2A20',
                        borderRadius: '12px'
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="retentionRate" 
                      name="Удержание (%)" 
                      stroke="#133C2A" 
                      fill="#133C2A" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none soft-shadow">
              <CardHeader>
                <CardTitle className="text-[#133C2A] flex items-center gap-2">
                  <UserMinus className="w-5 h-5 text-[#D4AF37]" />
                  Анализ оттока
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={churnAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
                    <XAxis dataKey="month" stroke="#133C2A" />
                    <YAxis stroke="#133C2A" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#F8F4E3', 
                        border: '1px solid #133C2A20',
                        borderRadius: '12px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="churnRate" 
                      name="Отток (%)" 
                      stroke="#D4AF37" 
                      strokeWidth={2}
                      dot={{ fill: '#D4AF37' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* LTV & ARPU */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none soft-shadow">
              <CardHeader>
                <CardTitle className="text-[#133C2A] flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-[#D4AF37]" />
                  Динамика LTV
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={ltvData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
                    <XAxis dataKey="month" stroke="#133C2A" />
                    <YAxis stroke="#133C2A" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#F8F4E3', 
                        border: '1px solid #133C2A20',
                        borderRadius: '12px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="ltv" 
                      name="LTV" 
                      stroke="#133C2A" 
                      strokeWidth={2}
                      dot={{ fill: '#133C2A' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none soft-shadow">
              <CardHeader>
                <CardTitle className="text-[#133C2A] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#D4AF37]" />
                  Динамика ARPU
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={ltvData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
                    <XAxis dataKey="month" stroke="#133C2A" />
                    <YAxis stroke="#133C2A" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#F8F4E3', 
                        border: '1px solid #133C2A20',
                        borderRadius: '12px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="arpu" 
                      name="ARPU" 
                      stroke="#D4AF37" 
                      strokeWidth={2}
                      dot={{ fill: '#D4AF37' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Сегменты клиентов */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[#D4AF37]" />
                Сегменты клиентов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#133C2A]/10">
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Сегмент</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">LTV</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">ARPU</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Учеников</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Среднее время (мес)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerSegments.map((segment) => (
                      <tr key={segment.segment} className="border-b border-[#133C2A]/5 hover:bg-[#F8F4E3]/50 transition-smooth">
                        <td className="p-3">
                          <span className="text-[#133C2A]">{segment.segment}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-[#133C2A]">{segment.ltv.toLocaleString('ru-RU')} ₽</span>
                        </td>
                        <td className="p-3">
                          <span className="text-[#133C2A]">{segment.arpu.toLocaleString('ru-RU')} ₽</span>
                        </td>
                        <td className="p-3">
                          <span className="text-[#133C2A]">{segment.studentCount}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-[#133C2A]">{segment.avgMonthsStaying}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Причины оттока */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#D4AF37]" />
                Причины оттока
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {churnReasons.map((reason) => (
                  <div key={reason.reason} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-[#133C2A] text-sm">{reason.reason}</span>
                        <span className="text-[#133C2A]/60 text-sm">{reason.count} ({reason.percentage}%)</span>
                      </div>
                      <div className="h-2 bg-[#133C2A]/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#133C2A] to-[#D4AF37]"
                          style={{ width: `${reason.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ГРУППЫ */}
        <TabsContent value="groups" className="space-y-6 mt-6">
          <div className="bg-gradient-to-r from-[#133C2A]/5 to-[#D4AF37]/5 rounded-xl p-6 border border-[#133C2A]/10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#1C8C64] flex items-center justify-center flex-shrink-0">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-[#133C2A] mb-2">Оптимизация групп и расписания</h3>
                  <p className="text-[#133C2A]/70 text-sm">
                    Средняя заполняемость: <span className="text-[#133C2A]">{avgCapacity}%</span> • 
                    Свободных мест: <span className="text-[#D4AF37]">{groupCapacityData.reduce((sum, g) => sum + (g.maxCapacity - g.currentStudents), 0)}</span> • 
                    В листе ожидания: <span className="text-[#D4AF37]">{groupCapacityData.reduce((sum, g) => sum + g.waitlist, 0)}</span>
                  </p>
                </div>
              </div>
              <div className="hidden md:block px-3 py-1 bg-white/50 rounded-lg text-xs text-[#133C2A]/60">
                📅 {period === '7days' ? 'Последние 7 дней' : period === '30days' ? 'Последние 30 дней' : period === '3months' ? 'Последние 3 месяца' : period === '6months' ? 'Последние 6 месяцев' : period === '1year' ? 'Последний год' : 'Всё время'}
              </div>
            </div>
          </div>

          {/* Рекомендация по группам */}
          <div className="bg-yellow-50 border-l-4 border-yellow-600 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-[#133C2A] mb-1">💡 Рекомендация: Низкая рентабельность</h4>
                <p className="text-sm text-[#133C2A]/70">
                  Группа "Балет 6-8 лет" заполнена только на 40% (6 из 15 мест). 
                  Рекомендуется увеличить маркетинг или объединить с другой группой для повышения рентабельности.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.info('Открываем рекомендации по группе...')}
              >
                Подробнее
              </Button>
            </div>
          </div>

          {/* Динамика заполняемости и временные слоты */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none soft-shadow">
              <CardHeader>
                <CardTitle className="text-[#133C2A] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#D4AF37]" />
                  Динамика заполняемости
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={capacityTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
                    <XAxis dataKey="month" stroke="#133C2A" />
                    <YAxis stroke="#133C2A" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#F8F4E3', 
                        border: '1px solid #133C2A20',
                        borderRadius: '12px'
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="avgFillPercentage" 
                      name="Заполняемость (%)" 
                      stroke="#1C8C64" 
                      fill="#1C8C64" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none soft-shadow">
              <CardHeader>
                <CardTitle className="text-[#133C2A] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#D4AF37]" />
                  Загрузка временных слотов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeSlotOccupancy}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
                    <XAxis 
                      dataKey="timeSlot" 
                      stroke="#133C2A"
                    />
                    <YAxis stroke="#133C2A" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#F8F4E3', 
                        border: '1px solid #133C2A20',
                        borderRadius: '12px'
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="occupancy" 
                      name="Загрузка (%)" 
                      fill="#D4AF37" 
                      radius={[8, 8, 0, 0]} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Детальная заполняемость групп */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <Target className="w-5 h-5 text-[#D4AF37]" />
                Детальная заполняемость групп
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#133C2A]/10">
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Группа</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Текущее</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Максимум</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Заполняемость</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm hidden md:table-cell">Тренд</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm hidden md:table-cell">Лист ожидания</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupCapacityData.map((group) => (
                      <tr key={group.groupId} className="border-b border-[#133C2A]/5 hover:bg-[#F8F4E3]/50 transition-smooth">
                        <td className="p-3">
                          <span className="text-[#133C2A]">{group.groupName}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-[#133C2A]">{group.currentStudents}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-[#133C2A]">{group.maxCapacity}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-[#133C2A]/10 rounded-full overflow-hidden min-w-[60px]">
                              <div 
                                className="h-full bg-gradient-to-r from-[#133C2A] to-[#1C8C64] transition-all"
                                style={{ width: `${group.fillPercentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-[#133C2A]">{group.fillPercentage}%</span>
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          {group.trend === 'up' ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <TrendingUp className="w-4 h-4" />
                              Растёт
                            </span>
                          ) : group.trend === 'down' ? (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <TrendingDown className="w-4 h-4" />
                              Падает
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-gray-600">
                              <Activity className="w-4 h-4" />
                              Стабильно
                            </span>
                          )}
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          {group.waitlist > 0 ? (
                            <span className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-xs">
                              {group.waitlist} чел.
                            </span>
                          ) : (
                            <span className="text-[#133C2A]/40 text-xs">Нет</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Распределение учеников */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[#D4AF37]" />
                Распределение учеников по группам
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={groupDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.students}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="students"
                  >
                    {groupDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#F8F4E3', 
                      border: '1px solid #133C2A20',
                      borderRadius: '12px'
                    }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ФИНАНСЫ */}
        <TabsContent value="finance" className="space-y-6 mt-6">
          <div className="bg-gradient-to-r from-[#133C2A]/5 to-[#D4AF37]/5 rounded-xl p-6 border border-[#133C2A]/10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#133C2A] flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-[#133C2A] mb-2">Финансовое планирование</h3>
                  <p className="text-[#133C2A]/70 text-sm">
                    Прогноз на следующий месяц: <span className="text-[#133C2A]">{nextMonthRevenue.toLocaleString('ru-RU')} ₽</span> • 
                    Текущая выручка: <span className="text-[#1C8C64]">390 000 ₽</span> • 
                    Рост: <span className="text-[#1C8C64]">+39%</span>
                  </p>
                </div>
              </div>
              <div className="hidden md:block px-3 py-1 bg-white/50 rounded-lg text-xs text-[#133C2A]/60">
                📅 {period === '7days' ? 'Последние 7 дней' : period === '30days' ? 'Последние 30 дней' : period === '3months' ? 'Последние 3 месяца' : period === '6months' ? 'Последние 6 месяцев' : period === '1year' ? 'Последний год' : 'Всё время'}
              </div>
            </div>
          </div>

          {/* Прогноз выручки */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <LineChartIcon className="w-5 h-5 text-[#D4AF37]" />
                Прогноз выручки (3 сценария)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueForecast}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
                  <XAxis dataKey="month" stroke="#133C2A" />
                  <YAxis stroke="#133C2A" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#F8F4E3', 
                      border: '1px solid #133C2A20',
                      borderRadius: '12px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="actualRevenue" 
                    name="Фактическая" 
                    stroke="#133C2A" 
                    strokeWidth={3}
                    dot={{ fill: '#133C2A' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="forecastRevenue" 
                    name="Прогноз" 
                    stroke="#D4AF37" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#D4AF37' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pessimistic" 
                    name="Пессимистичный" 
                    stroke="#FF6347" 
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="optimistic" 
                    name="Оптимистичный" 
                    stroke="#32CD32" 
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Источники дохода */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[#D4AF37]" />
                Источники дохода
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#133C2A]/10">
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Источник</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Текущий месяц</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Прогноз</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Доля</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueSources.map((source) => (
                      <tr key={source.source} className="border-b border-[#133C2A]/5 hover:bg-[#F8F4E3]/50 transition-smooth">
                        <td className="p-3">
                          <span className="text-[#133C2A]">{source.source}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-[#133C2A]">{source.currentMonth.toLocaleString('ru-RU')} ₽</span>
                        </td>
                        <td className="p-3">
                          <span className="text-[#133C2A]">{source.forecastNextMonth.toLocaleString('ru-RU')} ₽</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-[#133C2A]/10 rounded-full overflow-hidden min-w-[60px]">
                              <div 
                                className="h-full bg-gradient-to-r from-[#133C2A] to-[#D4AF37]"
                                style={{ width: `${source.percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-[#133C2A]">{source.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Финансовые метрики */}
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="border-none soft-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#133C2A]/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-[#133C2A]" />
                  </div>
                  <h3 className="text-[#133C2A] text-sm">Средний чек</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl text-[#133C2A]">{financialMetrics.avgCheck.toLocaleString('ru-RU')}</span>
                  <span className="text-[#133C2A]/60">₽</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none soft-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#1C8C64]/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#1C8C64]" />
                  </div>
                  <h3 className="text-[#133C2A] text-sm">Рентабельность</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl text-[#1C8C64]">{financialMetrics.profitMargin}</span>
                  <span className="text-[#133C2A]/60">%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none soft-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <h3 className="text-[#133C2A] text-sm">Чистая прибыль</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl text-[#133C2A]">{(financialMetrics.netProfit / 1000).toFixed(0)}</span>
                  <span className="text-[#133C2A]/60">тыс ₽</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none soft-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-[#133C2A] text-sm">Дебиторка</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl text-red-600">{(financialMetrics.debtors / 1000).toFixed(1)}</span>
                  <span className="text-[#133C2A]/60">тыс ₽</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Структура расходов */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none soft-shadow">
              <CardHeader>
                <CardTitle className="text-[#133C2A] flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-[#D4AF37]" />
                  Структура расходов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.category}: ${entry.percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#F8F4E3', 
                        border: '1px solid #133C2A20',
                        borderRadius: '12px'
                      }}
                      formatter={(value: any) => `${value.toLocaleString('ru-RU')} ₽`}
                    />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {expenseBreakdown.map((expense, index) => (
                    <div key={expense.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-sm text-[#133C2A]">{expense.category}</span>
                      </div>
                      <span className="text-sm text-[#133C2A]">{expense.amount.toLocaleString('ru-RU')} ₽</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none soft-shadow">
              <CardHeader>
                <CardTitle className="text-[#133C2A] flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Дебиторская задолженность
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#133C2A]/60">Всего задолженность</span>
                      <span className="text-2xl text-red-600">{financialMetrics.debtors.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <p className="text-xs text-[#133C2A]/60">{financialMetrics.debtorsCount} должников</p>
                  </div>

                  <div className="space-y-3">
                    {debtorsList.map((debtor) => (
                      <div key={debtor.parentName} className="p-3 bg-[#F8F4E3]/50 rounded-lg border border-red-200">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <p className="text-sm text-[#133C2A]">{debtor.parentName}</p>
                            <p className="text-xs text-[#133C2A]/60">{debtor.studentName}</p>
                          </div>
                          <span className="text-red-600">{debtor.amount.toLocaleString('ru-RU')} ₽</span>
                        </div>
                        <p className="text-xs text-red-600">Просрочка: {debtor.daysOverdue} дней</p>
                      </div>
                    ))}
                  </div>

                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => toast.info('Отправка напоминаний должникам...')}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Отправить напоминания
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Прогноз по абонементам */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#D4AF37]" />
                Прогноз по типам абонементов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscriptionForecast.map((sub) => (
                  <div key={sub.type} className="p-4 bg-[#F8F4E3]/50 rounded-xl">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-[#133C2A]">{sub.type}</h4>
                        <p className="text-sm text-[#133C2A]/60">
                          {sub.activeCount} активных абонементов
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#133C2A]">{sub.expectedRevenue.toLocaleString('ru-RU')} ₽</p>
                        <p className="text-sm text-[#1C8C64]">{sub.renewalRate}% продлений</p>
                      </div>
                    </div>
                    <div className="h-2 bg-[#133C2A]/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#133C2A] to-[#1C8C64]"
                        style={{ width: `${sub.renewalRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* МАРКЕТИНГ */}
        <TabsContent value="marketing" className="space-y-6 mt-6">
          <div className="bg-gradient-to-r from-[#133C2A]/5 to-[#D4AF37]/5 rounded-xl p-6 border border-[#133C2A]/10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#1C8C64] flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-[#133C2A] mb-2">Эффективность маркетинга</h3>
                  <p className="text-[#133C2A]/70 text-sm">
                    Всего лидов: <span className="text-[#133C2A]">{totalLeads}</span> • 
                    Конверсия: <span className="text-[#1C8C64]">{overallConversionRate}%</span> • 
                    Лучший канал: <span className="text-[#D4AF37]">Instagram (ROI 620%)</span>
                  </p>
                </div>
              </div>
              <div className="hidden md:block px-3 py-1 bg-white/50 rounded-lg text-xs text-[#133C2A]/60">
                📅 {period === '7days' ? 'Последние 7 дней' : period === '30days' ? 'Последние 30 дней' : period === '3months' ? 'Последние 3 месяца' : period === '6months' ? 'Последние 6 месяцев' : period === '1year' ? 'Последний год' : 'Всё время'}
              </div>
            </div>
          </div>

          {/* Рекомендация по маркетингу */}
          <div className="bg-green-50 border-l-4 border-green-600 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-[#133C2A] mb-1">📈 Возможность роста</h4>
                <p className="text-sm text-[#133C2A]/70">
                  Instagram показывает ROI 620% — в 2 раза лучше других каналов! 
                  Увеличение бюджета на 50% (+12,500 ₽) может дать +8 учеников/мес и +45,000 ₽ выручки.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => toast.success('Корректируем маркетинговый бюджет...')}
              >
                Применить
              </Button>
            </div>
          </div>

          {/* Источники лидов */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[#D4AF37]" />
                Источники лидов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leadSources.map((source) => (
                  <div key={source.source} className="p-4 bg-[#F8F4E3]/50 rounded-xl">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-[#133C2A]">{source.source}</h4>
                        <p className="text-sm text-[#133C2A]/60">
                          {source.leadsCount} лидов • {source.convertedCount} конвертировано
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#133C2A]">{source.percentage}%</p>
                        <p className="text-sm text-[#1C8C64]">Конверсия {source.conversionRate}%</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-2 bg-[#133C2A]/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#133C2A]"
                          style={{ width: `${source.percentage}%` }}
                        />
                      </div>
                      <div className="h-2 bg-[#1C8C64]/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#1C8C64]"
                          style={{ width: `${source.conversionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ROI маркетинга */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-[#D4AF37]" />
                ROI маркетинговых каналов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#133C2A]/10">
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Канал</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Вложено</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Выручка</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">ROI</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">CAC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketingROI.map((channel) => (
                      <tr key={channel.channel} className="border-b border-[#133C2A]/5 hover:bg-[#F8F4E3]/50 transition-smooth">
                        <td className="p-3">
                          <span className="text-[#133C2A]">{channel.channel}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-[#133C2A]">{channel.investment.toLocaleString('ru-RU')} ₽</span>
                        </td>
                        <td className="p-3">
                          <span className="text-[#133C2A]">{channel.revenue.toLocaleString('ru-RU')} ₽</span>
                        </td>
                        <td className="p-3">
                          <span className={channel.roi >= 500 ? "text-[#1C8C64]" : "text-[#133C2A]"}>
                            {channel.roi > 0 ? `${channel.roi}%` : '∞'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-[#133C2A]">
                            {channel.cac > 0 ? `${channel.cac.toLocaleString('ru-RU')} ₽` : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Воронка продаж */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-[#D4AF37]" />
                Воронка продаж
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {conversionFunnel.map((stage, index) => (
                  <div key={stage.stage} className="relative">
                    <div className="flex justify-between mb-1">
                      <span className="text-[#133C2A]">{stage.stage}</span>
                      <span className="text-[#133C2A]/60">{stage.count} ({stage.conversionRate}%)</span>
                    </div>
                    <div 
                      className="h-12 bg-gradient-to-r from-[#133C2A] to-[#D4AF37] rounded-lg flex items-center justify-center text-white transition-all"
                      style={{ 
                        width: `${100 - (index * 15)}%`,
                        opacity: 1 - (index * 0.1)
                      }}
                    >
                      {stage.count}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Тренды источников */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <LineChartIcon className="w-5 h-5 text-[#D4AF37]" />
                Динамика источников лидов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={leadSourceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
                  <XAxis dataKey="month" stroke="#133C2A" />
                  <YAxis stroke="#133C2A" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#F8F4E3', 
                      border: '1px solid #133C2A20',
                      borderRadius: '12px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="instagram" 
                    name="Instagram" 
                    stroke="#D4AF37" 
                    strokeWidth={2}
                    dot={{ fill: '#D4AF37' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="google" 
                    name="Google" 
                    stroke="#133C2A" 
                    strokeWidth={2}
                    dot={{ fill: '#133C2A' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="referral" 
                    name="Сарафанное радио" 
                    stroke="#1C8C64" 
                    strokeWidth={2}
                    dot={{ fill: '#1C8C64' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="other" 
                    name="Другое" 
                    stroke="#B8975A" 
                    strokeWidth={2}
                    dot={{ fill: '#B8975A' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* КОМАНДА */}
        <TabsContent value="team" className="space-y-6 mt-6">
          <div className="bg-gradient-to-r from-[#133C2A]/5 to-[#D4AF37]/5 rounded-xl p-6 border border-[#133C2A]/10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-[#133C2A] mb-2">Эффективность команды</h3>
                  <p className="text-[#133C2A]/70 text-sm">
                    Преподавателей: <span className="text-[#133C2A]">{totalTeachers}</span> • 
                    Средняя нагрузка: <span className="text-[#133C2A]">{Math.round(totalStudents / totalTeachers)} учеников</span> • 
                    Активных групп: <span className="text-[#133C2A]">{groups.length}</span>
                  </p>
                </div>
              </div>
              <div className="hidden md:block px-3 py-1 bg-white/50 rounded-lg text-xs text-[#133C2A]/60">
                📅 {period === '7days' ? 'Последние 7 дней' : period === '30days' ? 'Последние 30 дней' : period === '3months' ? 'Последние 3 месяца' : period === '6months' ? 'Последние 6 месяцев' : period === '1year' ? 'Последний год' : 'Всё время'}
              </div>
            </div>
          </div>

          {/* Нагрузка преподавателей */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#D4AF37]" />
                Нагрузка преподавателей
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={teacherStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
                  <XAxis dataKey="name" stroke="#133C2A" />
                  <YAxis stroke="#133C2A" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#F8F4E3', 
                      border: '1px solid #133C2A20',
                      borderRadius: '12px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="students" name="Учеников" fill="#133C2A" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="groups" name="Групп" fill="#D4AF37" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Рейтинг преподавателей */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <Award className="w-5 h-5 text-[#D4AF37]" />
                Рейтинг преподавателей
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#133C2A]/10">
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Преподаватель</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Рейтинг</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm hidden md:table-cell">Отзывов</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm hidden md:table-cell">Посещаемость</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm hidden md:table-cell">Удержание</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherRatings.map((teacher) => (
                      <tr key={teacher.name} className="border-b border-[#133C2A]/5 hover:bg-[#F8F4E3]/50 transition-smooth">
                        <td className="p-3">
                          <span className="text-[#133C2A]">{teacher.name}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <span className="text-[#D4AF37]">⭐</span>
                            <span className="text-[#133C2A]">{teacher.rating}</span>
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <span className="text-[#133C2A]/60">{teacher.reviewsCount}</span>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-[#133C2A]/10 rounded-full overflow-hidden min-w-[60px]">
                              <div 
                                className="h-full bg-[#1C8C64]"
                                style={{ width: `${teacher.attendance}%` }}
                              />
                            </div>
                            <span className="text-xs text-[#133C2A]">{teacher.attendance}%</span>
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-[#133C2A]/10 rounded-full overflow-hidden min-w-[60px]">
                              <div 
                                className="h-full bg-[#D4AF37]"
                                style={{ width: `${teacher.retention}%` }}
                              />
                            </div>
                            <span className="text-xs text-[#133C2A]">{teacher.retention}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Эффективность групп */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <Target className="w-5 h-5 text-[#D4AF37]" />
                Эффективность групп
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#133C2A]/10">
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Группа</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Учеников</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm hidden md:table-cell">Преподаватель</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm hidden md:table-cell">Загруженность</th>
                      <th className="text-left p-3 text-[#133C2A]/60 text-sm">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => {
                      const teacher = employees.find(e => e.id === group.teacherId);
                      const capacity = 15;
                      const fillPercentage = (group.studentCount / capacity) * 100;
                      
                      return (
                        <tr key={group.id} className="border-b border-[#133C2A]/5 hover:bg-[#F8F4E3]/50 transition-smooth">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: group.color }}
                              />
                              <span className="text-[#133C2A]">{group.name}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-[#133C2A]">{group.studentCount}</span>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            <span className="text-[#133C2A]/70">{teacher?.name || 'Не назначен'}</span>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-[#133C2A]/10 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-[#133C2A] to-[#D4AF37] transition-all"
                                  style={{ width: `${fillPercentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-[#133C2A]/60">{Math.round(fillPercentage)}%</span>
                            </div>
                          </td>
                          <td className="p-3">
                            {fillPercentage >= 100 ? (
                              <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-600 text-xs">
                                Заполнена
                              </span>
                            ) : fillPercentage >= 80 ? (
                              <span className="inline-block px-3 py-1 rounded-full bg-yellow-100 text-yellow-600 text-xs">
                                Почти заполнена
                              </span>
                            ) : (
                              <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-600 text-xs">
                                Набор открыт
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}