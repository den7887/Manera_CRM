import {
  loadPushVapidPublicKey,
  subscribeToPushNotifications as subscribeOnBackend,
  unsubscribeFromPushNotifications as unsubscribeOnBackend,
} from './backendApi';

export type PushSupportState = 'unsupported' | 'denied' | 'not-subscribed' | 'subscribed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationsSupported()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export async function getPushSubscriptionState(): Promise<PushSupportState> {
  if (!isPushNotificationsSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return 'not-subscribed';
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? 'subscribed' : 'not-subscribed';
  } catch {
    return 'not-subscribed';
  }
}

/** Requests permission (if needed), subscribes the browser, and registers the
 * subscription with the backend. Throws with a Russian message on failure so
 * callers can show it directly. */
export async function enablePushNotifications(): Promise<void> {
  if (!isPushNotificationsSupported()) {
    throw new Error('Этот браузер не поддерживает уведомления');
  }

  const { publicKey, configured } = await loadPushVapidPublicKey();
  if (!configured || !publicKey) {
    throw new Error('Push-уведомления пока не настроены на сервере');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Уведомления заблокированы в настройках браузера');
  }

  const registration = (await navigator.serviceWorker.getRegistration('/sw.js')) || (await registerServiceWorker());
  if (!registration) {
    throw new Error('Не удалось зарегистрировать службу уведомлений');
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Браузер вернул неполные данные подписки');
  }

  await subscribeOnBackend({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    userAgent: navigator.userAgent,
  });
}

export async function disablePushNotifications(): Promise<void> {
  if (!isPushNotificationsSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await unsubscribeOnBackend(endpoint);
}
