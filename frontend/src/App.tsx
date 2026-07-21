import { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ToastProvider } from './contexts/toastContext'; 
import Home from './pages/home/Home.js';
import PalletInterface from './pages/Interface/PalletInterface.js';
import Login from './pages/login/Login.js';
import ProtectedRoute from './pages/home/components/ProtectedRoute.js';

// Função determinística para gerar cores consistentes para o avatar do usuário
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-rose-500', 'bg-blue-600', 'bg-emerald-600', 
    'bg-amber-500', 'bg-purple-600', 'bg-cyan-600', 
    'bg-indigo-500', 'bg-pink-500', 'bg-teal-600'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

function LayoutComum({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const esconderHeader = location.pathname === '/login';
  
  const usuarioLogado = localStorage.getItem('wms_user') || 'Operador';
  const inicialUsuario = usuarioLogado.charAt(0).toUpperCase();
  const corAvatar = getAvatarColor(usuarioLogado);
  
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o menu dropdown ao clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-slate-800 antialiased">
      {!esconderHeader && (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="container mx-auto flex justify-between items-center px-4 md:px-6 h-14">
            
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l3 1.75M9 20.25v-9" />
                </svg>
              </div>
              <div className="flex flex-col leading-tight">
                <h1 className="text-sm font-semibold tracking-tight text-slate-900">Gestão de Estoque</h1>
              </div>
            </div>

            {/* CARD DE USUÁRIO COM DROPDOWN */}
            <div className="relative flex items-center" ref={dropdownRef}>
              <button 
                onClick={() => setDropdownAberto(!dropdownAberto)}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 hover:bg-slate-100 transition-colors rounded-lg px-2.5 py-1.5 shadow-sm"
              >
                <div className={`h-5 w-5 rounded-md ${corAvatar} text-white flex items-center justify-center text-[10px] font-bold font-mono`}>
                  {inicialUsuario}
                </div>
                <span className="text-xs font-medium text-slate-700 font-mono tracking-tight max-w-[120px] truncate">
                  {usuarioLogado}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-slate-400 transition-transform ${dropdownAberto ? 'rotate-180' : ''}`}>
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>

              {/* MENU DROPDOWN */}
              {dropdownAberto && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 animate-enter">
                  <button 
                    onClick={() => { setDropdownAberto(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                    </svg>
                    Alterar Senha
                  </button>
                  <hr className="border-slate-100 my-1" />
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    Sair da Conta
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>
      )}

      <main>
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <LayoutComum>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Home />} />
              <Route path="/pallet/:id" element={<PalletInterface />} />
            </Route>
          </Routes>
        </LayoutComum>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
