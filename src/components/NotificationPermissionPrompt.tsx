import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { enablePushNotifications, isPushNotificationsSupported } from '../lib/pushNotifications';

const DISMISS_KEY = 'manera_push_prompt_dismissed';

/** Asks for browser notification permission right after login, once per
 * session. Shows our own banner first rather than calling
 * Notification.requestPermission() automatically on mount — the real OS
 * permission dialog only fires from the "Разрешить" click, which is both a
 * user gesture (required by some browsers) and gives context before the
 * native prompt appears. Never shown again once the user has explicitly
 * granted or denied permission, or dismissed the banner this session. */
export function NotificationPermissionPrompt() {
  const [visible, setVisible] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!isPushNotificationsSupported()) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    if (Notification.permission !== 'default') return;
    setVisible(true);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const handleAllow = async () => {
    setIsBusy(true);
    try {
      await enablePushNotifications();
      toast.success('Уведомления в браузере включены');
      setVisible(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось включить уведомления');
      dismiss();
    } finally {
      setIsBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-r from-[#133C2A]/5 to-[#D4AF37]/10 p-4 animate-scale-in">
      <Bell className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#D4AF37]" />
      <div className="min-w-0 flex-1">
        <p className="text-[#133C2A]">Включить уведомления в браузере?</p>
        <p className="mt-0.5 text-sm text-[#133C2A]/60">
          Узнавайте о новых заявках, оплатах и сообщениях сразу — даже когда вкладка закрыта.
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            onClick={handleAllow}
            disabled={isBusy}
            className="rounded-xl bg-[#133C2A] text-white hover:bg-[#0e2d1f]"
          >
            Разрешить
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss} disabled={isBusy} className="rounded-xl text-[#133C2A]/60">
            Не сейчас
          </Button>
        </div>
      </div>
      <button type="button" onClick={dismiss} aria-label="Закрыть" className="text-[#133C2A]/40 hover:text-[#133C2A]/70">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
