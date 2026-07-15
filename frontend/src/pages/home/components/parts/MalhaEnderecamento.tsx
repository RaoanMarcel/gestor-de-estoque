// components/parts/MalhaEnderecamento.tsx
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
  imprimirEtiqueta: (numero: string, rua: string, estrutura: string, nivel: string) => void;
}

const ITENS_POR_PAGINA = 10;

export default function MalhaEnderecamento({
  busca,
  setBusca,
  palletsFiltrados,
  navigate,
  handleExcluirPalletCard,
  imprimirEtiqueta,
}: MalhaEnderecamentoProps) {
  
  const [paginas, setPaginas] = useState<Record<string, number>>({});

  const palletsAgrupados = useMemo(() => {
    const grupos: Record<string, Pallet[]> = {
      PADRAO: [],
      DEFEITO: [],
      DESCARTE: [],
      RETRIAGEM: [],
      OUTROS: []
    };

    palletsFiltrados.forEach((pallet) => {
      const tipo = pallet.tipo?.toUpperCase() || 'PADRAO';
      
      if (tipo.includes('DEFEITO')) grupos.DEFEITO.push(pallet);
      else if (tipo.includes('DESCARTE')) grupos.DESCARTE.push(pallet);
      else if (tipo.includes('RETRIAGEM') || tipo.includes('NOVO') || tipo.includes('RETORNO')) grupos.RETRIAGEM.push(pallet);
      else if (tipo.includes('PADRAO') || tipo.includes('GERAL')) grupos.PADRAO.push(pallet);
      else {
        if (!grupos[tipo]) grupos[tipo] = [];
        grupos[tipo].push(pallet);
      }
    });

    return grupos;
  }, [palletsFiltrados]);

  const mudarPagina = (grupo: string, novaPagina: number) => {
    setPaginas(prev => ({ ...prev, [grupo]: novaPagina }));
  };

  // ✨ 1. Estilo do Fundo (Degradê super suave puxando pro branco)
  const getCardStyle = (tipo: string) => {
    if (tipo === 'DEFEITO') return 'bg-gradient-to-br from-white/95 to-rose-50/60 border-rose-100 hover:border-rose-300 hover:shadow-[0_8px_30px_-12px_rgba(225,29,72,0.25)]';
    if (tipo === 'DESCARTE') return 'bg-gradient-to-br from-white/95 to-slate-100/80 border-slate-200 hover:border-slate-400 hover:shadow-[0_8px_30px_-12px_rgba(71,85,105,0.25)]';
    if (tipo === 'RETRIAGEM') return 'bg-gradient-to-br from-white/95 to-emerald-50/60 border-emerald-100 hover:border-emerald-300 hover:shadow-[0_8px_30px_-12px_rgba(5,150,105,0.25)]';
    // PADRAO (Amarelo)
    return 'bg-gradient-to-br from-white/95 to-amber-50/60 border-amber-100/80 hover:border-amber-300 hover:shadow-[0_8px_30px_-12px_rgba(217,119,6,0.25)]'; 
  };

  // ✨ 2. Estilo da Barrinha no Topo (Um pouco mais pastel)
  const getTopBarStyle = (tipo: string) => {
    if (tipo === 'DEFEITO') return 'bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.4)]';
    if (tipo === 'DESCARTE') return 'bg-slate-700 shadow-[0_0_10px_rgba(51,65,85,0.4)]';
    if (tipo === 'RETRIAGEM') return 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]';
    return 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)]'; 
  };

  // ✨ 3. Estilo das Tags de Quantidade (Mais leves)
  const getBadgeStyle = (tipo: string) => {
    if (tipo === 'DEFEITO') return 'bg-rose-50 text-rose-700 border border-rose-200/50';
    if (tipo === 'DESCARTE') return 'bg-slate-100 text-slate-700 border border-slate-200';
    if (tipo === 'RETRIAGEM') return 'bg-emerald-50 text-emerald-700 border border-emerald-200/50';
    return 'bg-amber-50 text-amber-700 border border-amber-200/50'; 
  };

  const getTituloGrupo = (chave: string) => {
    const titulos: Record<string, string> = {
      PADRAO: '📦 Pallets Padrão / Geral',
      DEFEITO: '🚨 Pallets de Defeito / Avarias',
      DESCARTE: '🗑️ Pallets de Descarte',
      RETRIAGEM: '♻️ Pallets de Retriagem / Novo',
      OUTROS: 'Outros Pallets'
    };
    return titulos[chave] || chave;
  };

  return (
    <div className="space-y-8 pt-2 pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 pb-3">
        <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Malha de Endereçamento</h2>
        <input
          type="text" 
          placeholder="Buscar triagem em pallet, rua!" 
          value={busca} 
          onChange={(e) => setBusca(e.target.value)}
          className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-lg px-4 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition-all w-full sm:w-72 h-10 shadow-sm"
        />
      </div>

      {/* RENDERIZAÇÃO DOS GRUPOS */}
      {Object.entries(palletsAgrupados).map(([chaveGrupo, listaPallets]) => {
        if (listaPallets.length === 0) return null; 

        const paginaAtual = paginas[chaveGrupo] || 1;
        const totalPaginas = Math.ceil(listaPallets.length / ITENS_POR_PAGINA);
        const paginaSegura = Math.max(1, Math.min(paginaAtual, totalPaginas)); 
        
        const indexInicio = (paginaSegura - 1) * ITENS_POR_PAGINA;
        const indexFim = indexInicio + ITENS_POR_PAGINA;
        const palletsDaPagina = listaPallets.slice(indexInicio, indexFim);

        return (
          <div key={chaveGrupo} className="space-y-4">
            
            {/* Título da Categoria */}
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                {getTituloGrupo(chaveGrupo)}
              </h3>
              <span className="text-[10px] font-mono bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded-full font-semibold border border-slate-300/50">
                {listaPallets.length} posições
              </span>
            </div>

            {/* Grid dos Cards desta Categoria */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {palletsDaPagina.map((pallet) => {
                const itensContados = pallet._count?.produtos || 0;
                const chaveEstilo = chaveGrupo === 'OUTROS' ? (pallet.tipo || 'PADRAO') : chaveGrupo;

                return (
                  <div
                    key={pallet.id} 
                    onClick={() => navigate(`/pallet/${pallet.id}`)}
                    className={`relative backdrop-blur-xl rounded-xl p-4 min-h-[120px] flex flex-col justify-between cursor-pointer transition-all duration-300 group overflow-hidden border ${getCardStyle(chaveEstilo)}`}
                  >
                    {/* Barra Colorida Indicadora Superior */}
                    <div className={`absolute top-0 left-4 h-[2.5px] w-12 rounded-b-full transition-all duration-300 group-hover:w-16 ${getTopBarStyle(chaveEstilo)}`} />
                    
                    <div className="flex justify-between items-start w-full mt-1">
                      <div className="flex-1 pr-2 z-10">
                        <h3 className="text-[15px] font-mono font-bold tracking-tight text-slate-800 group-hover:text-slate-950 transition-colors">
                          {pallet.numero}
                        </h3>
                        <p className="text-[11px] font-medium text-slate-500 leading-tight mt-1 line-clamp-2">
                          {pallet.descricao || 'Sem descrição'}
                        </p>
                      </div>
                      
                      <span className={`shrink-0 z-10 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold transition-colors ${getBadgeStyle(chaveEstilo)}`}>
                        {itensContados} un.
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-end mt-4 z-10">
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono bg-white/60 px-2 py-1 rounded border border-slate-200/60 w-fit uppercase font-bold backdrop-blur-sm">
                        <span>R:{pallet.rua || '-'}</span><span className="text-slate-300">•</span>
                        <span>E:{pallet.estrutura || '-'}</span><span className="text-slate-300">•</span>
                        <span>N:{pallet.nivel || '-'}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); 
                            imprimirEtiqueta(pallet.numero, pallet.rua ?? '', pallet.estrutura ?? '', pallet.nivel ?? '');
                          }}
                          className="p-1.5 text-[14px] text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Imprimir Etiqueta 10x15"
                        >
                          🖨️
                        </button>
                        <button
                          onClick={(e) => handleExcluirPalletCard(e, pallet.id, pallet.numero)}
                          className="p-1.5 text-[14px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Excluir posição da malha"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Controles de Paginação */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-end gap-1 mt-2">
                <button
                  disabled={paginaSegura === 1}
                  onClick={() => mudarPagina(chaveGrupo, paginaSegura - 1)}
                  className="px-2 py-1 rounded border border-slate-200 text-xs font-semibold text-slate-500 disabled:opacity-40 hover:bg-white hover:text-slate-800 transition-colors bg-transparent"
                >
                  Anterior
                </button>
                
                {Array.from({ length: totalPaginas }).map((_, idx) => {
                  const num = idx + 1;
                  return (
                    <button
                      key={num}
                      onClick={() => mudarPagina(chaveGrupo, num)}
                      className={`w-7 h-7 rounded border text-xs font-bold transition-all ${
                        paginaSegura === num 
                          ? 'bg-slate-800 border-slate-800 text-white shadow-md' 
                          : 'border-slate-200 text-slate-500 hover:bg-white hover:text-slate-800 bg-transparent'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}

                <button
                  disabled={paginaSegura === totalPaginas}
                  onClick={() => mudarPagina(chaveGrupo, paginaSegura + 1)}
                  className="px-2 py-1 rounded border border-slate-200 text-xs font-semibold text-slate-500 disabled:opacity-40 hover:bg-white hover:text-slate-800 transition-colors bg-transparent"
                >
                  Próxima
                </button>
              </div>
            )}
            
            {/* Divisor */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent my-8 last:hidden" />
          </div>
        );
      })}

      {palletsFiltrados.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
          <span className="text-4xl opacity-50">🔍</span>
          <p className="text-sm font-medium">Nenhum pallet encontrado com este filtro.</p>
        </div>
      )}

    </div>
  );
}