import { TrendingUp, Users, Coins, Calendar, Target, Award, CreditCard, BarChart3, PieChart, LineChart, ArrowUp, ArrowDown, TrendingDown, UserPlus, Activity } from 'lucide-react';
import { User, Event, FinanceStats } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { LineChart as RechartsLine, Line, BarChart as RechartsBar, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useState } from 'react';

interface AnalyticsProps {
  user: User;
  events: Event[];
  stats: FinanceStats;
  totalStudents: number;
  totalTeachers: number;
}

export function Analytics({ user, events, stats, totalStudents, totalTeachers }: AnalyticsProps) {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  // Финансовые метрики
  const netProfit = stats.totalIncome - stats.totalExpenses;
  const profitMargin = stats.totalIncome > 0 ? ((netProfit / stats.totalIncome) * 100).toFixed(1) : 0;

  // Мок данные для графиков
  const revenueData = [
    { month: 'Янв', доход: 180000, расход: 95000, прибыль: 85000 },
    { month: 'Фев', доход: 195000, расход: 98000, прибыль: 97000 },
    { month: 'Мар', доход: 210000, расход: 102000, прибыль: 108000 },
    { month: 'Апр', доход: 225000, расход: 105000, прибыль: 120000 },
    { month: 'Май', доход: 240000, расход: 108000, прибыль: 132000 },
    { month: 'Июн', доход: stats.totalIncome, расход: stats.totalExpenses, прибыль: netProfit }
  ];

  const studentsGrowthData = [
    { month: 'Янв', студенты: 45, новые: 8, ушли: 2 },
    { month: 'Фев', студенты: 51, новые: 9, ушли: 3 },
    { month: 'Мар', студенты: 57, новые: 10, ушли: 4 },
    { month: 'Апр', студенты: 63, новые: 11, ушли: 5 },
    { month: 'Май', студенты: 69, новые: 12, ушли: 6 },
    { month: 'Июн', студенты: totalStudents, новые: 14, ушли: 7 }
  ];

  const membershipData = [
    { name: 'Разовые', value: 12, amount: 48000 },
    { name: '4 занятия', value: 18, amount: 90000 },
    { name: '8 занятий', value: 25, amount: 175000 },
    { name: 'Безлимит', value: 20, amount: 140000 }
  ];

  const teacherPerformanceData = [
    { name: 'Анна Петрова', студенты: 28, рейтинг: 4.9, занятия: 45, доход: 180000 },
    { name: 'Мария Сидорова', студенты: 25, рейтинг: 4.8, занятия: 42, доход: 165000 },
    { name: 'Елена Кузнецова', студенты: 22, рейтинг: 4.7, занятия: 38, доход: 152000 }
  ];

  const salesFunnelData = [
    { stage: 'Обращения', count: 120, percent: 100 },
    { stage: 'Пробное занятие', count: 85, percent: 71 },
    { stage: 'Покупка абонемента', count: 68, percent: 57 },
    { stage: 'Повторная покупка', count: 61, percent: 51 }
  ];

  const incomeSourcesData = [
    { name: 'Абонементы', value: 320000 },
    { name: 'Разовые', value: 48000 },
    { name: 'Мерч', value: 25000 },
    { name: 'Мероприятия', value: 60000 }
  ];

  const classAttendanceData = [
    { day: 'Пн', утро: 15, день: 20, вечер: 35 },
    { day: 'Вт', утро: 18, день: 22, вечер: 38 },
    { day: 'Ср', утро: 20, день: 25, вечер: 40 },
    { day: 'Чт', утро: 17, день: 23, вечер: 36 },
    { day: 'Пт', утро: 16, день: 19, вечер: 42 },
    { day: 'Сб', утро: 25, день: 30, вечер: 20 },
    { day: 'Вс', утро: 22, день: 28, вечер: 18 }
  ];

  const studentDemographicsData = [
    { age: '3-6 лет', количество: 12 },
    { age: '7-10 лет', количество: 25 },
    { age: '11-14 лет', количество: 18 },
    { age: '15-18 лет', количество: 15 },
    { age: '18+ лет', количество: 5 }
  ];

  const retentionData = [
    { month: 'Янв', удержание: 92 },
    { month: 'Фев', удержание: 94 },
    { month: 'Мар', удержание: 91 },
    { month: 'Апр', удержание: 95 },
    { month: 'Май', удержание: 93 },
    { month: 'Июн', удержание: 96 }
  ];

  const COLORS = ['#133C2A', '#D4AF37', '#1C8C64', '#FADADD', '#B8941F', '#0F2A1D'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="animate-scale-in">
        <h1 className="text-[#133C2A] mb-2">Аналитика и отчеты 📊</h1>
        <p className="text-[#133C2A]/60">
          Полная аналитика вашего бизнеса за выбранный период
        </p>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#F8F4E3] w-fit">
        {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-6 py-2 rounded-xl transition-smooth ${
              period === p
                ? 'bg-[#133C2A] text-white'
                : 'text-[#133C2A] hover:bg-white'
            }`}
          >
            {p === 'week' && 'Неделя'}
            {p === 'month' && 'Месяц'}
            {p === 'quarter' && 'Квартал'}
            {p === 'year' && 'Год'}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 rounded-2xl bg-[#1C8C64]/10 flex items-center justify-center">
                <Coins className="w-6 h-6 text-[#1C8C64]" />
              </div>
              <Badge className="bg-[#1C8C64]/10 text-[#1C8C64] border-[#1C8C64]/20">
                <ArrowUp className="w-3 h-3 mr-1" />
                {stats.revenueGrowth}%
              </Badge>
            </div>
            <p className="text-sm text-[#133C2A]/60">Средний чек</p>
            <p className="text-2xl text-[#133C2A] mt-1">
              {Math.round(stats.totalIncome / totalStudents).toLocaleString('ru-RU')} ₽
            </p>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-[#D4AF37]" />
              </div>
            </div>
            <p className="text-sm text-[#133C2A]/60">Новых студентов</p>
            <p className="text-2xl text-[#133C2A] mt-1">14</p>
            <p className="text-xs text-[#133C2A]/60 mt-1">за этот месяц</p>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 rounded-2xl bg-[#133C2A]/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-[#133C2A]" />
              </div>
            </div>
            <p className="text-sm text-[#133C2A]/60">Удержание</p>
            <p className="text-2xl text-[#133C2A] mt-1">96%</p>
            <p className="text-xs text-green-600 mt-1">+3% за период</p>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 rounded-2xl bg-[#FADADD]/30 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-[#133C2A]" />
              </div>
            </div>
            <p className="text-sm text-[#133C2A]/60">Загрузка зала</p>
            <p className="text-2xl text-[#133C2A] mt-1">78%</p>
            <p className="text-xs text-[#133C2A]/60 mt-1">в среднем</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Profit Trend */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#D4AF37]" />
            Динамика доходов, расходов и прибыли
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1C8C64" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#1C8C64" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D14343" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#D14343" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
              <XAxis dataKey="month" stroke="#133C2A" />
              <YAxis stroke="#133C2A" />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="доход" stroke="#1C8C64" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
              <Area type="monotone" dataKey="расход" stroke="#D14343" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
              <Area type="monotone" dataKey="прибыль" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Students Growth & Membership Distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Students Growth */}
        <Card className="border-none soft-shadow">
          <CardHeader>
            <CardTitle className="text-[#133C2A] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#1C8C64]" />
              Рост учеников
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLine data={studentsGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
                <XAxis dataKey="month" stroke="#133C2A" />
                <YAxis stroke="#133C2A" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="студенты" stroke="#133C2A" strokeWidth={3} name="Всего студентов" />
                <Line type="monotone" dataKey="новые" stroke="#1C8C64" strokeWidth={2} name="Новые" />
                <Line type="monotone" dataKey="ушли" stroke="#D14343" strokeWidth={2} name="Ушли" />
              </RechartsLine>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Membership Distribution */}
        <Card className="border-none soft-shadow">
          <CardHeader>
            <CardTitle className="text-[#133C2A] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#D4AF37]" />
              Распределение абонементов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPie>
                <Pie
                  data={membershipData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {membershipData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {membershipData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-[#F8F4E3]/50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-[#133C2A]">{item.name}</span>
                  </div>
                  <span className="text-sm text-[#133C2A]">{item.amount.toLocaleString('ru-RU')} ₽</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Performance & Sales Funnel */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Teacher Performance */}
        <Card className="border-none soft-shadow">
          <CardHeader>
            <CardTitle className="text-[#133C2A] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#D4AF37]" />
              Производительность преподавателей
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teacherPerformanceData.map((teacher, index) => (
                <div key={index} className="p-4 rounded-xl bg-gradient-to-r from-[#F8F4E3] to-white border border-[#133C2A]/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center text-white">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-[#133C2A]">{teacher.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="bg-[#1C8C64]/10 text-[#1C8C64] border-[#1C8C64]/20">
                            ⭐ {teacher.рейтинг}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <p className="text-xs text-blue-600">Студентов</p>
                      <p className="text-lg text-blue-700">{teacher.студенты}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-purple-50">
                      <p className="text-xs text-purple-600">Занятий</p>
                      <p className="text-lg text-purple-700">{teacher.занятия}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-green-50">
                      <p className="text-xs text-green-600">Доход</p>
                      <p className="text-lg text-green-700">{(teacher.доход / 1000).toFixed(0)}К</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={250} className="mt-6">
              <RechartsBar data={teacherPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
                <XAxis dataKey="name" stroke="#133C2A" tick={{ fontSize: 12 }} />
                <YAxis stroke="#133C2A" />
                <Tooltip />
                <Legend />
                <Bar dataKey="доход" fill="#1C8C64" name="Доход, ₽" />
              </RechartsBar>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales Funnel */}
        <Card className="border-none soft-shadow">
          <CardHeader>
            <CardTitle className="text-[#133C2A] flex items-center gap-2">
              <Target className="w-5 h-5 text-[#133C2A]" />
              Воронка продаж
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {salesFunnelData.map((stage, index) => {
                const maxCount = salesFunnelData[0].count;
                const widthPercent = (stage.count / maxCount) * 100;
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#133C2A]">{stage.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#133C2A]">{stage.count}</span>
                        <Badge className="bg-[#133C2A]/10 text-[#133C2A] border-[#133C2A]/20">
                          {stage.percent}%
                        </Badge>
                      </div>
                    </div>
                    <div className="relative h-10 bg-[#F8F4E3] rounded-xl overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#133C2A] to-[#1C8C64] transition-all duration-500 flex items-center justify-center"
                        style={{ width: `${widthPercent}%` }}
                      >
                        {widthPercent > 30 && (
                          <span className="text-xs text-white">{stage.count} чел.</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-[#1C8C64]/10 to-[#1C8C64]/5 border border-[#1C8C64]/20">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#133C2A]/70">Общая конверсия</p>
                <p className="text-2xl text-[#1C8C64]">{salesFunnelData[salesFunnelData.length - 1].percent}%</p>
              </div>
              <p className="text-xs text-[#133C2A]/60 mt-1">
                {salesFunnelData[salesFunnelData.length - 1].count} из {salesFunnelData[0].count} обращений
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income Sources & Class Attendance */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Income Sources */}
        <Card className="border-none soft-shadow">
          <CardHeader>
            <CardTitle className="text-[#133C2A] flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#D4AF37]" />
              Источники дохода
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPie>
                <Pie
                  data={incomeSourcesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({name, value}) => `${name}: ${(value / 1000).toFixed(0)}К`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {incomeSourcesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toLocaleString('ru-RU')} ₽`} />
              </RechartsPie>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {incomeSourcesData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-[#F8F4E3]/50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-[#133C2A]">{item.name}</span>
                  </div>
                  <span className="text-sm text-[#133C2A]">{item.value.toLocaleString('ru-RU')} ₽</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Class Attendance by Day & Time */}
        <Card className="border-none soft-shadow">
          <CardHeader>
            <CardTitle className="text-[#133C2A] flex items-center gap-2">
              <LineChart className="w-5 h-5 text-[#133C2A]" />
              Посещаемость по дням и времени
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBar data={classAttendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
                <XAxis dataKey="day" stroke="#133C2A" />
                <YAxis stroke="#133C2A" />
                <Tooltip />
                <Legend />
                <Bar dataKey="утро" stackId="a" fill="#D4AF37" name="Утро" />
                <Bar dataKey="день" stackId="a" fill="#1C8C64" name="День" />
                <Bar dataKey="вечер" stackId="a" fill="#133C2A" name="Вечер" />
              </RechartsBar>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Student Demographics & Retention Rate */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Student Demographics */}
        <Card className="border-none soft-shadow">
          <CardHeader>
            <CardTitle className="text-[#133C2A] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#133C2A]" />
              Демография студентов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBar data={studentDemographicsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
                <XAxis dataKey="age" stroke="#133C2A" />
                <YAxis stroke="#133C2A" />
                <Tooltip />
                <Bar dataKey="количество" fill="#133C2A" name="Студентов" />
              </RechartsBar>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Retention Rate */}
        <Card className="border-none soft-shadow">
          <CardHeader>
            <CardTitle className="text-[#133C2A] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#1C8C64]" />
              Показатель удержания клиентов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLine data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#133C2A20" />
                <XAxis dataKey="month" stroke="#133C2A" />
                <YAxis stroke="#133C2A" domain={[85, 100]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="удержание" 
                  stroke="#1C8C64" 
                  strokeWidth={3} 
                  name="Удержание, %"
                  dot={{ fill: '#1C8C64', r: 6 }}
                />
              </RechartsLine>
            </ResponsiveContainer>
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-[#1C8C64]/10 to-[#1C8C64]/5 border border-[#1C8C64]/20">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#133C2A]/70">Среднее удержание</p>
                <p className="text-2xl text-[#1C8C64]">94%</p>
              </div>
              <p className="text-xs text-[#133C2A]/60 mt-1">
                Отличный показатель! Студенты довольны вашей студией
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      <Card className="border-none soft-shadow bg-gradient-to-br from-[#133C2A]/5 to-[#D4AF37]/5">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Ключевые инсайты</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white border border-[#1C8C64]/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1C8C64]/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-[#1C8C64]" />
                </div>
                <div>
                  <p className="text-[#133C2A] mb-1">Рост выручки</p>
                  <p className="text-sm text-[#133C2A]/70">
                    Ваша выручка выросла на {stats.revenueGrowth}% за последний месяц. Основной рост обеспечили безлимитные абонементы.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#D4AF37]/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-[#133C2A] mb-1">Лучший преподаватель</p>
                  <p className="text-sm text-[#133C2A]/70">
                    Анна Петрова показывает лучшие результаты: 28 студентов и рейтинг 4.9. Рекомендуем увеличить её нагрузку.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#133C2A]/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#133C2A]/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-[#133C2A]" />
                </div>
                <div>
                  <p className="text-[#133C2A] mb-1">Оптимальное время</p>
                  <p className="text-sm text-[#133C2A]/70">
                    Вечерние занятия в среду и пятницу наиболее популярны. Рассмотрите возможность добавления групп.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#FADADD]/40">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FADADD]/30 flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-[#133C2A]" />
                </div>
                <div>
                  <p className="text-[#133C2A] mb-1">Конверсия</p>
                  <p className="text-sm text-[#133C2A]/70">
                    Конверсия из пробного в покупку составляет {stats.trialConversion}%. Это выше среднего по индустрии!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
