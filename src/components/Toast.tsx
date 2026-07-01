import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

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

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => {
      // Prevent flood: if a toast with exact same message and type is already visible, don't duplicate it.
      if (prev.some((t) => t.message === message && t.type === type)) {
        return prev;
      }
      // Keep only up to 3 active toasts to prevent cascading vertical overflow
      const combined = [...prev, { id, message, type }];
      if (combined.length > 3) {
        return combined.slice(combined.length - 3);
      }
      return combined;
    });
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000); // 4 seconds is standard visible threshold
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 left-6 sm:left-auto sm:w-80 md:w-96 z-[1000] flex flex-col gap-3.5 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className={`pointer-events-auto flex items-start gap-4 p-4.5 rounded-2xl shadow-[0_16px_36px_rgba(0,0,0,0.12)] border backdrop-blur-md ${
                toast.type === 'success' 
                  ? 'bg-emerald-500/95 border-emerald-400/30 text-white' 
                  : toast.type === 'error' 
                  ? 'bg-red-500/95 border-red-400/30 text-white' 
                  : 'bg-slate-900/95 dark:bg-slate-950/95 border-slate-800/80 text-slate-100'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-100" />}
                {toast.type === 'error' && <AlertCircle size={18} className="text-red-100" />}
                {toast.type === 'info' && <Info size={18} className="text-brand-accent" />}
              </div>
              <p className="flex-1 text-[11px] leading-relaxed font-bold tracking-normal">{toast.message}</p>
              <button 
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="shrink-0 ml-1 opacity-60 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-white/20 rounded p-0.5"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
