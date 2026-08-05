// src/pages/Interface/components/parts/ModalNovaEtiqueta.tsx
import React from 'react';

interface ModalNovaEtiquetaProps {
  exibir: boolean;
  cancelar: () => void;
  dadosRetriagem: { codigoOriginal: string; prefixoEsperado: string } | null;
  novaEtiquetaBipada: string;
  setNovaEtiquetaBipada: (val: string) => void;
  handleBiparNovaEtiquetaSubmit: (e: React.FormEvent) => void;
  inputRef: React.RefObject<HTMLInputElement | null>; 
}

export default function ModalNovaEtiqueta({
  exibir,
  cancelar,
  dadosRetriagem,
  novaEtiquetaBipada,
  setNovaEtiquetaBipada,
  handleBiparNovaEtiquetaSubmit,
  inputRef
}: ModalNovaEtiquetaProps) {
  
  if (!exibir || !dadosRetriagem) return null;

  // 🚀 LÓGICA DE MÁSCARA NATURAL (Sem pré-preenchimento)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().trim();
    
    // Calcula o tamanho máximo exato (Tamanho do prefixo + 5 números)
    // Ex: "000" (3) + 5 = 8 caracteres.
    const maxLength = dadosRetriagem.prefixoEsperado.length + 5;

    // Trava para impedir a metralhadora de Zeros da pistola de código de barras
    if (val.length > maxLength) {
      val = val.substring(0, maxLength);
    }

    setNovaEtiquetaBipada(val);
  };

  // 🚀 LIBERAÇÃO DO BOTÃO: Só ativa se começar com o prefixo certo E tiver o tamanho exato
  const isTamanhoValido = 
    novaEtiquetaBipada.startsWith(dadosRetriagem.prefixoEsperado) && 
    novaEtiquetaBipada.length === (dadosRetriagem.prefixoEsperado.length + 5);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center space-y-2 mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-100 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-rose-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
            Troca de Etiqueta Obrigatória
          </h3>
          <p className="text-sm text-slate-500 font-medium">
            O código <span className="font-mono font-bold text-rose-600">{dadosRetriagem.codigoOriginal}</span> não é válido para este pallet.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Cole a nova etiqueta no produto e bipe-a abaixo. Ela deve obrigatoriamente iniciar com: <strong className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">{dadosRetriagem.prefixoEsperado}</strong>
          </p>
        </div>

        <form onSubmit={handleBiparNovaEtiquetaSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            value={novaEtiquetaBipada}
            onChange={handleInputChange} 
            placeholder={`Bipe a nova etiqueta (Ex: ${dadosRetriagem.prefixoEsperado}12345)`}
            className="w-full text-center text-lg tracking-widest font-mono font-bold text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-4 focus:outline-none focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-50 transition-all placeholder:text-slate-300"
            autoComplete="off"
          />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={cancelar}
              className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs tracking-wider uppercase transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isTamanhoValido}
              className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs tracking-wider uppercase shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Confirmar Troca
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}