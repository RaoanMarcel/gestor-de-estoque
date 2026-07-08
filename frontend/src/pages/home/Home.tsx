import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePallets } from './hooks/usePallets';
import Button from './components/ui/Button';
import Input from './components/ui/Input';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';


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

export default function Home() {
  const navigate = useNavigate();
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
    handleCriarPallet
  } = usePallets();

  // Estados locais exclusivos do relatório modal Excel
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [palletSelecionado, setPalletSelecionado] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [carregandoExcel, setCarregandoExcel] = useState(false);

  // Nova lógica de capacidade limite de 140 volumes
  const totalPallets = palletsFiltrados.length;
  const palletsOcupados = palletsFiltrados.filter(p => (p._count?.produtos || 0) >= 140).length;
  const palletsVazios = totalPallets - palletsOcupados;

  // 🗑️ FUNÇÃO ADICIONADA: Realiza a chamada DELETE para remover a posição
  const handleExcluirPalletCard = async (e: React.MouseEvent, palletId: number, numeroPallet: string) => {
    e.stopPropagation(); 
    
    const confirmou = window.confirm(`Deseja realmente excluir permanentemente a posição "${numeroPallet}" da malha?`);
    if (!confirmou) return;

    try {
      // ✅ ALTERADO: Usando a constante API_URL dinâmica
      const response = await fetch(`${API_URL}/pallets/${palletId}`, {
        method: 'DELETE',
      });

      const resultado = await response.json();

      if (!response.ok) {
        alert(resultado.error || "Não foi possível excluir o pallet.");
        return;
      }

      alert(resultado.mensagem || "Posição removida com sucesso!");
      window.location.reload(); // Força o refresh rápido para limpar a malha
    } catch {
      alert("Erro de conexão ao tentar excluir a posição.");
    }
  };

  const handleExportarExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!palletSelecionado) return alert("Por favor, selecione uma opção!");
    setCarregandoExcel(true);
    
    try {
      // ✅ ALTERADO: Usando a constante API_URL dinâmica
      let urlEndpoint = `${API_URL}/historico/exportar`;
      let corpoRequisicao: any = { palletAlvo: palletSelecionado, nomeArquivo };
      let configuracaoFetch: any = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpoRequisicao)
      };

      // SE A OPÇÃO FOR RMA: Altera o fluxo para fazer um GET simples na rota de estoque fantasma
      if (palletSelecionado === 'FLUXO_RMA_SISTEMA') {
        // ✅ ALTERADO: Usando a constante API_URL dinâmica
        urlEndpoint = `${API_URL}/historico/exportar-rma`;
        configuracaoFetch = { method: 'GET' };
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
      alert(error.message || "Erro ao baixar o relatório.");
    } finally {
      setCarregandoExcel(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F6F8FC] text-slate-800 antialiased overflow-hidden">
      {/* GRADIENTES RADIAIS DE FUNDO */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.14),transparent_70%)] blur-3xl" />
        <div className="absolute top-1/3 -right-52 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.10),transparent_70%)] blur-3xl" />
        <div className="absolute -bottom-52 left-1/4 w-[650px] h-[650px] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.10),transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(246,248,252,0.6))]" />
      </div>

      <div className="relative max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Operacional</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Visão Geral do Armazém</h1>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button type="button" variant="secondary" onClick={() => setIsExcelModalOpen(true)} className="w-full sm:w-auto bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
              Exportar Relatório
            </Button>
            <Button variant="primary" onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
              + Adicionar Posição
            </Button>
          </div>
        </div>

        {/* LEITOR */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-slate-200 focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/15 focus-within:shadow-[0_10px_30px_-12px_rgba(37,99,235,0.35)] transition-all shadow-sm overflow-hidden">
          <form onSubmit={handleQrBipado} className="p-2 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="hidden sm:flex items-center pl-3 text-slate-400 shrink-0">
              <span className="text-xs font-mono uppercase tracking-widest">SCAN ›</span>
            </div>
            <input
              ref={qrInputRef} type="text" inputMode="text" autoComplete="off"
              className="flex-1 min-w-0 w-full bg-transparent text-slate-900 px-3 py-3 font-mono text-sm sm:text-base focus:outline-none placeholder:text-slate-400"
              placeholder="Digite o código da triagem ou número do pallet..."
              value={qrCodeBipado} onChange={(e) => setQrCodeBipado(e.target.value)}
            />
            <button type="submit" className="w-full sm:w-auto shrink-0 bg-slate-50 hover:bg-slate-100 text-slate-700 px-6 h-11 sm:h-12 text-xs font-semibold rounded-lg border border-slate-200 hover:border-slate-300 transition-all tracking-wider uppercase">
              Acessar
            </button>
          </form>
        </div>

        {/* METRICAS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Mapeados", value: totalPallets, accent: "from-slate-500/5 to-transparent", dot: "bg-slate-500" },
            { label: "Ocupados", value: palletsOcupados, accent: "from-rose-500/10 to-transparent", dot: "bg-rose-500" },
            { label: "Disponíveis", value: palletsVazios, accent: "from-emerald-500/10 to-transparent", dot: "bg-emerald-500" }
          ].map((kpi, idx) => (
            <div key={idx} className="relative bg-white/80 backdrop-blur-xl p-5 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm overflow-hidden group hover:border-slate-300 hover:shadow-md transition-all">
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.accent} opacity-80`} />
              <div className="relative flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${kpi.dot}`} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{kpi.label}</span>
              </div>
              <div className="relative flex items-baseline gap-2 mt-3">
                <span className="text-3xl font-mono font-semibold text-slate-900 tracking-tight">{kpi.value}</span>
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Posições</span>
              </div>
            </div>
          ))}
        </div>

        {/* MALHA DE ENDEREÇAMENTO */}
        <div className="space-y-5 pt-2">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 pb-3">
            <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Malha de Endereçamento</h2>
            <input
              type="text" placeholder="Buscar triagem em pallet" value={busca} onChange={(e) => setBusca(e.target.value)}
              className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-lg px-4 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition-all w-full sm:w-72 h-10"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {palletsFiltrados.map((pallet) => {
              const itensContados = pallet._count?.produtos || 0;
              const isLotado = itensContados >= 140;

              return (
                <div
                  key={pallet.id} onClick={() => navigate(`/pallet/${pallet.id}`)}
                  /* 🎨 SE FOR DEFEITO: Fundo rosa industrial sutil para isolamento visual total */
                  className={`relative backdrop-blur-xl rounded-xl p-5 min-h-[110px] flex flex-col justify-between hover:shadow-[0_8px_30px_-12px_rgba(37,99,235,0.25)] cursor-pointer transition-all duration-200 group overflow-hidden border ${
                    pallet.tipo === 'DEFEITO'
                      ? 'bg-rose-50/60 border-rose-200/80 hover:border-rose-400 hover:bg-rose-50/90' 
                      : 'bg-white/80 border-slate-200 hover:border-blue-500/40 hover:bg-white'
                  }`}
                >
                  {/* Bordinha indicadora superior */}
                  <div className={`absolute top-0 left-5 h-[2px] w-10 rounded-b-full ${
                    pallet.tipo === 'DEFEITO'
                      ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]' 
                      : isLotado 
                      ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
                      : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  }`} />
                  
                  <div className="flex justify-between items-start w-full mt-1">
                    <div className="space-y-3">
                      <h3 className="text-sm font-mono font-semibold tracking-tight text-slate-800 group-hover:text-blue-600 transition-colors">
                        {pallet.numero}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-mono bg-slate-50/70 px-2 py-0.5 rounded border border-slate-200/60 w-fit">
                        <span>R:{pallet.rua || '-'}</span><span className="text-slate-300">•</span>
                        <span>E:{pallet.estrutura || '-'}</span><span className="text-slate-300">•</span>
                        <span>N:{pallet.nivel || '-'}</span>
                      </div>
                    </div>
                    
                    {/* Bloco Dinâmico de Info, Impressora e Lixeira */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-[10px] font-mono px-1 py-0.5 rounded font-medium ${
                        pallet.tipo === 'DEFEITO'
                          ? 'bg-rose-100/80 text-rose-800 border border-rose-200'
                          : isLotado 
                          ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                          : 'bg-slate-50 text-slate-500 border border-slate-200'
                      }`}>
                        {itensContados} un.
                      </span>

                      {/* 🗑️ BOTÃO ADICIONADO: Excluir posição da malha */}
                      <button
                        onClick={(e) => handleExcluirPalletCard(e, pallet.id, pallet.numero)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Excluir posição da malha"
                      >
                        🗑️
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation(); 
                          imprimirEtiqueta(pallet.numero);
                        }}
                        className="p-1 text-base leading-none text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Imprimir Etiqueta 10x15"
                      >
                        🖨️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MODAL ORIGINAL CRIAR PALLET COM SELETOR DE FINALIDADE */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="relative bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.25)] overflow-hidden">
              <form onSubmit={handleCriarPallet} className="relative space-y-4">
                <Input label="Identificador do Pallet *" placeholder="Ex: PL-1200" required value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
                <Input label="Rua / Corredor" placeholder="Ex: Setor A" value={form.rua} onChange={(e) => setForm({ ...form, rua: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Estrutura" placeholder="Ex: EST-02" value={form.estrutura} onChange={(e) => setForm({ ...form, estrutura: e.target.value })} />
                  <Input label="Nível" placeholder="Ex: 3" value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })} />
                </div>
                
                {/* Escolha da finalidade/tipo da posição */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                    Finalidade / Tipo da Posição *
                  </label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 h-10 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition-all"
                  >
                    <option value="PADRAO"> Pallet Padrão (Armazenagem Geral)</option>
                    <option value="DEFEITO"> Pallet de Defeito / Avariados</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 text-xs">
                  <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" variant="primary">Confirmar</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL EXCEL — ATUALIZADO COM OPÇÃO DE ESTOQUE FANTASMA */}
        {isExcelModalOpen && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="relative bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.25)] overflow-hidden">
              <form onSubmit={handleExportarExcel} className="relative space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Tipo de Relatório *</label>
                  <select 
                    required 
                    value={palletSelecionado} 
                    onChange={(e) => setPalletSelecionado(e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 h-10 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition-all"
                  >
                    <option value="">-- Escolha o Relatório --</option>
                    
                    <option value="FLUXO_RMA_SISTEMA" className="font-semibold text-rose-600">📋 Fluxo de RMA (Estoque Fantasma)</option>
                    
                    <option value="" disabled>--------------------------------</option>
                    {palletsFiltrados.map((p) => (
                      <option key={p.id} value={p.numero}>{p.numero}</option>
                    ))}
                  </select>
                </div>
                <Input label="Nome do Ficheiro (Opcional)" placeholder="Ex: rma_junho_auditoria" value={nomeArquivo} onChange={(e) => setNomeArquivo(e.target.value)} />
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 text-xs">
                  <Button type="button" variant="secondary" onClick={() => setIsExcelModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" variant="primary" className="bg-indigo-600 hover:bg-indigo-700" disabled={carregandoExcel}>
                    {carregandoExcel ? 'Baixando...' : 'Confirmar'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}