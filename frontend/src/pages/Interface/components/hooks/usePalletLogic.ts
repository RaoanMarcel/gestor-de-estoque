// usePalletLogic.ts
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import type { PalletData } from '../types/types';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

export function usePalletLogic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const LOCAL_STORAGE_KEY = `exclusoes_pallet_${id}`;

  // Estados Base
  const [pallet, setPallet] = useState<PalletData | null>(null);
  const [acao, setAcao] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [codigoBipado, setCodigoBipado] = useState('');
  const [mensagemStatus, setMensagemStatus] = useState({ texto: '', erro: false });

  // Estados de Transferência e Lote
  const [isModoTransferencia, setIsModoTransferencia] = useState(false);
  const [itensParaTransferir, setItensParaTransferir] = useState<string[]>([]);
  const [palletsDestino, setPalletsDestino] = useState<PalletData[]>([]);
  const [exibirModalDestino, setExibirModalDestino] = useState(false);
  const [carregandoDestinos, setCarregandoDestinos] = useState(false);
  
  const [carregandoRetriagem, setCarregandoRetriagem] = useState(false);
  const [qtdEtiquetas, setQtdEtiquetas] = useState<number>(1);

  // --- NOVOS ESTADOS (Cache Local & Modal de Confirmação) ---
  const [exclusoesPendentes, setExclusoesPendentes] = useState<string[]>(() => {
    const salvo = localStorage.getItem(LOCAL_STORAGE_KEY);
    return salvo ? JSON.parse(salvo) : [];
  });
  const [exibirModalExclusaoLote, setExibirModalExclusaoLote] = useState(false);
  const [rotaDestinoPendente, setRotaDestinoPendente] = useState<string | null>(null);

  const inputBipRef = useRef<HTMLInputElement>(null);

  const manterFocoNoInput = () => { inputBipRef.current?.focus(); };

  // Sincronizar exclusões pendentes com o LocalStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(exclusoesPendentes));
  }, [exclusoesPendentes, LOCAL_STORAGE_KEY]);

  // --- INTEGRAÇÃO WEBSOCKET (Socket.io) ---
  useEffect(() => {
    if (!id) return;

    // Substitua pela URL correta do seu backend se necessário
    const socket: Socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3000');

    // Entra na sala específica deste pallet
    socket.emit('join_pallet_room', { palletId: id });

    // Escuta atualizações vindas de outros operadores
    socket.on('pallet_updated', (data: { palletId: string }) => {
      if (String(data.palletId) === String(id)) {
        buscarDadosPallet();
      }
    });

    return () => {
      socket.off('pallet_updated');
      socket.disconnect();
    };
  }, [id]);

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

  // --- NOVAS FUNÇÕES: CONTROLE DO FLUXO OPERACIONAL DE EXCLUSÃO ---
  
  // Função para a "setinha" do front: desfaz a intenção de exclusão local
  const handleDesfazerExclusaoItem = (codigoItem: string) => {
    setExclusoesPendentes(prev => prev.filter(c => c !== codigoItem));
    tocarSom('ENTRADA');
    setMensagemStatus({ texto: `Exclusão de ${codigoItem} desfeita localmente.`, erro: false });
  };

  // Envio em lote definitivo para a API
  const handleConfirmarExclusaoEmLote = async () => {
    if (exclusoesPendentes.length === 0) return;
    try {
      setMensagemStatus({ texto: 'Processando baixa no estoque...', erro: false });
      
      // Enviando todos de uma vez para o backend
      await api.post('/pallets/bipar-lote', { 
        palletId: id, 
        codigosItens: exclusoesPendentes, 
        acao: 'SAIDA' 
      });

      tocarSom('SAIDA');
      setMensagemStatus({ texto: `${exclusoesPendentes.length} itens removidos definitivamente!`, erro: false });
      
      // Limpa os caches e fecha modal
      setExclusoesPendentes([]);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setExibirModalExclusaoLote(false);
      
      await buscarDadosPallet();

      // Se o usuário clicou para sair da tela, conclui a navegação após salvar
      if (rotaDestinoPendente) {
        navigate(rotaDestinoPendente);
      }
    } catch (error: any) {
      tocarSom('ERRO');
      setMensagemStatus({ texto: error.response?.data?.error || 'Erro crítico ao salvar lote.', erro: true });
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

  // Interceptador customizado para quando clicar em botões como "Voltar para o Galpão"
  const handleTentarSairDaTela = (rotaDestino: string) => {
    if (exclusoesPendentes.length > 0) {
      setRotaDestinoPendente(rotaDestino);
      setExibirModalExclusaoLote(true);
    } else {
      navigate(rotaDestino);
    }
  };

  // --- SUBMIT DE BIPAGEM REFORMULADO ---
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

    if (acao === 'SAIDA') {
      const itemExisteNoPallet = pallet?.produtos.some(p => p.codigoItem === codigoLimpo);
      
      // Verifica se o item já não está na fila temporária de exclusão
      if (exclusoesPendentes.includes(codigoLimpo)) {
        tocarSom('ERRO');
        setMensagemStatus({ texto: `O item "${codigoLimpo}" já está na fila de exclusão temporária!`, erro: true });
        setCodigoBipado('');
        return;
      }

      if (!itemExisteNoPallet) {
        tocarSom('ERRO');
        setMensagemStatus({ texto: `O item "${codigoLimpo}" não consta neste pallet para dar saída!`, erro: true });
        setCodigoBipado('');
        return;
      }

      // --- SUCESSO FLUIDO: Adiciona direto na fila do cache sem travar a UI ---
      setExclusoesPendentes(prev => [...prev, codigoLimpo]);
      tocarSom('SAIDA');
      setMensagemStatus({ texto: `Fila: ${codigoLimpo} pronto para baixa.`, erro: false });
      setCodigoBipado('');
    }
  };

  // Fluxo de geração sequencial múltiplo
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
        if (!codigoGerado) throw new Error('O servidor não retornou o código gerado.');
        codigosGerados.push(codigoGerado);
      }

      const { imprimirEtiquetasRetriagemLote } = await import('../utils/imprimirEtiqueta');
      imprimirEtiquetasRetriagemLote(codigosGerados);

      tocarSom('ENTRADA');
      setMensagemStatus({ 
        texto: `${qtdEtiquetas} etiqueta(s) gerada(s) e enviada(s) para a fila de impressão.`, 
        erro: false 
      });
      
      await buscarDadosPallet();
    } catch (error: any) {
      tocarSom('ERRO');
      setMensagemStatus({ 
        texto: error.response?.data?.error || 'Erro operacional ao processar lote sequencial.', 
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
      setMensagemStatus({ texto: `Todos os ${todosOsCodigos.length} itens do pallet foram selecionados de uma vez.`, erro: false });
    }
  };

  const handleFinalizerColetaTransferencia = async () => {
    if (itensParaTransferir.length === 0) {
      toast.error("Nenhuma triagem foi selecionada para transferência.");
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
      toast.error("Erro ao carregar a malha de pallets destino.");
    } finally {
      setCarregandoDestinos(false);
    }
  };

  const handleLancarAoRMA = async () => {
    if (itensParaTransferir.length === 0) {
      toast.error("Nenhuma triagem foi selecionada para enviar ao RMA.");
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
      toast.success(response.data.mensagem || "Transferência em lote concluída!");
      setIsModoTransferencia(false);
      setItensParaTransferir([]);
      setExibirModalDestino(false);
      buscarDadosPallet();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro crítico operacional ao transferir lote.");
    }
  };

  // Mantido para remoção pontual via clique direto na tabela (se necessário)
  const handleExcluirItemLinha = async (codigoItem: string) => {
    if (!window.confirm(`Deseja remover a triagem ${codigoItem} deste pallet?`)) return;
    try {
      await api.post('/pallets/bipar', { palletId: id, codigoItem, acao: 'SAIDA' });
      tocarSom('SAIDA'); 
      buscarDadosPallet();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao remover item.');
    }
  };

  // Filtragem visual dos produtos ativos (remove os que já estão na fila de exclusão)
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
    
    // Novas exportações para a UI mapear
    handleDesfazerExclusaoItem,
    handleConfirmarExclusaoEmLote,
    handleDescartarExclusoesCache,
    handleTentarSairDaTela
  };
}