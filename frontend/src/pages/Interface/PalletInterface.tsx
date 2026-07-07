import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';

interface Produto {
  id: number;
  codigoItem: string;
  quantidade: number;
  bipadoEm: string;
}

interface PalletData {
  id: number;
  numero: string;
  rua?: string;
  estrutura?: string;
  nivel?: string;
  produtos: Produto[];
}

export default function PalletInterface() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pallet, setPallet] = useState<PalletData | null>(null);
  const [acao, setAcao] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [codigoBipado, setCodigoBipado] = useState('');
  const [mensagemStatus, setMensagemStatus] = useState({ texto: '', erro: false });

  const inputBipRef = useRef<HTMLInputElement>(null);

  useEffect(() => { buscarDadosPallet(); }, [id]);
  useEffect(() => { manterFocoNoInput(); }, [acao, pallet]);

  const buscarDadosPallet = async () => {
    try {
      const response = await api.get(`/pallets/${id}`);
      setPallet(response.data);
    } catch {
      setMensagemStatus({ texto: 'Erro ao conectar com o servidor.', erro: true });
    }
  };

  const manterFocoNoInput = () => { inputBipRef.current?.focus(); };

  const handleBipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoBipado.trim()) return;
    try {
      setMensagemStatus({ texto: '', erro: false });
      const response = await api.post('/pallets/bipar', {
        palletId: id,
        codigoItem: codigoBipado.trim(),
        acao,
      });
      tocarSom(true);
      setMensagemStatus({ texto: response.data.mensagem || 'Operação realizada!', erro: false });
      setCodigoBipado('');
      buscarDadosPallet();
    } catch (error: any) {
      tocarSom(false);
      setMensagemStatus({ texto: error.response?.data?.error || 'Erro ao processar bipagem.', erro: true });
      setCodigoBipado('');
    }
  };

  const handleExcluirItemLinha = async (codigoItem: string) => {
    if (!window.confirm(`Deseja remover uma unidade do produto ${codigoItem}?`)) return;
    try {
      await api.post('/pallets/bipar', { palletId: id, codigoItem, acao: 'SAIDA' });
      buscarDadosPallet();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao remover item.');
    }
  };

  const tocarSom = (sucesso: boolean) => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(sucesso ? 800 : 250, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (sucesso ? 0.1 : 0.4));
  };

  if (!pallet) {
    return (
      <div className="min-h-screen bg-[#F6F8FC] flex items-center justify-center text-slate-400 text-xs font-mono tracking-[0.2em] uppercase">
        Carregando dados do Pallet...
      </div>
    );
  }

  const isEntrada = acao === 'ENTRADA';
  const totalUnidades = pallet.produtos.reduce((acc, p) => acc + p.quantidade, 0);

  return (
    <div className="relative min-h-screen bg-[#F6F8FC] text-slate-800 antialiased overflow-hidden" onClick={manterFocoNoInput}>
      {/* GRADIENTES RADIAIS DE FUNDO */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.14),transparent_70%)] blur-3xl" />
        <div className="absolute top-1/3 -right-52 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.10),transparent_70%)] blur-3xl" />
        <div className="absolute -bottom-52 left-1/4 w-[650px] h-[650px] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.10),transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(246,248,252,0.6))]" />
      </div>

      <div className="relative max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200 gap-4">
          <div className="space-y-1">
            <button
              onClick={() => navigate('/')}
              className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-blue-600 transition-colors"
            >
              ← Voltar para o Galpão
            </button>
            <div className="flex items-center gap-3 pt-1">
              <h1 className="text-xl font-mono font-semibold tracking-tight text-slate-900">{pallet.numero}</h1>
              <span className="text-[10px] font-mono text-slate-500 bg-white/70 backdrop-blur px-2 py-0.5 rounded border border-slate-200">
                R:{pallet.rua || '-'} • E:{pallet.estrutura || '-'} • N:{pallet.nivel || '-'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Operando</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PAINEL ESQUERDO — CONTROLE E BIPAGEM */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
            {/* Seletores de Modo */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setAcao('ENTRADA')}
                className={`p-4 rounded-xl text-xs font-semibold uppercase tracking-[0.15em] border transition-all flex items-center justify-center gap-2 ${
                  isEntrada
                    ? 'bg-emerald-50 border-emerald-500/60 text-emerald-700 shadow-[0_10px_30px_-12px_rgba(16,185,129,0.4)]'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isEntrada ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'bg-slate-300'}`} />
                Entrada de Produtos
              </button>
              <button
                onClick={() => setAcao('SAIDA')}
                className={`p-4 rounded-xl text-xs font-semibold uppercase tracking-[0.15em] border transition-all flex items-center justify-center gap-2 ${
                  !isEntrada
                    ? 'bg-rose-50 border-rose-500/60 text-rose-700 shadow-[0_10px_30px_-12px_rgba(244,63,94,0.4)]'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${!isEntrada ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]' : 'bg-slate-300'}`} />
                Exclusão / Saída
              </button>
            </div>

            {/* Campo de Bipagem */}
            <form onSubmit={handleBipSubmit} className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${isEntrada ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                Aponte o leitor de código de barras
              </label>
              <input
                ref={inputBipRef}
                type="text"
                placeholder={isEntrada ? 'Bipando ENTRADA...' : 'Bipando SAÍDA...'}
                className={`w-full p-6 rounded-xl font-mono text-2xl text-center font-semibold tracking-wider transition-all border-2 focus:outline-none focus:ring-4 ${
                  isEntrada
                    ? 'bg-emerald-50/60 border-emerald-500/50 text-emerald-800 placeholder-emerald-400/60 focus:ring-emerald-500/15 focus:border-emerald-500'
                    : 'bg-rose-50/60 border-rose-500/50 text-rose-800 placeholder-rose-400/60 focus:ring-rose-500/15 focus:border-rose-500'
                }`}
                value={codigoBipado}
                onChange={(e) => setCodigoBipado(e.target.value)}
              />
            </form>

            {/* Feedback */}
            {mensagemStatus.texto && (
              <div
                className={`p-4 rounded-xl font-medium text-center text-sm border backdrop-blur-xl ${
                  mensagemStatus.erro
                    ? 'bg-rose-50/80 border-rose-200 text-rose-700 animate-pulse'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-700'
                }`}
              >
                {mensagemStatus.erro ? '⚠ ' : '✓ '} {mensagemStatus.texto}
              </div>
            )}
          </div>

          {/* PAINEL DIREITO — CONTEÚDO ATUAL */}
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col max-h-[600px]">
            <div className="border-b border-slate-200 pb-3 mb-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Conteúdo Atual</h2>
              </div>
              <span className="text-[10px] font-mono font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                {totalUnidades} un.
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {pallet.produtos.map((prod) => (
                <div
                  key={prod.id}
                  className="relative bg-white rounded-lg border border-slate-200 p-3 flex justify-between items-center hover:border-blue-500/40 hover:shadow-[0_8px_20px_-12px_rgba(37,99,235,0.25)] transition-all group overflow-hidden"
                >
                  <div className="absolute top-0 left-3 h-[2px] w-8 rounded-b-full bg-blue-500/70" />
                  <div className="font-mono mt-1">
                    <span className="block text-slate-800 font-semibold text-sm tracking-tight">{prod.codigoItem}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      {new Date(prod.bipadoEm).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded">
                      x{prod.quantidade}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleExcluirItemLinha(prod.codigoItem); }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Remover uma unidade"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}

              {pallet.produtos.length === 0 && (
                <div className="text-center py-16 bg-slate-50/60 rounded-lg border border-dashed border-slate-200 text-slate-400 text-xs font-mono tracking-[0.2em] uppercase">
                  Pallet vazio
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
