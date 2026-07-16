import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ToastProvider } from './contexts/toastContext';
import { SocketProvider } from './contexts/SocketContext';
import Home from './pages/home/Home.js';
import PalletInterface from './pages/Interface/PalletInterface.js';
import Login from './pages/login/Login.js';
import ProtectedRoute from './pages/home/components/ProtectedRoute.js';
import { useState, useRef, useEffect } from 'react';
import api from './services/api.js';
import toast from 'react-hot-toast';

// Configuração determinística de cores profissionais de alto contraste para o avatar
const AVATAR_COLORS = [
  { bg: 'bg-indigo-600', text: 'text-white' },
  { bg: 'bg-emerald-600', text: 'text-white' },
  { bg: 'bg-violet-600', text: 'text-white' },
  { bg: 'bg-amber-600', text: 'text-white' },
  { bg: 'bg-rose-600', text: 'text-white' },
  { bg: 'bg-cyan-600', text: 'text-white' },
  { bg: 'bg-teal-600', text: 'text-white' },
  { bg: 'bg-fuchsia-600', text: 'text-white' },
  { bg: 'bg-blue-600', text: 'text-white' },
  { bg: 'bg-orange-600', text: 'text-white' }
];

function obterCorAvatar(username: string) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

// Subcomponente de Modal para Alteração de Senha Autenticada
function ModalAlterarSenha({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [salvando, setSalvando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmarNovaSenha) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (novaSenha.length < 4) {
      toast.error('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }

    setSalvando(true);
    try {
      await api.post('/auth/alterar-senha-autenticado', { senhaAtual, novaSenha });
      toast.success('Senha alterada com sucesso!');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarNovaSenha('');
      onClose();
    } catch (err: any) {
      const msgErro = err.response?.data?.error || 'Não foi possível alterar a senha.';
      toast.error(msgErro);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all">
      <div className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-[0_20px_60px_-25px_rgba(30,58,95,0.35)] overflow-hidden">
        
        {/* Cabeçalho do Modal */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Alterar Senha</h2>
            <p className="text-xs text-slate-500 mt-0.5">Atualize suas credenciais de segurança.</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Formulário do Modal */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Senha Atual</label>
            <input
              type="password"
              required
              placeholder="Sua senha atual"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#1e3a5f]/60 focus:ring-2 focus:ring-[#1e3a5f]/15 transition-all outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Nova Senha</label>
            <input
              type="password"
              required
              placeholder="Mínimo 4 caracteres"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#1e3a5f]/60 focus:ring-2 focus:ring-[#1e3a5f]/15 transition-all outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Confirmar Nova Senha</label>
            <input
              type="password"
              required
              placeholder="Repita a nova senha"
              value={confirmarNovaSenha}
              onChange={(e) => setConfirmarNovaSenha(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#1e3a5f]/60 focus:ring-2 focus:ring-[#1e3a5f]/15 transition-all outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 h-10 rounded-lg text-xs font-medium text-white transition-all hover:shadow-lg disabled:opacity-60 flex items-center justify-center bg-blue-600 hover:bg-blue-700 shadow-blue-500/10"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' }}
            >
              {salvando ? 'Salvando...' : 'Salvar Alteração'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LayoutComum({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const esconderHeader = location.pathname === '/login';
  const usuarioLogado = localStorage.getItem('wms_user') || 'Operador';

  const inicialUsuario = usuarioLogado.charAt(0).toUpperCase();
  const corAvatar = obterCorAvatar(usuarioLogado);

  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

            {/* CARD DE USUÁRIO E DROPDOWN DE OPÇÕES */}
            <div className="flex items-center gap-3 relative" ref={dropdownRef}>
              <button 
                onClick={() => setDropdownAberto(!dropdownAberto)}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 shadow-sm hover:bg-slate-100/70 transition-colors cursor-pointer select-none"
              >
                <div className={`h-5 w-5 rounded-md ${corAvatar.bg} ${corAvatar.text} flex items-center justify-center text-[10px] font-bold font-mono`}>
                  {inicialUsuario}
                </div>
                <span className="text-xs font-medium text-slate-700 font-mono tracking-tight max-w-[120px] truncate">
                  {usuarioLogado}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-3 h-3 text-slate-400 transition-transform ${dropdownAberto ? 'rotate-180' : ''}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* MENU DROPDOWN */}
              {dropdownAberto && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200/80 rounded-xl shadow-[0_10px_25px_-5px_rgba(30,58,95,0.1)] py-1.5 z-50 animate-fade-in-up">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownAberto(false);
                      setModalSenhaAberto(true);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5 text-slate-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                    </svg>
                    Alterar Senha
                  </button>
                  
                  <div className="h-px bg-slate-100 my-1" />

                  <button 
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5 text-rose-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                    </svg>
                    Sair da Conta
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>
      )}

      {/* Renderização do Modal de Alteração de Senha */}
      <ModalAlterarSenha isOpen={modalSenhaAberto} onClose={() => setModalSenhaAberto(false)} />

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
        <SocketProvider>
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
        </SocketProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;