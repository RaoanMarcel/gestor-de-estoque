import Button from "../ui/Button";

interface HomeHeaderProps {
  setIsExcelModalOpen: (valor: boolean) => void;
  setIsModalOpen: (valor: boolean) => void;
  isKeyboardActive: boolean;
  setIsKeyboardActive: (valor: boolean) => void;
}

export default function HomeHeader({ setIsExcelModalOpen, setIsModalOpen, isKeyboardActive, setIsKeyboardActive }: HomeHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200 gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Operacional</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Triagens</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
        
        {isKeyboardActive ? (
          <button onClick={() => setIsKeyboardActive(false)} title="Desativar Teclado" className="h-[42px] px-3 sm:px-4 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold tracking-wider uppercase transition-all shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
            <span className="hidden sm:inline">Teclado</span>
          </button>
        ) : (
          <button onClick={() => setIsKeyboardActive(true)} title="Ativar Teclado" className="h-[42px] px-3 sm:px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 text-[11px] font-bold tracking-wider uppercase transition-all shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
            <span className="hidden sm:inline">Teclado</span>
          </button>
        )}

        <Button type="button" variant="secondary" onClick={() => setIsExcelModalOpen(true)} className="w-full sm:w-auto bg-white border-slate-200 text-slate-700 hover:bg-slate-50 h-[42px]">
          Exportar Relatório
        </Button>
        <Button variant="primary" onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto h-[42px]">
          + Adicionar Posição
        </Button>
      </div>
    </div>
  );
}