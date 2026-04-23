import { useState } from 'react';
import { Phone, Sparkles, ArrowRight, Star, Users, Award, TrendingUp, CheckCircle, Clock, Music, Quote, Play, MapPin, Mail, Heart, Instagram } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { mockPricingProducts } from '../data/mockData';
import logoImage from 'figma:asset/580482af71d4ad8de5d55c498eda06ff734efd66.png';
import { TrialClassDialog } from './TrialClassDialog';
import { Task, Notification } from '../types';
import { toast } from '../utils/toast';

interface LandingProps {
  onLogin: () => void;
  onGuestBrowse: () => void;
  onAddTask: (task: Task) => void;
  onAddNotification: (notification: Notification) => void;
}

export function Landing({ onLogin, onGuestBrowse, onAddTask, onAddNotification }: LandingProps) {
  const [isTrialDialogOpen, setIsTrialDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    childName: '',
    childAge: '',
    medicalRestrictions: '',
    source: '',
    note: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const benefits = [
    'Профессиональные преподаватели с опытом работы более 10 лет',
    'Индивидуальный подход к каждому ученику',
    'Современные танцевальные направления',
    'Уютная студия с профессиональным оборудованием',
    'Регулярные выступления и конкурсы',
    'Гибкое расписание занятий',
  ];

  const testimonials = [
    {
      id: 1,
      name: 'Елена Смирнова',
      role: 'Мама Кати (8 лет)',
      rating: 5,
      text: 'Моя дочь занимается в Manera уже год. Это лучшая студия! Преподаватели внимательные, атмосфера доброжелательная. Катя с удовольствием бежит на каждое занятие.',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    },
    {
      id: 2,
      name: 'Андрей Петров',
      role: 'Папа Максима (10 лет)',
      rating: 5,
      text: 'Отличная студия! Сын стал более уверенным в себе, появилась хорошая осанка. Профессиональный подход к каждому ребенку. Рекомендую всем!',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    },
    {
      id: 3,
      name: 'Мария Иванова',
      role: 'Мама Софии (7 лет)',
      rating: 5,
      text: 'Manera - это не просто танцевальная студия, это семья! Индивидуальный подход, красивые костюмы на выступлениях, профессиональные хореографы. Спасибо вам!',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    },
  ];

  const galleryImages = [
    {
      id: 1,
      url: 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=800',
      alt: 'Групповое занятие по contemporary',
    },
    {
      id: 2,
      url: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800',
      alt: 'Выступление на конкурсе',
    },
    {
      id: 3,
      url: 'https://images.unsplash.com/photo-1540479859555-17af45c78602?w=800',
      alt: 'Индивидуальная тренировка',
    },
    {
      id: 4,
      url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800',
      alt: 'Растяжка и разминка',
    },
    {
      id: 5,
      url: 'https://images.unsplash.com/photo-1547153760-18fc4555e7ce?w=800',
      alt: 'Танцевальный зал',
    },
    {
      id: 6,
      url: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800',
      alt: 'Атмосфера студии',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Создаем задачу для администратора
    const task: Task = {
      id: `task-${Date.now()}`,
      title: `Запись на пробное: ${formData.name}`,
      description: `Телефон: ${formData.phone}\nИмя ребенка: ${formData.childName || 'Не указано'}\nВозраст ребенка: ${formData.childAge || 'Не указан'}\nМедицинские ограничения: ${formData.medicalRestrictions || 'Нет'}\nИсточник: ${formData.source || 'Не указан'}\nПримечание: ${formData.note || 'Нет'}`,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Завтра
      priority: 'high',
      status: 'pending',
      assigneeId: 'admin-1',
      createdBy: 'system',
      createdAt: new Date(),
      category: 'new-client',
    };
    
    // Создаем уведомление
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      type: 'task',
      title: 'Новая заявка на пробное занятие',
      message: `${formData.name} оставил(а) заявку на пробное занятие`,
      timestamp: new Date(),
      read: false,
    };

    onAddTask(task);
    onAddNotification(notification);
    
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('Спасибо за заявку! Мы свяжемся с вами в ближайшее время.');
      setFormData({ name: '', phone: '', childName: '', childAge: '', medicalRestrictions: '', source: '', note: '' });
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
                href="tel:+79991234567" 
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl text-[#133C2A] hover:bg-[#F8F4E3] transition-smooth"
              >
                <Phone className="w-4 h-4" />
                <span className="text-sm">+7 (999) 123-45-67</span>
              </a>
              <Button 
                onClick={onLogin}
                variant="outline"
                className="rounded-2xl border-[#133C2A]/20 text-[#133C2A] hover:bg-[#133C2A]/5"
              >
                Войти
              </Button>
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

      {/* Hero Section */}
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
                Танцевальная студия Manera
              </h1>
              
              <p className="text-lg md:text-xl text-[#133C2A]/70 leading-relaxed">
                Современные танцы для детей и подростков. Профессиональные преподаватели, уютная атмосфера, индивидуальный подход.
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
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1758526387723-075751b1bcda?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb250ZW1wb3JhcnklMjBkYW5jZSUyMHN0dWRpb3xlbnwxfHx8fDE3NjI3NjYzODV8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Manera Dance Studio"
                  className="w-full h-full object-cover"
                />
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

      {/* Stats Section */}
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
              Manera Dance Studio — это пространство, где каждый ребёнок может раскрыть свой танцевальный потенциал. Мы создаём атмосферу творчества, поддержки и профессионального роста.
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 px-4 md:px-8 bg-gradient-to-br from-[#133C2A]/5 to-[#D4AF37]/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl text-[#133C2A] mb-12 text-center">Почему выбирают нас</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="border-none soft-shadow hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1C8C64] to-[#133C2A] flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-[#133C2A] flex-1">{benefit}</p>
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
            Наши преподаватели
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

      {/* Testimonials Section */}
      <section className="py-20 px-4 md:px-8 bg-gradient-to-br from-[#133C2A]/5 to-[#D4AF37]/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl text-[#133C2A] mb-4">Отзывы наших родителей</h2>
            <p className="text-lg text-[#133C2A]/70">
              Мы гордимся доверием, которое нам оказывают наши семьи
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="border-none soft-shadow hover-lift">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-[#133C2A] to-[#D4AF37]">
                      <ImageWithFallback
                        src={testimonial.image}
                        alt={testimonial.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[#133C2A]">{testimonial.name}</h3>
                      <p className="text-sm text-[#133C2A]/60">{testimonial.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-[#D4AF37] text-[#D4AF37]" />
                    ))}
                  </div>
                  <div className="relative">
                    <Quote className="absolute -top-2 -left-2 w-8 h-8 text-[#D4AF37]/20" />
                    <p className="text-[#133C2A]/80 leading-relaxed pl-6">
                      {testimonial.text}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-20 px-4 md:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl text-[#133C2A] mb-4">Галерея</h2>
            <p className="text-lg text-[#133C2A]/70">
              Моменты с наших занятий и выступлений
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {galleryImages.map((image) => (
              <div key={image.id} className="aspect-square rounded-2xl overflow-hidden soft-shadow hover-lift group cursor-pointer">
                <ImageWithFallback
                  src={image.url}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-20 px-4 md:px-8 bg-gradient-to-br from-[#F8F4E3] to-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl text-[#133C2A] mb-4">Познакомьтесь с нашей студией</h2>
            <p className="text-lg text-[#133C2A]/70">
              Небольшое видео о том, как проходят наши занятия
            </p>
          </div>
          <div className="relative aspect-video rounded-3xl overflow-hidden soft-shadow group cursor-pointer">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=1200"
              alt="Видео о студии Manera"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#133C2A]/80 via-[#133C2A]/40 to-transparent flex items-center justify-center group-hover:bg-[#133C2A]/60 transition-smooth">
              <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-smooth">
                <Play className="w-10 h-10 text-[#133C2A] ml-1" />
              </div>
            </div>
            <div className="absolute bottom-8 left-8 right-8 text-white">
              <h3 className="text-2xl mb-2">Manera Dance Studio Tour</h3>
              <p className="text-white/80">Узнайте больше о нашей студии и атмосфере занятий</p>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-20 px-4 md:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl text-[#133C2A] mb-4">Как нас найти</h2>
            <p className="text-lg text-[#133C2A]/70">
              Мы находимся в самом центре Москвы, рядом с метро
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Card className="border-none soft-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg text-[#133C2A] mb-2">Адрес</h3>
                      <p className="text-[#133C2A]/70">г. Москва, ул. Танцевальная, д. 15</p>
                      <p className="text-sm text-[#133C2A]/60 mt-1">м. Парк Культуры (5 минут пешком)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-none soft-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1C8C64] to-[#133C2A] flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg text-[#133C2A] mb-2">Режим работы</h3>
                      <p className="text-[#133C2A]/70">Пн-Пт: 10:00 - 21:00</p>
                      <p className="text-[#133C2A]/70">Сб-Вс: 10:00 - 18:00</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none soft-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#133C2A] flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg text-[#133C2A] mb-2">Контакты</h3>
                      <a href="tel:+79991234567" className="text-[#133C2A]/70 hover:text-[#D4AF37] transition-smooth block">
                        +7 (999) 123-45-67
                      </a>
                      <a href="mailto:info@manera.studio" className="text-[#133C2A]/70 hover:text-[#D4AF37] transition-smooth block">
                        info@manera.studio
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-3xl overflow-hidden soft-shadow">
              <iframe
                src="https://yandex.ru/map-widget/v1/?um=constructor%3Aec8fa77c6f87f53e3c1e4e0b8c8c8c8c&amp;source=constructor"
                width="100%"
                height="500"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                className="w-full h-full"
                title="Manera Dance Studio на карте"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 md:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl text-[#133C2A] mb-4">Абонементы</h2>
            <p className="text-lg text-[#133C2A]/70">
              Выберите удобный для вас вариант занятий
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {mockPricingProducts.map((subscription, index) => (
              <Card 
                key={subscription.id} 
                className={`border-none soft-shadow hover-lift overflow-hidden ${
                  index === 1 ? 'ring-2 ring-[#D4AF37] relative' : ''
                }`}
              >
                {index === 1 && (
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-[#D4AF37] text-white text-xs">
                    Популярный
                  </div>
                )}
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl text-[#133C2A] mb-2">{subscription.name}</h3>
                    <p className="text-[#133C2A]/60 mb-4">{subscription.description}</p>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl text-[#133C2A]">{subscription.price.toLocaleString()}</span>
                      <span className="text-[#133C2A]/60">₽</span>
                    </div>
                    <p className="text-sm text-[#133C2A]/60 mt-2">
                      {subscription.sessions} занятий / {subscription.duration} дней
                    </p>
                  </div>
                  
                  <Button 
                    onClick={() => setIsTrialDialogOpen(true)}
                    className={`w-full rounded-2xl ${
                      index === 1 
                        ? 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90' 
                        : 'bg-[#133C2A] hover:bg-[#133C2A]/90'
                    }`}
                  >
                    Выбрать
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trial Form Section */}
      <section id="trial-form" className="py-20 px-4 md:px-8 bg-gradient-to-br from-[#F8F4E3] to-white">
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
                  <Label htmlFor="childName">Имя ребенка</Label>
                  <Input
                    id="childName"
                    value={formData.childName}
                    onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                    placeholder="Например: Иван"
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
                  <Label htmlFor="medicalRestrictions">Медицинские ограничения</Label>
                  <Textarea
                    id="medicalRestrictions"
                    value={formData.medicalRestrictions}
                    onChange={(e) => setFormData({ ...formData, medicalRestrictions: e.target.value })}
                    placeholder="Расскажите о медицинских ограничениях ребенка"
                    className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37] min-h-[120px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source">Откуда узнали о нас?</Label>
                  <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                    <SelectTrigger className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]">
                      <SelectValue placeholder="Выберите источник" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="friends">Рекомендация друзей</SelectItem>
                      <SelectItem value="google">Поиск в Google</SelectItem>
                      <SelectItem value="yandex">Яндекс</SelectItem>
                      <SelectItem value="ads">Реклама</SelectItem>
                      <SelectItem value="passing">Проходил(а) мимо</SelectItem>
                      <SelectItem value="other">Другое</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Примечание</Label>
                  <Textarea
                    id="note"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Дополнительная информация"
                    className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37] min-h-[120px]"
                  />
                </div>

                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 text-lg py-6"
                >
                  {isSubmitting ? 'Отправка...' : 'Отправить заявку'}
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
                <a href="tel:+79991234567" className="text-white hover:text-[#F8F4E3] transition-smooth">
                  +7 (999) 123-45-67
                </a>
              </CardContent>
            </Card>

            <Card className="border-none bg-white/10 backdrop-blur-sm hover-lift">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <p className="text-white/70 text-sm mb-2">Email</p>
                <a href="mailto:info@manera.studio" className="text-white hover:text-[#F8F4E3] transition-smooth">
                  info@manera.studio
                </a>
              </CardContent>
            </Card>

            <Card className="border-none bg-white/10 backdrop-blur-sm hover-lift">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <p className="text-white/70 text-sm mb-2">Адрес</p>
                <p className="text-white">г. Москва, ул. Танцевальная, д. 15</p>
              </CardContent>
            </Card>

            <Card className="border-none bg-white/10 backdrop-blur-sm hover-lift">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Instagram className="w-6 h-6 text-white" />
                </div>
                <p className="text-white/70 text-sm mb-2">Instagram</p>
                <a href="https://instagram.com/manera.studio" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#F8F4E3] transition-smooth">
                  @manera.studio
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
                    <p className="text-white">Пн-Пт: 10:00 - 21:00, Сб-Вс: 10:00 - 18:00</p>
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

      {/* Trial Dialog */}
      <TrialClassDialog 
        isOpen={isTrialDialogOpen} 
        onClose={() => setIsTrialDialogOpen(false)}
        onAddTask={onAddTask}
        onAddNotification={onAddNotification}
      />
    </div>
  );
}