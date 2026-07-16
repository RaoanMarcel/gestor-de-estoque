// src/contexts/toastContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Toaster, toast, type Toast } from 'react-hot-toast';

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  loading: (message: string) => string;
  dismiss: (toastId?: string) => void;
  confirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DURATION = 5000;

const CustomToastWithTimer = ({ t, message, type }: { t: Toast; message: string; type: 'success' | 'error' }) => {
  const [life, setLife] = useState(100);

  useEffect(() => {
    const toastInternal = t as any;
    if (toastInternal.paused) return;

    const startTime = Date.now();
    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      const pauseDuration = toastInternal.pauseDuration ?? 0;
      const diff = Date.now() - startTime - pauseDuration;
      const progress = 100 - (diff / DURATION) * 100;
      
      if (progress <= 0) {
        setLife(0);
        clearInterval(interval);
      } else {
        setLife(progress);
      }
    }, 10);

    return () => clearInterval(interval);
  }, [t]);

  return (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } relative overflow-hidden flex flex-col justify-between px-4 py-3 min-w-[300px] max-w-sm bg-white ring-1 ring-black/5 shadow-[0_3px_10px_rgba(0,0,0,0.1),0_3px_3px_rgba(0,0,0,0.05)] rounded-lg pointer-events-auto`}
    >
      <div className="flex items-center justify-between gap-3 pb-2">
        <div className="flex items-start gap-2">
          <span className="text-xl leading-none mt-[2px]">{type === 'success' ? '✅' : '❌'}</span>
          {/* Padronizado para 16px, peso normal e cor #363636 */}
          <span className="text-[16px] text-[#363636] font-normal leading-normal">{message}</span>
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors self-start"
        >
          ✕
        </button>
      </div>

      <div className="relative w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
        <div
          className={`h-full rounded-full transition-all duration-75 ${
            type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
          style={{ width: `${life}%` }}
        />
      </div>
    </div>
  );
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  
  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-sm w-full bg-white shadow-[0_3px_10px_rgba(0,0,0,0.1),0_3px_3px_rgba(0,0,0,0.05)] ring-1 ring-black/5 rounded-lg pointer-events-auto flex flex-col p-4`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl leading-none mt-0.5">⚠️</span>
              {/* 🔄 ALTERAÇÃO AQUI: Tamanho 16px, fonte normal, cor exata do nativo */}
              <span className="text-[16px] text-[#363636] font-normal leading-relaxed whitespace-pre-wrap flex-1">
                {message}
              </span>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(false);
                }}
                className="px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(true);
                }}
                className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm rounded-md transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        ),
        {
          duration: Infinity, 
          position: 'top-center',
          id: 'confirm-modal'
        }
      );
    });
  };

  const customToast: ToastContextType = {
    success: (message) => 
      toast.custom((t) => <CustomToastWithTimer t={t} message={message} type="success" />, { duration: DURATION }),
    error: (message) => 
      toast.custom((t) => <CustomToastWithTimer t={t} message={message} type="error" />, { duration: DURATION }),
    loading: (message) => toast.loading(message),
    dismiss: (toastId) => toast.dismiss(toastId),
    confirm: showConfirm,
  };

  return (
    <ToastContext.Provider value={customToast}>
      {children}
      <Toaster 
        position="top-center"
        gutter={12} 
        reverseOrder={false}
        toastOptions={{
          className: 'z-[9999]',
          style: { zIndex: 9999 }
        }}
      />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
};