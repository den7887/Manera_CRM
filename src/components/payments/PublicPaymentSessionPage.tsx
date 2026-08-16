import { useEffect, useState } from 'react';
import { AlertCircle, CreditCard, Phone } from 'lucide-react';
import { createPublicPaymentProvider, loadPublicPaymentSession, type PublicPaymentSessionResponse } from '../../lib/backendApi';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface PublicPaymentSessionPageProps {
  token: string;
}

export function PublicPaymentSessionPage({ token }: PublicPaymentSessionPageProps) {
  const [session, setSession] = useState<PublicPaymentSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSession = async () => {
    setLoading(true);
    try {
      const payload = await loadPublicPaymentSession(token);
      setSession(payload);
      setError(payload.valid ? null : payload.message || 'Ссылка оплаты недействительна');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось открыть страницу оплаты');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSession();
  }, [token]);

  const handlePay = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = await createPublicPaymentProvider(token);
      if (payload.status === 'paid') {
        window.location.replace(`/pay/success/${token}`);
        return;
      }
      if (payload.payment_url) {
        window.location.href = payload.payment_url;
        return;
      }
      setError('Не удалось открыть оплату');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось открыть оплату');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F4E3] via-white to-[#F8F4E3] px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <Card className="w-full border-[#133C2A]/10 shadow-[0_18px_44px_rgba(19,60,42,0.08)]">
          <CardContent className="space-y-6 p-6 sm:p-7">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.18em] text-[#133C2A]/45">Оплата</p>
              <h1 className="text-3xl text-[#133C2A]">Страница оплаты</h1>
              <p className="text-sm leading-relaxed text-[#133C2A]/65">
                Здесь доступна только оплата. Личный кабинет откроется после подтверждения платежа и создания PIN-кода.
              </p>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-[#133C2A]/10 bg-[#F8F4E3]/75 p-4 text-sm text-[#133C2A]/70">
                Загружаем данные оплаты...
              </div>
            ) : null}

            {!loading && error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>{error}</div>
                </div>
              </div>
            ) : null}

            {!loading && session?.valid ? (
              <>
                <div className="space-y-3 rounded-3xl bg-[#133C2A] p-5 text-white">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/60">Услуга</p>
                    <p className="mt-1 text-lg">{session.service_name || 'Абонемент'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/60">Сумма</p>
                    <p className="mt-1 text-4xl">{Number(session.amount || 0).toLocaleString('ru-RU')} ₽</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/75">
                    <Phone className="h-4 w-4" />
                    <span>{session.phone_masked}</span>
                  </div>
                </div>

                <Button
                  onClick={handlePay}
                  className="h-11 w-full rounded-2xl bg-[#133C2A]"
                  disabled={submitting || session.payment_status === 'paid'}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {submitting ? 'Переходим к оплате...' : session.payment_status === 'paid' ? 'Оплата уже подтверждена' : 'Оплатить'}
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
