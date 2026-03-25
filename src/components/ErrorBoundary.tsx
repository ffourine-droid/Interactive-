import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (Component as any) {
  public state: State = {
    hasError: false,
    error: null
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-brand-surface border border-brand-border rounded-[2.5rem] p-10 shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <AlertCircle className="text-red-500" size={40} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-4">Something went wrong</h1>
            <p className="text-brand-muted mb-10 text-sm leading-relaxed">
              We encountered an unexpected error. Don't worry, your data is safe.
              {this.state.error && (
                <span className="block mt-4 p-3 bg-brand-bg rounded-xl font-mono text-[10px] opacity-60 overflow-hidden text-ellipsis">
                  {this.state.error.message}
                </span>
              )}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-brand-accent text-white py-4 rounded-2xl font-bold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-accent/20"
              >
                <RefreshCw size={18} />
                Reload Application
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-brand-surface border border-brand-border text-brand-text py-4 rounded-2xl font-bold hover:bg-brand-bg transition-all flex items-center justify-center gap-2"
              >
                <Home size={18} />
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
