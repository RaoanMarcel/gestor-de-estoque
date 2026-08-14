import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { useState } from 'react';
import { ToastProvider } from './contexts/toastContext'; 
import { ThemeProvider } from './contexts/themeContext'; 

import Home from './pages/home/Home.js';
import PalletInterface from './pages/Interface/PalletInterface.js';
import Login from './pages/login/Login.js';
import ProtectedRoute from './pages/home/components/ProtectedRoute.js';
import GestorEnviosFull from './pages/mercadoFull/GestorEnviosFull.js';

// 🚀 Adicionada a importação da nova página de configurações
import Configuracoes from './pages/configuracoes/Configuracoes.js';

function LayoutComum({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  const esconderHeader = location.pathname === '/login';
  const usuarioLogado = localStorage.getItem('wms_user') || 'Operador';
  const inicialUsuario = usuarioLogado.charAt(0).toUpperCase();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const isActive = (path: string) => location.pathname === path;

  if (esconderHeader) return <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)]">{children}</div>;

  return (
    // ✨ MÁGICA RESPONSIVA: flex-col no mobile, flex-row no PC (md:)
    <div className="flex flex-col md:flex-row h-screen w-full bg-[var(--bg-main)] text-[var(--text-main)] antialiased overflow-hidden">
      
      {/* SIDEBAR COM EFEITO DESLIZANTE (Bottom Bar no Mobile) */}
      <aside 
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
        className={`flex flex-row md:flex-col shrink-0 z-50 bg-[var(--sidebar-bg)] border-t md:border-t-0 md:border-r border-[var(--sidebar-border)] transition-all duration-300 ease-in-out order-last md:order-none overflow-x-auto md:overflow-x-hidden scrollbar-hide
          h-16 w-full md:h-full ${isSidebarOpen ? 'md:w-64' : 'md:w-[76px]'}
        `}
      >
        {/* LOGO (Escondida no mobile para poupar espaço) */}
        <div className="hidden md:flex h-16 items-center border-b border-[var(--sidebar-border)] shrink-0 px-5 overflow-hidden">
          <div className="flex items-center h-8 w-8 rounded-lg bg-blue-600 text-white shrink-0 justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-[18px] h-[18px]">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l3 1.75M9 20.25v-9" />
            </svg>
          </div>
          <span className={`font-bold tracking-wide text-white whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto max-w-[180px] opacity-100 ml-3' : 'w-0 max-w-0 opacity-0 ml-0'}`}>
            Gestão de Estoque
          </span>
        </div>

        {/* NAVEGAÇÃO */}
        <nav className="flex-1 flex flex-row md:flex-col items-center md:items-stretch overflow-y-auto py-0 md:py-6 px-3 space-x-2 md:space-x-0 md:space-y-2 scrollbar-hide">
          <div className={`hidden md:block overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'h-auto opacity-100 mb-3 ml-2' : 'h-0 opacity-0 mb-0 ml-0'}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--sidebar-text)] opacity-70">Principal</p>
          </div>
          <div className={`hidden md:block h-px w-6 bg-[var(--sidebar-border)] mx-auto transition-all duration-300 ${isSidebarOpen ? 'my-0 opacity-0 h-0' : 'my-4 opacity-100 h-px'}`} />
          
          <Link to="/" title="Visão do Armazém" className={`flex items-center justify-center md:justify-start h-11 w-11 md:w-auto px-0 md:px-3 rounded-lg transition-all duration-200 shrink-0 ${isActive('/') ? 'bg-blue-600 text-white shadow-md' : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--sidebar-text-hover)]'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 shrink-0 ${!isSidebarOpen && 'md:mx-auto'}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            <span className={`hidden md:block text-[13px] font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto max-w-[150px] opacity-100 ml-3' : 'w-0 max-w-0 opacity-0 ml-0'}`}>
              Visão do Armazém
            </span>
          </Link>

          <div className={`hidden md:block overflow-hidden mt-8 transition-all duration-300 ${isSidebarOpen ? 'h-auto opacity-100 mb-3 ml-2' : 'h-0 opacity-0 mb-0 ml-0 mt-0'}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--sidebar-text)] opacity-70">Operações Externas</p>
          </div>
          <div className={`hidden md:block h-px w-6 bg-[var(--sidebar-border)] mx-auto transition-all duration-300 ${isSidebarOpen ? 'my-0 opacity-0 h-0' : 'my-6 opacity-100 h-px'}`} />
          
          <Link to="/mercado-full" title="Mercado Full" className={`flex items-center justify-center md:justify-start h-11 w-11 md:w-auto px-0 md:px-3 rounded-lg transition-all duration-200 shrink-0 ${isActive('/mercado-full') ? 'bg-blue-600 text-white shadow-md' : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--sidebar-text-hover)]'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 shrink-0 ${!isSidebarOpen && 'md:mx-auto'}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
            </svg>
            <span className={`hidden md:block text-[13px] font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto max-w-[150px] opacity-100 ml-3' : 'w-0 max-w-0 opacity-0 ml-0'}`}>
              Mercado Full
            </span>
          </Link>

          {/* Divisor Invisível no Mobile para empurrar o resto pra direita */}
          <div className="flex-1 md:hidden"></div>

          <Link to="/configuracoes" title="Configurações" className={`flex items-center justify-center md:justify-start h-11 w-11 md:w-auto px-0 md:px-3 rounded-lg transition-all duration-200 shrink-0 ${isActive('/configuracoes') ? 'bg-blue-600 text-white shadow-md' : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--sidebar-text-hover)]'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 shrink-0 transition-transform ${!isSidebarOpen && 'md:mx-auto'} ${!isActive('/configuracoes') && 'group-hover:rotate-45'}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143-.854-.107-1.204l-.527-.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className={`hidden md:block text-[13px] font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto max-w-[150px] opacity-100 ml-3' : 'w-0 max-w-0 opacity-0 ml-0'}`}>
              Configurações
            </span>
          </Link>

          <button onClick={handleLogout} title="Sair do Sistema" className="flex items-center justify-center md:justify-start h-11 w-11 md:w-auto px-0 md:px-3 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 shrink-0 ${!isSidebarOpen && 'md:mx-auto'}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            <span className={`hidden md:block text-[13px] font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto max-w-[150px] opacity-100 ml-3' : 'w-0 max-w-0 opacity-0 ml-0'}`}>
              Sair do Sistema
            </span>
          </button>
        </nav>

        {/* USUÁRIO LOGADO (Escondido no mobile para poupar espaço na barra inferior) */}
        <div className="hidden md:flex mt-auto border-t border-[var(--sidebar-border)] p-3 flex-col gap-1 overflow-hidden">
          <div className="flex items-center px-4 py-2 h-12 transition-all duration-300">
            <div className={`flex items-center w-full ${!isSidebarOpen && 'justify-center'}`}>
              <div className="h-[34px] w-[34px] rounded-full bg-white text-slate-800 flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                {inicialUsuario}
              </div>
              <span className={`text-[13px] font-semibold text-[var(--sidebar-text-hover)] tracking-wide truncate overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto max-w-[120px] opacity-100 ml-3' : 'w-0 max-w-0 opacity-0 ml-0'}`}>
                {usuarioLogado}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ÁREA DIREITA (CONTEÚDO) */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-main)]">
        {/* Cabeçalho nativo removido para usar o cabeçalho branco do Gestor de Envios */}
        <main className="flex-1 overflow-y-auto relative scroll-smooth bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <LayoutComum>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Home />} />
                <Route path="/pallet/:id" element={<PalletInterface />} />
                <Route path="/mercado-full" element={<GestorEnviosFull />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
              </Route>
            </Routes>
          </LayoutComum>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;