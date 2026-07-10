// PalletInterface.tsx
import { usePalletLogic } from "./components/hooks/usePalletLogic";
import PalletHeader from "./components/parts/PalletHeader";
import BipagemPanel from "./components/parts/BipagemPanel";
import ConteudoAtualPanel from "./components/parts/ConteudoAtualPanel";
import ModalDestino from "./components/parts/ModalDestino";

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
    
    // Injeções novas do Hook
    handleDesfazerExclusaoItem,
    handleConfirmarExclusaoEmLote,
    handleDescartarExclusoesCache,
    handleTentarSairDaTela
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
        {/* Substituído o botão de voltar padrão da aplicação para passar pelo interceptador de Cache */}
        <PalletHeader
          pallet={pallet}
          isModoTransferencia={isModoTransferencia}
          setIsModoTransferencia={setIsModoTransferencia}
          setMensagemStatus={setMensagemStatus}
          itensParaTransferir={itensParaTransferir}
          setItensParaTransferir={setItensParaTransferir}
          handleAdicionarTodoOPalletNoLote={handleAdicionarTodoOPalletNoLote}
          navigate={(rota) => handleTentarSairDaTela(String(rota))}
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

          {/* Adicionado a lista de pendentes e a ação de desfazer */}
          <ConteudoAtualPanel
            pallet={pallet}
            totalUnidades={totalUnidades}
            itensParaTransferir={itensParaTransferir}
            isModoTransferencia={isModoTransferencia}
            handleExcluirItemLinha={handleExcluirItemLinha}
            exclusoesPendentes={exclusoesPendentes}
            handleDesfazerExclusaoItem={handleDesfazerExclusaoItem}
          />
        </div>

        <ModalDestino
          exibirModalDestino={exibirModalDestino}
          setExibirModalDestino={setExibirModalDestino}
          itensParaTransferir={itensParaTransferir}
          palletsDestino={palletsDestino}
          handleConfirmarDestinoFinal={handleConfirmarDestinoFinal}
        />
      </div>

      {/* MODAL DE CONFIRMAÇÃO DO LOTE EM CACHE (Interceptador de navegação) */}
      {exibirModalExclusaoLote && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="text-center">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider mt-2">
                Exclusões Pendentes no Cache
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Você possui <span className="font-bold text-rose-600 font-mono text-sm">{exclusoesPendentes.length}</span> item(ns) na lista temporária de exclusão. Deseja confirmar a baixa definitiva no estoque físico antes de fechar este pallet?
              </p>
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