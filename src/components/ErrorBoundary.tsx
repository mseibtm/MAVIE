import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.removeItem('app_portal_user_session');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-bold text-white mb-2">Recuperação do Sistema</h1>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Ocorreu uma instabilidade visual inesperada. Seus dados financeiros e cadastrais estão salvos com segurança.
            </p>

            {this.state.error && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left mb-6 font-mono text-xs text-red-300 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/30"
              >
                <RefreshCw className="w-4 h-4" /> Recarregar Página
              </button>

              <button
                onClick={this.handleResetSession}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4 text-amber-400" /> Reiniciar Sessão de Acesso
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
