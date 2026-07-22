import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import type { Pallet, CriarPalletInput } from '../../../types/pallet';
import { useToast } from '../../../contexts/toastContext';
import { useSocket } from '../../../contexts/SocketContext';

export function usePallets() {
  const navigate = useNavigate();
  const toast = useToast();
  const { socket } = useSocket();
  
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [presenceData, setPresenceData] = useState<Record<string, string[]>>({});
  
  const [busca, setBusca] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [form, setForm] = useState<CriarPalletInput>({
    numero: '', rua: '', estrutura: '', nivel: '', descricao: '', tipo: 'PADRAO'
  });
  
  const [qrCodeBipado, setQrCodeBipado] = useState('');
  const qrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    carregarPallets();
    qrInputRef.current?.focus();

    if (socket) {
      const handleGridUpdate = () => carregarPallets();
      const handlePresenceUpdate = (data: Record<string, string[]>) => setPresenceData(data);

      socket.on('grid:updated', handleGridUpdate);
      socket.on('presence:global_update', handlePresenceUpdate);

      return () => {
        socket.off('grid:updated', handleGridUpdate);
        socket.off('presence:global_update', handlePresenceUpdate);
      };
    }
  }, [socket]);

  const carregarPallets = async () => {
    try {
      const response = await api.get('/pallets');
      setPallets(response.data);
    } catch (error) {
      toast.error('Erro ao carregar os pallets do servidor.');
    }
  };

  const imprimirEtiqueta = (numeroPallet: string) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(numeroPallet)}`;
    const janelaImpressao = window.open('', '_blank', 'width=500,height=750');
    if (!janelaImpressao) return;
    janelaImpressao.document.write(`
      <html><head><title>Etiqueta 10x15 - ${numeroPallet}</title><style>@page { size: 100mm 150mm; margin: 0; } html, body { margin: 0; padding: 0; width: 100mm; height: 150mm; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #fff; box-sizing: border-box; } body { font-family: 'Arial', sans-serif; } img { width: 75mm; height: 75mm; margin-bottom: 12mm; } h2 { margin: 0; font-size: 34px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 2px; font-family: monospace; }</style></head><body><img src="${qrUrl}" alt="QR Code" /><h2>${numeroPallet}</h2><script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 300); };</script></body></html>
    `);
    janelaImpressao.document.close();
  };

  const handleQrBipado = async (e: FormEvent) => {
    e.preventDefault();
    const termo = qrCodeBipado.trim().toLowerCase();
    if (!termo) return;
    const palletEncontrado = pallets.find((p) => p.numero.toLowerCase() === termo);
    
    if (palletEncontrado) navigate(`/pallet/${palletEncontrado.numero}`);
    else { toast.error(`Pallet não localizado.`); setQrCodeBipado(''); }
  };

  const handleCriarPallet = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.numero) return toast.error('O número do pallet é obrigatório!');
    try {
      const numeroTemporario = form.numero; 
      await api.post('/pallets', form);
      setForm({ numero: '', rua: '', estrutura: '', nivel: '', descricao: '', tipo: 'PADRAO' });
      setIsModalOpen(false);
      carregarPallets();
      const confirmou = await toast.confirm(`Criada! Deseja emitir etiqueta agora?`);
      if (confirmou) imprimirEtiqueta(numeroTemporario);
    } catch (error: any) { 
      toast.error(error.response?.data?.error || 'Erro ao criar.'); 
    }
  };

  const palletsFiltrados = pallets.filter((pallet: Pallet) => {
    if (!busca.trim()) return true;
    const termoBusca = busca.trim().toLowerCase();
    const bateNomePallet = pallet.numero.toLowerCase().includes(termoBusca);
    const contemAtriagem = pallet.produtos?.some((prod: any) => prod.codigoItem.toLowerCase().includes(termoBusca));
    return bateNomePallet || contemAtriagem;
  });

  return {
    palletsFiltrados, presenceData, busca, setBusca, isModalOpen, setIsModalOpen,
    form, setForm, qrCodeBipado, setQrCodeBipado, qrInputRef, handleQrBipado, handleCriarPallet,
    carregarPallets // 🚀 AGORA EXPORTAMOS A FUNÇÃO PARA FORÇAR A ATUALIZAÇÃO LOCAL
  };
}