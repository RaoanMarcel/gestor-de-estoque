import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/home/Home.js';
import PalletInterface from './pages/Interface/PalletInterface.js';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#F6F8FC] text-slate-800 antialiased">
        {/* Header Global do WMS */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="container mx-auto flex justify-between items-center px-4 md:px-6 h-14">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center h-7 w-7 rounded-md bg-gradient-to-b from-blue-500 to-blue-600 shadow-[0_4px_10px_-2px_rgba(37,99,235,0.4),inset_0_1px_0_rgba(255,255,255,0.25)]">
                <span className="text-white text-[11px] font-bold tracking-tight">GE</span>
              </div>
              <div className="flex flex-col leading-tight">
                <h1 className="text-sm font-semibold tracking-tight text-slate-900">Gestão de Estoque</h1>
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Warehouse Management</span>
              </div>
            </div>

            <div className="flex items-center gap-2">

            </div>
          </div>
        </header>

        {/* Conteúdo Dinâmico das Telas */}
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/pallet/:id" element={<PalletInterface />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
