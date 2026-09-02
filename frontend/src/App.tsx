import { BrowserRouter, Routes, Route, useLocation, Link, Navigate } from 'react-router-dom';
import { useState, useRef, type JSX } from 'react';
import { ToastProvider } from './contexts/toastContext';
import { ThemeProvider } from './contexts/themeContext';

import Home from './pages/home/Home.js';
import PalletInterface from './pages/Interface/PalletInterface.js';
import Login from './pages/login/Login.js';
import ProtectedRoute from './pages/home/components/ProtectedRoute.js';
import GestorEnviosFull from './pages/mercadoFull/GestorEnviosFull.js';
import RecebimentoMercadoria from './pages/recebimento/RecebimentoMercadoria.js';
import SuperAdmin from './pages/superadmin/SuperAdmin.js';
import Configuracoes from './pages/configuracoes/Configuracoes.js';

// =========================================================================
// 🚀 INTERCEPTADOR GLOBAL DE FETCH (LEÃO DE CHÁCARA)
// Monitora todas as requisições nativas do navegador. Se receber um erro
// 401 (Não Autorizado), significa que a sessão expirou ou o usuário 
// logou em outra máquina. Ele força o logout automático.
// =========================================================================
const limparSessao = () => {
  localStorage.removeItem('wms_token');
  localStorage.removeItem('wms_refresh_token');
  localStorage.removeItem('wms_user');
  localStorage.removeItem('wms_cargo');
  localStorage.removeItem('wms_permissoes');
  localStorage.removeItem('wms_tenant');
  localStorage.removeItem('wms_modulos');
  localStorage.removeItem('wms_superadmin');
};

/** Módulos contratados pela empresa do usuário logado (do login, em localStorage). */
function modulosDaEmpresa(): string[] {
  try {
    return JSON.parse(localStorage.getItem('wms_modulos') || '[]');
  } catch {
    return [];
  }
}

const { fetch: originalFetch } = window;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);

  if (window.location.pathname !== '/login') {
    if (response.status === 401) {
      console.warn('⚠️ Sessão expirada ou acessada em outro local. Deslogando...');
      limparSessao();
      window.location.href = '/login';
    } else if (response.status === 403) {
      const clone = response.clone();
      clone.json().then((body) => {
        if (body?.code === 'TENANT_SUSPENSO') {
          limparSessao();
          alert('O acesso da sua empresa foi suspenso. Fale com o suporte.');
          window.location.href = '/login';
        }
      }).catch(() => {});
    }
  }

  return response;
};
// =========================================================================

function LayoutComum({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const esconderHeader = location.pathname === '/login';
  const usuarioLogado = localStorage.getItem('wms_user') || 'Operador';
  const inicialUsuario = usuarioLogado.charAt(0).toUpperCase();
  const cargoUsuario = localStorage.getItem('wms_cargo') || '';
  const tenantNome = localStorage.getItem('wms_tenant') || '';
  const isSuperAdmin = localStorage.getItem('wms_superadmin') === 'true';

  const permissoesSalvas = localStorage.getItem('wms_permissoes');
  const permissoes: string[] = permissoesSalvas ? JSON.parse(permissoesSalvas) : [];
  const modulos: string[] = modulosDaEmpresa();

  // Item visível = a empresa contratou o módulo E o cargo tem a permissão.
  const podeVerArmazem = (modulos.includes('malha') || modulos.includes('estoque') || modulos.includes('reports'))
    && permissoes.some(p => p.startsWith('malha') || p.startsWith('estoque') || p.startsWith('reports'));
  const podeVerFull = modulos.includes('full') && permissoes.some(p => p.startsWith('full'));
  const podeVerRecebimento = modulos.includes('recebimento') && permissoes.some(p => p.startsWith('recebimento'));

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isOpen = isSidebarOpen || isMobileMenuOpen;

  // Hover-intent: só expande depois de ~180ms com o mouse parado sobre a sidebar
  // (evita abrir sem querer ao passar de raspão); recolhe na hora ao sair.
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSidebarEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setIsSidebarOpen(true), 45);
  };
  const handleSidebarLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    limparSessao();
    window.location.href = '/login';
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const isActive = (path: string) => location.pathname === path;

  // 🚀 CORREÇÃO 2: BLINDAGEM DA TELA DE LOGIN
  // Removemos as variáveis globais (bg-[var(--bg-main)]) daqui.
  // Agora forçamos o fundo padrão (#F6F8FC) e a cor do texto padrão (slate-800).
  // O data-theme="ocean" trava a estética e impede que o Dark Mode invada o Login!
  if (esconderHeader) {
    return (
      <div data-theme="ocean" className="min-h-screen bg-[#F6F8FC] text-slate-800 antialiased">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[var(--bg-main)] text-[var(--text-main)] antialiased overflow-hidden relative">
      
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
          onClick={closeMobileMenu}
        />
      )}

      <aside
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
        className={`fixed md:relative top-0 left-0 h-full flex flex-col shrink-0 z-50 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] transition-[width,transform] duration-200 ease-out
          ${isMobileMenuOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full w-64'}
          md:translate-x-0 ${isSidebarOpen ? 'md:w-64' : 'md:w-[76px]'}
        `}
      >
        <div className="flex h-16 items-center border-b border-[var(--sidebar-border)] shrink-0 px-5 overflow-hidden">
          <button type="button" onClick={closeMobileMenu} className="flex items-center h-8 w-8 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-white shrink-0 justify-center shadow-sm cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-[18px] h-[18px]">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l3 1.75M9 20.25v-9" />
            </svg>
          </button>
          <SidebarText isOpen={isOpen} className="ml-3 font-bold tracking-wide text-white">
            Gestão de Estoque
          </SidebarText>
        </div>

        <nav className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden py-5 px-3 gap-1 scrollbar-hide">

          {podeVerArmazem && (
            <>
              <SidebarGroupLabel isOpen={isOpen}>Principal</SidebarGroupLabel>
              <NavItem to="/" title="Triagens" label="Triagens" isOpen={isOpen} active={isActive('/')} onClick={closeMobileMenu}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </NavItem>
            </>
          )}

          {podeVerFull && (
            <>
              <SidebarGroupLabel isOpen={isOpen} spaced>Operações Externas</SidebarGroupLabel>
              <NavItem to="/mercado-full" title="Mercado Full" label="Mercado Full" isOpen={isOpen} active={isActive('/mercado-full')} onClick={closeMobileMenu}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                </svg>
              </NavItem>
            </>
          )}

          {podeVerRecebimento && (
            <>
              <SidebarGroupLabel isOpen={isOpen} spaced>Produtos</SidebarGroupLabel>
              <NavItem to="/recebimento" title="Recebimento de Mercadoria" label="Recebimento de Mercadoria" isOpen={isOpen} active={isActive('/recebimento')} onClick={closeMobileMenu}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
              </NavItem>
            </>
          )}

          {isSuperAdmin && (
            <>
              <SidebarGroupLabel isOpen={isOpen} spaced>Plataforma</SidebarGroupLabel>
              <NavItem to="/superadmin" title="Administração" label="Administração" isOpen={isOpen} active={isActive('/superadmin')} onClick={closeMobileMenu}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                </svg>
              </NavItem>
            </>
          )}
        </nav>

        <div className="mt-auto border-t border-[var(--sidebar-border)] p-3 flex flex-col gap-1 overflow-hidden shrink-0">

          <Link onClick={closeMobileMenu} to="/configuracoes" title="Configurações" className={`group/navitem flex items-center h-11 rounded-lg shrink-0 transition-[color,background-color,padding] duration-200 ${isOpen ? 'px-3' : 'px-4'} ${isActive('/configuracoes') ? 'bg-blue-600 text-white shadow-md' : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--sidebar-text-hover)]'}`}>
            <span className="w-5 h-5 shrink-0 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </span>
            <SidebarText isOpen={isOpen} className="ml-3 text-[13px] font-semibold">Configurações</SidebarText>
          </Link>

          <button onClick={handleLogout} title="Sair do Sistema" className={`flex items-center h-11 rounded-lg shrink-0 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-[color,background-color,padding] duration-200 ${isOpen ? 'px-3' : 'px-4'}`}>
            <span className="w-5 h-5 shrink-0 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
            </span>
            <SidebarText isOpen={isOpen} className="ml-3 text-[13px] font-semibold">Sair do Sistema</SidebarText>
          </button>

          <div className="flex items-center gap-3 min-h-[46px] px-2 mt-1 border-t border-[var(--sidebar-border)] py-2 overflow-hidden">
            <div className="h-[34px] w-[34px] rounded-full bg-white text-slate-800 flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
              {inicialUsuario}
            </div>
            <div
              className={`flex-1 flex items-center justify-between gap-2 min-w-0 whitespace-nowrap transition-[opacity,transform] ${isOpen ? 'opacity-100 translate-x-0 duration-150 delay-75' : 'opacity-0 -translate-x-2 duration-75 pointer-events-none'}`}
              aria-hidden={!isOpen}
            >
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-[13px] font-semibold text-[var(--sidebar-text-hover)] tracking-wide truncate">
                  {usuarioLogado}
                </span>
                {cargoUsuario && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sidebar-text)] opacity-60 truncate">
                    {cargoUsuario}
                  </span>
                )}
              </div>
              {isSuperAdmin ? (
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-blue-400/80">
                  Plataforma
                </span>
              ) : tenantNome && (
                <span className="shrink-0 max-w-[42%] text-[10px] font-medium text-[var(--sidebar-text)] opacity-60 truncate">
                  {tenantNome}
                </span>
              )}
            </div>
          </div>

        </div>
      </aside>

      {/* ÁREA DIREITA (CONTEÚDO) */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-main)] overflow-hidden">
        
        <header className="md:hidden flex items-center justify-between h-16 shrink-0 px-4 bg-[var(--header-bg)] border-b border-[var(--header-border)] z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-[var(--text-main)] p-2 -ml-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-color)] shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <span className="font-bold text-sm uppercase tracking-wide text-[var(--text-main)] truncate">
                {isActive('/configuracoes') ? 'Configurações' : isActive('/mercado-full') ? 'Gestor Full' : isActive('/recebimento') ? 'Recebimento de Mercadoria' : isActive('/superadmin') ? 'Administração' : 'WMS'}
            </span>
          </div>
          <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
            {inicialUsuario}
          </div>
        </header>

        {/* Cabeçalho Desktop */}
        {!isActive('/mercado-full') && !isActive('/recebimento') && !isActive('/superadmin') && (
          <header className="hidden md:flex h-16 shrink-0 items-center justify-between px-6 bg-[var(--header-bg)] border-b border-[var(--header-border)] backdrop-blur-xl z-30">
            <div className="text-[var(--header-text)] text-xs font-semibold tracking-wide uppercase">
              {isActive('/configuracoes') ? 'Configurações do Sistema' : 'WMS Operacional'}
            </div>
          </header>
        )}

        <main className="flex-1 overflow-y-auto relative scroll-smooth bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}

// Rótulo de texto da sidebar (títulos de seção e labels dos itens): quando a sidebar
// está recolhida fica 100% invisível (opacity-0 + largura clipada pelo overflow-hidden
// do <aside>); ao expandir, aparece com um pequeno atraso para "acompanhar" a abertura
// do painel — nunca mostra pedaços de letra no estado recolhido.
function SidebarText({ children, isOpen, muted = false, className = '' }: {
  children: React.ReactNode; isOpen: boolean; muted?: boolean; className?: string;
}) {
  return (
    <span
      className={`whitespace-nowrap transition-[opacity,transform] ${
        isOpen
          ? 'opacity-100 translate-x-0 duration-150 delay-75'
          : 'opacity-0 -translate-x-2 duration-75 delay-0 pointer-events-none'
      } ${muted ? 'opacity-60' : ''} ${className}`}
      aria-hidden={!isOpen}
    >
      {children}
    </span>
  );
}

// Cabeçalho de seção: altura fixa nos dois estados para os ícones NUNCA se moverem na vertical.
function SidebarGroupLabel({ children, isOpen, spaced = false }: { children: React.ReactNode; isOpen: boolean; spaced?: boolean }) {
  return (
    <div className={`h-7 flex items-end px-3 shrink-0 overflow-hidden ${spaced ? 'mt-4' : ''}`}>
      <span
        className={`text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--sidebar-text)] whitespace-nowrap transition-[opacity,transform] ${
          isOpen ? 'opacity-60 translate-x-0 duration-150 delay-75' : 'opacity-0 -translate-x-2 duration-75'
        }`}
        aria-hidden={!isOpen}
      >
        {children}
      </span>
    </div>
  );
}

// Item de navegação: ícone em slot de largura fixa (não desliza) + rótulo controlado por SidebarText.
function NavItem({ to, title, label, isOpen, active, onClick, children }: {
  to: string; title: string; label: string; isOpen: boolean; active: boolean; onClick?: () => void; children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      title={title}
      onClick={onClick}
      className={`flex items-center h-11 rounded-lg shrink-0 transition-[color,background-color,padding] duration-200 ${
        isOpen ? 'px-3' : 'px-4'
      } ${
        active
          ? 'bg-blue-600 text-white shadow-md'
          : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--sidebar-text-hover)]'
      }`}
    >
      <span className="w-5 h-5 shrink-0 flex items-center justify-center">{children}</span>
      <SidebarText isOpen={isOpen} className="ml-3 text-[13px] font-semibold">{label}</SidebarText>
    </Link>
  );
}

function SuperAdminRoute() {
  // Componente (não JSX inline) — reavalia o localStorage a cada render,
  // senão a checagem ficaria congelada no valor de quando o App montou.
  if (localStorage.getItem('wms_superadmin') !== 'true') {
    return <Navigate to="/configuracoes" replace />;
  }
  return <SuperAdmin />;
}

function RouteGuard({ permissoesObrigatorias, modulosObrigatorios, children }: {
  permissoesObrigatorias: string[],
  modulosObrigatorios?: string[],
  children: JSX.Element,
}) {
  const permissoesSalvas = localStorage.getItem('wms_permissoes');
  const permissoes: string[] = permissoesSalvas ? JSON.parse(permissoesSalvas) : [];
  const modulos = modulosDaEmpresa();

  const temPermissao = permissoes.some(p => permissoesObrigatorias.some(obrigatoria => p.startsWith(obrigatoria)));
  const temModulo = !modulosObrigatorios || modulosObrigatorios.some(m => modulos.includes(m));

  if (!temPermissao || !temModulo) {
    if (modulos.includes('full') && permissoes.some(x => x.startsWith('full'))) return <Navigate to="/mercado-full" replace />;
    return <Navigate to="/configuracoes" replace />;
  }

  return children;
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
                
                <Route path="/" element={
                  <RouteGuard permissoesObrigatorias={['malha', 'estoque', 'reports']} modulosObrigatorios={['malha', 'estoque', 'reports']}>
                    <Home />
                  </RouteGuard>
                } />

                <Route path="/pallet/:id" element={
                  <RouteGuard permissoesObrigatorias={['malha', 'estoque']} modulosObrigatorios={['malha', 'estoque']}>
                    <PalletInterface />
                  </RouteGuard>
                } />

                <Route path="/mercado-full" element={
                  <RouteGuard permissoesObrigatorias={['full']} modulosObrigatorios={['full']}>
                    <GestorEnviosFull />
                  </RouteGuard>
                } />

                <Route path="/recebimento" element={
                  <RouteGuard permissoesObrigatorias={['recebimento']} modulosObrigatorios={['recebimento']}>
                    <RecebimentoMercadoria />
                  </RouteGuard>
                } />

                <Route path="/superadmin" element={<SuperAdminRoute />} />

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