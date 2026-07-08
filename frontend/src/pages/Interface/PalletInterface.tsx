import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';

interface Produto {
  id: number;
  codigoItem: string;
  bipadoEm: string;
}

interface PalletData {
  id: number;
  numero: string;
  rua?: string;
  estrutura?: string;
  nivel?: string;
  tipo: string; // ✨ ADICIONADO: Propriedade mapeada para identificar a finalidade
  produtos: Produto[];
}

export default function PalletInterface() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pallet, setPallet] = useState<PalletData | null>(null);
  const [acao, setAcao] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [codigoBipado, setCodigoBipado] = useState('');
  const [mensagemStatus, setMensagemStatus] = useState({ texto: '', erro: false });

  // Estados de controle do fluxo de transferência assistida
  const [isModoTransferencia, setIsModoTransferencia] = useState(false);
  const [itensParaTransferir, setItensParaTransferir] = useState<string[]>([]);
  const [palletsDestino, setPalletsDestino] = useState<PalletData[]>([]);
  const [exibirModalDestino, setExibirModalDestino] = useState(false);
  const [carregandoDestinos, setCarregandoDestinos] = useState(false);

  const inputBipRef = useRef<HTMLInputElement>(null);

  useEffect(() => { buscarDadosPallet(); }, [id]);
  useEffect(() => { manterFocoNoInput(); }, [acao, pallet, isModoTransferencia]);

  const buscarDadosPallet = async () => {
    try {
      const response = await api.get(`/pallets/${id}`);
      setPallet(response.data);
    } catch {
      setMensagemStatus({ texto: 'Erro ao conectar com o servidor.', erro: true });
    }
  };

  const manterFocoNoInput = () => { inputBipRef.current?.focus(); };

  // Fluxo unificado de submit de bipagem (Entrada, Saída Interceptadora e Captura do Lote)
  const handleBipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codigoLimpo = codigoBipado.trim();
    if (!codigoLimpo) return;

    // 🔵 MODO REMANEJAMENTO ATIVO:
    if (isModoTransferencia) {
      const itemPertenceAoPallet = pallet?.produtos.some(p => p.codigoItem === codigoLimpo);

      if (itemPertenceAoPallet) {
        setItensParaTransferir(prev => {
          if (prev.includes(codigoLimpo)) return prev;
          return [...prev, codigoLimpo];
        });
        tocarSom('ENTRADA');
        setMensagemStatus({ texto: `Item ${codigoLimpo} adicionado ao lote de envio.`, erro: false });
      } else {
        tocarSom('ERRO');
        setMensagemStatus({ texto: `O item "${codigoLimpo}" não pertence a este endereço!`, erro: true });
      }
      setCodigoBipado('');
      return;
    }

    // 📥 MODO ENTRADA TRADICIONAL:
    if (acao === 'ENTRADA') {
      try {
        setMensagemStatus({ texto: '', erro: false });
        const response = await api.post('/pallets/bipar', { palletId: id, codigoItem: codigoLimpo, acao: 'ENTRADA' });
        tocarSom('ENTRADA'); 
        setMensagemStatus({ texto: response.data.mensagem || 'Operação realizada!', erro: false });
        setCodigoBipado('');
        buscarDadosPallet();
      } catch (error: any) {
        tocarSom('ERRO'); 
        setMensagemStatus({ texto: error.response?.data?.error || 'Erro ao processar bipagem.', erro: true });
        setCodigoBipado('');
      }
      return;
    }

    // 📤 MODO SAÍDA INTERCEPTADOR DE SEGURANÇA:
    if (acao === 'SAIDA') {
      const itemExisteNoPallet = pallet?.produtos.some(p => p.codigoItem === codigoLimpo);

      if (!itemExisteNoPallet) {
        tocarSom('ERRO');
        setMensagemStatus({ texto: `O item "${codigoLimpo}" não consta neste pallet para dar saída!`, erro: true });
        setCodigoBipado('');
        return;
      }

      // 🧠 Intercepta e sugere a transferência preventiva antes de deletar
      const desejaApenasSaida = window.confirm(
        `Você bipou a SAÍDA da triagem ${codigoLimpo}.\n\n` +
        `-> Clique em [OK] para REMOVER DE VEZ do estoque.\n` +
        `-> Clique em [CANCELAR] se quiser TRANSFERIR para outro pallet.`
      );

      // Se o operador cancelar a remoção, ativa o modo azul e seleciona a caixa na hora!
      if (!desejaApenasSaida) {
        setIsModoTransferencia(true);
        setItensParaTransferir([codigoLimpo]);
        tocarSom('ENTRADA');
        setMensagemStatus({ texto: `Modo transferência ativado! Item ${codigoLimpo} reservado para envio.`, erro: false });
        setCodigoBipado('');
        return;
      }

      // Se clicar em OK, prossegue deletando normalmente
      try {
        setMensagemStatus({ texto: '', erro: false });
        const response = await api.post('/pallets/bipar', { palletId: id, codigoItem: codigoLimpo, acao: 'SAIDA' });
        tocarSom('SAIDA'); 
        setMensagemStatus({ texto: response.data.mensagem || 'Operação realizada!', erro: false });
        setCodigoBipado('');
        buscarDadosPallet();
      } catch (error: any) {
        tocarSom('ERRO'); 
        setMensagemStatus({ texto: error.response?.data?.error || 'Erro ao processar bipagem.', erro: true });
        setCodigoBipado('');
      }
    }
  };

  // 🔄 RECURSO INTELIGENTE: Liga / Desliga seleção completa de itens (Toggle)
  const handleAdicionarTodoOPalletNoLote = () => {
    if (!pallet || pallet.produtos.length === 0) {
      alert("Este pallet já está vazio!");
      return;
    }

    if (itensParaTransferir.length === pallet.produtos.length) {
      setItensParaTransferir([]);
      setMensagemStatus({ texto: 'Seleção limpa.', erro: false });
    } else {
      const todosOsCodigos = pallet.produtos.map(p => p.codigoItem);
      setItensParaTransferir(todosOsCodigos);
      setMensagemStatus({ texto: `Todos os ${todosOsCodigos.length} itens do pallet foram selecionados de uma vez.`, erro: false });
    }
  };

  // Acicionado ao fechar a coleta clicando no botão verde OK
  const handleFinalizerColetaTransferencia = async () => {
    if (itensParaTransferir.length === 0) {
      alert("Nenhuma triagem foi selecionada para transferência.");
      return;
    }

    const perguntar = window.confirm(`Foi feito tudo? Deseja prosseguir com a transferência em lote de ${itensParaTransferir.length} itens?`);
    if (!perguntar) return;

    setCarregandoDestinos(true);
    try {
      const response = await api.get('/pallets');
      const filtrados = response.data.filter((p: any) => Number(p.id) !== Number(id));
      setPalletsDestino(filtrados);
      setExibirModalDestino(true);
    } catch {
      alert("Erro ao carregar a malha de pallets destino.");
    } finally {
      setCarregandoDestinos(false);
    }
  };

  // 🚀 NOVO RECURSO: Dispara a requisição de lote para o limbo do RMA
  const handleLancarAoRMA = async () => {
    if (itensParaTransferir.length === 0) {
      alert("Nenhuma triagem foi selecionada para enviar ao RMA.");
      return;
    }

    const confirmarRMA = window.confirm(
      `ATENÇÃO: Você está prestes a dar baixa definitiva em ${itensParaTransferir.length} itens do estoque físico e enviá-los para o fluxo lógico de RMA.\n\n` +
      `Esta ação limpará estes itens deste pallet. Deseja prosseguir?`
    );
    if (!confirmarRMA) return;

    try {
      await api.post('/pallets/enviar-rma', {
        codigosItens: itensParaTransferir,
        numeroPalletOrigem: pallet?.numero
      });

      alert(`Sucesso! ${itensParaTransferir.length} itens lançados ao RMA.`);
      setIsModoTransferencia(false);
      setItensParaTransferir([]);
      buscarDadosPallet();
    } catch (error: any) {
      alert(error.response?.data?.error || "Erro ao lançar itens ao RMA.");
    }
  };

  // Dispara a transferência massiva em lote para a API
  const handleConfirmarDestinoFinal = async (numeroPalletDestino: string) => {
    try {
      const response = await api.put('/pallets/transferir-lote', {
        codigosItens: itensParaTransferir,
        numeroPalletDestino: numeroPalletDestino
      });

      alert(response.data.mensagem || "Transferência em lote concluída!");
      
      setIsModoTransferencia(false);
      setItensParaTransferir([]);
      setExibirModalDestino(false);
      buscarDadosPallet();
    } catch (error: any) {
      alert(error.response?.data?.error || "Erro crítico operacional ao transferir lote.");
    }
  };

  const handleExcluirItemLinha = async (codigoItem: string) => {
    if (!window.confirm(`Deseja remover a triagem ${codigoItem} deste pallet?`)) return;
    try {
      await api.post('/pallets/bipar', { palletId: id, codigoItem, acao: 'SAIDA' });
      tocarSom('SAIDA'); 
      buscarDadosPallet();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao remover item.');
    }
  };

  const tocarSom = (tipo: 'ENTRADA' | 'SAIDA' | 'ERRO') => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (tipo === 'ENTRADA') {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.08);
    } else if (tipo === 'SAIDA') {
      [0, 0.06].forEach((delay) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(750, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.05);
      });
    } else if (tipo === 'ERRO') {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'square'; osc.frequency.setValueAtTime(200, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.35);
    }
  };

  if (!pallet) {
    return (
      <div className="min-h-screen bg-[#F6F8FC] flex items-center justify-center text-slate-400 text-xs font-mono tracking-[0.2em] uppercase">
        Carregando dados do Pallet...
      </div>
    );
  }

  const isEntrada = acao === 'ENTRADA';
  const totalUnidades = pallet.produtos.length;

  return (
    <div className="relative min-h-screen bg-[#F6F8FC] text-slate-800 antialiased overflow-hidden" onClick={manterFocoNoInput}>
      {/* GRADIENTES RADIAIS DE FUNDO */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.14),transparent_70%)] blur-3xl" />
        <div className="absolute top-1/3 -right-52 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.10),transparent_70%)] blur-3xl" />
        <div className="absolute -bottom-52 left-1/4 w-[650px] h-[650px] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.10),transparent_70%)] blur-3xl" />
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
              </span>
            </div>
          </div>
          
          {/* BOTÕES DINÂMICOS DO HEADER */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {!isModoTransferencia ? (
              <button
                onClick={() => {
                  setIsModoTransferencia(true);
                  setMensagemStatus({ texto: 'Modo transferência ativado! Bipe os itens ou clique em Transferir Tudo.', erro: false });
                }}
                className="px-4 h-9 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-600 text-xs font-semibold tracking-wider uppercase transition-all"
              >
                🔄 Transferir Lote
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAdicionarTodoOPalletNoLote}
                  className="px-3 h-9 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold tracking-wider uppercase transition-all"
                >
                  {pallet && itensParaTransferir.length === pallet.produtos.length 
                    ? '🔲 Desmarcar Tudo' 
                    : '📦 Transferir Tudo'}
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
              <div className="p-4 rounded-xl bg-blue-600 text-white text-center font-semibold text-xs uppercase tracking-widest shadow-[0_10px_30px_-12px_rgba(37,99,235,0.4)] animate-pulse">
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
                {/* Botão de Transferência Comum para Mover Posições Físicas */}
                <button
                  type="button"
                  onClick={handleFinalizerColetaTransferencia}
                  disabled={carregandoDestinos}
                  className="flex-1 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wider uppercase shadow-[0_10px_30px_-12px_rgba(16,185,129,0.4)] transition-all"
                >
                  {carregandoDestinos ? 'Aguarde...' : `✓ OK - Mover Posição (${itensParaTransferir.length})`}
                </button>

                {/* 🚀 BOTÃO EXCLUSIVO DE RMA: Só renderiza se o tipo do pallet no banco for 'DEFEITO' */}
                {pallet.tipo === 'DEFEITO' && (
                  <button
                    type="button"
                    onClick={handleLancarAoRMA}
                    className="flex-1 py-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs tracking-wider uppercase shadow-[0_10px_30px_-12px_rgba(244,63,94,0.4)] transition-all"
                  >
                    🚀 Lançar ao RMA ({itensParaTransferir.length} un.)
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
                        ? 'bg-blue-50/90 border-blue-300 shadow-[0_4px_15px_-5px_rgba(59,130,246,0.2)]' 
                        : 'bg-white border-slate-200 hover:border-blue-500/40 hover:shadow-[0_8px_20px_-12px_rgba(37,99,235,0.25)]'
                    }`}
                  >
                    <div className={`absolute top-0 left-3 h-[2px] w-8 rounded-b-full ${isItemCapturadoLote ? 'bg-blue-500' : 'bg-blue-500/70'}`} />
                    <div className="font-mono mt-1">
                      <span className={`block font-semibold text-sm tracking-tight ${isItemCapturadoLote ? 'text-blue-900' : 'text-slate-800'}`}>
                        {prod.codigoItem}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                        {new Date(prod.bipadoEm).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded uppercase tracking-wider border ${
                        isItemCapturadoLote 
                          ? 'bg-blue-600 text-white border-blue-700 shadow-sm' 
                          : 'bg-blue-50/50 text-blue-600 border border-blue-100'
                      }`}>
                        {isItemCapturadoLote ? 'Pronto' : 'Item'}
                      </span>
                      {!isModoTransferencia && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleExcluirItemLinha(prod.codigoItem); }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Remover triagem"
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
            <div className="relative bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.3)] overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent_70%)] blur-2xl pointer-events-none" />

              <div className="relative flex justify-between items-center pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)]" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">Mover {itensParaTransferir.length} Itens Para:</h3>
                </div>
                <button onClick={() => setExibirModalDestino(false)} className="text-slate-400 hover:text-slate-700 transition-colors text-sm p-1 h-6 w-6 rounded hover:bg-slate-100">✕</button>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Selecione abaixo a posição física final para onde a carga coletada será transferida no sistema:
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1 pt-1">
                {palletsDestino.map((dest) => {
                  const lotacaoAtual = dest.produtos?.length || 0;
                  const restamVagas = 140 - lotacaoAtual;
                  const isDestinoEsgotado = restamVagas <= 0;

                  return (
                    <button
                      key={dest.id} type="button" disabled={isDestinoEsgotado}
                      onClick={() => handleConfirmarDestinoFinal(dest.numero)}
                      className={`p-3 rounded-xl border text-center font-mono flex flex-col justify-between h-[76px] transition-all ${
                        isDestinoEsgotado
                          ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed opacity-50'
                          : 'bg-white border-slate-200 hover:border-blue-500/40 hover:bg-blue-50/30 hover:shadow-sm text-slate-800 group'
                      }`}
                    >
                      <span className="text-xs font-bold tracking-tight block truncate group-hover:text-blue-600 transition-colors">📦 {dest.numero}</span>
                      <span className="text-[9px] text-slate-400 font-sans block mt-1">{lotacaoAtual} / 140 un.</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 text-xs">
                <button type="button" onClick={() => setExibirModalDestino(false)} className="h-9 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg transition-colors">Voltar</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}