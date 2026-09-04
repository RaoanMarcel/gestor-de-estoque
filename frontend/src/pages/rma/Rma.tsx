import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/toastContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface RmaItem {
  id: number;
  codigoTriagem: string;
  identificador: string | null;
  tipoIdentificador: string | null;
  produtoNome: string | null;
  produtoCodigo: string | null;
  desfecho: 'PENDENTE' | 'TROCA' | 'CONSERTO' | 'CREDITO' | 'DESCARTE';
  retornoSerie: string | null;
  destinoEstoque: string | null;
  destinoPalletId: number | null;
  produtoPalletId: number | null;
  esperadoNoRetorno?: boolean;
}
interface RmaNota {
  id: number;
  direcao: 'ENTRADA' | 'SAIDA';
  tipo: string;
  numero: string | null;
  serie: string | null;
  natureza: string | null;
  dataEmissao: string | null;
  statusNota: string | null;
  itens?: { descricao: string; codigo: string; quantidade: number }[] | null;
}
interface RmaAnotacao { id: number; texto: string; createdAt: string; usuario: { username: string } | null; }
interface Rma {
  id: number;
  numero: string;
  fornecedor: string;
  fornecedorEmail: string | null;
  fornecedorRef: { id: number; nome: string; email: string | null } | null;
  status: 'ABERTO' | 'AGUARDANDO_RETORNO' | 'EM_CONFERENCIA' | 'FINALIZADO' | 'CANCELADO';
  demo: boolean;
  canhoto: string | null;
  createdAt: string;
  finalizadoEm: string | null;
  pallet: { id: number; numero: string } | null;
  abertoPor: { username: string } | null;
  itens: RmaItem[];
  notas: RmaNota[];
  anotacoes: RmaAnotacao[];
}
interface RmaLista {
  id: number; numero: string; fornecedor: string; status: Rma['status']; demo: boolean;
  createdAt: string; totalItens: number; resolvidos: number;
  abertoPor: { username: string } | null; _count: { notas: number };
}
interface PalletFonte {
  id: number; numero: string; tipo: string | null;
  produtos: { id: number; codigoItem: string; numeroSerie: string | null; ean: string | null }[];
}
interface PalletTriagem { id: number; numero: string; tipo: string | null; _count: { produtos: number }; }
interface RmaFornecedor { id: number; nome: string; email: string | null; _count?: { rmas: number }; }

const fmt = (v: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');
const fmtDh = (v: string) => new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const STATUS_INFO: Record<Rma['status'], { label: string; classes: string; dot: string }> = {
  ABERTO: { label: 'Aberto', classes: 'text-[var(--text-muted)] bg-[var(--bg-main)] border-[var(--border-color)]', dot: 'bg-slate-400' },
  AGUARDANDO_RETORNO: { label: 'Aguardando retorno', classes: 'text-amber-600 bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-500' },
  EM_CONFERENCIA: { label: 'Em conferência', classes: 'text-violet-600 bg-violet-500/10 border-violet-500/20', dot: 'bg-violet-500' },
  FINALIZADO: { label: 'Finalizado', classes: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500' },
  CANCELADO: { label: 'Cancelado', classes: 'text-[var(--text-muted)] bg-[var(--bg-main)] border-[var(--border-color)]', dot: 'bg-slate-400' },
};
const DESFECHO_INFO: Record<RmaItem['desfecho'], { label: string; classes: string; dot: string; hex: string }> = {
  PENDENTE: { label: 'Pendente', classes: 'text-[var(--text-muted)] border-[var(--border-color)]', dot: 'bg-slate-300', hex: 'transparent' },
  TROCA: { label: 'Troca', classes: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500', hex: '#10b981' },
  CONSERTO: { label: 'Conserto', classes: 'text-teal-600 bg-teal-500/10 border-teal-500/20', dot: 'bg-teal-500', hex: '#14b8a6' },
  CREDITO: { label: 'Crédito', classes: 'text-blue-600 bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-500', hex: '#3b82f6' },
  DESCARTE: { label: 'Descarte', classes: 'text-rose-600 bg-rose-500/10 border-rose-500/20', dot: 'bg-rose-500', hex: '#f43f5e' },
};
const DESFECHOS_RETORNO: RmaItem['desfecho'][] = ['TROCA', 'CONSERTO'];
const NOTA_TIPO_COR: Record<string, string> = {
  REMESSA: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
  DEVOLUCAO: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
  RETORNO: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  OUTRA: 'text-[var(--text-muted)] bg-[var(--bg-main)] border-[var(--border-color)]',
};

const card = 'bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl shadow-sm';
const label = 'block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5';
const input = 'w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-main)] px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors';
const btnPrimary = 'inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm px-4 py-2.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
const btnSec = 'inline-flex items-center justify-center gap-2 bg-[var(--bg-panel)] hover:border-blue-500 text-[var(--text-main)] font-bold rounded-lg text-sm px-4 py-2.5 border border-[var(--border-color)] transition-colors';
const btnConf = 'inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-sm px-4 py-2.5 transition-colors shadow-sm shadow-violet-600/20';

function api(path: string, init?: RequestInit) {
  const token = localStorage.getItem('wms_token');
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, ...(init?.headers as any) };
  if (!(init?.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  return fetch(`${API_URL}${path}`, { ...init, headers });
}
async function jsonOrThrow(r: Response) {
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Erro na requisição.');
  return d;
}

const Secao = ({ titulo }: { titulo: string }) => (
  <div className="border-b border-[var(--border-color)] pb-5 mb-6">
    <div className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Retorno de mercadoria</span>
    </div>
    <h1 className="text-xl md:text-2xl font-semibold tracking-tight mt-1">{titulo}</h1>
  </div>
);

export default function Rma() {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const codigosDaBipagem: string[] | undefined = (location.state as any)?.codigosParaRma;
  const [tela, setTela] = useState<'lista' | 'detalhe' | 'confronto'>('lista');
  const [rmas, setRmas] = useState<RmaLista[]>([]);
  const [ativo, setAtivo] = useState<Rma | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');

  const [modalNovo, setModalNovo] = useState(false);
  const [modalItens, setModalItens] = useState(false);
  const [modalNota, setModalNota] = useState<'' | 'geral' | 'retorno'>('');
  const [modalFinalizar, setModalFinalizar] = useState(false);
  const [desfechoItem, setDesfechoItem] = useState<RmaItem | null>(null);

  const carregarLista = async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (busca) params.set('busca', busca);
      if (filtroStatus) params.set('status', filtroStatus);
      const d = await jsonOrThrow(await api(`/rma?${params}`));
      setRmas(d.rmas || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCarregando(false);
    }
  };
  useEffect(() => { if (tela === 'lista') carregarLista(); }, [tela, filtroStatus]);

  useEffect(() => {
    if (codigosDaBipagem && codigosDaBipagem.length > 0) {
      setModalNovo(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);
  const [itensPendentesDeAdicao, setItensPendentesDeAdicao] = useState<string[]>(codigosDaBipagem || []);

  const abrirDetalhe = async (id: number) => {
    try {
      const d = await jsonOrThrow(await api(`/rma/${id}`));
      setAtivo(d.rma);
      setTela('detalhe');
    } catch (e: any) { toast.error(e.message); }
  };
  const recarregarAtivo = (rma: Rma) => setAtivo(rma);

  const criarDemo = async () => {
    try {
      const d = await jsonOrThrow(await api('/rma/demo', { method: 'POST' }));
      if (d.jaExistia) toast.success('Demonstração aberta.');
      setAtivo(d.rma);
      setTela('detalhe');
    } catch (e: any) { toast.error(e.message); }
  };

  const excluirRma = async (id: number, numero: string) => {
    if (!confirm(`Excluir o ${numero}? Só é possível porque ele não tem itens.`)) return;
    try {
      await jsonOrThrow(await api(`/rma/${id}`, { method: 'DELETE' }));
      toast.success('RMA excluído.');
      carregarLista();
    } catch (e: any) { toast.error(e.message); }
  };

  const reiniciarDemo = async () => {
    if (!ativo) return;
    if (!confirm('Reiniciar a demonstração ao estado inicial? Tudo que você fez nela será desfeito.')) return;
    try {
      const d = await jsonOrThrow(await api(`/rma/${ativo.id}/reiniciar`, { method: 'POST' }));
      toast.success('Demonstração reiniciada.');
      recarregarAtivo(d.rma);
      setTela('detalhe');
    } catch (e: any) { toast.error(e.message); }
  };

  const contagens = useMemo(() => {
    if (!ativo) return { total: 0, troca: 0, conserto: 0, credito: 0, descarte: 0, pendente: 0 };
    const c = { total: ativo.itens.length, troca: 0, conserto: 0, credito: 0, descarte: 0, pendente: 0 };
    ativo.itens.forEach((i) => {
      if (i.desfecho === 'TROCA') c.troca++;
      else if (i.desfecho === 'CONSERTO') c.conserto++;
      else if (i.desfecho === 'CREDITO') c.credito++;
      else if (i.desfecho === 'DESCARTE') c.descarte++;
      else c.pendente++;
    });
    return c;
  }, [ativo]);

  const renderLista = () => (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--text-muted)] max-w-xl -mt-4">
            Retornos autorizados por fornecedor. Itens de triagem com defeito enviados para troca, crédito ou descarte.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={criarDemo} className={btnSec}>Criar demonstração</button>
          <button onClick={() => setModalNovo(true)} className={btnPrimary}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Novo RMA
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && carregarLista()}
            placeholder="Buscar por RMA, fornecedor, nota ou nº de série" className={`${input} pl-10`} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4 pb-5 border-b border-[var(--border-color)]">
        {([['', 'Todos'], ['ABERTO', 'Aberto'], ['AGUARDANDO_RETORNO', 'Aguardando retorno'], ['EM_CONFERENCIA', 'Em conferência'], ['FINALIZADO', 'Finalizado']] as [string, string][]).map(([v, t]) => (
          <button key={v} onClick={() => setFiltroStatus(v)}
            className={`px-3 py-2 rounded-lg border text-xs font-bold transition-colors shadow-sm ${filtroStatus === v ? 'border-[var(--text-main)] text-[var(--text-main)] bg-[var(--bg-panel)]' : 'border-[var(--border-color)] text-[var(--text-muted)] bg-[var(--bg-panel)]'}`}>
            {t} <b className="ml-1 text-[13px] text-[var(--text-main)]">{v === '' ? rmas.length : rmas.filter((r) => r.status === v).length}</b>
          </button>
        ))}
      </div>

      {carregando ? (
        <p className="text-sm text-[var(--text-muted)] py-16 text-center">Carregando…</p>
      ) : rmas.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] py-16 text-center">Nenhum RMA. Clique em "Novo RMA" para começar.</p>
      ) : (
        <div className={`${card} overflow-hidden mt-5`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="bg-[var(--bg-main)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  <th className="text-left p-3">RMA</th><th className="text-left p-3">Fornecedor</th>
                  <th className="text-left p-3">Aberto</th><th className="text-left p-3">Itens</th>
                  <th className="text-left p-3 w-48">Progresso</th><th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rmas.map((r) => (
                  <tr key={r.id} onClick={() => abrirDetalhe(r.id)} className="border-t border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-main)]/60">
                    <td className="p-3 font-bold tabular-nums">{r.numero}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-2.5">
                        <span className="h-7 w-7 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-muted)] text-xs font-black flex items-center justify-center">{r.fornecedor.charAt(0).toUpperCase()}</span>
                        <span className="font-semibold">{r.fornecedor}</span>
                        {r.demo && <span className="text-[9px] font-bold uppercase text-violet-600 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded">demo</span>}
                      </span>
                    </td>
                    <td className="p-3 text-[var(--text-muted)] tabular-nums">{fmt(r.createdAt)}</td>
                    <td className="p-3 font-semibold tabular-nums">{r.totalItens}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold text-[var(--text-muted)]">{r.resolvidos} / {r.totalItens} resolvidos</span>
                        <span className="h-1.5 w-full rounded-full bg-[var(--border-color)] overflow-hidden">
                          <span className="block h-full bg-emerald-500" style={{ width: `${r.totalItens ? (r.resolvidos / r.totalItens) * 100 : 0}%` }} />
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-2">
                        <StatusPill status={r.status} />
                        {r.totalItens === 0 && r.status !== 'FINALIZADO' && !r.demo && (
                          <button
                            onClick={(e) => { e.stopPropagation(); excluirRma(r.id, r.numero); }}
                            title="Excluir RMA vazio"
                            className="text-[var(--text-muted)] hover:text-rose-500 transition-colors p-1"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );

  const acaoItem = async (fn: () => Promise<Response>) => {
    try { const d = await jsonOrThrow(await fn()); recarregarAtivo(d.rma); }
    catch (e: any) { toast.error(e.message); }
  };

  const renderDetalhe = () => {
    if (!ativo) return null;
    const notasSaida = ativo.notas.filter((n) => n.direcao === 'SAIDA');
    const notasEntrada = ativo.notas.filter((n) => n.direcao === 'ENTRADA');
    const finalizavel = ativo.status !== 'FINALIZADO' && ativo.status !== 'CANCELADO' && contagens.pendente === 0 && contagens.total > 0;
    const aguardandoConf = ativo.itens.filter((i) => i.desfecho === 'PENDENTE' && i.esperadoNoRetorno).length;
    const foraDeNota = ativo.itens.filter((i) => i.desfecho === 'PENDENTE' && !i.esperadoNoRetorno).length;

    return (
      <>
        <div className="flex items-center gap-3.5 pb-5 border-b border-[var(--border-color)]">
          <button onClick={() => setTela('lista')} className="w-10 h-10 shrink-0 rounded-lg border border-[var(--border-color)] bg-[var(--bg-panel)] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)] tabular-nums">{ativo.numero}</span>
              <StatusPill status={ativo.status} sm />
              {ativo.demo && <span className="text-[9px] font-bold uppercase text-violet-600 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded">demonstração</span>}
            </div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight truncate">{ativo.fornecedor}</h1>
            {(ativo.fornecedorRef?.email || ativo.fornecedorEmail) && (
              <span className="text-xs text-[var(--text-muted)] truncate block">{ativo.fornecedorRef?.email || ativo.fornecedorEmail}</span>
            )}
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {ativo.demo && <button onClick={reiniciarDemo} className={btnSec}>Reiniciar</button>}
            {ativo.demo && ativo.status === 'AGUARDANDO_RETORNO' && (
              <button onClick={() => acaoItem(() => api(`/rma/${ativo.id}/simular-retorno`, { method: 'POST' }))} className={btnSec}>Simular retorno</button>
            )}
            {ativo.status === 'ABERTO' && (
              <button onClick={() => setModalItens(true)} className={btnSec}>+ Itens</button>
            )}
            {notasEntrada.length > 0 && ativo.status !== 'FINALIZADO' && ativo.status !== 'CANCELADO' && (
              <button onClick={() => setTela('confronto')} className={btnConf}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                Realizar conferência
              </button>
            )}
            <button onClick={() => setModalFinalizar(true)} disabled={!finalizavel} className={btnPrimary}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
              Finalizar
            </button>
          </div>
        </div>

        <div className={`${card} p-5 mt-5`}>
          <div className="flex items-end justify-between gap-4 mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums">{contagens.total - contagens.pendente}</span>
              <span className="text-sm text-[var(--text-muted)]">de <b className="text-[var(--text-main)]">{contagens.total}</b> itens resolvidos</span>
            </div>
            <span className="text-xs font-semibold text-[var(--text-muted)]">{contagens.pendente} aguardando desfecho</span>
          </div>
          <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-[var(--border-color)]">
            <span className="bg-emerald-500" style={{ width: `${pct(contagens.troca, contagens.total)}%` }} />
            <span className="bg-teal-500" style={{ width: `${pct(contagens.conserto, contagens.total)}%` }} />
            <span className="bg-blue-500" style={{ width: `${pct(contagens.credito, contagens.total)}%` }} />
            <span className="bg-rose-500" style={{ width: `${pct(contagens.descarte, contagens.total)}%` }} />
          </div>
          <div className="flex flex-wrap gap-4 mt-3.5 text-xs font-semibold text-[var(--text-muted)]">
            <Leg cor="bg-emerald-500" t="Troca" n={contagens.troca} />
            <Leg cor="bg-teal-500" t="Conserto" n={contagens.conserto} />
            <Leg cor="bg-blue-500" t="Crédito" n={contagens.credito} />
            <Leg cor="bg-rose-500" t="Descarte" n={contagens.descarte} />
            <Leg cor="bg-slate-300" t="Pendente" n={contagens.pendente} />
          </div>

          {ativo.status === 'EM_CONFERENCIA' && contagens.pendente > 0 && (
            <div className="mt-4 pt-3.5 border-t border-[var(--border-color)] text-xs text-[var(--text-muted)] leading-relaxed">
              <b className="text-[var(--text-main)]">Lote de {contagens.total} unidades</b> — faltam {contagens.pendente}
              {aguardandoConf > 0 && <> · <b className="text-amber-600">{aguardandoConf}</b> nas notas, aguardando bipagem</>}
              {foraDeNota > 0 && <> · <b>{foraDeNota}</b> ainda fora das notas</>}.
              <br />
              Vá importando as notas de retorno conforme a fábrica devolve (Notas fiscais → Vincular) — cada nota libera as unidades dela para a conferência. O que não for voltar, marque Crédito ou Descarte.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 mt-5 items-start">
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Itens do RMA · {ativo.itens.length}</span>
            {ativo.itens.length === 0 && <p className="text-sm text-[var(--text-muted)] py-6">Nenhum item ainda. Use "+ Itens".</p>}
            {ativo.itens.map((it) => {
              const di = DESFECHO_INFO[it.desfecho];
              return (
                <div key={it.id} className={`${card} p-3.5`} style={{ borderLeft: `3px solid ${di.hex}` }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-extrabold tabular-nums">{it.codigoTriagem}</span>
                        {it.identificador && (
                          <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-main)] border border-[var(--border-color)] px-1.5 py-0.5 rounded-full">
                            {it.tipoIdentificador === 'EAN' ? 'EAN' : 'Nº SÉRIE'} {it.identificador}
                          </span>
                        )}
                      </div>
                      {it.produtoNome && <span className="text-xs text-[var(--text-muted)]">{it.produtoNome}</span>}
                      {it.desfecho === 'TROCA' && it.retornoSerie && (
                        <span className="text-[11px] font-bold text-emerald-600 mt-0.5">↩ Voltou outra unidade · série {it.retornoSerie}</span>
                      )}
                      {it.desfecho === 'CONSERTO' && (
                        <span className="text-[11px] font-bold text-teal-600 mt-0.5">↩ Mesma unidade, consertada{it.retornoSerie ? ` · série ${it.retornoSerie}` : ''}</span>
                      )}
                    </div>
                    {ativo.status === 'ABERTO' ? (
                      <button onClick={() => acaoItem(() => api(`/rma/${ativo.id}/itens/${it.id}`, { method: 'DELETE' }))}
                        className="shrink-0 text-[var(--text-muted)] hover:text-rose-500 p-1.5" title="Remover — volta pro defeito">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
                      </button>
                    ) : it.desfecho !== 'PENDENTE' ? (
                      <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold ${di.classes}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${di.dot}`} />{di.label}
                      </span>
                    ) : ativo.status === 'EM_CONFERENCIA' && it.esperadoNoRetorno ? (
                      <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold text-amber-600 bg-amber-500/10 border-amber-500/20" title="Consta na nota de retorno — bipe em Realizar conferência">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Aguardando conferência
                      </span>
                    ) : ativo.status === 'EM_CONFERENCIA' ? (
                      <button onClick={() => setDesfechoItem(it)} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--bg-main)] text-[11px] font-bold text-[var(--text-muted)]" title="Não consta na nota de retorno">
                        Definir desfecho
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6}><path d="M6 9l6 6 6-6" /></svg>
                      </button>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-muted)]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                        travado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-4">
            <NotasFiscais
              notas={ativo.notas}
              podeEditar={ativo.status !== 'FINALIZADO' && ativo.status !== 'CANCELADO'}
              onVincular={() => setModalNota('geral')}
              onDel={(id) => acaoItem(() => api(`/rma/${ativo.id}/notas/${id}`, { method: 'DELETE' }))}
            />

            <div className={`${card} p-4`}>
              <span className={label}>Anotações</span>
              <div className="flex flex-col gap-3">
                {ativo.anotacoes.length === 0 && <span className="text-xs text-[var(--text-muted)]">Nenhuma anotação.</span>}
                {ativo.anotacoes.map((a) => (
                  <div key={a.id} className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold">{a.usuario?.username || 'Sistema'} <span className="text-[var(--text-muted)] font-normal">· {fmtDh(a.createdAt)}</span></span>
                    <span className="text-xs text-[var(--text-muted)]">{a.texto}</span>
                  </div>
                ))}
              </div>
              <FormAnotacao onSalvar={(texto) => acaoItem(() => api(`/rma/${ativo.id}/anotacoes`, { method: 'POST', body: JSON.stringify({ texto }) }))} />
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderConfronto = () => {
    if (!ativo) return null;
    return <Confronto rma={ativo} onVoltar={() => setTela('detalhe')} onAtualizado={recarregarAtivo} onVincularNota={() => setModalNota('retorno')} />;
  };

  return (
    <div className="min-h-full bg-[var(--bg-main)] text-[var(--text-main)] p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <Secao titulo={tela === 'lista' ? 'RMA' : ativo ? `${ativo.numero} · ${ativo.fornecedor}` : 'RMA'} />
        {tela === 'lista' && renderLista()}
        {tela === 'detalhe' && renderDetalhe()}
        {tela === 'confronto' && renderConfronto()}
      </div>

      {modalNovo && (
        <ModalNovo
          codigosPendentes={itensPendentesDeAdicao}
          onFechar={() => { setModalNovo(false); setItensPendentesDeAdicao([]); }}
          onCriado={async (rma) => {
            setModalNovo(false);
            let final = rma;
            if (itensPendentesDeAdicao.length > 0) {
              try {
                const d = await jsonOrThrow(await api(`/rma/${rma.id}/itens`, { method: 'POST', body: JSON.stringify({ codigosItens: itensPendentesDeAdicao }) }));
                final = d.rma;
                toast.success(`${itensPendentesDeAdicao.length} itens adicionados ao ${rma.numero}.`);
              } catch (e: any) { toast.error(e.message); }
              setItensPendentesDeAdicao([]);
            }
            setAtivo(final); setTela('detalhe');
          }}
        />
      )}
      {modalItens && ativo && <ModalAdicionarItens rmaId={ativo.id} onFechar={() => setModalItens(false)} onAdicionado={(rma) => { setModalItens(false); recarregarAtivo(rma); }} />}
      {modalNota && ativo && <ModalNota rmaId={ativo.id} alvo={modalNota} onFechar={() => setModalNota('')} onVinculado={(rma) => { setModalNota(''); recarregarAtivo(rma); }} />}
      {desfechoItem && ativo && <ModalDesfecho rmaId={ativo.id} item={desfechoItem} onFechar={() => setDesfechoItem(null)} onSalvo={(rma) => { setDesfechoItem(null); recarregarAtivo(rma); }} />}
      {modalFinalizar && ativo && <ModalFinalizar rma={ativo} onFechar={() => setModalFinalizar(false)} onFinalizado={(rma) => { setModalFinalizar(false); recarregarAtivo(rma); }} />}
    </div>
  );
}

const pct = (n: number, total: number) => (total ? (n / total) * 100 : 0);
const StatusPill = ({ status, sm }: { status: Rma['status']; sm?: boolean }) => {
  const i = STATUS_INFO[status];
  return <span className={`inline-flex items-center gap-1.5 rounded-md border font-bold ${i.classes} ${sm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'}`}><span className={`h-1.5 w-1.5 rounded-full ${i.dot}`} />{i.label}</span>;
};
const Leg = ({ cor, t, n }: { cor: string; t: string; n: number }) => (
  <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${cor}`} />{t} <b className="text-[var(--text-main)]">{n}</b></span>
);

const PAGINA_NOTAS = 5;

function NotasFiscais({ notas, podeEditar, onVincular, onDel }: {
  notas: RmaNota[]; podeEditar: boolean; onVincular: () => void; onDel: (id: number) => void;
}) {
  const [busca, setBusca] = useState('');
  const q = busca.trim().toLowerCase();
  const casa = (n: RmaNota) => !q || [n.numero, n.serie, n.natureza, n.tipo].some((v) => (v || '').toLowerCase().includes(q));
  const filtradas = notas.filter(casa);
  const saida = filtradas.filter((n) => n.direcao === 'SAIDA');
  const entrada = filtradas.filter((n) => n.direcao === 'ENTRADA');

  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center justify-between">
        <span className={label + ' mb-0'}>Notas fiscais · {notas.length}</span>
        {podeEditar && <button onClick={onVincular} className="text-[11px] font-bold text-blue-600">+ Vincular</button>}
      </div>
      {notas.length > PAGINA_NOTAS && (
        <div className="relative mt-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nota (nº, série, natureza)" className={`${input} pl-9 py-2 text-xs`} />
        </div>
      )}
      <GrupoNotas titulo="Saída" notas={saida} onDel={podeEditar ? onDel : undefined} />
      <GrupoNotas titulo="Entrada" notas={entrada} onDel={podeEditar ? onDel : undefined} />
      {q && filtradas.length === 0 && <p className="text-[11px] text-[var(--text-muted)] mt-3">Nenhuma nota corresponde a "{busca}".</p>}
    </div>
  );
}

function GrupoNotas({ titulo, notas, onDel }: { titulo: string; notas: RmaNota[]; onDel?: (id: number) => void }) {
  const [limite, setLimite] = useState(PAGINA_NOTAS);
  const visiveis = notas.slice(0, limite);
  return (
    <>
      <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]/70 mt-3.5 mb-2">{titulo} · {notas.length}</div>
      <div className="flex flex-col gap-2">
        {notas.length === 0 && <span className="text-[11px] text-[var(--text-muted)]">—</span>}
        {visiveis.map((n) => (
          <div key={n.id} className="flex items-center gap-2.5 p-2.5 border border-[var(--border-color)] rounded-lg">
            <span className={`text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded border ${NOTA_TIPO_COR[n.tipo] || NOTA_TIPO_COR.OUTRA}`}>{n.tipo}</span>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold tabular-nums">NF {n.numero || '—'}{n.serie ? ` · sér. ${n.serie}` : ''}</span>
              <span className="text-[10px] text-[var(--text-muted)] truncate">{n.natureza || n.tipo} · {fmt(n.dataEmissao)}</span>
            </div>
            {onDel && <button onClick={() => onDel(n.id)} className="text-[var(--text-muted)] hover:text-rose-500 shrink-0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>}
          </div>
        ))}
      </div>
      {notas.length > PAGINA_NOTAS && (
        <button onClick={() => setLimite((l) => (l >= notas.length ? PAGINA_NOTAS : l + PAGINA_NOTAS))}
          className="text-[11px] font-bold text-blue-600 mt-2">
          {limite >= notas.length ? 'ver menos' : `ver mais ${Math.min(PAGINA_NOTAS, notas.length - limite)}`}
        </button>
      )}
    </>
  );
}

function FormAnotacao({ onSalvar }: { onSalvar: (t: string) => void }) {
  const [texto, setTexto] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (texto.trim()) { onSalvar(texto.trim()); setTexto(''); } }} className="mt-3">
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} placeholder="Escrever uma anotação…" className={`${input} resize-none`} />
      {texto.trim() && <button className={`${btnPrimary} mt-2 w-full`}>Salvar</button>}
    </form>
  );
}

const Overlay = ({ children, onFechar }: { children: React.ReactNode; onFechar: () => void }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onFechar}>
    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
      {children}
    </div>
  </div>
);

function ModalNovo({ onFechar, onCriado, codigosPendentes = [] }: { onFechar: () => void; onCriado: (r: Rma) => void; codigosPendentes?: string[] }) {
  const toast = useToast();
  const [fornecedores, setFornecedores] = useState<RmaFornecedor[]>([]);
  const [selId, setSelId] = useState<number | ''>('');
  const [novoAberto, setNovoAberto] = useState(false);
  const [novo, setNovo] = useState({ nome: '', email: '' });
  const [salvandoForn, setSalvandoForn] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api('/rma/fornecedores').then(jsonOrThrow).then((d) => {
      const lista: RmaFornecedor[] = d.fornecedores || [];
      setFornecedores(lista);
      if (lista.length === 0) setNovoAberto(true);
      else if (lista.length === 1) setSelId(lista[0].id);
    }).catch((e) => toast.error(e.message));
  }, []);

  const salvarFornecedor = async () => {
    if (!novo.nome.trim()) return toast.error('Informe o nome do fornecedor.');
    setSalvandoForn(true);
    try {
      const d = await jsonOrThrow(await api('/rma/fornecedores', {
        method: 'POST',
        body: JSON.stringify({ nome: novo.nome.trim(), email: novo.email.trim() || undefined }),
      }));
      const f: RmaFornecedor = d.fornecedor;
      setFornecedores((xs) => [...xs, f].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      setSelId(f.id);
      setNovo({ nome: '', email: '' });
      setNovoAberto(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setSalvandoForn(false); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selId) return toast.error('Escolha um fornecedor.');
    setSalvando(true);
    try {
      const d = await jsonOrThrow(await api('/rma', { method: 'POST', body: JSON.stringify({ fornecedorId: selId }) }));
      onCriado(d.rma);
    } catch (err: any) { toast.error(err.message); setSalvando(false); }
  };

  return (
    <Overlay onFechar={onFechar}>
      <form onSubmit={submit} className="p-5 md:p-6 space-y-4">
        <h3 className="text-base font-bold">Novo RMA</h3>
        <p className="text-sm text-[var(--text-muted)] -mt-2">
          {codigosPendentes.length > 0
            ? `${codigosPendentes.length} itens da bipagem serão adicionados a este RMA.`
            : 'Um pallet dedicado é criado para este RMA.'}
        </p>

        <div>
          <div className="flex items-center justify-between">
            <label className={label + ' mb-0'}>Fornecedor *</label>
            {!novoAberto && <button type="button" onClick={() => setNovoAberto(true)} className="text-[11px] font-bold text-blue-600">+ Novo fornecedor</button>}
          </div>
          {fornecedores.length > 0 ? (
            <select className={`${input} mt-1.5`} value={selId} onChange={(e) => setSelId(e.target.value ? Number(e.target.value) : '')} autoFocus>
              <option value="">Selecione…</option>
              {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          ) : (
            !novoAberto && <p className="text-xs text-[var(--text-muted)] mt-1.5">Nenhum fornecedor pré-cadastrado ainda.</p>
          )}
        </div>

        {novoAberto && (
          <div className="rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--bg-main)] p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Pré-cadastro de fornecedor</span>
              {fornecedores.length > 0 && <button type="button" onClick={() => { setNovoAberto(false); setNovo({ nome: '', email: '' }); }} className="text-[11px] font-bold text-[var(--text-muted)]">cancelar</button>}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-snug">Só para tocar o RMA. O cadastro completo de fornecedor fica em outra tela.</p>
            <div><label className={label}>Nome *</label><input className={input} value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} placeholder="Ex.: SMS Tecnologia" /></div>
            <div><label className={label}>E-mail</label><input type="email" className={input} value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} placeholder="contato@fornecedor.com.br" /></div>
            <button type="button" onClick={salvarFornecedor} disabled={salvandoForn} className={`${btnSec} w-full`}>{salvandoForn ? 'Salvando…' : 'Salvar fornecedor'}</button>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onFechar} className="text-sm font-bold text-[var(--text-muted)] px-4 py-2">Cancelar</button>
          <button disabled={salvando || !selId} className={btnPrimary}>{salvando ? 'Criando…' : 'Criar RMA'}</button>
        </div>
      </form>
    </Overlay>
  );
}

function ModalAdicionarItens({ rmaId, onFechar, onAdicionado }: { rmaId: number; onFechar: () => void; onAdicionado: (r: Rma) => void }) {
  const toast = useToast();
  const [pallets, setPallets] = useState<PalletFonte[]>([]);
  const [scan, setScan] = useState('');
  const [pendente, setPendente] = useState<{ produtoPalletId: number; codigoItem: string } | null>(null);
  const [ident, setIdent] = useState('');
  const [tipoIdent, setTipoIdent] = useState<'SERIE' | 'EAN'>('SERIE');
  const [adicionados, setAdicionados] = useState<{ codigo: string; ident: string }[]>([]);
  const [verLista, setVerLista] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const jaAdd = new Set(adicionados.map((a) => a.codigo));

  const carregar = () => api('/rma/fontes').then(jsonOrThrow).then((d) => setPallets(d.pallets || [])).catch((e) => toast.error(e.message));
  useEffect(() => { carregar(); }, []);

  const resolver = () => {
    const cod = scan.trim();
    if (!cod) return;
    for (const p of pallets) {
      const prod = p.produtos.find((x) => x.codigoItem.toUpperCase() === cod.toUpperCase());
      if (prod) {
        if (jaAdd.has(prod.codigoItem)) { toast.error('Item já adicionado.'); setScan(''); return; }
        setPendente({ produtoPalletId: prod.id, codigoItem: prod.codigoItem });
        setIdent(prod.numeroSerie || prod.ean || '');
        setTipoIdent(prod.ean && !prod.numeroSerie ? 'EAN' : 'SERIE');
        setScan('');
        return;
      }
    }
    toast.error(`"${cod}" não está em nenhum pallet de defeito.`);
    setScan('');
  };

  const lancar = async () => {
    if (!pendente) return;
    setSalvando(true);
    try {
      const d = await jsonOrThrow(await api(`/rma/${rmaId}/itens`, {
        method: 'POST',
        body: JSON.stringify({ itens: [{ produtoPalletId: pendente.produtoPalletId, identificador: ident.trim() || null, tipoIdentificador: tipoIdent }] }),
      }));
      onAdicionado(d.rma);
      setAdicionados((a) => [{ codigo: pendente.codigoItem, ident: ident.trim() }, ...a]);
      setPendente(null); setIdent('');
      await carregar();
    } catch (e: any) { toast.error(e.message); }
    finally { setSalvando(false); }
  };

  const total = pallets.reduce((n, p) => n + p.produtos.length, 0);

  return (
    <Overlay onFechar={onFechar}>
      <div className="p-5 md:p-6">
        <h3 className="text-base font-bold mb-1">Adicionar itens ao RMA</h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">Bipe o código do item de <b>DEFEITO</b> — ele é lançado no RMA na hora.</p>

        <div className="bg-[var(--sidebar-bg)] rounded-xl p-4">
          {!pendente ? (
            <>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Bipe o código do item</span>
              <input autoFocus value={scan} onChange={(e) => setScan(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && resolver()}
                placeholder="00012038…" className="mt-2.5 w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-4 h-11 text-base outline-none" />
            </>
          ) : (
            <>
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Item {pendente.codigoItem} — bipe a série ou EAN</span>
              <div className="flex gap-2 mt-2.5">
                <select value={tipoIdent} onChange={(e) => setTipoIdent(e.target.value as any)} className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2 h-11 text-sm">
                  <option value="SERIE">Nº Série</option><option value="EAN">EAN</option>
                </select>
                <input autoFocus value={ident} onChange={(e) => setIdent(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && lancar()}
                  placeholder="Bipe a série/EAN…" className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-4 h-11 text-base outline-none" />
                <button onClick={lancar} disabled={salvando} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg px-4 text-sm">{salvando ? '…' : 'Lançar'}</button>
              </div>
              <button onClick={() => setPendente(null)} className="text-[11px] text-slate-400 mt-2">cancelar este item</button>
            </>
          )}
        </div>

        {adicionados.length > 0 && (
          <div className="mt-4">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Lançados nesta sessão · {adicionados.length}</span>
            <div className="flex flex-col gap-1.5 mt-2 max-h-40 overflow-y-auto">
              {adicionados.map((a) => (
                <div key={a.codigo} className="flex items-center gap-2 text-sm border border-emerald-500/20 bg-emerald-500/5 rounded-lg px-3 py-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.6}><path d="M20 6L9 17l-5-5" /></svg>
                  <span className="font-bold tabular-nums">{a.codigo}</span>
                  {a.ident && <span className="text-[var(--text-muted)] text-xs">{a.ident}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => setVerLista((v) => !v)} className="mt-4 text-xs font-bold text-blue-600">
          {verLista ? 'Esconder' : 'Ver'} lista de defeito ({total})
        </button>
        {verLista && (
          <div className="mt-2 space-y-3 max-h-[40vh] overflow-y-auto pr-1 border-t border-[var(--border-color)] pt-3">
            {pallets.map((p) => (
              <div key={p.id}>
                <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">{p.numero}</div>
                <div className="flex flex-wrap gap-1.5">
                  {p.produtos.map((prod) => (
                    <button key={prod.id} disabled={jaAdd.has(prod.codigoItem)}
                      onClick={() => { setPendente({ produtoPalletId: prod.id, codigoItem: prod.codigoItem }); setIdent(prod.numeroSerie || prod.ean || ''); setTipoIdent(prod.ean && !prod.numeroSerie ? 'EAN' : 'SERIE'); }}
                      className={`text-xs font-bold tabular-nums px-2.5 py-1.5 rounded-md border ${jaAdd.has(prod.codigoItem) ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5 cursor-default' : 'border-[var(--border-color)] text-[var(--text-main)] hover:border-blue-500'}`}>
                      {prod.codigoItem}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button onClick={onFechar} className={btnPrimary}>Concluir</button>
        </div>
      </div>
    </Overlay>
  );
}

function ModalNota({ rmaId, alvo, onFechar, onVinculado }: { rmaId: number; alvo?: '' | 'geral' | 'retorno'; onFechar: () => void; onVinculado: (r: Rma) => void }) {
  const toast = useToast();
  const ehRetorno = alvo === 'retorno';
  const [modo, setModo] = useState<'xml' | 'manual'>('xml');
  const [file, setFile] = useState<File | null>(null);
  const [manual, setManual] = useState(ehRetorno
    ? { numero: '', serie: '', tipo: 'RETORNO', direcao: 'ENTRADA' }
    : { numero: '', serie: '', tipo: 'REMESSA', direcao: 'SAIDA' });
  const [salvando, setSalvando] = useState(false);

  const submit = async () => {
    setSalvando(true);
    try {
      let body: BodyInit;
      if (modo === 'xml') {
        if (!file) { setSalvando(false); return toast.error('Escolha o XML.'); }
        const fd = new FormData(); fd.append('xml', file);
        body = fd;
      } else {
        if (!manual.numero.trim()) { setSalvando(false); return toast.error('Informe o número.'); }
        body = JSON.stringify(manual);
      }
      const d = await jsonOrThrow(await api(`/rma/${rmaId}/notas`, { method: 'POST', body }));
      onVinculado(d.rma);
    } catch (e: any) { toast.error(e.message); setSalvando(false); }
  };

  return (
    <Overlay onFechar={onFechar}>
      <div className="p-5 md:p-6 space-y-4">
        <h3 className="text-base font-bold">{ehRetorno ? 'Vincular nota de retorno' : 'Vincular nota fiscal'}</h3>
        {ehRetorno && <p className="text-xs text-[var(--text-muted)] -mt-2">Importe o XML da NF-e de retorno da fábrica. As unidades dela ficam liberadas para bipagem na conferência.</p>}
        <div className="flex gap-2">
          {(['xml', 'manual'] as const).map((m) => (
            <button key={m} onClick={() => setModo(m)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${modo === m ? 'border-blue-600 text-blue-600 bg-blue-500/5' : 'border-[var(--border-color)] text-[var(--text-muted)]'}`}>
              {m === 'xml' ? 'Importar XML' : 'Digitar'}
            </button>
          ))}
        </div>
        {modo === 'xml' ? (
          <label className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-blue-500 text-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-[var(--text-muted)]"><path d="M12 15V3m0 0l-4 4m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
            <span className="text-sm font-semibold text-[var(--text-muted)] break-all">{file ? file.name : 'Anexar XML da NF-e'}</span>
            <input type="file" accept=".xml" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Número *</label><input className={input} value={manual.numero} onChange={(e) => setManual({ ...manual, numero: e.target.value })} /></div>
            <div><label className={label}>Série</label><input className={input} value={manual.serie} onChange={(e) => setManual({ ...manual, serie: e.target.value })} /></div>
            <div><label className={label}>Direção</label><select className={input} value={manual.direcao} onChange={(e) => setManual({ ...manual, direcao: e.target.value })}><option value="SAIDA">Saída</option><option value="ENTRADA">Entrada</option></select></div>
            <div><label className={label}>Tipo</label><select className={input} value={manual.tipo} onChange={(e) => setManual({ ...manual, tipo: e.target.value })}><option value="REMESSA">Remessa</option><option value="DEVOLUCAO">Devolução</option><option value="RETORNO">Retorno</option><option value="OUTRA">Outra</option></select></div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onFechar} className="text-sm font-bold text-[var(--text-muted)] px-4 py-2">Cancelar</button>
          <button onClick={submit} disabled={salvando} className={btnPrimary}>{salvando ? 'Vinculando…' : 'Vincular'}</button>
        </div>
      </div>
    </Overlay>
  );
}

function ModalDesfecho({ rmaId, item, onFechar, onSalvo }: { rmaId: number; item: RmaItem; onFechar: () => void; onSalvo: (r: Rma) => void }) {
  const toast = useToast();
  const [desfecho, setDesfecho] = useState<'CREDITO' | 'DESCARTE'>(item.desfecho === 'DESCARTE' ? 'DESCARTE' : 'CREDITO');
  const [salvando, setSalvando] = useState(false);
  const submit = async () => {
    setSalvando(true);
    try {
      const d = await jsonOrThrow(await api(`/rma/${rmaId}/itens/${item.id}`, { method: 'PATCH', body: JSON.stringify({ desfecho }) }));
      onSalvo(d.rma);
    } catch (e: any) { toast.error(e.message); setSalvando(false); }
  };
  return (
    <Overlay onFechar={onFechar}>
      <div className="p-5 md:p-6 space-y-4">
        <h3 className="text-base font-bold">Item que não voltou · <span className="tabular-nums">{item.codigoTriagem}</span></h3>
        <p className="text-sm text-[var(--text-muted)] -mt-2">Este item não foi encontrado na nota de retorno. A troca é registrada bipando no confronto.</p>
        <div className="grid grid-cols-2 gap-2">
          {(['CREDITO', 'DESCARTE'] as const).map((d) => {
            const di = DESFECHO_INFO[d];
            return (
              <button key={d} onClick={() => setDesfecho(d)} className={`p-3 rounded-lg border text-sm font-bold transition-colors ${desfecho === d ? di.classes : 'border-[var(--border-color)] text-[var(--text-muted)]'}`}>
                {di.label}
              </button>
            );
          })}
        </div>
        {desfecho === 'CREDITO' && <p className="text-xs text-blue-600 bg-blue-500/5 border border-blue-500/15 rounded-lg p-2.5">Gera contas a receber. A NF de devolução é recomendada, mas não obrigatória.</p>}
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onFechar} className="text-sm font-bold text-[var(--text-muted)] px-4 py-2">Cancelar</button>
          <button onClick={submit} disabled={salvando} className={btnPrimary}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </div>
    </Overlay>
  );
}

function ModalFinalizar({ rma, onFechar, onFinalizado }: { rma: Rma; onFechar: () => void; onFinalizado: (r: Rma) => void }) {
  const toast = useToast();
  const retornos = rma.itens.filter((i) => DESFECHOS_RETORNO.includes(i.desfecho));
  const creditos = rma.itens.filter((i) => i.desfecho === 'CREDITO').length;
  const descartes = rma.itens.filter((i) => i.desfecho === 'DESCARTE').length;
  const [pallets, setPallets] = useState<PalletTriagem[]>([]);
  const [busca, setBusca] = useState('');
  const [alvoPallet, setAlvoPallet] = useState<number | ''>('');
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [atribuicoes, setAtribuicoes] = useState<Record<number, number>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { api('/rma/pallets-triagem').then(jsonOrThrow).then((d) => setPallets(d.pallets || [])).catch(() => {}); }, []);

  const q = busca.trim().toLowerCase();
  const visiveis = retornos.filter((i) => !q || [i.codigoTriagem, i.identificador, i.retornoSerie, i.produtoNome, i.produtoCodigo].some((v) => (v || '').toLowerCase().includes(q)));
  const nomePallet = (id: number) => pallets.find((p) => p.id === id)?.numero || `#${id}`;
  const paraTriagem = retornos.filter((i) => atribuicoes[i.id]).length;

  const toggle = (id: number) => setSelecionados((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const enviarSelecionados = () => {
    if (!alvoPallet) return toast.error('Escolha o pallet de triagem.');
    if (selecionados.size === 0) return toast.error('Selecione ao menos um item.');
    setAtribuicoes((a) => { const n = { ...a }; selecionados.forEach((id) => { n[id] = Number(alvoPallet); }); return n; });
    setSelecionados(new Set());
  };
  const limparAtribuicao = (id: number) => setAtribuicoes((a) => { const n = { ...a }; delete n[id]; return n; });

  const submit = async () => {
    setSalvando(true);
    try {
      const destinos = retornos.map((i) => atribuicoes[i.id]
        ? { rmaItemId: i.id, destino: 'TRIAGEM', palletId: atribuicoes[i.id] }
        : { rmaItemId: i.id, destino: 'FANTASMA_NOVO' });
      const d = await jsonOrThrow(await api(`/rma/${rma.id}/finalizar`, { method: 'POST', body: JSON.stringify({ destinos }) }));
      toast.success('RMA finalizado.');
      onFinalizado(d.rma);
    } catch (e: any) { toast.error(e.message); setSalvando(false); }
  };

  return (
    <Overlay onFechar={onFechar}>
      <div className="p-5 md:p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold">Finalizar {rma.numero}</h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {retornos.length} {retornos.length === 1 ? 'unidade volta ao estoque' : 'unidades voltam ao estoque'} · {creditos} crédito · {descartes} descarte
          </p>
        </div>

        {retornos.length > 0 && (
          <div className="space-y-2.5">
            <span className={label}>Destino das unidades que voltaram</span>
            <p className="text-[11px] text-[var(--text-muted)] -mt-1">
              Marque os itens e envie para um pallet de triagem. O que ficar sem pallet vai para o <b>estoque geral</b>.
            </p>

            <div className="flex gap-2">
              <select className={`${input} py-2`} value={alvoPallet} onChange={(e) => setAlvoPallet(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Pallet de triagem…</option>
                {pallets.map((p) => <option key={p.id} value={p.id}>{p.numero} ({p._count.produtos} itens)</option>)}
              </select>
              <button onClick={enviarSelecionados} disabled={!alvoPallet || selecionados.size === 0} className={`${btnSec} shrink-0 py-2`}>
                → Triagem{selecionados.size > 0 ? ` (${selecionados.size})` : ''}
              </button>
            </div>

            {retornos.length > 5 && (
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nº de série ou código" className={`${input} pl-9 py-2 text-xs`} />
              </div>
            )}

            <div className={`${card} divide-y divide-[var(--border-color)] max-h-64 overflow-y-auto`}>
              {visiveis.length === 0 && <p className="text-xs text-[var(--text-muted)] p-3">Nada encontrado.</p>}
              {visiveis.map((i) => {
                const di = DESFECHO_INFO[i.desfecho];
                const alvo = atribuicoes[i.id];
                return (
                  <label key={i.id} className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-[var(--bg-main)]/50">
                    <input type="checkbox" checked={selecionados.has(i.id)} onChange={() => toggle(i.id)} className="accent-blue-600" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[13px] font-bold tabular-nums">
                        {i.retornoSerie || i.codigoTriagem}
                        <span className={`ml-2 text-[9px] font-bold uppercase px-1 py-0.5 rounded ${di.classes}`}>{di.label}</span>
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] truncate">{i.produtoNome || `origem ${i.codigoTriagem}`}</span>
                    </div>
                    {alvo ? (
                      <span className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-500/5 border border-blue-500/20 rounded px-1.5 py-0.5">
                        {nomePallet(alvo)}
                        <button type="button" onClick={(e) => { e.preventDefault(); limparAtribuicao(i.id); }} className="hover:text-rose-500">✕</button>
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] font-semibold text-[var(--text-muted)]">estoque geral</span>
                    )}
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">{paraTriagem} p/ triagem · {retornos.length - paraTriagem} p/ estoque geral</p>
          </div>
        )}

        {creditos > 0 && (
          <p className="text-xs text-blue-700 bg-blue-500/5 border border-blue-500/15 rounded-lg p-3">
            {creditos} crédito(s) geram contas a receber. Recomendado emitir a NF de devolução — <b>opcional</b>, pode finalizar sem.
          </p>
        )}
        {descartes > 0 && <p className="text-xs text-[var(--text-muted)]">{descartes} item(ns) em descarte não voltam ao estoque.</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onFechar} className="text-sm font-bold text-[var(--text-muted)] px-4 py-2">Cancelar</button>
          <button onClick={submit} disabled={salvando} className={btnPrimary}>{salvando ? 'Finalizando…' : 'Finalizar RMA'}</button>
        </div>
      </div>
    </Overlay>
  );
}

function Confronto({ rma, onVoltar, onAtualizado, onVincularNota }: { rma: Rma; onVoltar: () => void; onAtualizado: (r: Rma) => void; onVincularNota: () => void }) {
  const toast = useToast();
  const notasRetorno = rma.notas.filter((n) => n.direcao === 'ENTRADA');
  const notaRetorno = notasRetorno[0] || null;
  const linhasRetorno = notasRetorno.flatMap((n) => n.itens || []);
  const unidadesNaNota = linhasRetorno.reduce((s, l) => s + (l.quantidade || 0), 0);
  const pendentes = rma.itens.filter((i) => i.desfecho === 'PENDENTE' && i.esperadoNoRetorno);
  const foraDaNota = rma.itens.filter((i) => i.desfecho === 'PENDENTE' && !i.esperadoNoRetorno);
  const retornos = rma.itens.filter((i) => DESFECHOS_RETORNO.includes(i.desfecho));
  const esperadosTotal = retornos.length + pendentes.length;
  const ehConserto = (it: RmaItem | undefined, serie: string) =>
    !!it && it.tipoIdentificador === 'SERIE' && !!it.identificador &&
    it.identificador.trim().toLowerCase() === serie.trim().toLowerCase();
  const [scan, setScan] = useState('');
  const [bipagens, setBipagens] = useState<{ rmaItemId: number; novaSerie: string }[]>([]);
  const [alvo, setAlvo] = useState<number | ''>(pendentes[0]?.id ?? '');
  const [salvando, setSalvando] = useState(false);

  const bipadoDe = (id: number) => bipagens.find((b) => b.rmaItemId === id)?.novaSerie;
  const pendentesReais = pendentes.filter((p) => !bipadoDe(p.id));

  useEffect(() => {
    if (!alvo && pendentesReais.length > 0) setAlvo(pendentesReais[0].id);
  }, [pendentesReais.length]);

  const bipar = () => {
    if (!scan.trim() || !alvo) return;
    setBipagens((b) => [...b.filter((x) => x.rmaItemId !== alvo), { rmaItemId: Number(alvo), novaSerie: scan.trim() }]);
    setScan('');
    const restantes = pendentes.filter((p) => p.id !== alvo && !bipagens.some((b) => b.rmaItemId === p.id));
    setAlvo(restantes[0]?.id ?? '');
  };

  const concluir = async (marcarRestantesCredito: boolean) => {
    setSalvando(true);
    try {
      const d = await jsonOrThrow(await api(`/rma/${rma.id}/confronto`, {
        method: 'POST',
        body: JSON.stringify({ notaId: notaRetorno?.id, bipagens, marcarRestantesCredito }),
      }));
      toast.success('Conferência salva.');
      onAtualizado(d.rma);
      onVoltar();
    } catch (e: any) { toast.error(e.message); setSalvando(false); }
  };

  return (
    <>
      <div className="flex items-center gap-3.5 pb-5 border-b border-[var(--border-color)]">
        <button onClick={onVoltar} className="w-10 h-10 shrink-0 rounded-lg border border-[var(--border-color)] bg-[var(--bg-panel)] text-[var(--text-muted)] flex items-center justify-center shadow-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <div className="flex-1 min-w-0"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">{rma.numero} · {rma.fornecedor}</span><h1 className="text-xl font-semibold">Conferência do retorno</h1></div>
        <button onClick={onVincularNota} className={`${btnSec} shrink-0`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Nota de retorno
        </button>
      </div>

      {notaRetorno && (
        <div className="mt-4 bg-amber-500/8 border border-amber-500/20 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3 text-sm text-amber-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>
            <span>
              {notasRetorno.length === 1
                ? <>NF de retorno <b>{notaRetorno.numero}</b>{notaRetorno.serie ? ` · sér. ${notaRetorno.serie}` : ''} · {notaRetorno.natureza || 'Retorno'} · {fmt(notaRetorno.dataEmissao)}</>
                : <><b>{notasRetorno.length}</b> notas de retorno</>}
              {' · '}<b>{unidadesNaNota || esperadosTotal}</b> unidades a conferir
            </span>
          </div>
          {linhasRetorno.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 pl-7">
              {linhasRetorno.map((i, k) => (
                <span key={k} className="text-[10px] font-semibold text-amber-800/80 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5">
                  {i.quantidade}× {i.descricao}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {foraDaNota.length > 0 && (
        <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg p-3 mt-3">
          <b>{foraDaNota.length}</b> {foraDaNota.length === 1 ? 'unidade ainda não está' : 'unidades ainda não estão'} em nenhuma nota de retorno ({foraDaNota.map((i) => i.codigoTriagem).join(', ')}).
          Importe as próximas notas na tela do RMA conforme chegarem — cada nota libera as unidades dela aqui. O que não for voltar, marque Crédito / Descarte.
        </p>
      )}

      <div className="mt-4 bg-[var(--sidebar-bg)] rounded-xl p-4">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Bipe a série da unidade que voltou</span>
        <div className="flex items-center gap-3 mt-2.5">
          <select value={alvo} onChange={(e) => setAlvo(e.target.value ? Number(e.target.value) : '')} className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 h-11 text-sm">
            <option value="">Item alvo…</option>
            {pendentesReais.map((p) => <option key={p.id} value={p.id}>{p.codigoTriagem}</option>)}
          </select>
          <input value={scan} onChange={(e) => setScan(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && bipar()} placeholder="Série da unidade que chegou…" className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-4 h-11 text-sm outline-none" />
          <span className="text-xs font-bold text-slate-400">{retornos.length + bipagens.length} / {esperadosTotal}</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Se a série for a mesma que saiu → <b className="text-teal-400">Conserto</b> (mesma unidade). Se for outra → <b className="text-emerald-400">Troca</b>. O sistema decide sozinho.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5 items-start">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Aguardando bipagem · {pendentesReais.length}</span>
          <div className={`${card} mt-2 divide-y divide-[var(--border-color)]`}>
            {pendentesReais.length === 0 && <p className="text-xs text-[var(--text-muted)] p-4">Tudo bipado.</p>}
            {pendentesReais.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold tabular-nums">{p.codigoTriagem}</span>
                  <span className="text-[11px] text-[var(--text-muted)] truncate">
                    {p.produtoNome ? `${p.produtoNome} · ` : ''}saiu com {p.tipoIdentificador === 'EAN' ? 'EAN' : 'série'} {p.identificador || '—'}
                  </span>
                </div>
                <button onClick={() => setBipagens((b) => b)} className="text-[10px] font-bold uppercase text-blue-600 border border-blue-500/25 bg-blue-500/5 px-2.5 py-1 rounded-md" onMouseDown={() => setAlvo(p.id)}>selecionar</button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Conferidos · {bipagens.length}</span>
          <div className={`${card} mt-2 divide-y divide-[var(--border-color)]`}>
            {bipagens.length === 0 && <p className="text-xs text-[var(--text-muted)] p-4">Bipe um item para começar.</p>}
            {bipagens.map((b) => {
              const it = rma.itens.find((i) => i.id === b.rmaItemId);
              const conserto = ehConserto(it, b.novaSerie);
              return (
                <div key={b.rmaItemId} className={`flex items-center justify-between gap-3 p-3 border-l-2 ${conserto ? 'border-teal-500' : 'border-emerald-500'}`}>
                  <span className="text-sm font-bold tabular-nums">{it?.codigoTriagem} <span className="text-[var(--text-muted)] font-normal">→</span> {b.novaSerie}</span>
                  <span className={`text-[10px] font-bold uppercase ${conserto ? 'text-teal-600' : 'text-emerald-600'}`}>{conserto ? 'Conserto' : 'Troca'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg p-3 mt-4">
        Pode salvar o que já conferiu e voltar depois: <b>Salvar conferência</b> registra as trocas e consertos bipados e mantém o RMA em conferência para as próximas notas de retorno.
      </p>

      <div className="flex justify-end gap-2 mt-4">
        {pendentesReais.length > 0 && (
          <button
            onClick={() => { if (window.confirm(`Isto marca ${pendentesReais.length} ${pendentesReais.length === 1 ? 'unidade' : 'unidades'} como Crédito e considera a conferência encerrada. Só faça quando não for chegar mais nota de retorno.`)) concluir(true); }}
            disabled={salvando} className={btnSec}>
            Não volta mais · {pendentesReais.length} → Crédito
          </button>
        )}
        <button onClick={() => concluir(false)} disabled={salvando || bipagens.length === 0} className={btnPrimary}>
          {salvando ? 'Salvando…' : bipagens.length > 0 ? `Salvar conferência (${bipagens.length})` : 'Salvar conferência'}
        </button>
      </div>
    </>
  );
}
