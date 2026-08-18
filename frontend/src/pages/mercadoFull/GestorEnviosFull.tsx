import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/toastContext';

interface Variacao { codigoML: string; codigoUniversal: string; quantidade: number; }
interface Leitura { id: string; codigo: string; tipo: 'SKU_EAN' | 'SERIE'; data: string; }
interface InboundSKU {
  id: number; sku: string; descricao: string; quantidadeTotal: number;
  quantidadeBipada: number; status: 'PENDENTE' | 'CONCLUIDO';
  variacoes?: Variacao[]; leituras?: Leitura[];
  updatedAt?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const gerarMascara = (str: string) => str.replace(/[0-9]/g, 'N').replace(/[a-zA-Z]/g, 'L');

export default function GestorEnviosFull() {
  const navigate = useNavigate();
  const toast = useToast();
  const [currentScreen, setCurrentScreen] = useState(1);
  
  const [dashboardData, setDashboardData] = useState<{motoristas: any[], veiculos: any[], inbounds: any[]}>({ motoristas: [], veiculos: [], inbounds: [] });
  
  const [nomePallet, setNomePallet] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inboundData, setInboundData] = useState<{ id: number, nome: string, totalSku: number, totalUnidades: number, status: string } | null>(null);
  const [skus, setSkus] = useState<InboundSKU[]>([]);
  const [skuEmBipagem, setSkuEmBipagem] = useState<InboundSKU | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [codigoLido, setCodigoLido] = useState('');
  const [modoBipagem, setModoBipagem] = useState<'SKU_EAN' | 'SERIE'>('SKU_EAN');
  const [mascaraSerie, setMascaraSerie] = useState<string | null>(null);
  const inputBipagemRef = useRef<HTMLInputElement>(null);
  
  const [modoTravado, setModoTravado] = useState(false);
  const [showSucessoProduto, setShowSucessoProduto] = useState(false);
  
  const [showModalFinalizarEnvio, setShowModalFinalizarEnvio] = useState(false);
  const [motoristaSelecionado, setMotoristaSelecionado] = useState('');
  const [veiculoSelecionado, setVeiculoSelecionado] = useState('');
  const [isEditandoEnvio, setIsEditandoEnvio] = useState(false); 
  
  const [showModalMotorista, setShowModalMotorista] = useState(false);
  const [nomeMotorista, setNomeMotorista] = useState('');
  const [showModalVeiculo, setShowModalVeiculo] = useState(false);
  const [nomeVeiculo, setNomeVeiculo] = useState('');
  const [placaVeiculo, setPlacaVeiculo] = useState('');

  const [showMotoristasList, setShowMotoristasList] = useState(false);
  const [showVeiculosList, setShowVeiculosList] = useState(false);
  // 🚀 NOVIDADE: Estado para controlar a visibilidade do bloco inteiro de Ativos
  const [showGerenciamentoAtivos, setShowGerenciamentoAtivos] = useState(false);

  const [termoBusca, setTermoBusca] = useState('');
  
  const dataAtual = new Date();
  const dataInicioPadrao = new Date(dataAtual.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dataFimPadrao = new Date(dataAtual.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [dataInicio, setDataInicio] = useState(dataInicioPadrao);
  const [dataFim, setDataFim] = useState(dataFimPadrao);

  const [filtros, setFiltros] = useState({
    PENDENTE: true,
    CONCLUIDO: true,
    ENVIADO: true
  });

  const [modalCoord, setModalCoord] = useState<{isOpen: boolean, inboundId: number | null, acao: 'EXCLUIR' | 'ENVIAR' | null, nomePallet: string}>({
    isOpen: false, inboundId: null, acao: null, nomePallet: ''
  });

  const carregarDashboard = async () => {
    try {
      const token = localStorage.getItem('wms_token');
      const res = await fetch(`${API_URL}/inbounds/dashboard`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setDashboardData({
          motoristas: data.motoristas || [],
          veiculos: data.veiculos || [],
          inbounds: data.inbounds || []
        });
      }
    } catch (error) {
      console.error('Erro ao buscar dashboard', error);
    }
  };

  useEffect(() => {
    carregarDashboard();
  }, []);

  useEffect(() => {
    if (modoTravado && inputBipagemRef.current) inputBipagemRef.current.focus();
  }, [modoTravado, showModalFinalizarEnvio, showSucessoProduto]);

  const handleSalvarMotorista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeMotorista.trim()) return toast.error('Informe o nome do motorista!');
    try {
      const token = localStorage.getItem('wms_token');
      const res = await fetch(`${API_URL}/inbounds/motoristas`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nome: nomeMotorista })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.mensagem);
      setNomeMotorista(''); setShowModalMotorista(false); setShowMotoristasList(true); setShowVeiculosList(false); carregarDashboard();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSalvarVeiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeVeiculo.trim() || !placaVeiculo.trim()) return toast.error('Informe o modelo e a placa!');
    try {
      const token = localStorage.getItem('wms_token');
      const res = await fetch(`${API_URL}/inbounds/veiculos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ modelo: nomeVeiculo, placa: placaVeiculo })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.mensagem);
      setNomeVeiculo(''); setPlacaVeiculo(''); setShowModalVeiculo(false); setShowVeiculosList(true); setShowMotoristasList(false); carregarDashboard();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleAcaoCoordenador = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('wms_token');
      const res = await fetch(`${API_URL}/inbounds/${modalCoord.inboundId}/coordenador`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ acao: modalCoord.acao }) 
      });
      
      if (modalCoord.acao === 'ENVIAR') {
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Erro ao gerar relatório.');
        }
        
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Relatorio_${modalCoord.nomePallet}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        toast.success("Envio Despachado e Relatório Baixado com Sucesso!");
        setModalCoord({ isOpen: false, inboundId: null, acao: null, nomePallet: '' });
        setCurrentScreen(1); 
        carregarDashboard();
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.mensagem);
      setModalCoord({ isOpen: false, inboundId: null, acao: null, nomePallet: '' });
      carregarDashboard();
    } catch (err: any) { toast.error(err.message || 'Erro ao processar a ação.'); }
  };

  const handleReimprimir = async (inb: any) => {
    try {
      toast.success("Gerando arquivo, aguarde...");
      const token = localStorage.getItem('wms_token');
      const res = await fetch(`${API_URL}/inbounds/${inb.id}/coordenador`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ acao: 'REIMPRIMIR' }) 
      });
      
      if (!res.ok) throw new Error('Erro ao baixar relatório.');
        
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Relatorio_${inb.nomePallet}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      const match = file.name.match(/(Envio-\d+)/i);
      if (match && match[1]) {
        setNomePallet(`${match[1]} `); 
      }
    }
  };

  const handleProcessarNovo = async () => {
    if (!selectedFile || !nomePallet) return toast.error("Preencha o nome e anexe o arquivo.");
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('wms_token');
      const formData = new FormData();
      formData.append('nomePallet', nomePallet); formData.append('inboundPdf', selectedFile);
      const res = await fetch(`${API_URL}/inbounds/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.mensagem);
      setNomePallet(''); setSelectedFile(null); 
      carregarDashboard(); 
      setCurrentScreen(1); 
    } catch (err: any) { toast.error(err.message); } finally { setIsProcessing(false); }
  };

  const abrirEnvioCompleto = (inb: any) => {
    const skusArray = inb.skus || [];
    const totalUnidadesCalc = skusArray.reduce((acc: number, item: any) => acc + item.quantidadeTotal, 0);
    setInboundData({ id: inb.id, nome: inb.nomePallet, totalSku: skusArray.length, totalUnidades: totalUnidadesCalc, status: inb.status });
    setSkus(skusArray);
    setMotoristaSelecionado(inb.motoristaId ? String(inb.motoristaId) : '');
    setVeiculoSelecionado(inb.veiculoId ? String(inb.veiculoId) : '');
    setCurrentScreen(3);
    setSkuEmBipagem(null);
    setIsScanning(false);
    setModoTravado(false);
    setMascaraSerie(null);
  };

  const salvarEdicaoAtivosTela3 = async () => {
    if (!inboundData || !motoristaSelecionado || !veiculoSelecionado) return toast.error("Selecione motorista e veículo.");
    try {
      const token = localStorage.getItem('wms_token');
      const res = await fetch(`${API_URL}/inbounds/${inboundData.id}/finalizar`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ motoristaId: motoristaSelecionado, veiculoId: veiculoSelecionado, skus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success("Informações salvas e garantidas no Banco!");
      carregarDashboard(); 
      setCurrentScreen(1);
    } catch (err: any) { toast.error(err.message); }
  };

  const confirmarFinalizacaoEnvio = async () => {
    if (!inboundData) return;
    try {
      const token = localStorage.getItem('wms_token');
      const res = await fetch(`${API_URL}/inbounds/${inboundData.id}/finalizar`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ motoristaId: motoristaSelecionado, veiculoId: veiculoSelecionado, skus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success(data.mensagem);
      setShowModalFinalizarEnvio(false);
      setCurrentScreen(1); 
      carregarDashboard(); 
    } catch (err: any) { toast.error(err.message); }
  };

  const handleBipar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuEmBipagem || !codigoLido.trim()) return;
    const codigoLimpo = codigoLido.trim().toUpperCase();
    let isValid = false;
    const isSku = codigoLimpo === skuEmBipagem.sku.toUpperCase();
    const isEan = skuEmBipagem.variacoes?.some(v => v.codigoUniversal !== 'N/A' && v.codigoUniversal.toUpperCase() === codigoLimpo) || false;

    if (modoBipagem === 'SKU_EAN') {
      if (isSku || isEan) isValid = true;
      else { toast.error('Código inválido! Este NÃO é o SKU ou EAN deste produto.'); setCodigoLido(''); return; }
    } else if (modoBipagem === 'SERIE') {
      if (isSku || isEan) { toast.error('Você bipou um SKU/EAN no campo de Série!'); setCodigoLido(''); return; }
      if (skuEmBipagem.leituras?.some(l => l.codigo === codigoLimpo)) { toast.error('Duplicidade: Número JÁ FOI bipado!'); setCodigoLido(''); return; }
      const mascaraAtual = gerarMascara(codigoLimpo);
      if (!mascaraSerie) { setMascaraSerie(mascaraAtual); isValid = true; } 
      else {
        if (mascaraAtual === mascaraSerie) isValid = true;
        else { toast.error(`Formato Incorreto! O serial deve ser (${mascaraSerie.length} caracteres).`); setCodigoLido(''); return; }
      }
    }

    if (isValid) {
      if (skuEmBipagem.quantidadeBipada >= skuEmBipagem.quantidadeTotal) { toast.error('Quantidade total já foi atingida!'); setCodigoLido(''); return; }
      
      const novaLeitura: Leitura = { id: Math.random().toString(36).substring(2, 11), codigo: codigoLimpo, tipo: modoBipagem, data: new Date().toISOString() };
      const novaQtd = skuEmBipagem.quantidadeBipada + 1;
      
      const updatedSkus = skus.map(s => {
        if (s.id === skuEmBipagem.id) {
          const novoStatus = (novaQtd >= s.quantidadeTotal ? 'CONCLUIDO' : 'PENDENTE');
          return { ...s, quantidadeBipada: novaQtd, status: novoStatus as any, leituras: [...(s.leituras || []), novaLeitura] };
        }
        return s;
      });

      setSkus(updatedSkus);
      setSkuEmBipagem(updatedSkus.find(s => s.id === skuEmBipagem.id) || null);
      
      const todosConcluidosLocal = updatedSkus.every(sku => sku.quantidadeBipada >= sku.quantidadeTotal);
      setDashboardData(prev => ({
        ...prev,
        inbounds: prev.inbounds.map(inb => {
          if (inb.id === inboundData?.id) {
            return { ...inb, skus: updatedSkus, status: todosConcluidosLocal ? 'CONCLUIDO' : inb.status };
          }
          return inb;
        })
      }));

      if (todosConcluidosLocal) {
        setInboundData(prev => prev ? { ...prev, status: 'CONCLUIDO' } : null);
        setShowSucessoProduto(true);
        setTimeout(() => {
          setShowSucessoProduto(false);
          fecharModoBipagem();
          toast.success('Bipagem concluída! Escolha a frota no topo para Salvar.');
        }, 1500);
      } else if (novaQtd >= skuEmBipagem.quantidadeTotal) {
        setShowSucessoProduto(true);
        setTimeout(() => {
          setShowSucessoProduto(false);
          fecharModoBipagem();
        }, 1500);
      }
    }
    setCodigoLido(''); 
  };

  const handleRemoverLeitura = (idLeitura: string) => {
    if (!skuEmBipagem) return;
    const updatedSkus = skus.map(s => {
      if (s.id === skuEmBipagem.id) {
        const leiturasRestantes = (s.leituras || []).filter(l => l.id !== idLeitura);
        const novaQtd = Math.max(0, s.quantidadeBipada - 1);
        return { ...s, quantidadeBipada: novaQtd, status: (novaQtd >= s.quantidadeTotal ? 'CONCLUIDO' : 'PENDENTE') as any, leituras: leiturasRestantes };
      }
      return s;
    });
    setSkus(updatedSkus);
    setSkuEmBipagem(updatedSkus.find(s => s.id === skuEmBipagem.id) || null);

    setDashboardData(prev => ({
      ...prev,
      inbounds: prev.inbounds.map(inb => {
        if (inb.id === inboundData?.id) return { ...inb, skus: updatedSkus, status: 'PENDENTE' };
        return inb;
      })
    }));
  };

  const fecharModoBipagem = () => {
    setSkuEmBipagem(null);
    setIsScanning(false);
    setModoTravado(false);
    setCodigoLido('');
    setMascaraSerie(null); 
    setShowSucessoProduto(false);
  };

  const resetarMascara = () => {
    setMascaraSerie(null);
    toast.success('Padrão de Série resetado. Bipe o próximo serial.');
    if (inputBipagemRef.current) inputBipagemRef.current.focus();
  };

  const toggleFiltro = (status: 'PENDENTE' | 'CONCLUIDO' | 'ENVIADO') => {
    setFiltros(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const toggleTodos = () => {
    const todosAtivos = filtros.PENDENTE && filtros.CONCLUIDO && filtros.ENVIADO;
    setFiltros({ PENDENTE: !todosAtivos, CONCLUIDO: !todosAtivos, ENVIADO: !todosAtivos });
  };

  const HeaderGlobal = ({ showClose = true, onClose = () => navigate('/') }) => (
    <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10 flex items-center justify-between min-h-[80px]">
      {showClose ? (
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full transition shadow-sm border border-gray-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
      ) : <div className="w-10 h-10"></div>}
      
      <div className="flex-1 flex items-center justify-center gap-2">
        <span className="text-[#00a650] italic font-black text-[24px] leading-none tracking-tight flex items-center">
          <svg className="w-5 h-5 mr-0.5 fill-[#00a650] stroke-[#00a650]" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
          FULL
        </span>
        <span className="font-bold text-slate-800 text-base uppercase tracking-widest mt-0.5">Gestor de Envios</span>
      </div>

      <div className="w-10 h-10"></div>
    </div>
  );

  const countPendente = dashboardData.inbounds?.filter(i => i.status === 'PENDENTE').length || 0;
  const countConcluido = dashboardData.inbounds?.filter(i => i.status === 'CONCLUIDO').length || 0;
  const countEnviado = dashboardData.inbounds?.filter(i => i.status === 'ENVIADO').length || 0;

  const inboundsFiltrados = dashboardData.inbounds?.filter(inb => {
    if (dataInicio && dataFim && inb.createdAt) {
      const itemDate = new Date(inb.createdAt).toISOString().split('T')[0];
      if (itemDate < dataInicio || itemDate > dataFim) return false;
    }

    if (inb.status === 'PENDENTE' && !filtros.PENDENTE) return false;
    if (inb.status === 'CONCLUIDO' && !filtros.CONCLUIDO) return false;
    if (inb.status === 'ENVIADO' && !filtros.ENVIADO) return false;

    if (!termoBusca) return true; 
    
    const termo = termoBusca.toLowerCase();
    if (inb.nomePallet.toLowerCase().includes(termo)) return true;
    if (inb.status.toLowerCase().includes(termo)) return true;
    if (inb.createdAt && inb.createdAt.includes(termo)) return true;
    if (inb.motorista?.nome && inb.motorista.nome.toLowerCase().includes(termo)) return true;
    if (inb.veiculo?.placa && inb.veiculo.placa.toLowerCase().includes(termo)) return true;

    const temNaLeitura = inb.skus?.some((skuObj: any) => {
      if (skuObj.sku.toLowerCase().includes(termo)) return true;
      const achouEan = skuObj.variacoes?.some((v: any) => v.codigoUniversal && v.codigoUniversal.toLowerCase().includes(termo));
      if (achouEan) return true;
      
      let leiturasArray = [];
      try { leiturasArray = typeof skuObj.leituras === 'string' ? JSON.parse(skuObj.leituras) : (skuObj.leituras || []); } catch(e){}
      const achouSerie = leiturasArray.some((l: any) => l.codigo && l.codigo.toLowerCase().includes(termo));
      if (achouSerie) return true;
      return false;
    });

    return temNaLeitura;
  }) || [];

  return (
    <div className="min-h-screen bg-[#F6F8FC] md:p-8 flex items-start justify-center font-sans antialiased relative">
      
      {modalCoord.isOpen && (
        <div className="fixed inset-0 z-[110] w-screen h-screen flex items-center justify-center bg-slate-900/40 backdrop-blur-[3px] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className={`p-4 border-b flex justify-between items-center text-white ${modalCoord.acao === 'EXCLUIR' ? 'bg-red-600' : 'bg-[#00a650]'}`}>
              <h3 className="font-bold">Confirmação de Ação</h3>
              <button type="button" onClick={() => setModalCoord({ isOpen: false, inboundId: null, acao: null, nomePallet: '' })} className="hover:opacity-75">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAcaoCoordenador} className="p-6 text-center">
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Você tem certeza que deseja <strong>{modalCoord.acao === 'EXCLUIR' ? 'APAGAR' : 'DESPACHAR'}</strong> o envio abaixo?<br/><br/>
                <span className="font-bold text-gray-900 text-lg border-b-2 border-gray-200 pb-1">{modalCoord.nomePallet}</span>
              </p>
              
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setModalCoord({ isOpen: false, inboundId: null, acao: null, nomePallet: '' })} className="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancelar</button>
                <button type="submit" className={`flex-1 font-bold py-3 rounded-xl transition shadow-md text-white ${modalCoord.acao === 'EXCLUIR' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#00a650] hover:bg-green-700'}`}>Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalFinalizarEnvio && (
        <div className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center bg-slate-900/30 backdrop-blur-[3px] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-100 text-[#00a650]`}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Carga 100% Conferida!</h3>
                <p className="text-sm text-gray-600">Escolha a frota para fechar este envio!</p>
              </div>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Motorista</label>
                  <select value={motoristaSelecionado} onChange={(e) => setMotoristaSelecionado(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#00a650] bg-gray-50">
                    <option value="">-- Escolha --</option>
                    {dashboardData.motoristas?.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Veículo</label>
                  <select value={veiculoSelecionado} onChange={(e) => setVeiculoSelecionado(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#00a650] bg-gray-50">
                    <option value="">-- Escolha --</option>
                    {dashboardData.veiculos?.map(v => <option key={v.id} value={v.id}>{v.modelo} ({v.placa})</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowModalFinalizarEnvio(false)} className="flex-1 py-3 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancelar</button>
                <button onClick={confirmarFinalizacaoEnvio} disabled={!motoristaSelecionado || !veiculoSelecionado} className="flex-1 py-3 text-sm font-bold text-white bg-[#00a650] hover:bg-green-700 disabled:opacity-50 rounded-xl shadow-md transition">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModalMotorista && (
        <div className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center bg-slate-900/30 backdrop-blur-[3px] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-gray-50 p-4 border-b flex justify-between items-center"><h3 className="font-bold">Cadastrar Motorista</h3><button onClick={() => setShowModalMotorista(false)}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <form onSubmit={handleSalvarMotorista} className="p-5">
              <input type="text" value={nomeMotorista} onChange={(e) => setNomeMotorista(e.target.value)} placeholder="Nome Completo" className="w-full border rounded-lg p-3 text-sm mb-5 focus:ring-2 focus:ring-[#00a650]" autoFocus/>
              <button type="submit" className="w-full bg-[#00a650] text-white font-bold py-3 rounded-xl hover:bg-green-700">Salvar</button>
            </form>
          </div>
        </div>
      )}

      {showModalVeiculo && (
        <div className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center bg-slate-900/30 backdrop-blur-[3px] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-gray-50 p-4 border-b flex justify-between items-center"><h3 className="font-bold">Cadastrar Veículo</h3><button onClick={() => setShowModalVeiculo(false)}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <form onSubmit={handleSalvarVeiculo} className="p-5">
              <input type="text" value={nomeVeiculo} onChange={(e) => setNomeVeiculo(e.target.value)} placeholder="Modelo / Nome" className="w-full border rounded-lg p-3 text-sm mb-4 focus:ring-2 focus:ring-[#00a650]" autoFocus/>
              <input type="text" value={placaVeiculo} onChange={(e) => setPlacaVeiculo(e.target.value.toUpperCase())} placeholder="ABC-1234" maxLength={8} className="w-full border rounded-lg p-3 text-sm mb-5 uppercase tracking-widest font-bold focus:ring-2 focus:ring-[#00a650]"/>
              <button type="submit" className="w-full bg-[#00a650] text-white font-bold py-3 rounded-xl hover:bg-green-700">Salvar</button>
            </form>
          </div>
        </div>
      )}

      <div className="w-full min-h-screen md:min-h-0 md:max-w-2xl bg-white md:rounded-2xl md:shadow-xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-300">
        
        {/* TELA 1 */}
        {currentScreen === 1 && (
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10 flex items-center justify-between min-h-[80px]">
              <div className="w-10 h-10"></div> 
              <div className="flex-1 flex items-center justify-center gap-2">
                <span className="text-[#00a650] italic font-black text-[24px] leading-none tracking-tight flex items-center">
                  <svg className="w-5 h-5 mr-0.5 fill-[#00a650] stroke-[#00a650]" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                  FULL
                </span>
                <span className="font-bold text-slate-800 text-base uppercase tracking-widest mt-0.5">Gestor de Envios</span>
              </div>
              <div className="w-10 h-10"></div>
            </div>
            
            <div className="p-5 flex-1 bg-gray-50 flex flex-col overflow-y-auto">
              
              <button onClick={() => setCurrentScreen(2)} className="w-full bg-[#1e293b] text-[#00a650] font-semibold py-4 rounded-xl mb-6 flex items-center justify-center gap-2 transition hover:bg-slate-800 shadow-md">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg> Adicionar Novo Envio
              </button>
              
              {/* 🚀 MUDANÇA: Bloco Gerenciamento de Ativos "Escondido" via Sanfona */}
              <div className="border border-gray-200 bg-white rounded-lg overflow-hidden shadow-sm mb-6">
                <button onClick={() => setShowGerenciamentoAtivos(!showGerenciamentoAtivos)} className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-gray-50 transition">
                  <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider m-0">Gerenciamento de Ativos</h3>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${showGerenciamentoAtivos ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
                
                {showGerenciamentoAtivos && (
                  <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-3 mb-4 items-start">
                      <button onClick={() => setShowModalMotorista(true)} className="w-full bg-white border border-gray-200 text-[#00a650] font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-green-50 transition"><span className="text-lg leading-none">+</span> Motorista</button>
                      <button onClick={() => setShowModalVeiculo(true)} className="w-full bg-white border border-gray-200 text-[#00a650] font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-green-50 transition"><span className="text-lg leading-none">+</span> Veículo</button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 items-start">
                      <div className="border border-gray-200 bg-white rounded-lg overflow-hidden shadow-sm h-max">
                        <button onClick={() => { setShowMotoristasList(!showMotoristasList); setShowVeiculosList(false); }} className="w-full px-3 py-2 flex items-center justify-between bg-white hover:bg-gray-50 transition">
                          <span className="text-[11px] font-bold text-gray-600 uppercase flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-[#00a650]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> Motoristas
                          </span>
                          <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showMotoristasList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                        </button>
                        {showMotoristasList && (
                          <div className="p-2 max-h-48 overflow-y-auto space-y-1 border-t border-gray-100">
                            {dashboardData.motoristas?.length > 0 ? (
                              dashboardData.motoristas.map(m => (
                                <div key={m.id} className="text-xs text-gray-700 py-1.5 px-2 hover:bg-gray-50 rounded uppercase font-medium">{m.nome}</div>
                              ))
                            ) : (
                              <div className="text-[10px] text-gray-400 italic p-2 text-center">Nenhum cadastrado</div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="border border-gray-200 bg-white rounded-lg overflow-hidden shadow-sm h-max">
                        <button onClick={() => { setShowVeiculosList(!showVeiculosList); setShowMotoristasList(false); }} className="w-full px-3 py-2 flex items-center justify-between bg-white hover:bg-gray-50 transition">
                          <span className="text-[11px] font-bold text-gray-600 uppercase flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-[#00a650]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg> Veículos
                          </span>
                          <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showVeiculosList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                        </button>
                        {showVeiculosList && (
                          <div className="p-2 max-h-48 overflow-y-auto space-y-1 border-t border-gray-100">
                            {dashboardData.veiculos?.length > 0 ? (
                              dashboardData.veiculos.map(v => (
                                <div key={v.id} className="text-xs text-gray-700 py-1.5 px-2 hover:bg-gray-50 rounded uppercase font-medium flex justify-between">
                                  <span>{v.modelo}</span><span className="font-bold text-gray-400">{v.placa}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-[10px] text-gray-400 italic p-2 text-center">Nenhum cadastrado</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative mb-3">
                <svg className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input 
                  type="text" 
                  placeholder="Buscar por Pallet, Motorista, Placa, Série, EAN..." 
                  value={termoBusca} 
                  onChange={(e) => setTermoBusca(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#00a650] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-100 shadow-sm transition placeholder:text-gray-400 font-medium" 
                />
              </div>

              {/* 🚀 MUDANÇA: Data e Checkboxes movidos para baixo do input de busca */}
              <div className="mb-4 mt-2">
                <label className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-3 block">Data</label>
                <div className="flex items-center w-full border border-gray-300 rounded-lg overflow-hidden shadow-sm bg-white">
                  <input 
                    type="date" 
                    value={dataInicio} 
                    onChange={(e) => setDataInicio(e.target.value)} 
                    className="flex-1 p-2.5 text-sm text-gray-700 focus:outline-none focus:bg-gray-50 transition"
                  />
                  <div className="bg-gray-100 px-3 py-3 text-sm font-medium text-gray-500 border-x border-gray-300">
                    Até
                  </div>
                  <input 
                    type="date" 
                    value={dataFim} 
                    onChange={(e) => setDataFim(e.target.value)} 
                    className="flex-1 p-2.5 text-sm text-gray-700 focus:outline-none focus:bg-gray-50 transition"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-6">
                <label className={`flex items-center gap-1.5 cursor-pointer bg-white px-3 py-2 rounded-lg border ${filtros.PENDENTE && filtros.CONCLUIDO && filtros.ENVIADO ? 'border-gray-400 text-gray-700' : 'border-gray-200 text-gray-500'} shadow-sm text-xs font-bold transition`}>
                  <input type="checkbox" checked={filtros.PENDENTE && filtros.CONCLUIDO && filtros.ENVIADO} onChange={toggleTodos} style={{ accentColor: '#475569' }} className="w-4 h-4 rounded cursor-pointer" />
                  Marcar Todos
                </label>
                <label className={`flex items-center gap-1.5 cursor-pointer bg-white px-3 py-2 rounded-lg border ${filtros.PENDENTE ? 'border-red-500 text-red-600' : 'border-gray-200 text-gray-500'} shadow-sm text-xs font-bold transition`}>
                  <input type="checkbox" checked={filtros.PENDENTE} onChange={() => toggleFiltro('PENDENTE')} style={{ accentColor: '#ef4444' }} className="w-4 h-4 rounded cursor-pointer" />
                  Envio Importado <span className={`ml-1 text-[13px] font-black ${filtros.PENDENTE ? 'text-red-600' : 'text-gray-500'}`}>{countPendente}</span>
                </label>
                <label className={`flex items-center gap-1.5 cursor-pointer bg-white px-3 py-2 rounded-lg border ${filtros.CONCLUIDO ? 'border-yellow-400 text-yellow-600' : 'border-gray-200 text-gray-500'} shadow-sm text-xs font-bold transition`}>
                  <input type="checkbox" checked={filtros.CONCLUIDO} onChange={() => toggleFiltro('CONCLUIDO')} style={{ accentColor: '#eab308' }} className="w-4 h-4 rounded cursor-pointer" />
                  Prontos <span className={`ml-1 text-[13px] font-black ${filtros.CONCLUIDO ? 'text-yellow-600' : 'text-gray-500'}`}>{countConcluido}</span>
                </label>
                <label className={`flex items-center gap-1.5 cursor-pointer bg-white px-3 py-2 rounded-lg border ${filtros.ENVIADO ? 'border-green-500 text-green-600' : 'border-gray-200 text-gray-500'} shadow-sm text-xs font-bold transition`}>
                  <input type="checkbox" checked={filtros.ENVIADO} onChange={() => toggleFiltro('ENVIADO')} style={{ accentColor: '#22c55e' }} className="w-4 h-4 rounded cursor-pointer" />
                  Enviados <span className={`ml-1 text-[13px] font-black ${filtros.ENVIADO ? 'text-green-600' : 'text-gray-500'}`}>{countEnviado}</span>
                </label>
              </div>

              <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-4 border-b pb-2">Envios Recentes</h3>
              <div className="space-y-4">
                {inboundsFiltrados.map(inb => {
                  let corBolinha = 'bg-red-500';
                  let textoStatus = 'Envio Importado';
                  let statusClasses = 'text-red-700 bg-red-50 border-red-100';
                  
                  if (inb.status === 'CONCLUIDO') {
                    corBolinha = 'bg-yellow-500';
                    textoStatus = 'Prontos para envio';
                    statusClasses = 'text-yellow-700 bg-yellow-50 border-yellow-100';
                  } else if (inb.status === 'ENVIADO') {
                    corBolinha = 'bg-[#00a650]';
                    textoStatus = 'Produtos enviados';
                    statusClasses = 'text-green-700 bg-green-50 border-green-100';
                  }

                  const totalEsperado = inb.skus.reduce((a:number, s:any) => a + s.quantidadeTotal, 0);
                  const totalBipado = inb.skus.reduce((a:number, s:any) => a + s.quantidadeBipada, 0);

                  return (
                    <div key={inb.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative transition hover:shadow-md cursor-pointer" onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        abrirEnvioCompleto(inb);
                    }}>
                      
                      {inb.status !== 'ENVIADO' && (
                        <button onClick={() => setModalCoord({ isOpen: true, inboundId: inb.id, acao: 'EXCLUIR', nomePallet: inb.nomePallet })} className="absolute top-4 right-4 text-red-300 hover:text-red-600 transition p-1" title="Apagar Envio">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}

                      {inb.status === 'ENVIADO' && (
                        <button onClick={(e) => { e.stopPropagation(); handleReimprimir(inb); }} className="absolute top-4 right-4 text-[#00a650] hover:text-green-700 transition p-1.5 bg-green-50 rounded-lg border border-green-200 shadow-sm" title="Reimprimir Relatório">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      )}

                      <h4 className="font-black text-gray-900 text-xl mb-1 pr-12 leading-tight break-words">{inb.nomePallet}</h4>
                      
                      <div className="flex gap-4 text-xs font-bold text-gray-500 mb-4">
                        <span>SKUs: {inb.skus.length}</span>
                        <span>UNIDADES: {totalBipado} / {totalEsperado}</span>
                      </div>
                      
                      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-[11px] font-bold mb-4 ${statusClasses}`}>
                        <span className={`w-2 h-2 rounded-full ${corBolinha}`}></span>
                        {textoStatus}
                      </div>

                      {inb.status === 'PENDENTE' && (
                        <button onClick={() => abrirEnvioCompleto(inb)} className="w-full py-2.5 bg-gray-50 border border-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-100 shadow-sm transition">
                          Continuar Bipagem
                        </button>
                      )}

                      {inb.status === 'CONCLUIDO' && (
                        <div className="flex gap-2">
                           <button onClick={() => setModalCoord({ isOpen: true, inboundId: inb.id, acao: 'ENVIAR', nomePallet: inb.nomePallet })} className="flex-[3] py-2.5 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 shadow-md flex items-center justify-center gap-2 transition">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg> ENVIAR
                           </button>
                           <button onClick={() => abrirEnvioCompleto(inb)} className="flex-[1.5] py-2.5 bg-gray-50 border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-100 shadow-sm transition flex items-center justify-center gap-1 text-[11px] uppercase">
                             Editar Ativos
                           </button>
                        </div>
                      )}

                      {inb.status === 'ENVIADO' && (
                        <button onClick={() => abrirEnvioCompleto(inb)} className="w-full py-2.5 bg-white border border-gray-200 text-gray-500 font-bold rounded-lg hover:bg-gray-50 shadow-sm transition flex items-center justify-center gap-1 text-[11px] uppercase">
                          VER DETALHES DO ENVIO
                        </button>
                      )}
                    </div>
                  );
                })}
                {inboundsFiltrados.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-8 font-medium">Nenhum envio atende aos filtros atuais.</div>
                )}
              </div>

            </div>
          </div>
        )}

        {currentScreen === 2 && (
          <div className="flex flex-col h-full bg-gray-50 animate-in slide-in-from-right-8 duration-300">
            <HeaderGlobal onClose={() => setCurrentScreen(1)} />
            <div className="p-5 flex-1">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <input type="text" value={nomePallet} onChange={(e) => setNomePallet(e.target.value)} placeholder="Identificação do Pallet" className="w-full border border-gray-300 rounded-xl p-3.5 bg-gray-50 text-sm mb-6" />
                <input type="file" accept=".txt" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center mb-8 cursor-pointer hover:bg-gray-50 transition">
                  <span className="text-sm font-semibold text-gray-600">{selectedFile ? selectedFile.name : 'Anexar Inbound (TXT)'}</span>
                </div>
                <button onClick={handleProcessarNovo} disabled={isProcessing} className="w-full text-white bg-[#00a650] font-bold py-4 rounded-xl shadow-md transition hover:bg-green-700 active:scale-[0.98]">Processar</button>
              </div>
            </div>
          </div>
        )}

        {/* TELA 3: VISÃO COMPLETA DO ENVIO */}
        {currentScreen === 3 && inboundData && (
          <div className="flex flex-col h-full bg-gray-50 animate-in duration-300">
            {skuEmBipagem ? (
               <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10 flex flex-col items-start min-h-[80px]">
                 <div className="flex w-full justify-between items-center mb-3">
                   <button onClick={fecharModoBipagem} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full transition shadow-sm border border-gray-100">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                   </button>
                   <div className="flex-1 flex items-center justify-center gap-2">
                     <span className="text-[#00a650] italic font-black text-[24px] leading-none tracking-tight flex items-center">
                       <svg className="w-5 h-5 mr-0.5 fill-[#00a650] stroke-[#00a650]" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                       FULL
                     </span>
                     <span className="font-bold text-slate-800 text-base uppercase tracking-widest mt-0.5">Gestor de Envios</span>
                   </div>
                   <div className="w-10"></div>
                 </div>
               </div>
             ) : (
               <HeaderGlobal onClose={() => { setCurrentScreen(1); carregarDashboard(); }} />
             )}
            
            {!skuEmBipagem && (
              <>
                <div className="bg-slate-800 p-6 text-white shadow-inner">
                  <div className="font-black text-2xl tracking-wide">{inboundData.nome}</div>
                  <div className="text-base text-slate-300 mt-2 font-medium flex gap-4">
                    <span><strong className="text-white">SKUs:</strong> {inboundData.totalSku}</span>
                    <span><strong className="text-white">Unidades:</strong> {inboundData.totalUnidades}</span>
                  </div>
                </div>

                {(inboundData.status === 'CONCLUIDO' || inboundData.status === 'ENVIADO') && (
                  <div className="bg-white p-4 border-b border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                     <div className="flex-1 w-full">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Motorista da Carga</label>
                        <select value={motoristaSelecionado} onChange={(e) => setMotoristaSelecionado(e.target.value)} disabled={inboundData.status === 'ENVIADO'} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#00a650] bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed">
                          <option value="">-- Selecione um Motorista --</option>
                          {dashboardData.motoristas?.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                        </select>
                     </div>
                     <div className="flex-1 w-full">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Veículo de Transporte</label>
                        <select value={veiculoSelecionado} onChange={(e) => setVeiculoSelecionado(e.target.value)} disabled={inboundData.status === 'ENVIADO'} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#00a650] bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed">
                          <option value="">-- Selecione um Veículo --</option>
                          {dashboardData.veiculos?.map(v => <option key={v.id} value={v.id}>{v.modelo} ({v.placa})</option>)}
                        </select>
                     </div>
                     {inboundData.status !== 'ENVIADO' && (
                         <button onClick={salvarEdicaoAtivosTela3} className="w-full md:w-auto bg-[#00a650] text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition shadow-sm">
                            Salvar Alterações
                         </button>
                     )}
                  </div>
                )}
              </>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              
              {!skuEmBipagem && skus.map(item => {
                const codigosMLUnicos = item.variacoes ? Array.from(new Set(item.variacoes.map(v => v.codigoML))).filter(ml => ml !== 'N/A') : [];
                
                const isPalletFinalizado = inboundData?.status === 'CONCLUIDO' || inboundData?.status === 'ENVIADO';
                const qtdBipadaReal = isPalletFinalizado ? item.quantidadeTotal : item.quantidadeBipada;
                const statusReal = isPalletFinalizado ? 'CONCLUIDO' : item.status;

                let leiturasArray: any[] = [];
                try { leiturasArray = typeof item.leituras === 'string' ? JSON.parse(item.leituras as string) : (item.leituras || []); } catch(e){}

                return (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-4 relative overflow-hidden transition-all">
                    {statusReal === 'CONCLUIDO' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00a650]"></div>}
                    <div className="flex justify-between items-start mb-2 pl-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="font-black text-gray-900 text-base">SKU {item.sku}</div>
                        {codigosMLUnicos.length > 0 && (
                          <div className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded shadow-sm">
                            Cód. ML: {codigosMLUnicos.join(', ')}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <div className={`text-sm font-black px-2 py-1 rounded ${statusReal === 'CONCLUIDO' ? 'bg-green-100 text-[#00a650]' : 'bg-gray-100 text-gray-800'}`}>
                          {qtdBipadaReal} / {item.quantidadeTotal}
                        </div>
                        {statusReal !== 'CONCLUIDO' && (
                          <div className="text-[11px] font-bold text-red-500 uppercase mt-1 tracking-wider">
                            Falta bipar: {item.quantidadeTotal - qtdBipadaReal}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-sm font-semibold text-gray-800 leading-snug mt-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm border-l-4 border-l-[#00a650]">
                      {item.descricao}
                    </div>

                    {leiturasArray.length > 0 && (
                      <div className="mt-3 mb-4 pl-2">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Seriais lidos:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {leiturasArray.map((l: any) => (
                            <span key={l.id} className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded border border-gray-200">
                              {l.codigo}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <button onClick={() => setSkuEmBipagem(item)} className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 transition flex items-center justify-center gap-1.5 mt-3">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Abrir Produto
                    </button>
                  </div>
                );
              })}

              {skuEmBipagem && (
                <div className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6 relative transition-all duration-300 ${showSucessoProduto ? 'ring-4 ring-[#00a650] bg-green-50' : ''}`}>
                  
                  {showSucessoProduto && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm animate-in fade-in">
                      <div className="w-16 h-16 bg-[#00a650] text-white rounded-full flex items-center justify-center mb-2 shadow-lg animate-bounce">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                      </div>
                      <span className="font-black text-[#00a650] text-lg">Produto Concluído!</span>
                    </div>
                  )}

                  <div className="p-4 border-b border-gray-100 flex flex-col gap-4 bg-white">
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-black text-gray-900 text-[18px]">SKU: {skuEmBipagem.sku}</div>
                          {skuEmBipagem.variacoes && skuEmBipagem.variacoes.length > 0 && (
                            <div className="text-[11px] font-bold text-green-700 mt-1 inline-block border border-green-200 bg-green-50 px-1.5 py-0.5 rounded">
                               Cód. ML: {Array.from(new Set(skuEmBipagem.variacoes.map(v => v.codigoML))).filter(ml => ml !== 'N/A').join(', ')}
                            </div>
                          )}
                        </div>
                        
                        {inboundData?.status === 'ENVIADO' && skuEmBipagem.leituras && skuEmBipagem.leituras.length > 0 && (
                           <div className="text-right">
                             <div className="text-[9px] font-bold text-gray-400 uppercase">Concluído às</div>
                             <div className="text-xs font-black text-[#00a650]">
                               {(() => {
                                  try {
                                    let leits = typeof skuEmBipagem.leituras === 'string' ? JSON.parse(skuEmBipagem.leituras) : skuEmBipagem.leituras;
                                    if(leits.length > 0) {
                                      const ultima = leits[0]; 
                                      return new Date(ultima.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                    }
                                  }catch(e){}
                                  return '--:--';
                               })()}
                             </div>
                           </div>
                        )}
                      </div>
                      
                      <div className="text-sm font-semibold text-gray-800 leading-snug mt-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm border-l-4 border-l-[#00a650]">
                        {skuEmBipagem.descricao}
                      </div>
                    </div>
                    
                    {inboundData?.status !== 'ENVIADO' ? (
                      <div className="flex gap-3">
                        <div className="flex-1 text-center bg-red-50 border border-red-200 p-3 rounded-xl shadow-sm flex flex-col justify-center">
                          <div className="text-[10px] font-black text-red-500 uppercase tracking-widest">Faltam</div>
                          <div className={`text-3xl font-black leading-none mt-1 ${skuEmBipagem.quantidadeTotal - skuEmBipagem.quantidadeBipada === 0 ? 'text-gray-300' : 'text-red-600'}`}>
                            {skuEmBipagem.quantidadeTotal - skuEmBipagem.quantidadeBipada}
                          </div>
                        </div>
                        <div className="flex-1 text-center bg-green-50 border border-green-200 p-3 rounded-xl shadow-sm flex flex-col justify-center">
                          <div className="text-[10px] font-black text-[#00a650] uppercase tracking-widest">Bipados</div>
                          <div className={`text-3xl font-black leading-none mt-1 ${skuEmBipagem.quantidadeBipada >= skuEmBipagem.quantidadeTotal ? 'text-[#00a650]' : 'text-gray-900'}`}>
                            {skuEmBipagem.quantidadeBipada}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full py-4 text-center bg-gray-200 text-gray-500 font-black text-[15px] rounded-xl shadow-inner uppercase tracking-wider">
                        Envio já despachado
                      </div>
                    )}
                  </div>
                  
                  {inboundData?.status !== 'ENVIADO' && (
                    <div className="p-5 bg-gray-50">
                      {!isScanning ? (
                        <button 
                          onClick={() => setIsScanning(true)} 
                          className="w-full py-4 bg-[#00a650] text-white font-bold text-[15px] rounded-xl shadow-md hover:bg-green-700 transition active:scale-[0.98]"
                        >
                          Iniciar Bipagem
                        </button>
                      ) : (
                        <div>
                          
                          {!modoTravado ? (
                            <div className="mb-4">
                              <p className="text-center text-xs font-bold text-gray-500 uppercase mb-2">Confirmar modo de bipagem:</p>
                              <div className="flex gap-2 p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm">
                                <button onClick={() => setModoBipagem('SKU_EAN')} className={`flex-1 py-3 text-xs font-bold rounded-md transition ${modoBipagem === 'SKU_EAN' ? 'bg-[#00a650] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>SKU / EAN</button>
                                <button onClick={() => setModoBipagem('SERIE')} className={`flex-1 py-3 text-xs font-bold rounded-md transition ${modoBipagem === 'SERIE' ? 'bg-[#00a650] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>Número de Série</button>
                              </div>
                              <button onClick={() => setModoTravado(true)} className="w-full mt-3 py-3 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-900 transition shadow-sm">
                                Confirmar & Iniciar
                              </button>
                            </div>
                          ) : (
                            <div className="animate-in fade-in zoom-in-95 duration-200">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00a650]"></span></span>
                                  <span className="text-xs font-bold text-[#00a650]">Leitor Ativo ({modoBipagem === 'SERIE' ? 'Série' : 'SKU/EAN'})</span>
                                </div>
                                <button onClick={() => {setModoTravado(false); setMascaraSerie(null);}} className="text-[10px] font-bold text-gray-400 hover:text-gray-700 uppercase bg-gray-200 px-2 py-1 rounded">Trocar Modo</button>
                              </div>

                              {modoBipagem === 'SERIE' && mascaraSerie && (
                                <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                    Padrão: {mascaraSerie}
                                  </span>
                                  
                                  {skuEmBipagem.quantidadeBipada === 0 ? (
                                    <button type="button" onClick={resetarMascara} className="text-[10px] uppercase font-bold text-blue-500 hover:text-blue-800 underline">Redefinir</button>
                                  ) : (
                                    <span className="text-[9px] uppercase font-bold text-blue-400">Em uso</span>
                                  )}
                                </div>
                              )}

                              <form onSubmit={handleBipar}>
                                <input 
                                  ref={inputBipagemRef} 
                                  type="text" 
                                  value={codigoLido} 
                                  onChange={(e) => setCodigoLido(e.target.value)} 
                                  placeholder={
                                    modoBipagem === 'SERIE' 
                                      ? (!mascaraSerie ? "Bipe o 1º Serial para definir o padrão..." : "Bipe o próximo Serial...") 
                                      : "Bipar código..."
                                  } 
                                  className="w-full border-2 border-[#00a650] rounded-xl p-4 text-center font-bold text-gray-800 focus:outline-none focus:ring-4 focus:ring-green-100 transition shadow-inner bg-white placeholder:text-gray-400 placeholder:font-medium" 
                                />
                                <button type="submit" className="hidden"></button>
                              </form>
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  )}

                  {skuEmBipagem.leituras && skuEmBipagem.leituras.length > 0 && (
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                       <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Histórico de Bipagem</h4>
                      <ul className="space-y-1.5 max-h-32 overflow-y-auto pr-2">
                        {(() => {
                           let leiturasArray = [];
                           try { leiturasArray = typeof skuEmBipagem.leituras === 'string' ? JSON.parse(skuEmBipagem.leituras) : (skuEmBipagem.leituras || []); } catch(e){}
                           
                           return [...leiturasArray].reverse().map((l: any) => (
                             <li key={l.id} className="flex justify-between items-center bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                               <div className="flex items-center gap-2">
                                 <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${l.tipo === 'SERIE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-[#00a650]'}`}>{l.tipo === 'SERIE' ? 'SÉRIE' : 'SKU/EAN'}</span>
                                 <span className="text-sm font-bold text-gray-800">{l.codigo}</span>
                               </div>
                               
                               {inboundData?.status !== 'ENVIADO' && (
                                 <button type="button" onClick={() => handleRemoverLeitura(l.id)} className="text-gray-300 hover:text-red-500 p-2 transition">
                                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                 </button>
                               )}
                             </li>
                           ));
                        })()}
                      </ul>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}