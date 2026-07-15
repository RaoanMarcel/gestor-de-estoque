import React, { createContext, useContext, useState, useEffect } from 'react';
import { Toaster, toast, type Toast } from 'react-hot-toast';

// 1. Tipagem das funções que estarão disponíveis no sistema
interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  loading: (message: string) => string;
  dismiss: (toastId?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DURATION = 5000; // Tempo de duração padrão em milissegundos

// --- COMPONENTE DO TOAST CUSTOMIZADO COM TIMER ---
const CustomToastWithTimer = ({ t, message, type }: { t: Toast; message: string; type: 'success' | 'error' }) => {
  const [life, setLife] = useState(100);

  useEffect(() => {
    // Fazemos um cast rápido para 'any' apenas para ler as propriedades de pausa com segurança
    const toastInternal = t as any;
    if (toastInternal.paused) return;

    const startTime = Date.now();
    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      // Calcula o tempo decorrido descontando eventuais pausas usando o cast
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
  }, [t]); // Monitoramos a mudança do objeto t completo

  // Mantendo exatamente a mesma paleta de cores do seu Toaster original:
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
          {/* Ícone padrão baseado no tipo de Toast */}
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

      {/* Barra de progresso respeitando as cores neutras do seu tema */}
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
  
  const customToast: ToastContextType = {
    // Agora disparando os toasts customizados com o componente React do timer
    success: (message) => 
      toast.custom((t) => <CustomToastWithTimer t={t} message={message} type="success" />, { duration: DURATION }),
    error: (message) => 
      toast.custom((t) => <CustomToastWithTimer t={t} message={message} type="error" />, { duration: DURATION }),
    loading: (message) => toast.loading(message),
    dismiss: (toastId) => toast.dismiss(toastId),
  };

  return (
    <ToastContext.Provider value={customToast}>
      {children}
      {/* Mantemos o Toaster configurado na sua posição preferida de exibição */}
      <Toaster 
        position="top-center"
        gutter={64} 
        reverseOrder={false}
      />
    </ToastContext.Provider>
  );
};

// 3. Hook customizado para facilitar o consumo nos componentes
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
};