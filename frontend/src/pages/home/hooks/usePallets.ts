import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api.js';
import type { FormEvent } from 'react';
import type { Pallet, CriarPalletInput } from '../../../types/pallet';
import toast from 'react-hot-toast';

export function usePallets() {
  const navigate = useNavigate();
  
  // Estados de dados
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [busca, setBusca] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estados do formulário de criação (✨ Atualizado com a propriedade "tipo")
  const [form, setForm] = useState<CriarPalletInput>({
    numero: '',
    rua: '',
    estrutura: '',
    nivel: '',
    descricao: '',
    tipo: 'PADRAO'  // 📦 Inicia o seletor na opção padrão
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
      toast.error('Erro ao carregar os pallets do servidor.');
    }
  };

  const imprimirEtiqueta = (numeroPallet: string) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(numeroPallet)}`;
    const janelaImpressao = window.open('', '_blank', 'width=500,height=750');
    if (!janelaImpressao) return;

    janelaImpressao.document.write(`
      <html>
        <head>
          <title>Etiqueta 10x15 - ${numeroPallet}</title>
          <style>
            @page { size: 100mm 150mm; margin: 0; }
            html, body {
              margin: 0; padding: 0;
              width: 100mm; height: 150mm;
              display: flex; flex-direction: column;
              align-items: center; justify-content: center;
              background-color: #fff; box-sizing: border-box;
            }
            body { font-family: 'Arial', sans-serif; }
            img { width: 75mm; height: 75mm; margin-bottom: 12mm; }
            h2 {
              margin: 0; font-size: 34px; font-weight: 900;
              color: #000; text-transform: uppercase;
              letter-spacing: 2px; font-family: monospace;
            }
          </style>
        </head>
        <body>
          <img src="${qrUrl}" alt="QR Code" />
          <h2>${numeroPallet}</h2>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 300);
            };
          </script>
        </body>
      </html>
    `);
    janelaImpressao.document.close();
  };

  const handleQrBipado = async (e: FormEvent) => {
    e.preventDefault();
    const termo = qrCodeBipado.trim().toLowerCase();
    if (!termo) return;

    const palletEncontrado = pallets.find((p) => p.numero.toLowerCase() === termo);

    if (palletEncontrado) {
      navigate(`/pallet/${palletEncontrado.id}`);
    } else {
      toast.error(`Pallet com identificação "${qrCodeBipado}" não foi localizado no sistema.`);
      setQrCodeBipado('');
    }
  };

  const handleCriarPallet = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.numero) return toast.error ('O número do pallet é obrigatório!');

    try {
      const numeroTemporario = form.numero; 
      await api.post('/pallets', form);
      
      // ✨ Limpa todos os campos retornando o tipo para o padrão "PADRAO"
      setForm({ numero: '', rua: '', estrutura: '', nivel: '', descricao: '', tipo: 'PADRAO' });
      setIsModalOpen(false);
      carregarPallets();

      if (window.confirm(`Posição "${numeroTemporario}" criada! Deseja emitir a etiqueta térmica agora?`)) {
        imprimirEtiqueta(numeroTemporario);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao criar o pallet.');
    }
  };

  const palletsFiltrados = pallets.filter((pallet: any) => {
    if (!busca.trim()) return true;
    const termoBusca = busca.trim().toLowerCase();
    const bateNomePallet = pallet.numero.toLowerCase().includes(termoBusca);
    const contemAtriagem = pallet.produtos?.some((prod: any) => 
      prod.codigoItem.toLowerCase().includes(termoBusca)
    );
    return bateNomePallet || contemAtriagem;
  });

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