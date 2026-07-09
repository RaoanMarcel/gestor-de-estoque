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
          type="text" placeholder="Buscar triagem em pallet, rua!" value={busca} onChange={(e) => setBusca(e.target.value)}
          className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-lg px-4 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition-all w-full sm:w-72 h-10"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {palletsFiltrados.map((pallet) => {
          const itensContados = pallet._count?.produtos || 0;
          const isLotado = itensContados >= 140;

          return (
            <div
              key={pallet.id} onClick={() => navigate(`/pallet/${pallet.id}`)}
              className={`relative backdrop-blur-xl rounded-xl p-5 min-h-[110px] flex flex-col justify-between hover:shadow-[0_8px_30px_-12px_rgba(37,99,235,0.25)] cursor-pointer transition-all duration-200 group overflow-hidden border ${
                pallet.tipo === 'DEFEITO'
                  ? 'bg-rose-50/60 border-rose-200/80 hover:border-rose-400 hover:bg-rose-50/90' 
                  : 'bg-white/80 border-slate-200 hover:border-blue-500/40 hover:bg-white'
              }`}
            >
              <div className={`absolute top-0 left-5 h-[2px] w-10 rounded-b-full ${
                pallet.tipo === 'DEFEITO'
                  ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]' 
                  : isLotado 
                  ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
                  : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
              }`} />
              
              <div className="flex justify-between items-start w-full mt-1">
                <div className="space-y-3">
                  <h3 className="text-sm font-mono font-semibold tracking-tight text-slate-800 group-hover:text-blue-600 transition-colors">
                    {pallet.numero}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-mono bg-slate-50/70 px-2 py-0.5 rounded border border-slate-200/60 w-fit">
                    <span>R:{pallet.rua || '-'}</span><span className="text-slate-300">•</span>
                    <span>E:{pallet.estrutura || '-'}</span><span className="text-slate-300">•</span>
                    <span>N:{pallet.nivel || '-'}</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-[10px] font-mono px-1 py-0.5 rounded font-medium ${
                    pallet.tipo === 'DEFEITO'
                      ? 'bg-rose-100/80 text-rose-800 border border-rose-200'
                      : isLotado 
                      ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                      : 'bg-slate-50 text-slate-500 border border-slate-200'
                  }`}>
                    {itensContados} un.
                  </span>

                  <button
                    onClick={(e) => handleExcluirPalletCard(e, pallet.id, pallet.numero)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    title="Excluir posição da malha"
                  >
                    🗑️
                  </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation(); 
                    // O operador ?? garante que se o valor for undefined, enviará uma string vazia ''
                    imprimirEtiqueta(
                      pallet.numero, 
                      pallet.rua ?? '', 
                      pallet.estrutura ?? '', 
                      pallet.nivel ?? ''
                    );
                  }}
                  className="p-1 text-base leading-none text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Imprimir Etiqueta 10x15"
                >
                  🖨️
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