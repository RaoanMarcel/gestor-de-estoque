import React, { createContext, useContext } from 'react';
import { Toaster, toast } from 'react-hot-toast';

// 1. Tipagem das funções que estarão disponíveis no sistema
interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  loading: (message: string) => string; // Retorna o ID para poder fechar depois
  dismiss: (toastId?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// 2. O Provider que vai gerenciar o Toaster global e o estilo
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  const customToast: ToastContextType = {
    success: (message) => toast.success(message),
    error: (message) => toast.error(message),
    loading: (message) => toast.loading(message),
    dismiss: (toastId) => toast.dismiss(toastId),
  };

  return (
    <ToastContext.Provider value={customToast}>
      {children}
      {/* Centralizamos o Toaster físico e o estilo padrão do seu sistema aqui! */}
      <Toaster 
        position="bottom-right" 
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#334155',
            fontSize: '13px',
            fontWeight: '500',
            borderRadius: '8px',
            border: '1px solid #1e293b'
          }
        }}
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