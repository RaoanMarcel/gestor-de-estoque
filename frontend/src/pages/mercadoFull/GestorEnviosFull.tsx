import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/toastContext';

interface Variacao { codigoML: string; codigoUniversal: string; quantidade: number; }
interface Leitura { id: string; codigo: string; tipo: 'SKU_EAN' | 'SERIE'; }
interface InboundSKU {
  id: number; sku: string; descricao: string; quantidadeTotal: number;
  quantidadeBipada: number; status: 'PENDENTE' | 'CONCLUIDO';
  variacoes?: Variacao[]; leituras?: Leitura[];
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

  const [inboundData, setInboundData] = useState<{ id: number, nome: string, totalSku: number, totalUnidades: number } | null>(null);
  const [skus, setSkus] = useState<InboundSKU[]>([]);
  const [skuEmBipagem, setSkuEmBipagem] = useState<InboundSKU | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [codigoLido, setCodigoLido] = useState('');
  const [modoBipagem, setModoBipagem] = useState<'SKU_EAN' | 'SERIE'>('SKU_EAN');
  const [mascaraSerie, setMascaraSerie] = useState<string | null>(null);
  const inputBipagemRef = useRef<HTMLInputElement>(null);
  
  const [modoTravado, setModoTravado] = useState(false);
  const [showSucessoProduto, setShowSucessoProduto] = useState(false);
  
  // MODAL DE FINALIZAÇÃO E EDIÇÃO
  const [showModalFinalizarEnvio, setShowModalFinalizarEnvio] = useState(false);
  const [motoristaSelecionado, setMotoristaSelecionado] = useState('');
  const [veiculoSelecionado, setVeiculoSelecionado] = useState('');
  const [isEditandoEnvio, setIsEditandoEnvio] = useState(false); 
  
  const [showModalMotorista, setShowModalMotorista] = useState(false);
  const [nomeMotorista, setNomeMotorista] = useState('');
  const [showModalVeiculo, setShowModalVeiculo] = useState(false);
  const [nomeVeiculo, setNomeVeiculo] = useState('');
  const [placaVeiculo, setPlacaVeiculo] = useState('');

  // Dropdowns Tela Inicial
  const [showMotoristasList, setShowMotoristasList] = useState(false);
  const [showVeiculosList, setShowVeiculosList] = useState(false);

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
    if (currentScreen === 1) carregarDashboard();
  }, [currentScreen]);

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
      setNomeMotorista(''); setShowModalMotorista(false); setShowMotoristasList(true); carregarDashboard();
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
      setNomeVeiculo(''); setPlacaVeiculo(''); setShowModalVeiculo(false); setShowVeiculosList(true); carregarDashboard();
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.mensagem);
      setModalCoord({ isOpen: false, inboundId: null, acao: null, nomePallet: '' });
      carregarDashboard();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setSelectedFile(e.target.files[0]);
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

  const continuarBipagem = (inb: any) => {
    const totalUnidadesCalc = inb.skus.reduce((acc: number, item: any) => acc + item.quantidadeTotal, 0);
    setInboundData({ id: inb.id, nome: inb.nomePallet, totalSku: inb.skus.length, totalUnidades: totalUnidadesCalc });
    setSkus(inb.skus);
    setCurrentScreen(3);
    setSkuEmBipagem(null);
    setIsScanning(false);
    setModoTravado(false);
    setMascaraSerie(null);
  };

  const abrirEdicaoEnvio = (inb: any) => {
    setInboundData({ id: inb.id, nome: inb.nomePallet, totalSku: inb.skus.length, totalUnidades: 0 }); 
    setMotoristaSelecionado(inb.motoristaId ? String(inb.motoristaId) : '');
    setVeiculoSelecionado(inb.veiculoId ? String(inb.veiculoId) : '');
    setIsEditandoEnvio(true);
    setShowModalFinalizarEnvio(true);
  };

  const confirmarFinalizacaoEnvio = async () => {
    if (!inboundData) return;
    try {
      const token = localStorage.getItem('wms_token');
      const res = await fetch(`${API_URL}/inbounds/${inboundData.id}/finalizar`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ motoristaId: motoristaSelecionado, veiculoId: veiculoSelecionado })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success(isEditandoEnvio ? 'Dados atualizados com sucesso!' : data.mensagem);
      setShowModalFinalizarEnvio(false);
      setIsEditandoEnvio(false);
      
      if (!isEditandoEnvio) setCurrentScreen(1); 
      else carregarDashboard(); 
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
      const novaLeitura: Leitura = { id: Math.random().toString(36).substring(2, 11), codigo: codigoLimpo, tipo: modoBipagem };
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
      
      const todosConcluidos = updatedSkus.every(sku => sku.quantidadeBipada >= sku.quantidadeTotal);
      if (todosConcluidos) {
        setIsEditandoEnvio(false); 
        setShowModalFinalizarEnvio(true);
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

  // ==========================================
  // CABEÇALHO GLOBAL (ATUALIZADO)
  // ==========================================
  const HeaderGlobal = ({ showClose = true, onClose = () => navigate('/') }) => (
    <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10 flex items-center justify-between min-h-[90px]">
      {/* Spacer Esquerdo */}
      <div className="w-12 h-12"></div> 
      
      {/* Bloco Central (Logo e Título) */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-blue-600 italic font-black text-3xl leading-none tracking-tight">⚡ FULL</span>
        </div>
        <span className="font-bold text-slate-800 text-lg uppercase tracking-widest mt-1">Gestor de Envios</span>
      </div>

      {/* Botão Direito */}
      {showClose ? (
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full transition shadow-sm border border-gray-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      ) : (
        <div className="w-12 h-12"></div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F8FC] md:p-8 flex items-start justify-center font-sans antialiased relative">
      
      {/* MODAL COORDENADOR */}
      {modalCoord.isOpen && (
        <div className="fixed inset-0 z-[110] w-screen h-screen flex items-center justify-center bg-slate-900/40 backdrop-blur-[3px] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className={`p-4 border-b flex justify-between items-center text-white ${modalCoord.acao === 'EXCLUIR' ? 'bg-red-600' : 'bg-emerald-600'}`}>
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
                <button type="submit" className={`flex-1 font-bold py-3 rounded-xl transition shadow-md text-white ${modalCoord.acao === 'EXCLUIR' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FINALIZAÇÃO E EDIÇÃO */}
      {showModalFinalizarEnvio && (
        <div className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center bg-slate-900/30 backdrop-blur-[3px] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isEditandoEnvio ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isEditandoEnvio ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>}
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">{isEditandoEnvio ? 'Editar Ativos' : 'Carga 100% Conferida!'}</h3>
                <p className="text-sm text-gray-600">{isEditandoEnvio ? 'Atualize o motorista ou veículo.' : 'Escolha a frota para fechar este envio!'}</p>
              </div>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Motorista</label>
                  <select value={motoristaSelecionado} onChange={(e) => setMotoristaSelecionado(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 bg-gray-50">
                    <option value="">-- Escolha --</option>
                    {dashboardData.motoristas?.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Veículo</label>
                  <select value={veiculoSelecionado} onChange={(e) => setVeiculoSelecionado(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 bg-gray-50">
                    <option value="">-- Escolha --</option>
                    {dashboardData.veiculos?.map(v => <option key={v.id} value={v.id}>{v.modelo} ({v.placa})</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowModalFinalizarEnvio(false)} className="flex-1 py-3 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancelar</button>
                <button onClick={confirmarFinalizacaoEnvio} disabled={!motoristaSelecionado || !veiculoSelecionado} className="flex-1 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md transition">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOTORISTA */}
      {showModalMotorista && (
        <div className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center bg-slate-900/30 backdrop-blur-[3px] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-gray-50 p-4 border-b flex justify-between items-center"><h3 className="font-bold">Cadastrar Motorista</h3><button onClick={() => setShowModalMotorista(false)}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <form onSubmit={handleSalvarMotorista} className="p-5">
              <input type="text" value={nomeMotorista} onChange={(e) => setNomeMotorista(e.target.value)} placeholder="Nome Completo" className="w-full border rounded-lg p-3 text-sm mb-5 focus:ring-2 focus:ring-emerald-500" autoFocus/>
              <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700">Salvar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VEÍCULO */}
      {showModalVeiculo && (
        <div className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center bg-slate-900/30 backdrop-blur-[3px] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-gray-50 p-4 border-b flex justify-between items-center"><h3 className="font-bold">Cadastrar Veículo</h3><button onClick={() => setShowModalVeiculo(false)}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <form onSubmit={handleSalvarVeiculo} className="p-5">
              <input type="text" value={nomeVeiculo} onChange={(e) => setNomeVeiculo(e.target.value)} placeholder="Modelo / Nome" className="w-full border rounded-lg p-3 text-sm mb-4 focus:ring-2 focus:ring-emerald-500" autoFocus/>
              <input type="text" value={placaVeiculo} onChange={(e) => setPlacaVeiculo(e.target.value.toUpperCase())} placeholder="ABC-1234" maxLength={8} className="w-full border rounded-lg p-3 text-sm mb-5 uppercase tracking-widest font-bold focus:ring-2 focus:ring-emerald-500"/>
              <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700">Salvar</button>
            </form>
          </div>
        </div>
      )}

      {/* CONTAINER PRINCIPAL */}
      <div className="w-full min-h-screen md:min-h-0 md:max-w-2xl bg-white md:rounded-2xl md:shadow-xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-300">
        
        {/* TELA 1: TORRE DE CONTROLE (DASHBOARD) */}
        {currentScreen === 1 && (
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            <HeaderGlobal />
            <div className="p-5 flex-1 bg-gray-50 flex flex-col overflow-y-auto">
              
              <button onClick={() => setCurrentScreen(2)} className="w-full bg-[#1e293b] text-emerald-500 font-semibold py-4 rounded-xl mb-6 flex items-center justify-center gap-2 transition hover:bg-slate-800 shadow-md">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg> Adicionar Novo Envio
              </button>
              
              <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-3">Gerenciamento de Ativos</h3>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <button onClick={() => setShowModalMotorista(true)} className="w-full bg-white border border-gray-200 text-emerald-600 font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-50 transition"><span className="text-lg leading-none">+</span> Motorista</button>
                <button onClick={() => setShowModalVeiculo(true)} className="w-full bg-white border border-gray-200 text-emerald-600 font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-50 transition"><span className="text-lg leading-none">+</span> Veículo</button>
              </div>
              
              {/* DROPDOWNS DE ATIVOS */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                {/* Accordion Motoristas */}
                <div className="border border-gray-200 bg-white rounded-lg overflow-hidden shadow-sm">
                  <button onClick={() => setShowMotoristasList(!showMotoristasList)} className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition">
                    <span className="text-[11px] font-bold text-gray-600 uppercase flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> Motoristas
                    </span>
                    <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showMotoristasList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  {showMotoristasList && (
                    <div className="p-2 max-h-32 overflow-y-auto space-y-1">
                      {dashboardData.motoristas?.length > 0 ? (
                        dashboardData.motoristas.map(m => (
                          <div key={m.id} className="text-xs text-gray-700 py-1 px-2 hover:bg-gray-50 rounded uppercase font-medium">{m.nome}</div>
                        ))
                      ) : (
                        <div className="text-[10px] text-gray-400 italic p-2 text-center">Nenhum cadastrado</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Accordion Veículos */}
                <div className="border border-gray-200 bg-white rounded-lg overflow-hidden shadow-sm">
                  <button onClick={() => setShowVeiculosList(!showVeiculosList)} className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition">
                    <span className="text-[11px] font-bold text-gray-600 uppercase flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg> Veículos
                    </span>
                    <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showVeiculosList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  {showVeiculosList && (
                    <div className="p-2 max-h-32 overflow-y-auto space-y-1">
                      {dashboardData.veiculos?.length > 0 ? (
                        dashboardData.veiculos.map(v => (
                          <div key={v.id} className="text-xs text-gray-700 py-1 px-2 hover:bg-gray-50 rounded uppercase font-medium flex justify-between">
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

              {/* LISTA DE INBOUNDS */}
              <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-4 border-b pb-2">Envios Recentes</h3>
              <div className="space-y-4">
                {dashboardData.inbounds && dashboardData.inbounds.map(inb => {
                  let corBolinha = 'bg-red-500';
                  let textoStatus = 'Envio Importado';
                  let statusClasses = 'text-red-700 bg-red-50 border-red-100';
                  
                  if (inb.status === 'CONCLUIDO') {
                    corBolinha = 'bg-yellow-500';
                    textoStatus = 'Prontos para envio';
                    statusClasses = 'text-yellow-700 bg-yellow-50 border-yellow-100';
                  } else if (inb.status === 'ENVIADO') {
                    corBolinha = 'bg-emerald-500';
                    textoStatus = 'Produtos enviados';
                    statusClasses = 'text-emerald-700 bg-emerald-50 border-emerald-100';
                  }

                  const totalEsperado = inb.skus.reduce((a:number, s:any) => a + s.quantidadeTotal, 0);
                  const totalBipado = inb.skus.reduce((a:number, s:any) => a + s.quantidadeBipada, 0);

                  return (
                    <div key={inb.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative transition hover:shadow-md cursor-pointer" onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        if (inb.status !== 'ENVIADO') continuarBipagem(inb);
                    }}>
                      
                      {inb.status !== 'ENVIADO' && (
                        <button onClick={() => setModalCoord({ isOpen: true, inboundId: inb.id, acao: 'EXCLUIR', nomePallet: inb.nomePallet })} className="absolute top-4 right-4 text-red-300 hover:text-red-600 transition p-1" title="Apagar Envio">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}

                      <h4 className="font-black text-gray-900 text-lg mb-1 pr-8 group-hover:text-emerald-600 transition">{inb.nomePallet}</h4>
                      <div className="flex gap-4 text-xs font-bold text-gray-500 mb-4">
                        <span>SKUs: {inb.skus.length}</span>
                        <span>UNIDADES: {totalBipado} / {totalEsperado}</span>
                      </div>
                      
                      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-[11px] font-bold mb-4 ${statusClasses}`}>
                        <span className={`w-2 h-2 rounded-full ${corBolinha}`}></span>
                        {textoStatus}
                      </div>

                      {inb.status === 'PENDENTE' && (
                        <button onClick={() => continuarBipagem(inb)} className="w-full py-2.5 bg-gray-50 border border-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-100 shadow-sm transition">
                          Continuar Bipagem
                        </button>
                      )}

                      {inb.status === 'CONCLUIDO' && (
                        <div className="flex gap-2">
                           <button onClick={() => setModalCoord({ isOpen: true, inboundId: inb.id, acao: 'ENVIAR', nomePallet: inb.nomePallet })} className="flex-[3] py-2.5 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 shadow-md flex items-center justify-center gap-2 transition">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg> ENVIAR
                           </button>
                           <button onClick={() => abrirEdicaoEnvio(inb)} className="flex-[1.5] py-2.5 bg-gray-50 border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-100 shadow-sm transition flex items-center justify-center gap-1 text-[11px] uppercase">
                             Editar Ativos
                           </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {(!dashboardData.inbounds || dashboardData.inbounds.length === 0) && (
                  <div className="text-center text-gray-400 text-sm py-8 font-medium">Nenhum envio processado ainda.</div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TELA 2: NOVO ENVIO */}
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
                <button onClick={handleProcessarNovo} disabled={isProcessing} className="w-full text-white bg-emerald-600 font-bold py-4 rounded-xl shadow-md transition hover:bg-emerald-700 active:scale-[0.98]">Processar</button>
              </div>
            </div>
          </div>
        )}

        {/* TELA 3: BIPAGEM */}
        {currentScreen === 3 && inboundData && (
          <div className="flex flex-col h-full bg-gray-50 animate-in duration-300">
            {skuEmBipagem ? (
               <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10 flex items-center justify-between min-h-[90px]">
                 <button onClick={fecharModoBipagem} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full transition shadow-sm border border-gray-100">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                 </button>
                 <div className="flex-1 flex flex-col items-center justify-center -mt-1">
                   <div className="flex items-center gap-1.5 mb-0.5">
                     <span className="text-blue-600 italic font-black text-3xl leading-none tracking-tight">⚡ FULL</span>
                   </div>
                   <span className="font-bold text-slate-800 text-lg uppercase tracking-widest mt-1">Gestor de Envios</span>
                 </div>
                 <div className="w-10"></div>
               </div>
             ) : (
               <HeaderGlobal onClose={() => { setCurrentScreen(1); carregarDashboard(); }} />
             )}
            
            {!skuEmBipagem && (
              <div className="bg-slate-800 p-5 text-white">
                <div className="font-bold text-lg">{inboundData.nome}</div>
                <div className="text-sm text-slate-300 mt-1 font-medium">SKUs: {inboundData.totalSku} • Unidades: {inboundData.totalUnidades}</div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              
              {/* LISTA DE SKUS */}
              {!skuEmBipagem && skus.map(item => {
                const codigosMLUnicos = item.variacoes ? Array.from(new Set(item.variacoes.map(v => v.codigoML))).filter(ml => ml !== 'N/A') : [];
                return (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-4 relative overflow-hidden transition-all">
                    {item.status === 'CONCLUIDO' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>}
                    <div className="flex justify-between items-start mb-2 pl-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="font-bold text-gray-900">SKU {item.sku}</div>
                        {codigosMLUnicos.length > 0 && (
                          <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shadow-sm">
                            Cód. ML: {codigosMLUnicos.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className={`text-xs font-semibold px-2 py-1 rounded ${item.status === 'CONCLUIDO' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>{item.quantidadeBipada} / {item.quantidadeTotal}</div>
                    </div>
                    <div className="text-xs text-gray-600 mb-4 pl-2 line-clamp-2">{item.descricao}</div>
                    <button onClick={() => setSkuEmBipagem(item)} className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 transition flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Abrir Produto
                    </button>
                  </div>
                );
              })}

              {/* TELA DE BIPAGEM DO PRODUTO */}
              {skuEmBipagem && (
                <div className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6 relative transition-all duration-300 ${showSucessoProduto ? 'ring-4 ring-emerald-400 bg-emerald-50' : ''}`}>
                  
                  {showSucessoProduto && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm animate-in fade-in">
                      <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-2 shadow-lg animate-bounce">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                      </div>
                      <span className="font-black text-emerald-700 text-lg">Produto Concluído!</span>
                    </div>
                  )}

                  <div className="p-4 border-b border-gray-100 flex justify-between bg-gray-50/50">
                    <div className="flex-1 pr-4">
                      
                      <div className="font-black text-gray-900 text-[15px]">SKU: {skuEmBipagem.sku}</div>
                      {skuEmBipagem.variacoes && skuEmBipagem.variacoes.length > 0 && (
                        <div className="text-[11px] font-bold text-emerald-700 mt-1">
                           Cód. ML: {Array.from(new Set(skuEmBipagem.variacoes.map(v => v.codigoML))).filter(ml => ml !== 'N/A').join(', ')}
                        </div>
                      )}
                      <div className="text-xs text-gray-600 leading-snug mt-1.5">{skuEmBipagem.descricao}</div>
                    </div>
                    <div className="text-center bg-white border border-gray-200 p-2 rounded-lg min-w-[70px] shadow-sm flex flex-col justify-center h-max mt-8">
                      <div className="text-[9px] font-bold text-gray-400 uppercase">Bipados</div>
                      <div className={`text-2xl font-black leading-none mt-1 ${skuEmBipagem.quantidadeBipada >= skuEmBipagem.quantidadeTotal ? 'text-emerald-500' : 'text-gray-900'}`}>{skuEmBipagem.quantidadeBipada}</div>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    {!isScanning ? (
                      <button onClick={() => setIsScanning(true)} className="w-full py-4 bg-emerald-600 text-white font-bold text-[15px] rounded-xl shadow-md hover:bg-emerald-700 transition active:scale-[0.98]">
                        Iniciar Bipagem
                      </button>
                    ) : (
                      <div>
                        
                        {!modoTravado ? (
                          <div className="mb-4">
                            <p className="text-center text-xs font-bold text-gray-500 uppercase mb-2">Confirmar modo de bipagem:</p>
                            <div className="flex gap-2 p-1.5 bg-gray-100 border border-gray-200 rounded-lg">
                              <button onClick={() => setModoBipagem('SKU_EAN')} className={`flex-1 py-3 text-xs font-bold rounded-md transition ${modoBipagem === 'SKU_EAN' ? 'bg-white text-emerald-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}>SKU / EAN</button>
                              <button onClick={() => setModoBipagem('SERIE')} className={`flex-1 py-3 text-xs font-bold rounded-md transition ${modoBipagem === 'SERIE' ? 'bg-white text-emerald-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}>Número de Série</button>
                            </div>
                            <button onClick={() => setModoTravado(true)} className="w-full mt-3 py-3 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-900 transition shadow-sm">
                              Confirmar & Iniciar
                            </button>
                          </div>
                        ) : (
                          <div className="animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span>
                                <span className="text-xs font-bold text-emerald-600">Leitor Ativo ({modoBipagem === 'SERIE' ? 'Série' : 'SKU/EAN'})</span>
                              </div>
                              <button onClick={() => {setModoTravado(false); setMascaraSerie(null);}} className="text-[10px] font-bold text-gray-400 hover:text-gray-700 uppercase bg-gray-100 px-2 py-1 rounded">Trocar Modo</button>
                            </div>

                            {modoBipagem === 'SERIE' && mascaraSerie && (
                              <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                                <span className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                  Padrão: {mascaraSerie}
                                </span>
                                <button type="button" onClick={resetarMascara} className="text-[10px] uppercase font-bold text-blue-500 hover:text-blue-800 underline">Redefinir</button>
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
                                className="w-full border-2 border-emerald-500 rounded-xl p-4 text-center font-bold text-gray-800 focus:outline-none focus:ring-4 focus:ring-emerald-100 transition shadow-inner bg-emerald-50 placeholder:text-emerald-300 placeholder:font-medium" 
                              />
                              <button type="submit" className="hidden"></button>
                            </form>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                  {skuEmBipagem.leituras && skuEmBipagem.leituras.length > 0 && (
                    <div className="p-4 bg-gray-50 border-t border-gray-100">
                       <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Histórico Recente</h4>
                      <ul className="space-y-1.5 max-h-32 overflow-y-auto pr-2">
                        {[...skuEmBipagem.leituras].reverse().map(l => (
                          <li key={l.id} className="flex justify-between items-center bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${l.tipo === 'SERIE' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{l.tipo === 'SERIE' ? 'SÉRIE' : 'SKU/EAN'}</span>
                              <span className="text-xs font-semibold text-gray-700">{l.codigo}</span>
                            </div>
                            <button type="button" onClick={() => handleRemoverLeitura(l.id)} className="text-gray-300 hover:text-red-500 p-1 transition">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </li>
                        ))}
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