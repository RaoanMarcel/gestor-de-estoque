// components/parts/PalletHeader.tsx
import type { PalletData } from "../types/types";

interface PalletHeaderProps {
  pallet: PalletData;
  isModoTransferencia: boolean;
  setIsModoTransferencia: (valor: boolean) => void;
  setMensagemStatus: (valor: { texto: string; erro: boolean }) => void;
  itensParaTransferir: string[];
  setItensParaTransferir: (valor: string[]) => void;
  handleAdicionarTodoOPalletNoLote: () => void;
  navigate: (rota: string) => void;
}

export default function PalletHeader({
  pallet,
  isModoTransferencia,
  setIsModoTransferencia,
  setMensagemStatus,
  itensParaTransferir,
  setItensParaTransferir,
  handleAdicionarTodoOPalletNoLote,
  navigate,
}: PalletHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200 gap-4">
      <div className="space-y-1">
        <button
          onClick={() => navigate('/')}
          className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-blue-600 transition-colors"
        >
          ← Voltar para o Galpão
        </button>
        <div className="flex items-center gap-3 pt-1">
          <h1 className="text-xl font-mono font-semibold tracking-tight text-slate-900">{pallet.numero}</h1>
          <span className="text-[10px] font-mono text-slate-500 bg-white/70 backdrop-blur px-2 py-0.5 rounded border border-slate-200">
            R:{pallet.rua || '-'} • E:{pallet.estrutura || '-'} • N:{pallet.nivel || '-'}
            {pallet.tipo === 'DEFEITO' && ' • ⚠️ DEFEITO'}
            {pallet.tipo === 'RETRIAGEM' && ' • 🏷️ RETRIAGEM'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {!isModoTransferencia ? (
          <button
            onClick={() => {
              setIsModoTransferencia(true);
              setMensagemStatus({ texto: 'Modo transferência ativado! Selecione os itens do lote.', erro: false });
            }}
            className="px-4 h-9 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-600 text-xs font-semibold tracking-wider uppercase transition-all"
          >
             Transferir Lote
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleAdicionarTodoOPalletNoLote}
              className="px-3 h-9 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold tracking-wider uppercase transition-all"
            >
              {pallet && itensParaTransferir.length === pallet.produtos.length ? '🔲 Desmarcar Tudo' : 'Transferir Tudo'}
            </button>
            <button
              onClick={() => {
                setIsModoTransferencia(false);
                setItensParaTransferir([]);
                setMensagemStatus({ texto: '', erro: false });
              }}
              className="px-3 h-9 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold tracking-wider uppercase transition-all"
            >
              ✕ Cancelar
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 ml-1">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Operando</span>
        </div>
      </div>
    </div>
  );
}