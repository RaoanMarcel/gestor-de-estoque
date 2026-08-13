import React, { createContext, useContext } from 'react';
import { Toaster, toast } from 'react-hot-toast';

// 🚀 ALTERAÇÃO: Tipagem preservada do contexto original
interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  loading: (message: string) => string;
  dismiss: (toastId?: string) => void;
  confirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// 🚀 ALTERAÇÃO: Estilo minimalista e moderno em formato de pílula (substituindo a barra de progresso)
const minimalToastStyle = {
  borderRadius: '9999px',
  background: '#ffffff',
  color: '#1e293b', 
  border: '1px solid #e2e8f0', 
  fontSize: '13px',
  fontWeight: '600',
  padding: '12px 20px',
  boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  
  // 🚀 ALTERAÇÃO: Modal de confirmação redesenhado para um padrão mais corporativo com a paleta Slate
  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } flex flex-col p-6 min-w-[320px] max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-4`}
          >
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-600 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1 mt-0.5">
                <p className="text-sm font-bold text-slate-900">Atenção Necessária</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{message}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(true);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-sm transition-all"
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

  // 🚀 ALTERAÇÃO: Utilizando a funcionalidade nativa do react-hot-toast para sucesso e erro com o nosso design minimalista
  const customToast: ToastContextType = {
    success: (message) => 
      toast.success(message, {
        style: minimalToastStyle,
        iconTheme: { primary: '#10b981', secondary: '#fff' },
      }),
    error: (message) => 
      toast.error(message, {
        style: minimalToastStyle,
        iconTheme: { primary: '#f43f5e', secondary: '#fff' },
      }),
    loading: (message) => 
      toast.loading(message, {
        style: minimalToastStyle,
      }),
    dismiss: (toastId) => toast.dismiss(toastId),
    confirm: showConfirm,
  };

  return (
    <ToastContext.Provider value={customToast}>
      {children}
      <Toaster 
        position="top-center"
        gutter={12} 
        toastOptions={{
          className: 'antialiased',
          duration: 3500,
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