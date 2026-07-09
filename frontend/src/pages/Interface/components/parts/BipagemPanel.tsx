// components/parts/BipagemPanel.tsx
import type { FormEvent, RefObject } from "react";
import type { PalletData } from "../types/types";

interface BipagemPanelProps {
  pallet: PalletData;
  acao: 'ENTRADA' | 'SAIDA';
  setAcao: (acao: 'ENTRADA' | 'SAIDA') => void;
  isEntrada: boolean;
  isModoTransferencia: boolean;
  codigoBipado: string;
  setCodigoBipado: (valor: string) => void;
  handleBipSubmit: (e: FormEvent) => void;
  inputBipRef: RefObject<HTMLInputElement | null>;
  qtdEtiquetas: number;
  setQtdEtiquetas: (valor: number) => void;
  carregandoRetriagem: boolean;
  handleGerarEtiquetaRetriagem: () => void;
  mensagemStatus: { texto: string; erro: boolean };
  itensParaTransferir: string[];
  handleFinalizerColetaTransferencia: () => void;
  carregandoDestinos: boolean;
  handleLancarAoRMA: () => void;
}

export default function BipagemPanel({
  pallet,
  acao,
  setAcao,
  isEntrada,
  isModoTransferencia,
  codigoBipado,
  setCodigoBipado,
  handleBipSubmit,
  inputBipRef,
  qtdEtiquetas,
  setQtdEtiquetas,
  carregandoRetriagem,
  handleGerarEtiquetaRetriagem,
  mensagemStatus,
  itensParaTransferir,
  handleFinalizerColetaTransferencia,
  carregandoDestinos,
  handleLancarAoRMA,
}: BipagemPanelProps) {
  return (
    <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6">

      {!isModoTransferencia ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setAcao('ENTRADA')}
            className={`p-4 rounded-xl text-xs font-semibold uppercase tracking-[0.15em] border transition-all flex items-center justify-center gap-2 ${
              isEntrada ? 'bg-emerald-50 border-emerald-500/60 text-emerald-700 shadow-[0_10px_30px_-12px_rgba(16,185,129,0.4)]' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isEntrada ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'bg-slate-300'}`} />
            Entrada de Produtos
          </button>
          <button
            onClick={() => setAcao('SAIDA')}
            className={`p-4 rounded-xl text-xs font-semibold uppercase tracking-[0.15em] border transition-all flex items-center justify-center gap-2 ${
              !isEntrada ? 'bg-rose-50 border-rose-500/60 text-rose-700 shadow-[0_10px_30px_-12px_rgba(244,63,94,0.4)]' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${!isEntrada ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]' : 'bg-slate-300'}`} />
            Exclusão / Saída
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-blue-600 text-white text-center font-semibold text-xs uppercase tracking-widest shadow-[0_10px_30px_-12px_rgba(37,99,235,0.4)]">
          🔵 MODO DE REMANEJAMENTO ATIVO · SELECIONE OS ITENS
        </div>
      )}

      {/* Campo de Bipagem Principal */}
      <form onSubmit={handleBipSubmit} className="space-y-2">
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full ${isModoTransferencia ? 'bg-blue-500' : isEntrada ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          Aponte o leitor de código de barras
        </label>
        <input
          ref={inputBipRef}
          type="text"
          placeholder={isModoTransferencia ? 'Bipando TRANSFERÊNCIA...' : isEntrada ? 'Bipando ENTRADA...' : 'Bipando SAÍDA...'}
          className={`w-full p-6 rounded-xl font-mono text-2xl text-center font-semibold tracking-wider transition-all border-2 focus:outline-none focus:ring-4 ${
            isModoTransferencia
              ? 'bg-blue-50/60 border-blue-500/50 text-blue-800 placeholder-blue-400/60 focus:ring-blue-500/15 focus:border-blue-500'
              : isEntrada
              ? 'bg-emerald-50/60 border-emerald-500/50 text-emerald-800 placeholder-emerald-400/60 focus:ring-emerald-500/15 focus:border-emerald-500'
              : 'bg-rose-50/60 border-rose-500/50 text-rose-800 placeholder-rose-400/60 focus:ring-rose-500/15 focus:border-rose-500'
          }`}
          value={codigoBipado}
          onChange={(e) => setCodigoBipado(e.target.value)}
        />
      </form>

      {/* SEÇÃO DE RETRIAGEM COM SELETOR DE QUANTIDADE ADICIONADO */}
      {pallet.tipo === 'RETRIAGEM' && (
        <div className="p-5 border border-dashed border-blue-200 bg-blue-50/40 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider m-0">
              🏷️ Módulo Retriagem
            </h3>
            <p className="text-[11px] text-blue-600/90 mt-1 mb-0 leading-relaxed">
              Escolha a quantidade de caixas que deseja etiquetar. O sistema registrará os códigos sequenciais automaticamente.
            </p>
          </div>

          {/* Seletor de Quantidade integrado ao lado do botão */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Qtd</span>
              <input
                type="number"
                min={1}
                value={qtdEtiquetas}
                onChange={(e) => {
                  const valor = Number(e.target.value);
                  setQtdEtiquetas(valor > 0 ? valor : 1);
                }}
                className="bg-white border border-slate-200 rounded-lg h-11 px-3 text-sm font-semibold text-slate-700 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/40 w-[70px]"
              />
            </div>

            <div className="flex flex-col gap-1 flex-1 md:flex-none">
              <span className="text-[9px] font-transparent text-transparent select-none">.</span>
              <button
                type="button"
                disabled={carregandoRetriagem}
                onClick={handleGerarEtiquetaRetriagem}
                className="w-full md:w-auto shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 h-11 text-xs font-semibold rounded-lg shadow-sm transition-all tracking-wider uppercase flex items-center justify-center gap-2"
              >
                {carregandoRetriagem ? 'Gerando...' : 'Gerar Novas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback de Status */}
      {mensagemStatus.texto && (
        <div
          className={`p-4 rounded-xl font-medium text-center text-sm border backdrop-blur-xl ${
            mensagemStatus.erro
              ? 'bg-rose-50/80 border-rose-200 text-rose-700'
              : isModoTransferencia
              ? 'bg-blue-50/80 border-blue-200 text-blue-700'
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-700'
          }`}
        >
          {mensagemStatus.erro ? '⚠ ' : '✓ '} {mensagemStatus.texto}
        </div>
      )}

      {/* Painel de confirmação inferior dinâmico */}
      {isModoTransferencia && (
        <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full">
          <button
            type="button"
            onClick={handleFinalizerColetaTransferencia}
            disabled={carregandoDestinos}
            className="flex-1 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wider uppercase shadow-sm transition-all"
          >
            {carregandoDestinos ? 'Aguarde...' : `✓ Mover Posição (${itensParaTransferir.length})`}
          </button>

          {pallet.tipo === 'DEFEITO' && (
            <button
              type="button"
              onClick={handleLancarAoRMA}
              className="flex-1 py-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs tracking-wider uppercase shadow-sm transition-all"
            >
              Lançar ao RMA ({itensParaTransferir.length} un.)
            </button>
          )}
        </div>
      )}
    </div>
  );
}