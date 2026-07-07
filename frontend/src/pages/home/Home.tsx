import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';

interface Pallet {
  id: number;
  numero: string;
  rua?: string;
  estrutura?: string;
  nivel?: string;
  _count?: { produtos: number };
}

export default function Home() {
  const navigate = useNavigate();
  
  // Estados para o Formulário de Criação
  const [numero, setNumero] = useState('');
  const [rua, setRua] = useState('');
  const [estrutura, setEstrutura] = useState('');
  const [nivel, setNivel] = useState('');
  
  // Estado para a Listagem e Busca
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [busca, setBusca] = useState('');
  
  // Estado para o Campo de Entrada Rápida (QR Code)
  const [qrCodeBipado, setQrCodeBipado] = useState('');
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Carrega os pallets ao entrar na tela
  useEffect(() => {
    carregarPallets();
    // Coloca o foco automático no campo de bipar QR Code do Pallet assim que abre a tela
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

  // Fluxo de Roteamento Direto (Ao bipar o QR Code do Pallet)
  const handleQrBipado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCodeBipado.trim()) return;

    try {
      // Procuramos o pallet na lista pelo número digitado/bipado
      const palletEncontrado = pallets.find(
        (p) => p.numero.toLowerCase() === qrCodeBipado.trim().toLowerCase()
      );

      if (palletEncontrado) {
        // Redireciona na hora para a rota interna /pallet/ID
        navigate(`/pallet/${palletEncontrado.id}`);
      } else {
        alert(`Pallet com identificação "${qrCodeBipado}" não foi localizado no sistema.`);
        setQrCodeBipado('');
      }
    } catch (error) {
      alert('Erro ao processar o direcionamento do pallet.');
    }
  };

  // Envio do formulário de criação de novo Pallet
  const handleCriarPallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero) return alert('O número do pallet é obrigatório!');

    try {
      await api.post('/pallets', { numero, rua, estrutura, nivel });
      alert('Pallet criado com sucesso!');
      // Reseta os campos e atualiza a lista
      setNumero(''); setRua(''); setEstrutura(''); setNivel('');
      carregarPallets();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao criar o pallet.');
    }
  };

  // Filtra os pallets conforme o termo digitado na barra de busca
  const palletsFiltrados = pallets.filter((p) =>
    p.numero.toLowerCase().includes(busca.toLowerCase()) ||
    (p.rua && p.rua.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      {/* 1. SEÇÃO DE BIPAGEM RÁPIDA (ENTRADA DIRETA NO PALLET) */}
      <div className="bg-slate-950 p-6 rounded-xl border border-emerald-500/30 shadow-lg">
        <h2 className="text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2">
          <span>📷</span> ACESSO RÁPIDO: BIPAR QR CODE DO PALLET
        </h2>
        <form onSubmit={handleQrBipado} className="flex gap-4">
          <input
            ref={qrInputRef}
            type="text"
            className="flex-1 bg-slate-900 border-2 border-slate-700 text-white p-4 rounded-lg font-mono text-xl focus:outline-none focus:border-emerald-500 transition-colors"
            placeholder="Aponte o leitor e bipa o QR Code do Pallet aqui..."
            value={qrCodeBipado}
            onChange={(e) => setQrCodeBipado(e.target.value)}
          />
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 rounded-lg transition-colors">
            Entrar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 2. FORMULÁRIO DE CRIAÇÃO (ESQUERDA) */}
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-md h-fit">
          <h2 className="text-md font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2">➕ CADASTRAR NOVO PALLET</h2>
          <form onSubmit={handleCriarPallet} className="space-y-4 text-slate-300">
            <div>
              <label className="text-xs font-semibold block mb-1">Número do Pallet (ID Fixo / QR) *</label>
              <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" placeholder="Ex: PL-1045" value={numero} onChange={(e) => setNumero(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Rua / Corredor (Opcional)</label>
              <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" placeholder="Ex: Corredor A" value={rua} onChange={(e) => setRua(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold block mb-1">Estrutura (Opcional)</label>
                <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" placeholder="Ex: EST-03" value={estrutura} onChange={(e) => setEstrutura(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Nível / Altura (Opcional)</label>
                <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" placeholder="Ex: Nível 2" value={nivel} onChange={(e) => setNivel(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold p-3 rounded transition-colors text-white mt-2">
              Salvar Estrutura
            </button>
          </form>
        </div>

        {/* 3. VISUALIZAÇÃO E BUSCA DOS PALLETS (DIREITA) */}
        <div className="md:col-span-2 bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-md">
          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
            <h2 className="text-md font-bold text-slate-300">📋 MAPA DE PALLETS NO GALPÃO</h2>
            <input
              type="text"
              placeholder="Buscar por número ou corredor..."
              className="bg-slate-900 border border-slate-700 text-xs rounded px-3 py-1.5 w-64 text-white focus:outline-none focus:border-blue-500"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-100 overflow-y-auto pr-2">
            {palletsFiltrados.map((pallet) => (
              <div 
                key={pallet.id}
                onClick={() => navigate(`/pallet/${pallet.id}`)}
                className="bg-slate-900 p-4 rounded-lg border border-slate-800 hover:border-blue-500/50 cursor-pointer transition-all flex justify-between items-center group"
              >
                <div>
                  <div className="font-mono font-bold text-lg text-slate-200 group-hover:text-blue-400">{pallet.numero}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {pallet.rua || 'S/ Rua'} • {pallet.estrutura || 'S/ Est.'} • {pallet.nivel || 'S/ Nível'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="bg-slate-800 text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-700">
                    {pallet._count?.produtos || 0} Itens
                  </span>
                </div>
              </div>
            ))}
            {palletsFiltrados.length === 0 && (
              <p className="text-slate-500 text-sm col-span-2 text-center py-8">Nenhum pallet cadastrado ou localizado.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}