import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../../contexts/toastContext';
import { socket } from '../../services/socketClient';

// =====================================================================
// TIPOS
// =====================================================================
interface Leitura {
  id: string;
  codigo: string;
  data: string;
  usuarioNome: string;
}

interface RecebimentoItem {
  id: number;
  numItem: number;
  codigoProduto: string;
  ean: string | null;
  eanTributavel: string | null;
  descricao: string;
  ncm: string | null;
  cfop: string | null;
  unidade: string | null;
  quantidade: number;
  valorUnitario: number | null;
  valorTotal: number | null;
  precisaConferencia: boolean;
  quantidadeConferida: number;
  status: 'PENDENTE' | 'EM_PROCESSO' | 'CONFERIDO' | 'DISPENSADO';
  leituras: Leitura[];
}

interface Recebimento {
  id: number;
  identificacao: string;
  numeroNota: string | null;
  serieNota: string | null;
  chaveAcesso: string | null;
  fornecedor: string | null;
  fornecedorCnpj: string | null;
  valorTotal: number | null;
  dataEmissao: string | null;
  dataAgendada: string | null;
  observacao: string | null;
  status: 'AGENDADO' | 'IMPORTADO' | 'EM_CONFERENCIA' | 'CONFERIDO' | 'FINALIZADO';
  createdAt: string;
  usuario?: { username: string } | null;
  itens: RecebimentoItem[];
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// A trava de concorrência via socket é compartilhada com o Mercado Full; o prefixo evita
// que RecebimentoItem #N e InboundSku #N colidam na mesma chave do servidor.
const lockKey = (id: number | string) => `receb:${id}`;
const PAGINA_TAMANHO = 6;

// Badges com tints por opacidade: legíveis nos 3 temas (Ocean / Midnight / Coffee).
// `chip` = borda+texto do checkbox de filtro quando ligado; `accent` = cor nativa do checkbox.
type Badge = { label: string; dot: string; classes: string; chip?: string; accent?: string };
const NEUTRO: Badge = { label: 'Pendente', dot: 'bg-slate-400', classes: 'text-[var(--text-muted)] bg-[var(--bg-main)] border-[var(--border-color)]', chip: 'border-[var(--text-muted)] text-[var(--text-main)]', accent: '#64748b' };

const STATUS_INFO: Record<string, Badge> = {
  AGENDADO: { label: 'Agendado', dot: 'bg-purple-500', classes: 'text-purple-500 bg-purple-500/10 border-purple-500/20', chip: 'border-purple-500 text-purple-600', accent: '#a855f7' },
  IMPORTADO: { label: 'NF Importada', dot: 'bg-rose-500', classes: 'text-rose-500 bg-rose-500/10 border-rose-500/20', chip: 'border-rose-500 text-rose-600', accent: '#f43f5e' },
  EM_CONFERENCIA: { label: 'Em conferência', dot: 'bg-blue-500', classes: 'text-blue-500 bg-blue-500/10 border-blue-500/20', chip: 'border-blue-500 text-blue-600', accent: '#3b82f6' },
  CONFERIDO: { label: 'Conferido', dot: 'bg-amber-500', classes: 'text-amber-600 bg-amber-500/10 border-amber-500/20', chip: 'border-amber-500 text-amber-600', accent: '#f59e0b' },
  FINALIZADO: { label: 'Finalizado', dot: 'bg-emerald-500', classes: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20', chip: 'border-emerald-500 text-emerald-600', accent: '#10b981' },
};

const ITEM_STATUS_INFO: Record<string, Badge> = {
  PENDENTE: NEUTRO,
  EM_PROCESSO: { label: 'Em processo', dot: 'bg-blue-500', classes: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  CONFERIDO: { label: 'Conferido', dot: 'bg-emerald-500', classes: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
  DISPENSADO: { label: 'Dispensado', dot: 'bg-slate-400', classes: 'text-[var(--text-muted)] bg-[var(--bg-main)] border-[var(--border-color)]' },
};

const tocarSom = (tipo: 'sucesso' | 'erro' | 'invalido') => {
  try {
    const map = { sucesso: '/sounds/beep_sucesso.mp3', erro: '/sounds/beep_duplicidade.mp3', invalido: '/sounds/beep_erro.mp3' };
    const audio = new Audio(map[tipo]);
    audio.volume = 1.0;
    audio.play().catch(() => {});
  } catch { /* silencioso */ }
};

const getUsuarioLogado = () => {
  const keysToTry = ['wms_user', 'wms_username', 'username', 'usuario', 'nome', 'user'];
  for (const key of keysToTry) {
    const val = localStorage.getItem(key);
    if (val && val !== 'undefined' && val !== 'null') {
      if (val.startsWith('{')) {
        try {
          const p = JSON.parse(val);
          const nome = p.nome || p.username || p.name || p.usuario;
          if (nome) return String(nome);
        } catch { /* ignore */ }
      } else {
        return val;
      }
    }
  }
  return 'Operador_X';
};

const fmtMoeda = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtData = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString('pt-BR') : '—';

// Paginador simples com tokens de tema — some quando só há uma página.
function Paginador({ pagina, totalPaginas, onChange }: { pagina: number; totalPaginas: number; onChange: (p: number) => void }) {
  if (totalPaginas <= 1) return null;
  const btn = 'h-9 min-w-9 px-2 rounded-lg border text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const paginas = Array.from({ length: totalPaginas }, (_, i) => i + 1);
  return (
    <div className="flex items-center justify-center gap-1.5 mt-6 flex-wrap">
      <button className={`${btn} border-[var(--border-color)] bg-[var(--bg-panel)] text-[var(--text-main)] hover:border-blue-500`} disabled={pagina <= 1} onClick={() => onChange(pagina - 1)}>‹</button>
      {totalPaginas <= 7 ? (
        paginas.map((p) => (
          <button key={p} onClick={() => onChange(p)} className={`${btn} ${p === pagina ? 'bg-blue-600 border-blue-600 text-white' : 'border-[var(--border-color)] bg-[var(--bg-panel)] text-[var(--text-main)] hover:border-blue-500'}`}>{p}</button>
        ))
      ) : (
        <span className="px-3 text-sm font-bold text-[var(--text-muted)]">Página {pagina} de {totalPaginas}</span>
      )}
      <button className={`${btn} border-[var(--border-color)] bg-[var(--bg-panel)] text-[var(--text-main)] hover:border-blue-500`} disabled={pagina >= totalPaginas} onClick={() => onChange(pagina + 1)}>›</button>
    </div>
  );
}

// =====================================================================
// COMPONENTE
// =====================================================================
export default function RecebimentoMercadoria() {
  const toast = useToast();

  const [currentScreen, setCurrentScreen] = useState<1 | 2 | 3 | 4>(1);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);

  // Filtros da tela 1
  const [termoBusca, setTermoBusca] = useState('');
  const dataAtual = new Date();
  const [dataInicio, setDataInicio] = useState(new Date(dataAtual.getTime() - 30 * 864e5).toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(new Date(dataAtual.getTime() + 30 * 864e5).toISOString().split('T')[0]);
  const [filtros, setFiltros] = useState<Record<string, boolean>>({
    AGENDADO: true, IMPORTADO: true, EM_CONFERENCIA: true, CONFERIDO: true, FINALIZADO: true,
  });
  const [pagina, setPagina] = useState(1);

  // Agendamento (tela 2)
  const [formAgenda, setFormAgenda] = useState({ identificacao: '', fornecedor: '', numeroNota: '', dataAgendada: '', observacao: '' });
  const [isSalvando, setIsSalvando] = useState(false);

  // Importação XML (tela 3)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [vincularId, setVincularId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Conferência (tela 4)
  const [recebimentoAtivo, setRecebimentoAtivo] = useState<Recebimento | null>(null);
  const [itens, setItens] = useState<RecebimentoItem[]>([]);
  const [itemEmConferencia, setItemEmConferencia] = useState<RecebimentoItem | null>(null);
  const [codigoLido, setCodigoLido] = useState('');
  const inputBipRef = useRef<HTMLInputElement>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lockedItens, setLockedItens] = useState<Record<string, string>>({});
  const itemTravadoRef = useRef<number | null>(null);

  const somenteLeitura = recebimentoAtivo?.status === 'FINALIZADO';

  // ---------------------------------------------------------------
  // SOCKET (trava de concorrência — reutiliza os eventos de lock)
  // ---------------------------------------------------------------
  useEffect(() => {
    const onLocksInitial = (data: Record<string, string>) => setLockedItens(data);
    const onLockUpdate = ({ skuId, lockedBy }: { skuId: string; lockedBy: string | null }) => {
      setLockedItens((prev) => {
        const novo = { ...prev };
        if (lockedBy) novo[skuId] = lockedBy;
        else delete novo[skuId];
        return novo;
      });
    };
    const onLockedError = (data: { usuario: string }) => {
      toast.error(`Atenção! ${data.usuario} já está conferindo este item.`);
      setItemEmConferencia(null);
    };
    const onConnect = () => socket.emit('request_sku_locks');

    socket.on('sku_locks_initial', onLocksInitial);
    socket.on('sku_lock_update', onLockUpdate);
    socket.on('sku_locked_error', onLockedError);
    socket.on('connect', onConnect);
    socket.emit('request_sku_locks'); // puxa o estado atual mesmo se o socket já estava conectado

    return () => {
      socket.off('sku_locks_initial', onLocksInitial);
      socket.off('sku_lock_update', onLockUpdate);
      socket.off('sku_locked_error', onLockedError);
      socket.off('connect', onConnect);
      // libera a trava se o operador sair da tela com um item aberto
      if (itemTravadoRef.current != null) {
        socket.emit('unlock_sku', { skuId: lockKey(itemTravadoRef.current) });
        itemTravadoRef.current = null;
      }
    };
  }, [toast]);

  // ---------------------------------------------------------------
  // CARGA DE DADOS
  // ---------------------------------------------------------------
  const carregarDashboard = async () => {
    try {
      const token = localStorage.getItem('wms_token');
      const res = await fetch(`${API_URL}/recebimentos/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setRecebimentos(data.recebimentos || []);
      }
    } catch (err) {
      console.error('Erro dashboard recebimento', err);
    }
  };

  useEffect(() => { carregarDashboard(); }, []);

  useEffect(() => {
    if (itemEmConferencia && inputBipRef.current) setTimeout(() => inputBipRef.current?.focus(), 60);
  }, [itemEmConferencia]);

  // ---------------------------------------------------------------
  // AGENDAMENTO
  // ---------------------------------------------------------------
  const handleAgendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAgenda.identificacao.trim()) return toast.error('Informe a identificação do recebimento.');
    setIsSalvando(true);
    try {
      const token = localStorage.getItem('wms_token');
      const res = await fetch(`${API_URL}/recebimentos/agendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formAgenda),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.mensagem);
      setFormAgenda({ identificacao: '', fornecedor: '', numeroNota: '', dataAgendada: '', observacao: '' });
      await carregarDashboard();
      setCurrentScreen(1);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao agendar.');
    } finally {
      setIsSalvando(false);
    }
  };

  // ---------------------------------------------------------------
  // IMPORTAÇÃO DE XML
  // ---------------------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setSelectedFile(e.target.files[0]);
  };

  const handleImportar = async () => {
    if (!selectedFile) return toast.error('Anexe o arquivo XML da NF-e.');
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('wms_token');
      const formData = new FormData();
      formData.append('xml', selectedFile);
      if (vincularId) formData.append('recebimentoId', vincularId);

      const res = await fetch(`${API_URL}/recebimentos/importar-xml`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.mensagem} (${data.totalItens} itens)`);
      setSelectedFile(null);
      setVincularId('');
      await carregarDashboard();
      setCurrentScreen(1);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar XML.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------------------------------------------------------------
  // CONFERÊNCIA
  // ---------------------------------------------------------------
  const abrirConferencia = (r: Recebimento) => {
    if (r.status === 'AGENDADO') {
      setVincularId(String(r.id));
      setCurrentScreen(3);
      return;
    }
    setRecebimentoAtivo(r);
    setItens(r.itens);
    setItemEmConferencia(null);
    setCurrentScreen(4);
  };

  const persistir = (itensAtualizados: RecebimentoItem[]) => {
    if (!recebimentoAtivo) return;
    setRecebimentos((prev) => prev.map((r) => (r.id === recebimentoAtivo.id ? { ...r, itens: itensAtualizados } : r)));

    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem('wms_token');
        const res = await fetch(`${API_URL}/recebimentos/${recebimentoAtivo.id}/conferencia`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ itens: itensAtualizados }),
        });
        if (res.ok) {
          const data = await res.json();
          setRecebimentoAtivo((prev) => (prev ? { ...prev, status: data.recebimento.status } : prev));
          setRecebimentos((prev) => prev.map((r) => (r.id === data.recebimento.id ? data.recebimento : r)));
        }
      } catch (err) {
        console.error('Erro no autosave da conferência', err);
      }
    }, 1500);
  };

  const toggleConferencia = (item: RecebimentoItem) => {
    if (somenteLeitura) return;
    const precisa = !item.precisaConferencia;
    const atualizados = itens.map((i) => {
      if (i.id !== item.id) return i;
      return {
        ...i,
        precisaConferencia: precisa,
        status: !precisa ? 'DISPENSADO' : (i.quantidadeConferida >= i.quantidade && i.quantidade > 0 ? 'CONFERIDO' : i.quantidadeConferida > 0 ? 'EM_PROCESSO' : 'PENDENTE'),
      } as RecebimentoItem;
    });
    setItens(atualizados);
    persistir(atualizados);
  };

  const abrirItem = (item: RecebimentoItem) => {
    if (!socket.connected) {
      return toast.error('Sem conexão em tempo real. Recarregue a página antes de bipar.');
    }
    const dono = lockedItens[lockKey(item.id)];
    if (dono && dono !== getUsuarioLogado()) {
      return toast.error(`${dono} já está conferindo este item agora mesmo.`);
    }
    socket.emit('lock_sku', { skuId: lockKey(item.id), usuario: getUsuarioLogado() });
    itemTravadoRef.current = item.id;
    setItemEmConferencia(item);
    setCodigoLido('');
  };

  const fecharItem = () => {
    if (itemTravadoRef.current != null) {
      socket.emit('unlock_sku', { skuId: lockKey(itemTravadoRef.current) });
      itemTravadoRef.current = null;
    }
    setItemEmConferencia(null);
    setCodigoLido('');
  };

  const handleBipar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemEmConferencia || !codigoLido.trim()) return;
    const codigo = codigoLido.trim().toUpperCase();

    const alvos = [
      itemEmConferencia.codigoProduto,
      itemEmConferencia.ean,
      itemEmConferencia.eanTributavel,
    ].filter(Boolean).map((c) => String(c).toUpperCase());

    if (!alvos.includes(codigo)) {
      tocarSom('invalido');
      toast.error('Código não corresponde a este item da NF.');
      setCodigoLido('');
      return;
    }
    if (itemEmConferencia.quantidadeConferida >= itemEmConferencia.quantidade) {
      tocarSom('erro');
      toast.error('Quantidade da nota já atingida!');
      setCodigoLido('');
      return;
    }

    tocarSom('sucesso');
    const novaLeitura: Leitura = {
      id: Math.random().toString(36).substring(2, 11),
      codigo,
      data: new Date().toISOString(),
      usuarioNome: getUsuarioLogado(),
    };
    const novaQtd = itemEmConferencia.quantidadeConferida + 1;
    const concluido = novaQtd >= itemEmConferencia.quantidade;

    const atualizados = itens.map((i) => {
      if (i.id !== itemEmConferencia.id) return i;
      return {
        ...i,
        quantidadeConferida: novaQtd,
        status: (concluido ? 'CONFERIDO' : 'EM_PROCESSO') as RecebimentoItem['status'],
        leituras: [...(i.leituras || []), novaLeitura],
      };
    });
    setItens(atualizados);
    setItemEmConferencia(atualizados.find((i) => i.id === itemEmConferencia.id) || null);
    persistir(atualizados);
    setCodigoLido('');

    if (concluido) {
      setTimeout(() => { fecharItem(); toast.success('Item conferido!'); }, 900);
    }
  };

  const handleRemoverLeitura = (idLeitura: string) => {
    if (!itemEmConferencia) return;
    const atualizados = itens.map((i) => {
      if (i.id !== itemEmConferencia.id) return i;
      const leituras = (i.leituras || []).filter((l) => l.id !== idLeitura);
      const novaQtd = Math.max(0, i.quantidadeConferida - 1);
      return {
        ...i,
        quantidadeConferida: novaQtd,
        status: (novaQtd === 0 ? 'PENDENTE' : 'EM_PROCESSO') as RecebimentoItem['status'],
        leituras,
      };
    });
    setItens(atualizados);
    setItemEmConferencia(atualizados.find((i) => i.id === itemEmConferencia.id) || null);
    persistir(atualizados);
  };

  const itemResolvido = (i: RecebimentoItem) => i.status === 'CONFERIDO' || i.status === 'DISPENSADO';
  const todosResolvidos = itens.length > 0 && itens.every(itemResolvido);

  const handleFinalizar = async () => {
    if (!recebimentoAtivo) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    try {
      const token = localStorage.getItem('wms_token');
      // Garante que o último estado foi salvo antes de finalizar
      await fetch(`${API_URL}/recebimentos/${recebimentoAtivo.id}/conferencia`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itens }),
      });
      const res = await fetch(`${API_URL}/recebimentos/${recebimentoAtivo.id}/acao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ acao: 'FINALIZAR' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.mensagem);
      await carregarDashboard();
      setCurrentScreen(1);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao finalizar.');
    }
  };

  const handleExcluir = async (id: number) => {
    const ok = await toast.confirm('Deseja realmente excluir este recebimento?');
    if (!ok) return;
    try {
      const token = localStorage.getItem('wms_token');
      const res = await fetch(`${API_URL}/recebimentos/${id}/acao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ acao: 'EXCLUIR' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast.success(data.mensagem);
      carregarDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir.');
    }
  };

  // ---------------------------------------------------------------
  // FILTRAGEM DA LISTA
  // ---------------------------------------------------------------
  const recebimentosFiltrados = recebimentos.filter((r) => {
    if (!filtros[r.status]) return false;
    if (dataInicio && dataFim && r.createdAt) {
      const d = new Date(r.createdAt).toISOString().split('T')[0];
      if (d < dataInicio || d > dataFim) return false;
    }
    if (!termoBusca) return true;
    const t = termoBusca.toLowerCase();
    return (
      r.identificacao.toLowerCase().includes(t) ||
      (r.fornecedor || '').toLowerCase().includes(t) ||
      (r.numeroNota || '').toLowerCase().includes(t) ||
      (r.chaveAcesso || '').toLowerCase().includes(t) ||
      r.itens.some((i) => i.codigoProduto.toLowerCase().includes(t) || (i.ean || '').toLowerCase().includes(t) || i.descricao.toLowerCase().includes(t))
    );
  });

  const contarPorStatus = (s: string) => recebimentos.filter((r) => r.status === s).length;

  // Paginação (6 por página) — volta para a página 1 sempre que os filtros mudam
  useEffect(() => { setPagina(1); }, [termoBusca, filtros, dataInicio, dataFim]);
  const totalPaginas = Math.max(1, Math.ceil(recebimentosFiltrados.length / PAGINA_TAMANHO));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const recebimentosPagina = recebimentosFiltrados.slice((paginaSegura - 1) * PAGINA_TAMANHO, paginaSegura * PAGINA_TAMANHO);

  const statusKeys = Object.keys(STATUS_INFO);
  const todosMarcados = statusKeys.every((s) => filtros[s]);
  const toggleTodos = () => {
    const alvo = !todosMarcados;
    setFiltros(Object.fromEntries(statusKeys.map((s) => [s, alvo])));
  };

  // ---------------------------------------------------------------
  // CABEÇALHO DE PÁGINA (estilo Home) + botão voltar nas sub-telas
  // ---------------------------------------------------------------
  const PageHeader = ({ titulo, onBack }: { titulo: string; onBack?: () => void }) => (
    <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-5 mb-6">
      {onBack && (
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center shrink-0 rounded-lg border border-[var(--border-color)] bg-[var(--bg-panel)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shadow-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Entrada de mercadoria</span>
        </div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-[var(--text-main)] mt-1 truncate">{titulo}</h1>
      </div>
    </div>
  );

  // =====================================================================
  // RENDER
  // =====================================================================
  const inputCls = 'w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-main)] p-3.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors';
  const labelCls = 'block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5';
  const btnPrimary = 'bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors active:scale-[0.98] disabled:opacity-60';

  return (
    <div className="min-h-full bg-[var(--bg-main)] text-[var(--text-main)] p-4 md:p-6 lg:p-8 antialiased">

      {/* ================= TELA 1 — DASHBOARD ================= */}
      {currentScreen === 1 && (
        <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
          <PageHeader titulo="Recebimento de Mercadoria" />

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button onClick={() => setCurrentScreen(2)} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-panel)] text-[var(--text-main)] font-bold text-sm hover:border-blue-500 hover:text-blue-600 transition-colors shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Agendar Recebimento
            </button>
            <button onClick={() => { setVincularId(''); setCurrentScreen(3); }} className={`flex-1 flex items-center justify-center gap-2 py-3.5 ${btnPrimary}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
              Importar XML da NF
            </button>
          </div>

          {/* Toolbar de filtros */}
          <div className="flex flex-col lg:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Buscar por identificação, fornecedor, NF, produto..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className={`${inputCls} pl-10`} />
            </div>
            <div className="flex items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-panel)] overflow-hidden shrink-0">
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="p-2.5 text-sm bg-transparent text-[var(--text-main)] focus:outline-none" />
              <span className="px-2 text-xs font-medium text-[var(--text-muted)] border-x border-[var(--border-color)] self-stretch flex items-center">até</span>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="p-2.5 text-sm bg-transparent text-[var(--text-main)] focus:outline-none" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6 border-b border-[var(--border-color)] pb-5">
            <label className={`flex items-center gap-1.5 cursor-pointer bg-[var(--bg-panel)] px-3 py-2 rounded-lg border shadow-sm text-xs font-bold transition-colors ${todosMarcados ? 'border-[var(--text-muted)] text-[var(--text-main)]' : 'border-[var(--border-color)] text-[var(--text-muted)]'}`}>
              <input type="checkbox" checked={todosMarcados} onChange={toggleTodos} style={{ accentColor: '#64748b' }} className="w-4 h-4 rounded cursor-pointer" />
              Marcar Todos
            </label>
            {statusKeys.map((s) => {
              const info = STATUS_INFO[s];
              const ativo = !!filtros[s];
              return (
                <label key={s} className={`flex items-center gap-1.5 cursor-pointer bg-[var(--bg-panel)] px-3 py-2 rounded-lg border shadow-sm text-xs font-bold transition-colors ${ativo ? info.chip : 'border-[var(--border-color)] text-[var(--text-muted)]'}`}>
                  <input type="checkbox" checked={ativo} onChange={() => setFiltros((p) => ({ ...p, [s]: !p[s] }))} style={{ accentColor: info.accent }} className="w-4 h-4 rounded cursor-pointer" />
                  {info.label}
                  <span className={`ml-1 text-[13px] font-black ${ativo ? '' : 'text-[var(--text-muted)]'}`}>{contarPorStatus(s)}</span>
                </label>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recebimentosPagina.map((r) => {
              const info = STATUS_INFO[r.status];
              const totalItens = r.itens.length;
              const resolvidos = r.itens.filter(itemResolvido).length;
              const bloqueios = r.itens.filter((i) => lockedItens[lockKey(i.id)] && lockedItens[lockKey(i.id)] !== getUsuarioLogado());
              return (
                <div key={r.id} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm relative transition-shadow hover:shadow-md cursor-pointer flex flex-col" onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; abrirConferencia(r); }}>
                  {r.status !== 'FINALIZADO' && (
                    <button onClick={() => handleExcluir(r.id)} className="absolute top-3 right-3 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors p-1" title="Excluir">
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                  <h4 className="font-bold text-[var(--text-main)] text-base mb-2 pr-8 leading-snug break-words">{r.identificacao}</h4>
                  <div className="flex flex-col gap-0.5 text-[11px] font-medium text-[var(--text-muted)] mb-3 flex-1">
                    {r.fornecedor && <span className="truncate">Forn.: {r.fornecedor}</span>}
                    {r.numeroNota && <span>NF: {r.numeroNota}{r.serieNota ? `/${r.serieNota}` : ''}</span>}
                    {totalItens > 0 && <span>Itens conferidos: {resolvidos}/{totalItens}</span>}
                    {r.valorTotal != null && <span>{fmtMoeda(r.valorTotal)}</span>}
                    {r.status === 'AGENDADO' && r.dataAgendada && <span>Previsto: {fmtData(r.dataAgendada)}</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold ${info.classes}`}>
                      <span className={`w-2 h-2 rounded-full ${info.dot}`} />{info.label}
                    </div>
                    {bloqueios.length > 0 && (
                      <div className="text-[10px] text-amber-600 font-bold bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 animate-pulse whitespace-nowrap">⚠ {bloqueios.length} em uso</div>
                    )}
                  </div>
                  <button onClick={() => abrirConferencia(r)} className="w-full py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)] text-sm font-bold rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors">
                    {r.status === 'AGENDADO' ? 'Importar XML da NF' : r.status === 'FINALIZADO' ? 'Ver detalhes' : r.status === 'CONFERIDO' ? 'Revisar e finalizar' : 'Conferir mercadoria'}
                  </button>
                </div>
              );
            })}
          </div>
          {recebimentosFiltrados.length === 0 && (
            <div className="text-center text-[var(--text-muted)] text-sm py-16 font-medium">Nenhum recebimento encontrado.</div>
          )}

          <Paginador pagina={paginaSegura} totalPaginas={totalPaginas} onChange={setPagina} />
        </div>
      )}

      {/* ================= TELA 2 — AGENDAR ================= */}
      {currentScreen === 2 && (
        <div className="max-w-xl mx-auto animate-in slide-in-from-right-8 duration-300">
          <PageHeader titulo="Agendar Recebimento" onBack={() => setCurrentScreen(1)} />
          <form onSubmit={handleAgendar} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <div>
              <label className={labelCls}>Identificação *</label>
              <input type="text" value={formAgenda.identificacao} onChange={(e) => setFormAgenda({ ...formAgenda, identificacao: e.target.value })} placeholder="Ex.: Entrega Fornecedor X - Segunda" className={inputCls} autoFocus />
            </div>
            <div>
              <label className={labelCls}>Fornecedor</label>
              <input type="text" value={formAgenda.fornecedor} onChange={(e) => setFormAgenda({ ...formAgenda, fornecedor: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Nº da NF (previsto)</label>
              <input type="text" value={formAgenda.numeroNota} onChange={(e) => setFormAgenda({ ...formAgenda, numeroNota: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Data/hora prevista da entrega</label>
              <input type="datetime-local" value={formAgenda.dataAgendada} onChange={(e) => setFormAgenda({ ...formAgenda, dataAgendada: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Observação</label>
              <textarea value={formAgenda.observacao} onChange={(e) => setFormAgenda({ ...formAgenda, observacao: e.target.value })} rows={3} className={`${inputCls} resize-none`} />
            </div>
            <button type="submit" disabled={isSalvando} className={`w-full py-3.5 ${btnPrimary}`}>
              {isSalvando ? 'Salvando...' : 'Agendar Recebimento'}
            </button>
          </form>
        </div>
      )}

      {/* ================= TELA 3 — IMPORTAR XML ================= */}
      {currentScreen === 3 && (
        <div className="max-w-xl mx-auto animate-in slide-in-from-right-8 duration-300">
          <PageHeader titulo="Importar XML da NF" onBack={() => { setSelectedFile(null); setVincularId(''); setCurrentScreen(1); }} />
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-2xl p-5 md:p-6 shadow-sm">
            {recebimentos.some((r) => r.status === 'AGENDADO') && (
              <div className="mb-5">
                <label className={labelCls}>Vincular a um agendamento (opcional)</label>
                <select value={vincularId} onChange={(e) => setVincularId(e.target.value)} className={inputCls}>
                  <option value="">— Criar novo recebimento —</option>
                  {recebimentos.filter((r) => r.status === 'AGENDADO').map((r) => (
                    <option key={r.id} value={r.id}>{r.identificacao}</option>
                  ))}
                </select>
              </div>
            )}
            <input type="file" accept=".xml,text/xml,application/xml" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 flex flex-col items-center gap-2 mb-6 cursor-pointer hover:border-blue-500 transition-colors text-center">
              <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <span className="text-sm font-semibold text-[var(--text-muted)] break-all">{selectedFile ? selectedFile.name : 'Anexar XML da NF-e'}</span>
            </div>
            <button onClick={handleImportar} disabled={isProcessing} className={`w-full py-3.5 ${btnPrimary}`}>
              {isProcessing ? 'Processando...' : 'Importar e ler NF'}
            </button>
          </div>
        </div>
      )}

      {/* ================= TELA 4 — CONFERÊNCIA ================= */}
      {currentScreen === 4 && recebimentoAtivo && (
        <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
          <PageHeader
            titulo={recebimentoAtivo.identificacao}
            onBack={() => { fecharItem(); carregarDashboard(); setCurrentScreen(1); }}
          />

          {!itemEmConferencia && (
            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 md:p-5 shadow-sm mb-5">
              <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <span className="text-[var(--text-muted)]"><span className="font-semibold text-[var(--text-main)]">Fornecedor: </span>{recebimentoAtivo.fornecedor || '—'}</span>
                <span className="text-[var(--text-muted)]"><span className="font-semibold text-[var(--text-main)]">NF: </span>{recebimentoAtivo.numeroNota || '—'}{recebimentoAtivo.serieNota ? ` / ${recebimentoAtivo.serieNota}` : ''}</span>
                <span className="text-[var(--text-muted)]"><span className="font-semibold text-[var(--text-main)]">Emissão: </span>{fmtData(recebimentoAtivo.dataEmissao)}</span>
                <span className="text-[var(--text-muted)]"><span className="font-semibold text-[var(--text-main)]">Valor: </span>{fmtMoeda(recebimentoAtivo.valorTotal)}</span>
                {recebimentoAtivo.chaveAcesso && (
                  <span className="sm:col-span-2 lg:col-span-4 text-[10px] text-[var(--text-muted)] break-all"><span className="font-semibold text-[var(--text-main)]">Chave: </span>{recebimentoAtivo.chaveAcesso}</span>
                )}
              </div>
            </div>
          )}

          {somenteLeitura && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg text-center py-2 text-xs font-bold uppercase tracking-wider mb-5">
              Recebimento finalizado — somente leitura
            </div>
          )}

          {/* LISTA DE ITENS */}
          {!itemEmConferencia && (
            <div className="grid gap-4 lg:grid-cols-2">
              {itens.map((item) => {
                const info = ITEM_STATUS_INFO[item.status] || NEUTRO;
                const bloqueadoPor = lockedItens[lockKey(item.id)];
                const taBloqueado = bloqueadoPor && bloqueadoPor !== getUsuarioLogado();
                return (
                  <div key={item.id} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm relative overflow-hidden">
                    {item.status === 'CONFERIDO' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                    {item.status === 'DISPENSADO' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-400" />}

                    <div className="flex justify-between items-start gap-3 mb-2 pl-2">
                      <div className="min-w-0">
                        <div className="font-bold text-[var(--text-main)] text-[15px]">Item {item.numItem} · {item.codigoProduto}</div>
                        {taBloqueado && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> {bloqueadoPor} bipando
                          </span>
                        )}
                      </div>
                      <div className={`shrink-0 text-sm font-bold px-2 py-0.5 rounded ${item.status === 'CONFERIDO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-[var(--bg-main)] text-[var(--text-main)]'}`}>
                        {item.precisaConferencia ? `${item.quantidadeConferida} / ${item.quantidade}` : `${item.quantidade} ${item.unidade || ''}`}
                      </div>
                    </div>

                    <div className="text-sm font-medium text-[var(--text-main)] leading-snug mt-2 mb-3 p-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg border-l-4 border-l-blue-500">
                      {item.descricao}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5 text-[11px] text-[var(--text-muted)] mb-3 pl-2">
                      <div><span className="font-bold uppercase opacity-70">EAN:</span> {item.ean || '—'}</div>
                      <div><span className="font-bold uppercase opacity-70">NCM:</span> {item.ncm || '—'}</div>
                      <div><span className="font-bold uppercase opacity-70">CFOP:</span> {item.cfop || '—'}</div>
                      <div><span className="font-bold uppercase opacity-70">Unid.:</span> {item.unidade || '—'}</div>
                      <div><span className="font-bold uppercase opacity-70">V. Unit.:</span> {fmtMoeda(item.valorUnitario)}</div>
                      <div><span className="font-bold uppercase opacity-70">V. Total:</span> {fmtMoeda(item.valorTotal)}</div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-[var(--border-color)] pt-3 pl-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] cursor-pointer select-none">
                        <input type="checkbox" checked={item.precisaConferencia} disabled={somenteLeitura} onChange={() => toggleConferencia(item)} className="w-4 h-4 rounded cursor-pointer accent-blue-600" />
                        Requer conferência
                      </label>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold ${info.classes}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />{info.label}
                      </div>
                    </div>

                    {item.precisaConferencia && item.status !== 'CONFERIDO' && !somenteLeitura && (
                      taBloqueado ? (
                        <div className="w-full py-2.5 mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm font-bold text-amber-600 flex items-center justify-center gap-1.5">
                          Em uso por: {bloqueadoPor}
                        </div>
                      ) : (
                        <button onClick={() => abrirItem(item)} className="w-full py-2.5 mt-3 bg-[var(--bg-main)] hover:border-blue-500 hover:text-blue-600 border border-[var(--border-color)] rounded-lg text-sm font-bold text-[var(--text-main)] transition-colors flex items-center justify-center gap-1.5">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg> Bipar item
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* PAINEL DE BIPAGEM */}
          {itemEmConferencia && (
            <div className="max-w-2xl mx-auto bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl shadow-sm overflow-hidden mb-6">
              <div className="p-4 md:p-5 border-b border-[var(--border-color)]">
                <div className="flex justify-between items-start gap-3">
                  <div className="font-bold text-[var(--text-main)] text-[18px]">Item {itemEmConferencia.numItem} · {itemEmConferencia.codigoProduto}</div>
                  <button onClick={fecharItem} className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-bold uppercase bg-[var(--bg-main)] border border-[var(--border-color)] px-3 py-1.5 rounded-md transition-colors">Fechar</button>
                </div>
                <div className="text-sm font-medium text-[var(--text-main)] leading-snug mt-3 p-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg border-l-4 border-l-blue-500">
                  {itemEmConferencia.descricao}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-2 flex gap-3 flex-wrap">
                  <span>EAN: {itemEmConferencia.ean || '—'}</span>
                  <span>EAN Trib.: {itemEmConferencia.eanTributavel || '—'}</span>
                </div>

                <div className="flex gap-3 mt-4">
                  <div className="flex-1 text-center bg-[var(--danger-soft)] border border-[var(--border-color)] p-3 rounded-xl">
                    <div className="text-[10px] font-black text-[var(--danger)] uppercase tracking-widest">Faltam</div>
                    <div className="text-3xl font-black leading-none mt-1 text-[var(--danger)]">{Math.max(0, itemEmConferencia.quantidade - itemEmConferencia.quantidadeConferida)}</div>
                  </div>
                  <div className="flex-1 text-center bg-[var(--success-soft)] border border-[var(--border-color)] p-3 rounded-xl">
                    <div className="text-[10px] font-black text-[var(--success)] uppercase tracking-widest">Conferidos</div>
                    <div className="text-3xl font-black leading-none mt-1 text-[var(--text-main)]">{itemEmConferencia.quantidadeConferida}</div>
                  </div>
                </div>
              </div>

              {!somenteLeitura && (
                <div className="p-4 md:p-5 bg-[var(--bg-main)]">
                  <form onSubmit={handleBipar}>
                    <input
                      ref={inputBipRef}
                      type="text"
                      autoComplete="off"
                      value={codigoLido}
                      onChange={(e) => setCodigoLido(e.target.value)}
                      placeholder="Bipe o código do produto ou EAN..."
                      className="w-full border-2 border-blue-500 rounded-xl p-4 text-center font-bold text-[var(--text-main)] bg-[var(--bg-panel)] focus:outline-none focus:ring-4 focus:ring-blue-500/20 shadow-inner placeholder:text-[var(--text-muted)] placeholder:font-medium"
                    />
                  </form>
                </div>
              )}

              {itemEmConferencia.leituras && itemEmConferencia.leituras.length > 0 && (
                <div className="p-4 bg-[var(--bg-main)] border-t border-[var(--border-color)]">
                  <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Histórico de bipagem</h4>
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {[...itemEmConferencia.leituras].reverse().map((l) => (
                      <li key={l.id} className="flex justify-between items-center bg-[var(--bg-panel)] p-2 rounded-lg border border-[var(--border-color)]">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[var(--text-main)]">{l.codigo}</span>
                          <span className="text-[9px] text-[var(--text-muted)] mt-1 font-medium">Bipado por: {l.usuarioNome || 'Operador'}</span>
                        </div>
                        {!somenteLeitura && (
                          <button type="button" onClick={() => handleRemoverLeitura(l.id)} className="text-[var(--text-muted)] hover:text-[var(--danger)] p-2 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* FINALIZAR */}
          {!itemEmConferencia && !somenteLeitura && todosResolvidos && (
            <button onClick={handleFinalizar} className={`w-full mt-5 py-4 text-[15px] flex items-center justify-center gap-2 ${btnPrimary}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Finalizar Recebimento
            </button>
          )}

          {!itemEmConferencia && itens.length === 0 && (
            <div className="text-center text-[var(--text-muted)] text-sm py-16 font-medium">Este recebimento ainda não possui itens. Importe o XML da NF.</div>
          )}
        </div>
      )}

    </div>
  );
}
