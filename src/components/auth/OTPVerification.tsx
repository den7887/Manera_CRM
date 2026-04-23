import { useState } from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../ui/input-otp';
import { UserRole } from '../../types';
import logoImage from 'figma:asset/580482af71d4ad8de5d55c498eda06ff734efd66.png';

interface OTPVerificationProps {
  phone: string;
  onVerify: (role: UserRole) => void;
  onBack: () => void;
}

export function OTPVerification({ phone, onVerify, onBack }: OTPVerificationProps) {
  const [otp, setOtp] = useState('');

  const handleVerify = () => {
    if (otp.length === 6) {
      // Simulate role selection based on OTP for demo purposes
      if (otp === '111111') {
        onVerify('parent');
      } else if (otp === '222222') {
        onVerify('teacher');
      } else if (otp === '333333') {
        onVerify('admin');
      } else if (otp === '444444') {
        onVerify('owner');
      } else {
        // Default to parent
        onVerify('parent');
      }
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
            Мы отправили 6-значный код на номер<br />
            <span className="text-[#133C2A]">{phone}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-6">
          <InputOTP
            maxLength={6}
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
            disabled={otp.length !== 6}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 transition-smooth disabled:opacity-50"
          >
            Подтвердить
          </Button>

          <button
            className="text-sm text-[#133C2A]/60 hover:text-[#D4AF37] transition-smooth"
            onClick={() => setOtp('')}
          >
            Отправить код повторно
          </button>

          <div className="text-xs text-center text-[#133C2A]/40 border-t border-[#133C2A]/10 pt-4 w-full space-y-1">
            <p>Для демо:</p>
            <p>111111 (родитель) • 222222 (учитель)</p>
            <p>333333 (админ) • 444444 (владелец)</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}