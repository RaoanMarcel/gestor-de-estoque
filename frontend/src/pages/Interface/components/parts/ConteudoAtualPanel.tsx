import type { PalletData } from "../types/types";

interface ConteudoAtualPanelProps {
  pallet: PalletData;
  totalUnidades: number;
  itensParaTransferir: string[];
  isModoTransferencia: boolean;
  handleExcluirItemLinha: (codigo: string) => void;
  exclusoesPendentes: string[];
  handleDesfazerExclusaoItem: (codigo: string) => void;
  handleAbrirRastreabilidade: (codigo: string) => void; 
}

export default function ConteudoAtualPanel({
  pallet,
  totalUnidades,
  itensParaTransferir,
  isModoTransferencia,
  handleExcluirItemLinha,
  exclusoesPendentes,
  handleDesfazerExclusaoItem,
  handleAbrirRastreabilidade
}: ConteudoAtualPanelProps) {
  
  return (
    <div className="lg:col-span-1 bg-[var(--bg-panel)] backdrop-blur-xl rounded-xl border border-[var(--border-color)] shadow-sm p-6 flex flex-col max-h-[800px]">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-color)]">
        <h2 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Conteúdo Atual
        </h2>
        <span className="text-xs font-semibold bg-[var(--bg-main)] text-[var(--text-main)] px-2.5 py-1 rounded-md border border-[var(--border-color)]">
          {totalUnidades} un.
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-2 custom-scrollbar">
        {pallet.produtos.length === 0 ? (
          <p className="text-center text-xs text-[var(--text-muted)] mt-10 uppercase tracking-wider font-medium">Posição Vazia</p>
        ) : (
          pallet.produtos.map((produto) => {
            const isPendente = exclusoesPendentes.includes(produto.codigoItem);
            const isSelecionadoTransf = itensParaTransferir.includes(produto.codigoItem);

            return (
              <div
                key={produto.codigoItem}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  isPendente 
                    ? 'border-rose-500/30 bg-rose-500/10' 
                    : isModoTransferencia && isSelecionadoTransf
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-[var(--border-color)] bg-[var(--bg-main)] hover:border-[var(--text-muted)] hover:shadow-sm'
                }`}
              >
                <div className="flex flex-col gap-1.5 w-full pr-3 overflow-hidden">
                  <div className="flex items-center gap-2.5">
                    <span className={`font-mono text-sm font-bold block ${isPendente ? 'text-[var(--text-muted)] line-through decoration-rose-500' : 'text-[var(--text-main)]'}`}>
                      {produto.codigoItem}
                    </span>
                    {isPendente && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-[var(--bg-panel)] border border-rose-500/30 text-rose-500 px-2 py-0.5 rounded-md shadow-sm shrink-0">
                        Exclusão
                      </span>
                    )}
                  </div>
                  
                  <div className={`flex items-center gap-1.5 text-[10px] font-semibold ${isPendente ? 'text-rose-400/70' : 'text-[var(--text-muted)]'}`}>
                    <div className="flex items-center gap-1 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      {new Date(produto.bipadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    
                    <span className="opacity-40 text-[8px] shrink-0">●</span>
                    
                    <div className="flex items-center gap-1 min-w-0">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                      <span className="truncate tracking-wide">{produto.usuario?.username || 'Sistema'}</span>
                    </div>
                  </div>
                </div>

                {!isModoTransferencia && (
                  <div className="flex items-center gap-2 shrink-0">
                    {isPendente ? (
                      <button
                        onClick={() => handleDesfazerExclusaoItem(produto.codigoItem)}
                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[var(--text-main)] hover:text-emerald-500 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:border-emerald-500 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-all shadow-sm group"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-emerald-500 transition-colors">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                        </svg>
                        Desfazer
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleAbrirRastreabilidade(produto.codigoItem)}
                          className="p-2 text-[var(--text-muted)] hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                          title="Ver Rastreabilidade"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleExcluirItemLinha(produto.codigoItem)}
                          className="p-2 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                          title="Remover Item"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}