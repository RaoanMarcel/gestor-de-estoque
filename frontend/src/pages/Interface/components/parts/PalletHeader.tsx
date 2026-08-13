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
  onAbrirModalPuxar?: () => void;
  // 🚀 NOVAS PROPRIEDADES ADICIONADAS
  exclusoesPendentesCount?: number;
  onConfirmarExclusoes?: () => void;
}

const getAvatarColor = (name: string) => {
  if (!name) return 'bg-slate-400';
  const colors = [
    'bg-rose-500', 'bg-blue-600', 'bg-emerald-600', 
    'bg-amber-500', 'bg-purple-600', 'bg-cyan-600', 
    'bg-indigo-500', 'bg-pink-500', 'bg-teal-600'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function PalletHeader({
  pallet, 
  isModoTransferencia, 
  setIsModoTransferencia, 
  setMensagemStatus, 
  itensParaTransferir, 
  setItensParaTransferir, 
  handleAdicionarTodoOPalletNoLote, 
  navigate, 
  activeUsers = [], 
  onAbrirModalPuxar,
  exclusoesPendentesCount = 0, // 🚀 Recebe a quantidade
  onConfirmarExclusoes         // 🚀 Recebe a função de confirmar
}: PalletHeaderProps) {

  const tipoUpper = pallet.tipo?.toUpperCase() || '';

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
            {tipoUpper.includes('DEFEITO') && ' • ⚠️ DEFEITO'}
            {tipoUpper.includes('RETRIAGEM') && ' • 🏷️ RETRIAGEM'}
            {tipoUpper.includes('RETORNO') && ' • ♻️ RETORNO'}
            {tipoUpper.includes('DEVOLUCAO') && ' • ↩️ DEVOLUÇÃO'}
            {tipoUpper.includes('NOVO') && ' • 🆕 NOVO'}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto justify-end">
        
        {activeUsers.length > 0 && (
          <div className="flex items-center gap-2 mr-2 bg-slate-50 px-2.5 py-1.5 rounded-full border border-slate-200 shadow-sm">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Ativos</span>
            <div className="flex -space-x-2" title={`${activeUsers.join(', ')} nesta tela`}>
              {activeUsers.map((user, idx) => {
                const bgCor = getAvatarColor(user);
                const inicial = user.charAt(0).toUpperCase();
                return (
                  <div key={idx} className={`h-6 w-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm relative z-10 hover:z-20 transition-all hover:-translate-y-0.5 ${bgCor}`}>
                    {inicial}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isModoTransferencia ? (
          <div className="flex items-center gap-2">
            
            {/* 🚀 NOVO BOTÃO DE SALVAR EXCLUSÕES (Aparece apenas se houver pendências) */}
            {exclusoesPendentesCount > 0 && (
              <button 
                onClick={onConfirmarExclusoes} 
                className="relative px-4 h-9 rounded-lg border border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold tracking-wider uppercase transition-all shadow-sm flex items-center gap-2"
              >
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white font-bold shadow-sm">
                  {exclusoesPendentesCount}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Salvar Exclusões
              </button>
            )}

            {onAbrirModalPuxar && (
              <button onClick={onAbrirModalPuxar} className="px-4 h-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-[11px] font-bold tracking-wider uppercase transition-all shadow-sm">
                Puxar Item
              </button>
            )}
            <button onClick={() => { setIsModoTransferencia(true); setMensagemStatus({ texto: 'Selecione os itens do lote.', erro: false }); }}
              className="px-4 h-9 rounded-lg border border-blue-300 bg-white hover:bg-blue-50 text-blue-600 text-[11px] font-bold tracking-wider uppercase transition-all shadow-sm">
               Transferir Lote
            </button>
          </div>
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