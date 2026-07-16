// src/pages/Interface/PalletInterface.tsx
import { usePalletLogic } from "./components/hooks/usePalletLogic";
import PalletHeader from "./components/parts/PalletHeader";
import BipagemPanel from "./components/parts/BipagemPanel";
import ConteudoAtualPanel from "./components/parts/ConteudoAtualPanel";
import ModalDestino from "./components/parts/ModalDestino";

export default function PalletInterface() {
  const {
    pallet,
    activeUsers,
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

  // MÁSCARA DINÂMICA DE BIPAGEM
  const handleCodigoBipadoComMascara = (valorRecebido: string) => {
    // Verifica qual é o tipo do pallet atual
    const tipo = pallet?.tipo?.toUpperCase() || '';
    const isRetriagemOuNovo = tipo.includes('RETRIAGEM') || tipo.includes('NOVO');

    if (isRetriagemOuNovo) {
      // --- REGRA PARA RETRIAGEM E NOVO (P-XXXXX) ---
      // 1. Força maiúscula e remove letras que não sejam P e símbolos que não sejam -
      let valor = valorRecebido.toUpperCase().replace(/[^P\-0-9]/g, '');

      // 2. Regras de prefixo
      if (valor.length > 0 && valor[0] !== 'P') return; // Tem que começar com P
      if (valor.length > 1 && valor[1] !== '-') return; // O segundo tem que ser o hífen
      
      // 3. UX: Se digitou 'P', já auto-completa com o hífen para ajudar
      if (valor === 'P') valor = 'P-';

      // 4. Trava um limite máximo de segurança (ex: 10 caracteres)
      if (valor.length > 10) valor = valor.substring(0, 10);

      setCodigoBipado(valor);

    } else {
      // --- REGRA PARA PADRÃO E DEFEITO (000XXXXX) ---
      let valor = valorRecebido.replace(/\D/g, '');

      if (valor.length > 8) valor = valor.substring(0, 8);
      if (valor.length === 1 && valor !== '0') return;
      if (valor.length === 2 && valor !== '00') return;
      if (valor.length >= 3 && !valor.startsWith('000')) return;

      setCodigoBipado(valor);
    }
  };

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
          activeUsers={activeUsers}
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
            // MÁSCARA INTELIGENTE PASSADA AQUI
            setCodigoBipado={handleCodigoBipadoComMascara}
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