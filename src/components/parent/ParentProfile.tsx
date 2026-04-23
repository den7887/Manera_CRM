import { User as UserIcon, Phone, Mail, Bell, LogOut, Edit } from 'lucide-react';
import { User } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { toast } from 'sonner@2.0.3';

interface ParentProfileProps {
  user: User;
  onLogout: () => void;
}

export function ParentProfile({ user, onLogout }: ParentProfileProps) {
  const handleEditProfile = () => {
    toast.info('Редактирование профиля', {
      description: 'Функция находится в разработке',
      duration: 2000,
    });
  };

  const handleChangePassword = () => {
    toast.info('Изменение пароля', {
      description: 'Функция находится в разработке',
      duration: 2000,
    });
  };

  const handleNotificationToggle = (type: string, enabled: boolean) => {
    toast.success(`${type} ${enabled ? 'включены' : 'выключены'}`, {
      duration: 2000,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-scale-in">
      <div>
        <h1 className="text-[#133C2A] mb-2">Профиль</h1>
        <p className="text-[#133C2A]/60">Управление личной информацией и настройками</p>
      </div>

      {/* Profile Info */}
      <Card className="border-none soft-shadow">
        <div className="h-32 bg-gradient-to-r from-[#133C2A] to-[#D4AF37] rounded-t-2xl" />
        <CardContent className="relative pt-0 pb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-16 relative z-10">
            <Avatar className="w-32 h-32 border-4 border-white soft-shadow">
              <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white text-4xl">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 md:pb-4">
              <h2 className="text-[#133C2A] mb-1">{user.name}</h2>
              <p className="text-[#133C2A]/60">Родитель</p>
            </div>
            <Button
              variant="outline"
              className="rounded-2xl border-[#133C2A]/20 gap-2 md:mb-4"
              onClick={handleEditProfile}
            >
              <Edit className="w-4 h-4" />
              Редактировать
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Контактная информация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F8F4E3]">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-[#133C2A]/60">Телефон</p>
              <p className="text-[#133C2A]">{user.phone}</p>
            </div>
          </div>

          {user.email && (
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F8F4E3]">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#133C2A]/60">Email</p>
                <p className="text-[#133C2A]">{user.email}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F8F4E3]">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-[#133C2A]/60">ID пользователя</p>
              <p className="text-[#133C2A] font-mono">{user.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A] flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#D4AF37]" />
            Уведомления
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="push-notifications">Push-уведомления</Label>
              <p className="text-sm text-[#133C2A]/60">
                Получать уведомления о занятиях и событиях
              </p>
            </div>
            <Switch
              id="push-notifications"
              defaultChecked
              onCheckedChange={(checked) =>
                handleNotificationToggle('Push-уведомления', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="email-notifications">Email уведомления</Label>
              <p className="text-sm text-[#133C2A]/60">
                Получать новости на электронную почту
              </p>
            </div>
            <Switch
              id="email-notifications"
              defaultChecked
              onCheckedChange={(checked) =>
                handleNotificationToggle('Email уведомления', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="sms-notifications">SMS напоминания</Label>
              <p className="text-sm text-[#133C2A]/60">
                Напоминания о предстоящих занятиях
              </p>
            </div>
            <Switch
              id="sms-notifications"
              defaultChecked
              onCheckedChange={(checked) =>
                handleNotificationToggle('SMS напоминания', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="payment-notifications">Уведомления об оплате</Label>
              <p className="text-sm text-[#133C2A]/60">
                Напоминания о платежах и счетах
              </p>
            </div>
            <Switch
              id="payment-notifications"
              defaultChecked
              onCheckedChange={(checked) =>
                handleNotificationToggle('Уведомления об оплате', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card className="border-none soft-shadow">
        <CardContent className="p-6 space-y-3">
          <Button
            variant="outline"
            className="w-full rounded-2xl border-[#133C2A]/20 hover:bg-[#133C2A]/5 justify-start gap-3"
            onClick={handleChangePassword}
          >
            <Edit className="w-5 h-5" />
            Изменить пароль
          </Button>

          <Button
            onClick={onLogout}
            variant="outline"
            className="w-full rounded-2xl border-[#D14343]/20 text-[#D14343] hover:bg-[#D14343]/5 justify-start gap-3"
          >
            <LogOut className="w-5 h-5" />
            Выйти из аккаунта
          </Button>
        </CardContent>
      </Card>

      {/* App Info */}
      <div className="text-center text-sm text-[#133C2A]/40 py-4">
        <p className="italic text-[#D4AF37] mb-2">Ты автор своего результата</p>
        <p>Manera Contemporary Dance Studio v1.0</p>
      </div>
    </div>
  );
}