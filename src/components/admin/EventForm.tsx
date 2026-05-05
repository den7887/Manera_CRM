import { useState } from 'react';
import { X, Calendar, MapPin, Users, CreditCard, Trophy, Music, GraduationCap, Sparkles, Upload, Trash2, Clock } from 'lucide-react';
import { News } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { toast } from 'sonner@2.0.3';

interface EventFormProps {
  event?: News;
  onClose: () => void;
  onSubmit: (event: Partial<News>) => void;
}

export function EventForm({ event, onClose, onSubmit }: EventFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(event?.image || '');
  const [customEventTypes, setCustomEventTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [customTypeInput, setCustomTypeInput] = useState('');
  
  // Извлекаем время из eventDate если оно есть
  const getEventTime = (date?: Date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatLocalDate = (date?: Date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = String(d.getFullYear()).padStart(4, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatLocalDateTime = (date?: Date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = String(d.getFullYear()).padStart(4, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const [eventTime, setEventTime] = useState(getEventTime(event?.eventDate));
  
  const [formData, setFormData] = useState<Partial<News>>({
    title: event?.title || '',
    content: event?.content || '',
    image: event?.image || '',
    published: event?.published ?? true,
    isEvent: true,
    eventType: event?.eventType || 'competition',
    eventDate: event?.eventDate,
    eventLocation: event?.eventLocation || '',
    eventFee: event?.eventFee || 0,
    eventDeadline: event?.eventDeadline,
    requiresPayment: event?.requiresPayment ?? true,
    maxParticipants: event?.maxParticipants || 0,
    currentParticipants: event?.currentParticipants || 0,
  });

  const eventTypes = [
    { value: 'competition', label: 'Конкурс', icon: Trophy },
    { value: 'concert', label: 'Концерт', icon: Music },
    { value: 'masterclass', label: 'Мастер-класс', icon: GraduationCap },
    { value: 'other', label: 'Другое (указать)', icon: Sparkles },
  ];

  const updateField = <K extends keyof News>(field: K, value: News[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      toast.error('Поддерживаются только изображения (JPG, PNG, WebP) и видео (MP4, WebM, MOV)');
      return;
    }

    // Проверка размера (макс 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('Максимальный размер файла - 50MB');
      return;
    }

    setUploadedFile(file);

    // Создание превью
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreviewUrl(result);
      updateField('image', result);
    };
    reader.readAsDataURL(file);

    toast.success('Файл загружен');
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setPreviewUrl('');
    updateField('image', '');
  };

  const handleRemoveCustomType = (typeValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomEventTypes(prev => prev.filter(t => t.value !== typeValue));
    // Если удаляем выбранный тип, сбрасываем на "Другое"
    if (formData.eventType === typeValue) {
      updateField('eventType', 'other');
    }
    toast.success('Тип мероприятия удален');
  };

  const isVideo = (url: string) => {
    return url.startsWith('data:video/') || url.match(/\.(mp4|webm|mov)$/i);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.title?.trim()) {
          toast.error('Введите название мероприятия');
          return false;
        }
        if (!formData.content?.trim()) {
          toast.error('Введите описание мероприятия');
          return false;
        }
        if (!formData.eventType) {
          toast.error('Выберите тип мероприятия');
          return false;
        }
        return true;
      case 2:
        if (!formData.eventDate) {
          toast.error('Укажите дату проведения');
          return false;
        }
        if (!formData.eventLocation?.trim()) {
          toast.error('Укажите место проведения');
          return false;
        }
        return true;
      case 3:
        if (formData.requiresPayment) {
          if (!formData.eventFee || formData.eventFee <= 0) {
            toast.error('Укажите стоимость участия');
            return false;
          }
          if (!formData.eventDeadline) {
            toast.error('Укажите дедлайн оплаты');
            return false;
          }
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    if (validateStep(3)) {
      onSubmit({
        ...formData,
        date: new Date(),
      });
      toast.success(event ? 'Мероприятие обновлено' : 'Мероприятие создано');
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-[#133C2A]">Название мероприятия *</Label>
        <Input
          placeholder="Например: Конкурс 'Танцевальная весна 2025'"
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[#133C2A]">Тип мероприятия *</Label>
        <Select 
          value={formData.eventType} 
          onValueChange={(value) => updateField('eventType', value as News['eventType'])}
        >
          <SelectTrigger className="rounded-xl border-[#133C2A]/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {eventTypes.map(type => {
              const Icon = type.icon;
              return (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {type.label}
                  </div>
                </SelectItem>
              );
            })}
            {customEventTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {type.label}
                  </div>
                  <button
                    onClick={(e) => handleRemoveCustomType(type.value, e)}
                    className="ml-auto p-1 hover:bg-red-100 rounded-md transition-colors group"
                    type="button"
                  >
                    <X className="w-3 h-3 text-[#133C2A]/40 group-hover:text-red-600" />
                  </button>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formData.eventType === 'other' && (
          <div className="space-y-2 mt-2">
            <Label className="text-[#133C2A]">Введите тип мероприятия</Label>
            <Input
              placeholder="Например: Конференция"
              value={customTypeInput}
              onChange={(e) => setCustomTypeInput(e.target.value)}
              className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
            <Button
              onClick={() => {
                if (customTypeInput.trim()) {
                  setCustomEventTypes(prev => [...prev, { value: customTypeInput, label: customTypeInput }]);
                  updateField('eventType', customTypeInput);
                  setCustomTypeInput('');
                  toast.success('Новый тип мероприятия добавлен');
                }
              }}
              className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
            >
              Добавить
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-[#133C2A]">Описание *</Label>
        <Textarea
          placeholder="Расскажите о мероприятии: программа, что ждет участников, призы и т.д."
          value={formData.content}
          onChange={(e) => updateField('content', e.target.value)}
          className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37] min-h-32"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[#133C2A]">Фото или видео</Label>
        <p className="text-xs text-[#133C2A]/60 mb-2">Изображение или видео для афиши мероприятия</p>
        
        {!previewUrl ? (
          <label className="block">
            <div className="border-2 border-dashed border-[#133C2A]/20 rounded-xl p-8 text-center cursor-pointer hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all">
              <Upload className="w-12 h-12 text-[#133C2A]/40 mx-auto mb-3" />
              <p className="text-[#133C2A] mb-1">Загрузить файл</p>
              <p className="text-sm text-[#133C2A]/60">JPG, PNG, WebP, MP4, WebM (макс. 50MB)</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp,video/mp4,video/webm,video/quicktime"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </label>
        ) : (
          <div className="relative rounded-xl overflow-hidden border-2 border-[#133C2A]/10">
            {isVideo(previewUrl) ? (
              <video
                src={previewUrl}
                controls
                className="w-full h-64 object-cover"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-64 object-cover"
              />
            )}
            <Button
              onClick={handleRemoveFile}
              variant="destructive"
              size="sm"
              className="absolute top-3 right-3 rounded-lg"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Удалить
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => {
    // Функция для обработки изменения даты
    const handleDateChange = (dateStr: string) => {
      if (!dateStr) {
        updateField('eventDate', undefined);
        return;
      }
      
      // Если есть время, объединяем его с новой датой
      if (eventTime) {
        const combinedDateTime = new Date(`${dateStr}T${eventTime}`);
        updateField('eventDate', combinedDateTime);
      } else {
        // Сохраняем только дату без времени (полдень по умолчанию)
        const dateOnly = new Date(`${dateStr}T12:00`);
        updateField('eventDate', dateOnly);
      }
    };
    
    // Функция для обработки изменения времени
    const handleTimeChange = (timeStr: string) => {
      setEventTime(timeStr);
      
      if (!formData.eventDate) return;
      
      const currentDate = new Date(formData.eventDate);
      if (isNaN(currentDate.getTime())) return;
      
      if (timeStr) {
        // Объединяем текущую дату с новым временем
        const dateStr = formatLocalDate(currentDate);
        const combinedDateTime = new Date(`${dateStr}T${timeStr}`);
        updateField('eventDate', combinedDateTime);
      } else {
        // Если время удалили, оставляем только дату (полдень)
        const dateStr = formatLocalDate(currentDate);
        const dateOnly = new Date(`${dateStr}T12:00`);
        updateField('eventDate', dateOnly);
      }
    };
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[#133C2A]">Дата проведения *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#133C2A]/40 w-4 h-4 pointer-events-none" />
              <Input
                type="date"
                value={formatLocalDate(formData.eventDate)}
                onChange={(e) => handleDateChange(e.target.value)}
                className="pl-10 rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#133C2A]">Время (опционально)</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#133C2A]/40 w-4 h-4 pointer-events-none" />
              <Input
                type="time"
                value={eventTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="pl-10 rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[#133C2A]">Место проведения *</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#133C2A]/40 w-4 h-4" />
            <Input
              placeholder="Например: ДК 'Современник', ул. Ленина 45"
              value={formData.eventLocation}
              onChange={(e) => updateField('eventLocation', e.target.value)}
              className="pl-10 rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {event && (
          <div className="space-y-2">
            <Label className="text-[#133C2A]">Текущее количество участников</Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#133C2A]/40 w-4 h-4" />
              <Input
                type="number"
                min="0"
                value={formData.currentParticipants || ''}
                onChange={(e) => updateField('currentParticipants', parseInt(e.target.value) || 0)}
                className="pl-10 rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#133C2A]/5">
        <div className="flex-1">
          <Label className="text-[#133C2A]">Требуется оплата</Label>
          <p className="text-sm text-[#133C2A]/60">Участие в мероприятии платное</p>
        </div>
        <Switch
          checked={formData.requiresPayment}
          onCheckedChange={(checked) => updateField('requiresPayment', checked)}
        />
      </div>

      {formData.requiresPayment && (
        <>
          <div className="space-y-2">
            <Label className="text-[#133C2A]">Стоимость участия * (₽)</Label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#133C2A]/40 w-4 h-4" />
              <Input
                type="number"
                min="0"
                placeholder="2500"
                value={formData.eventFee || ''}
                onChange={(e) => updateField('eventFee', parseInt(e.target.value) || 0)}
                className="pl-10 rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#133C2A]">Дедлайн для оплаты *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#133C2A]/40 w-4 h-4 pointer-events-none" />
              <Input
                type="datetime-local"
                value={formatLocalDateTime(formData.eventDeadline)}
                onChange={(e) => updateField('eventDeadline', e.target.value ? new Date(e.target.value) : undefined)}
                className="pl-10 rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>
          </div>
        </>
      )}

      <div className="flex items-center justify-between p-4 rounded-xl bg-[#1C8C64]/5 border border-[#1C8C64]/20">
        <div className="flex-1">
          <Label className="text-[#133C2A]">Опубликовать</Label>
          <p className="text-sm text-[#133C2A]/60">Сделать мерприятие видимым для родителей</p>
        </div>
        <Switch
          checked={formData.published}
          onCheckedChange={(checked) => updateField('published', checked)}
        />
      </div>
    </div>
  );

  const steps = [
    { number: 1, title: 'Основная информация', description: 'Название и описание' },
    { number: 2, title: 'Детали мероприятия', description: 'Дата, место и участники' },
    { number: 3, title: 'Оплата и публикация', description: 'Настройки оплаты' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-scale-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">
            {event ? 'Редактирование мероприятия' : 'Создание мероприятия'}
          </h1>
          <p className="text-[#133C2A]/60">Шаг {currentStep} из 3</p>
        </div>
        <Button
          variant="ghost"
          onClick={onClose}
          className="rounded-xl hover:bg-[#133C2A]/5"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="grid grid-cols-3 gap-4">
        {steps.map((step) => (
          <div
            key={step.number}
            className={`p-4 rounded-xl border-2 transition-all ${
              currentStep === step.number
                ? 'border-[#D4AF37] bg-gradient-to-r from-[#D4AF37]/10 to-[#133C2A]/10'
                : currentStep > step.number
                ? 'border-[#1C8C64] bg-[#1C8C64]/5'
                : 'border-[#133C2A]/10'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                  currentStep === step.number
                    ? 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white'
                    : currentStep > step.number
                    ? 'bg-[#1C8C64] text-white'
                    : 'bg-[#133C2A]/10 text-[#133C2A]/40'
                }`}
              >
                {step.number}
              </div>
              <div className="flex-1">
                <p className={`text-sm ${currentStep >= step.number ? 'text-[#133C2A]' : 'text-[#133C2A]/40'}`}>
                  {step.title}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form Content */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">{steps[currentStep - 1].title}</CardTitle>
          <p className="text-sm text-[#133C2A]/60">{steps[currentStep - 1].description}</p>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onClose : handleBack}
          className="rounded-xl border-[#133C2A]/20 hover:bg-[#133C2A]/5"
        >
          {currentStep === 1 ? 'Отмена' : 'Назад'}
        </Button>

        {currentStep < 3 ? (
          <Button
            onClick={handleNext}
            className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
          >
            Далее
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
          >
            {event ? 'Сохранить изменения' : 'Создать мероприятие'}
          </Button>
        )}
      </div>
    </div>
  );
}
