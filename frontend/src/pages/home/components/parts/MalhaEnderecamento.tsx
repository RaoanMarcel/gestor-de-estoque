import { useState, useMemo } from "react";
import type { MouseEvent } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { Pallet } from "../../../../types/pallet";

interface MalhaEnderecamentoProps {
  busca: string;
  setBusca: (valor: string) => void;
  palletsFiltrados: Pallet[];
  navigate: NavigateFunction;
  handleExcluirPalletCard: (e: MouseEvent, palletId: number, numeroPallet: string) => void;
  imprimirEtiqueta: (numero: string, rua: string, estrutura: string, nivel: string, descricao: string) => void;
  presenceData?: Record<string, string[]>;
}

const OPCOES_FILTRO = [
  { id: 'PADRAO', titulo: 'Padrão / Triagem' },
  { id: 'DEFEITO', titulo: 'Defeitos / Avarias'},
  { id: 'RETRIAGEM', titulo: 'Retriagem'},
  { id: 'NOVO', titulo: 'Novos'}, 
  { id: 'DESCARTE', titulo: 'Descarte'},
];

const getFilterActiveStyle = (id: string) => {
  switch (id) {
    case 'DEFEITO': return 'border-rose-500 text-rose-500 bg-rose-500/10';
    case 'RETRIAGEM':
    case 'NOVO': return 'border-emerald-500 text-emerald-500 bg-emerald-500/10';
    case 'DESCARTE': return 'border-slate-500 text-slate-500 bg-slate-500/10';
    case 'PADRAO': return 'border-amber-500 text-amber-500 bg-amber-500/10';
    default: return 'border-blue-500 text-blue-500 bg-blue-500/10';
  }
};

const AVATAR_COLORS = [
  { bg: 'bg-indigo-600', text: 'text-white' },
  { bg: 'bg-emerald-600', text: 'text-white' },
  { bg: 'bg-violet-600', text: 'text-white' },
  { bg: 'bg-amber-600', text: 'text-white' },
  { bg: 'bg-rose-600', text: 'text-white' },
  { bg: 'bg-cyan-600', text: 'text-white' },
  { bg: 'bg-teal-600', text: 'text-white' },
  { bg: 'bg-fuchsia-600', text: 'text-white' },
  { bg: 'bg-blue-600', text: 'text-white' },
  { bg: 'bg-orange-600', text: 'text-white' }
];

const obterCorAvatar = (username: string) => {
  if (!username) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

const ITENS_POR_PAGINA = 5;

export default function MalhaEnderecamento({
  busca, setBusca, palletsFiltrados, navigate, handleExcluirPalletCard, imprimirEtiqueta, presenceData = {}
}: MalhaEnderecamentoProps) {
  
  const [filtrosAtivos, setFiltrosAtivos] = useState<string[]>([]);
  const [paginasAtuais, setPaginasAtuais] = useState<Record<string, number>>({});

  const palletsAgrupados = useMemo(() => {
    const grupos: Record<string, Pallet[]> = { PADRAO: [], DEFEITO: [], RETRIAGEM: [], NOVO: [], DESCARTE: [], OUTROS: [] };
    
    palletsFiltrados.forEach((pallet) => {
      const tipo = pallet.tipo?.toUpperCase() || 'PADRAO';
      
      if (tipo.includes('DEFEITO')) grupos.DEFEITO.push(pallet);
      else if (tipo.includes('DESCARTE')) grupos.DESCARTE.push(pallet);
      else if (tipo.includes('NOVO')) grupos.NOVO.push(pallet); 
      else if (tipo.includes('RETRIAGEM') || tipo.includes('RETORNO')) grupos.RETRIAGEM.push(pallet);
      else if (tipo.includes('PADRAO') || tipo.includes('GERAL')) grupos.PADRAO.push(pallet);
      else grupos.OUTROS.push(pallet);
    });
    return grupos;
  }, [palletsFiltrados]);

  const toggleFiltro = (id: string) => {
    setFiltrosAtivos(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  // 🚀 ADICIONADO: O degradê interno nos cards, fluindo do bg-panel até um fundo colorido translúcido
  const getCardStyle = (tipo: string) => {
    if (tipo === 'DEFEITO') return 'bg-gradient-to-br from-[var(--bg-panel)] to-rose-500/10 border-rose-500/30 hover:border-rose-500/60 shadow-sm';
    if (tipo === 'DESCARTE') return 'bg-gradient-to-br from-[var(--bg-panel)] to-slate-500/10 border-slate-500/30 hover:border-slate-500/60 shadow-sm';
    if (tipo === 'RETRIAGEM' || tipo === 'NOVO') return 'bg-gradient-to-br from-[var(--bg-panel)] to-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60 shadow-sm';
    return 'bg-gradient-to-br from-[var(--bg-panel)] to-amber-500/10 border-amber-500/30 hover:border-amber-500/60 shadow-sm';
  };

  const getTopBarStyle = (tipo: string) => {
    if (tipo === 'DEFEITO') return 'bg-rose-500';
    if (tipo === 'DESCARTE') return 'bg-slate-500';
    if (tipo === 'RETRIAGEM' || tipo === 'NOVO') return 'bg-emerald-500';
    return 'bg-amber-500';
  };

  const mudarPagina = (chave: string, novaPagina: number) => {
    setPaginasAtuais(prev => ({ ...prev, [chave]: novaPagina }));
  };

  return (
    <div className="pt-2 pb-10">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-sm font-bold text-[var(--text-main)] shrink-0">Malha de Endereçamento</h2>
          <input 
            type="text" placeholder="Buscar triagem em pallet, rua!" value={busca} 
            onChange={(e) => { setBusca(e.target.value); setPaginasAtuais({}); }}
            className="w-full sm:w-80 border border-[var(--border-color)] bg-[var(--bg-panel)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] rounded-lg px-4 py-2 text-xs outline-none shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 mb-8 overflow-x-auto w-full scrollbar-hide pb-2">
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase shrink-0 mr-1">FILTRAR:</span>
          {OPCOES_FILTRO.map((op) => {
            const qtd = palletsAgrupados[op.id]?.length || 0;
            const ativo = filtrosAtivos.includes(op.id);
            return (
              <button 
                key={op.id} onClick={() => toggleFiltro(op.id)}
                className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-lg border text-xs font-semibold transition-all flex items-center gap-2 ${ativo ? getFilterActiveStyle(op.id) : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-[var(--text-muted)] hover:opacity-80'}`}
              >
                {op.titulo} 
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${ativo ? 'bg-[var(--bg-main)] font-bold border border-transparent' : 'bg-[var(--bg-main)] border border-[var(--border-color)]'}`}>
                  {qtd}
                </span>
              </button>
            );
          })}
        </div>
        
        <div className="space-y-10">
          {Object.entries(palletsAgrupados).map(([chave, lista]) => {
            if (lista.length === 0 || (filtrosAtivos.length > 0 && !filtrosAtivos.includes(chave))) return null;
            
            const totalPaginas = Math.ceil(lista.length / ITENS_POR_PAGINA);
            const paginaAtual = Math.min(paginasAtuais[chave] || 1, totalPaginas === 0 ? 1 : totalPaginas);
            const indexInicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
            const listaPaginada = lista.slice(indexInicio, indexInicio + ITENS_POR_PAGINA);

            return (
              <div key={chave} className="space-y-4 animate-enter border-b border-[var(--border-color)] pb-8 last:border-0 last:pb-0">
                <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                  {chave === 'PADRAO' ? 'TRIAGEM' : chave.replace('_', ' ')}
                  <span className="text-[10px] bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--text-muted)] px-2 py-0.5 rounded-full font-medium">
                    {lista.length} {lista.length === 1 ? 'posição' : 'posições'}
                  </span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {listaPaginada.map((p) => {
                    const usuariosNestePallet = presenceData[String(p.numero)] || [];

                    return (
                      <div key={p.id} onClick={() => navigate(`/pallet/${p.numero}`)}
                        className={`group relative rounded-xl p-4 min-h-[130px] flex flex-col justify-between cursor-pointer border transition-all duration-300 hover:scale-[1.03] ${getCardStyle(chave)}`}>
                        
                        <div className={`absolute top-0 left-4 h-[3px] w-12 rounded-b-full transition-all duration-300 group-hover:w-16 ${getTopBarStyle(chave)}`} />
                        
                        <div className="flex justify-between items-start">
                          <h3 className="text-[15px] font-bold text-[var(--text-main)]">{p.numero}</h3>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)]">{p._count?.produtos || 0} un.</span>
                        </div>

                        <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2">{p.descricao || 'Sem descrição'}</p>
                        
                        <div className="flex justify-between items-end mt-4">
                          <div className="text-[9px] font-mono bg-[var(--bg-main)] px-2 py-1 rounded border border-[var(--border-color)] text-[var(--text-muted)]">R:{p.rua || '-'} • E:{p.estrutura || '-'} • N:{p.nivel || '-'}</div>
                          <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); imprimirEtiqueta(p.numero, p.rua??'', p.estrutura??'', p.nivel??'',p.descricao??''); }} className="text-sm">🖨️</button>
                            <button onClick={(e) => handleExcluirPalletCard(e, p.id, p.numero)} className="text-sm">🗑️</button>
                          </div>
                        </div>

                        {usuariosNestePallet.length > 0 && (
                          <div className="mt-3 flex items-center justify-between border-t border-[var(--border-color)] pt-3">
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                              <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Em uso por:</span>
                            </div>
                            <div className="flex -space-x-1.5" title={`${usuariosNestePallet.join(', ')} editando`}>
                              {usuariosNestePallet.slice(0, 3).map((user, idx) => {
                                const cor = obterCorAvatar(user);
                                return (
                                  <div key={idx} className={`h-6 w-6 rounded-full border-2 border-[var(--bg-panel)] flex items-center justify-center text-[10px] font-bold uppercase shadow-sm relative z-10 ${cor.bg} ${cor.text}`}>
                                    {user.charAt(0).toUpperCase()}
                                  </div>
                                );
                              })}
                              {usuariosNestePallet.length > 3 && (
                                <div className="h-6 w-6 rounded-full bg-[var(--bg-main)] border-2 border-[var(--bg-panel)] text-[var(--text-main)] flex items-center justify-center text-[10px] font-bold shadow-sm relative z-0">
                                  +{usuariosNestePallet.length - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {totalPaginas > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <button onClick={() => mudarPagina(chave, paginaAtual - 1)} disabled={paginaAtual === 1} className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] bg-[var(--bg-panel)] hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">← Anterior</button>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] bg-[var(--bg-panel)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg">Página {paginaAtual} de {totalPaginas}</span>
                    <button onClick={() => mudarPagina(chave, paginaAtual + 1)} disabled={paginaAtual === totalPaginas} className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] bg-[var(--bg-panel)] hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">Próxima →</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
}