import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      duration: 3000,
      style: {
        background: '#F0FDF4',
        border: '1px solid #86EFAC',
        color: '#166534',
      },
    });
  },

  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      duration: 4000,
      style: {
        background: '#FEF2F2',
        border: '1px solid #FECACA',
        color: '#991B1B',
      },
    });
  },

  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      duration: 3000,
      style: {
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
        color: '#1E40AF',
      },
    });
  },

  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      duration: 3500,
      style: {
        background: '#FFFBEB',
        border: '1px solid #FDE68A',
        color: '#92400E',
      },
    });
  },

  loading: (message: string) => {
    return sonnerToast.loading(message, {
      style: {
        background: '#F8F4E3',
        border: '1px solid #D4AF37',
        color: '#133C2A',
      },
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      style: {
        background: '#F8F4E3',
        border: '1px solid #D4AF37',
        color: '#133C2A',
      },
    });
  },
};
