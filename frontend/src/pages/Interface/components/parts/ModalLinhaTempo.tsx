// frontend/src/pages/Interface/components/parts/ModalLinhaTempo.tsx
import { useEffect, useState } from 'react';
import { useToast } from '../../../../contexts/toastContext';

interface HistoricoItem {
  id: number;
  codigoItem: string;
  acao: string;
  palletAlvo: string;
  bipadoEm: string | null;
}

interface ModalLinhaTempoProps {
  isOpen: boolean;
  onClose: () => void;
  codigoItem: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function ModalLinhaTempo({ isOpen, onClose, codigoItem }: ModalLinhaTempoProps) {
  const toast = useToast();
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !codigoItem) return;

    const fetchHistorico = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('wms_token');
        const response = await fetch(`${API_URL}/historico/${codigoItem}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Histórico não encontrado.');
        }

        const data = await response.json();
        setHistorico(data);
      } catch (error) {
        toast.error('Não foi possível carregar a linha do tempo deste item.');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchHistorico();
  }, [isOpen, codigoItem, onClose, toast]);

  if (!isOpen) return null;

  const getAcaoColor = (acao: string) => {
    switch (acao.toUpperCase()) {
      case 'ENTRADA': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'SAIDA': return 'bg-rose-100 text-rose-700 border-rose-300';
      case 'TRANSFERENCIA': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-enter" onClick={onClose}>
      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-lg w-full shadow-2xl flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER DO MODAL */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Rastreabilidade do Item</h2>
            <p className="text-xs font-mono text-slate-500 mt-1">Cód: {codigoItem}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors text-xl leading-none">
            ✕
          </button>
        </div>

        {/* CORPO / LINHA DO TEMPO */}
        <div className="overflow-y-auto py-4 pr-2 flex-1 scrollbar-thin">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : historico.length === 0 ? (
            <div className="text-center text-slate-500 py-10 text-sm">Nenhum histórico registrado.</div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
              {historico.map((mov, index) => (
                <div key={mov.id} className="relative pl-6">
                  {/* Bolinha da timeline */}
                  <span className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white shadow-sm ${
                    index === 0 ? 'bg-blue-600' : 'bg-slate-300'
                  }`} />
                  
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getAcaoColor(mov.acao)}`}>
                        {mov.acao}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {/* 🔄 ALTERAÇÃO: Tratando o bipadoEm que pode ser nulo no banco atual */}
                        {mov.bipadoEm ? new Date(mov.bipadoEm).toLocaleString('pt-BR') : 'Data indisponível'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      Pallet: <span className="font-mono text-blue-600">{mov.palletAlvo}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER DO MODAL */}
        <div className="pt-4 border-t border-slate-100 shrink-0 mt-2">
          <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-sm">
            Fechar Rastreamento
          </button>
        </div>

      </div>
    </div>
  );
}