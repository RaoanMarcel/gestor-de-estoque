import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../services/socketClient';

interface Notif {
  id: string;
  titulo: string;
  texto: string;
  tipo?: string;
  link?: string | null;
  criadoEm: string;
  lida?: boolean;
}

const CHAVE = 'wms_notifs';
const MAX = 40;
const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;

function carregar(): Notif[] {
  try {
    const brutos: Notif[] = JSON.parse(localStorage.getItem(CHAVE) || '[]');
    const agora = Date.now();
    return brutos
      .filter((n) => n && n.id && agora - new Date(n.criadoEm).getTime() < SETE_DIAS)
      .slice(0, MAX);
  } catch {
    return [];
  }
}
function salvar(lista: Notif[]) {
  try { localStorage.setItem(CHAVE, JSON.stringify(lista.slice(0, MAX))); } catch { }
}

function tempoRelativo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ontem';
  if (d < 7) return `${d} dias`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

const CORES: Record<string, string> = {
  RECEBIMENTO: 'bg-blue-500',
  RMA: 'bg-emerald-500',
  FULL: 'bg-purple-500',
  ATUALIZACAO: 'bg-blue-600',
  SISTEMA: 'bg-slate-400',
  INFO: 'bg-slate-400',
};

const CHAVE_RELEASE = 'wms_release_vista';

export default function NotificationBell() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<Notif[]>(() => carregar());
  const [aberto, setAberto] = useState(false);
  const [tocou, setTocou] = useState(false);
  const [balao, setBalao] = useState<{ notif: Notif; suga: boolean } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const naoLidas = notifs.filter((n) => !n.lida).length;

  useEffect(() => { salvar(notifs); }, [notifs]);

  const chegou = useRef<(raw: any) => void>(() => {});
  chegou.current = (raw: any) => {
    const n: Notif = {
      id: String(raw?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      titulo: String(raw?.titulo || 'Notificação'),
      texto: String(raw?.texto || ''),
      tipo: raw?.tipo,
      link: raw?.link ?? null,
      criadoEm: raw?.criadoEm || new Date().toISOString(),
      lida: false,
    };
    setNotifs((prev) => {
      if (prev.some((x) => x.id === n.id)) return prev;
      return [n, ...prev].slice(0, MAX);
    });
    setTocou(true);
    timers.current.push(setTimeout(() => setTocou(false), 850));
    setBalao({ notif: n, suga: false });
    timers.current.push(setTimeout(() => setBalao((b) => (b ? { ...b, suga: true } : b)), 2300));
    timers.current.push(setTimeout(() => setBalao(null), 2800));
  };

  useEffect(() => {
    const onNotif = (raw: any) => chegou.current(raw);
    socket.on('notificacao', onNotif);
    return () => { socket.off('notificacao', onNotif); };
  }, []);

  useEffect(() => {
    let vivo = true;
    const conferir = async () => {
      try {
        const r = await fetch(`/release.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok || !vivo) return;
        const rel = await r.json();
        const versao = String(rel?.versao || '').trim();
        if (!versao) return;
        const vista = localStorage.getItem(CHAVE_RELEASE);
        if (vista === versao) return;
        const recente = rel?.data && Date.now() - new Date(rel.data).getTime() < 21 * 864e5;
        localStorage.setItem(CHAVE_RELEASE, versao);
        if (!vista && !recente) return;
        chegou.current({
          id: `att-${versao}`,
          tipo: 'ATUALIZACAO',
          titulo: `Novidades · ${versao}`,
          texto: `${rel?.notas || 'Nova versão publicada.'} Toque para recarregar.`,
          criadoEm: new Date().toISOString(),
        });
      } catch { }
    };
    conferir();
    const iv = setInterval(conferir, 3 * 60 * 1000);
    const onFoco = () => { if (document.visibilityState === 'visible') conferir(); };
    document.addEventListener('visibilitychange', onFoco);
    return () => { vivo = false; clearInterval(iv); document.removeEventListener('visibilitychange', onFoco); };
  }, []);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!aberto) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [aberto]);

  const abrir = () => {
    const abrindo = !aberto;
    setAberto(abrindo);
    if (abrindo && naoLidas > 0) setNotifs((prev) => prev.map((n) => ({ ...n, lida: true })));
  };

  const clicarItem = (n: Notif) => {
    setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, lida: true } : x)));
    setAberto(false);
    if (n.tipo === 'ATUALIZACAO') { window.location.reload(); return; }
    if (n.link) navigate(n.link);
  };

  const limpar = () => { setNotifs([]); setAberto(false); };

  const podeTestar = ['DEV', 'ADMIN'].includes((localStorage.getItem('wms_cargo') || '').toUpperCase());
  const enviarTeste = async () => {
    try {
      const token = localStorage.getItem('wms_token');
      const base = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');
      await fetch(`${base}/notificacoes/testar`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch { }
  };

  return (
    <div ref={wrapRef} className="fixed top-3 right-16 md:right-5 z-[70]">
      {balao && (
        <div
          className="absolute right-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap select-none"
          style={{
            transformOrigin: 'right center',
            animation: balao.suga ? undefined : 'balao-entra .28s ease-out',
            transform: balao.suga ? 'translateX(30px) translateY(-50%) scale(.22)' : 'translateY(-50%)',
            opacity: balao.suga ? 0 : 1,
            transition: balao.suga ? 'transform .42s cubic-bezier(.5,-0.3,.7,.2), opacity .38s ease-in' : undefined,
          }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 text-white text-[11px] font-bold px-3 py-1.5 shadow-lg">
            <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
            {naoLidas > 1 ? `${naoLidas} novas notificações` : 'Uma nova notificação'}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={abrir}
        title="Notificações"
        aria-label={`Notificações${naoLidas ? ` (${naoLidas} não lidas)` : ''}`}
        className="relative h-10 w-10 flex items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-panel)] text-[var(--text-muted)] hover:text-[var(--text-main)] shadow-sm transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"
          className={`w-5 h-5 origin-top ${tocou ? 'sino-tocou' : naoLidas > 0 && !aberto ? 'sino-tremendo' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] origin-top-right rounded-xl border border-[var(--border-color)] bg-[var(--bg-panel)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Notificações</span>
            {notifs.length > 0 && (
              <button onClick={limpar} className="text-[11px] font-bold text-blue-600 hover:text-blue-700">Limpar tudo</button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border-color)]">
            {notifs.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-[var(--text-muted)]">Nenhuma notificação.</p>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => clicarItem(n)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-[var(--bg-main)]/60 transition-colors ${n.lida ? '' : 'bg-blue-500/[0.04]'}`}
                >
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${CORES[n.tipo || 'INFO'] || CORES.INFO}`} />
                  <span className="flex flex-col min-w-0">
                    <span className="text-[12px] font-bold text-[var(--text-main)]">{n.titulo}</span>
                    <span className="text-[12px] text-[var(--text-muted)] leading-snug">{n.texto}</span>
                    <span className="text-[10px] font-medium text-[var(--text-muted)]/70 mt-1">{tempoRelativo(n.criadoEm)}</span>
                  </span>
                </button>
              ))
            )}
          </div>

          {podeTestar && (
            <div className="px-4 py-2 border-t border-[var(--border-color)] bg-[var(--bg-main)]/40">
              <button onClick={enviarTeste} className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-blue-600">Enviar notificação de teste</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
