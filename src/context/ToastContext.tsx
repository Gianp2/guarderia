import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
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

interface SwipeableToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

/**
 * Swipeable toast alert component optimized for touch screens (mobiles)
 * Supports swipe-to-dismiss to left, right or upwards with tactile feedback
 */
const SwipeableToast: React.FC<SwipeableToastProps> = ({ toast, onDismiss }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const currentOffsetXRef = useRef<number>(0);
  const currentOffsetYRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss timer management
  const startTimer = useCallback(() => {
    if (toast.duration && toast.duration > 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onDismiss(toast.id), 220);
      }, toast.duration);
    }
  }, [toast.duration, toast.id, onDismiss]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startTimer]);

  // Touch event handlers for mobile gesture swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    setIsSwiping(true);
    pauseTimer();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startXRef.current;
    const diffY = currentY - startYRef.current;

    // Check if user is swiping horizontally or upwards
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    if (absX > absY || diffY < 0) {
      currentOffsetXRef.current = diffX;
      setOffsetX(diffX);

      // Allow upward drag as well
      if (diffY < 0) {
        currentOffsetYRef.current = diffY;
        setOffsetY(diffY);
      } else {
        currentOffsetYRef.current = 0;
        setOffsetY(0);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    startXRef.current = null;
    startYRef.current = null;

    const threshold = 60; // Pixels required to trigger swipe dismiss on mobile
    const currentX = currentOffsetXRef.current;
    const currentY = currentOffsetYRef.current;

    // Horizontal swipe past threshold or upward swipe past threshold
    if (Math.abs(currentX) > threshold || currentY < -50) {
      setIsExiting(true);
      if (Math.abs(currentX) >= Math.abs(currentY)) {
        setOffsetX(currentX > 0 ? 380 : -380);
      } else {
        setOffsetY(-150);
      }
      setTimeout(() => {
        onDismiss(toast.id);
      }, 200);
    } else {
      // Rebound / Snap back to position
      currentOffsetXRef.current = 0;
      currentOffsetYRef.current = 0;
      setOffsetX(0);
      setOffsetY(0);
      startTimer();
    }
  };

  const handleTouchCancel = () => {
    setIsSwiping(false);
    startXRef.current = null;
    startYRef.current = null;
    currentOffsetXRef.current = 0;
    currentOffsetYRef.current = 0;
    setOffsetX(0);
    setOffsetY(0);
    startTimer();
  };

  // Mouse drag support for desktop/pointer devices
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only left click
    if (e.button !== 0) return;
    startXRef.current = e.clientX;
    setIsSwiping(true);
    pauseTimer();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (startXRef.current === null) return;
      const diffX = moveEvent.clientX - startXRef.current;
      currentOffsetXRef.current = diffX;
      setOffsetX(diffX);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setIsSwiping(false);
      startXRef.current = null;

      const threshold = 70;
      const currentX = currentOffsetXRef.current;

      if (Math.abs(currentX) > threshold) {
        setIsExiting(true);
        setOffsetX(currentX > 0 ? 380 : -380);
        setTimeout(() => {
          onDismiss(toast.id);
        }, 200);
      } else {
        currentOffsetXRef.current = 0;
        setOffsetX(0);
        startTimer();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

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
  const displacement = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
  const opacity = isExiting ? 0 : Math.max(0.2, 1 - displacement / 240);

  return (
    <div
      role="alert"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={handleMouseDown}
      style={{
        transform: `translate3d(${offsetX}px, ${offsetY}px, 0)`,
        opacity,
        transition: isSwiping 
          ? 'none' 
          : isExiting 
            ? 'transform 0.2s ease-in, opacity 0.2s ease-in'
            : 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
        touchAction: 'pan-y'
      }}
      className={`relative pointer-events-auto p-3.5 sm:p-4 rounded-2xl bg-white/98 backdrop-blur-md border ${typeConfig.borderColor} shadow-xl flex items-start gap-3 select-none cursor-grab active:cursor-grabbing hover:shadow-2xl overflow-hidden transition-shadow`}
    >
      {/* Mobile Swipe-to-Dismiss Grab Handle */}
      <div 
        className="sm:hidden absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-gray-300/80 rounded-full pointer-events-none" 
        aria-hidden="true" 
      />

      <div className={`p-2 rounded-xl ${typeConfig.bgColor} shrink-0 mt-0.5 shadow-2xs`}>
        <IconComponent className={`w-5 h-5 ${typeConfig.iconColor}`} />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center justify-between gap-1.5 mb-0.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${typeConfig.badgeColor}`}>
            {typeConfig.badgeLabel}
          </span>
          <span className="sm:hidden text-[9px] text-gray-400 font-medium tracking-tight">
            Desliza para quitar
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
        onClick={(e) => {
          e.stopPropagation();
          setIsExiting(true);
          setTimeout(() => onDismiss(toast.id), 180);
        }}
        className="p-1 -mr-1 -mt-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message?: string, duration = 3800) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast: ToastItem = { id, type, title, message, duration };

    setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // Keep at most 5 toasts
  }, []);

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

      {/* Floating Alerts Container */}
      <aside 
        aria-label="Alertas y avisos"
        className="fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 sm:top-6 z-[99999] flex flex-col gap-2.5 max-w-sm w-[calc(100%-1.5rem)] sm:w-96 pointer-events-none"
      >
        {toasts.map((toast) => (
          <SwipeableToast
            key={toast.id}
            toast={toast}
            onDismiss={dismiss}
          />
        ))}
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
