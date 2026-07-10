// components/parts/ConteudoAtualPanel.tsx
import type { PalletData } from "../types/types";
import { imprimirEtiquetaRetriagem } from "../utils/imprimirEtiqueta";

interface ConteudoAtualPanelProps {
  pallet: PalletData;
  totalUnidades: number;
  itensParaTransferir: string[];
  isModoTransferencia: boolean;
  handleExcluirItemLinha: (codigoItem: string) => void;
  exclusoesPendentes: string[]; 
  handleDesfazerExclusaoItem: (codigoItem: string) => void;
}

export default function ConteudoAtualPanel({
  pallet,
  totalUnidades,
  itensParaTransferir,
  isModoTransferencia,
  handleExcluirItemLinha,
  exclusoesPendentes,
  handleDesfazerExclusaoItem
}: ConteudoAtualPanelProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col max-h-[600px]">
      <div className="border-b border-slate-200 pb-3 mb-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Conteúdo Atual</h2>
        </div>
        <span className="text-[10px] font-mono font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
          {totalUnidades} un.
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        
        {/* SEÇÃO VISUAL DE ITENS QUE ESTÃO NA FILA DE EXCLUSÃO (Canto Superior do Painel) */}
        {exclusoesPendentes.map((itemCodigo) => (
          <div 
            key={`pendente-${itemCodigo}`}
            className="rounded-lg border border-rose-200 bg-rose-50/40 p-3 flex justify-between items-center transition-all duration-300 opacity-85"
          >
            <div className="font-mono mt-1">
              <span className="block font-semibold text-sm tracking-tight text-rose-900 line-through decoration-rose-400">
                {itemCodigo}
              </span>
              <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">
                AGUARDANDO CONFIRMAÇÃO
              </span>
            </div>
            <button
              onClick={() => handleDesfazerExclusaoItem(itemCodigo)}
              className="p-1.5 text-rose-600 hover:bg-rose-100/70 rounded transition-all text-xs flex items-center gap-1 font-bold"
              title="Voltar item para o pallet"
            >
              ↩ Mantenha
            </button>
          </div>
        ))}

        {/* PRODUTOS ATIVOS DO PALLET */}
        {pallet.produtos.map((prod) => {
          const isItemCapturadoLote = itensParaTransferir.includes(prod.codigoItem);

          return (
            <div
              key={prod.id}
              className={`relative rounded-lg border p-3 flex justify-between items-center transition-all duration-300 group overflow-hidden ${
                isItemCapturadoLote
                  ? 'bg-blue-50/90 border-blue-300 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-blue-500/40'
              }`}
            >
              <div className="font-mono mt-1">
                <span className={`block font-semibold text-sm tracking-tight ${isItemCapturadoLote ? 'text-blue-900' : 'text-slate-800'}`}>
                  {prod.codigoItem}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                  {new Date(prod.bipadoEm).toLocaleTimeString()}
                </span>
              </div>

              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {pallet.tipo === 'RETRIAGEM' && (
                  <button
                    onClick={() => imprimirEtiquetaRetriagem(prod.codigoItem)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors text-xs"
                    title="Reimprimir Etiqueta"
                  >
                    🖨️
                  </button>
                )}
                {!isModoTransferencia && (
                  <button
                    onClick={() => handleExcluirItemLinha(prod.codigoItem)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors text-xs"
                    title="Remover item imediatamente"
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {pallet.produtos.length === 0 && exclusoesPendentes.length === 0 && (
          <div className="text-center py-16 bg-slate-50/60 rounded-lg border border-dashed border-slate-200 text-slate-400 text-xs font-mono tracking-[0.2em] uppercase">
            Pallet vazio
          </div>
        )}
      </div>
    </div>
  );
}