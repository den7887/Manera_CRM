import { Globe, Eye, Upload, MapPin, Phone, Mail, Instagram, Clock, Users, Award, CheckCircle, Star, Plus, Trash2, Edit2, Image, Video, Quote, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useState, useRef } from 'react';
import { LandingSettings as LandingSettingsType } from '../../types';

// Компонент для загрузки изображения
function ImageUploader({ 
  label, 
  value, 
  onChange, 
  aspectRatio = 'aspect-video',
  className = ''
}: { 
  label: string; 
  value: string; 
  onChange: (url: string) => void;
  aspectRatio?: string;
  className?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Проверка типа файла
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        return;
      }

      // Проверка размера (максимум 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5MB');
        return;
      }

      // Конвертация в base64
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-sm">{label}</Label>
      <div className={`relative ${aspectRatio === 'aspect-square' ? 'h-32' : 'h-24'} rounded-xl overflow-hidden bg-gradient-to-br from-[#F8F4E3] to-[#D4AF37]/10 border-2 border-dashed border-[#133C2A]/20 hover:border-[#D4AF37] transition-smooth`}>
        {value ? (
          <>
            <img src={value} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-smooth flex items-center justify-center gap-2">
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-white text-[#133C2A] hover:bg-white/90 h-8 text-xs"
              >
                <Upload className="w-3 h-3 mr-1" />
                Заменить
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRemove}
                className="rounded-lg h-8 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Удалить
              </Button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center gap-1 hover:bg-[#D4AF37]/5 transition-smooth"
          >
            <Upload className="w-5 h-5 text-[#133C2A]/40" />
            <p className="text-xs text-[#133C2A]/60">Нажмите для загрузки</p>
            <p className="text-[10px] text-[#133C2A]/40">PNG, JPG до 5MB</p>
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

export function LandingSettings() {
  // Hero Section
  const [heroBadge, setHeroBadge] = useState('Профессиональная студия танца');
  const [heroTitle, setHeroTitle] = useState('Танцевальная студия Manera');
  const [heroSubtitle, setHeroSubtitle] = useState('Современные танцы для детей и подростков. Профессиональные преподаватели, уютная атмосфера, индивидуальный подход.');
  const [heroImageUrl, setHeroImageUrl] = useState('https://images.unsplash.com/photo-1758526387723-075751b1bcda?w=1080');
  const [heroRating, setHeroRating] = useState('4.9');
  const [heroStudents, setHeroStudents] = useState('75+');

  // About Section
  const [aboutTitle, setAboutTitle] = useState('О нашей студии');
  const [aboutDescription, setAboutDescription] = useState('Manera Dance Studio — это пространство, где каждый ребёнок может раскрыть свой танцевальный потенциал. Мы создаём атмосферу творчества, поддержки и профессионального роста.');

  // Benefits
  const [benefits, setBenefits] = useState([
    'Профессиональные преподаватели с опытом работы более 10 лет',
    'Индивидуальный подход к каждому ученику',
    'Современные танцевальные направления',
    'Уютная студия с профессиональным оборудованием',
    'Регулярные выступления и конкурсы',
    'Гибкое расписание занятий',
  ]);

  // Teachers
  const [teachers, setTeachers] = useState([
    {
      id: '1',
      name: 'Анна Петрова',
      role: 'Главный хореограф',
      experience: '12 лет опыта',
      specialization: 'Contemporary, Modern Jazz',
      achievements: 'Лауреат международных конкурсов',
      emoji: '👩‍🏫',
    },
    {
      id: '2',
      name: 'Мария Сидорова',
      role: 'Хореограф',
      experience: '8 лет опыта',
      specialization: 'Hip-Hop, Break Dance',
      achievements: 'Чемпион России по брейк-дансу',
      emoji: '👩',
    },
    {
      id: '3',
      name: 'Елена Кузнецова',
      role: 'Хореограф',
      experience: '10 лет опыта',
      specialization: 'Классический танец, Балет',
      achievements: 'Солистка Большого театра',
      emoji: '👩‍🎨',
    },
  ]);

  // Testimonials
  const [testimonials, setTestimonials] = useState([
    {
      id: '1',
      name: 'Елена Смирнова',
      role: 'Мама Кати (8 лет)',
      rating: 5,
      text: 'Моя дочь занимается в Manera уже год. Это лучшая студия! Преподаватели внимательные, атмосфера доброжелательная. Катя с удовольствием бежит на каждое занятие.',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    },
    {
      id: '2',
      name: 'Андрей Петров',
      role: 'Папа Максима (10 лет)',
      rating: 5,
      text: 'Отличная студия! Сын стал более уверенным в себе, появилась хорошая осанка. Профессиональный подход к каждому ребенку. Рекомендую всем!',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    },
    {
      id: '3',
      name: 'Мария Иванова',
      role: 'Мама Софии (7 лет)',
      rating: 5,
      text: 'Manera - это не просто танцевальная студия, это семья! Индивидуальный подход, красивые костюмы на выступлениях, профессиональные хореографы. Спасибо вам!',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    },
  ]);

  // Gallery
  const [galleryImages, setGalleryImages] = useState([
    { id: '1', url: 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=800', alt: 'Групповое занятие по contemporary' },
    { id: '2', url: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800', alt: 'Выступление на конкурсе' },
    { id: '3', url: 'https://images.unsplash.com/photo-1540479859555-17af45c78602?w=800', alt: 'Индивидуальная тренировка' },
    { id: '4', url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800', alt: 'Растяжка и разминка' },
    { id: '5', url: 'https://images.unsplash.com/photo-1547153760-18fc4555e7ce?w=800', alt: 'Танцевальный зал' },
    { id: '6', url: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800', alt: 'Атмосфера студии' },
  ]);

  // Video
  const [videoTitle, setVideoTitle] = useState('Познакомьтесь с нашей студией');
  const [videoSubtitle, setVideoSubtitle] = useState('Небольшое видео о том, как проходят наши занятия');
  const [videoDescription, setVideoDescription] = useState('Узнайте больше о нашей студии и атмосфере занятий');
  const [videoThumbnail, setVideoThumbnail] = useState('https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=1200');
  const [videoUrl, setVideoUrl] = useState('');

  // Contact Info
  const [contactPhone, setContactPhone] = useState('+7 (999) 123-45-67');
  const [contactEmail, setContactEmail] = useState('info@manera.studio');
  const [contactAddress, setContactAddress] = useState('г. Москва, ул. Танцевальная, д. 15');
  const [contactMetro, setContactMetro] = useState('м. Парк Культуры (5 минут пешком)');
  const [workingHoursWeekdays, setWorkingHoursWeekdays] = useState('10:00 - 21:00');
  const [workingHoursWeekends, setWorkingHoursWeekends] = useState('10:00 - 18:00');
  const [instagramHandle, setInstagramHandle] = useState('@manera.studio');
  const [mapEmbedUrl, setMapEmbedUrl] = useState('https://yandex.ru/map-widget/v1/?um=constructor%3Aec8fa77c6f87f53e3c1e4e0b8c8c8c8c&amp;source=constructor');

  const handleSave = () => {
    alert('Настройки сохранены! В production эти данные будут сохранены в базу данных.');
  };

  const addBenefit = () => {
    setBenefits([...benefits, '']);
  };

  const updateBenefit = (index: number, value: string) => {
    const updated = [...benefits];
    updated[index] = value;
    setBenefits(updated);
  };

  const removeBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  const addTeacher = () => {
    setTeachers([
      ...teachers,
      {
        id: Date.now().toString(),
        name: '',
        role: '',
        experience: '',
        specialization: '',
        achievements: '',
        emoji: '👤',
      },
    ]);
  };

  const updateTeacher = (id: string, field: string, value: string) => {
    setTeachers(teachers.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const removeTeacher = (id: string) => {
    setTeachers(teachers.filter((t) => t.id !== id));
  };

  const addTestimonial = () => {
    setTestimonials([
      ...testimonials,
      {
        id: Date.now().toString(),
        name: '',
        role: '',
        rating: 5,
        text: '',
        image: '',
      },
    ]);
  };

  const updateTestimonial = (id: string, field: string, value: any) => {
    setTestimonials(testimonials.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const removeTestimonial = (id: string) => {
    setTestimonials(testimonials.filter((t) => t.id !== id));
  };

  const addGalleryImage = () => {
    setGalleryImages([
      ...galleryImages,
      {
        id: Date.now().toString(),
        url: '',
        alt: '',
      },
    ]);
  };

  const updateGalleryImage = (id: string, field: string, value: string) => {
    setGalleryImages(galleryImages.map((img) => (img.id === id ? { ...img, [field]: value } : img)));
  };

  const removeGalleryImage = (id: string) => {
    setGalleryImages(galleryImages.filter((img) => img.id !== id));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-scale-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Настройка публичной страницы</h1>
          <p className="text-[#133C2A]/60">Управление всем контентом лендинга</p>
        </div>
        <Button
          onClick={handleSave}
          className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 gap-2"
        >
          <Save className="w-4 h-4" />
          Сохранить все изменения
        </Button>
      </div>

      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 gap-2">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="about">О студии</TabsTrigger>
          <TabsTrigger value="teachers">Преподаватели</TabsTrigger>
          <TabsTrigger value="testimonials">Отзывы</TabsTrigger>
          <TabsTrigger value="gallery">Галерея</TabsTrigger>
          <TabsTrigger value="video">Видео</TabsTrigger>
          <TabsTrigger value="contacts">Контакты</TabsTrigger>
        </TabsList>

        {/* Hero Section */}
        <TabsContent value="hero" className="space-y-6">
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#D4AF37]" />
                Главный экран
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Бейдж</Label>
                <Input
                  value={heroBadge}
                  onChange={(e) => setHeroBadge(e.target.value)}
                  placeholder="Профессиональная студия танца"
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Заголовок</Label>
                <Input
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  className="rounded-2xl text-2xl h-14"
                />
              </div>

              <div className="space-y-2">
                <Label>Подзаголовок</Label>
                <Textarea
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  className="rounded-2xl min-h-[100px]"
                />
              </div>

              <ImageUploader
                label="Главное изображение Hero"
                value={heroImageUrl}
                onChange={setHeroImageUrl}
                aspectRatio="aspect-video"
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Рейтинг</Label>
                  <Input
                    value={heroRating}
                    onChange={(e) => setHeroRating(e.target.value)}
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Учеников</Label>
                  <Input
                    value={heroStudents}
                    onChange={(e) => setHeroStudents(e.target.value)}
                    className="rounded-2xl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* About Section */}
        <TabsContent value="about" className="space-y-6">
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A]">О студии</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Заголовок</Label>
                <Input
                  value={aboutTitle}
                  onChange={(e) => setAboutTitle(e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea
                  value={aboutDescription}
                  onChange={(e) => setAboutDescription(e.target.value)}
                  className="rounded-2xl min-h-[120px]"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Преимущества</Label>
                  <Button onClick={addBenefit} size="sm" variant="outline" className="rounded-xl">
                    <Plus className="w-4 h-4 mr-1" />
                    Добавить
                  </Button>
                </div>
                <div className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[#1C8C64] flex-shrink-0" />
                      <Input
                        value={benefit}
                        onChange={(e) => updateBenefit(index, e.target.value)}
                        className="rounded-xl flex-1"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeBenefit(index)}
                        className="rounded-xl text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teachers Section */}
        <TabsContent value="teachers" className="space-y-6">
          <Card className="border-none soft-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#133C2A] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#D4AF37]" />
                  Преподаватели
                </CardTitle>
                <Button onClick={addTeacher} size="sm" className="rounded-xl bg-[#133C2A]">
                  <Plus className="w-4 h-4 mr-1" />
                  Добавить
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {teachers.map((teacher) => (
                <Card key={teacher.id} className="border border-[#133C2A]/10">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">{teacher.emoji}</div>
                        <Input
                          value={teacher.emoji}
                          onChange={(e) => updateTeacher(teacher.id, 'emoji', e.target.value)}
                          placeholder="👤"
                          className="w-20 rounded-xl"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeTeacher(teacher.id)}
                        className="rounded-xl text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Имя</Label>
                        <Input
                          value={teacher.name}
                          onChange={(e) => updateTeacher(teacher.id, 'name', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Должность</Label>
                        <Input
                          value={teacher.role}
                          onChange={(e) => updateTeacher(teacher.id, 'role', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Опыт</Label>
                        <Input
                          value={teacher.experience}
                          onChange={(e) => updateTeacher(teacher.id, 'experience', e.target.value)}
                          placeholder="12 лет опыта"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Специализация</Label>
                        <Input
                          value={teacher.specialization}
                          onChange={(e) => updateTeacher(teacher.id, 'specialization', e.target.value)}
                          placeholder="Contemporary, Modern Jazz"
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Достижения</Label>
                      <Input
                        value={teacher.achievements}
                        onChange={(e) => updateTeacher(teacher.id, 'achievements', e.target.value)}
                        placeholder="Лауреат международных конкурсов"
                        className="rounded-xl"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testimonials Section */}
        <TabsContent value="testimonials" className="space-y-6">
          <Card className="border-none soft-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#133C2A] flex items-center gap-2">
                  <Quote className="w-5 h-5 text-[#D4AF37]" />
                  Отзывы
                </CardTitle>
                <Button onClick={addTestimonial} size="sm" className="rounded-xl bg-[#133C2A]">
                  <Plus className="w-4 h-4 mr-1" />
                  Добавить
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.id} className="border border-[#133C2A]/10">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 cursor-pointer ${
                              star <= testimonial.rating ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-gray-300'
                            }`}
                            onClick={() => updateTestimonial(testimonial.id, 'rating', star)}
                          />
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeTestimonial(testimonial.id)}
                        className="rounded-xl text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Имя</Label>
                        <Input
                          value={testimonial.name}
                          onChange={(e) => updateTestimonial(testimonial.id, 'name', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Роль (например: Мама Кати, 8 лет)</Label>
                        <Input
                          value={testimonial.role}
                          onChange={(e) => updateTestimonial(testimonial.id, 'role', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    <ImageUploader
                      label="Фото отзыва"
                      value={testimonial.image}
                      onChange={(url) => updateTestimonial(testimonial.id, 'image', url)}
                      aspectRatio="aspect-square"
                    />

                    <div className="space-y-2">
                      <Label>Текст отзыва</Label>
                      <Textarea
                        value={testimonial.text}
                        onChange={(e) => updateTestimonial(testimonial.id, 'text', e.target.value)}
                        className="rounded-xl min-h-[100px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gallery Section */}
        <TabsContent value="gallery" className="space-y-6">
          <Card className="border-none soft-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#133C2A] flex items-center gap-2">
                  <Image className="w-5 h-5 text-[#D4AF37]" />
                  Галерея
                </CardTitle>
                <Button onClick={addGalleryImage} size="sm" className="rounded-xl bg-[#133C2A]">
                  <Plus className="w-4 h-4 mr-1" />
                  Добавить фото
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {galleryImages.map((image) => (
                  <Card key={image.id} className="border border-[#133C2A]/10">
                    <CardContent className="p-4 space-y-3">
                      <ImageUploader
                        label={`Фото ${galleryImages.indexOf(image) + 1}`}
                        value={image.url}
                        onChange={(url) => updateGalleryImage(image.id, 'url', url)}
                        aspectRatio="aspect-square"
                      />
                      <div className="space-y-2">
                        <Label>Описание</Label>
                        <Input
                          value={image.alt}
                          onChange={(e) => updateGalleryImage(image.id, 'alt', e.target.value)}
                          placeholder="Описание фото"
                          className="rounded-xl text-sm"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeGalleryImage(image.id)}
                        className="w-full rounded-xl text-red-500 border-red-500"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Удалить
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video Section */}
        <TabsContent value="video" className="space-y-6">
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <Video className="w-5 h-5 text-[#D4AF37]" />
                Видео о студии
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Заголовок</Label>
                <Input
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Подзаголовок</Label>
                <Input
                  value={videoSubtitle}
                  onChange={(e) => setVideoSubtitle(e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Описание</Label>
                <Input
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <ImageUploader
                label="Превью видео (Thumbnail)"
                value={videoThumbnail}
                onChange={setVideoThumbnail}
                aspectRatio="aspect-video"
              />

              <div className="space-y-2">
                <Label>URL видео (YouTube/Vimeo)</Label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="rounded-2xl"
                />
                <p className="text-xs text-[#133C2A]/60">Оставьте пустым для показа только превью</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Section */}
        <TabsContent value="contacts" className="space-y-6">
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#D4AF37]" />
                Контакты и карта
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="rounded-2xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Адрес</Label>
                <Input
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Ближайшее метро</Label>
                <Input
                  value={contactMetro}
                  onChange={(e) => setContactMetro(e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Режим работы (будни)</Label>
                  <Input
                    value={workingHoursWeekdays}
                    onChange={(e) => setWorkingHoursWeekdays(e.target.value)}
                    placeholder="10:00 - 21:00"
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Режим работы (выходные)</Label>
                  <Input
                    value={workingHoursWeekends}
                    onChange={(e) => setWorkingHoursWeekends(e.target.value)}
                    placeholder="10:00 - 18:00"
                    className="rounded-2xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Яндекс Карты Embed URL</Label>
                <Textarea
                  value={mapEmbedUrl}
                  onChange={(e) => setMapEmbedUrl(e.target.value)}
                  placeholder="https://yandex.ru/map-widget/v1/?um=constructor..."
                  className="rounded-2xl min-h-[100px] text-xs"
                />
                <p className="text-xs text-[#133C2A]/60">
                  Получите код на Яндекс Картах → Конструктор карт → Скопируйте ссылку на виджет
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <Card className="border-none soft-shadow bg-gradient-to-br from-[#D4AF37]/10 to-[#133C2A]/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[#133C2A] mb-1">Сохранить изменения</h3>
              <p className="text-sm text-[#133C2A]/60">
                Изменения появятся на публичной странице после сохранения
              </p>
            </div>
            <Button
              onClick={handleSave}
              size="lg"
              className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
            >
              <Save className="w-5 h-5 mr-2" />
              Сохранить все
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}