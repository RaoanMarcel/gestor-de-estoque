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
  exclusoesPendentesCount?: number;
  onConfirmarExclusoes?: () => void;
  isKeyboardActive: boolean;
  setIsKeyboardActive: (valor: boolean) => void;
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
  exclusoesPendentesCount = 0, 
  onConfirmarExclusoes,
  isKeyboardActive,
  setIsKeyboardActive
}: PalletHeaderProps) {

  const tipoUpper = pallet.tipo?.toUpperCase() || '';

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200 gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/triagens')}
          title="Voltar para o Galpão"
          className="w-10 h-10 flex items-center justify-center shrink-0 rounded-lg border border-slate-300 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="space-y-1">
          <button onClick={() => navigate('/triagens')} className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-blue-600 transition-colors">
            Voltar para o Galpão
          </button>
          <div className="flex items-center gap-3">
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            
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

            {/* 🚀 BOTÃO DE TECLADO MÓVEL AQUI (IDÊNTICO À HOME) */}
            {isKeyboardActive ? (
              <button onClick={() => setIsKeyboardActive(false)} title="Desativar Teclado" className="px-3 h-9 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold tracking-wider uppercase transition-all shadow-sm flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                <span className="hidden sm:inline">Teclado</span>
              </button>
            ) : (
              <button onClick={() => setIsKeyboardActive(true)} title="Ativar Teclado" className="px-3 h-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-[11px] font-bold tracking-wider uppercase transition-all shadow-sm flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                <span className="hidden sm:inline">Teclado</span>
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