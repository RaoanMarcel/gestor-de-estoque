// src/pages/Interface/components/parts/ModalRastreabilidade.tsx
import React from 'react';

// ✅ Interface atualizada para receber o usuário aninhado
interface HistoricoItem {
  id: number;
  codigoItem: string;
  acao: string;
  palletAlvo?: string | null;
  palletOrigem?: string | null;
  palletDestino?: string | null;
  bipadoEm?: string | null;
  createdAt?: string | null;
  usuario?: { username: string } | null; 
}

interface ModalRastreabilidadeProps {
  exibir: boolean;
  fechar: () => void;
  codigoItem: string;
  historico: HistoricoItem[];
  carregando: boolean;
}

export default function ModalRastreabilidade({ exibir, fechar, codigoItem, historico, carregando }: ModalRastreabilidadeProps) {
  if (!exibir) return null;

  const getBadgeStyle = (acao: string) => {
    switch (acao) {
      case 'ENTRADA': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'SAIDA': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'TRANSFERENCIA': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'TRANSFERENCIA_LOTE': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'ENVIADO_RMA': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatarData = (dataString?: string | null) => {
    if (!dataString) return '--/--/----, --:--:--';
    const d = new Date(dataString);
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
  };

  const obterIdentificadorPallet = (hist: HistoricoItem): string => {
    if (hist.palletAlvo) return hist.palletAlvo;
    if (hist.palletDestino) return hist.palletDestino;
    if (hist.palletOrigem) return hist.palletOrigem;
    return 'N/A';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={fechar}>
      <div 
        className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Rastreabilidade do Item</h2>
            <p className="text-xs font-mono text-slate-500 mt-1">Cód: {codigoItem}</p>
          </div>
          <button onClick={fechar} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto bg-slate-50/50">
          {carregando ? (
            <div className="flex justify-center items-center py-10 text-slate-400 text-sm font-medium animate-pulse">
              Buscando histórico...
            </div>
          ) : historico.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              Nenhum registro encontrado para este item.
            </div>
          ) : (
            <div className="relative pl-3 ml-2 border-l-2 border-slate-200 space-y-6">
              {historico.map((hist, index) => (
                <div key={hist.id || index} className="relative">
                  <div className="absolute -left-[17px] top-4 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-white shadow-sm" />
                  
                  <div className="ml-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-3">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getBadgeStyle(hist.acao)}`}>
                        {hist.acao.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formatarData(hist.bipadoEm || hist.createdAt)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-slate-600 flex items-center gap-2 mb-3">
                      <span className="font-semibold text-slate-800">Pallet:</span>
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold border border-slate-200">
                        {obterIdentificadorPallet(hist)}
                      </span>
                    </div>

                    {/* ✅ Rodapé do evento informando o usuário responsável */}
                    <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-slate-400">
                        <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
                      </svg>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Operação por: <strong className="text-slate-700">{hist.usuario?.username || 'Sistema'}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white">
          <button
            onClick={fechar}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs tracking-wider uppercase shadow-md transition-all"
          >
            Fechar Rastreamento
          </button>
        </div>
      </div>
    </div>
  );
}