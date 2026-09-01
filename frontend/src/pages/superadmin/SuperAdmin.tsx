import { useEffect, useState, type FormEvent } from 'react';
import { useToast } from '../../contexts/toastContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Tenant {
  id: number;
  nome: string;
  slug: string;
  status: 'ATIVO' | 'SUSPENSO';
  createdAt: string;
  _count?: { usuarios: number; pallets: number; recebimentos: number };
}

interface UsuarioGlobal {
  id: number;
  username: string;
  isSuperAdmin: boolean;
  precisaMudarSenha: boolean;
  createdAt: string;
  tenant: { id: number; nome: string; slug: string } | null;
  cargo: { nome: string } | null;
}

const fmtData = (v: string) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');

function api(path: string, init?: RequestInit) {
  const token = localStorage.getItem('wms_token');
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });
}

const input = 'w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-main)] px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors';
const label = 'block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1';
const btn = 'bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm px-4 py-2 transition-colors disabled:opacity-60';

export default function SuperAdmin() {
  const toast = useToast();
  const [aba, setAba] = useState<'empresas' | 'usuarios'>('empresas');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioGlobal[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [novaEmpresa, setNovaEmpresa] = useState({ nome: '', slug: '', adminUsername: '', adminSenha: '' });
  const [criandoEmpresa, setCriandoEmpresa] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nomeEdit, setNomeEdit] = useState('');
  const [addUserPara, setAddUserPara] = useState<Tenant | null>(null);
  const [novoUser, setNovoUser] = useState({ username: '', senha: '', comoAdmin: true });

  const carregar = async () => {
    setCarregando(true);
    try {
      const [t, u] = await Promise.all([api('/superadmin/tenants'), api('/superadmin/usuarios')]);
      if (t.ok) setTenants((await t.json()).tenants || []);
      if (u.ok) setUsuarios((await u.json()).usuarios || []);
    } catch {
      toast.error('Falha ao carregar dados da plataforma.');
    } finally {
      setCarregando(false);
    }
  };
  useEffect(() => { carregar(); }, []);

  const criarEmpresa = async (e: FormEvent) => {
    e.preventDefault();
    if (!novaEmpresa.nome.trim() || !novaEmpresa.adminUsername.trim() || !novaEmpresa.adminSenha) {
      return toast.error('Preencha nome, usuário admin e senha.');
    }
    setCriandoEmpresa(true);
    try {
      const r = await api('/superadmin/tenants', { method: 'POST', body: JSON.stringify(novaEmpresa) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(d.mensagem || 'Empresa criada.');
      setNovaEmpresa({ nome: '', slug: '', adminUsername: '', adminSenha: '' });
      carregar();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar empresa.');
    } finally {
      setCriandoEmpresa(false);
    }
  };

  const salvarNome = async (id: number) => {
    if (!nomeEdit.trim()) return;
    try {
      const r = await api(`/superadmin/tenants/${id}`, { method: 'PATCH', body: JSON.stringify({ nome: nomeEdit.trim() }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success('Nome da empresa atualizado.');
      setEditandoId(null);
      carregar();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao renomear.');
    }
  };

  const criarUsuario = async (e: FormEvent) => {
    e.preventDefault();
    if (!addUserPara || !novoUser.username.trim() || !novoUser.senha) return toast.error('Preencha usuário e senha.');
    try {
      const r = await api(`/superadmin/tenants/${addUserPara.id}/usuarios`, { method: 'POST', body: JSON.stringify(novoUser) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(d.mensagem || 'Usuário criado.');
      setAddUserPara(null);
      setNovoUser({ username: '', senha: '', comoAdmin: true });
      carregar();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar usuário.');
    }
  };

  return (
    <div className="min-h-full bg-[var(--bg-main)] text-[var(--text-main)] p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="border-b border-[var(--border-color)] pb-5 mb-6">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Plataforma</span>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight mt-1">Administração</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Empresas cadastradas e usuários de toda a plataforma.</p>
        </div>

        <div className="flex gap-6 border-b border-[var(--border-color)] mb-6">
          {(['empresas', 'usuarios'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setAba(k)}
              className={`pb-3 -mb-px text-sm font-bold border-b-2 transition-colors ${aba === k ? 'border-blue-600 text-[var(--text-main)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
            >
              {k === 'empresas' ? `Empresas (${tenants.length})` : `Usuários (${usuarios.length})`}
            </button>
          ))}
        </div>

        {carregando && <p className="text-sm text-[var(--text-muted)] py-10 text-center">Carregando...</p>}

        {/* ================= EMPRESAS ================= */}
        {!carregando && aba === 'empresas' && (
          <div className="space-y-6">
            <form onSubmit={criarEmpresa} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 md:p-5 shadow-sm">
              <h2 className="text-sm font-bold mb-4">Nova empresa</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div><label className={label}>Nome da empresa *</label><input className={input} value={novaEmpresa.nome} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, nome: e.target.value })} placeholder="Ex.: Loja Central" /></div>
                <div><label className={label}>Slug (opcional)</label><input className={input} value={novaEmpresa.slug} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, slug: e.target.value })} placeholder="loja-central" /></div>
                <div><label className={label}>Usuário admin *</label><input className={input} value={novaEmpresa.adminUsername} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, adminUsername: e.target.value })} placeholder="admin.loja" /></div>
                <div><label className={label}>Senha provisória *</label><input className={input} value={novaEmpresa.adminSenha} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, adminSenha: e.target.value })} placeholder="******" /></div>
              </div>
              <button type="submit" disabled={criandoEmpresa} className={`${btn} mt-4`}>{criandoEmpresa ? 'Criando...' : 'Criar empresa'}</button>
            </form>

            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-[var(--bg-main)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                      <th className="text-left p-3">Empresa</th>
                      <th className="text-left p-3">Slug</th>
                      <th className="text-left p-3">Usuários</th>
                      <th className="text-left p-3">Pallets</th>
                      <th className="text-left p-3">Criada</th>
                      <th className="text-right p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => (
                      <tr key={t.id} className="border-t border-[var(--border-color)]">
                        <td className="p-3">
                          {editandoId === t.id ? (
                            <div className="flex items-center gap-2">
                              <input autoFocus className={`${input} py-1`} value={nomeEdit} onChange={(e) => setNomeEdit(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && salvarNome(t.id)} />
                              <button onClick={() => salvarNome(t.id)} className="text-xs font-bold text-blue-600">salvar</button>
                              <button onClick={() => setEditandoId(null)} className="text-xs text-[var(--text-muted)]">cancelar</button>
                            </div>
                          ) : (
                            <span className="font-semibold">{t.nome}</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-xs text-[var(--text-muted)]">{t.slug}</td>
                        <td className="p-3">{t._count?.usuarios ?? '—'}</td>
                        <td className="p-3">{t._count?.pallets ?? '—'}</td>
                        <td className="p-3 text-[var(--text-muted)]">{fmtData(t.createdAt)}</td>
                        <td className="p-3">
                          <div className="flex justify-end gap-3 text-xs font-bold">
                            <button onClick={() => { setEditandoId(t.id); setNomeEdit(t.nome); }} className="text-blue-600 hover:underline">Renomear</button>
                            <button onClick={() => { setAddUserPara(t); setNovoUser({ username: '', senha: '', comoAdmin: true }); }} className="text-blue-600 hover:underline">+ Usuário</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= USUÁRIOS ================= */}
        {!carregando && aba === 'usuarios' && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="bg-[var(--bg-main)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    <th className="text-left p-3">Usuário</th>
                    <th className="text-left p-3">Empresa</th>
                    <th className="text-left p-3">Cargo</th>
                    <th className="text-left p-3">Senha</th>
                    <th className="text-left p-3">Criado</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} className="border-t border-[var(--border-color)]">
                      <td className="p-3 font-semibold">
                        {u.username}
                        {u.isSuperAdmin && <span className="ml-2 text-[9px] font-bold uppercase text-amber-600 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">super-admin</span>}
                      </td>
                      <td className="p-3">{u.tenant?.nome || <span className="text-[var(--text-muted)]">—</span>}</td>
                      <td className="p-3 text-[var(--text-muted)]">{u.cargo?.nome || '—'}</td>
                      <td className="p-3">
                        {u.precisaMudarSenha
                          ? <span className="text-[10px] font-bold uppercase text-amber-600">troca pendente</span>
                          : <span className="text-[10px] font-bold uppercase text-emerald-600">definida</span>}
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">{fmtData(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal: adicionar usuário a uma empresa */}
      {addUserPara && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setAddUserPara(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={criarUsuario} className="w-full max-w-md bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-2xl p-5 md:p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold">Novo usuário</h3>
              <p className="text-sm text-[var(--text-muted)]">Empresa: <strong className="text-[var(--text-main)]">{addUserPara.nome}</strong></p>
            </div>
            <div><label className={label}>Usuário *</label><input autoFocus className={input} value={novoUser.username} onChange={(e) => setNovoUser({ ...novoUser, username: e.target.value })} /></div>
            <div><label className={label}>Senha provisória *</label><input className={input} value={novoUser.senha} onChange={(e) => setNovoUser({ ...novoUser, senha: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={novoUser.comoAdmin} onChange={(e) => setNovoUser({ ...novoUser, comoAdmin: e.target.checked })} className="w-4 h-4 rounded accent-blue-600" />
              Já entra como <strong>admin</strong> da empresa
            </label>
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setAddUserPara(null)} className="text-sm font-bold text-[var(--text-muted)] px-4 py-2">Cancelar</button>
              <button type="submit" className={btn}>Criar usuário</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
