// usePalletLogic.ts
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { PalletData } from '../types/types';
import api from '../../../../services/api';

export function usePalletLogic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
  // Estado para controlar a quantidade de etiquetas a gerar
  const [qtdEtiquetas, setQtdEtiquetas] = useState<number>(1);

  const inputBipRef = useRef<HTMLInputElement>(null);

  const manterFocoNoInput = () => { inputBipRef.current?.focus(); };

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
      if (!itemExisteNoPallet) {
        tocarSom('ERRO');
        setMensagemStatus({ texto: `O item "${codigoLimpo}" não consta neste pallet para dar saída!`, erro: true });
        setCodigoBipado('');
        return;
      }

      const desejaApenasSaida = window.confirm(
        `Você bipou a SAÍDA da triagem ${codigoLimpo}.\n\n` +
        `-> Clique em [OK] para REMOVER DE VEZ do estoque.\n` +
        `-> Clique em [CANCELAR] se quiser TRANSFERIR para outro pallet.`
      );

      if (!desejaApenasSaida) {
        setIsModoTransferencia(true);
        setItensParaTransferir([codigoLimpo]);
        tocarSom('ENTRADA');
        setMensagemStatus({ texto: `Modo transferência ativado! Item ${codigoLimpo} reservado para envio.`, erro: false });
        setCodigoBipado('');
        return;
      }

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

  // Fluxo de geração sequencial múltiplo baseado no retorno do backend
  const handleGerarEtiquetaRetriagem = async () => {
    setCarregandoRetriagem(true);
    setMensagemStatus({ texto: '', erro: false });
    
    try {
      const codigosGerados: string[] = [];

      // Loop para criar a quantidade de registros solicitada pelo usuário.
      // O backend gera o código sequencial (ex: P-00001) de forma atômica;
      // o front só informa que quer um código novo via "gerarSequencial".
      for (let i = 0; i < qtdEtiquetas; i++) {
        const response = await api.post('/pallets/bipar', { 
          palletId: id, 
          acao: 'ENTRADA',
          gerarSequencial: true
        });

        const codigoGerado = response.data?.item?.codigoItem;
        if (!codigoGerado) {
          throw new Error('O servidor não retornou o código gerado.');
        }
        codigosGerados.push(codigoGerado);
      }

      // Dispara a impressão de todas as etiquetas processadas em uma única janela
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

  return {
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
    isEntrada: acao === 'ENTRADA',
    totalUnidades: pallet ? pallet.produtos.length : 0,
    navigate,
    manterFocoNoInput,
    handleBipSubmit,
    handleGerarEtiquetaRetriagem,
    handleAdicionarTodoOPalletNoLote,
    handleFinalizerColetaTransferencia,
    handleLancarAoRMA,
    handleConfirmarDestinoFinal,
    handleExcluirItemLinha
  };
}