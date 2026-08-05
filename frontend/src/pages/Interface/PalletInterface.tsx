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
    handleLancarPalletNovo,
    
    handleDesfazerExclusaoItem,
    handleConfirmarExclusaoEmLote,
    handleDescartarExclusoesCache,
    handleTentarSairDaTela,

    // Modais de suporte e rastreabilidade
    handleAbrirRastreabilidade,
    exibirModalRastreabilidade,
    setExibirModalRastreabilidade,
    historicoData,
    carregandoHistorico,
    itemRastreabilidade,

    modalNovaEtiqueta,
    cancelarNovaEtiqueta,
    dadosRetriagem,
    novaEtiquetaBipada,
    setNovaEtiquetaBipada,
    handleBiparNovaEtiquetaSubmit,
    inputNovaEtiquetaRef,

    exibirModalPuxar,
    setExibirModalPuxar,
    codigoPuxar,
    setCodigoPuxar,
    handlePuxarItemSubmit,
    inputPuxarRef
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
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

          <div className="lg:col-span-1 flex flex-col gap-6">
            <ConteudoAtualPanel
              pallet={pallet}
              totalUnidades={totalUnidades}
              itensParaTransferir={itensParaTransferir}
              isModoTransferencia={isModoTransferencia}
              handleExcluirItemLinha={handleExcluirItemLinha}
              exclusoesPendentes={exclusoesPendentes}
              handleDesfazerExclusaoItem={handleDesfazerExclusaoItem}
              handleAbrirRastreabilidade={handleAbrirRastreabilidade}
            />

            {/* Painel de Lançamento para Pallets do Tipo NOVO */}
            {pallet.tipo === 'NOVO' && (
              <div className="bg-white border-2 border-emerald-100 rounded-xl p-5 shadow-sm space-y-3 animate-enter">
                <div className="flex items-center gap-2.5 text-emerald-600">
                  <div className="bg-emerald-100 p-1.5 rounded-lg text-emerald-600">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-tight text-slate-800">Lançar Itens</h3>
                </div>
                <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                  Valida os códigos e exige sua <strong className="text-slate-700">senha de operador</strong> para dar baixa no estoque e gerar o relatório final.
                </p>
                <button
                  onClick={handleLancarPalletNovo}
                  className="w-full mt-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Lançar e Imprimir
                </button>
              </div>
            )}
          </div>
        </div>

        <ModalDestino
          exibirModalDestino={exibirModalDestino}
          setExibirModalDestino={setExibirModalDestino}
          itensParaTransferir={itensParaTransferir}
          palletsDestino={palletsDestino}
          handleConfirmarDestinoFinal={handleConfirmarDestinoFinal}
        />
      </div>

      {/* MODAL DE EXCLUSÕES PENDENTES */}
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

      {/* MODAL DE RASTREABILIDADE (Padrão exato corporativo) */}
      {exibirModalRastreabilidade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setExibirModalRastreabilidade(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            
            <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Rastreabilidade do Item</h2>
                <p className="text-sm text-slate-500 mt-1">Cód: <span className="font-mono">{itemRastreabilidade}</span></p>
              </div>
              <button onClick={() => setExibirModalRastreabilidade(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
              {carregandoHistorico ? (
                <p className="text-center text-sm font-medium text-slate-400 py-10">Buscando rastros...</p>
              ) : historicoData.length === 0 ? (
                <div className="text-center py-10">
                  <span className="text-3xl">👻</span>
                  <p className="text-sm font-medium text-slate-500 mt-2">Nenhum rastro encontrado.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-2">
                  {historicoData.map((evento, idx) => (
                    <div key={evento.id || idx} className="relative pl-6">
                      <div className="absolute -left-[9px] top-4 h-4 w-4 rounded-full border-2 border-slate-50 bg-blue-500" />
                      
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                            {evento.acao.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {evento.bipadoEm ? new Date(evento.bipadoEm).toLocaleString('pt-BR') : 'Data não reg.'}
                          </span>
                        </div>

                        <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          Pallet: <span className="bg-slate-100 border border-slate-200 text-slate-800 px-2 py-0.5 rounded text-xs">{evento.palletAlvo || 'Sistema'}</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 pt-2 border-t border-slate-50">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-slate-400">
                            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                          </svg>
                          Operação por: <strong className="text-slate-700">{evento.usuario?.username || 'Sistema'}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white">
              <button onClick={() => setExibirModalRastreabilidade(false)} className="w-full py-3.5 bg-[#131B2A] hover:bg-slate-900 text-white text-xs font-bold tracking-wider uppercase rounded-xl transition-colors shadow-md">
                Fechar Rastreamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOVA ETIQUETA */}
      {modalNovaEtiqueta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={cancelarNovaEtiqueta}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-amber-500">
              <span className="text-3xl">🏷️</span>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Retriagem Obrigatória</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              O item <strong className="font-mono text-slate-900">{dadosRetriagem?.codigoOriginal}</strong> precisa receber uma nova etiqueta que comece com <strong className="text-amber-600">{dadosRetriagem?.prefixoEsperado}</strong>.
            </p>
            <form onSubmit={handleBiparNovaEtiquetaSubmit} className="space-y-3 pt-2">
              <input
                ref={inputNovaEtiquetaRef}
                type="text"
                value={novaEtiquetaBipada}
                onChange={(e) => setNovaEtiquetaBipada(e.target.value.toUpperCase())}
                placeholder={`Bipe a nova etiqueta ${dadosRetriagem?.prefixoEsperado}...`}
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm font-mono focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none uppercase"
                autoFocus
              />
              <div className="flex gap-2">
                <button type="button" onClick={cancelarNovaEtiqueta} className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200">Cancelar</button>
                <button type="submit" disabled={!novaEtiquetaBipada} className="flex-1 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50">Vincular</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PUXAR ITEM */}
      {exibirModalPuxar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setExibirModalPuxar(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Puxar Item</h2>
              <button onClick={() => setExibirModalPuxar(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <form onSubmit={handlePuxarItemSubmit} className="space-y-4">
              <p className="text-xs text-slate-500">Bipe o código do item que deseja transferir de outro pallet para este.</p>
              <input
                ref={inputPuxarRef}
                type="text"
                value={codigoPuxar}
                onChange={(e) => setCodigoPuxar(e.target.value.toUpperCase())}
                placeholder="CÓDIGO DO ITEM..."
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none uppercase"
                autoFocus
              />
              <button type="submit" disabled={!codigoPuxar} className="w-full py-3 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 uppercase tracking-wider text-xs shadow-sm">Transferir para cá</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}