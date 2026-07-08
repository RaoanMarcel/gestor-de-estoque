// PalletInterface.tsx
import React from "react";
import { usePalletLogic } from "./components/hooks/usePalletLogic";

export interface Produto {
  id: number;
  codigoItem: string;
  bipadoEm: string;
}

export interface PalletData {
  id: number;
  numero: string;
  rua?: string;
  estrutura?: string;
  nivel?: string;
  tipo: string; 
  produtos: Produto[];
}

// Handler de Impressão nativa do Navegador (Alvo térmico 40mm x 60mm)
export const imprimirEtiquetaRetriagem = (codigo: string) => {
  const janelaImpressao = window.open('', '_blank', 'width=450,height=650');
  if (!janelaImpressao) return;

  janelaImpressao.document.write(`
    <html>
      <head>
        <title>Etiqueta Retriagem - ${codigo}</title>
        <style>
          @page { size: 40mm 60mm; margin: 0; }
          html, body {
            margin: 0; padding: 0;
            width: 40mm; height: 60mm;
            background-color: #fff;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            font-family: 'Arial', sans-serif;
          }
          .container {
            text-align: center;
            width: 100%;
            padding: 2mm;
            box-sizing: border-box;
          }
          .title {
            font-size: 8pt;
            font-weight: bold;
            margin-bottom: 3mm;
            letter-spacing: 0.5px;
          }
          .barcode-container {
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .barcode-img {
            max-width: 36mm;
            height: 18mm;
            object-fit: contain;
          }
          .code-text {
            font-size: 11pt;
            font-weight: bold;
            font-family: monospace;
            margin-top: 1.5mm;
          }
          .footer {
            font-size: 6pt;
            border-top: 0.5px dashed #000;
            padding-top: 1mm;
            width: 85%;
            margin: 3mm auto 0 auto;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="title">RETRIAGEM INTERNA</div>
          <div class="barcode-container">
            <img id="barcode" class="barcode-img" />
          </div>
          <div class="code-text">${codigo}</div>
          <div class="footer">PRO4CE WMS SYSTEM</div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <script>
          window.onload = function() {
            try {
              JsBarcode("#barcode", "${codigo}", {
                format: "CODE128",
                displayValue: false,
                height: 50,
                margin: 0
              });
            } catch (e) {
              console.error("Erro ao gerar código de barras:", e);
            }
            setTimeout(function() {
              window.print();
              window.close();
            }, 350);
          };
        </script>
      </body>
    </html>
  `);
  janelaImpressao.document.close();
};

export default function PalletInterface() {
  const {
    pallet,
    acao,
    setAcao,
    codigoBipado,
    setCodigoBipado,
    mensagemStatus,
    setMensagemStatus,
    isModoTransferencia,
    setIsModoTransferencia,
    itensParaTransferir,
    setItensParaTransferir,
    palletsDestino,
    exibirModalDestino,
    setExibirModalDestino,
    carregandoDestinos,
    inputBipRef,
    carregandoRetriagem, // Desestruturado direto do Hook
    isEntrada,
    totalUnidades,
    navigate,
    manterFocoNoInput,
    handleBipSubmit,
    handleGerarEtiquetaRetriagem, // Desestruturado direto do Hook
    handleAdicionarTodoOPalletNoLote,
    handleFinalizerColetaTransferencia,
    handleLancarAoRMA,
    handleConfirmarDestinoFinal,
    handleExcluirItemLinha
  } = usePalletLogic();

  if (!pallet) {
    return (
      <div className="min-h-screen bg-[#F6F8FC] flex items-center justify-center text-slate-400 text-xs font-mono tracking-[0.2em] uppercase">
        Carregando dados do Pallet...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#F6F8FC] text-slate-800 antialiased overflow-hidden" onClick={manterFocoNoInput}>
      {/* GRADIENTES RADIAIS DE FUNDO */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.14),transparent_70%)] blur-3xl" />
        <div className="absolute top-1/3 -right-52 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.10),transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(246,248,252,0.6))]" />
      </div>

      <div className="relative max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200 gap-4">
          <div className="space-y-1">
            <button
              onClick={() => navigate('/')}
              className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-blue-600 transition-colors"
            >
              ← Voltar para o Galpão
            </button>
            <div className="flex items-center gap-3 pt-1">
              <h1 className="text-xl font-mono font-semibold tracking-tight text-slate-900">{pallet.numero}</h1>
              <span className="text-[10px] font-mono text-slate-500 bg-white/70 backdrop-blur px-2 py-0.5 rounded border border-slate-200">
                R:{pallet.rua || '-'} • E:{pallet.estrutura || '-'} • N:{pallet.nivel || '-'}
                {pallet.tipo === 'DEFEITO' && ' • ⚠️ DEFEITO'}
                {pallet.tipo === 'RETRIAGEM' && ' • 🏷️ RETRIAGEM'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {!isModoTransferencia ? (
              <button
                onClick={() => {
                  setIsModoTransferencia(true);
                  setMensagemStatus({ texto: 'Modo transferência ativado! Selecione os itens do lote.', erro: false });
                }}
                className="px-4 h-9 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-600 text-xs font-semibold tracking-wider uppercase transition-all"
              >
                 Transferir Lote
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAdicionarTodoOPalletNoLote}
                  className="px-3 h-9 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold tracking-wider uppercase transition-all"
                >
                  {pallet && itensParaTransferir.length === pallet.produtos.length ? '🔲 Desmarcar Tudo' : 'Transferir Tudo'}
                </button>
                <button
                  onClick={() => {
                    setIsModoTransferencia(false);
                    setItensParaTransferir([]);
                    setMensagemStatus({ texto: '', erro: false });
                  }}
                  className="px-3 h-9 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold tracking-wider uppercase transition-all"
                >
                  ✕ Cancelar
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 ml-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Operando</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PAINEL ESQUERDO — CONTROLE E BIPAGEM */}
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

            {/* SEÇÃO DE RETRIAGEM INTEGRADA COM O SEQUENCIAL ÚNICO DO HOOK */}
            {pallet.tipo === 'RETRIAGEM' && (
              <div className="p-5 border border-dashed border-blue-200 bg-blue-50/40 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider m-0">
                    🏷️ Módulo Retriagem
                  </h3>
                  <p className="text-[11px] text-blue-600/90 mt-1 mb-0 leading-relaxed">
                    Clique abaixo para gerar um código sequencial único direto no banco e disparar a impressão da etiqueta térmica.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={carregandoRetriagem}
                  onClick={handleGerarEtiquetaRetriagem}
                  className="w-full sm:w-auto shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 h-11 text-xs font-semibold rounded-lg shadow-sm transition-all tracking-wider uppercase flex items-center justify-center gap-2"
                >
                  {carregandoRetriagem ? 'Processando...' : 'Gerar e Imprimir'}
                </button>
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
                  className="flex-1 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wider uppercase shadow-[0_10px_30px_-12px_rgba(16,185,129,0.4)] transition-all"
                >
                  {carregandoDestinos ? 'Aguarde...' : `✓ Mover Posição (${itensParaTransferir.length})`}
                </button>

                {pallet.tipo === 'DEFEITO' && (
                  <button
                    type="button"
                    onClick={handleLancarAoRMA}
                    className="flex-1 py-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs tracking-wider uppercase shadow-[0_10px_30px_-12px_rgba(244,63,94,0.4)] transition-all"
                  >
                    Lançar ao RMA ({itensParaTransferir.length} un.)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* PAINEL DIREITO — CONTEÚDO ATUAL */}
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col max-h-[600px]">
            <div className="border-b border-slate-200 pb-3 mb-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Conteúdo Atual</h2>
              </div>
              <span className="text-[10px] font-mono font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                {totalUnidades} un.
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {pallet.produtos.map((prod) => {
                const isItemCapturadoLote = itensParaTransferir.includes(prod.codigoItem);

                return (
                  <div
                    key={prod.id}
                    className={`relative rounded-lg border p-3 flex justify-between items-center transition-all duration-300 group overflow-hidden ${
                      isItemCapturadoLote 
                        ? 'bg-blue-50/90 border-blue-300 shadow-sm' 
                        : 'bg-white border-slate-200 hover:border-blue-500/40'
                    }`}
                  >
                    <div className="font-mono mt-1">
                      <span className={`block font-semibold text-sm tracking-tight ${isItemCapturadoLote ? 'text-blue-900' : 'text-slate-800'}`}>
                        {prod.codigoItem}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                        {new Date(prod.bipadoEm).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isModoTransferencia && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleExcluirItemLinha(prod.codigoItem); }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {pallet.produtos.length === 0 && (
                <div className="text-center py-16 bg-slate-50/60 rounded-lg border border-dashed border-slate-200 text-slate-400 text-xs font-mono tracking-[0.2em] uppercase">
                  Pallet vazio
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODAL SELEÇÃO PALLET DESTINO */}
        {exibirModalDestino && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="relative bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl">
              <div className="relative flex justify-between items-center pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">Mover {itensParaTransferir.length} Itens Para:</h3>
                </div>
                <button onClick={() => setExibirModalDestino(false)} className="text-slate-400 hover:text-slate-700 transition-colors text-sm p-1">✕</button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1 pt-1">
                {palletsDestino.map((dest) => {
                  const lotacaoAtual = dest.produtos?.length || 0;
                  const isDestinoEsgotado = lotacaoAtual >= 140;

                  return (
                    <button
                      key={dest.id} type="button" disabled={isDestinoEsgotado}
                      onClick={() => handleConfirmarDestinoFinal(dest.numero)}
                      className={`p-3 rounded-xl border text-center font-mono flex flex-col justify-between h-[76px] transition-all ${
                        isDestinoEsgotado
                          ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed opacity-50'
                          : 'bg-white border-slate-200 hover:border-blue-500/40 text-slate-800'
                      }`}
                    >
                      <span className="text-xs font-bold tracking-tight block truncate">📦 {dest.numero}</span>
                      <span className="text-[9px] text-slate-400 font-sans block mt-1">{lotacaoAtual} / 140 un.</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 text-xs">
                <button type="button" onClick={() => setExibirModalDestino(false)} className="h-9 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg">Voltar</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}