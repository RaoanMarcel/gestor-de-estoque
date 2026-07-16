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
  activeUsers?: string[];
}

export default function PalletHeader({
  pallet, isModoTransferencia, setIsModoTransferencia, setMensagemStatus, itensParaTransferir, setItensParaTransferir, handleAdicionarTodoOPalletNoLote, navigate, activeUsers = []
}: PalletHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200 gap-4">
      <div className="space-y-1">
        <button onClick={() => navigate('/')} className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-blue-600 transition-colors">
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

      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto justify-end">
        
        {activeUsers.length > 0 && (
          <div className="flex items-center gap-2 mr-2 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200 shadow-sm">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Ativos</span>
            <div className="flex -space-x-1.5" title={`${activeUsers.join(', ')} nesta tela`}>
              {activeUsers.map((user, idx) => (
                <div key={idx} className="h-5 w-5 rounded-full bg-blue-600 border border-white text-white flex items-center justify-center text-[9px] font-bold uppercase shadow-sm relative z-10 hover:z-20 transition-all hover:-translate-y-0.5">
                  {user.charAt(0)}
                </div>
              ))}
            </div>
          </div>
        )}

        {!isModoTransferencia ? (
          <button onClick={() => { setIsModoTransferencia(true); setMensagemStatus({ texto: 'Selecione os itens do lote.', erro: false }); }}
            className="px-4 h-9 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-600 text-xs font-semibold tracking-wider uppercase transition-all">
             Transferir Lote
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={handleAdicionarTodoOPalletNoLote} className="px-3 h-9 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold tracking-wider uppercase transition-all">
              {pallet && itensParaTransferir.length === pallet.produtos.length ? '🔲 Desmarcar Tudo' : 'Transferir Tudo'}
            </button>
            <button onClick={() => { setIsModoTransferencia(false); setItensParaTransferir([]); setMensagemStatus({ texto: '', erro: false }); }} className="px-3 h-9 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold tracking-wider uppercase transition-all">
              ✕ Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}