// src/pages/Interface/PalletInterface.tsx
import { usePalletLogic } from "./components/hooks/usePalletLogic";
import PalletHeader from "./components/parts/PalletHeader";
import BipagemPanel from "./components/parts/BipagemPanel";
import ConteudoAtualPanel from "./components/parts/ConteudoAtualPanel";
import ModalDestino from "./components/parts/ModalDestino";
import ModalNovaEtiqueta from "./components/parts/ModalNovaEtiqueta";
import ModalRastreabilidade from "./components/parts/ModalRastreabilidade"; // 🚀 IMPORT DO MODAL DO HISTÓRICO

export default function PalletInterface() {
  const {
    pallet,
    exclusoesPendentes,
    exibirModalExclusaoLote,
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
    carregandoRetriagem,
    qtdEtiquetas,
    setQtdEtiquetas,
    isEntrada,
    totalUnidades,
    manterFocoNoInput,
    handleBipSubmit,
    handleGerarEtiquetaRetriagem,
    handleAdicionarTodoOPalletNoLote,
    handleFinalizerColetaTransferencia,
    handleLancarAoRMA,
    handleConfirmarDestinoFinal,
    handleExcluirItemLinha,
    handleDesfazerExclusaoItem,
    handleConfirmarExclusaoEmLote,
    handleDescartarExclusoesCache,
    handleTentarSairDaTela,
    
    // Estados do Histórico 
    exibirModalRastreabilidade,
    setExibirModalRastreabilidade,
    itemRastreabilidade,
    historicoData,
    carregandoHistorico,
    handleAbrirRastreabilidade, // 🚀 RECUPERANDO A FUNÇÃO DE ABRIR O HISTÓRICO
    
    // Estados do Modal Puxar
    exibirModalPuxar,
    setExibirModalPuxar,
    codigoPuxar,
    setCodigoPuxar,
    handlePuxarItemSubmit,
    inputPuxarRef,

    // Estados do Modal Vermelho de Nova Etiqueta
    modalNovaEtiqueta,
    cancelarNovaEtiqueta,
    dadosRetriagem,
    novaEtiquetaBipada,
    setNovaEtiquetaBipada,
    handleBiparNovaEtiquetaSubmit,
    inputNovaEtiquetaRef
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
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.14),transparent_70%)] blur-3xl" />
        <div className="absolute top-1/3 -right-52 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.10),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <PalletHeader
          pallet={pallet}
          isModoTransferencia={isModoTransferencia}
          setIsModoTransferencia={setIsModoTransferencia}
          setMensagemStatus={setMensagemStatus}
          itensParaTransferir={itensParaTransferir}
          setItensParaTransferir={setItensParaTransferir}
          handleAdicionarTodoOPalletNoLote={handleAdicionarTodoOPalletNoLote}
          navigate={(rota) => handleTentarSairDaTela(String(rota))}
          onAbrirModalPuxar={() => setExibirModalPuxar(true)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <BipagemPanel
            pallet={pallet}
            acao={acao}
            setAcao={setAcao}
            isEntrada={isEntrada}
            isModoTransferencia={isModoTransferencia}
            codigoBipado={codigoBipado}
            setCodigoBipado={setCodigoBipado}
            handleBipSubmit={handleBipSubmit}
            inputBipRef={inputBipRef}
            qtdEtiquetas={qtdEtiquetas}
            setQtdEtiquetas={setQtdEtiquetas}
            carregandoRetriagem={carregandoRetriagem}
            handleGerarEtiquetaRetriagem={handleGerarEtiquetaRetriagem}
            mensagemStatus={mensagemStatus}
            itensParaTransferir={itensParaTransferir}
            handleFinalizerColetaTransferencia={handleFinalizerColetaTransferencia}
            carregandoDestinos={carregandoDestinos}
            handleLancarAoRMA={handleLancarAoRMA}
          />

          <ConteudoAtualPanel
            pallet={pallet}
            totalUnidades={totalUnidades}
            itensParaTransferir={itensParaTransferir}
            isModoTransferencia={isModoTransferencia}
            handleExcluirItemLinha={handleExcluirItemLinha}
            exclusoesPendentes={exclusoesPendentes}
            handleDesfazerExclusaoItem={handleDesfazerExclusaoItem}
            handleAbrirRastreabilidade={handleAbrirRastreabilidade} // 🚀 REPASSANDO A FUNÇÃO PARA OS BOTÕES
          />
        </div>

        <ModalDestino
          exibirModalDestino={exibirModalDestino}
          setExibirModalDestino={setExibirModalDestino}
          itensParaTransferir={itensParaTransferir}
          palletsDestino={palletsDestino}
          handleConfirmarDestinoFinal={handleConfirmarDestinoFinal}
        />

        {/* 🚀 MODAL DE RASTREABILIDADE (HISTÓRICO) */}
        <ModalRastreabilidade
          exibir={exibirModalRastreabilidade}
          fechar={() => setExibirModalRastreabilidade(false)}
          codigoItem={itemRastreabilidade}
          historico={historicoData}
          carregando={carregandoHistorico}
        />

        <ModalNovaEtiqueta 
          exibir={modalNovaEtiqueta}
          cancelar={cancelarNovaEtiqueta}
          dadosRetriagem={dadosRetriagem}
          novaEtiquetaBipada={novaEtiquetaBipada}
          setNovaEtiquetaBipada={setNovaEtiquetaBipada}
          handleBiparNovaEtiquetaSubmit={handleBiparNovaEtiquetaSubmit}
          inputRef={inputNovaEtiquetaRef}
        />
      </div>

      {/* MODAL DE PUXAR ITEM INDIVIDUAL */}
      {exibirModalPuxar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setExibirModalPuxar(false)}>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                Puxar Item para {pallet.numero}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Digite ou bipe o código do item que está em outro pallet para transferi-lo imediatamente para cá.
              </p>
            </div>

            <form onSubmit={handlePuxarItemSubmit} className="space-y-4 pt-2">
              <input
                ref={inputPuxarRef}
                type="text"
                value={codigoPuxar}
                onChange={(e) => setCodigoPuxar(e.target.value.toUpperCase())}
                placeholder="Ex: 00012345 ou CR-00004"
                className="w-full text-center text-lg font-mono font-bold text-slate-800 bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300"
                autoComplete="off"
                autoFocus
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExibirModalPuxar(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs tracking-wider uppercase transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!codigoPuxar.trim()}
                  className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs tracking-wider uppercase shadow-md disabled:opacity-50 transition-all"
                >
                  Confirmar Puxada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DO LOTE EM CACHE (Interceptador de navegação) */}
      {exibirModalExclusaoLote && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="text-center">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider mt-2">
                Exclusões Pendentes
              </h3>
              <div className="mt-3 text-left">
                <p className="text-xs text-slate-500 mb-3">
                  Os seguintes códigos estão aguardando confirmação de baixa:
                </p>

                <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50">
                  {exclusoesPendentes.map((codigo) => (
                    <div
                      key={codigo}
                      className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 border-slate-200"
                    >
                      <span className="font-mono text-sm font-semibold text-slate-800">
                        {codigo}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-rose-600 font-bold">
                        EXCLUSÃO
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Deseja confirmar a baixa definitiva destes itens antes de sair?
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleConfirmarExclusaoEmLote}
                className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wider uppercase shadow-sm transition-all"
              >
                ✓ Confirmar Baixa no Estoque
              </button>
              <button
                onClick={handleDescartarExclusoesCache}
                className="w-full py-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-xs tracking-wider uppercase transition-all"
              >
                 Descartar Operações e Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}