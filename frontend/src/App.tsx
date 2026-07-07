import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/home/Home.js';
import PalletInterface from './pages/PalletInterface.jsx';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-slate-100 antialiased">
        {/* Header Simples Global do WMS */}
        <header className="bg-slate-950 border-b border-slate-800 p-4 shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold tracking-wider text-emerald-500">Gestão de estoque</h1>
            <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-400">Ambiente: Localhost</span>
          </div>
        </header>

        {/* Conteúdo Dinâmico das Telas */}
        <main className="container mx-auto p-6">
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