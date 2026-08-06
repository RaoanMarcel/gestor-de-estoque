import { useState, useEffect } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/toastContext'; 
import { usePallets } from './hooks/usePallets';
import { imprimirEtiqueta } from './components/utils/imprimirEtiqueta';
import HomeHeader from './components/parts/HomeHeader';
import ScannerBar from './components/parts/ScannerBar';
import MetricasPanel from './components/parts/MetricasPanel';
import MalhaEnderecamento from './components/parts/MalhaEnderecamento';
import ModalCriarPallet from './components/parts/ModalCriarPallet';
import ModalExportarExcel from './components/parts/ModalExportarExcel';
import ModalRastreabilidade from './components/parts/ModalRastreabilidade'; 

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Home() {
  const navigate = useNavigate();
  const toast = useToast(); 

  const {
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
    handleCriarPallet,
    carregarPallets 
  } = usePallets();

  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [palletSelecionado, setPalletSelecionado] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [carregandoExcel, setCarregandoExcel] = useState(false);
  const [isRastreabilidadeOpen, setIsRastreabilidadeOpen] = useState(false); 
  
  const [totalItensEstoque, setTotalItensEstoque] = useState(0);

  useEffect(() => {
    const buscarTotalAbsoluto = async () => {
      try {
        const token = localStorage.getItem('wms_token');
        const res = await fetch(`${API_URL}/pallets`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (res.ok) {
          const data = await res.json();
          const somaTriagem = data.reduce((acc: number, p: any) => {
            const tipoPallet = p.tipo?.toUpperCase() || 'PADRAO';
            if (tipoPallet === 'PADRAO' || tipoPallet === '') {
              return acc + (p._count?.produtos || 0);
            }
            return acc;
          }, 0);
          setTotalItensEstoque(somaTriagem);
        }
      } catch (error) {
        console.error("Erro ao calcular total", error);
      }
    };
    buscarTotalAbsoluto();
  }, [palletsFiltrados]); 

  const totalPallets = palletsFiltrados.length;
  const palletsOcupados = palletsFiltrados.filter(p => (p._count?.produtos || 0) >= 140).length;
  const palletsVazios = totalPallets - palletsOcupados;

  const handleExcluirPalletCard = async (e: MouseEvent, palletId: number, numeroPallet: string) => {
    e.stopPropagation(); 
    
    const confirmou = await toast.confirm(`Deseja realmente excluir permanentemente a posição "${numeroPallet}" da malha?`);
    if (!confirmou) return;

    try {
      const token = localStorage.getItem('wms_token');

      const response = await fetch(`${API_URL}/pallets/${numeroPallet}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const resultado = await response.json();

      if (!response.ok) {
        toast.error(resultado.error || "Não foi possível excluir o pallet.");
        return;
      }

      toast.success(resultado.mensagem || "Posição removida com sucesso!");
      carregarPallets(); 
    } catch {
      toast.error("Erro de conexão ao tentar excluir a posição.");
    }
  };

  const handleExportarExcel = async (e: FormEvent) => {
    e.preventDefault();
    if (!palletSelecionado) return toast.error("Por favor, selecione uma opção!");
    setCarregandoExcel(true);
    
    try {
      const token = localStorage.getItem('wms_token');

      let urlEndpoint = `${API_URL}/historico/exportar`;
      let corpoRequisicao: any = { palletAlvo: palletSelecionado, nomeArquivo };
      let configuracaoFetch: any = {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(corpoRequisicao)
      };

      if (palletSelecionado === 'FLUXO_RMA_SISTEMA') {
        urlEndpoint = `${API_URL}/historico/exportar-rma`;
        configuracaoFetch = { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } };
      } else if (palletSelecionado === 'TODOS_ITENS_GERAL') {
        urlEndpoint = `${API_URL}/historico/exportar-geral`;
        configuracaoFetch = { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } };
      }

      const response = await fetch(urlEndpoint, configuracaoFetch);
      
      if (!response.ok) {
        const erroDados = await response.json();
        throw new Error(erroDados.error || "Erro ao gerar planilha");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      if (palletSelecionado === 'FLUXO_RMA_SISTEMA') {
        a.download = nomeArquivo ? `${nomeArquivo}.xlsx` : `relatorio-estoque-fantasma-rma.xlsx`;
      } else if (palletSelecionado === 'TODOS_ITENS_GERAL') {
        a.download = nomeArquivo ? `${nomeArquivo}.xlsx` : `relatorio-geral-estoque.xlsx`;
      } else {
        a.download = nomeArquivo ? `${nomeArquivo}.xlsx` : `historico-${palletSelecionado}.xlsx`;
      }
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      setIsExcelModalOpen(false);
      setPalletSelecionado('');
      setNomeArquivo('');
    } catch (error: any) {
      toast.error(error.message || "Erro ao baixar o relatório.");
    } finally {
      setCarregandoExcel(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F6F8FC] text-slate-800 antialiased overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.14),transparent_70%)] blur-3xl" />
        <div className="absolute top-1/3 -right-52 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.10),transparent_70%)] blur-3xl" />
        <div className="absolute -bottom-52 left-1/4 w-[650px] h-[650px] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.10),transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(246,248,252,0.6))]" />
      </div>

      <div className="relative max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        <HomeHeader setIsExcelModalOpen={setIsExcelModalOpen} setIsModalOpen={setIsModalOpen} />

        <div className="flex flex-col sm:flex-row gap-4 items-stretch">
          <div className="flex-1">
            <ScannerBar
              handleQrBipado={handleQrBipado}
              qrCodeBipado={qrCodeBipado}
              setQrCodeBipado={setQrCodeBipado}
              qrInputRef={qrInputRef}
            />
          </div>
          
          <button
            onClick={() => setIsRastreabilidadeOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-4 sm:py-0 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl font-semibold text-sm transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            Rastrear Item
          </button>
        </div>

        <MetricasPanel totalPallets={totalPallets} palletsOcupados={palletsOcupados} palletsVazios={palletsVazios} totalItensEstoque={totalItensEstoque} />

        <MalhaEnderecamento
          busca={busca}
          setBusca={setBusca}
          palletsFiltrados={palletsFiltrados}
          navigate={navigate}
          handleExcluirPalletCard={handleExcluirPalletCard}
          imprimirEtiqueta={imprimirEtiqueta}
        />

        <ModalCriarPallet
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          form={form}
          setForm={setForm}
          handleCriarPallet={handleCriarPallet}
        />

        <ModalExportarExcel
          isExcelModalOpen={isExcelModalOpen}
          setIsExcelModalOpen={setIsExcelModalOpen}
          palletSelecionado={palletSelecionado}
          setPalletSelecionado={setPalletSelecionado}
          nomeArquivo={nomeArquivo}
          setNomeArquivo={setNomeArquivo}
          carregandoExcel={carregandoExcel}
          handleExportarExcel={handleExportarExcel}
          palletsFiltrados={palletsFiltrados}
        />

        <ModalRastreabilidade 
          isOpen={isRastreabilidadeOpen} 
          onClose={() => setIsRastreabilidadeOpen(false)} 
        />
      </div>
    </div>
  );
}