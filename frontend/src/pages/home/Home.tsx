import { useNavigate } from 'react-router-dom';
import { usePallets } from './hooks/usePallets';
import Button from './components/ui/Button';
import Input from './components/ui/Input';

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

  const totalPallets = palletsFiltrados.length;
  const palletsOcupados = palletsFiltrados.filter(p => (p._count?.produtos || 0) > 0).length;
  const palletsVazios = totalPallets - palletsOcupados;

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
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">WMS · Operacional</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Visão Geral do Armazém</h1>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto"
          >
            + Adicionar Posição
          </Button>
        </div>

        {/* LEITOR */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-slate-200 focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/15 focus-within:shadow-[0_10px_30px_-12px_rgba(37,99,235,0.35)] transition-all shadow-sm overflow-hidden">
          <form onSubmit={handleQrBipado} className="p-2 flex gap-2">
            <div className="flex items-center pl-3 text-slate-400">
              <span className="text-xs font-mono uppercase tracking-widest">SCAN ›</span>
            </div>
            <input
              ref={qrInputRef}
              type="text"
              className="flex-1 bg-transparent text-slate-900 px-3 py-3.5 font-mono text-base focus:outline-none placeholder:text-slate-400"
              placeholder="Aponte o leitor físico ou digite o código do Pallet..."
              value={qrCodeBipado}
              onChange={(e) => setQrCodeBipado(e.target.value)}
            />
            <button
              type="submit"
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 px-6 text-xs font-semibold rounded-lg border border-slate-200 hover:border-slate-300 transition-all h-12 my-auto tracking-wider uppercase"
            >
              Acessar
            </button>
          </form>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Mapeados", value: totalPallets, accent: "from-slate-500/5 to-transparent", dot: "bg-slate-500" },
            { label: "Ocupados", value: palletsOcupados, accent: "from-amber-500/10 to-transparent", dot: "bg-amber-500" },
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

        {/* CONTEÚDO */}
        <div className="space-y-5 pt-2">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 pb-3">
            <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Malha de Endereçamento</h2>
            <input
              type="text"
              placeholder="Filtrar por código ou rua..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-lg px-4 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition-all w-full sm:w-72 h-10"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {palletsFiltrados.map((pallet) => {
              const itensContados = pallet._count?.produtos || 0;
              const hasStock = itensContados > 0;

              return (
                <div
                  key={pallet.id}
                  onClick={() => navigate(`/pallet/${pallet.id}`)}
                  className="relative bg-white/80 backdrop-blur-xl rounded-xl border border-slate-200 p-5 min-h-[110px] flex flex-col justify-between hover:border-blue-500/40 hover:bg-white hover:shadow-[0_8px_30px_-12px_rgba(37,99,235,0.25)] cursor-pointer transition-all duration-200 group overflow-hidden"
                >
                  <div className={`absolute top-0 left-5 h-[2px] w-10 rounded-b-full ${
                    hasStock ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  }`} />

                  <div className="flex justify-between items-start w-full mt-1">
                    <div className="space-y-3">
                      <h3 className="text-sm font-mono font-semibold tracking-tight text-slate-800 group-hover:text-blue-600 transition-colors">
                        {pallet.numero}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200 w-fit">
                        <span>R:{pallet.rua || '-'}</span>
                        <span className="text-slate-300">•</span>
                        <span>E:{pallet.estrutura || '-'}</span>
                        <span className="text-slate-300">•</span>
                        <span>N:{pallet.nivel || '-'}</span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium shrink-0 ${
                      hasStock
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-50 text-slate-500 border border-slate-200'
                    }`}>
                      {itensContados} SKU
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {palletsFiltrados.length === 0 && (
            <div className="text-center py-16 bg-white/80 backdrop-blur-xl rounded-xl border border-slate-200 text-slate-400 text-xs font-mono tracking-[0.2em]">
              NENHUM REGISTRO LOCALIZADO
            </div>
          )}
        </div>

        {/* MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="relative bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.25)] overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.18),transparent_70%)] blur-2xl pointer-events-none" />

              <div className="relative flex justify-between items-center pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)]" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">Nova Posição</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors text-sm p-1 h-6 w-6 rounded hover:bg-slate-100">✕</button>
              </div>

              <form onSubmit={handleCriarPallet} className="relative space-y-4">
                <div className="space-y-1.5">
                  <Input label="Identificador do Pallet *" placeholder="Ex: PL-1200" required value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Input label="Rua / Corredor" placeholder="Ex: Setor A" value={form.rua} onChange={(e) => setForm({ ...form, rua: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Input label="Estrutura" placeholder="Ex: EST-02" value={form.estrutura} onChange={(e) => setForm({ ...form, estrutura: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Input label="Nível" placeholder="Ex: 3" value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })} />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 text-xs">
                  <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="h-9 px-4">
                    Cancelar
                  </Button>
                  <Button type="submit" variant="primary" className="h-9 px-5">
                    Confirmar
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
