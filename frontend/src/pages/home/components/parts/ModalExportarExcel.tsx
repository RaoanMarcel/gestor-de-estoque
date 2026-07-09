// components/parts/ModalExportarExcel.tsx
import type { FormEvent } from "react";
import type { Pallet } from "../../../../types/pallet";
import Button from "../ui/Button";
import Input from "../ui/Input";

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
  palletsFiltrados,
}: ModalExportarExcelProps) {
  if (!isExcelModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="relative bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.25)] overflow-hidden">
        <form onSubmit={handleExportarExcel} className="relative space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Tipo de Relatório *</label>
            <select 
              required 
              value={palletSelecionado} 
              onChange={(e) => setPalletSelecionado(e.target.value)} 
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 h-10 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition-all"
            >
              <option value="">-- Escolha o Relatório --</option>
              <option value="FLUXO_RMA_SISTEMA" className="font-semibold text-rose-600">📋 Fluxo de RMA (Estoque Fantasma)</option>
              <option value="" disabled>--------------------------------</option>
              {palletsFiltrados.map((p) => (
                <option key={p.id} value={p.numero}>{p.numero}</option>
              ))}
            </select>
          </div>
          <Input label="Nome do Ficheiro (Opcional)" placeholder="Ex: rma_junho_auditoria" value={nomeArquivo} onChange={(e) => setNomeArquivo(e.target.value)} />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 text-xs">
            <Button type="button" variant="secondary" onClick={() => setIsExcelModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" className="bg-indigo-600 hover:bg-indigo-700" disabled={carregandoExcel}>
              {carregandoExcel ? 'Baixando...' : 'Confirmar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}