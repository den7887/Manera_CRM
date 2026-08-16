import { useState } from 'react';
import { ArrowLeft, LockKeyhole, Phone } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface PinLoginProps {
  onBack: () => void;
  onLogin: (phone: string, pin: string) => Promise<void>;
  onStartActivation: (phone: string) => Promise<void>;
}

export function PinLogin({ onBack, onLogin, onStartActivation }: PinLoginProps) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canSubmit = phone.trim().length >= 5 && pin.length === 6 && !submitting;
  const canStartActivation = phone.trim().length >= 5 && !submitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      setErrorMessage('Введите телефон и 6-значный PIN-код.');
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await onLogin(phone, pin);
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : 'Не удалось выполнить вход. Попробуйте снова.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F4E3] via-white to-[#F8F4E3] px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <Card className="w-full border-[#133C2A]/10 shadow-[0_18px_44px_rgba(19,60,42,0.08)]">
          <CardContent className="space-y-6 p-6 sm:p-7">
            <Button variant="ghost" className="h-auto rounded-xl px-0 text-[#133C2A]/70 hover:bg-transparent hover:text-[#133C2A]" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>

            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.18em] text-[#133C2A]/45">Вход в кабинет</p>
              <p className="text-sm leading-relaxed text-[#133C2A]/65">
                Введите номер телефона и 6-значный PIN-код, который вы создали при активации кабинета.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[#133C2A]">Телефон</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#133C2A]/40" />
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      if (errorMessage) {
                        setErrorMessage(null);
                      }
                    }}
                    placeholder="+7 (999) 123-45-67"
                    className="h-11 rounded-2xl border-[#133C2A]/15 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin" className="text-[#133C2A]">PIN-код</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#133C2A]/40" />
                  <Input
                    id="pin"
                    type="tel"
                    autoComplete="off"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    enterKeyHint="done"
                    maxLength={6}
                    value={pin}
                    onChange={(event) => {
                      setPin(event.target.value.replace(/\D+/g, '').slice(0, 6));
                      if (errorMessage) {
                        setErrorMessage(null);
                      }
                    }}
                    placeholder="••••••"
                    className="h-11 rounded-2xl border-[#133C2A]/15 pl-10 tracking-[0.35em]"
                    style={{ WebkitTextSecurity: 'disc' }}
                  />
                </div>
              </div>

              <Button type="submit" className="h-11 w-full rounded-2xl bg-[#133C2A]" disabled={!canSubmit}>
                {submitting ? 'Входим...' : 'Войти'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-2xl border-[#133C2A]/20"
                disabled={!canStartActivation}
                onClick={async () => {
                  setSubmitting(true);
                  setErrorMessage(null);
                  try {
                    await onStartActivation(phone);
                  } catch (error) {
                    const message = error instanceof Error && error.message ? error.message : 'Не удалось запустить активацию PIN.';
                    setErrorMessage(message);
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                Создать PIN (первый вход)
              </Button>
              {errorMessage ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}
            </form>

            <div className="rounded-2xl border border-[#133C2A]/10 bg-[#F8F4E3]/75 p-4 text-sm leading-relaxed text-[#133C2A]/70">
              Забыли PIN? Обратитесь к администратору студии для восстановления доступа.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
