import type { FormEvent } from "react";
import type { Pallet } from "../../../../types/pallet";

interface ModalExportarExcelProps {
  isExcelModalOpen: boolean;
  setIsExcelModalOpen: (valor: boolean) => void;
  palletSelecionado: string;
  setPalletSelecionado: (valor: string) => void;
  nomeArquivo: string;
  setNomeArquivo: (valor: string) => void;
  carregandoExcel: boolean;
  handleExportarExcel: (e: FormEvent) => void;
  palletsFiltrados: Pallet[];
}

export default function ModalExportarExcel({
  isExcelModalOpen,
  setIsExcelModalOpen,
  palletSelecionado,
  setPalletSelecionado,
  nomeArquivo,
  setNomeArquivo,
  carregandoExcel,
  handleExportarExcel,
  palletsFiltrados
}: ModalExportarExcelProps) {
  if (!isExcelModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in" onClick={() => setIsExcelModalOpen(false)}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Exportar Relatório</h2>
        </div>
        
        <form onSubmit={handleExportarExcel} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Selecione a Origem dos Dados *</label>
            <select
              required
              value={palletSelecionado}
              onChange={(e) => setPalletSelecionado(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            >
              <option value="" disabled>Selecione um relatório...</option>
              {/* 🚀 OPÇÃO DE RELATÓRIO GERAL (TODOS OS ITENS) */}
              <option value="TODOS_ITENS_GERAL" className="font-bold text-blue-600">📊 RELATÓRIO GERAL (TODOS OS ITENS)</option>
              <option value="FLUXO_RMA_SISTEMA" className="font-bold text-rose-600">♻️ FLUXO DE RMA (ESTOQUE FANTASMA)</option>
              <optgroup label="Histórico por Pallet">
                {palletsFiltrados.map((p) => (
                  <option key={p.id} value={p.numero}>
                    {p.numero} ({p._count?.produtos || 0} itens)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Nome do Arquivo (Opcional)</label>
            <input
              type="text"
              placeholder="Ex: relatorio_fechamento_mes"
              value={nomeArquivo}
              onChange={(e) => setNomeArquivo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsExcelModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors uppercase">
              Cancelar
            </button>
            <button type="submit" disabled={carregandoExcel || !palletSelecionado} className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg shadow-sm transition-all uppercase flex items-center gap-2">
              {carregandoExcel ? 'Gerando...' : 'Baixar Excel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}