// src/pages/Interface/components/hooks/usePalletLogic.ts
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { PalletData } from '../types/types'; 
import api from '../../../../services/api'; 
import { useToast } from '../../../../contexts/toastContext';
import { useSocket } from '../../../../contexts/SocketContext'; 

export function usePalletLogic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { socket } = useSocket();

  const LOCAL_STORAGE_KEY = `exclusoes_pallet_${id}`;

  const [pallet, setPallet] = useState<PalletData | null>(null);
  const [acao, setAcao] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [codigoBipado, setCodigoBipado] = useState('');
  const [mensagemStatus, setMensagemStatus] = useState({ texto: '', erro: false });

  const [isModoTransferencia, setIsModoTransferencia] = useState(false);
  const [itensParaTransferir, setItensParaTransferir] = useState<string[]>([]);
  const [palletsDestino, setPalletsDestino] = useState<PalletData[]>([]);
  const [exibirModalDestino, setExibirModalDestino] = useState(false);
  const [carregandoDestinos, setCarregandoDestinos] = useState(false);
  
  const [carregandoRetriagem, setCarregandoRetriagem] = useState(false);
  const [qtdEtiquetas, setQtdEtiquetas] = useState<number>(1);

  const [exclusoesPendentes, setExclusoesPendentes] = useState<string[]>(() => {
    const salvo = localStorage.getItem(LOCAL_STORAGE_KEY);
    return salvo ? JSON.parse(salvo) : [];
  });
  const [exibirModalExclusaoLote, setExibirModalExclusaoLote] = useState(false);
  const [rotaDestinoPendente, setRotaDestinoPendente] = useState<string | null>(null);

  const inputBipRef = useRef<HTMLInputElement>(null);
  const manterFocoNoInput = () => { inputBipRef.current?.focus(); };

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(exclusoesPendentes));
  }, [exclusoesPendentes, LOCAL_STORAGE_KEY]);

  useEffect(() => {
    if (!id || !socket) return;

    // Entra na sala específica deste pallet
    socket.emit('subscribe:pallet', id);

    // Ouve mutações rápidas feitas por outros operadores
    const handlePalletUpdated = (payload: any) => {
      setPallet((prev) => {
        if (!prev) return prev;
        
        // Mutação Otimista Imutável (Não pesa o banco de dados)
        let novosProdutos = [...prev.produtos];
        
        if (payload.acao === 'ENTRADA' && payload.item) {
          novosProdutos.unshift(payload.item); // Adiciona no topo
        } else if (payload.acao === 'SAIDA' && payload.codigoItem) {
          novosProdutos = novosProdutos.filter(p => p.codigoItem !== payload.codigoItem);
        } else if (payload.acao === 'SAIDA_LOTE' && payload.codigosItens) {
          novosProdutos = novosProdutos.filter(p => !payload.codigosItens.includes(p.codigoItem));
        }

        // Incrementa a versão localmente para bater com a do banco
        return { ...prev, versao: (prev.versao || 1) + 1, produtos: novosProdutos };
      });
    };

    // Caso a mutação seja muito complexa, forçamos o refetch
    const handlePalletRefresh = () => { buscarDadosPallet(); };

    // Se outro operador apagar o pallet enquanto estamos aqui dentro
    const handlePalletDeleted = () => {
      toast.error('Alerta: Este pallet foi excluído da malha por outro operador.');
      navigate('/');
    };

    socket.on('pallet:updated', handlePalletUpdated);
    socket.on('pallet:refresh', handlePalletRefresh);
    socket.on('pallet:deleted', handlePalletDeleted);

    // Limpeza ao sair da tela
    return () => {
      socket.emit('unsubscribe:pallet', id);
      socket.off('pallet:updated', handlePalletUpdated);
      socket.off('pallet:refresh', handlePalletRefresh);
      socket.off('pallet:deleted', handlePalletDeleted);
    };
  }, [id, socket, navigate, toast]);

  useEffect(() => { buscarDadosPallet(); }, [id]);
  useEffect(() => { manterFocoNoInput(); }, [acao, pallet, isModoTransferencia, exclusoesPendentes]);

  const buscarDadosPallet = async () => {
    try {
      const response = await api.get(`/pallets/${id}`);
      setPallet(response.data);
    } catch {
      setMensagemStatus({ texto: 'Erro ao conectar com o servidor.', erro: true });
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

  const handleDesfazerExclusaoItem = (codigoItem: string) => {
    setExclusoesPendentes(prev => prev.filter(c => c !== codigoItem));
    tocarSom('ENTRADA');
    setMensagemStatus({ texto: `Exclusão de ${codigoItem} desfeita localmente.`, erro: false });
  };

  const handleConfirmarExclusaoEmLote = async () => {
    if (exclusoesPendentes.length === 0) return;
    try {
      setMensagemStatus({ texto: 'Processando baixa no estoque...', erro: false });
      
      // ✨ Passando a versão atual para o backend bloquear se houve concorrência
      await api.post('/pallets/bipar-lote', { 
        palletId: id, 
        codigosItens: exclusoesPendentes, 
        acao: 'SAIDA',
        versao: pallet?.versao 
      });

      tocarSom('SAIDA');
      setMensagemStatus({ texto: `${exclusoesPendentes.length} itens removidos definitivamente!`, erro: false });
      
      setExclusoesPendentes([]);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setExibirModalExclusaoLote(false);
      
      await buscarDadosPallet();

      if (rotaDestinoPendente) {
        navigate(rotaDestinoPendente);
      }
    } catch (error: any) {
      tocarSom('ERRO');
      const msgErro = error.response?.data?.error || 'Erro crítico ao salvar lote.';
      setMensagemStatus({ texto: msgErro, erro: true });
      if (error.response?.status === 409) await buscarDadosPallet(); // Recarrega se deu conflito
    }
  };

  const handleDescartarExclusoesCache = () => {
    setExclusoesPendentes([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setExibirModalExclusaoLote(false);
    setMensagemStatus({ texto: 'Exclusões descartadas. O estoque físico foi mantido intacto.', erro: false });
    if (rotaDestinoPendente) {
      navigate(rotaDestinoPendente);
    }
  };

  const handleTentarSairDaTela = (rotaDestino: string) => {
    if (exclusoesPendentes.length > 0) {
      setRotaDestinoPendente(rotaDestino);
      setExibirModalExclusaoLote(true);
    } else {
      navigate(rotaDestino);
    }
  };

  const handleBipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codigoLimpo = codigoBipado.trim();
    if (!codigoLimpo) return;

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

    if (acao === 'ENTRADA') {
      try {
        setMensagemStatus({ texto: '', erro: false });
        await api.post('/pallets/bipar', { palletId: id, codigoItem: codigoLimpo, acao: 'ENTRADA', versao: pallet?.versao });
        tocarSom('ENTRADA'); 
        setMensagemStatus({ texto: 'Operação realizada!', erro: false });
        setCodigoBipado('');
        buscarDadosPallet();
      } catch (error: any) {
        tocarSom('ERRO'); 
        setMensagemStatus({ texto: error.response?.data?.error || 'Erro ao processar bipagem.', erro: true });
        setCodigoBipado('');
        if (error.response?.status === 409) await buscarDadosPallet();
      }
      return;
    }

    if (acao === 'SAIDA') {
      const itemExisteNoPallet = pallet?.produtos.some(p => p.codigoItem === codigoLimpo);
      
      if (exclusoesPendentes.includes(codigoLimpo)) {
        tocarSom('ERRO');
        setMensagemStatus({ texto: `O item "${codigoLimpo}" já está na fila de exclusão!`, erro: true });
        setCodigoBipado('');
        return;
      }

      if (!itemExisteNoPallet) {
        tocarSom('ERRO');
        setMensagemStatus({ texto: `O item "${codigoLimpo}" não consta neste pallet!`, erro: true });
        setCodigoBipado('');
        return;
      }

      setExclusoesPendentes(prev => [...prev, codigoLimpo]);
      tocarSom('SAIDA');
      setMensagemStatus({ texto: `Fila: ${codigoLimpo} pronto para baixa.`, erro: false });
      setCodigoBipado('');
    }
  };

  const handleGerarEtiquetaRetriagem = async () => {
    setCarregandoRetriagem(true);
    setMensagemStatus({ texto: '', erro: false });
    
    try {
      const codigosGerados: string[] = [];
      for (let i = 0; i < qtdEtiquetas; i++) {
        const response = await api.post('/pallets/bipar', { 
          palletId: id, 
          acao: 'ENTRADA',
          gerarSequencial: true
        });

        const codigoGerado = response.data?.item?.codigoItem;
        if (!codigoGerado) throw new Error('O servidor não retornou o código.');
        codigosGerados.push(codigoGerado);
      }

      const { imprimirEtiquetasRetriagemLote } = await import('../utils/imprimirEtiqueta');
      imprimirEtiquetasRetriagemLote(codigosGerados);

      tocarSom('ENTRADA');
      setMensagemStatus({ 
        texto: `${qtdEtiquetas} etiqueta(s) gerada(s) e enviada(s) para impressão.`, 
        erro: false 
      });
      
      await buscarDadosPallet();
    } catch (error: any) {
      tocarSom('ERRO');
      setMensagemStatus({ 
        texto: error.response?.data?.error || 'Erro operacional.', 
        erro: true 
      });
    } finally {
      setCarregandoRetriagem(false);
    }
  };

  const handleAdicionarTodoOPalletNoLote = () => {
    if (!pallet || pallet.produtos.length === 0) {
      toast.error("Este pallet já está vazio!");
      return;
    }
    if (itensParaTransferir.length === pallet.produtos.length) {
      setItensParaTransferir([]);
      setMensagemStatus({ texto: 'Seleção limpa.', erro: false });
    } else {
      const todosOsCodigos = pallet.produtos.map(p => p.codigoItem);
      setItensParaTransferir(todosOsCodigos);
      setMensagemStatus({ texto: `Todos os ${todosOsCodigos.length} itens selecionados.`, erro: false });
    }
  };

  const handleFinalizerColetaTransferencia = async () => {
    if (itensParaTransferir.length === 0) {
      toast.error("Nenhuma triagem selecionada.");
      return;
    }

    const perguntar = await toast.confirm(`Deseja prosseguir com a transferência de ${itensParaTransferir.length} itens?`);
    if (!perguntar) return;

    setCarregandoDestinos(true);
    try {
      const response = await api.get('/pallets');
      const filtrados = response.data.filter((p: any) => Number(p.id) !== Number(id));
      setPalletsDestino(filtrados);
      setExibirModalDestino(true);
    } catch {
      toast.error("Erro ao carregar malha destino.");
    } finally {
      setCarregandoDestinos(false);
    }
  };

  const handleLancarAoRMA = async () => {
    if (itensParaTransferir.length === 0) {
      toast.error("Nenhum item selecionado para RMA.");
      return;
    }
    
    const confirmarRMA = await toast.confirm(
      `ATENÇÃO: Você dará baixa definitiva em ${itensParaTransferir.length} itens e os enviará ao RMA.\nDeseja prosseguir?`
    );
    if (!confirmarRMA) return;

    try {
      await api.post('/pallets/enviar-rma', {
        codigosItens: itensParaTransferir,
        numeroPalletOrigem: pallet?.numero
      });
      toast.success(`Sucesso! ${itensParaTransferir.length} itens lançados ao RMA.`);
      setIsModoTransferencia(false);
      setItensParaTransferir([]);
      buscarDadosPallet();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro ao lançar itens ao RMA.");
    }
  };

  const handleConfirmarDestinoFinal = async (numeroPalletDestino: string) => {
    try {
      const response = await api.put('/pallets/transferir-lote', {
        codigosItens: itensParaTransferir,
        numeroPalletDestino: numeroPalletDestino
      });
      toast.success(response.data.mensagem || "Transferência concluída!");
      setIsModoTransferencia(false);
      setItensParaTransferir([]);
      setExibirModalDestino(false);
      buscarDadosPallet();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro ao transferir lote.");
    }
  };

  const handleExcluirItemLinha = async (codigoItem: string) => {
    const confirmExclusao = await toast.confirm(`Deseja remover a triagem ${codigoItem} deste pallet?`);
    if (!confirmExclusao) return;

    try {
      await api.post('/pallets/bipar', { palletId: id, codigoItem, acao: 'SAIDA', versao: pallet?.versao });
      tocarSom('SAIDA'); 
      buscarDadosPallet();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao remover item.');
      if (error.response?.status === 409) await buscarDadosPallet();
    }
  };

  const produtosFiltradosVisuais = pallet
    ? pallet.produtos.filter(p => !exclusoesPendentes.includes(p.codigoItem))
    : [];

  return {
    pallet: pallet ? { ...pallet, produtos: produtosFiltradosVisuais } : null,
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
    isEntrada: acao === 'ENTRADA',
    totalUnidades: produtosFiltradosVisuais.length,
    navigate,
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
    handleTentarSairDaTela
  };
}