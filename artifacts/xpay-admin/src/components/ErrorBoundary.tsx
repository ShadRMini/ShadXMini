import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught an error]:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6 text-center shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
              <AlertTriangle size={32} />
            </div>
            
            <h2 className="text-xl font-bold text-white mb-2">حدث خطأ أثناء عرض الصفحة</h2>
            <p className="text-sm text-slate-400 mb-6">
              نعتذر عن هذا الخطأ المؤقت. يمكنك تحديث الصفحة أو العودة إلى لوحة التحكم الرئيسية.
            </p>

            {this.state.error && (
              <div className="bg-slate-950/60 text-slate-400 text-xs font-mono p-3 rounded-lg text-left mb-6 overflow-x-auto max-h-32 border border-slate-800">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition"
              >
                <RefreshCw size={16} />
                <span>إعادة تحميل الصفحة</span>
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-semibold transition"
              >
                <Home size={16} />
                <span>الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
