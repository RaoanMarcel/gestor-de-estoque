// components/parts/MetricasPanel.tsx
interface MetricasPanelProps {
  totalPallets: number;
  palletsOcupados: number;
  palletsVazios: number;
}

export default function MetricasPanel({ totalPallets, palletsOcupados, palletsVazios }: MetricasPanelProps) {
  const kpis = [
    { label: "Mapeados", value: totalPallets, accent: "from-slate-500/5 to-transparent", dot: "bg-slate-500" },
    { label: "Ocupados", value: palletsOcupados, accent: "from-rose-500/10 to-transparent", dot: "bg-rose-500" },
    { label: "Disponíveis", value: palletsVazios, accent: "from-emerald-500/10 to-transparent", dot: "bg-emerald-500" }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {kpis.map((kpi, idx) => (
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
  );
}