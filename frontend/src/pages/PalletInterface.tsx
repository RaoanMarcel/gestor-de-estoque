import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api.js';

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
  
  // Estados Operacionais
  const [pallet, setPallet] = useState<PalletData | null>(null);
  const [acao, setAcao] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA'); // Modo inicial: Verde
  const [codigoBipado, setCodigoBipado] = useState('');
  const [mensagemStatus, setMensagemStatus] = useState({ texto: '', erro: false });
  
  const inputBipRef = useRef<HTMLInputElement>(null);

  // Carrega as informações do pallet e seus produtos ao entrar
  useEffect(() => {
    buscarDadosPallet();
  }, [id]);

  // Força o foco no input de bipagem a cada renderização ou mudança de modo
  useEffect(() => {
    manterFocoNoInput();
  }, [acao, pallet]);

  const buscarDadosPallet = async () => {
    try {
      const response = await api.get(`/pallets/${id}`);
      setPallet(response.data);
    } catch (error) {
      setMensagemStatus({ texto: 'Erro ao conectar com o servidor.', erro: true });
    }
  };

  const manterFocoNoInput = () => {
    if (inputBipRef.current) {
      inputBipRef.current.focus();
    }
  };

  // Processa o BIP enviado pelo leitor de código de barras (ao simular o Enter)
  const handleBipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoBipado.trim()) return;

    try {
      setMensagemStatus({ texto: '', erro: false });
      
      const response = await api.post('/pallets/bipar', {
        palletId: id,
        codigoItem: codigoBipado.trim(),
        acao: acao
      });

      // Toca um feedback sonoro de sucesso leve do sistema (Beep)
      tocarSom(true);
      
      setMensagemStatus({ texto: response.data.mensagem || 'Operação realizada!', erro: false });
      setCodigoBipado('');
      buscarDadosPallet(); // Atualiza a lista lateral em tempo real
    } catch (error: any) {
      // Toca som de erro crítico caso falte estoque ou dê falha (Buzzer)
      tocarSom(false);
      
      const textoErro = error.response?.data?.error || 'Erro ao processar bipagem.';
      setMensagemStatus({ texto: textoErro, erro: true });
      setCodigoBipado('');
    }
  };

  // Função auxiliar para deletar direto o item na lixeirinha (Remoção forçada)
  const handleExcluirItemLinha = async (codigoItem: string) => {
    if (!window.confirm(`Deseja remover todo o produto ${codigoItem} deste pallet?`)) return;
    try {
      // Simula saídas consecutivas ou força a deleção enviando direto para a lógica de saída
      await api.post('/pallets/bipar', { palletId: id, codigoItem, acao: 'SAIDA' });
      buscarDadosPallet();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao remover item.');
    }
  };

  // Áudio nativo do navegador para o chão de fábrica
  const tocarSom = (sucesso: boolean) => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(sucesso ? 800 : 250, ctx.currentTime); // Agudo para sucesso, grave para erro
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (sucesso ? 0.1 : 0.4));
  };

  if (!pallet) {
    return <div className="text-center p-12 text-slate-400">Carregando dados do Pallet...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" onClick={manterFocoNoInput}>
      
      {/* PAINEL DA ESQUERDA: CONTROLE E BIPAGEM (2 colunas) */}
      <div className="lg:col-span-2 bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col justify-between min-h-125">
        
        <div>
          {/* Cabeçalho de Identificação do Pallet */}
          <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-6">
            <div>
              <button onClick={() => navigate('/')} className="text-xs text-blue-400 hover:underline mb-2 block">
                ← Voltar para o Galpão
              </button>
              <h1 className="text-3xl font-mono font-bold text-slate-100">{pallet.numero}</h1>
              <p className="text-xs text-slate-400 mt-1">
                {pallet.rua || 'Sem rua'} • {pallet.estrutura || 'Sem estrutura'} • {pallet.nivel || 'Sem nível'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 uppercase font-semibold block">Status</span>
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
              <span className="text-sm font-medium text-slate-300">Operando</span>
            </div>
          </div>

          {/* Seletores de Modo: ENTRADA (Verde) e SAÍDA (Vermelho) */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => setAcao('ENTRADA')}
              className={`p-4 rounded-xl font-bold text-lg border-2 transition-all flex items-center justify-center gap-2 ${
                acao === 'ENTRADA'
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-900/30 font-extrabold scale-[1.02]'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              📥 ENTRADA DE PRODUTOS
            </button>
            
            <button
              onClick={() => setAcao('SAIDA')}
              className={`p-4 rounded-xl font-bold text-lg border-2 transition-all flex items-center justify-center gap-2 ${
                acao === 'SAIDA'
                  ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-900/30 font-extrabold scale-[1.02]'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              📤 EXCLUSÃO / SAÍDA
            </button>
          </div>

          {/* Campo que fica Colorido Conforme a Opção Selecionada */}
          <form onSubmit={handleBipSubmit} className="space-y-3">
            <label className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
              Aponte o Leitor de Código de Barras:
            </label>
            <input
              ref={inputBipRef}
              type="text"
              placeholder={acao === 'ENTRADA' ? "Bipando ENTRADA..." : "Bipando SAÍDA..."}
              className={`w-full p-6 rounded-xl font-mono text-2xl text-center text-white font-bold transition-all border-4 focus:outline-none focus:ring-0 ${
                acao === 'ENTRADA'
                  ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 placeholder-emerald-700/50'
                  : 'bg-rose-950/70 border-rose-500 text-rose-200 placeholder-rose-700/50'
              }`}
              value={codigoBipado}
              onChange={(e) => setCodigoBipado(e.target.value)}
            />
          </form>
        </div>

        {/* Feedback visual imediato e grande para alertas no galpão */}
        {mensagemStatus.texto && (
          <div className={`mt-6 p-4 rounded-lg font-bold text-center text-md border ${
            mensagemStatus.erro 
              ? 'bg-rose-900/30 border-rose-600 text-rose-400 animate-bounce' 
              : 'bg-emerald-900/30 border-emerald-600 text-emerald-400'
          }`}>
            {mensagemStatus.erro ? '⚠️ ' : '✅ '} {mensagemStatus.texto}
          </div>
        )}

      </div>

      {/* PAINEL DA DIREITA: LISTAGEM LATERAL CONFERÊNCIA (1 coluna) */}
      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col max-h-145">
        <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center">
          <h2 className="font-bold text-slate-300 flex items-center gap-2">
            📦 CONTEÚDO ATUAL
          </h2>
          <span className="text-xs bg-slate-900 text-slate-400 px-2.5 py-1 rounded-full font-mono font-bold">
            {pallet.produtos.reduce((acc, p) => acc + p.quantidade, 0)} un. total
          </span>
        </div>

        {/* Lista de Itens com Scroll Interno */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {pallet.produtos.map((prod) => (
            <div 
              key={prod.id} 
              className="bg-slate-900 p-3 rounded-lg border border-slate-800 hover:border-slate-700 flex justify-between items-center transition-all group"
            >
              <div className="font-mono">
                <span className="block text-slate-200 font-bold text-sm tracking-wide">{prod.codigoItem}</span>
                <span className="text-[10px] text-slate-500">Bipado em: {new Date(prod.bipadoEm).toLocaleTimeString()}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800 font-bold text-sm text-blue-400 font-mono">
                  x{prod.quantidade}
                </div>
                {/* Ícone de Lixeirinha para Exclusão Direta */}
                <button
                  onClick={() => handleExcluirItemLinha(prod.codigoItem)}
                  className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-950/30 rounded transition-colors"
                  title="Remover uma unidade"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}

          {pallet.produtos.length === 0 && (
            <div className="text-center py-16 text-slate-600 text-sm italic">
              Este pallet está vazio.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}