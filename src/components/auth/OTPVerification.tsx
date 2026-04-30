import { useState } from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../ui/input-otp';
import logoImage from 'figma:asset/580482af71d4ad8de5d55c498eda06ff734efd66.png';

interface OTPVerificationProps {
  phone: string;
  onVerify: (otp: string) => Promise<void>;
  onBack: () => void;
}

export function OTPVerification({ phone, onVerify, onBack }: OTPVerificationProps) {
  const otpLengthRaw = Number(import.meta.env.VITE_OTP_LENGTH || 6);
  const otpLength = Number.isFinite(otpLengthRaw)
    ? Math.max(4, Math.min(6, Math.floor(otpLengthRaw)))
    : 6;
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (otp.length !== otpLength || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onVerify(otp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неверный код');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md border-none soft-shadow">
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 rounded-xl hover:bg-[#133C2A]/5 transition-smooth"
        >
          <ArrowLeft className="w-5 h-5 text-[#133C2A]/60" />
        </button>
        
        <DialogHeader className="space-y-3 text-center pt-8">
          <img 
            src={logoImage} 
            alt="Manera Logo" 
            className="w-16 h-16 mx-auto object-contain"
          />
          <DialogTitle className="text-[#133C2A]">Проверка кода</DialogTitle>
          <DialogDescription className="text-[#133C2A]/60">
            Мы отправили {otpLength}-значный код на номер<br />
            <span className="text-[#133C2A]">{phone}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-6">
          <InputOTP
            maxLength={otpLength}
            value={otp}
            onChange={setOtp}
            className="gap-2"
          >
            <InputOTPGroup className="gap-2">
              <InputOTPSlot index={0} className="w-12 h-14 rounded-xl border-2 border-[#133C2A]/20 focus:border-[#D4AF37]" />
              <InputOTPSlot index={1} className="w-12 h-14 rounded-xl border-2 border-[#133C2A]/20 focus:border-[#D4AF37]" />
              <InputOTPSlot index={2} className="w-12 h-14 rounded-xl border-2 border-[#133C2A]/20 focus:border-[#D4AF37]" />
              <InputOTPSlot index={3} className="w-12 h-14 rounded-xl border-2 border-[#133C2A]/20 focus:border-[#D4AF37]" />
              <InputOTPSlot index={4} className="w-12 h-14 rounded-xl border-2 border-[#133C2A]/20 focus:border-[#D4AF37]" />
              <InputOTPSlot index={5} className="w-12 h-14 rounded-xl border-2 border-[#133C2A]/20 focus:border-[#D4AF37]" />
            </InputOTPGroup>
          </InputOTP>

          <Button
            onClick={handleVerify}
            disabled={otp.length !== otpLength || isSubmitting}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 transition-smooth disabled:opacity-50"
          >
            {isSubmitting ? 'Проверка...' : 'Подтвердить'}
          </Button>

          {error && (
            <div className="text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          <button
            className="text-sm text-[#133C2A]/60 hover:text-[#D4AF37] transition-smooth"
            onClick={() => setOtp('')}
          >
            Отправить код повторно
          </button>

          <div className="text-xs text-center text-[#133C2A]/40 border-t border-[#133C2A]/10 pt-4 w-full space-y-1">
            <p>Доступные роли:</p>
            <p>родитель (после добавления владельцем)</p>
            <p>владелец: только номер +79189423508</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
