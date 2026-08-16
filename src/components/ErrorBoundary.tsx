import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Shown above the retry button, e.g. the section name that crashed. */
  sectionName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Contains a render crash to the section it happened in instead of white-screening
 * the whole app. See audit finding F-03: a single document/task/news item missing
 * an expected field used to take down the entire owner/admin/parent dashboard with
 * no way back except a manual database fix.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught a render error:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#133C2A]/15 bg-white p-8 text-center">
        <p className="text-[#133C2A]">
          {this.props.sectionName ? `Раздел «${this.props.sectionName}» не удалось открыть` : 'Не удалось открыть раздел'}
        </p>
        <p className="text-sm text-[#133C2A]/60">
          Попробуйте обновить страницу. Если ошибка повторяется, сообщите разработчику.
        </p>
        <button
          type="button"
          onClick={this.handleRetry}
          className="rounded-2xl border border-[#133C2A]/15 px-4 py-2 text-sm text-[#133C2A] hover:bg-[#EEF5F0]"
        >
          Попробовать снова
        </button>
      </div>
    );
  }
}
