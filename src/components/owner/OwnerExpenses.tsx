import { useState } from 'react';
import { Plus, Receipt, Calendar, DollarSign, Filter, Download, Edit, Trash2, FileText, CreditCard, Wallet, ArrowUpRight, TrendingUp, X } from 'lucide-react';
import { Expense, ExpenseCategory } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner@2.0.3';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface OwnerExpensesProps {
  expenses: Expense[];
}

const categoryNames: Record<ExpenseCategory, string> = {
  rent: 'Аренда',
  salaries: 'Зарплаты',
  utilities: 'Коммунальные услуги',
  equipment: 'Оборудование',
  marketing: 'Маркетинг',
  materials: 'Материалы',
  maintenance: 'Обслуживание',
  taxes: 'Налоги',
  insurance: 'Страхование',
  other: 'Прочие',
};

const categoryIcons: Record<ExpenseCategory, any> = {
  rent: Receipt,
  salaries: DollarSign,
  utilities: ArrowUpRight,
  equipment: FileText,
  marketing: ArrowUpRight,
  materials: FileText,
  maintenance: ArrowUpRight,
  taxes: Receipt,
  insurance: FileText,
  other: Receipt,
};

const categoryColors: Record<ExpenseCategory, string> = {
  rent: 'from-[#D4AF37] to-[#B8941F]',
  salaries: 'from-[#133C2A] to-[#D4AF37]',
  utilities: 'from-[#1C8C64] to-[#133C2A]',
  equipment: 'from-[#D4AF37] to-[#133C2A]',
  marketing: 'from-[#B8941F] to-[#D4AF37]',
  materials: 'from-[#133C2A] to-[#1C8C64]',
  maintenance: 'from-[#D4AF37] to-[#1C8C64]',
  taxes: 'from-[#133C2A] to-[#B8941F]',
  insurance: 'from-[#1C8C64] to-[#D4AF37]',
  other: 'from-[#133C2A] to-[#D4AF37]',
};

export function OwnerExpenses({ expenses }: OwnerExpensesProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'all'>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<ExpenseCategory | null>(null);
  const [periodFilter, setPeriodFilter] = useState<'month' | '3months' | '6months' | 'year' | 'all'>('month');

  // Форма нового расхода
  const [newExpense, setNewExpense] = useState({
    category: '' as ExpenseCategory,
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: '' as 'cash' | 'card' | 'transfer' | '',
    recipientName: '',
    notes: '',
  });

  // Фильтрация расходов
  const filteredExpenses = expenses.filter(expense => {
    const categoryMatch = filterCategory === 'all' || expense.category === filterCategory;
    const monthMatch = filterMonth === 'all' || 
      expense.date.toISOString().slice(0, 7) === filterMonth;
    return categoryMatch && monthMatch;
  });

  // Статистика по категориям
  const categoryStats = Object.keys(categoryNames).map(cat => {
    const category = cat as ExpenseCategory;
    const categoryExpenses = filteredExpenses.filter(e => e.category === category);
    const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      category,
      name: categoryNames[category],
      total,
      count: categoryExpenses.length,
    };
  }).filter(stat => stat.total > 0)
    .sort((a, b) => b.total - a.total);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Получить расходы по выбранной категории с фильтром по периоду
  const getCategoryExpenses = (category: ExpenseCategory) => {
    const now = new Date();
    let startDate = new Date();
    
    switch (periodFilter) {
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
        startDate = new Date(0); // начало времени
        break;
    }
    
    return expenses
      .filter(e => e.category === category && e.date >= startDate)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  // Подготовка данных для графика динамики расходов
  const getExpenseTrendData = (category: ExpenseCategory) => {
    const categoryExpenses = getCategoryExpenses(category);
    
    // Группировка по месяцам
    const monthlyData: { [key: string]: number } = {};
    
    categoryExpenses.forEach(expense => {
      const monthKey = expense.date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + expense.amount;
    });
    
    // Преобразование в массив для графика
    return Object.entries(monthlyData)
      .map(([month, amount]) => ({ month, amount }))
      .reverse();
  };

  const handleCategoryClick = (category: ExpenseCategory) => {
    setSelectedCategoryDetail(category);
  };

  const handleAddExpense = () => {
    if (!newExpense.category || !newExpense.amount || !newExpense.description) {
      toast.error('Ошибка', {
        description: 'Пожалуйста, заполните все обязательные поля',
        duration: 2000,
      });
      return;
    }

    toast.success('Расход добавлен', {
      description: `${categoryNames[newExpense.category]}: ${parseFloat(newExpense.amount).toLocaleString('ru-RU')} ₽`,
      duration: 3000,
    });

    setNewExpense({
      category: '' as ExpenseCategory,
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      paymentMethod: '',
      recipientName: '',
      notes: '',
    });
    setIsAddDialogOpen(false);
  };

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (selectedExpense) {
      toast.success('Расход обновлён', {
        description: 'Изменения сохранены успешно',
        duration: 2000,
      });
    }
    setIsEditDialogOpen(false);
    setSelectedExpense(null);
  };

  const handleDeleteExpense = (expense: Expense) => {
    toast.success('Расход удалён', {
      description: `${categoryNames[expense.category]} удалён из учёта`,
      duration: 2000,
    });
  };

  const handleExport = () => {
    toast.info('Экспорт данных', {
      description: 'Загружаем отчёт по расходам в формате CSV',
      duration: 2000,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[#133C2A] mb-2">Учёт расходов</h1>
          <p className="text-[#133C2A]/60">Управление всеми расходами студии</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleExport}
            variant="outline" 
            className="rounded-2xl border-[#133C2A]/20 gap-2"
          >
            <Download className="w-4 h-4" />
            Экспорт
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 gap-2">
                <Plus className="w-4 h-4" />
                Добавить расход
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-[#133C2A]">Новый расход</DialogTitle>
                <DialogDescription>
                  Добавьте информацию о расходе студии
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Категория *</Label>
                  <Select 
                    value={newExpense.category} 
                    onValueChange={(value) => setNewExpense({ ...newExpense, category: value as ExpenseCategory })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryNames).map(([key, name]) => (
                        <SelectItem key={key} value={key}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Сумма (₽) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Дата *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание *</Label>
                  <Input
                    id="description"
                    placeholder="Например: Аренда зала за январь"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Способ оплаты</Label>
                  <Select 
                    value={newExpense.paymentMethod} 
                    onValueChange={(value) => setNewExpense({ ...newExpense, paymentMethod: value as 'cash' | 'card' | 'transfer' })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Выберите способ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Наличные</SelectItem>
                      <SelectItem value="card">Карта</SelectItem>
                      <SelectItem value="transfer">Перевод</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientName">Получатель платежа</Label>
                  <Input
                    id="recipientName"
                    placeholder="Например: ООО Танцевальный зал"
                    value={newExpense.recipientName}
                    onChange={(e) => setNewExpense({ ...newExpense, recipientName: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Заметки</Label>
                  <Textarea
                    id="notes"
                    placeholder="Дополнительная информация..."
                    value={newExpense.notes}
                    onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                    className="rounded-xl resize-none"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleAddExpense}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
                >
                  Добавить расход
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-none soft-shadow">
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#133C2A]/60" />
              <span className="text-sm text-[#133C2A]/60">Фильтры:</span>
            </div>
            <Select value={filterCategory} onValueChange={(value) => setFilterCategory(value as ExpenseCategory | 'all')}>
              <SelectTrigger className="w-[180px] rounded-xl border-[#133C2A]/20">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {Object.entries(categoryNames).map(([key, name]) => (
                  <SelectItem key={key} value={key}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[180px] rounded-xl border-[#133C2A]/20">
                <SelectValue placeholder="Период" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все месяцы</SelectItem>
                <SelectItem value={new Date().toISOString().slice(0, 7)}>Текущий месяц</SelectItem>
                <SelectItem value={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7)}>Прошлый месяц</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Всего расходов</p>
                <p className="text-2xl text-[#133C2A]">{totalExpenses.toLocaleString('ru-RU')} ₽</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#1C8C64] flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Записей</p>
                <p className="text-2xl text-[#133C2A]">{filteredExpenses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1C8C64] to-[#D4AF37] flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Средний расход</p>
                <p className="text-2xl text-[#133C2A]">
                  {filteredExpenses.length > 0 
                    ? Math.round(totalExpenses / filteredExpenses.length).toLocaleString('ru-RU') 
                    : 0} ₽
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#133C2A] flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Категорий</p>
                <p className="text-2xl text-[#133C2A]">{categoryStats.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#133C2A]">Расходы по категориям</CardTitle>
            <p className="text-xs text-[#133C2A]/50">Нажмите на категорию для подробностей</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categoryStats.map(stat => {
              const Icon = categoryIcons[stat.category];
              const percentage = ((stat.total / totalExpenses) * 100).toFixed(1);
              return (
                <div 
                  key={stat.category} 
                  onClick={() => handleCategoryClick(stat.category)}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-[#F8F4E3] hover:bg-[#F8F4E3]/70 transition-smooth cursor-pointer group"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${categoryColors[stat.category]} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#133C2A] group-hover:text-[#D4AF37] transition-colors">{stat.name}</span>
                      <span className="text-[#133C2A]">{stat.total.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-[#133C2A]/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${categoryColors[stat.category]}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-[#133C2A]/60">{percentage}%</span>
                    </div>
                    <p className="text-xs text-[#133C2A]/50 mt-1">{stat.count} {stat.count === 1 ? 'запись' : 'записей'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Expense List */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">История расходов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-16 h-16 text-[#133C2A]/20 mx-auto mb-4" />
                <p className="text-[#133C2A]/60">Расходы не найдены</p>
                <p className="text-sm text-[#133C2A]/40 mt-1">Попробуйте изменить фильтры или добавить новый расход</p>
              </div>
            ) : (
              filteredExpenses.map(expense => {
                const Icon = categoryIcons[expense.category];
                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F4E3] hover:bg-[#F8F4E3]/70 transition-smooth group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${categoryColors[expense.category]} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-[#133C2A]">{expense.description}</h4>
                          <Badge variant="outline" className="border-[#133C2A]/20 text-[#133C2A] text-xs">
                            {categoryNames[expense.category]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-[#133C2A]/60">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {expense.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                          {expense.paymentMethod && (
                            <span className="flex items-center gap-1">
                              {expense.paymentMethod === 'cash' && <Wallet className="w-3 h-3" />}
                              {expense.paymentMethod === 'card' && <CreditCard className="w-3 h-3" />}
                              {expense.paymentMethod === 'transfer' && <ArrowUpRight className="w-3 h-3" />}
                              {expense.paymentMethod === 'cash' ? 'Наличные' : expense.paymentMethod === 'card' ? 'Карта' : 'Перевод'}
                            </span>
                          )}
                          {expense.recipientName && (
                            <span className="text-xs">• {expense.recipientName}</span>
                          )}
                        </div>
                        {expense.notes && (
                          <p className="text-xs text-[#133C2A]/50 mt-1 italic">{expense.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right mr-4">
                        <p className="text-xl text-[#133C2A]">{expense.amount.toLocaleString('ru-RU')} ₽</p>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          onClick={() => handleEditExpense(expense)}
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-[#133C2A]/20 hover:bg-[#133C2A]/5"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteExpense(expense)}
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-red-200 hover:bg-red-50 text-red-600"
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">Редактирование расхода</DialogTitle>
            <DialogDescription>
              Изменение информации о расходе
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F8F4E3]">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${categoryColors[selectedExpense.category]} flex items-center justify-center`}>
                    {(() => {
                      const Icon = categoryIcons[selectedExpense.category];
                      return <Icon className="w-6 h-6 text-white" />;
                    })()}
                  </div>
                  <div>
                    <p className="text-[#133C2A]">{selectedExpense.description}</p>
                    <p className="text-sm text-[#133C2A]/60">{categoryNames[selectedExpense.category]}</p>
                  </div>
                </div>
                <div className="text-2xl text-[#133C2A]">{selectedExpense.amount.toLocaleString('ru-RU')} ₽</div>
              </div>

              <div className="p-4 rounded-xl border border-[#133C2A]/10 bg-[#F8F4E3]/50">
                <p className="text-sm text-[#133C2A]/70 mb-2">Функция редактирования находится в разработке</p>
                <p className="text-xs text-[#133C2A]/50">
                  В полной версии здесь можно будет изменить все параметры расхода
                </p>
              </div>

              <Button
                onClick={handleSaveEdit}
                className="w-full rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
              >
                Понятно
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Category Detail Dialog */}
      <Dialog open={selectedCategoryDetail !== null} onOpenChange={(open) => !open && setSelectedCategoryDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedCategoryDetail && (() => {
            const Icon = categoryIcons[selectedCategoryDetail];
            const categoryExpenses = getCategoryExpenses(selectedCategoryDetail);
            const totalCategoryAmount = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
            const trendData = getExpenseTrendData(selectedCategoryDetail);
            
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${categoryColors[selectedCategoryDetail]} flex items-center justify-center`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <DialogTitle className="text-[#133C2A]">{categoryNames[selectedCategoryDetail]}</DialogTitle>
                        <DialogDescription>
                          Детальный просмотр расходов по категории
                        </DialogDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCategoryDetail(null)}
                      className="rounded-xl"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Period Filter */}
                  <Card className="border-none soft-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#133C2A]/60" />
                          <span className="text-sm text-[#133C2A]/60">Период:</span>
                        </div>
                        <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as typeof periodFilter)}>
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
                              fill="url(#categoryGradient)" 
                              radius={[8, 8, 0, 0]}
                            />
                            <defs>
                              <linearGradient id="categoryGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#D4AF37" />
                                <stop offset="100%" stopColor="#133C2A" />
                              </linearGradient>
                            </defs>
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
                                    <Calendar className="w-3 h-3" />
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