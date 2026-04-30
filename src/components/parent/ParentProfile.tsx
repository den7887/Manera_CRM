import { Bell, LogOut, Mail, Phone, ShieldCheck, User as UserIcon } from 'lucide-react';
import { User } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { toast } from 'sonner';

interface ParentProfileProps {
  user: User;
  onLogout: () => void;
}

export function ParentProfile({ user, onLogout }: ParentProfileProps) {
  const handleToggle = (title: string, enabled: boolean) => {
    toast.info(`${title}: ${enabled ? 'включено' : 'выключено'}`);
  };

  return (
    <div className="space-y-4 animate-scale-in">
      <Card className="border-none soft-shadow overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-[#133C2A] via-[#1b5138] to-[#D4AF37]" />
        <CardContent className="p-5 -mt-8">
          <div className="flex items-center gap-3">
            <Avatar className="w-16 h-16 border-2 border-white shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white text-xl">
                {user.name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-[#133C2A] truncate">{user.name}</p>
              <p className="text-xs text-[#133C2A]/60">Родитель</p>
            </div>
            <Badge variant="outline" className="ml-auto rounded-full border-[#133C2A]/20 text-[#133C2A]">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Подтвержден
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid xl:grid-cols-[1fr_1fr] gap-4">
        <Card className="border-none soft-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#133C2A] text-base">Контакты</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="rounded-xl border border-[#133C2A]/10 p-3 bg-white">
              <p className="text-xs text-[#133C2A]/60 flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Телефон</p>
              <p className="text-[#133C2A] mt-1">{user.phone}</p>
            </div>
            <div className="rounded-xl border border-[#133C2A]/10 p-3 bg-white">
              <p className="text-xs text-[#133C2A]/60 flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</p>
              <p className="text-[#133C2A] mt-1">{user.email || 'Не указан'}</p>
            </div>
            <div className="rounded-xl border border-[#133C2A]/10 p-3 bg-white">
              <p className="text-xs text-[#133C2A]/60 flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" /> ID</p>
              <p className="text-[#133C2A] mt-1 text-sm">{user.id}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#133C2A] text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#D4AF37]" />
              Уведомления
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-[#133C2A]/10 p-3 bg-white flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="push-switch">Push</Label>
                <p className="text-xs text-[#133C2A]/60 mt-0.5">Оперативные уведомления</p>
              </div>
              <Switch id="push-switch" defaultChecked onCheckedChange={(value) => handleToggle('Push', value)} />
            </div>
            <div className="rounded-xl border border-[#133C2A]/10 p-3 bg-white flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="email-switch">Email</Label>
                <p className="text-xs text-[#133C2A]/60 mt-0.5">Новости и системные сообщения</p>
              </div>
              <Switch id="email-switch" defaultChecked onCheckedChange={(value) => handleToggle('Email', value)} />
            </div>
            <div className="rounded-xl border border-[#133C2A]/10 p-3 bg-white flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="payment-switch">Оплаты</Label>
                <p className="text-xs text-[#133C2A]/60 mt-0.5">Напоминания по счетам</p>
              </div>
              <Switch id="payment-switch" defaultChecked onCheckedChange={(value) => handleToggle('Оплаты', value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardContent className="p-4">
          <Button
            onClick={onLogout}
            variant="outline"
            className="w-full rounded-xl border-[#D14343]/30 text-[#D14343] hover:bg-[#D14343]/5"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Выйти из аккаунта
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
