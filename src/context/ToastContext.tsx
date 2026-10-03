import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message?: string, duration = 3500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast: ToastItem = { id, type, title, message, duration };

    setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // Keep at most 5 toasts

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }
  }, [dismiss]);

  const success = useCallback((title: string, message?: string, duration?: number) => {
    showToast('success', title, message, duration);
  }, [showToast]);

  const error = useCallback((title: string, message?: string, duration?: number) => {
    showToast('error', title, message, duration);
  }, [showToast]);

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    showToast('warning', title, message, duration);
  }, [showToast]);

  const info = useCallback((title: string, message?: string, duration?: number) => {
    showToast('info', title, message, duration);
  }, [showToast]);

  const contextValue = useMemo(() => ({
    showToast,
    success,
    error,
    warning,
    info,
    dismiss
  }), [showToast, success, error, warning, info, dismiss]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Floating Toast Notification Container */}
      <aside 
        aria-label="Alertas y notificaciones"
        className="fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 sm:top-6 z-[99999] flex flex-col gap-2.5 max-w-sm w-[calc(100%-1.5rem)] sm:w-96 pointer-events-none"
      >
        {toasts.map((toast) => {
          const typeConfig = {
            success: {
              icon: CheckCircle2,
              iconColor: 'text-emerald-600',
              bgColor: 'bg-emerald-50',
              borderColor: 'border-emerald-200',
              badgeColor: 'bg-emerald-100 text-emerald-800',
              badgeLabel: 'Completado'
            },
            error: {
              icon: XCircle,
              iconColor: 'text-rose-600',
              bgColor: 'bg-rose-50',
              borderColor: 'border-rose-200',
              badgeColor: 'bg-rose-100 text-rose-800',
              badgeLabel: 'Atención'
            },
            warning: {
              icon: AlertCircle,
              iconColor: 'text-amber-600',
              bgColor: 'bg-amber-50',
              borderColor: 'border-amber-200',
              badgeColor: 'bg-amber-100 text-amber-800',
              badgeLabel: 'Aviso'
            },
            info: {
              icon: Info,
              iconColor: 'text-sky-600',
              bgColor: 'bg-sky-50',
              borderColor: 'border-sky-200',
              badgeColor: 'bg-sky-100 text-sky-800',
              badgeLabel: 'Información'
            }
          }[toast.type];

          const IconComponent = typeConfig.icon;

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto p-3.5 sm:p-4 rounded-2xl bg-white/98 backdrop-blur-md border ${typeConfig.borderColor} shadow-xl flex items-start gap-3 transition-all duration-300 transform translate-y-0 opacity-100 animate-toast-in hover:shadow-2xl`}
            >
              <div className={`p-2 rounded-xl ${typeConfig.bgColor} shrink-0 mt-0.5 shadow-2xs`}>
                <IconComponent className={`w-5 h-5 ${typeConfig.iconColor}`} />
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${typeConfig.badgeColor}`}>
                    {typeConfig.badgeLabel}
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-[#1B4332] leading-tight">
                  {toast.title}
                </h4>
                {toast.message && (
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    {toast.message}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="p-1 -mr-1 -mt-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider');
  }
  return context;
};
