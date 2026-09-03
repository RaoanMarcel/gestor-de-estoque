import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const ls = (k: string) => {
  const v = localStorage.getItem(k);
  return v && v !== 'undefined' && v !== 'null' ? v : '';
};
const lsJson = <T,>(k: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(k) || '') as T; } catch { return fallback; }
};

async function api(path: string) {
  const token = localStorage.getItem('wms_token');
  const r = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

const card = 'bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl shadow-sm';

function StatCard({ titulo, valor, sub, emBreve }: { titulo: string; valor: string | number; sub?: string; emBreve?: boolean }) {
  return (
    <div className={`${card} p-4 flex flex-col gap-1 ${emBreve ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{titulo}</span>
        {emBreve && <span className="text-[9px] font-bold uppercase tracking-wide text-blue-600 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">Em breve</span>}
      </div>
      <span className="text-2xl font-bold tracking-tight tabular-nums text-[var(--text-main)]">{valor}</span>
      {sub && <span className="text-[11px] font-medium text-[var(--text-muted)]">{sub}</span>}
    </div>
  );
}

export default function Dashboard() {
  // "nome.sobrenome" → "Nome" (só o primeiro nome, primeira letra maiúscula)
  const primeiroNome = (() => {
    const bruto = (ls('wms_user') || 'Operador').split(/[.\s@]/)[0];
    return bruto ? bruto.charAt(0).toUpperCase() + bruto.slice(1).toLowerCase() : 'Operador';
  })();
  const tenant = ls('wms_tenant');
  const modulos = useMemo(() => lsJson<string[]>('wms_modulos', []), []);
  const permissoes = useMemo(() => lsJson<string[]>('wms_permissoes', []), []);

  const podeArmazem = ['malha', 'estoque', 'reports'].some((m) => modulos.includes(m))
    && permissoes.some((p) => p.startsWith('malha') || p.startsWith('estoque') || p.startsWith('reports'));
  const temRecebimento = modulos.includes('recebimento') && permissoes.some((p) => p.startsWith('recebimento'));
  const temRma = modulos.includes('rma') && permissoes.some((p) => p.startsWith('estoque:rma'));
  const temFull = modulos.includes('full') && permissoes.some((p) => p.startsWith('full'));

  const [armazem, setArmazem] = useState<{ pallets: number; ocupados: number; itens: number } | null>(null);
  const [recebimento, setRecebimento] = useState<{ total: number; abertos: number } | null>(null);
  const [rma, setRma] = useState<{ total: number; abertos: number } | null>(null);
  const [full, setFull] = useState<{ total: number; faltaBipagem: number } | null>(null);

  useEffect(() => {
    if (podeArmazem) {
      api('/pallets').then((d) => {
        const lista: any[] = Array.isArray(d) ? d : (d.pallets || []);
        const qtd = (p: any) => p.produtos?.length ?? p._count?.produtos ?? 0;
        const itens = lista.reduce((s, p) => {
          const tipo = (p.tipo || 'PADRAO').toUpperCase();
          return tipo === 'PADRAO' || tipo === '' ? s + qtd(p) : s;
        }, 0);
        const ocupados = lista.filter((p) => qtd(p) > 0).length;
        setArmazem({ pallets: lista.length, ocupados, itens });
      }).catch(() => {});
    }
    if (temRecebimento) {
      api('/recebimentos/dashboard').then((d) => {
        const lista: any[] = d.recebimentos || [];
        const abertos = lista.filter((r) => r.status !== 'FINALIZADO').length;
        setRecebimento({ total: lista.length, abertos });
      }).catch(() => {});
    }
    if (temRma) {
      api('/rma').then((d) => {
        const lista: any[] = d.rmas || [];
        const abertos = lista.filter((r) => r.status !== 'FINALIZADO' && r.status !== 'CANCELADO').length;
        setRma({ total: lista.length, abertos });
      }).catch(() => {});
    }
    if (temFull) {
      api('/inbounds/dashboard').then((d) => {
        const lista: any[] = d.inbounds || [];
        const faltaBipagem = lista.filter((i) => i.status === 'PENDENTE' || i.status === 'EM_PROCESSO').length;
        setFull({ total: lista.length, faltaBipagem });
      }).catch(() => {});
    }
  }, [podeArmazem, temRecebimento, temRma, temFull]);

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-full bg-[var(--bg-main)] text-[var(--text-main)] p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="border-b border-[var(--border-color)] pb-5 mb-6">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Visão geral{tenant ? ` · ${tenant}` : ''}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight mt-1">Olá, {primeiroNome}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 first-letter:uppercase">{hoje}</p>
        </div>

        {/* Operação */}
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Operação hoje</span>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-2.5">
          {podeArmazem && (
            <StatCard titulo="Itens em estoque" valor={armazem ? armazem.itens.toLocaleString('pt-BR') : '—'}
              sub={armazem ? `${armazem.ocupados}/${armazem.pallets} posições ocupadas` : 'carregando…'} />
          )}
          {temRecebimento && (
            <StatCard titulo="Recebimentos" valor={recebimento ? recebimento.abertos : '—'}
              sub={recebimento ? `${recebimento.abertos} em aberto · ${recebimento.total} no total` : 'carregando…'} />
          )}
          {temRma && (
            <StatCard titulo="RMAs abertos" valor={rma ? rma.abertos : '—'}
              sub={rma ? `${rma.total} no histórico` : 'carregando…'} />
          )}
          {temFull && (
            <StatCard titulo="Full · falta bipar" valor={full ? full.faltaBipagem : '—'}
              sub={full ? `${full.faltaBipagem} de ${full.total} envios sem conferência` : 'carregando…'} />
          )}
          {!podeArmazem && !temRecebimento && !temRma && !temFull && (
            <div className={`${card} p-4 text-sm text-[var(--text-muted)] sm:col-span-2 lg:col-span-4`}>
              Nenhum módulo operacional habilitado para o seu usuário.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
