import { useState, useEffect, type FormEvent } from 'react';
import { useTheme } from '../../contexts/themeContext';
import { useToast } from '../../contexts/toastContext';

interface Usuario {
  id: number;
  username: string;
  cargoId: number | null;
  precisaMudarSenha: boolean;
}

interface Cargo {
  id: number;
  nome: string;
  permissoes: string[];
  _count?: {
    usuarios: number;
  };
}

const MODULOS_SISTEMA = [
  {
    grupo: 'MALHA DE ENDEREÇAMENTO',
    itens: [
      { id: 'criar_pallet', titulo: 'Criar novas posições/pallets', tag: 'malha:create' },
      { id: 'excluir_pallet', titulo: 'Excluir posições do armazém', tag: 'malha:delete' },
    ]
  },
  {
    grupo: 'OPERAÇÕES DE ESTOQUE',
    itens: [
      { id: 'bipar_entrada', titulo: 'Bipar entrada de produtos', tag: 'estoque:in' },
      { id: 'bipar_saida', titulo: 'Bipar saída e exclusões', tag: 'estoque:out' },
      { id: 'transferencia', titulo: 'Transferir itens entre pallets', tag: 'estoque:transfer' },
      { id: 'rma', titulo: 'Lançar itens para o RMA', tag: 'estoque:rma' },
    ]
  },
  {
    grupo: 'RELATÓRIOS E HISTÓRICO',
    itens: [
      { id: 'exportar_excel', titulo: 'Exportar relatórios em Excel', tag: 'reports:export' },
      { id: 'ver_rastreabilidade', titulo: 'Visualizar rastreabilidade de itens', tag: 'reports:trace' },
    ]
  },
  {
    grupo: 'MERCADO FULL',
    itens: [
      { id: 'full_acesso', titulo: 'Acessar Gestor de Envios Full', tag: 'full:view' },
      { id: 'full_inbounds', titulo: 'Criar e processar Inbounds (TXT)', tag: 'full:manage' },
    ]
  },
  {
    grupo: 'GESTÃO DE ACESSOS',
    itens: [
      { id: 'gerenciar_usuarios', titulo: 'Gerenciar usuários e operadores', tag: 'acessos:usuarios' },
      { id: 'gerenciar_cargos', titulo: 'Criar e editar matriz de permissões', tag: 'acessos:cargos' },
    ]
  }
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function UserTableRow({ 
  u, 
  cargos, 
  handleAtualizarCargoUsuario, 
  handleExcluirUsuario 
}: { 
  u: Usuario, 
  cargos: Cargo[], 
  handleAtualizarCargoUsuario: (id: number, cargoId: string) => Promise<void>, 
  handleExcluirUsuario: (id: number, username: string) => void 
}) {
  // 🚀 ALTERAÇÃO: Isolando o valor original para garantir a renderização reativa do botão SALVAR
  const valorOriginal = u.cargoId ? String(u.cargoId) : '';
  const [cargoSelecionado, setCargoSelecionado] = useState(valorOriginal);
  const [salvando, setSalvando] = useState(false);

  const mudou = cargoSelecionado !== valorOriginal;

  useEffect(() => {
    setCargoSelecionado(u.cargoId ? String(u.cargoId) : '');
  }, [u.cargoId]);

  const onSave = async () => {
    setSalvando(true);
    await handleAtualizarCargoUsuario(u.id, cargoSelecionado);
    setSalvando(false);
  };

  return (
    <tr className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-main)]/50 transition-colors">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center font-bold text-xs shadow-sm">
            {u.username.charAt(0).toUpperCase()}
          </div>
          <span className="text-[13px] font-bold text-[var(--text-main)]">{u.username}</span>
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <select 
            value={cargoSelecionado} 
            onChange={(e) => setCargoSelecionado(e.target.value)}
            disabled={salvando}
            className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-main)] bg-[var(--bg-main)] border border-[var(--border-color)] px-2.5 py-1.5 rounded-md focus:outline-none focus:border-blue-500 transition-colors cursor-pointer disabled:opacity-50 min-w-[120px]"
          >
            <option value="">SEM CARGO</option>
            {cargos.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.nome}</option>
            ))}
          </select>

          {/* 🚀 ALTERAÇÃO: Botão garantido e formatado fielmente ao layout do screenshot */}
          {mudou && (
            <button 
              onClick={onSave}
              disabled={salvando}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all animate-in fade-in zoom-in disabled:opacity-50"
            >
              {salvando ? '⏳' : 'SALVAR'}
            </button>
          )}
        </div>
      </td>
      <td className="p-4">
        {u.precisaMudarSenha ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded shadow-sm">Troca Pendente</span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded shadow-sm">Atualizada</span>
        )}
      </td>
      <td className="p-4 text-right">
        <button onClick={() => handleExcluirUsuario(u.id, u.username)} title="Revogar Acesso" className="text-[var(--text-muted)] hover:text-rose-500 p-2 rounded-lg hover:bg-rose-500/10 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
        </button>
      </td>
    </tr>
  );
}

export default function Configuracoes() {
  const { theme, setTheme, radius, setRadius } = useTheme();
  const toast = useToast();
  
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [carregandoSenha, setCarregandoSenha] = useState(false);

  const [isPermissoesModalOpen, setIsPermissoesModalOpen] = useState(false);
  
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [usuariosMatriz, setUsuariosMatriz] = useState<Usuario[]>([]);
  const [cargoSelecionadoId, setCargoSelecionadoId] = useState<number | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'acessos' | 'usuarios'>('acessos');
  const [permissoesEditadas, setPermissoesEditadas] = useState<string[]>([]);
  const [isCriandoCargo, setIsCriandoCargo] = useState(false);
  const [novoCargoNome, setNovoCargoNome] = useState('');

  const [isUsuariosModalOpen, setIsUsuariosModalOpen] = useState(false);
  const [isCriandoUsuario, setIsCriandoUsuario] = useState(false);
  const [listaUsuarios, setListaUsuarios] = useState<Usuario[]>([]);
  const [formUsuario, setFormUsuario] = useState({ username: '', senha: '', cargoId: '' });
  const [carregandoDados, setCarregandoDados] = useState(false);

  const cargoUsuario = localStorage.getItem('wms_cargo') || '';
  const isDev = cargoUsuario.toUpperCase() === 'DEV';
  
  const permissoesSalvas = localStorage.getItem('wms_permissoes');
  const permissoesAtuais: string[] = permissoesSalvas ? JSON.parse(permissoesSalvas) : [];

  const podeGerenciarCargos = isDev || permissoesAtuais.includes('acessos:cargos');
  const podeGerenciarUsuarios = isDev || permissoesAtuais.includes('acessos:usuarios');

  useEffect(() => {
    carregarCargos();
  }, []);

  useEffect(() => {
    if (isPermissoesModalOpen) carregarCargos();
  }, [isPermissoesModalOpen]);

  useEffect(() => {
    if (isUsuariosModalOpen) carregarUsuariosLista();
  }, [isUsuariosModalOpen]);

  useEffect(() => {
    const cargo = cargos.find(c => c.id === cargoSelecionadoId);
    if (cargo) setPermissoesEditadas(cargo.permissoes || []);
  }, [cargoSelecionadoId, cargos]);

  const carregarCargos = async () => {
    try {
      const token = localStorage.getItem('wms_token');
      const response = await fetch(`${API_URL}/cargos`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Falha ao carregar a matriz de cargos.');
      const data = await response.json();
      setCargos(data.cargos);
      setUsuariosMatriz(data.usuarios);
      if (data.cargos.length > 0 && !cargoSelecionadoId) setCargoSelecionadoId(data.cargos[0].id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar cargos.');
    }
  };

  const carregarUsuariosLista = async () => {
    setCarregandoDados(true);
    try {
      const token = localStorage.getItem('wms_token');
      const response = await fetch(`${API_URL}/usuarios`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Erro ao carregar usuários.');
      const data = await response.json();
      setListaUsuarios(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar lista de usuários.');
    } finally {
      setCarregandoDados(false);
    }
  };

  const handleCriarUsuario = async (e: FormEvent) => {
    e.preventDefault();
    if (!formUsuario.username || !formUsuario.senha) return toast.error('Preencha os campos obrigatórios!');
    
    try {
      const token = localStorage.getItem('wms_token');
      const response = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formUsuario)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao criar usuário.');
      
      toast.success(data.mensagem);
      setFormUsuario({ username: '', senha: '', cargoId: '' });
      setIsCriandoUsuario(false);
      carregarUsuariosLista();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado.');
    }
  };

  const handleAtualizarCargoUsuario = async (usuarioId: number, novoCargoId: string) => {
    try {
      const token = localStorage.getItem('wms_token');
      
      // 🚀 ALTERAÇÃO: Tratando a string vinda do frontend e enviando o 'Int' correto exigido pelo Prisma
      const payloadCargoId = novoCargoId ? parseInt(novoCargoId, 10) : null;

      const response = await fetch(`${API_URL}/usuarios/${usuarioId}/cargo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ cargoId: payloadCargoId })
      });
      
      if (!response.ok) throw new Error('O banco de dados rejeitou a atualização. Verifique a tipagem.');
      
      toast.success('Função do usuário atualizada com sucesso!');
      await carregarUsuariosLista(); 
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado ao salvar.');
      await carregarUsuariosLista(); 
    }
  };

  const handleExcluirUsuario = async (id: number, username: string) => {
    const confirmou = await toast.confirm(`Deseja realmente remover o acesso do operador "${username}"?`);
    if (!confirmou) return;

    try {
      const token = localStorage.getItem('wms_token');
      const response = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Erro ao excluir usuário.');
      toast.success('Usuário removido do sistema.');
      carregarUsuariosLista();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado.');
    }
  };

  const handleSalvarNovoCargo = async (e: FormEvent) => {
    e.preventDefault();
    if (!novoCargoNome.trim()) return toast.error('Digite o nome da função antes de salvar.');
    try {
      const token = localStorage.getItem('wms_token');
      const response = await fetch(`${API_URL}/cargos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nome: novoCargoNome })
      });
      if (!response.ok) throw new Error('Erro ao criar cargo.');
      const novoCargo = await response.json();
      toast.success(`Cargo ${novoCargo.nome} criado!`);
      setNovoCargoNome('');
      setIsCriandoCargo(false);
      carregarCargos(); 
      setCargoSelecionadoId(novoCargo.id);
    } catch (err) { 
      toast.error(err instanceof Error ? err.message : 'Erro inesperado.');
    }
  };

  const handleTogglePermissao = (tag: string) => {
    setPermissoesEditadas(prev => prev.includes(tag) ? prev.filter(p => p !== tag) : [...prev, tag]);
  };

  const handleSalvarPermissoes = async () => {
    if (!cargoSelecionadoId) return;
    try {
      const token = localStorage.getItem('wms_token');
      const response = await fetch(`${API_URL}/cargos/${cargoSelecionadoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ permissoes: permissoesEditadas })
      });
      if (!response.ok) throw new Error('Erro ao salvar permissões.');
      toast.success('Permissões do cargo salvas!');
      carregarCargos();
    } catch (err) { 
      toast.error(err instanceof Error ? err.message : 'Erro inesperado.');
    }
  };

  const handleExcluirCargo = async () => {
    const cargo = cargos.find(c => c.id === cargoSelecionadoId);
    if (!cargo) return;

    const confirmou = await toast.confirm(`Deseja realmente excluir o cargo ${cargo.nome}? Usuários vinculados perderão o acesso.`);
    if (confirmou) {
      try {
        const token = localStorage.getItem('wms_token');
        const response = await fetch(`${API_URL}/cargos/${cargo.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Erro ao excluir cargo.');
        toast.success('Cargo excluído permanentemente.');
        setCargoSelecionadoId(null);
        carregarCargos();
      } catch (err) { 
        toast.error(err instanceof Error ? err.message : 'Erro inesperado.');
      }
    }
  };

  const handleAlterarSenha = async (e: FormEvent) => {
    e.preventDefault();
    if (!senhaAtual || novaSenha.length < 4) return toast.error('Preencha os campos (Mín. 4 caracteres).');
    setCarregandoSenha(true);
    try {
       const token = localStorage.getItem('wms_token');
       const response = await fetch(`${API_URL}/auth/alterar-senha-autenticado`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ senhaAtual, novaSenha })
       });
       if (!response.ok) throw new Error('Erro ao alterar a senha.');
       toast.success('Senha alterada com sucesso!');
       setSenhaAtual(''); setNovaSenha('');
    } catch (err) { 
      toast.error(err instanceof Error ? err.message : 'Erro inesperado.'); 
    } finally { 
      setCarregandoSenha(false); 
    }
  };

  const cargoAtual = cargos.find(c => c.id === cargoSelecionadoId);
  const usuariosDoCargo = usuariosMatriz.filter(u => u.cargoId === cargoSelecionadoId);

  return (
    <div className="min-h-full pb-20 animate-in fade-in duration-300">
      <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-12">
        
        <div className="flex items-center gap-5 border-b border-[var(--border-color)] pb-8">
          <div className="h-16 w-16 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-color)] flex items-center justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[var(--text-muted)]"><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854-.107-1.204l-.527-.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)]">Configurações</h1>
            <p className="text-[15px] font-medium text-[var(--text-muted)] mt-1">Gerencie suas preferências e acompanhe as atualizações da plataforma.</p>
          </div>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 border-b border-[var(--border-color)] pb-12">
          <div className="col-span-1">
            <h2 className="text-lg font-bold text-[var(--text-main)]">Aparência e Estilo</h2>
            <p className="text-[13px] leading-relaxed font-medium text-[var(--text-muted)] mt-2">Personalize as cores e as bordas da interface. A alteração é salva automaticamente.</p>
          </div>
          <div className="col-span-1 lg:col-span-2 space-y-8">
            <div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block mb-4">Paleta de Cores</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button onClick={() => setTheme('ocean')} className={`flex flex-col text-left rounded-xl border p-2 transition-all ${theme === 'ocean' ? 'border-blue-600 bg-blue-600/5 ring-1 ring-blue-600' : 'border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-[var(--text-muted)]'}`}>
                  <div className="h-20 w-full rounded-lg mb-3 relative bg-[#ffffff] border border-[#e2e8f0]">
                    {theme === 'ocean' && <svg className="w-5 h-5 text-blue-600 absolute top-2 right-2" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                  </div>
                  <span className={`px-2 pb-1.5 text-[13px] font-bold ${theme === 'ocean' ? 'text-blue-600' : 'text-[var(--text-main)]'}`}>Ocean (Light)</span>
                </button>
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
                  <div className={`h-4 w-4 border-2 ${radius === 'sharp' ? 'border-blue-600' : 'border-[var(--text-muted)]'}`}></div>Sharp (Reto)
                  {radius === 'sharp' && <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                </button>
                <button onClick={() => setRadius('modern')} className={`flex items-center gap-3 w-full py-4 px-4 rounded-xl border text-[13px] font-bold transition-all ${radius === 'modern' ? 'border-blue-600 text-blue-600 bg-blue-600/5 ring-1 ring-blue-600' : 'border-[var(--border-color)] bg-[var(--bg-panel)] text-[var(--text-main)] hover:border-[var(--text-muted)]'}`}>
                  <div className={`h-4 w-4 rounded-md border-2 ${radius === 'modern' ? 'border-blue-600' : 'border-[var(--text-muted)]'}`}></div>Modern (Padrão)
                  {radius === 'modern' && <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                </button>
                <button onClick={() => setRadius('soft')} className={`flex items-center gap-3 w-full py-4 px-4 rounded-xl border text-[13px] font-bold transition-all ${radius === 'soft' ? 'border-blue-600 text-blue-600 bg-blue-600/5 ring-1 ring-blue-600' : 'border-[var(--border-color)] bg-[var(--bg-panel)] text-[var(--text-main)] hover:border-[var(--text-muted)]'}`}>
                  <div className={`h-4 w-4 rounded-full border-2 ${radius === 'soft' ? 'border-blue-600' : 'border-[var(--text-muted)]'}`}></div>Soft
                  {radius === 'soft' && <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 border-b border-[var(--border-color)] pb-12">
          <div className="col-span-1">
            <h2 className="text-lg font-bold text-[var(--text-main)]">Segurança Pessoal</h2>
            <p className="text-[13px] leading-relaxed font-medium text-[var(--text-muted)] mt-2">Atualize a sua senha pessoal de acesso ao sistema WMS.</p>
          </div>
          <div className="col-span-1 lg:col-span-2">
            <form onSubmit={handleAlterarSenha} className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Senha Atual</label>
                <input type="password" required value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} className="w-full bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-color)] rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Nova Senha</label>
                <input type="password" required minLength={4} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} className="w-full bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-color)] rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="Mínimo 4 caracteres" />
              </div>
              <div className="pt-3">
                <button type="submit" disabled={carregandoSenha || !senhaAtual || novaSenha.length < 4} className="px-6 py-3.5 text-[11px] tracking-wider font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl shadow-sm transition-all uppercase w-full">
                  {carregandoSenha ? 'Salvando...' : 'Confirmar Alteração'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {podeGerenciarCargos && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 border-b border-[var(--border-color)] pb-12">
            <div className="col-span-1">
              <h2 className="text-lg font-bold text-[var(--text-main)]">Cargos e Permissões</h2>
              <p className="text-[13px] leading-relaxed font-medium text-[var(--text-muted)] mt-2">Crie cargos customizados e defina o que cada perfil pode acessar.</p>
            </div>
            <div className="col-span-1 lg:col-span-2">
              <button onClick={() => setIsPermissoesModalOpen(true)} className="w-full flex items-center justify-between p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-blue-500 hover:shadow-sm transition-all text-left group">
                  <div className="flex items-center gap-5">
                      <div className="h-12 w-12 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-blue-600 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div>
                          <h3 className="font-bold text-[var(--text-main)] text-[15px]">Matriz de Permissões</h3>
                          <p className="text-[13px] font-medium text-[var(--text-muted)] mt-0.5">Definir restrições operacionais da malha.</p>
                      </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-[var(--text-muted)] group-hover:text-blue-600 transition-colors"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </div>
          </section>
        )}

        {podeGerenciarUsuarios && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 pb-12">
            <div className="col-span-1">
              <h2 className="text-lg font-bold text-[var(--text-main)]">Equipe e Operadores</h2>
              <p className="text-[13px] leading-relaxed font-medium text-[var(--text-muted)] mt-2">Crie novos usuários, atribua os cargos e controle o acesso geral do sistema.</p>
            </div>
            <div className="col-span-1 lg:col-span-2">
              <button onClick={() => setIsUsuariosModalOpen(true)} className="w-full flex items-center justify-between p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-blue-500 hover:shadow-sm transition-all text-left group">
                  <div className="flex items-center gap-5">
                      <div className="h-12 w-12 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-blue-600 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                      </div>
                      <div>
                          <h3 className="font-bold text-[var(--text-main)] text-[15px]">Gestão de Usuários</h3>
                          <p className="text-[13px] font-medium text-[var(--text-muted)] mt-0.5">Visualizar equipe e adicionar operadores.</p>
                      </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-[var(--text-muted)] group-hover:text-blue-600 transition-colors"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </div>
          </section>
        )}

      </div>

      {isPermissoesModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-200" onClick={() => setIsPermissoesModalOpen(false)}>
          <div className="w-full max-w-6xl h-[85vh] bg-[var(--bg-panel)] rounded-2xl flex flex-col overflow-hidden relative border border-[var(--border-color)] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-panel)] shrink-0 z-10 relative">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-muted)] shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[var(--text-main)] tracking-tight">Matriz de Permissões</h2>
                  <p className="text-sm font-medium text-[var(--text-muted)] mt-0.5">Configure os acessos operacionais e vincule sua equipe.</p>
                </div>
              </div>
              <button onClick={() => setIsPermissoesModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-2 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-80 border-r border-[var(--border-color)] bg-[var(--bg-panel)] flex flex-col shrink-0">
                <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-main)]/50">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Cargos ({cargos.length})</span>
                  <button onClick={() => setIsCriandoCargo(true)} className="text-[11px] font-bold text-[var(--text-main)] hover:text-blue-600 uppercase tracking-wider flex items-center gap-1 transition-colors">
                    <span className="text-lg leading-none">+</span> Novo
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  
                  {isCriandoCargo && (
                    <form onSubmit={handleSalvarNovoCargo} className="p-3 mb-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] shadow-sm animate-in fade-in zoom-in-95">
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                        Nome da Função
                      </label>
                      <input 
                        type="text" 
                        autoFocus 
                        placeholder="Ex: DEV, CONFERENTE..." 
                        value={novoCargoNome} 
                        onChange={(e) => setNovoCargoNome(e.target.value)} 
                        className="w-full bg-[var(--bg-panel)] text-[var(--text-main)] border border-blue-500 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                      />
                      <div className="flex gap-2 mt-3">
                        <button 
                          type="button" 
                          onClick={() => setIsCriandoCargo(false)} 
                          className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:bg-[var(--border-color)] rounded-lg transition-colors border border-transparent"
                        >
                          Cancelar
                        </button>
                        <button 
                          type="submit" 
                          disabled={!novoCargoNome.trim()}
                          className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                        >
                          Salvar Função
                        </button>
                      </div>
                    </form>
                  )}

                  {cargos.map(cargo => {
                    const isSelected = cargoSelecionadoId === cargo.id;
                    const qtdUsuarios = cargo._count?.usuarios || 0;
                    return (
                      <button key={cargo.id} onClick={() => setCargoSelecionadoId(cargo.id)} className={`w-full text-left p-4 rounded-xl flex items-center justify-between transition-all border ${isSelected ? 'bg-[var(--text-main)] border-[var(--text-main)] text-[var(--bg-panel)] shadow-md' : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-[var(--text-main)] hover:border-[var(--text-muted)] hover:shadow-sm'}`}>
                        <span className="text-[13px] font-bold uppercase tracking-wide truncate pr-2">{cargo.nome}</span>
                        <div className="flex gap-2 opacity-90 shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${isSelected ? 'bg-[var(--bg-main)]/20 text-[var(--bg-panel)]' : 'bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-muted)]'}`}>{cargo.permissoes.length} perms</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1 ${isSelected ? 'bg-[var(--bg-main)]/20 text-[var(--bg-panel)]' : 'bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-muted)]'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-3 h-3"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg>{qtdUsuarios}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-[var(--bg-main)] overflow-hidden">
                <div className="px-10 pt-8 pb-4 shrink-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold text-[var(--text-main)] uppercase tracking-tight">{cargoAtual?.nome}</h3>
                        {cargoAtual && (
                          <button onClick={handleExcluirCargo} title="Excluir Cargo" className="text-[var(--text-muted)] hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-rose-500/10">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          </button>
                        )}
                      </div>
                      <p className="text-[13px] font-medium text-[var(--text-muted)] mt-1">Configure os módulos e permissões de acesso deste perfil.</p>
                    </div>
                    <button onClick={handleSalvarPermissoes} className="flex items-center gap-2 bg-[var(--text-main)] text-[var(--bg-panel)] px-6 py-3.5 rounded-xl font-bold text-[13px] tracking-wider uppercase hover:opacity-90 shadow-md transition-opacity">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                      Salvar Permissões
                    </button>
                  </div>
                  <div className="flex gap-8 mt-8 border-b border-[var(--border-color)]">
                    <button onClick={() => setAbaAtiva('acessos')} className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'acessos' ? 'border-[var(--text-main)] text-[var(--text-main)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>Acessos do Cargo</button>
                    <button onClick={() => setAbaAtiva('usuarios')} className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'usuarios' ? 'border-[var(--text-main)] text-[var(--text-main)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                      Usuários Vinculados <span className={`px-2 py-0.5 rounded-full text-[10px] ml-1 ${abaAtiva === 'usuarios' ? 'bg-[var(--text-main)] text-[var(--bg-panel)]' : 'bg-[var(--bg-panel)] border border-[var(--border-color)]'}`}>{usuariosDoCargo.length}</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-10 pb-10 space-y-10 custom-scrollbar">
                  {abaAtiva === 'acessos' && (
                    MODULOS_SISTEMA.map(grupo => (
                      <div key={grupo.grupo} className="space-y-4">
                        <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2">{grupo.grupo}</h4>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {grupo.itens.map(item => {
                            const isChecked = permissoesEditadas.includes(item.tag);
                            
                            return (
                              <label key={item.id} className={`flex items-start gap-4 p-5 rounded-xl border bg-[var(--bg-panel)] cursor-pointer transition-colors shadow-sm group ${isChecked ? 'border-blue-500 bg-blue-500/5' : 'border-[var(--border-color)] hover:border-blue-300'}`}>
                                <input type="checkbox" checked={isChecked} onChange={() => handleTogglePermissao(item.tag)} className="mt-1 flex-shrink-0 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer" />
                                <div className="flex flex-col gap-2">
                                  <span className="text-[13px] font-bold text-[var(--text-main)] group-hover:text-blue-600 transition-colors leading-snug">{item.titulo}</span>
                                  <span className="inline-flex text-[9px] font-mono font-bold text-[var(--text-muted)] bg-[var(--bg-main)] px-2 py-0.5 rounded border border-[var(--border-color)] w-max">{item.tag}</span>
                                </div>
                              </label>
                            );  
                          })}
                        </div>
                      </div>
                    ))
                  )}

                  {abaAtiva === 'usuarios' && (
                     <div className="space-y-3">
                       {usuariosDoCargo.length === 0 ? (
                         <div className="text-center py-20">
                           <p className="text-sm font-medium text-[var(--text-muted)] mt-4">Nenhum usuário vinculado a este cargo.</p>
                         </div>
                       ) : (
                         usuariosDoCargo.map(u => (
                           <div key={u.id} className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-panel)] shadow-sm">
                             <div className="flex items-center gap-4">
                               <div className="h-10 w-10 rounded-full bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center font-bold text-[var(--text-main)]">
                                 {u.username.charAt(0).toUpperCase()}
                               </div>
                               <div>
                                 <p className="text-[13px] font-bold text-[var(--text-main)]">{u.username}</p>
                               </div>
                             </div>
                           </div>
                         ))
                       )}
                     </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isUsuariosModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsUsuariosModalOpen(false)}>
          <div className="w-full max-w-4xl max-h-[85vh] bg-[var(--bg-panel)] rounded-2xl flex flex-col overflow-hidden relative border border-[var(--border-color)] shadow-2xl" onClick={e => e.stopPropagation()}>
            
            <div className="px-8 py-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-panel)] shrink-0 z-10">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-muted)] shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[var(--text-main)] tracking-tight">Gestão de Operadores</h2>
                  <p className="text-sm font-medium text-[var(--text-muted)] mt-0.5">Cadastre a sua equipe e gerencie credenciais.</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {!isCriandoUsuario && (
                  <button onClick={() => setIsCriandoUsuario(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-lg shadow-sm transition-all">
                    + Novo Usuário
                  </button>
                )}
                <button onClick={() => setIsUsuariosModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-2 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-[var(--bg-main)] custom-scrollbar">
              
              {isCriandoUsuario && (
                <div className="mb-8 p-6 bg-[var(--bg-panel)] border border-blue-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-4">
                  <h3 className="text-sm font-bold text-[var(--text-main)] mb-4">Criar Novo Acesso</h3>
                  <form onSubmit={handleCriarUsuario} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Usuário</label>
                      <input type="text" required value={formUsuario.username} onChange={e => setFormUsuario({...formUsuario, username: e.target.value})} className="w-full bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-all" placeholder="Ex: joao.silva" />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Senha Provisória</label>
                      <input type="text" required value={formUsuario.senha} onChange={e => setFormUsuario({...formUsuario, senha: e.target.value})} className="w-full bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-all" placeholder="******" />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Cargo Inicial</label>
                      <select value={formUsuario.cargoId} onChange={e => setFormUsuario({...formUsuario, cargoId: e.target.value})} className="w-full bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-all">
                        <option value="">(Sem Cargo)</option>
                        {cargos.map(c => <option key={c.id} value={String(c.id)}>{c.nome}</option>)}
                      </select>
                    </div>
                    <div className="col-span-1 flex gap-2">
                      <button type="button" onClick={() => setIsCriandoUsuario(false)} className="flex-1 py-2.5 border border-[var(--border-color)] text-[var(--text-muted)] rounded-lg text-xs font-bold uppercase transition-colors hover:bg-[var(--border-color)]">Cancelar</button>
                      <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase transition-colors shadow-sm">Salvar</button>
                    </div>
                  </form>
                  <p className="text-[10px] text-[var(--text-muted)] mt-3">A senha criada é provisória. O operador será forçado a alterá-la no primeiro acesso.</p>
                </div>
              )}

              <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                      <th className="p-4">Usuário</th>
                      <th className="p-4">Cargo Atual</th>
                      <th className="p-4">Status da Senha</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carregandoDados ? (
                      <tr><td colSpan={4} className="p-8 text-center text-sm text-[var(--text-muted)]">Carregando usuários...</td></tr>
                    ) : listaUsuarios.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-sm text-[var(--text-muted)]">Nenhum usuário cadastrado.</td></tr>
                    ) : (
                      listaUsuarios.map(u => (
                        <UserTableRow 
                          key={u.id} 
                          u={u} 
                          cargos={cargos} 
                          handleAtualizarCargoUsuario={handleAtualizarCargoUsuario} 
                          handleExcluirUsuario={handleExcluirUsuario} 
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}