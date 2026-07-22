// src/pages/Interface/components/parts/BipagemPanel.tsx
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
  
  const tipoPallet = pallet?.tipo?.toUpperCase() || '';
  const descPallet = pallet?.descricao?.toUpperCase() || '';
  const numPallet = pallet?.numero?.toUpperCase() || '';
  
  // 🚀 LÓGICA INTELIGENTE DE PREFIXOS E MÁSCARAS (Junta a string toda para achar o padrão)
  const textoBusca = `${tipoPallet} ${descPallet} ${numPallet}`;

  let prefixo = '000';
  let isEspecial = false;
  let maxLen = 8;
  let nomeOperacao = '';

  if (textoBusca.includes('RETORNO') || numPallet.startsWith('R-')) {
    prefixo = 'R-';
    isEspecial = true;
    maxLen = 7; 
    nomeOperacao = 'RETORNO';
  } else if (textoBusca.includes('NOVO') || numPallet.startsWith('N-')) {
    prefixo = 'N-';
    isEspecial = true;
    maxLen = 7; 
    nomeOperacao = 'PRODUTO NOVO';
  } else if (textoBusca.includes('DEVOLUCAO') || numPallet.startsWith('CR-')) {
    prefixo = 'CR-';
    isEspecial = true;
    maxLen = 8; 
    nomeOperacao = 'DEVOLUÇÃO';
  } else if (textoBusca.includes('RETRIAGEM')) {
    prefixo = '000';
    isEspecial = true; // Retriagem pura permite a geração de etiquetas no padrão '000'
    maxLen = 8;
    nomeOperacao = 'RETRIAGEM';
  }

  const textoAcao = isEntrada ? 'ENTRADA' : 'SAÍDA';
  const exemploCodigo = `${prefixo}12345`.substring(0, maxLen);
  const placeholderInput = isModoTransferencia 
    ? 'Bipando TRANSFERÊNCIA...' 
    : `Bipando ${textoAcao} (Ex: ${exemploCodigo})...`;

  const getTemaGerador = () => {
    switch(prefixo) {
      case 'R-': return { bg: 'bg-amber-50/60', border: 'border-amber-200', textTitle: 'text-amber-950', textDesc: 'text-amber-700', btn: 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400', focus: 'focus:ring-amber-500/40' };
      case 'N-': return { bg: 'bg-teal-50/60', border: 'border-teal-200', textTitle: 'text-teal-950', textDesc: 'text-teal-700', btn: 'bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400', focus: 'focus:ring-teal-500/40' };
      case 'CR-': return { bg: 'bg-purple-50/60', border: 'border-purple-200', textTitle: 'text-purple-950', textDesc: 'text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400', focus: 'focus:ring-purple-500/40' };
      default: return { bg: 'bg-blue-50/60', border: 'border-blue-200', textTitle: 'text-blue-950', textDesc: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400', focus: 'focus:ring-blue-500/40' };
    }
  };
  const tema = getTemaGerador();

  return (
    <div className="lg:col-span-2 bg-white/85 backdrop-blur-xl rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6">

      {!isModoTransferencia ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setAcao('ENTRADA')}
            className={`p-4 rounded-xl text-xs font-semibold uppercase tracking-[0.15em] border transition-all flex items-center justify-center gap-2 ${
              isEntrada ? 'bg-emerald-50 border-emerald-500/60 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isEntrada ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            Entrada de Produtos
          </button>
          <button
            onClick={() => setAcao('SAIDA')}
            className={`p-4 rounded-xl text-xs font-semibold uppercase tracking-[0.15em] border transition-all flex items-center justify-center gap-2 ${
              !isEntrada ? 'bg-rose-50 border-rose-500/60 text-rose-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${!isEntrada ? 'bg-rose-500' : 'bg-slate-300'}`} />
            Exclusão / Saída
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-blue-600 text-white text-center font-semibold text-xs uppercase tracking-widest shadow-sm">
          🔵 MODO DE REMANEJAMENTO ATIVO · SELECIONE OS ITENS
        </div>
      )}

      <form onSubmit={handleBipSubmit} className="space-y-2">
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full ${isModoTransferencia ? 'bg-blue-500' : isEntrada ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          Aponte o leitor de código de barras
        </label>
        
        <input
          ref={inputBipRef}
          type="text"
          maxLength={maxLen}
          placeholder={placeholderInput}
          className={`w-full p-6 rounded-xl font-mono text-2xl text-center font-semibold tracking-wider transition-all border-2 focus:outline-none focus:ring-4 ${
            isModoTransferencia
              ? 'bg-blue-50/60 border-blue-500/50 text-blue-800 placeholder-blue-400/60 focus:ring-blue-500/15 focus:border-blue-500'
              : isEntrada
              ? 'bg-emerald-50/60 border-emerald-500/50 text-emerald-800 placeholder-emerald-400/60 focus:ring-emerald-500/15 focus:border-emerald-500'
              : 'bg-rose-50/60 border-rose-500/50 text-rose-800 placeholder-rose-400/60 focus:ring-rose-500/15 focus:border-rose-500'
          }`}
          value={codigoBipado}
          onChange={(e) => {
            let valorInjetado = e.target.value.toUpperCase();
            
            if (prefixo !== '000') {
              setCodigoBipado(valorInjetado.trim());
            } else {
              let apenasNumeros = valorInjetado.replace(/\D/g, '');
              let mascaraFinal = '';
              for (let i = 0; i < apenasNumeros.length; i++) {
                if (i < 3) {
                  if (apenasNumeros[i] === '0') {
                    mascaraFinal += '0';
                  } else {
                    break;
                  }
                } else {
                  mascaraFinal += apenasNumeros[i];
                }
              }
              setCodigoBipado(mascaraFinal);
            }
          }}
        />
        
        <p className="text-center text-[11px] font-medium text-slate-400">
          {prefixo !== '000' ? (
            <>O código do item deve iniciar obrigatoriamente com <strong className="text-slate-600">{prefixo}</strong> seguido da numeração.</>
          ) : (
            <>O código da triagem deve conter exatamente <strong className="text-slate-600">8 números</strong> e iniciar obrigatoriamente com <strong className="text-slate-600">000</strong>.</>
          )}
        </p>
      </form>

      {isEspecial && (
        <div className={`p-5 border border-dashed rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-300 ${tema.bg} ${tema.border}`}>
          <div className="flex-1">
            <h3 className={`text-xs font-bold uppercase tracking-wider m-0 ${tema.textTitle}`}>
              GERAÇÃO DE ETIQUETAS · {nomeOperacao}
            </h3>
            <p className={`text-[11px] mt-1 mb-0 leading-relaxed font-medium ${tema.textDesc}`}>
              Escolha a quantidade de caixas. O sistema registrará e imprimirá os códigos <strong className="font-bold">{prefixo}</strong> automaticamente.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Qtd</span>
              <input
                type="number"
                min={1}
                max={50}
                value={qtdEtiquetas}
                onChange={(e) => {
                  const valor = Number(e.target.value);
                  setQtdEtiquetas(valor > 0 ? valor : 1);
                }}
                className={`bg-white border border-slate-200 rounded-lg h-11 px-3 text-sm font-semibold text-slate-700 text-center focus:outline-none focus:ring-2 w-[70px] ${tema.focus}`}
              />
            </div>

            <div className="flex flex-col gap-1 flex-1 md:flex-none">
              <span className="text-[9px] font-transparent text-transparent select-none">.</span>
              <button
                type="button"
                disabled={carregandoRetriagem}
                onClick={handleGerarEtiquetaRetriagem}
                className={`w-full md:w-auto shrink-0 text-white px-5 h-11 text-xs font-bold rounded-lg shadow-sm transition-all tracking-wider uppercase flex items-center justify-center gap-2 ${tema.btn}`}
              >
                {carregandoRetriagem ? 'Gerando...' : 'Gerar e Imprimir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {mensagemStatus.texto && (
        <div
          className={`p-4 rounded-xl font-medium text-center text-sm border backdrop-blur-xl animate-in fade-in duration-300 ${
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

      {isModoTransferencia && (
        <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full animate-in slide-in-from-bottom-2 duration-300">
          <button
            type="button"
            onClick={handleFinalizerColetaTransferencia}
            disabled={carregandoDestinos}
            className="flex-1 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wider uppercase shadow-sm transition-all disabled:opacity-50"
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