import { useState } from 'react';
import { Phone, Mail, Instagram, MapPin, Clock, Users, Award, Star, ArrowRight, CheckCircle, Music, Heart, Sparkles, Calendar, MessageCircle, Target, TrendingUp, Zap } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import logoImage from 'figma:asset/580482af71d4ad8de5d55c498eda06ff734efd66.png';

interface PublicLandingProps {
  settings?: {
    heroTitle?: string;
    heroSubtitle?: string;
    aboutText?: string;
    whyChooseUs?: string[];
    teachersSectionTitle?: string;
    contactPhone?: string;
    contactEmail?: string;
    contactAddress?: string;
    instagramHandle?: string;
    workingHours?: string;
  };
}

export function PublicLanding({ settings }: PublicLandingProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    childAge: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultSettings = {
    heroTitle: 'Танцевальная студия Manera',
    heroSubtitle: 'Современные танцы для детей и подростков. Профессиональные преподаватели, уютная атмосфера, индивидуальный подход.',
    aboutText: 'Manera Dance Studio — это пространство, где каждый ребёнок может раскрыть свой танцевальный потенциал. Мы создаём атмосферу творчества, поддержки и профессионального роста.',
    whyChooseUs: [
      'Профессиональные преподаватели с опытом работы более 10 лет',
      'Индивидуальный подход к каждому ученику',
      'Современные танцевальные направления',
      'Уютная студия с профессиональным оборудованием',
      'Регулярные выступления и конкурсы',
      'Гибкое расписание занятий',
    ],
    teachersSectionTitle: 'Наши преподаватели',
    contactPhone: '+7 (999) 123-45-67',
    contactEmail: 'info@manera.studio',
    contactAddress: 'г. Москва, ул. Танцевальная, д. 15',
    instagramHandle: '@manera.studio',
    workingHours: 'Пн-Пт: 10:00 - 21:00, Сб-Вс: 10:00 - 18:00',
  };

  const currentSettings = { ...defaultSettings, ...settings };

  const teachers = [
    {
      id: 1,
      name: 'Анна Петрова',
      role: 'Главный хореограф',
      experience: '12 лет опыта',
      specialization: 'Contemporary, Modern Jazz',
      achievements: 'Лауреат международных конкурсов',
      emoji: '👩‍🏫',
    },
    {
      id: 2,
      name: 'Мария Сидорова',
      role: 'Хореограф',
      experience: '8 лет опыта',
      specialization: 'Hip-Hop, Break Dance',
      achievements: 'Чемпион России по брейк-дансу',
      emoji: '👩',
    },
    {
      id: 3,
      name: 'Елена Кузнецова',
      role: 'Хореограф',
      experience: '10 лет опыта',
      specialization: 'Классический танец, Балет',
      achievements: 'Солистка Большого театра',
      emoji: '👩‍🎨',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log('Form submitted:', formData);
    
    // Симуляция отправки формы
    setTimeout(() => {
      setIsSubmitting(false);
      alert('Спасибо за заявку! Мы свяжемся с вами в ближайшее время.');
      setFormData({ name: '', phone: '', childAge: '', message: '' });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F4E3] via-white to-[#F8F4E3]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#133C2A]/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white shadow-sm flex items-center justify-center">
                <img src={logoImage} alt="Manera Logo" className="w-full h-full object-contain p-1" />
              </div>
              <div>
                <h1 className="text-xl text-[#133C2A]">Manera</h1>
                <p className="text-xs text-[#133C2A]/60">Dance Studio</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a 
                href={`tel:${currentSettings.contactPhone}`} 
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl text-[#133C2A] hover:bg-[#F8F4E3] transition-smooth"
              >
                <Phone className="w-4 h-4" />
                <span className="text-sm">{currentSettings.contactPhone}</span>
              </a>
              <Button 
                onClick={() => document.getElementById('trial-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 shadow-lg"
              >
                Записаться
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Обновленный */}
      <section className="relative py-20 md:py-32 px-4 md:px-8 overflow-hidden">
        {/* Декоративные элементы */}
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#133C2A]/10 blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-gradient-to-br from-[#133C2A]/10 to-[#D4AF37]/20 blur-3xl" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-scale-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#133C2A]/10 to-[#D4AF37]/10 border border-[#D4AF37]/20">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-sm text-[#133C2A]">Профессиональная студия танца</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl text-[#133C2A] leading-tight">
                {currentSettings.heroTitle}
              </h1>
              
              <p className="text-lg md:text-xl text-[#133C2A]/70 leading-relaxed">
                {currentSettings.heroSubtitle}
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={() => document.getElementById('trial-form')?.scrollIntoView({ behavior: 'smooth' })}
                  className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all"
                >
                  Записаться на пробное
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                  className="rounded-2xl border-2 border-[#133C2A]/20 text-[#133C2A] hover:bg-[#133C2A]/5 text-lg px-8 py-6"
                >
                  Узнать больше
                </Button>
              </div>

              {/* Мини-статистика */}
              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1C8C64] to-[#133C2A] flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl text-[#133C2A]">4.9</p>
                    <p className="text-xs text-[#133C2A]/60">Рейтинг</p>
                  </div>
                </div>
                <div className="w-px h-12 bg-[#133C2A]/10" />
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#133C2A] flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl text-[#133C2A]">75+</p>
                    <p className="text-xs text-[#133C2A]/60">Учеников</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative animate-scale-in" style={{ animationDelay: '0.2s' }}>
              <div className="aspect-square rounded-3xl overflow-hidden soft-shadow hover-lift">
                <div className="w-full h-full bg-gradient-to-br from-[#133C2A] via-[#1C8C64] to-[#D4AF37] flex items-center justify-center text-9xl">
                  💃
                </div>
              </div>
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 p-4 rounded-2xl bg-white soft-shadow animate-float">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#D4AF37]" />
                  <div>
                    <p className="text-sm text-[#133C2A]">10+ лет</p>
                    <p className="text-xs text-[#133C2A]/60">Опыта</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 p-4 rounded-2xl bg-white soft-shadow animate-float" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#1C8C64]" />
                  <div>
                    <p className="text-sm text-[#133C2A]">Рост</p>
                    <p className="text-xs text-[#133C2A]/60">+30% в год</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Обновленный */}
      <section className="py-16 px-4 md:px-8 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
        
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#133C2A] to-[#1C8C64] flex items-center justify-center shadow-lg group-hover:scale-110 transition-smooth">
                <Users className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <p className="text-3xl md:text-5xl text-[#133C2A] mb-2 group-hover:text-[#D4AF37] transition-smooth">75+</p>
              <p className="text-[#133C2A]/60">Активных учеников</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#133C2A] flex items-center justify-center shadow-lg group-hover:scale-110 transition-smooth">
                <Award className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <p className="text-3xl md:text-5xl text-[#133C2A] mb-2 group-hover:text-[#D4AF37] transition-smooth">10+</p>
              <p className="text-[#133C2A]/60">Лет опыта</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#1C8C64] to-[#133C2A] flex items-center justify-center shadow-lg group-hover:scale-110 transition-smooth">
                <Star className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <p className="text-3xl md:text-5xl text-[#133C2A] mb-2 group-hover:text-[#D4AF37] transition-smooth">4.9</p>
              <p className="text-[#133C2A]/60">Средний рейтинг</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#FADADD] to-[#FFC0CB] flex items-center justify-center shadow-lg group-hover:scale-110 transition-smooth">
                <Music className="w-8 h-8 md:w-10 md:h-10 text-[#133C2A]" />
              </div>
              <p className="text-3xl md:text-5xl text-[#133C2A] mb-2 group-hover:text-[#D4AF37] transition-smooth">5+</p>
              <p className="text-[#133C2A]/60">Танцевальных направлений</p>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl text-[#133C2A] mb-4">О нашей студии</h2>
            <p className="text-lg text-[#133C2A]/70 max-w-3xl mx-auto">
              {currentSettings.aboutText}
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 px-4 md:px-8 bg-gradient-to-br from-[#133C2A]/5 to-[#D4AF37]/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl text-[#133C2A] mb-12 text-center">Почему выбирают нас</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentSettings.whyChooseUs.map((reason, index) => (
              <Card key={index} className="border-none soft-shadow hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1C8C64] to-[#133C2A] flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-[#133C2A] flex-1">{reason}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Teachers Section */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl text-[#133C2A] mb-12 text-center">
            {currentSettings.teachersSectionTitle}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {teachers.map((teacher) => (
              <Card key={teacher.id} className="border-none soft-shadow hover-lift overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-square bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center text-8xl">
                    {teacher.emoji}
                  </div>
                  <div className="p-6 space-y-3">
                    <h3 className="text-xl text-[#133C2A]">{teacher.name}</h3>
                    <p className="text-[#D4AF37]">{teacher.role}</p>
                    <div className="space-y-2 text-sm text-[#133C2A]/70">
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {teacher.experience}
                      </p>
                      <p className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        {teacher.specialization}
                      </p>
                      <p className="flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        {teacher.achievements}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trial Form Section */}
      <section id="trial-form" className="py-20 px-4 md:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl text-[#133C2A] mb-4">Записаться на пробное занятие</h2>
            <p className="text-lg text-[#133C2A]/70">
              Оставьте заявку и мы свяжемся с вами для подбора удобного времени
            </p>
          </div>

          <Card className="border-none soft-shadow">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Ваше имя *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Как вас зовут?"
                    className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+7 (999) 123-45-67"
                    className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="childAge">Возраст ребенка</Label>
                  <Input
                    id="childAge"
                    value={formData.childAge}
                    onChange={(e) => setFormData({ ...formData, childAge: e.target.value })}
                    placeholder="Например: 8 лет"
                    className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Сообщение</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Расскажите о пожеланиях или задайте вопрос"
                    className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37] min-h-[120px]"
                  />
                </div>

                <Button 
                  type="submit"
                  className="w-full rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 text-lg py-6"
                >
                  Отправить заявку
                  <Heart className="w-5 h-5 ml-2" />
                </Button>

                <p className="text-xs text-[#133C2A]/60 text-center">
                  Нажимая кнопку, вы соглашаетесь с политикой обработки персональных данных
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 px-4 md:px-8 bg-gradient-to-br from-[#133C2A] to-[#D4AF37]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl text-white mb-12 text-center">Контакты</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-none bg-white/10 backdrop-blur-sm hover-lift">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <p className="text-white/70 text-sm mb-2">Телефон</p>
                <a href={`tel:${currentSettings.contactPhone}`} className="text-white hover:text-[#F8F4E3] transition-smooth">
                  {currentSettings.contactPhone}
                </a>
              </CardContent>
            </Card>

            <Card className="border-none bg-white/10 backdrop-blur-sm hover-lift">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <p className="text-white/70 text-sm mb-2">Email</p>
                <a href={`mailto:${currentSettings.contactEmail}`} className="text-white hover:text-[#F8F4E3] transition-smooth">
                  {currentSettings.contactEmail}
                </a>
              </CardContent>
            </Card>

            <Card className="border-none bg-white/10 backdrop-blur-sm hover-lift">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <p className="text-white/70 text-sm mb-2">Адрес</p>
                <p className="text-white">{currentSettings.contactAddress}</p>
              </CardContent>
            </Card>

            <Card className="border-none bg-white/10 backdrop-blur-sm hover-lift">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Instagram className="w-6 h-6 text-white" />
                </div>
                <p className="text-white/70 text-sm mb-2">Instagram</p>
                <a href={`https://instagram.com/${currentSettings.instagramHandle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#F8F4E3] transition-smooth">
                  {currentSettings.instagramHandle}
                </a>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <Card className="border-none bg-white/10 backdrop-blur-sm inline-block">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-white">
                  <Clock className="w-5 h-5" />
                  <div className="text-left">
                    <p className="text-white/70 text-sm">Режим работы</p>
                    <p className="text-white">{currentSettings.workingHours}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 md:px-8 bg-[#133C2A]">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-white/60 text-sm">
            © 2024 Manera Dance Studio. Все права защищены.
          </p>
        </div>
      </footer>
    </div>
  );
}