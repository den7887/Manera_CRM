import { Coins, TrendingUp, TrendingDown, Download, Filter, Receipt, DollarSign, Package, Users, Zap, ShoppingBag, Briefcase, Shield, Building2, Wrench, MoreHorizontal, Plus, Search, Calendar as CalendarIcon, Edit2, Trash2, X, Wallet, CreditCard, ArrowUpRight } from 'lucide-react';
import { FinanceStats, MonthlyData, Payment, Expense, ExpenseCategory, CustomExpenseCategory } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState, useMemo } from 'react';
import { toast } from 'sonner@2.0.3';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface OwnerFinanceProps {
  stats: FinanceStats;
  monthlyData: MonthlyData[];
  payments: Payment[];
  expenses: Expense[];
}

const categoryIcons: Record<string, any> = {
  rent: Building2,
  salaries: Users,
  utilities: Zap,
  equipment: ShoppingBag,
  marketing: Briefcase,
  maintenance: Wrench,
  materials: Package,
  insurance: Shield,
  taxes: Receipt,
};

const categoryColors: Record<string, string> = {
  rent: '#133C2A',
  salaries: '#D4AF37',
  utilities: '#1C8C64',
  equipment: '#B8941F',
  marketing: '#9C7A2F',
  maintenance: '#7D6E42',
  materials: '#5F8575',
  insurance: '#4A7C59',
  taxes: '#8B7355',
};

const categoryNames: Record<string, string> = {
  rent: 'Аренда',
  salaries: 'Зарплаты',
  utilities: 'Коммунальные услуги',
  equipment: 'Оборудование',
  marketing: 'Маркетинг',
  maintenance: 'Обслуживание',
  materials: 'Материалы и костюмы',
  insurance: 'Страхование',
  taxes: 'Налоги',
};

// Helper function to get category display name
const getCategoryName = (category: string) => {
  return categoryNames[category] || category;
};

// Helper function to get category icon
const getCategoryIcon = (category: string) => {
  return categoryIcons[category] || MoreHorizontal;
};

// Helper function to get category color
const getCategoryColor = (category: string) => {
  return categoryColors[category] || '#6B6B6B';
};

export function OwnerFinance({ stats, monthlyData, payments, expenses }: OwnerFinanceProps) {
  const recentPayments = payments.slice(0, 10);
  
  // Expenses state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'month' | 'quarter' | 'year'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  // Category detail dialog state
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<ExpenseCategory | null>(null);
  const [detailPeriodFilter, setDetailPeriodFilter] = useState<'month' | '3months' | '6months' | 'year' | 'all'>('month');
  
  const [newExpense, setNewExpense] = useState({
    category: 'other' as ExpenseCategory,
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(e => e.category === categoryFilter);
    }

    // Period filter
    if (periodFilter !== 'all') {
      const now = new Date();
      const expenseDate = (e: Expense) => new Date(e.date);
      
      if (periodFilter === 'month') {
        filtered = filtered.filter(e => {
          const date = expenseDate(e);
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        });
      } else if (periodFilter === 'quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        filtered = filtered.filter(e => {
          const date = expenseDate(e);
          const quarter = Math.floor(date.getMonth() / 3);
          return quarter === currentQuarter && date.getFullYear() === now.getFullYear();
        });
      } else if (periodFilter === 'year') {
        filtered = filtered.filter(e => expenseDate(e).getFullYear() === now.getFullYear());
      }
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(e => 
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, categoryFilter, periodFilter, searchQuery]);

  // Calculate stats
  const expenseStats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const count = filteredExpenses.length;
    const average = count > 0 ? total / count : 0;

    const byCategory = filteredExpenses.reduce((acc, e) => {
      if (!acc[e.category]) {
        acc[e.category] = 0;
      }
      acc[e.category] += e.amount;
      return acc;
    }, {} as Record<ExpenseCategory, number>);

    return { total, count, average, byCategory };
  }, [filteredExpenses]);

  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.amount) {
      toast.error('Заполните обязательные поля');
      return;
    }

    toast.success('асход добавлен', {
      description: `${newExpense.description} • ${Number(newExpense.amount).toLocaleString('ru-RU')} ₽`
    });

    setNewExpense({
      category: 'other',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsAddDialogOpen(false);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description,
      date: new Date(expense.date).toISOString().split('T')[0],
      notes: expense.notes || '',
    });
  };

  const handleUpdateExpense = () => {
    if (!newExpense.description || !newExpense.amount) {
      toast.error('Заполните обязательные поля');
      return;
    }

    toast.success('Расход обновлен');
    setEditingExpense(null);
    setNewExpense({
      category: 'other',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const handleDeleteExpense = (expense: Expense) => {
    toast.success('Расход удален', {
      description: expense.description
    });
  };

  const handleExportExpenses = () => {
    toast.success('Экспорт расходов', {
      description: 'CSV файл загружен'
    });
  };

  // Functions for category detail view
  const getCategoryExpenses = (category: ExpenseCategory) => {
    const now = new Date();
    let startDate = new Date();
    
    switch (detailPeriodFilter) {
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(0);
        break;
    }
    
    return expenses
      .filter(e => e.category === category && e.date >= startDate)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const getExpenseTrendData = (category: ExpenseCategory) => {
    const categoryExpenses = getCategoryExpenses(category);
    
    const monthlyData: { [key: string]: number } = {};
    
    categoryExpenses.forEach(expense => {
      const monthKey = expense.date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + expense.amount;
    });
    
    return Object.entries(monthlyData)
      .map(([month, amount]) => ({ month, amount }))
      .reverse();
  };

  const handleCategoryClick = (category: ExpenseCategory) => {
    setSelectedCategoryDetail(category);
  };

  const handleQuickAddExpense = (category: ExpenseCategory) => {
    // Set the category for the new expense
    setNewExpense({
      category: category,
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    // Close the category detail dialog first
    setSelectedCategoryDetail(null);
    // Then open the add expense dialog with a small delay
    setTimeout(() => {
      setIsAddDialogOpen(true);
    }, 100);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Финансы и аналитика</h1>
          <p className="text-[#133C2A]/60">Управление доходами и расходами студии</p>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1C8C64] to-[#133C2A] flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#133C2A]/60">Общий доход</p>
                <p className="text-2xl text-[#133C2A]">{stats.totalIncome.toLocaleString('ru-RU')} ₽</p>
              </div>
            </div>
            <Badge className="bg-[#1C8C64]/10 text-[#1C8C64] border-[#1C8C64]/20">
              +{stats.revenueGrowth}% к прошлому месяцу
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                <TrendingDown className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#133C2A]/60">Расходы</p>
                <p className="text-2xl text-[#133C2A]">{stats.totalExpenses.toLocaleString('ru-RU')} ₽</p>
              </div>
            </div>
            <Badge variant="outline" className="border-[#133C2A]/20 text-[#133C2A]">
              Аренда, зарплаты, оборудование
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center">
                <Coins className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#133C2A]/60">Чистая прибыль</p>
                <p className="text-2xl text-[#133C2A]">{stats.netProfit.toLocaleString('ru-RU')} ₽</p>
              </div>
            </div>
            <Badge className="bg-[#133C2A]/10 text-[#133C2A] border-[#133C2A]/20">
              Маржа {((stats.netProfit / stats.totalIncome) * 100).toFixed(1)}%
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-[#F8F4E3] p-1 rounded-2xl">
          <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#133C2A]">
            Обзор
          </TabsTrigger>
          <TabsTrigger value="income" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#133C2A]">
            Доходы
          </TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#133C2A]">
            Расходы
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Interactive Graph */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A]">Динамика доходов и расходов</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#133C2A10" />
                  <XAxis dataKey="month" stroke="#133C2A" />
                  <YAxis stroke="#133C2A" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#F8F4E3', 
                      border: '1px solid #133C2A20',
                      borderRadius: '12px',
                      padding: '12px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="income" fill="#1C8C64" name="Доход" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="expenses" fill="#D4AF37" name="Расходы" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Growth Chart */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A]">Тренд доходов</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#133C2A10" />
                  <XAxis dataKey="month" stroke="#133C2A" />
                  <YAxis stroke="#133C2A" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#F8F4E3', 
                      border: '1px solid #133C2A20',
                      borderRadius: '12px',
                      padding: '12px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#1C8C64" 
                    strokeWidth={3}
                    name="Доход"
                    dot={{ fill: '#1C8C64', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Tab */}
        <TabsContent value="income" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[#133C2A] mb-1">Платежи от клиентов</h2>
              <p className="text-sm text-[#133C2A]/60">{payments.length} платежей</p>
            </div>
            <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 gap-2">
              <Download className="w-4 h-4" />
              Экспорт
            </Button>
          </div>

          <Card className="border-none soft-shadow">
            <CardContent className="p-6">
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F4E3] hover:bg-[#F8F4E3]/70 transition-smooth"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        payment.status === 'paid' 
                          ? 'bg-[#1C8C64]/20' 
                          : payment.status === 'pending'
                          ? 'bg-[#D4AF37]/20'
                          : 'bg-red-100'
                      }`}>
                        <Coins className={`w-6 h-6 ${
                          payment.status === 'paid' 
                            ? 'text-[#1C8C64]' 
                            : payment.status === 'pending'
                            ? 'text-[#D4AF37]'
                            : 'text-red-500'
                        }`} />
                      </div>
                      <div>
                        <h4 className="text-[#133C2A]">{payment.description}</h4>
                        <p className="text-sm text-[#133C2A]/60">
                          {payment.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl text-[#133C2A] mb-1">{payment.amount.toLocaleString('ru-RU')} ₽</p>
                      <Badge 
                        variant="outline"
                        className={
                          payment.status === 'paid'
                            ? 'border-[#1C8C64]/20 text-[#1C8C64] bg-[#1C8C64]/10'
                            : payment.status === 'pending'
                            ? 'border-[#D4AF37]/20 text-[#D4AF37] bg-[#D4AF37]/10'
                            : 'border-red-200 text-red-600 bg-red-50'
                        }
                      >
                        {payment.status === 'paid' ? 'Оплачено' : payment.status === 'pending' ? 'Ожидает' : 'Просрочено'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-6">
          {/* Header with actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/40" />
              <Input
                placeholder="Поиск расходов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 rounded-2xl border-[#133C2A]/20"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(value: any) => setCategoryFilter(value)}>
              <SelectTrigger className="w-[200px] rounded-2xl border-[#133C2A]/20">
                <SelectValue placeholder="Все категории" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {Object.entries(categoryNames).map(([key, name]) => (
                  <SelectItem key={key} value={key}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={periodFilter} onValueChange={(value: any) => setPeriodFilter(value)}>
              <SelectTrigger className="w-[180px] rounded-2xl border-[#133C2A]/20">
                <SelectValue placeholder="Все время" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все время</SelectItem>
                <SelectItem value="month">Этот месяц</SelectItem>
                <SelectItem value="quarter">Этот квартал</SelectItem>
                <SelectItem value="year">Этот год</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 gap-2">
                  <Plus className="w-4 h-4" />
                  Добавить расход
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-[#133C2A]">Новый расход</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Категория *</Label>
                    <Select value={newExpense.category} onValueChange={(value: ExpenseCategory) => setNewExpense({...newExpense, category: value})}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryNames).map(([key, name]) => (
                          <SelectItem key={key} value={key}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Описание *</Label>
                    <Input
                      id="description"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                      placeholder="Например: Аренда зала за декабрь"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Сумма (₽) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                        placeholder="0"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Дата</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newExpense.date}
                        onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Примечания</Label>
                    <Textarea
                      id="notes"
                      value={newExpense.notes}
                      onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})}
                      placeholder="Дополнительная информация..."
                      className="rounded-xl resize-none"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl">
                    Отмена
                  </Button>
                  <Button onClick={handleAddExpense} className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
                    Добавить
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleExportExpenses} className="rounded-2xl border-[#133C2A]/20 gap-2">
              <Download className="w-4 h-4" />
              Экспорт
            </Button>
          </div>

          {/* Expense Stats */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-none soft-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#133C2A]/60">Всего расходов</p>
                    <p className="text-2xl text-[#133C2A]">{expenseStats.total.toLocaleString('ru-RU')} ₽</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none soft-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#1C8C64] flex items-center justify-center">
                    <Filter className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#133C2A]/60">Количество</p>
                    <p className="text-2xl text-[#133C2A]">{expenseStats.count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none soft-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1C8C64] to-[#133C2A] flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#133C2A]/60">Средний расход</p>
                    <p className="text-2xl text-[#133C2A]">{expenseStats.average.toLocaleString('ru-RU', {maximumFractionDigits: 0})} ₽</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expenses by Category */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#133C2A]">Расходы по категориям</CardTitle>
                <p className="text-xs text-[#133C2A]/50">Нажмите для подробностей</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(expenseStats.byCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => {
                    const Icon = categoryIcons[category as ExpenseCategory] || MoreHorizontal;
                    const percentage = (amount / expenseStats.total) * 100;
                    return (
                      <div 
                        key={category} 
                        className="space-y-2 cursor-pointer group"
                        onClick={() => handleCategoryClick(category as ExpenseCategory)}
                      >
                        <div className="flex items-center justify-between hover:bg-[#F8F4E3] p-2 rounded-xl transition-smooth">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                              style={{ backgroundColor: `${categoryColors[category as ExpenseCategory]}20` }}
                            >
                              <Icon className="w-5 h-5" style={{ color: categoryColors[category as ExpenseCategory] }} />
                            </div>
                            <span className="text-[#133C2A] group-hover:text-[#D4AF37] transition-colors">{categoryNames[category as ExpenseCategory]}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-[#133C2A]">{amount.toLocaleString('ru-RU')} ₽</p>
                            <p className="text-sm text-[#133C2A]/60">{percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-[#F8F4E3] rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: categoryColors[category as ExpenseCategory]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Expenses List */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A]">
                Список расходов
                <span className="text-sm text-[#133C2A]/60 ml-2">({filteredExpenses.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredExpenses.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="w-12 h-12 text-[#133C2A]/20 mx-auto mb-3" />
                    <p className="text-[#133C2A]/60">Расходов не найдено</p>
                  </div>
                ) : (
                  filteredExpenses.map((expense) => {
                    const Icon = categoryIcons[expense.category] || MoreHorizontal;
                    return (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F4E3] hover:bg-[#F8F4E3]/70 transition-smooth group"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${categoryColors[expense.category]}20` }}
                          >
                            <Icon className="w-6 h-6" style={{ color: categoryColors[expense.category] }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[#133C2A]">{expense.description}</h4>
                              <Badge variant="outline" className="text-xs">
                                {categoryNames[expense.category]}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-sm text-[#133C2A]/60">
                                {new Date(expense.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                              {expense.notes && (
                                <>
                                  <span className="text-[#133C2A]/30">•</span>
                                  <p className="text-sm text-[#133C2A]/60">{expense.notes}</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-xl text-[#133C2A]">{expense.amount.toLocaleString('ru-RU')} ₽</p>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Dialog open={editingExpense?.id === expense.id} onOpenChange={(open) => !open && setEditingExpense(null)}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditExpense(expense)}
                                  className="h-8 w-8 p-0 rounded-xl"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[500px] rounded-3xl">
                                <DialogHeader>
                                  <DialogTitle className="text-[#133C2A]">Редактировать расход</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-category">Категория *</Label>
                                    <Select value={newExpense.category} onValueChange={(value: ExpenseCategory) => setNewExpense({...newExpense, category: value})}>
                                      <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(categoryNames).map(([key, name]) => (
                                          <SelectItem key={key} value={key}>{name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-description">Описание *</Label>
                                    <Input
                                      id="edit-description"
                                      value={newExpense.description}
                                      onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                                      className="rounded-xl"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-amount">Сумма (₽) *</Label>
                                      <Input
                                        id="edit-amount"
                                        type="number"
                                        value={newExpense.amount}
                                        onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                                        className="rounded-xl"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-date">Дата</Label>
                                      <Input
                                        id="edit-date"
                                        type="date"
                                        value={newExpense.date}
                                        onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                                        className="rounded-xl"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-notes">Примечания</Label>
                                    <Textarea
                                      id="edit-notes"
                                      value={newExpense.notes}
                                      onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})}
                                      className="rounded-xl resize-none"
                                      rows={3}
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingExpense(null)} className="rounded-xl">
                                    Отмена
                                  </Button>
                                  <Button onClick={handleUpdateExpense} className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
                                    Сохранить
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteExpense(expense)}
                              className="h-8 w-8 p-0 rounded-xl hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Detail Dialog */}
      <Dialog open={selectedCategoryDetail !== null} onOpenChange={(open) => !open && setSelectedCategoryDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedCategoryDetail && (() => {
            const Icon = categoryIcons[selectedCategoryDetail] || MoreHorizontal;
            const categoryExpenses = getCategoryExpenses(selectedCategoryDetail);
            const totalCategoryAmount = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
            const trendData = getExpenseTrendData(selectedCategoryDetail);
            
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${categoryColors[selectedCategoryDetail]}20` }}
                      >
                        <Icon className="w-7 h-7" style={{ color: categoryColors[selectedCategoryDetail] }} />
                      </div>
                      <div>
                        <DialogTitle className="text-[#133C2A]">{categoryNames[selectedCategoryDetail]}</DialogTitle>
                        <DialogDescription>
                          Детальный просмотр расходов по категории
                        </DialogDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleQuickAddExpense(selectedCategoryDetail)}
                        className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 gap-2"
                        size="sm"
                      >
                        <Plus className="w-4 h-4" />
                        Добавить расход
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCategoryDetail(null)}
                        className="rounded-xl"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Period Filter */}
                  <Card className="border-none soft-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-[#133C2A]/60" />
                          <span className="text-sm text-[#133C2A]/60">Период:</span>
                        </div>
                        <Select value={detailPeriodFilter} onValueChange={(value) => setDetailPeriodFilter(value as typeof detailPeriodFilter)}>
                          <SelectTrigger className="w-[180px] rounded-xl border-[#133C2A]/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="month">Последний месяц</SelectItem>
                            <SelectItem value="3months">Последние 3 месяца</SelectItem>
                            <SelectItem value="6months">Последние 6 месяцев</SelectItem>
                            <SelectItem value="year">Последний год</SelectItem>
                            <SelectItem value="all">Всё время</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Summary Stats */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card className="border-none soft-shadow">
                      <CardContent className="p-4">
                        <p className="text-sm text-[#133C2A]/60 mb-1">Всего</p>
                        <p className="text-2xl text-[#133C2A]">{totalCategoryAmount.toLocaleString('ru-RU')} ₽</p>
                      </CardContent>
                    </Card>
                    <Card className="border-none soft-shadow">
                      <CardContent className="p-4">
                        <p className="text-sm text-[#133C2A]/60 mb-1">Записей</p>
                        <p className="text-2xl text-[#133C2A]">{categoryExpenses.length}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-none soft-shadow">
                      <CardContent className="p-4">
                        <p className="text-sm text-[#133C2A]/60 mb-1">Средняя сумма</p>
                        <p className="text-2xl text-[#133C2A]">
                          {categoryExpenses.length > 0 
                            ? Math.round(totalCategoryAmount / categoryExpenses.length).toLocaleString('ru-RU') 
                            : 0} ₽
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Expense Trend Chart */}
                  {trendData.length > 0 && (
                    <Card className="border-none soft-shadow">
                      <CardHeader>
                        <CardTitle className="text-[#133C2A] flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          Динамика расходов
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#133C2A10" />
                            <XAxis 
                              dataKey="month" 
                              stroke="#133C2A"
                              style={{ fontSize: '12px' }}
                            />
                            <YAxis 
                              stroke="#133C2A"
                              style={{ fontSize: '12px' }}
                              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#F8F4E3', 
                                border: 'none', 
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                              }}
                              formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`, 'Сумма']}
                            />
                            <Bar 
                              dataKey="amount" 
                              fill={categoryColors[selectedCategoryDetail]}
                              radius={[8, 8, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Expense List */}
                  <Card className="border-none soft-shadow">
                    <CardHeader>
                      <CardTitle className="text-[#133C2A]">
                        Список расходов ({categoryExpenses.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {categoryExpenses.length === 0 ? (
                          <div className="text-center py-8">
                            <Receipt className="w-12 h-12 text-[#133C2A]/20 mx-auto mb-3" />
                            <p className="text-[#133C2A]/60 text-sm">Расходы не найдены за выбранный период</p>
                          </div>
                        ) : (
                          categoryExpenses.map(expense => (
                            <div
                              key={expense.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-[#F8F4E3] hover:bg-[#F8F4E3]/70 transition-smooth"
                            >
                              <div className="flex-1">
                                <h4 className="text-[#133C2A] mb-1">{expense.description}</h4>
                                <div className="flex items-center gap-3 text-xs text-[#133C2A]/60">
                                  <span className="flex items-center gap-1">
                                    <CalendarIcon className="w-3 h-3" />
                                    {expense.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                  {expense.paymentMethod && (
                                    <span className="flex items-center gap-1">
                                      {expense.paymentMethod === 'cash' && <Wallet className="w-3 h-3" />}
                                      {expense.paymentMethod === 'card' && <CreditCard className="w-3 h-3" />}
                                      {expense.paymentMethod === 'transfer' && <ArrowUpRight className="w-3 h-3" />}
                                      {expense.paymentMethod === 'cash' ? 'Наличные' : expense.paymentMethod === 'card' ? 'Карта' : 'Перевод'}
                                    </span>
                                  )}
                                </div>
                                {expense.recipientName && (
                                  <p className="text-xs text-[#133C2A]/50 mt-1">• {expense.recipientName}</p>
                                )}
                                {expense.notes && (
                                  <p className="text-xs text-[#133C2A]/50 mt-1 italic">{expense.notes}</p>
                                )}
                              </div>
                              <div className="text-right ml-4">
                                <p className="text-lg text-[#133C2A]">{expense.amount.toLocaleString('ru-RU')} ₽</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}