// components/parts/ModalDestino.tsx
import type { PalletData } from "../types/types";

interface ModalDestinoProps {
  exibirModalDestino: boolean;
  setExibirModalDestino: (valor: boolean) => void;
  itensParaTransferir: string[];
  palletsDestino: PalletData[];
  handleConfirmarDestinoFinal: (numeroPalletDestino: string) => void;
}

export default function ModalDestino({
  exibirModalDestino,
  setExibirModalDestino,
  itensParaTransferir,
  palletsDestino,
  handleConfirmarDestinoFinal,
}: ModalDestinoProps) {
  if (!exibirModalDestino) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="relative bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl">
        <div className="relative flex justify-between items-center pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">Mover {itensParaTransferir.length} Itens Para:</h3>
          </div>
          <button onClick={() => setExibirModalDestino(false)} className="text-slate-400 hover:text-slate-700 transition-colors text-sm p-1">✕</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1 pt-1">
          {palletsDestino.map((dest) => {
            const lotacaoAtual = dest.produtos?.length || 0;
            const isDestinoEsgotado = lotacaoAtual >= 140;

            return (
              <button
                key={dest.id} type="button" disabled={isDestinoEsgotado}
                onClick={() => handleConfirmarDestinoFinal(dest.numero)}
                className={`p-3 rounded-xl border text-center font-mono flex flex-col justify-between h-[76px] transition-all ${
                  isDestinoEsgotado
                    ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed opacity-50'
                    : 'bg-white border-slate-200 hover:border-blue-500/40 text-slate-800'
                }`}
              >
                <span className="text-xs font-bold tracking-tight block truncate">📦 {dest.numero}</span>
                <span className="text-[9px] text-slate-400 font-sans block mt-1">{lotacaoAtual} / 140 un.</span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 text-xs">
          <button type="button" onClick={() => setExibirModalDestino(false)} className="h-9 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg">Voltar</button>
        </div>
      </div>
    </div>
  );
}