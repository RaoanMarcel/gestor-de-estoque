// PalletInterface.tsx
import { usePalletLogic } from "./components/hooks/usePalletLogic";
import PalletHeader from "./components/parts/PalletHeader";
import BipagemPanel from "./components/parts/BipagemPanel";
import ConteudoAtualPanel from "./components/parts/ConteudoAtualPanel";
import ModalDestino from "./components/parts/ModalDestino";

// Mantidos aqui por compatibilidade com quem já importava tipos/util direto de PalletInterface
export type { Produto, PalletData } from "./components/types/types";
export { imprimirEtiquetaRetriagem } from "./components/utils/imprimirEtiqueta";

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
    carregandoRetriagem,
    qtdEtiquetas,
    setQtdEtiquetas,
    isEntrada,
    totalUnidades,
    navigate,
    manterFocoNoInput,
    handleBipSubmit,
    handleGerarEtiquetaRetriagem,
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
        <PalletHeader
          pallet={pallet}
          isModoTransferencia={isModoTransferencia}
          setIsModoTransferencia={setIsModoTransferencia}
          setMensagemStatus={setMensagemStatus}
          itensParaTransferir={itensParaTransferir}
          setItensParaTransferir={setItensParaTransferir}
          handleAdicionarTodoOPalletNoLote={handleAdicionarTodoOPalletNoLote}
          navigate={navigate}
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
    </div>
  );
}