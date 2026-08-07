import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { useState } from 'react';
import { ToastProvider, useToast } from './contexts/toastContext'; 
import Home from './pages/home/Home.js';
import PalletInterface from './pages/Interface/PalletInterface.js';
import Login from './pages/login/Login.js';
import ProtectedRoute from './pages/home/components/ProtectedRoute.js';
import GestorEnviosFull from './pages/mercadoFull/GestorEnviosFull';

function LayoutComum({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const toast = useToast();
  
  const esconderHeader = location.pathname === '/login';
  const usuarioLogado = localStorage.getItem('wms_user') || 'Operador';
  
  // Pegando a inicial do usuário para o avatar
  const inicialUsuario = usuarioLogado.charAt(0).toUpperCase();

  // Estados de controle de UI
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Estados para alteração de senha
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [carregandoSenha, setCarregandoSenha] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senhaAtual || novaSenha.length < 4) {
       toast.error('Preencha os campos (Mínimo de 4 caracteres para a nova senha).');
       return;
    }
    
    setCarregandoSenha(true);
    try {
       const token = localStorage.getItem('wms_token');
       const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
       
       const response = await fetch(`${API_URL}/auth/alterar-senha-autenticado`, {
          method: 'POST',
          headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ senhaAtual, novaSenha })
       });
       
       const data = await response.json();
       if (!response.ok) throw new Error(data.error || 'Erro ao alterar a senha.');
       
       toast.success('Sua senha foi alterada com sucesso!');
       setIsPasswordModalOpen(false);
       setSenhaAtual('');
       setNovaSenha('');
    } catch (err: any) {
       toast.error(err.message);
    } finally {
       setCarregandoSenha(false);
    }
  };

  if (esconderHeader) {
    return <div className="min-h-screen bg-[#F6F8FC] text-slate-800 antialiased">{children}</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-[#F6F8FC] antialiased overflow-hidden">
      
      {/* 🚀 HEADER SUPERIOR: LINHA FIXA TOTALMENTE LIMPA */}
      <header className="flex h-16 shrink-0 z-50">
        
        {/* BLOCO SUPERIOR ESQUERDO: LARGURA FIXA E TRAVADA (Não encolhe) */}
        <div 
          onMouseEnter={() => setIsSidebarOpen(true)}
          onMouseLeave={() => setIsSidebarOpen(false)}
          className={`w-64 shrink-0 flex items-center px-6 transition-colors duration-300 border-b ${isSidebarOpen ? 'bg-[#0f172a] text-white border-slate-800/80' : 'bg-white text-slate-800 border-slate-200'}`}
        >
          <div className="flex items-center gap-3 select-none group">
            {/* ÍCONE DE TOGGLE */}
            <div className={`flex items-center justify-center shrink-0 transition-all duration-300 ${
              isSidebarOpen 
                ? 'h-8 w-8 rounded-lg bg-blue-600 text-white shadow-sm' 
                : 'h-9 w-9 rounded-xl bg-white border-[1.5px] border-blue-200/80 text-blue-600 shadow-sm group-hover:bg-blue-50 group-hover:border-blue-300'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={isSidebarOpen ? 2 : 2.5} stroke="currentColor" className="w-[18px] h-[18px]">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l3 1.75M9 20.25v-9" />
              </svg>
            </div>

            {/* ESCRITA TRAVADA */}
            <h1 className="text-[15px] font-bold tracking-wide whitespace-nowrap transition-colors duration-300">Gestão de Estoque</h1>
          </div>
        </div>

        {/* BLOCO SUPERIOR DIREITO: COMPLETAMENTE LIMPO */}
        <div className="flex-1 bg-white/90 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-6 transition-all duration-300">
          {/* Header limpo - O menu de usuário desceu para a sidebar! */}
        </div>
      </header>

      {/* ÁREA DE CONTEÚDO PRINCIPAL INFERIOR */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* 🚀 SIDEBAR NAV COM PERFIL E CONFIGURAÇÕES NA BASE */}
        <aside 
          onMouseEnter={() => setIsSidebarOpen(true)}
          onMouseLeave={() => setIsSidebarOpen(false)}
          className={`transition-all duration-300 ease-in-out flex flex-col shrink-0 z-40 ${isSidebarOpen ? 'w-64 bg-[#0f172a] text-slate-300' : 'w-20 bg-white text-slate-600 border-r border-slate-200'}`}
        >
          {/* NAVEGAÇÃO PRINCIPAL */}
          <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2 scrollbar-hide">
            
            {isSidebarOpen ? (
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 animate-in fade-in duration-300">Principal</p>
            ) : (
              <div className="h-px w-6 bg-slate-200 my-4 mx-auto" />
            )}
            
            <Link to="/" title="Visão do Armazém" className={`flex items-center ${isSidebarOpen ? 'gap-3 px-3 bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'justify-center bg-blue-50 border border-blue-100/60 text-blue-600 hover:bg-blue-100'} py-2.5 rounded-lg transition-all duration-300`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              {isSidebarOpen && <span className="text-[13px] font-semibold whitespace-nowrap animate-in fade-in duration-300">Visão do Armazém</span>}
            </Link>

            {isSidebarOpen ? (
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 mt-8 animate-in fade-in duration-300">Operações Externas</p>
            ) : (
              <div className="h-px w-6 bg-slate-200 my-6 mx-auto" />
            )}
            
            <Link to="/mercado-full" title="Mercado Full" className={`flex items-center ${isSidebarOpen ? 'gap-3 px-3 text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-50'} py-2.5 rounded-lg transition-colors group`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 shrink-0 group-hover:text-amber-400 transition-colors">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
              </svg>
              {isSidebarOpen && <span className="text-[13px] font-semibold whitespace-nowrap animate-in fade-in duration-300">Mercado Full</span>}
            </Link>
          </nav>

          {/* 🚀 BASE DA SIDEBAR (Módulos Soltos + Perfil do Usuário) */}
          <div className={`mt-auto border-t transition-colors duration-300 ${isSidebarOpen ? 'border-slate-800/80' : 'border-slate-100'} p-3 flex flex-col gap-1`}>
            
            {/* BOTÃO CONFIGURAÇÕES (Fora de modal, solto na base) */}
            <button 
              onClick={() => setIsPasswordModalOpen(true)}
              title="Configurações"
              className={`flex items-center ${isSidebarOpen ? 'gap-3 px-3 text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-50'} py-2.5 rounded-lg transition-colors group`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 shrink-0 group-hover:rotate-45 transition-transform duration-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {isSidebarOpen && <span className="text-[13px] font-semibold whitespace-nowrap animate-in fade-in duration-300">Configurações</span>}
            </button>

            {/* BOTÃO SAIR DO SISTEMA (Fora de modal, solto na base) */}
            <button 
              onClick={handleLogout}
              title="Sair do Sistema"
              className={`flex items-center ${isSidebarOpen ? 'gap-3 px-3 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10' : 'justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-50'} py-2.5 rounded-lg transition-colors group`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              {isSidebarOpen && <span className="text-[13px] font-semibold whitespace-nowrap animate-in fade-in duration-300">Sair do Sistema</span>}
            </button>

            {/* DIVISOR DO PERFIL */}
            <div className={`h-px transition-colors duration-300 ${isSidebarOpen ? 'bg-slate-800/80' : 'bg-slate-200'} my-2 mx-2`} />

            {/* PERFIL DO USUÁRIO (Apenas Avatar, Nome e Sininho) */}
            <div className={`flex items-center ${isSidebarOpen ? 'justify-between px-2' : 'justify-center'} py-1.5`}>
              <div className="flex items-center gap-3">
                {/* Avatar Limpo (Fundo branco e texto escuro idêntico à sua imagem) */}
                <div className="h-[34px] w-[34px] rounded-full bg-white border border-slate-200 text-slate-800 flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                  {inicialUsuario}A
                </div>
                
                {/* Nome do Operador */}
                {isSidebarOpen && (
                  <div className="flex flex-col items-start animate-in fade-in duration-300">
                    <span className="text-[13px] font-semibold text-white tracking-wide truncate max-w-[120px]">{usuarioLogado}</span>
                  </div>
                )}
              </div>
              
              {/* Sininho de Notificação */}
              {isSidebarOpen && (
                <div className="relative p-1 text-slate-400 hover:text-white transition-colors cursor-pointer animate-in fade-in duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-[18px] h-[18px]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  <span className="absolute top-0.5 right-1 h-2 w-2 rounded-full bg-rose-500 border-[1.5px] border-[#0f172a]"></span>
                </div>
              )}
            </div>

          </div>
        </aside>

        {/* CONTAINER DINÂMICO ONDE AS TELAS SÃO RENDERIZADAS */}
        <main className="flex-1 overflow-y-auto relative scroll-smooth bg-[#F6F8FC]">
          {children}
        </main>
      </div>

      {/* MODAL: ALTERAÇÃO DE SENHA */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 tracking-tight">Alterar Senha</h2>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Atualize suas credenciais de acesso.</p>
              </div>
            </div>

            <form onSubmit={handleAlterarSenha} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Senha Atual</label>
                <input 
                  type="password" 
                  autoFocus
                  required
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nova Senha</label>
                <input 
                  type="password" 
                  required
                  minLength={4}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Mínimo 4 caracteres"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors uppercase">
                  Cancelar
                </button>
                <button type="submit" disabled={carregandoSenha || !senhaAtual || novaSenha.length < 4} className="px-5 py-2 text-xs font-bold tracking-wide text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg shadow-sm transition-all uppercase">
                  {carregandoSenha ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
              <Route path="/mercado-full" element={<GestorEnviosFull />} />
            </Route>
            
          </Routes>
        </LayoutComum>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;