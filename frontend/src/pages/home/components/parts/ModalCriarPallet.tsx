// components/parts/ModalCriarPallet.tsx
import type { FormEvent } from "react";
import type { CriarPalletInput } from "../../../../types/pallet";
import Button from "../ui/Button";
import Input from "../ui/Input";

interface ModalCriarPalletProps {
  isModalOpen: boolean;
  setIsModalOpen: (valor: boolean) => void;
  form: CriarPalletInput;
  setForm: (valor: CriarPalletInput) => void;
  handleCriarPallet: (e: FormEvent) => void;
}

export default function ModalCriarPallet({
  isModalOpen,
  setIsModalOpen,
  form,
  setForm,
  handleCriarPallet,
}: ModalCriarPalletProps) {
  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="relative bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.25)] overflow-hidden">
        <form onSubmit={handleCriarPallet} className="relative space-y-4">
          <Input label="Identificador do Pallet *" placeholder="Ex: PL-1200" required value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
          <Input label="Rua / Corredor" placeholder="Ex: Setor A" value={form.rua} onChange={(e) => setForm({ ...form, rua: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Estrutura" placeholder="Ex: EST-02" value={form.estrutura} onChange={(e) => setForm({ ...form, estrutura: e.target.value })} />
            <Input label="Nível" placeholder="Ex: 3" value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })} />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Finalidade / Tipo da Posição *
            </label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 h-10 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition-all"
            >
              <option value="PADRAO"> Pallet Padrão (Armazenagem Geral)</option>
              <option value="DEFEITO"> Pallet de Defeito / Avariados</option>
              <option value="RETRIAGEM"> Pallet de Retorno</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 text-xs">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary">Confirmar</Button>
          </div>
        </form>
      </div>
    </div>
  );
}