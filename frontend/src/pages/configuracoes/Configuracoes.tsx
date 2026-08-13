import { useState } from 'react';
import { useTheme } from '../../contexts/themeContext';
import { useToast } from '../../contexts/toastContext';

export default function Configuracoes() {
  const { theme, setTheme, radius, setRadius } = useTheme();
  const toast = useToast();
  
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [carregandoSenha, setCarregandoSenha] = useState(false);

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senhaAtual || novaSenha.length < 4) return toast.error('Preencha os campos (Mínimo de 4 caracteres).');
    
    setCarregandoSenha(true);
    try {
       const token = localStorage.getItem('wms_token');
       const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
       const response = await fetch(`${API_URL}/auth/alterar-senha-autenticado`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ senhaAtual, novaSenha })
       });
       if (!response.ok) throw new Error('Erro ao alterar a senha.');
       toast.success('Senha alterada com sucesso!');
       setSenhaAtual(''); 
       setNovaSenha('');
    } catch (err: any) { 
       toast.error(err.message); 
    } finally { 
       setCarregandoSenha(false); 
    }
  };

  return (
    <div className="min-h-full pb-20 animate-in fade-in duration-300">
      <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-12">
        
        {/* CABEÇALHO */}
        <div className="flex items-center gap-5 border-b border-[var(--border-color)] pb-8">
          <div className="h-16 w-16 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-color)] flex items-center justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[var(--text-muted)]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854-.107-1.204l-.527-.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)]">Configurações</h1>
            <p className="text-[15px] font-medium text-[var(--text-muted)] mt-1">Gerencie suas preferências e acompanhe as atualizações da plataforma.</p>
          </div>
        </div>

        {/* 1. APARÊNCIA E ESTILO */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 border-b border-[var(--border-color)] pb-12">
          <div className="col-span-1">
            <h2 className="text-lg font-bold text-[var(--text-main)]">Aparência e Estilo</h2>
            <p className="text-[13px] leading-relaxed font-medium text-[var(--text-muted)] mt-2">Personalize as cores e as bordas da interface. A alteração é salva automaticamente.</p>
          </div>
          <div className="col-span-1 lg:col-span-2 space-y-8">
            
            <div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block mb-4">Paleta de Cores</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* 🚀 ALTERAÇÃO: Fundo da caixinha de preview "Ocean" travada usando valor Hexadecimal embutido */}
                <button onClick={() => setTheme('ocean')} className={`flex flex-col text-left rounded-xl border p-2 transition-all ${theme === 'ocean' ? 'border-blue-600 bg-blue-600/5 ring-1 ring-blue-600' : 'border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-[var(--text-muted)]'}`}>
                  <div className="h-20 w-full rounded-lg mb-3 relative bg-[#ffffff] border border-[#e2e8f0]">
                    {theme === 'ocean' && <svg className="w-5 h-5 text-blue-600 absolute top-2 right-2" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                  </div>
                  <span className={`px-2 pb-1.5 text-[13px] font-bold ${theme === 'ocean' ? 'text-blue-600' : 'text-[var(--text-main)]'}`}>Ocean (Light)</span>
                </button>

                {/* 🚀 ALTERAÇÃO: Fundo da caixinha de preview "Midnight" travada usando valor Hexadecimal embutido */}
                <button onClick={() => setTheme('midnight')} className={`flex flex-col text-left rounded-xl border p-2 transition-all ${theme === 'midnight' ? 'border-blue-600 bg-blue-600/5 ring-1 ring-blue-600' : 'border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-[var(--text-muted)]'}`}>
                  <div className="h-20 w-full rounded-lg mb-3 relative bg-[#1e293b] border border-[#475569]">
                    {theme === 'midnight' && <svg className="w-5 h-5 text-blue-500 absolute top-2 right-2" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                  </div>
                  <span className={`px-2 pb-1.5 text-[13px] font-bold ${theme === 'midnight' ? 'text-blue-500' : 'text-[var(--text-main)]'}`}>Midnight (Dark)</span>
                </button>

                <button onClick={() => setTheme('coffee')} className={`flex flex-col text-left rounded-xl border p-2 transition-all ${theme === 'coffee' ? 'border-blue-600 bg-blue-600/5 ring-1 ring-blue-600' : 'border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-[var(--text-muted)]'}`}>
                  <div className="h-20 w-full rounded-lg mb-3 relative bg-[#fdf8f5] border border-[#eaddd7]">
                    {theme === 'coffee' && <svg className="w-5 h-5 text-blue-600 absolute top-2 right-2" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                  </div>
                  <span className={`px-2 pb-1.5 text-[13px] font-bold ${theme === 'coffee' ? 'text-blue-600' : 'text-[var(--text-main)]'}`}>Coffee (Warm)</span>
                </button>

              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block mb-4">Estilo das Bordas</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button onClick={() => setRadius('sharp')} className={`flex items-center gap-3 w-full py-4 px-4 rounded-xl border text-[13px] font-bold transition-all ${radius === 'sharp' ? 'border-blue-600 text-blue-600 bg-blue-600/5 ring-1 ring-blue-600' : 'border-[var(--border-color)] bg-[var(--bg-panel)] text-[var(--text-main)] hover:border-[var(--text-muted)]'}`}>
                  <div className={`h-4 w-4 border-2 ${radius === 'sharp' ? 'border-blue-600' : 'border-[var(--text-muted)]'}`}></div>
                  Sharp (Reto)
                  {radius === 'sharp' && <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                </button>

                <button onClick={() => setRadius('modern')} className={`flex items-center gap-3 w-full py-4 px-4 rounded-xl border text-[13px] font-bold transition-all ${radius === 'modern' ? 'border-blue-600 text-blue-600 bg-blue-600/5 ring-1 ring-blue-600' : 'border-[var(--border-color)] bg-[var(--bg-panel)] text-[var(--text-main)] hover:border-[var(--text-muted)]'}`}>
                  <div className={`h-4 w-4 rounded-md border-2 ${radius === 'modern' ? 'border-blue-600' : 'border-[var(--text-muted)]'}`}></div>
                  Modern (Padrão)
                  {radius === 'modern' && <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                </button>

                <button onClick={() => setRadius('soft')} className={`flex items-center gap-3 w-full py-4 px-4 rounded-xl border text-[13px] font-bold transition-all ${radius === 'soft' ? 'border-blue-600 text-blue-600 bg-blue-600/5 ring-1 ring-blue-600' : 'border-[var(--border-color)] bg-[var(--bg-panel)] text-[var(--text-main)] hover:border-[var(--text-muted)]'}`}>
                  <div className={`h-4 w-4 rounded-full border-2 ${radius === 'soft' ? 'border-blue-600' : 'border-[var(--text-muted)]'}`}></div>
                  Soft
                  {radius === 'soft' && <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* 2. SEGURANÇA */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 border-b border-[var(--border-color)] pb-12">
          <div className="col-span-1">
            <h2 className="text-lg font-bold text-[var(--text-main)]">Segurança</h2>
            <p className="text-[13px] leading-relaxed font-medium text-[var(--text-muted)] mt-2">Atualize sua senha de acesso ao sistema operacional.</p>
          </div>
          <div className="col-span-1 lg:col-span-2">
            <form onSubmit={handleAlterarSenha} className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Senha Atual</label>
                <input 
                  type="password" required value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)}
                  className="w-full bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-color)] rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Nova Senha</label>
                <input 
                  type="password" required minLength={4} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-color)] rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="Mínimo 4 caracteres"
                />
              </div>
              <div className="pt-3">
                <button type="submit" disabled={carregandoSenha || !senhaAtual || novaSenha.length < 4} className="px-6 py-3.5 text-[11px] tracking-wider font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl shadow-sm transition-all uppercase w-full">
                  {carregandoSenha ? 'Salvando...' : 'Confirmar Alteração'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* 3. CONTROLE DE ACESSOS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 opacity-80">
          <div className="col-span-1">
            <h2 className="text-lg font-bold text-[var(--text-main)]">Controle de Acessos</h2>
            <p className="text-[13px] leading-relaxed font-medium text-[var(--text-muted)] mt-2">Gerencie cargos e defina as permissões de acesso da plataforma.</p>
          </div>
          <div className="col-span-1 lg:col-span-2">
            <button className="w-full flex items-center justify-between p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-blue-500 hover:shadow-sm transition-all text-left group">
                <div className="flex items-center gap-5">
                    <div className="h-12 w-12 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-blue-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-[var(--text-main)] text-[15px]">Matriz de Permissões</h3>
                        <p className="text-[13px] font-medium text-[var(--text-muted)] mt-0.5">Criar cargos e configurar acessos.</p>
                    </div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-[var(--text-muted)] group-hover:text-blue-600 transition-colors"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}