import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, LockKeyhole } from 'lucide-react';
import { loadActivationInfo, setActivationPin, type ActivationInfoResponse } from '../../lib/backendApi';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface ActivationPinPageProps {
  token: string;
  onActivated: () => Promise<void> | void;
  onGoLogin: () => void;
}

export function ActivationPinPage({ token, onActivated, onGoLogin }: ActivationPinPageProps) {
  const [info, setInfo] = useState<ActivationInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [pinRepeat, setPinRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const payload = await loadActivationInfo(token);
        if (active) {
          setInfo(payload);
          if (!payload.valid) {
            setError(payload.message || 'Ссылка недействительна или устарела');
          } else {
            setError(null);
          }
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Не удалось проверить ссылку');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [token]);

  const introText = useMemo(() => {
    if (info?.purpose === 'after_online_payment') {
      return 'Оплата прошла успешно. Создайте PIN-код для входа в личный кабинет.';
    }
    return 'Создайте PIN-код для входа в личный кабинет студии Манера.';
  }, [info?.purpose]);

  const canSubmit = pin.length === 6 && pinRepeat.length === 6 && !submitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await setActivationPin(token, pin, pinRepeat);
      await onActivated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать PIN');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F4E3] via-white to-[#F8F4E3] px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <Card className="w-full border-[#133C2A]/10 shadow-[0_18px_44px_rgba(19,60,42,0.08)]">
          <CardContent className="space-y-6 p-6 sm:p-7">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.18em] text-[#133C2A]/45">Активация кабинета</p>
              <h1 className="text-3xl text-[#133C2A]">Создание PIN</h1>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-[#133C2A]/10 bg-[#F8F4E3]/75 p-4 text-sm text-[#133C2A]/70">
                Проверяем ссылку...
              </div>
            ) : null}

            {!loading && error ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>{error}</div>
                  </div>
                </div>
                <Button variant="outline" className="w-full rounded-2xl border-[#133C2A]/15" onClick={onGoLogin}>
                  Перейти ко входу
                </Button>
              </div>
            ) : null}

            {!loading && info?.valid ? (
              <>
                <div className="rounded-2xl border border-[#133C2A]/10 bg-[#F8F4E3]/75 p-4 text-sm leading-relaxed text-[#133C2A]/70">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#133C2A]" />
                    <div className="space-y-2">
                      <p>{introText}</p>
                      <p>PIN-код понадобится для дальнейшего входа по номеру телефона.</p>
                      <p className="text-xs text-[#133C2A]/55">
                        {info.user_name ? `${info.user_name} • ` : ''}
                        {info.phone_masked}
                      </p>
                    </div>
                  </div>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="activation-pin" className="text-[#133C2A]">PIN-код</Label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#133C2A]/40" />
                      <Input
                        id="activation-pin"
                        type="tel"
                        autoComplete="off"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        enterKeyHint="next"
                        maxLength={6}
                        value={pin}
                        onChange={(event) => setPin(event.target.value.replace(/\D+/g, '').slice(0, 6))}
                        placeholder="••••••"
                        className="h-11 rounded-2xl border-[#133C2A]/15 pl-10 tracking-[0.35em]"
                        style={{ WebkitTextSecurity: 'disc' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="activation-pin-repeat" className="text-[#133C2A]">Повторите PIN</Label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#133C2A]/40" />
                      <Input
                        id="activation-pin-repeat"
                        type="tel"
                        autoComplete="off"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        enterKeyHint="done"
                        maxLength={6}
                        value={pinRepeat}
                        onChange={(event) => setPinRepeat(event.target.value.replace(/\D+/g, '').slice(0, 6))}
                        placeholder="••••••"
                        className="h-11 rounded-2xl border-[#133C2A]/15 pl-10 tracking-[0.35em]"
                        style={{ WebkitTextSecurity: 'disc' }}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="h-11 w-full rounded-2xl bg-[#133C2A]" disabled={!canSubmit}>
                    {submitting ? 'Создаём PIN...' : 'Создать PIN'}
                  </Button>
                </form>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
