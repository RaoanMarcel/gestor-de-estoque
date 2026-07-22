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

const DURATION = 5000; // Tempo de duração exato em milissegundos

// --- COMPONENTE DO TOAST CUSTOMIZADO (VISUAL MODERNIZADO) ---
const CustomToastWithTimer = ({ t, message, type }: { t: Toast; message: string; type: 'success' | 'error' }) => {
  const [life, setLife] = useState(100);

  useEffect(() => {
    // 🚀 ALTERAÇÃO: Removido o 'toastInternal.paused'. 
    // O relógio agora é absoluto e não se importa com o mouse do usuário.
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const diff = Date.now() - startTime;
      const progress = 100 - (diff / DURATION) * 100;
      
      if (progress <= 0) {
        setLife(0);
        clearInterval(interval);
        toast.dismiss(t.id); // Força a morte do alerta ao zerar
      } else {
        setLife(progress);
      }
    }, 10);

    return () => clearInterval(interval);
  }, [t.id]); // 🚀 O SEGREDO: Depender apenas do ID do toast, e não do objeto inteiro!

  return (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } pointer-events-auto relative flex flex-col p-4 min-w-[320px] max-w-md bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)]`}
    >
      <div className="flex items-start gap-3.5">
        
        {/* Ícone customizado baseado no tipo */}
        <div className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-full ${type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
          {type === 'success' ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 0 1 1.04-.208Z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        {/* Mensagem */}
        <div className="flex-1 pt-1.5">
          <p className="text-[13px] font-semibold text-slate-700 leading-snug tracking-tight">
            {message}
          </p>
        </div>

        {/* Botão Fechar */}
        <button
          onClick={() => toast.dismiss(t.id)}
          className="shrink-0 p-1.5 -mr-1.5 -mt-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      {/* Barra de Progresso Arredondada (Nova Estilização) */}
      <div className="mt-3.5 w-full h-[5px] bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-75 ease-linear ${
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
  
  // Modal modular de confirmação (Visual modernizado)
  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } pointer-events-auto flex flex-col p-6 min-w-[340px] max-w-sm bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] space-y-4`}
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 text-amber-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm font-bold text-slate-800 tracking-tight">Confirmação de Ação</p>
                <p className="text-[13px] font-medium text-slate-500 mt-1.5 leading-relaxed">{message}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(false);
                }}
                className="px-4 py-2 text-xs font-bold tracking-wide text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(true);
                }}
                className="px-5 py-2 text-xs font-bold tracking-wide text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-md hover:shadow-lg transition-all uppercase"
              >
                Confirmar
              </button>
            </div>
          </div>
        ),
        {
          duration: Infinity, 
          position: 'top-center', 
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