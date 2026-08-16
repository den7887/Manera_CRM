import { useEffect, useState } from 'react';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { loadPublicPaymentSuccess } from '../../lib/backendApi';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface PublicPaymentSuccessPageProps {
  token: string;
}

export function PublicPaymentSuccessPage({ token }: PublicPaymentSuccessPageProps) {
  const [status, setStatus] = useState<'loading' | 'pending' | 'failed' | 'invalid'>('loading');
  const [message, setMessage] = useState('Проверяем оплату...');

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    const check = async () => {
      try {
        const payload = await loadPublicPaymentSuccess(token);
        if (!active) {
          return;
        }
        if (payload.status === 'paid' && payload.activation_url) {
          window.location.replace(payload.activation_url);
          return;
        }
        if (payload.status === 'pending') {
          setStatus('pending');
          setMessage(payload.message || 'Платёж обрабатывается');
          timer = window.setTimeout(() => void check(), 3000);
          return;
        }
        if (payload.status === 'failed') {
          setStatus('failed');
          setMessage(payload.message || 'Оплата не прошла');
          return;
        }
        setStatus('invalid');
        setMessage(payload.message || 'Ссылка недействительна');
      } catch (err) {
        if (!active) {
          return;
        }
        setStatus('failed');
        setMessage(err instanceof Error ? err.message : 'Не удалось проверить оплату');
      }
    };

    void check();

    return () => {
      active = false;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F4E3] via-white to-[#F8F4E3] px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <Card className="w-full border-[#133C2A]/10 shadow-[0_18px_44px_rgba(19,60,42,0.08)]">
          <CardContent className="space-y-6 p-6 text-center sm:p-7">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#133C2A]/8 text-[#133C2A]">
              {status === 'failed' || status === 'invalid' ? <AlertCircle className="h-6 w-6" /> : <LoaderCircle className="h-6 w-6 animate-spin" />}
            </div>
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.18em] text-[#133C2A]/45">Проверка оплаты</p>
              <h1 className="text-3xl text-[#133C2A]">
                {status === 'pending' ? 'Платёж обрабатывается' : status === 'failed' ? 'Оплата не прошла' : status === 'invalid' ? 'Ссылка недействительна' : 'Проверяем статус'}
              </h1>
              <p className="text-sm leading-relaxed text-[#133C2A]/65">{message}</p>
            </div>

            {(status === 'failed' || status === 'invalid') ? (
              <Button variant="outline" className="w-full rounded-2xl border-[#133C2A]/15" onClick={() => window.location.replace(`/pay/session/${token}`)}>
                Вернуться к оплате
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
