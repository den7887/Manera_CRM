import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import logoImage from 'figma:asset/580482af71d4ad8de5d55c498eda06ff734efd66.png';

interface LoginProps {
  onBack: () => void;
  onLogin: (phone: string) => Promise<void>;
}

export function Login({ onBack, onLogin }: LoginProps) {
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onLogin(phone);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить код');
    } finally {
      setIsSubmitting(false);
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
                disabled={!phone || isSubmitting}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 transition-smooth"
              >
                {isSubmitting ? 'Отправка...' : 'Получить код'}
              </Button>

              {error && (
                <div className="text-sm text-red-600 text-center">
                  {error}
                </div>
              )}

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
            <p className="text-xs text-[#133C2A]/70 text-center">
              Код подтверждения отправляется на указанный номер телефона.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
