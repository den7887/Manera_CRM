import { useState } from 'react';
import { ArrowLeft, Phone } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import logoImage from 'figma:asset/580482af71d4ad8de5d55c498eda06ff734efd66.png';

interface LoginProps {
  onBack: () => void;
  onLogin: (phone: string) => void;
}

export function Login({ onBack, onLogin }: LoginProps) {
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone) {
      onLogin(phone);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F8F4E3] via-[#F8F4E3] to-[#133C2A]/5">
      <div className="w-full max-w-md animate-scale-in">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-[#133C2A]/60 hover:text-[#133C2A] transition-smooth"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Назад</span>
        </button>

        <Card className="border-none soft-shadow">
          <CardHeader className="space-y-3 text-center">
            <img 
              src={logoImage} 
              alt="Manera Logo" 
              className="w-24 h-24 mx-auto object-contain"
            />
            <CardTitle className="text-[#133C2A]">Вход в систему</CardTitle>
            <CardDescription className="text-[#133C2A]/60">
              Введите ваш номер телефона для входа
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone">Номер телефона</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 (999) 123-45-67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 transition-smooth"
              >
                Получить код
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={onBack}
                  className="text-sm text-[#133C2A]/60 hover:text-[#D4AF37] transition-smooth"
                >
                  Продолжить как гость
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-3">
          <div className="p-4 rounded-2xl bg-white/50 border border-[#133C2A]/10">
            <p className="text-xs text-[#133C2A]/60 text-center mb-2">
              💡 Демо-доступ (код на следующем шаге):
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-[#133C2A]/70">
              <div className="p-2 rounded-xl bg-[#F8F4E3]">
                <span className="block text-[#133C2A]">👤 Родитель</span>
                <span className="text-[#133C2A]/60">111111</span>
              </div>
              <div className="p-2 rounded-xl bg-[#F8F4E3]">
                <span className="block text-[#133C2A]">👨‍🏫 Учитель</span>
                <span className="text-[#133C2A]/60">222222</span>
              </div>
              <div className="p-2 rounded-xl bg-[#F8F4E3]">
                <span className="block text-[#133C2A]">⚙️ Админ</span>
                <span className="text-[#133C2A]/60">333333</span>
              </div>
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#133C2A]/10 to-[#D4AF37]/10 border border-[#D4AF37]/20">
                <span className="block text-[#133C2A]">🎩 Владелец</span>
                <span className="text-[#D4AF37]">444444</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-[#133C2A]/60">
            Нажимая "Получить код", вы соглашаетесь с{' '}
            <a href="#" className="text-[#D4AF37] hover:underline">
              условиями использования
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}