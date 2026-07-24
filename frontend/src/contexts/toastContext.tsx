import React, { createContext, useContext, useState, useEffect } from 'react';
import { Toaster, toast, type Toast } from 'react-hot-toast';

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  loading: (message: string) => string;
  dismiss: (toastId?: string) => void;
  confirm: (message: string) => Promise<boolean>;
  promptPassword: (message: string) => Promise<string | null>; // 🚀 NOVO: Solicitação de senha segura
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);
const DURATION = 5000; 

const CustomToastWithTimer = ({ t, message, type }: { t: Toast; message: string; type: 'success' | 'error' }) => {
  const [life, setLife] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const diff = Date.now() - startTime;
      const progress = 100 - (diff / DURATION) * 100;
      
      if (progress <= 0) {
        setLife(0);
        clearInterval(interval);
        toast.dismiss(t.id);
      } else {
        setLife(progress);
      }
    }, 10);

    return () => clearInterval(interval);
  }, [t.id]); 

  return (
    <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} pointer-events-auto relative flex flex-col p-4 min-w-[320px] max-w-md bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)]`}>
      <div className="flex items-start gap-3.5">
        <div className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-full ${type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
          {type === 'success' ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 0 1 1.04-.208Z" clipRule="evenodd" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
          )}
        </div>
        <div className="flex-1 pt-1.5">
          <p className="text-[13px] font-semibold text-slate-700 leading-snug tracking-tight">{message}</p>
        </div>
        <button onClick={() => toast.dismiss(t.id)} className="shrink-0 p-1.5 -mr-1.5 -mt-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
        </button>
      </div>
      <div className="mt-3.5 w-full h-[5px] bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-75 ease-linear ${type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${life}%` }} />
      </div>
    </div>
  );
};

const PasswordPromptToast = ({ t, message, onResolve }: { t: Toast, message: string, onResolve: (val: string | null) => void }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    toast.dismiss(t.id);
    onResolve(password);
  };

  return (
    <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} pointer-events-auto flex flex-col p-6 min-w-[340px] max-w-sm bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] space-y-4`}>
      <div className="flex items-start gap-4">
        <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" /></svg>
        </div>
        <div className="flex-1 pt-1">
          <p className="text-sm font-bold text-slate-800 tracking-tight">Autenticação Necessária</p>
          <p className="text-[13px] font-medium text-slate-500 mt-1.5 leading-relaxed">{message}</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="mt-2 space-y-4">
        <input 
          type="password" 
          autoFocus
          placeholder="Digite sua senha atual..." 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => { toast.dismiss(t.id); onResolve(null); }} className="px-4 py-2 text-xs font-bold tracking-wide text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors uppercase">
            Cancelar
          </button>
          <button type="submit" disabled={!password.trim()} className="px-5 py-2 text-xs font-bold tracking-wide text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg shadow-sm transition-all uppercase">
            Validar
          </button>
        </div>
      </form>
    </div>
  );
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  
  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} pointer-events-auto flex flex-col p-6 min-w-[340px] max-w-sm bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] space-y-4`}>
            <div className="flex items-start gap-4">
              <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 text-amber-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" /></svg>
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm font-bold text-slate-800 tracking-tight">Confirmação de Ação</p>
                <p className="text-[13px] font-medium text-slate-500 mt-1.5 leading-relaxed">{message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { toast.dismiss(t.id); resolve(false); }} className="px-4 py-2 text-xs font-bold tracking-wide text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors uppercase">
                Cancelar
              </button>
              <button onClick={() => { toast.dismiss(t.id); resolve(true); }} className="px-5 py-2 text-xs font-bold tracking-wide text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-md hover:shadow-lg transition-all uppercase">
                Confirmar
              </button>
            </div>
          </div>
        ), { duration: Infinity, position: 'top-center' }
      );
    });
  };

  const showPromptPassword = (message: string): Promise<string | null> => {
    return new Promise((resolve) => {
      toast.custom((t) => <PasswordPromptToast t={t} message={message} onResolve={resolve} />, { duration: Infinity, position: 'top-center' });
    });
  };

  const customToast: ToastContextType = {
    success: (message) => toast.custom((t) => <CustomToastWithTimer t={t} message={message} type="success" />, { duration: DURATION }),
    error: (message) => toast.custom((t) => <CustomToastWithTimer t={t} message={message} type="error" />, { duration: DURATION }),
    loading: (message) => toast.loading(message),
    dismiss: (toastId) => toast.dismiss(toastId),
    confirm: showConfirm,
    promptPassword: showPromptPassword,
  };

  return (
    <ToastContext.Provider value={customToast}>
      {children}
      <Toaster position="top-center" gutter={64} reverseOrder={false} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast deve ser usado dentro de um ToastProvider');
  return context;
};