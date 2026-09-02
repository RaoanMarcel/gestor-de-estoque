import { Fragment, useEffect, useState, type FormEvent } from 'react';
import { useToast } from '../../contexts/toastContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Tenant {
  id: number;
  nome: string;
  slug: string;
  status: 'ATIVO' | 'SUSPENSO';
  modulos: string[];
  createdAt: string;
  _count?: { usuarios: number; pallets: number; recebimentos: number };
}

interface Modulo {
  chave: string;
  nome: string;
  disponivel: boolean;
}

interface UsuarioTenant {
  id: number;
  username: string;
  precisaMudarSenha: boolean;
  createdAt: string;
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
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [catalogo, setCatalogo] = useState<Modulo[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [novaEmpresa, setNovaEmpresa] = useState({ nome: '', slug: '', adminUsername: '', adminSenha: '' });
  const [novaModulos, setNovaModulos] = useState<string[]>([]);
  const [criandoEmpresa, setCriandoEmpresa] = useState(false);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nomeEdit, setNomeEdit] = useState('');

  const [expandido, setExpandido] = useState<number | null>(null);
  const [usuariosDe, setUsuariosDe] = useState<Record<number, UsuarioTenant[]>>({});
  const [carregandoUsuarios, setCarregandoUsuarios] = useState<number | null>(null);
  const [novoUser, setNovoUser] = useState({ username: '', senha: '', comoAdmin: true });
  const [criandoUser, setCriandoUser] = useState(false);

  const [modulosDe, setModulosDe] = useState<Tenant | null>(null);
  const [modulosEdit, setModulosEdit] = useState<string[]>([]);
  const [salvandoModulos, setSalvandoModulos] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    try {
      const t = await api('/superadmin/tenants');
      if (!t.ok) throw new Error('tenants ' + t.status);
      setTenants((await t.json()).tenants || []);

      const m = await api('/superadmin/modulos');
      if (!m.ok) throw new Error('modulos ' + m.status);
      const cat: Modulo[] = (await m.json()).modulos || [];
      setCatalogo(cat);
      setNovaModulos((prev) => (prev.length ? prev : cat.filter((x) => x.disponivel).map((x) => x.chave)));
    } catch (e: any) {
      toast.error('Falha ao carregar dados da plataforma.' + (e?.message ? ` (${e.message})` : ''));
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
      const r = await api('/superadmin/tenants', { method: 'POST', body: JSON.stringify({ ...novaEmpresa, modulos: novaModulos }) });
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

  const abrirUsuarios = async (id: number) => {
    if (expandido === id) { setExpandido(null); return; }
    setExpandido(id);
    setNovoUser({ username: '', senha: '', comoAdmin: true });
    if (!usuariosDe[id]) await recarregarUsuarios(id);
  };

  const recarregarUsuarios = async (id: number) => {
    setCarregandoUsuarios(id);
    try {
      const r = await api(`/superadmin/tenants/${id}/usuarios`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setUsuariosDe((prev) => ({ ...prev, [id]: d.usuarios || [] }));
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar usuários.');
    } finally {
      setCarregandoUsuarios(null);
    }
  };

  const criarUsuario = async (e: FormEvent, tenantId: number) => {
    e.preventDefault();
    if (!novoUser.username.trim() || !novoUser.senha) return toast.error('Preencha usuário e senha.');
    setCriandoUser(true);
    try {
      const r = await api(`/superadmin/tenants/${tenantId}/usuarios`, { method: 'POST', body: JSON.stringify(novoUser) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(d.mensagem || 'Usuário criado.');
      setNovoUser({ username: '', senha: '', comoAdmin: true });
      await recarregarUsuarios(tenantId);
      carregar();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar usuário.');
    } finally {
      setCriandoUser(false);
    }
  };

  const removerUsuario = async (tenantId: number, usuarioId: number, username: string) => {
    if (!confirm(`Remover o usuário "${username}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const r = await api(`/superadmin/tenants/${tenantId}/usuarios/${usuarioId}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success('Usuário removido.');
      await recarregarUsuarios(tenantId);
      carregar();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover usuário.');
    }
  };

  const abrirModulos = (t: Tenant) => {
    setModulosDe(t);
    setModulosEdit([...t.modulos]);
  };

  const toggleModulo = (chave: string) => {
    setModulosEdit((prev) => (prev.includes(chave) ? prev.filter((c) => c !== chave) : [...prev, chave]));
  };

  const salvarModulos = async () => {
    if (!modulosDe) return;
    setSalvandoModulos(true);
    try {
      const r = await api(`/superadmin/tenants/${modulosDe.id}`, { method: 'PATCH', body: JSON.stringify({ modulos: modulosEdit }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success('Módulos atualizados.');
      setModulosDe(null);
      carregar();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar módulos.');
    } finally {
      setSalvandoModulos(false);
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
          <p className="text-sm text-[var(--text-muted)] mt-1">Empresas cadastradas na plataforma. Clique numa empresa para ver e criar os usuários dela.</p>
        </div>

        {carregando && <p className="text-sm text-[var(--text-muted)] py-10 text-center">Carregando...</p>}

        {!carregando && (
          <div className="space-y-6">
            {/* ---------- nova empresa ---------- */}
            <form onSubmit={criarEmpresa} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 md:p-5 shadow-sm">
              <h2 className="text-sm font-bold mb-4">Nova empresa</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div><label className={label}>Nome da empresa *</label><input className={input} value={novaEmpresa.nome} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, nome: e.target.value })} placeholder="Ex.: Loja Central" /></div>
                <div><label className={label}>Slug (opcional)</label><input className={input} value={novaEmpresa.slug} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, slug: e.target.value })} placeholder="loja-central" /></div>
                <div><label className={label}>Usuário admin *</label><input className={input} value={novaEmpresa.adminUsername} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, adminUsername: e.target.value })} placeholder="admin.loja" /></div>
                <div><label className={label}>Senha provisória *</label><input className={input} value={novaEmpresa.adminSenha} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, adminSenha: e.target.value })} placeholder="******" /></div>
              </div>
              <div className="mt-4">
                <label className={label}>Módulos do plano</label>
                <div className="flex flex-wrap gap-2">
                  {catalogo.map((m) => {
                    const on = novaModulos.includes(m.chave);
                    return (
                      <button
                        type="button"
                        key={m.chave}
                        onClick={() => setNovaModulos((prev) => (on ? prev.filter((c) => c !== m.chave) : [...prev, m.chave]))}
                        className={`text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors ${on ? 'bg-blue-600 border-blue-600 text-white' : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-blue-400'}`}
                      >
                        {m.nome}{!m.disponivel && <span className="ml-1 opacity-70">(em breve)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button type="submit" disabled={criandoEmpresa} className={`${btn} mt-4`}>{criandoEmpresa ? 'Criando...' : 'Criar empresa'}</button>
            </form>

            {/* ---------- lista de empresas ---------- */}
            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="bg-[var(--bg-main)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                      <th className="text-left p-3 w-8"></th>
                      <th className="text-left p-3">Empresa</th>
                      <th className="text-left p-3">Slug</th>
                      <th className="text-left p-3">Usuários</th>
                      <th className="text-left p-3">Módulos</th>
                      <th className="text-left p-3">Pallets</th>
                      <th className="text-left p-3">Criada</th>
                      <th className="text-right p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => (
                      <Fragment key={t.id}>
                        <tr
                          className="border-t border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-main)]/60"
                          onClick={() => abrirUsuarios(t.id)}
                        >
                          <td className="p-3 text-[var(--text-muted)]">
                            <span className={`inline-block transition-transform ${expandido === t.id ? 'rotate-90' : ''}`}>▸</span>
                          </td>
                          <td className="p-3" onClick={(e) => editandoId === t.id && e.stopPropagation()}>
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
                          <td className="p-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); abrirModulos(t); }}
                              className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs font-bold px-2.5 py-1 hover:bg-blue-500/20 transition-colors"
                              title="Ver / editar módulos"
                            >
                              {t.modulos.length}
                              <span className="font-normal opacity-70">módulos</span>
                            </button>
                          </td>
                          <td className="p-3">{t._count?.pallets ?? '—'}</td>
                          <td className="p-3 text-[var(--text-muted)]">{fmtData(t.createdAt)}</td>
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-3 text-xs font-bold">
                              <button onClick={() => { setEditandoId(t.id); setNomeEdit(t.nome); }} className="text-blue-600 hover:underline">Renomear</button>
                            </div>
                          </td>
                        </tr>

                        {expandido === t.id && (
                          <tr className="border-t border-[var(--border-color)] bg-[var(--bg-main)]/40">
                            <td colSpan={8} className="p-4">
                              <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-panel)] p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Usuários de {t.nome}</h3>
                                </div>

                                {carregandoUsuarios === t.id && <p className="text-xs text-[var(--text-muted)] py-3">Carregando usuários...</p>}

                                {carregandoUsuarios !== t.id && (
                                  <div className="space-y-1.5 mb-4">
                                    {(usuariosDe[t.id] || []).length === 0 && (
                                      <p className="text-xs text-[var(--text-muted)]">Nenhum usuário nesta empresa ainda.</p>
                                    )}
                                    {(usuariosDe[t.id] || []).map((u) => (
                                      <div key={u.id} className="flex items-center justify-between gap-3 text-sm border-b border-[var(--border-color)] last:border-0 pb-1.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="font-semibold truncate">{u.username}</span>
                                          <span className="text-[var(--text-muted)] text-xs">{u.cargo?.nome || 'sem cargo'}</span>
                                          {u.precisaMudarSenha
                                            ? <span className="text-[9px] font-bold uppercase text-amber-600">troca pendente</span>
                                            : <span className="text-[9px] font-bold uppercase text-emerald-600">senha ok</span>}
                                        </div>
                                        <button onClick={() => removerUsuario(t.id, u.id, u.username)} className="text-xs font-bold text-rose-500 hover:underline shrink-0">remover</button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <form onSubmit={(e) => criarUsuario(e, t.id)} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end border-t border-[var(--border-color)] pt-3">
                                  <div><label className={label}>Novo usuário</label><input className={input} value={novoUser.username} onChange={(e) => setNovoUser({ ...novoUser, username: e.target.value })} placeholder="usuario.novo" /></div>
                                  <div><label className={label}>Senha provisória</label><input className={input} value={novoUser.senha} onChange={(e) => setNovoUser({ ...novoUser, senha: e.target.value })} placeholder="******" /></div>
                                  <button type="submit" disabled={criandoUser} className={btn}>{criandoUser ? '...' : 'Adicionar'}</button>
                                  <label className="flex items-center gap-2 text-xs font-medium sm:col-span-3">
                                    <input type="checkbox" checked={novoUser.comoAdmin} onChange={(e) => setNovoUser({ ...novoUser, comoAdmin: e.target.checked })} className="w-4 h-4 rounded accent-blue-600" />
                                    Já entra como <strong>admin</strong> da empresa
                                  </label>
                                </form>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: módulos da empresa */}
      {modulosDe && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setModulosDe(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-2xl p-5 md:p-6 shadow-2xl">
            <h3 className="text-base font-bold">Módulos — {modulosDe.nome}</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">O que o plano desta empresa contempla.</p>
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
              {catalogo.map((m) => (
                <label key={m.chave} className="flex items-center gap-3 text-sm py-1.5 px-2 rounded-lg hover:bg-[var(--bg-main)] cursor-pointer">
                  <input type="checkbox" checked={modulosEdit.includes(m.chave)} onChange={() => toggleModulo(m.chave)} className="w-4 h-4 rounded accent-blue-600" />
                  <span className="flex-1">{m.nome}</span>
                  {!m.disponivel && <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] border border-[var(--border-color)] rounded-full px-2 py-0.5">em breve</span>}
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <button type="button" onClick={() => setModulosDe(null)} className="text-sm font-bold text-[var(--text-muted)] px-4 py-2">Cancelar</button>
              <button type="button" disabled={salvandoModulos} onClick={salvarModulos} className={btn}>{salvandoModulos ? 'Salvando...' : 'Salvar módulos'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
