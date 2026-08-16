import type { PortalStatus } from './backendApi';

export function portalStatusLabel(status?: PortalStatus | string | null): string {
  switch (status) {
    case 'activated':
      return 'Кабинет активирован';
    case 'activation_link_created':
      return 'Ссылка активации создана';
    case 'awaiting_payment':
      return 'Ожидает оплаты';
    case 'paid_cash_waiting_activation':
    case 'paid_online_waiting_activation':
      return 'Оплачен, ждет активации';
    case 'blocked':
      return 'Доступ приостановлен';
    case 'not_created':
      return 'Кабинет не создан';
    default:
      return 'Статус не определен';
  }
}

export function accountStatusLabel(status?: string | null): string {
  switch (status) {
    case 'active':
      return 'Активен';
    case 'payment_pending':
      return 'Ожидает оплату';
    case 'invited':
      return 'Ожидает приглашение';
    case 'suspended':
      return 'Приостановлен';
    default:
      return 'Статус не определен';
  }
}

export function isPortalPendingActivation(status?: PortalStatus | string | null): boolean {
  return (
    status === 'activation_link_created' ||
    status === 'paid_online_waiting_activation' ||
    status === 'paid_cash_waiting_activation'
  );
}

