import { useState, type FormEvent } from 'react';
import api from '../../../../services/api';
import { useToast } from '../../../../contexts/toastContext';

interface ModalRastreabilidadeProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalRastreabilidade({ isOpen, onClose }: ModalRastreabilidadeProps) {
  const toast = useToast();
  const [codigoBusca, setCodigoBusca] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);
  const [pesquisaRealizada, setPesquisaRealizada] = useState(false);

  if (!isOpen) return null;

  const handleBuscar = async (e: FormEvent) => {
    e.preventDefault();
    if (!codigoBusca.trim()) return;

    setCarregando(true);
    setPesquisaRealizada(true);
    try {
      const response = await api.get(`/historico/${codigoBusca}`);
      setHistorico(response.data);
    } catch (error: any) {
      setHistorico([]);
      toast.error(error.response?.data?.error || 'Erro ao buscar rastreabilidade.');
    } finally {
      setCarregando(false);
    }
  };

  const getEstiloAcao = (acao: string) => {
    const acaoUpper = acao.toUpperCase();
    if (acaoUpper.includes('ENTRADA')) return { cor: 'bg-emerald-500', bgFade: 'bg-emerald-50', text: 'text-emerald-700', icon: 'M12 4.5v15m7.5-7.5h-15' }; // Plus
    if (acaoUpper.includes('SAIDA') || acaoUpper.includes('RMA')) return { cor: 'bg-rose-500', bgFade: 'bg-rose-50', text: 'text-rose-700', icon: 'M19.5 12h-15' }; // Minus
    if (acaoUpper.includes('TRANSFERENCIA')) return { cor: 'bg-blue-500', bgFade: 'bg-blue-50', text: 'text-blue-700', icon: 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5' }; // Arrows
    if (acaoUpper.includes('RETRIAGEM')) return { cor: 'bg-purple-500', bgFade: 'bg-purple-50', text: 'text-purple-700', icon: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99' }; // Refresh
    return { cor: 'bg-slate-500', bgFade: 'bg-slate-50', text: 'text-slate-700', icon: 'M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3' }; // Default
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-slate-800 tracking-tight">Rastrear Etiqueta</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
            ✕
          </button>
        </div>

        {/* Input de Busca */}
        <div className="p-6 border-b border-slate-100 shrink-0">
          <form onSubmit={handleBuscar} className="flex gap-2">
            <input
              type="text"
              placeholder="Digite ou bipe o código (Ex: 00012345)"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all uppercase"
              value={codigoBusca}
              onChange={(e) => setCodigoBusca(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              disabled={carregando || !codigoBusca}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-semibold tracking-wide transition-all shadow-sm flex items-center justify-center min-w-[100px]"
            >
              {carregando ? '...' : 'Buscar'}
            </button>
          </form>
        </div>

        {/* Linha do Tempo (Timeline) */}
        <div className="p-6 overflow-y-auto bg-[#F6F8FC] flex-1">
          {!pesquisaRealizada ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 opacity-60 pb-10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              <p className="text-sm font-medium">Pesquise por um código para ver a história dele.</p>
            </div>
          ) : historico.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-rose-400 space-y-2 pb-10">
              <p className="text-sm font-medium text-slate-600">Nenhum rastro encontrado.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pb-4">
              {historico.map((evento, index) => {
                const estilo = getEstiloAcao(evento.acao);
                const isMaisRecente = index === 0;
                
                const dataFormatada = evento.bipadoEm 
                  ? new Date(evento.bipadoEm).toLocaleString('pt-BR') 
                  : 'Data não registrada';

                return (
                  <div key={evento.id} className="relative pl-6 sm:pl-8">
                    {/* Bolinha do Evento */}
                    <div className={`absolute -left-[17px] top-1 h-8 w-8 rounded-full border-4 border-[#F6F8FC] flex items-center justify-center shadow-sm ${estilo.cor} text-white`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d={estilo.icon} />
                      </svg>
                    </div>

                    {/* Card do Evento */}
                    <div className={`bg-white p-4 rounded-xl border ${isMaisRecente ? 'border-slate-300 shadow-md ring-1 ring-slate-900/5' : 'border-slate-100 shadow-sm'} transition-all`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${estilo.bgFade} ${estilo.text}`}>
                          {evento.acao.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                          {dataFormatada}
                        </span>
                      </div>
                      
                      <div className="space-y-1 mt-3">
                        <p className="text-sm text-slate-700">
                          Etiqueta: <strong className="font-mono text-slate-900">{evento.codigoItem}</strong>
                        </p>
                        
                        <p className="text-sm text-slate-700">
                          Pallet Alvo: <strong className="text-slate-900">{evento.palletAlvo ? evento.palletAlvo : 'Sistema / Sem Posição'}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}