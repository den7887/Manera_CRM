import { useState } from 'react';
import { Product, ProductType, AgeGroup, DanceLevel } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  ArrowLeft, 
  Plus,
  Sparkles,
  Users,
  User,
  CheckSquare,
  ArrowRight,
  DollarSign,
  Target,
  Calendar,
  Clock,
  Award,
  Info,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface PricingFormProps {
  product?: Product;
  onBack: () => void;
}

const productTypes: { value: ProductType; label: string; icon: any; description: string; color: string }[] = [
  {
    value: 'individual',
    label: 'Индивидуальные занятия',
    icon: User,
    description: 'Персональные занятия один на один с преподавателем',
    color: 'from-purple-500 to-purple-600',
  },
  {
    value: 'group',
    label: 'Групповые занятия',
    icon: Users,
    description: 'Занятия в группе с другими учениками',
    color: 'from-blue-500 to-blue-600',
  },
];

const ageGroups: { value: AgeGroup; label: string; emoji: string }[] = [
  { value: 'kids_3_6', label: '3-6 лет', emoji: '👶' },
  { value: 'kids_7_10', label: '7-10 лет', emoji: '🧒' },
  { value: 'teens_11_14', label: '11-14 лет', emoji: '👦' },
  { value: 'teens_15_17', label: '15-17 лет', emoji: '👨' },
  { value: 'adults_18plus', label: '18+ лет', emoji: '👤' },
  { value: 'all_ages', label: 'Все возрасты', emoji: '👨‍👩‍👧‍👦' },
];

const danceLevels: { value: DanceLevel; label: string; color: string }[] = [
  { value: 'beginner', label: 'Начинающие', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'intermediate', label: 'Средний', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'advanced', label: 'Продвинутый', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'professional', label: 'Профессионалы', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'all_levels', label: 'Все уровни', color: 'bg-gray-100 text-gray-700 border-gray-300' },
];

export function PricingForm({ product, onBack }: PricingFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: product?.name || '',
    type: product?.type || ('individual' as ProductType),
    description: product?.description || '',
    price: product?.price || 0,
    originalPrice: product?.originalPrice || 0,
    discountPercent: product?.discountPercent || 0,
    classesCount: product?.classesCount || 8,
    validityDays: product?.validityDays || 30,
    ageGroup: product?.ageGroup || ('all_ages' as AgeGroup),
    level: product?.level || ('all_levels' as DanceLevel),
    durationMinutes: product?.durationMinutes || 60,
    maxStudents: product?.maxStudents || 10,
    features: product?.features || [],
    isActive: product?.isActive ?? true,
  });

  const [newFeature, setNewFeature] = useState('');

  const updateField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      updateField('features', [...formData.features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    updateField('features', formData.features.filter((_, i) => i !== index));
  };

  const calculateDiscount = () => {
    if (formData.originalPrice > 0 && formData.price > 0) {
      const discount = Math.round(((formData.originalPrice - formData.price) / formData.originalPrice) * 100);
      updateField('discountPercent', discount);
    }
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Введите название абонемента');
      return;
    }
    if (formData.price <= 0) {
      toast.error('Введите корректную цену');
      return;
    }
    if (formData.classesCount <= 0) {
      toast.error('Введите количество занятий');
      return;
    }
    if (formData.validityDays <= 0) {
      toast.error('Введите срок действия');
      return;
    }

    const action = product ? 'обновлен' : 'создан';
    toast.success(`Абонемент "${formData.name}" ${action}!`);
    onBack();
  };

  const steps = [
    { number: 1, label: 'Тип и основы', icon: Sparkles },
    { number: 2, label: 'Цена и параметры', icon: DollarSign },
    { number: 3, label: 'Детали', icon: CheckSquare },
  ];

  const selectedType = productTypes.find(t => t.value === formData.type);
  const pricePerClass = formData.classesCount > 0 ? Math.round(formData.price / formData.classesCount) : 0;

  const canProceedToStep2 = formData.name.trim() !== '' && formData.type !== '';
  const canProceedToStep3 = canProceedToStep2 && formData.price > 0 && formData.classesCount > 0;

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
            {product ? 'Редактировать абонемент' : 'Создать абонемент'}
          </h1>
          <p className="text-[#133C2A]/60">
            Настройте тариф для вашей танцевальной студии
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

            {steps.map((step) => {
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

      {/* Step 1: Type & Basics */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-scale-in">
          {/* Product Type */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A]">Тип занятий</CardTitle>
              <p className="text-sm text-[#133C2A]/60">
                Выберите формат проведения занятий
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {productTypes.map((type) => {
                  const TypeIcon = type.icon;
                  const isSelected = formData.type === type.value;
                  
                  return (
                    <button
                      key={type.value}
                      onClick={() => updateField('type', type.value)}
                      className={`p-6 rounded-2xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-lg'
                          : 'border-[#133C2A]/10 hover:border-[#D4AF37]/50 bg-white'
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center mb-4 ${
                        isSelected ? 'scale-110' : ''
                      } transition-transform`}>
                        <TypeIcon className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-[#133C2A] mb-2">{type.label}</h3>
                      <p className="text-sm text-[#133C2A]/60">{type.description}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Name & Description */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A]">Название и описание</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#133C2A]">
                  Название абонемента <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Например: Абонемент на 8 занятий"
                  className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-[#133C2A]">
                  Описание
                </Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Подробное описание абонемента..."
                  className="w-full min-h-[100px] px-3 py-2 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F8F4E3]">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => updateField('isActive', e.target.checked)}
                  className="w-4 h-4 rounded border-[#133C2A]/20 text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer"
                />
                <Label htmlFor="isActive" className="text-[#133C2A] cursor-pointer flex-1 text-sm">
                  Показывать клиентам (абонемент активен)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-end">
            <Button
              onClick={() => setCurrentStep(2)}
              disabled={!canProceedToStep2}
              className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 disabled:opacity-50 gap-2"
            >
              Далее: Цена и параметры
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Price & Parameters */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-scale-in">
          {/* Selected Type Preview */}
          {selectedType && (
            <Card className="border-none soft-shadow bg-gradient-to-br from-[#F8F4E3] to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const TypeIcon = selectedType.icon;
                    return <TypeIcon className="w-5 h-5 text-[#D4AF37]" />;
                  })()}
                  <div className="flex-1">
                    <p className="text-xs text-[#133C2A]/60 mb-0.5">Тип занятий:</p>
                    <p className="text-sm text-[#133C2A]">{selectedType.label}</p>
                  </div>
                  <p className="text-lg text-[#133C2A]">{formData.name || 'Без названия'}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#D4AF37]" />
                Ценообразование
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-[#133C2A]">
                    Цена абонемента <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      value={formData.price || ''}
                      onChange={(e) => {
                        updateField('price', parseInt(e.target.value) || 0);
                        calculateDiscount();
                      }}
                      className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37] pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#133C2A]/60">₽</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="originalPrice" className="text-[#133C2A]">
                    Цена без скидки (опционально)
                  </Label>
                  <div className="relative">
                    <Input
                      id="originalPrice"
                      type="number"
                      min="0"
                      value={formData.originalPrice || ''}
                      onChange={(e) => {
                        updateField('originalPrice', parseInt(e.target.value) || 0);
                        calculateDiscount();
                      }}
                      className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37] pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#133C2A]/60">₽</span>
                  </div>
                </div>
              </div>

              {formData.discountPercent > 0 && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-500 text-white">
                      -{formData.discountPercent}%
                    </Badge>
                    <span className="text-sm text-red-700">
                      Экономия: {(formData.originalPrice - formData.price).toLocaleString()} ₽
                    </span>
                  </div>
                </div>
              )}

              {pricePerClass > 0 && (
                <div className="p-4 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-sm text-[#133C2A]">
                      Цена за одно занятие: <strong>{pricePerClass.toLocaleString()} ₽</strong>
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A]">Параметры абонемента</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="classesCount" className="text-[#133C2A] flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#D4AF37]" />
                    Количество занятий <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="classesCount"
                    type="number"
                    min="1"
                    value={formData.classesCount || ''}
                    onChange={(e) => updateField('classesCount', parseInt(e.target.value) || 0)}
                    className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="validityDays" className="text-[#133C2A] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#D4AF37]" />
                    Срок действия (дней) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="validityDays"
                    type="number"
                    min="1"
                    value={formData.validityDays || ''}
                    onChange={(e) => updateField('validityDays', parseInt(e.target.value) || 0)}
                    className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="durationMinutes" className="text-[#133C2A] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#D4AF37]" />
                    Длительность занятия (минут)
                  </Label>
                  <Input
                    id="durationMinutes"
                    type="number"
                    min="15"
                    step="15"
                    value={formData.durationMinutes || ''}
                    onChange={(e) => updateField('durationMinutes', parseInt(e.target.value) || 0)}
                    className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                  />
                </div>

                {formData.type === 'group' && (
                  <div className="space-y-2">
                    <Label htmlFor="maxStudents" className="text-[#133C2A] flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#D4AF37]" />
                      Макс. учеников в группе
                    </Label>
                    <Input
                      id="maxStudents"
                      type="number"
                      min="1"
                      value={formData.maxStudents || ''}
                      onChange={(e) => updateField('maxStudents', parseInt(e.target.value) || 0)}
                      className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                    />
                  </div>
                )}
              </div>
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
              Далее: Детали и особенности
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-scale-in">
          {/* Preview */}
          <Card className="border-none soft-shadow bg-gradient-to-br from-[#133C2A] to-[#1C8C64]">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 text-white">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-white/80 text-sm mb-2">Предпросмотр:</p>
                  <h3 className="mb-3">{formData.name || 'Без названия'}</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="bg-white/20 text-white border-white/30">
                      {formData.price.toLocaleString()} ₽
                    </Badge>
                    <Badge className="bg-white/20 text-white border-white/30">
                      {formData.classesCount} занятий
                    </Badge>
                    <Badge className="bg-white/20 text-white border-white/30">
                      {formData.validityDays} дней
                    </Badge>
                    {pricePerClass > 0 && (
                      <Badge className="bg-white/20 text-white border-white/30">
                        {pricePerClass.toLocaleString()} ₽/занятие
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Age Group */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A]">Возрастная группа</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ageGroups.map((age) => (
                  <button
                    key={age.value}
                    onClick={() => updateField('ageGroup', age.value)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.ageGroup === age.value
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-md'
                        : 'border-[#133C2A]/10 hover:border-[#D4AF37]/50 bg-white'
                    }`}
                  >
                    <div className="text-2xl mb-2">{age.emoji}</div>
                    <div className="text-sm text-[#133C2A]">{age.label}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Dance Level */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <Award className="w-5 h-5 text-[#D4AF37]" />
                Уровень подготовки
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {danceLevels.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => updateField('level', level.value)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.level === level.value
                        ? `${level.color} border-current shadow-md`
                        : 'border-[#133C2A]/10 hover:border-[#133C2A]/30 bg-white'
                    }`}
                  >
                    <div className="text-sm">{level.label}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A]">Особенности и преимущества</CardTitle>
              <p className="text-sm text-[#133C2A]/60">
                Добавьте ключевые преимущества этого абонемента
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                  placeholder="Например: Индивидуальный подход"
                  className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
                <Button
                  type="button"
                  onClick={addFeature}
                  className="rounded-xl bg-[#D4AF37] hover:bg-[#B8941F]"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {formData.features.length > 0 && (
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 rounded-xl bg-[#F8F4E3] group"
                    >
                      <span className="text-[#D4AF37]">✓</span>
                      <span className="flex-1 text-[#133C2A]">{feature}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFeature(index)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 p-0 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {formData.features.length === 0 && (
                <div className="p-4 rounded-xl bg-[#133C2A]/5 text-center">
                  <p className="text-sm text-[#133C2A]/60">
                    Особенности не добавлены. Добавьте их для большей привлекательности.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

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
                {product ? 'Сохранить изменения' : 'Создать абонемент'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
