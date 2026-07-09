// components/parts/HomeHeader.tsx
import Button from "../ui/Button";

interface HomeHeaderProps {
  setIsExcelModalOpen: (valor: boolean) => void;
  setIsModalOpen: (valor: boolean) => void;
}

export default function HomeHeader({ setIsExcelModalOpen, setIsModalOpen }: HomeHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200 gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Operacional</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Visão Geral do Armazém</h1>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <Button type="button" variant="secondary" onClick={() => setIsExcelModalOpen(true)} className="w-full sm:w-auto bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
          Exportar Relatório
        </Button>
        <Button variant="primary" onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
          + Adicionar Posição
        </Button>
      </div>
    </div>
  );
}