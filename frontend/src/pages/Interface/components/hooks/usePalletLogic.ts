// src/pages/Interface/components/hooks/usePalletLogic.ts
import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { PalletData } from '../types/types'; 
import api from '../../../../services/api'; 
import { useToast } from '../../../../contexts/toastContext';
import { useSocket } from '../../../../contexts/SocketContext'; 

let globalAudioContext: AudioContext | null = null;
const getAudioContext = () => {
  if (!globalAudioContext) {
    globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (globalAudioContext.state === 'suspended') {
    globalAudioContext.resume();
  }
  return globalAudioContext;
};

export function usePalletLogic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { socket } = useSocket();

  const LOCAL_STORAGE_KEY = `exclusoes_pallet_${id}`;

  const [pallet, setPallet] = useState<PalletData | null>(null);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  
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

  // 🚀 NOVOS ESTADOS DA RASTREABILIDADE
  const [exibirModalRastreabilidade, setExibirModalRastreabilidade] = useState(false);
  const [itemRastreabilidade, setItemRastreabilidade] = useState<string>('');
  const [historicoData, setHistoricoData] = useState<any[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  const inputBipRef = useRef<HTMLInputElement>(null);
  const manterFocoNoInput = () => { inputBipRef.current?.focus(); };

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(exclusoesPendentes));
  }, [exclusoesPendentes, LOCAL_STORAGE_KEY]);

  useEffect(() => {
    if (!id || !socket) return;

    socket.emit('subscribe:pallet', id);

    const handlePalletUpdated = (payload: any) => {
      setPallet((prev) => {
        if (!prev) return prev;
        
        let novosProdutos = [...prev.produtos];
        
        if (payload.acao === 'ENTRADA' && payload.item) {
          novosProdutos.unshift(payload.item);
        } else if (payload.acao === 'SAIDA' && payload.codigoItem) {
          novosProdutos = novosProdutos.filter(p => String(p.codigoItem) !== String(payload.codigoItem));
        } else if (payload.acao === 'SAIDA_LOTE' && payload.codigosItens) {
          novosProdutos = novosProdutos.filter(p => !payload.codigosItens.includes(p.codigoItem));
        }

        return { ...prev, versao: (prev.versao || 1) + 1, produtos: novosProdutos };
      });
    };

    const handlePalletRefresh = () => { buscarDadosPallet(); };
    const handlePalletDeleted = () => {
      toast.error('Alerta: Este pallet foi excluído da malha.');
      navigate('/');
    };
    
    const handlePresenceUpdate = (data: { users: string[] }) => {
      setActiveUsers(data.users);
    };

    socket.on('pallet:updated', handlePalletUpdated);
    socket.on('pallet:refresh', handlePalletRefresh);
    socket.on('pallet:deleted', handlePalletDeleted);
    socket.on('presence:room_update', handlePresenceUpdate);

    return () => {
      socket.emit('unsubscribe:pallet', id);
      socket.off('pallet:updated', handlePalletUpdated);
      socket.off('pallet:refresh', handlePalletRefresh);
      socket.off('pallet:deleted', handlePalletDeleted);
      socket.off('presence:room_update', handlePresenceUpdate);
    };
  }, [id, socket, navigate, toast]);

  useEffect(() => { buscarDadosPallet(); }, [id]);
  useEffect(() => { manterFocoNoInput(); }, [acao, pallet, isModoTransferencia, exclusoesPendentes, exibirModalRastreabilidade]);

  const buscarDadosPallet = async () => {
    try {
      const response = await api.get(`/pallets/${id}`);
      setPallet(response.data);
    } catch {
      setMensagemStatus({ texto: 'Erro ao conectar com o servidor.', erro: true });
    }
  };

  const tocarSom = (tipo: 'ENTRADA' | 'SAIDA' | 'ERRO') => {
    const ctx = getAudioContext();
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

  // 🚀 NOVA FUNÇÃO DA RASTREABILIDADE
  const handleAbrirRastreabilidade = async (codigoItem: string) => {
    setItemRastreabilidade(codigoItem);
    setExibirModalRastreabilidade(true);
    setCarregandoHistorico(true);
    try {
      const response = await api.get(`/historico/${codigoItem}`);
      setHistoricoData(response.data);
    } catch (error) {
      toast.error("Erro ao buscar a linha do tempo do item.");
      setExibirModalRastreabilidade(false);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  //... O resto das funções continuam as mesmas: handleDesfazerExclusaoItem, etc ...

  const handleDesfazerExclusaoItem = (codigoItem: string) => {
    setExclusoesPendentes(prev => prev.filter(c => c !== codigoItem));
    tocarSom('ENTRADA');
    setMensagemStatus({ texto: `Exclusão desfeita.`, erro: false });
  };

  const handleConfirmarExclusaoEmLote = async () => {
    if (exclusoesPendentes.length === 0) return;
    try {
      setMensagemStatus({ texto: 'Processando baixa...', erro: false });
      await api.post('/pallets/bipar-lote', { palletId: id, codigosItens: exclusoesPendentes, acao: 'SAIDA', versao: pallet?.versao });
      tocarSom('SAIDA');
      setMensagemStatus({ texto: `${exclusoesPendentes.length} itens removidos!`, erro: false });
      setExclusoesPendentes([]);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setExibirModalExclusaoLote(false);
      await buscarDadosPallet();
      if (rotaDestinoPendente) navigate(rotaDestinoPendente);
    } catch (error: any) {
      tocarSom('ERRO');
      setMensagemStatus({ texto: error.response?.data?.error || 'Erro.', erro: true });
      if (error.response?.status === 409) await buscarDadosPallet(); 
    }
  };

  const handleDescartarExclusoesCache = () => {
    setExclusoesPendentes([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setExibirModalExclusaoLote(false);
    if (rotaDestinoPendente) navigate(rotaDestinoPendente);
  };

  const handleTentarSairDaTela = (rotaDestino: string) => {
    if (exclusoesPendentes.length > 0) { setRotaDestinoPendente(rotaDestino); setExibirModalExclusaoLote(true); }
    else navigate(rotaDestino);
  };

  const handleBipSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const codigoLimpo = codigoBipado.trim();
    if (!codigoLimpo) return;

    const tipoPallet = pallet?.tipo?.toUpperCase() || '';
    const isRetriagemOuNovo = tipoPallet.includes('RETRIAGEM') || tipoPallet.includes('NOVO');

    if (!isRetriagemOuNovo) {
      const padraoEsperado = /^000\d{5}$/;
      if (!padraoEsperado.test(codigoLimpo)) {
        tocarSom('ERRO');
        setMensagemStatus({ 
          texto: 'Erro! O código deve iniciar obrigatoriamente com 000 e conter 8 dígitos.', 
          erro: true 
        });
        setCodigoBipado('');
        return;
      }
    }

    if (isModoTransferencia) {
      if (pallet?.produtos.some(p => p.codigoItem === codigoLimpo)) {
        setItensParaTransferir(prev => prev.includes(codigoLimpo) ? prev : [...prev, codigoLimpo]);
        tocarSom('ENTRADA'); setMensagemStatus({ texto: `Item adicionado ao lote.`, erro: false });
      } else { tocarSom('ERRO'); setMensagemStatus({ texto: `Item não pertence!`, erro: true }); }
      setCodigoBipado(''); return;
    }
    if (acao === 'ENTRADA') {
      try {
        await api.post('/pallets/bipar', { palletId: id, codigoItem: codigoLimpo, acao: 'ENTRADA', versao: pallet?.versao });
        tocarSom('ENTRADA'); setMensagemStatus({ texto: 'Sucesso!', erro: false }); setCodigoBipado('');
        buscarDadosPallet();
      } catch (error: any) {
        tocarSom('ERRO'); setMensagemStatus({ texto: error.response?.data?.error || 'Erro.', erro: true }); setCodigoBipado('');
        if (error.response?.status === 409) await buscarDadosPallet();
      }
      return;
    }
    if (acao === 'SAIDA') {
      if (exclusoesPendentes.includes(codigoLimpo)) { tocarSom('ERRO'); setMensagemStatus({ texto: `Já na fila!`, erro: true }); setCodigoBipado(''); return; }
      if (!pallet?.produtos.some(p => p.codigoItem === codigoLimpo)) { tocarSom('ERRO'); setMensagemStatus({ texto: `Não consta!`, erro: true }); setCodigoBipado(''); return; }
      setExclusoesPendentes(prev => [...prev, codigoLimpo]); tocarSom('SAIDA'); setMensagemStatus({ texto: `Fila pronta.`, erro: false }); setCodigoBipado('');
    }
  };

  const handleGerarEtiquetaRetriagem = async () => {
    setCarregandoRetriagem(true);
    try {
      const codigosGerados: string[] = [];
      for (let i = 0; i < qtdEtiquetas; i++) {
        const response = await api.post('/pallets/bipar', { palletId: id, acao: 'ENTRADA', gerarSequencial: true });
        codigosGerados.push(response.data?.item?.codigoItem);
      }
      const { imprimirEtiquetasRetriagemLote } = await import('../utils/imprimirEtiqueta');
      imprimirEtiquetasRetriagemLote(codigosGerados);
      tocarSom('ENTRADA'); setMensagemStatus({ texto: `Etiquetas geradas.`, erro: false });
      await buscarDadosPallet();
    } catch (error: any) { tocarSom('ERRO'); setMensagemStatus({ texto: error.response?.data?.error || 'Erro.', erro: true }); } finally { setCarregandoRetriagem(false); }
  };

  const handleAdicionarTodoOPalletNoLote = () => {
    if (!pallet || pallet.produtos.length === 0) return toast.error("Vazio!");
    if (itensParaTransferir.length === pallet.produtos.length) { setItensParaTransferir([]); setMensagemStatus({ texto: 'Seleção limpa.', erro: false }); }
    else { setItensParaTransferir(pallet.produtos.map(p => p.codigoItem)); setMensagemStatus({ texto: `Tudo selecionado.`, erro: false }); }
  };

  const handleFinalizerColetaTransferencia = async () => {
    if (itensParaTransferir.length === 0) return toast.error("Nenhuma triagem.");
    if (!await toast.confirm(`Prosseguir com transferência?`)) return;
    setCarregandoDestinos(true);
    try {
      const response = await api.get('/pallets');
      setPalletsDestino(response.data.filter((p: any) => Number(p.id) !== Number(id))); setExibirModalDestino(true);
    } catch { toast.error("Erro."); } finally { setCarregandoDestinos(false); }
  };

  const handleLancarAoRMA = async () => {
    if (itensParaTransferir.length === 0) return toast.error("Vazio.");
    if (!await toast.confirm(`Lançar ao RMA?`)) return;
    try {
      await api.post('/pallets/enviar-rma', { codigosItens: itensParaTransferir, numeroPalletOrigem: pallet?.numero });
      toast.success(`Sucesso!`); setIsModoTransferencia(false); setItensParaTransferir([]); buscarDadosPallet();
    } catch (error: any) { toast.error(error.response?.data?.error || "Erro."); }
  };

  const handleConfirmarDestinoFinal = async (numeroPalletDestino: string) => {
    try {
      await api.put('/pallets/transferir-lote', { codigosItens: itensParaTransferir, numeroPalletDestino: numeroPalletDestino });
      toast.success("Concluída!"); setIsModoTransferencia(false); setItensParaTransferir([]); setExibirModalDestino(false); buscarDadosPallet();
    } catch (error: any) { toast.error(error.response?.data?.error || "Erro."); }
  };

  const handleExcluirItemLinha = async (codigoItem: string) => {
    if (!await toast.confirm(`Deseja remover ${codigoItem}?`)) return;
    try {
      await api.post('/pallets/bipar', { palletId: id, codigoItem, acao: 'SAIDA', versao: pallet?.versao });
      tocarSom('SAIDA'); 
      setPallet((prev) => {
        if(!prev) return prev;
        return { ...prev, versao: (prev.versao||1)+1, produtos: prev.produtos.filter(p => String(p.codigoItem) !== String(codigoItem)) }
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro.');
      if (error.response?.status === 409) await buscarDadosPallet();
    }
  };

  const produtosFiltradosVisuais = pallet ? pallet.produtos.filter(p => !exclusoesPendentes.includes(p.codigoItem)) : [];

  return {
    pallet: pallet ? { ...pallet, produtos: produtosFiltradosVisuais } : null,
    activeUsers, exclusoesPendentes, exibirModalExclusaoLote, acao, setAcao, codigoBipado, setCodigoBipado, mensagemStatus, setMensagemStatus, isModoTransferencia, setIsModoTransferencia, itensParaTransferir, setItensParaTransferir, palletsDestino, exibirModalDestino, setExibirModalDestino, carregandoDestinos, inputBipRef, carregandoRetriagem, qtdEtiquetas, setQtdEtiquetas, isEntrada: acao === 'ENTRADA', totalUnidades: produtosFiltradosVisuais.length, navigate, manterFocoNoInput, handleBipSubmit, handleGerarEtiquetaRetriagem, handleAdicionarTodoOPalletNoLote, handleFinalizerColetaTransferencia, handleLancarAoRMA, handleConfirmarDestinoFinal, handleExcluirItemLinha, handleDesfazerExclusaoItem, handleConfirmarExclusaoEmLote, handleDescartarExclusoesCache, handleTentarSairDaTela,
    
    // 🚀 EXPORTANDO AS FUNÇÕES DO MODAL
    exibirModalRastreabilidade, setExibirModalRastreabilidade, itemRastreabilidade, historicoData, carregandoHistorico, handleAbrirRastreabilidade
  };
}