import { User, LogOut, Mail, Phone, Briefcase, Award } from 'lucide-react';
import { User as UserType } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';

interface TeacherProfileProps {
  user: UserType;
  onLogout: () => void;
}

export function TeacherProfile({ user, onLogout }: TeacherProfileProps) {
  const handleEditProfile = () => {
    toast.info('Редактирование профиля', {
      description: 'Функция находится в разработке',
      duration: 2000,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-scale-in">
      <div>
        <h1 className="text-[#133C2A] mb-2">Мой профиль</h1>
        <p className="text-[#133C2A]/60">Личная информация и настройки</p>
      </div>

      {/* Profile Card */}
      <Card className="border-none soft-shadow">
        <div className="h-32 bg-gradient-to-r from-[#133C2A] to-[#D4AF37] rounded-t-2xl" />
        <CardContent className="relative pt-20 pb-6">
          <Avatar className="absolute -top-16 left-6 w-32 h-32 border-4 border-white">
            <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white text-4xl">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="md:ml-44">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-[#133C2A] text-2xl mb-2">{user.name}</h2>
                <Badge className="bg-[#D4AF37]/20 text-[#133C2A] border-[#D4AF37]/30">
                  Преподаватель
                </Badge>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#F8F4E3]">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-xs text-[#133C2A]/60">Email</p>
                  <p className="text-[#133C2A]">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#F8F4E3]">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-xs text-[#133C2A]/60">Телефон</p>
                  <p className="text-[#133C2A]">{user.phone}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Info */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A] flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#D4AF37]" />
            Профессиональная информация
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#F8F4E3]">
              <div className="flex items-center gap-3 mb-3">
                <Award className="w-5 h-5 text-[#D4AF37]" />
                <span className="text-sm text-[#133C2A]/70">Специализация</span>
              </div>
              <p className="text-[#133C2A]">Современный танец</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8F4E3]">
              <div className="flex items-center gap-3 mb-3">
                <Award className="w-5 h-5 text-[#D4AF37]" />
                <span className="text-sm text-[#133C2A]/70">Стаж работы</span>
              </div>
              <p className="text-[#133C2A]">5+ лет</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#D4AF37]/10 to-[#133C2A]/5 border border-[#D4AF37]/20">
            <h4 className="text-[#133C2A] mb-2">Достижения</h4>
            <ul className="space-y-2 text-sm text-[#133C2A]/70">
              <li className="flex items-start gap-2">
                <span className="text-[#D4AF37]">•</span>
                <span>Мастер современной хореографии</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D4AF37]">•</span>
                <span>Сертифицированный педагог-хореограф</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D4AF37]">•</span>
                <span>Участник международных фестивалей</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Настройки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={handleEditProfile}
            variant="outline" 
            className="w-full rounded-2xl border-[#133C2A]/20 hover:bg-[#133C2A]/5 justify-start gap-3 h-auto py-4"
          >
            <User className="w-5 h-5 text-[#D4AF37]" />
            <div className="text-left">
              <p className="text-[#133C2A]">Редактировать профиль</p>
              <p className="text-xs text-[#133C2A]/60">Изменить личные данные</p>
            </div>
          </Button>

          <Button 
            onClick={onLogout}
            variant="outline" 
            className="w-full rounded-2xl border-red-200 hover:bg-red-50 text-red-600 justify-start gap-3 h-auto py-4"
          >
            <LogOut className="w-5 h-5" />
            <div className="text-left">
              <p>Выйти из системы</p>
              <p className="text-xs opacity-60">Завершить текущую сессию</p>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}