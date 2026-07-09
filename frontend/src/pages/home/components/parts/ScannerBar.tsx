// components/parts/ScannerBar.tsx
import type { FormEvent, RefObject } from "react";

interface ScannerBarProps {
  handleQrBipado: (e: FormEvent) => void;
  qrCodeBipado: string;
  setQrCodeBipado: (valor: string) => void;
  qrInputRef: RefObject<HTMLInputElement | null>;
}

export default function ScannerBar({ handleQrBipado, qrCodeBipado, setQrCodeBipado, qrInputRef }: ScannerBarProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-slate-200 focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/15 focus-within:shadow-[0_10px_30px_-12px_rgba(37,99,235,0.35)] transition-all shadow-sm overflow-hidden">
      <form onSubmit={handleQrBipado} className="p-2 flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="hidden sm:flex items-center pl-3 text-slate-400 shrink-0">
          <span className="text-xs font-mono uppercase tracking-widest">SCAN ›</span>
        </div>
        <input
          ref={qrInputRef} type="text" inputMode="text" autoComplete="off"
          className="flex-1 min-w-0 w-full bg-transparent text-slate-900 px-3 py-3 font-mono text-sm sm:text-base focus:outline-none placeholder:text-slate-400"
          placeholder="Digite o código da triagem ou número do pallet..."
          value={qrCodeBipado} onChange={(e) => setQrCodeBipado(e.target.value)}
        />
        <button type="submit" className="w-full sm:w-auto shrink-0 bg-slate-50 hover:bg-slate-100 text-slate-700 px-6 h-11 sm:h-12 text-xs font-semibold rounded-lg border border-slate-200 hover:border-slate-300 transition-all tracking-wider uppercase">
          Acessar
        </button>
      </form>
    </div>
  );
}