import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api.js';
import type { FormEvent } from 'react';
import type { Pallet, CriarPalletInput } from '../../../types/pallet';

export function usePallets() {
  const navigate = useNavigate();
  
  // Estados de dados
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [busca, setBusca] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estados do formulário de criação
  const [form, setForm] = useState<CriarPalletInput>({
    numero: '',
    rua: '',
    estrutura: '',
    nivel: ''
  });
  
  // Estado e Referência para Bipagem Rápida
  const [qrCodeBipado, setQrCodeBipado] = useState('');
  const qrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    carregarPallets();
    qrInputRef.current?.focus();
  }, []);

  const carregarPallets = async () => {
    try {
      const response = await api.get('/pallets');
      setPallets(response.data);
    } catch (error) {
      alert('Erro ao carregar os pallets do servidor.');
    }
  };

  const handleQrBipado = async (e: FormEvent) => {
    e.preventDefault();
    const termo = qrCodeBipado.trim().toLowerCase();
    if (!termo) return;

    const palletEncontrado = pallets.find((p) => p.numero.toLowerCase() === termo);

    if (palletEncontrado) {
      navigate(`/pallet/${palletEncontrado.id}`);
    } else {
      alert(`Pallet com identificação "${qrCodeBipado}" não foi localizado no sistema.`);
      setQrCodeBipado('');
    }
  };

  const handleCriarPallet = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.numero) return alert('O número do pallet é obrigatório!');

    try {
      await api.post('/pallets', form);
      alert('Pallet criado com sucesso!');
      setForm({ numero: '', rua: '', estrutura: '', nivel: '' });
      setIsModalOpen(false);
      carregarPallets();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao criar o pallet.');
    }
  };

  const palletsFiltrados = pallets.filter((p) =>
    p.numero.toLowerCase().includes(busca.toLowerCase()) ||
    (p.rua && p.rua.toLowerCase().includes(busca.toLowerCase()))
  );

  return {
    palletsFiltrados,
    busca,
    setBusca,
    isModalOpen,
    setIsModalOpen,
    form,
    setForm,
    qrCodeBipado,
    setQrCodeBipado,
    qrInputRef,
    handleQrBipado,
    handleCriarPallet
  };
}