import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, X, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);

    // Deduplicate: don't show same message if already visible (prevents spam on rapid button clicks)
    setToasts((prev) => {
      const alreadyShowing = prev.some((t) => t.message === message);
      if (alreadyShowing) return prev;
      return [...prev, { id, message, type }];
    });

    // Duration based on text length (min 2.5s, max 6s)
    const duration = Math.min(Math.max(message.length * 45, 2500), 6000);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'info': return <Info className="w-4 h-4 text-blue-400" />;
      default: return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'error': return 'border-red-500/40';
      case 'warning': return 'border-amber-500/40';
      case 'info': return 'border-blue-500/40';
      default: return 'border-emerald-500/40';
    }
  };

  const getIconBg = (type: ToastType) => {
    switch (type) {
      case 'error': return 'bg-red-500/15';
      case 'warning': return 'bg-amber-500/15';
      case 'info': return 'bg-blue-500/15';
      default: return 'bg-emerald-500/15';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* TOP-RIGHT corner toasts - max 4 visible */}
      <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none max-w-xs w-full">
        {toasts.slice(-4).map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 bg-neutral-900/95 backdrop-blur-md border ${getBorderColor(toast.type)} rounded-xl shadow-2xl pointer-events-auto transition-all duration-300 animate-in slide-in-from-right-6 fade-in`}
          >
            <div className={`w-7 h-7 rounded-full ${getIconBg(toast.type)} flex items-center justify-center shrink-0`}>
              {getIcon(toast.type)}
            </div>
            <p className="text-sm font-medium text-white flex-1 leading-snug">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-md hover:bg-white/10 text-neutral-500 hover:text-white transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
