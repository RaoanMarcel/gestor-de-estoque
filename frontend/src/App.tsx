import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ToastProvider } from './contexts/toastContext.js'; // <-- Novo import do contexto unificado
import Home from './pages/home/Home.js';
import PalletInterface from './pages/Interface/PalletInterface.js';
import Login from './pages/login/Login.js';
import ProtectedRoute from './pages/home/components/ProtectedRoute.js';

function LayoutComum({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const esconderHeader = location.pathname === '/login';
  const usuarioLogado = localStorage.getItem('wms_user') || 'Operador';

  // Pega a primeira letra do nome para o Avatar do Card
  const inicialUsuario = usuarioLogado.charAt(0).toUpperCase();

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

            {/* CARD DE USUÁRIO E BOTÃO SAIR */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 shadow-sm">
                <div className="h-5 w-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">
                  {inicialUsuario}
                </div>
                <span className="text-xs font-medium text-slate-700 font-mono tracking-tight max-w-[120px] truncate">
                  {usuarioLogado}
                </span>
              </div>

              <button 
                onClick={handleLogout}
                className="text-xs font-semibold px-3 py-1.5 h-[30px] flex items-center rounded-lg border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-all shadow-sm"
              >
                Sair
              </button>
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
      {/* O ToastProvider envolve todo o app e injeta o Toaster configurado em bottom-right */}
      <ToastProvider>
        <LayoutComum>
          <Routes>
            {/* Rota Pública */}
            <Route path="/login" element={<Login />} />

            {/* Rotas Privadas e Protegidas por Token */}
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