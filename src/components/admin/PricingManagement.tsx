import { useState, useMemo } from 'react';
import { Product, ProductType, AgeGroup, DanceLevel } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Users,
  User,
  Clock,
  Calendar,
  Sparkles,
  TrendingUp,
  Eye,
  EyeOff,
  DollarSign,
  Target,
  Award
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface PricingManagementProps {
  products: Product[];
  onNavigateToCreate?: () => void;
  onNavigateToEdit?: (product: Product) => void;
}

const productTypeConfig = {
  individual: {
    label: 'Индивидуальные',
    icon: User,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-200',
  },
  group: {
    label: 'Групповые',
    icon: Users,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
  },
};

const ageGroupLabels: Record<AgeGroup, string> = {
  'kids_3_6': '3-6 лет',
  'kids_7_10': '7-10 лет',
  'teens_11_14': '11-14 лет',
  'teens_15_17': '15-17 лет',
  'adults_18plus': '18+ лет',
  'all_ages': 'Все возрасты',
};

const levelLabels: Record<DanceLevel, string> = {
  'beginner': 'Начинающие',
  'intermediate': 'Средний',
  'advanced': 'Продвинутый',
  'professional': 'Профессионалы',
  'all_levels': 'Все уровни',
};

const levelColors: Record<DanceLevel, string> = {
  'beginner': 'bg-green-100 text-green-700 border-green-300',
  'intermediate': 'bg-blue-100 text-blue-700 border-blue-300',
  'advanced': 'bg-orange-100 text-orange-700 border-orange-300',
  'professional': 'bg-purple-100 text-purple-700 border-purple-300',
  'all_levels': 'bg-gray-100 text-gray-700 border-gray-300',
};

export function PricingManagement({ products, onNavigateToCreate, onNavigateToEdit }: PricingManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const handleToggleActive = (product: Product) => {
    const action = product.isActive ? 'скрыт' : 'показан';
    toast.success(`Абонемент "${product.name}" ${action}`);
  };

  const handleDelete = (product: Product) => {
    if (confirm(`Удалить абонемент "${product.name}"?`)) {
      toast.success(`Абонемент "${product.name}" удален`);
    }
  };

  // Фильтрация продуктов
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === 'all' || product.type === filterType;
      
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' && product.isActive) ||
                           (filterStatus === 'inactive' && !product.isActive);
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [products, searchQuery, filterType, filterStatus]);

  // Группировка по типу
  const groupedProducts = useMemo(() => ({
    individual: filteredProducts.filter(p => p.type === 'individual'),
    group: filteredProducts.filter(p => p.type === 'group'),
  }), [filteredProducts]);

  const activeProducts = products.filter(p => p.isActive);
  const inactiveProducts = products.filter(p => !p.isActive);
  
  const averagePrice = products.length > 0 
    ? Math.round(products.reduce((sum, p) => sum + p.price, 0) / products.length)
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[#133C2A] mb-2">💎 Прайс и Абонементы</h1>
          <p className="text-[#133C2A]/60">Управление тарифами и пакетами занятий</p>
        </div>

        {onNavigateToCreate && (
          <Button 
            onClick={onNavigateToCreate}
            className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 gap-2"
          >
            <Plus className="w-5 h-5" />
            Создать абонемент
          </Button>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60">Всего абонементов</p>
                <p className="text-2xl md:text-3xl text-[#133C2A] mt-1">{products.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60">Активные</p>
                <p className="text-2xl md:text-3xl text-[#133C2A] mt-1">{activeProducts.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <Eye className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow hover-lift">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60">Средняя цена</p>
                <p className="text-2xl md:text-3xl text-[#133C2A] mt-1">{averagePrice.toLocaleString()} ₽</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1C8C64] to-[#133C2A] flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
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
                placeholder="Поиск абонемента..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl border-[#133C2A]/10 focus:border-[#D4AF37]"
              />
            </div>

            {/* Type Filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48 rounded-xl border-[#133C2A]/10">
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="individual">👤 Индивидуальные</SelectItem>
                <SelectItem value="group">👥 Групповые</SelectItem>
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
                <SelectItem value="inactive">Скрытые</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      {products.length === 0 ? (
        <Card className="border-none soft-shadow">
          <CardContent className="py-12 text-center">
            <Sparkles className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
            <h3 className="text-[#133C2A] mb-2">Нет абонементов</h3>
            <p className="text-[#133C2A]/60 mb-4">
              Создайте первый абонемент для вашей студии
            </p>
            <Button 
              onClick={onNavigateToCreate}
              className="bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white hover:opacity-90 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать абонемент
            </Button>
          </CardContent>
        </Card>
      ) : filteredProducts.length === 0 ? (
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
          {Object.entries(groupedProducts).map(([typeKey, typeProducts]) => {
            if (typeProducts.length === 0) return null;
            
            const typeConfig = productTypeConfig[typeKey as ProductType];
            const TypeIcon = typeConfig.icon;
            
            return (
              <div key={typeKey}>
                {/* Type Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${typeConfig.color} flex items-center justify-center`}>
                    <TypeIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl text-[#133C2A]">{typeConfig.label}</h2>
                    <p className="text-sm text-[#133C2A]/60">{typeProducts.length} абонементов</p>
                  </div>
                </div>

                {/* Products Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeProducts.map((product) => {
                    const hasDiscount = product.discountPercent && product.discountPercent > 0;
                    const pricePerClass = Math.round(product.price / product.classesCount);
                    
                    return (
                      <Card 
                        key={product.id} 
                        className={`border-none soft-shadow hover:shadow-xl transition-smooth relative overflow-hidden ${
                          !product.isActive ? 'opacity-60' : ''
                        }`}
                      >
                        {/* Discount Badge */}
                        {hasDiscount && (
                          <div className="absolute top-4 right-4 z-10">
                            <Badge className="bg-red-500 text-white border-none px-3 py-1">
                              -{product.discountPercent}%
                            </Badge>
                          </div>
                        )}

                        {/* Type Badge */}
                        <div className="absolute top-4 left-4 z-10">
                          <Badge className={`${typeConfig.bgColor} ${typeConfig.textColor} ${typeConfig.borderColor}`}>
                            <TypeIcon className="w-3 h-3 mr-1" />
                            {typeConfig.label}
                          </Badge>
                        </div>

                        <CardContent className="p-6 pt-16">
                          {/* Name & Status */}
                          <div className="mb-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="text-[#133C2A] flex-1">{product.name}</h3>
                              {product.isActive ? (
                                <Eye className="w-4 h-4 text-green-500 flex-shrink-0" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-[#133C2A]/60 line-clamp-2">
                              {product.description}
                            </p>
                          </div>

                          {/* Price */}
                          <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-[#F8F4E3] to-[#F8F4E3]/50">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-3xl text-[#133C2A]">
                                {product.price.toLocaleString()} ₽
                              </span>
                              {hasDiscount && product.originalPrice && (
                                <span className="text-lg text-[#133C2A]/40 line-through">
                                  {product.originalPrice.toLocaleString()} ₽
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[#133C2A]/60">
                              {pricePerClass.toLocaleString()} ₽ за занятие
                            </p>
                          </div>

                          {/* Info */}
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-sm text-[#133C2A]/70">
                              <Target className="w-4 h-4 text-[#D4AF37]" />
                              <span>{product.classesCount} занятий</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[#133C2A]/70">
                              <Calendar className="w-4 h-4 text-[#D4AF37]" />
                              <span>Срок: {product.validityDays} дней</span>
                            </div>
                            {product.durationMinutes && (
                              <div className="flex items-center gap-2 text-sm text-[#133C2A]/70">
                                <Clock className="w-4 h-4 text-[#D4AF37]" />
                                <span>{product.durationMinutes} минут</span>
                              </div>
                            )}
                            {product.type === 'group' && product.maxStudents && (
                              <div className="flex items-center gap-2 text-sm text-[#133C2A]/70">
                                <Users className="w-4 h-4 text-[#D4AF37]" />
                                <span>До {product.maxStudents} человек</span>
                              </div>
                            )}
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            <Badge variant="outline" className="text-xs">
                              {ageGroupLabels[product.ageGroup]}
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${levelColors[product.level]}`}>
                              <Award className="w-3 h-3 mr-1" />
                              {levelLabels[product.level]}
                            </Badge>
                          </div>

                          {/* Features */}
                          {product.features.length > 0 && (
                            <div className="mb-4 p-3 rounded-xl bg-[#133C2A]/5">
                              <ul className="space-y-1">
                                {product.features.slice(0, 3).map((feature, idx) => (
                                  <li key={idx} className="text-xs text-[#133C2A]/70 flex items-start gap-2">
                                    <span className="text-[#D4AF37] mt-0.5">✓</span>
                                    <span>{feature}</span>
                                  </li>
                                ))}
                                {product.features.length > 3 && (
                                  <li className="text-xs text-[#133C2A]/50 italic">
                                    +{product.features.length - 3} еще...
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}

                          {/* Actions */}
                          {onNavigateToEdit && (
                            <div className="flex gap-2 pt-4 border-t border-[#133C2A]/10">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onNavigateToEdit(product)}
                                className="flex-1 rounded-xl border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Редактировать
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleActive(product)}
                                className="rounded-xl"
                                title={product.isActive ? 'Скрыть' : 'Показать'}
                              >
                                {product.isActive ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(product)}
                                className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}

                          {/* Toggle */}
                          {onNavigateToEdit && (
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#133C2A]/10">
                              <span className="text-sm text-[#133C2A]/70">Показывать клиентам</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={product.isActive}
                                  onChange={() => handleToggleActive(product)}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#D4AF37]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                              </label>
                            </div>
                          )}
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
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-white">
              <h3 className="mb-2">Советы по ценообразованию</h3>
              <p className="text-white/80 text-sm mb-3">
                Индивидуальные занятия обычно дороже групповых. Предлагайте скидки на долгосрочные 
                абонементы и семейные пакеты. Тестируйте разные ценовые стратегии.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-white/20 text-white border-white/30">
                  <DollarSign className="w-3 h-3 mr-1" />
                  {activeProducts.length} активных тарифов
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Средний чек: {averagePrice.toLocaleString()} ₽
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}