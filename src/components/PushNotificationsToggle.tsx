import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Switch } from './ui/switch';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushSubscriptionState,
  isPushNotificationsSupported,
  PushSupportState,
} from '../lib/pushNotifications';

/** Toggle for browser push notifications, shown in the profile screens.
 * Renders nothing on browsers that don't support the Push API at all
 * (still fairly common on iOS Safari outside of an installed PWA). */
export function PushNotificationsToggle() {
  const [state, setState] = useState<PushSupportState>('not-subscribed');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void getPushSubscriptionState().then((value) => {
      if (active) setState(value);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!isPushNotificationsSupported()) {
    return null;
  }

  const handleToggle = async (nextEnabled: boolean) => {
    setIsBusy(true);
    try {
      if (nextEnabled) {
        await enablePushNotifications();
        setState('subscribed');
        toast.success('Уведомления в браузере включены');
      } else {
        await disablePushNotifications();
        setState('not-subscribed');
        toast.info('Уведомления в браузере отключены');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось изменить настройку уведомлений');
      const refreshed = await getPushSubscriptionState();
      setState(refreshed);
    } finally {
      setIsBusy(false);
    }
  };

  const isSubscribed = state === 'subscribed';
  const isDenied = state === 'denied';

  return (
    <div className="rounded-xl border border-[#133C2A]/10 p-3 bg-white flex items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        <Bell className="w-4 h-4 mt-0.5 text-[#133C2A]/60 flex-shrink-0" />
        <div>
          <p className="text-[#133C2A]">Уведомления в браузере</p>
          <p className="text-xs text-[#133C2A]/58 mt-0.5">
            {isDenied
              ? 'Заблокированы в настройках браузера — разрешите их для этого сайта, чтобы включить.'
              : 'Новые заявки, оплаты и сообщения — даже когда вкладка закрыта.'}
          </p>
        </div>
      </div>
      <Switch checked={isSubscribed} onCheckedChange={handleToggle} disabled={isBusy || isDenied} />
    </div>
  );
}
