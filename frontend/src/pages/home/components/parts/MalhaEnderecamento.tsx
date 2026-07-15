// components/parts/MalhaEnderecamento.tsx
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

export default function MalhaEnderecamento({
  busca,
  setBusca,
  palletsFiltrados,
  navigate,
  handleExcluirPalletCard,
  imprimirEtiqueta,
}: MalhaEnderecamentoProps) {
  return (
    <div className="space-y-5 pt-2">
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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {palletsFiltrados.map((pallet) => {
          const itensContados = pallet._count?.produtos || 0;
          const isLotado = itensContados >= 140;

          return (
            <div
              key={pallet.id} 
              onClick={() => navigate(`/pallet/${pallet.id}`)}
              className={`relative backdrop-blur-xl rounded-xl p-4 min-h-[120px] flex flex-col justify-between hover:shadow-[0_8px_30px_-12px_rgba(37,99,235,0.25)] cursor-pointer transition-all duration-200 group overflow-hidden border ${
                pallet.tipo === 'DEFEITO'
                  ? 'bg-rose-50/60 border-rose-200/80 hover:border-rose-400 hover:bg-rose-50/90' 
                  : 'bg-white/80 border-slate-200 hover:border-blue-500/40 hover:bg-white'
              }`}
            >
              {/* Barra Colorida Indicadora Superior */}
              <div className={`absolute top-0 left-4 h-[2px] w-10 rounded-b-full ${
                pallet.tipo === 'DEFEITO'
                  ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]' 
                  : isLotado 
                  ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
                  : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
              }`} />
              
              {/* Header do Card: Nome e Tag de Unidades */}
              <div className="flex justify-between items-start w-full mt-1">
                <div className="flex-1 pr-2">
                  <h3 className="text-[15px] font-mono font-bold tracking-tight text-slate-800 group-hover:text-blue-600 transition-colors">
                    {pallet.numero}
                  </h3>
                  {/* Descrição truncada e sutil */}
                  <p className="text-[11px] font-medium text-slate-500 leading-tight mt-1 line-clamp-2">
                    {pallet.descricao || 'Sem descrição'}
                  </p>
                </div>
                
                {/* Quantidade */}
                <span className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  pallet.tipo === 'DEFEITO'
                    ? 'bg-rose-100/80 text-rose-700 border border-rose-200/50'
                    : isLotado 
                    ? 'bg-amber-50 text-amber-700 border border-amber-200/50' 
                    : 'bg-slate-50 text-slate-600 border border-slate-200/50'
                }`}>
                  {itensContados} un.
                </span>
              </div>
              
              {/* Footer do Card: Endereçamento e Botões de Ação */}
              <div className="flex justify-between items-end mt-4">
                {/* Box de Endereço (R-E-N) */}
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono bg-slate-100/50 px-2 py-1 rounded border border-slate-200/50 w-fit uppercase font-semibold">
                  <span>R:{pallet.rua || '-'}</span><span className="text-slate-300">•</span>
                  <span>E:{pallet.estrutura || '-'}</span><span className="text-slate-300">•</span>
                  <span>N:{pallet.nivel || '-'}</span>
                </div>

                {/* Ações Rápidas Alinhadas Horizontalmente */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); 
                      imprimirEtiqueta(
                        pallet.numero, 
                        pallet.rua ?? '', 
                        pallet.estrutura ?? '', 
                        pallet.nivel ?? ''
                      );
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
    </div>
  );
}