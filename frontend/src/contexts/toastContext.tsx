// src/contexts/toastContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Toaster, toast, type Toast } from 'react-hot-toast';

// 1. Tipagem das funções que estarão disponíveis no sistema
interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  loading: (message: string) => string;
  dismiss: (toastId?: string) => void;
  confirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DURATION = 5000; // Tempo de duração padrão em milissegundos

// --- COMPONENTE DO TOAST CUSTOMIZADO COM TIMER ---
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
      } relative overflow-hidden flex flex-col justify-between px-4 py-3 min-w-[300px] max-w-md bg-white border border-[#1e293b] text-[#334155] rounded-lg shadow-md`}
      style={{
        fontSize: '13px',
        fontWeight: '500',
      }}
    >
      <div className="flex items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{type === 'success' ? '✅' : '❌'}</span>
          <span>{message}</span>
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="text-[#64748b] hover:text-[#1e293b] font-bold text-sm transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="relative w-full h-1 bg-[#f1f5f9] rounded-full overflow-hidden">
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

// 2. O Provider que vai gerenciar o Toaster global e o estilo
export const ToastProvider = ({ children }: ToastProviderProps) => {
  
  // Função modular de confirmação centralizada, retornando uma Promise
  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      toast.custom(
        (t) => (
          // Wrapper fixed que cobre a tela inteira para criar o fundo escurecido (Backdrop)
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } flex flex-col p-6 min-w-[320px] max-w-sm bg-white border border-slate-300 text-slate-800 rounded-xl shadow-2xl space-y-4`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Confirmação</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed whitespace-pre-wrap">{message}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    resolve(false);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    resolve(true);
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-shadow shadow hover:shadow-md"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        ),
        {
          duration: Infinity, // Não fecha sozinho até o usuário interagir
          position: 'top-center',
          id: 'confirm-modal' // Previne a abertura de múltiplos modais empilhados
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
        gutter={64} 
        reverseOrder={false}
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