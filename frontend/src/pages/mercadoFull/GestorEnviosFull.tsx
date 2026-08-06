    import React, { useState, useRef } from 'react';
    import { useNavigate } from 'react-router-dom';

    interface InboundSKU {
    sku: string;
    descricao: string;
    totalUnidades: number;
    bipados: number;
    status: 'pendente' | 'bipando' | 'concluido';
    }

    export default function GestorEnviosFull() {
    const navigate = useNavigate();
    const [currentScreen, setCurrentScreen] = useState(1);
    
    // Estados - Upload Inbound
    const [nomePallet, setNomePallet] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estados - Dados da Bipagem (Simulação de Retorno da API)
    const [inboundData, setInboundData] = useState<{ id: string, nome: string, totalSku: number, totalUnidades: number } | null>(null);
    const [skus, setSkus] = useState<InboundSKU[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
        setSelectedFile(e.target.files[0]);
        }
    };

    const handleProcessarBackend = async () => {
        if (!selectedFile || !nomePallet) {
        alert("Preencha o nome do pallet e anexe o arquivo Inbound (PDF).");
        return;
        }
        setIsProcessing(true);

        setTimeout(() => {
        setInboundData({
            id: "ENV-72595700",
            nome: nomePallet,
            totalSku: 14,
            totalUnidades: 310
        });
        setSkus([
            { sku: '012927', descricao: 'Balança Eletrônica Toledo Scale 32kg...', totalUnidades: 35, bipados: 0, status: 'pendente' },
            { sku: '005300', descricao: 'Ribbon 800300-250br Color Zebra...', totalUnidades: 14, bipados: 0, status: 'pendente' }
        ]);
        setIsProcessing(false);
        setCurrentScreen(3);
        }, 1500);
    };

    // Ícone SVG Global para o Header
    const HeaderLogo = () => (
        <div className="flex items-center gap-1.5">
        <span className="text-emerald-500 italic font-black text-2xl leading-none">⚡ FULL</span>
        <span className="font-semibold text-gray-800 text-base leading-tight">Gestor de<br/>Envios</span>
        </div>
    );

    return (
        // Fundo da Tela inteira (Mobile 100%, Desktop cinza suave)
        <div className="min-h-screen bg-[#F6F8FC] md:p-8 flex items-start justify-center font-sans antialiased">
        
        {/* Container Principal Responsivo (Sem bordas no Mobile, Card com sombra no PC) */}
        <div className="w-full min-h-screen md:min-h-0 md:max-w-2xl bg-white md:rounded-2xl md:shadow-xl md:border md:border-gray-200 flex flex-col relative overflow-hidden transition-all duration-300">
            
            {/* ==========================================
                TELA 1: PÁGINA INICIAL
                ========================================== */}
            {currentScreen === 1 && (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="p-5 md:p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <HeaderLogo />
                <button 
                    onClick={() => navigate('/')} // Volta para a Home do sistema
                    className="text-gray-400 hover:text-gray-700 transition"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                </div>

                <div className="p-5 md:p-8 flex-1 bg-gray-50 flex flex-col">
                <div className="bg-white border border-gray-200 text-gray-600 text-center text-sm py-2.5 rounded-lg mb-8 shadow-sm">
                    Aguardando Início...
                </div>

                <button 
                    onClick={() => setCurrentScreen(2)}
                    className="w-full bg-[#1e293b] text-emerald-500 font-semibold py-4 rounded-xl mb-8 flex items-center justify-center gap-2 transition hover:bg-slate-800 shadow-md active:scale-[0.98]"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                    Adicionar Novo Envio
                </button>
                
                <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Gerenciamento de Ativos</h3>
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <button className="w-full bg-white border border-gray-300 text-emerald-600 font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition hover:bg-emerald-50 active:scale-[0.98]">
                    <span className="text-lg leading-none">+</span> Motorista
                    </button>
                    <button className="w-full bg-white border border-gray-300 text-emerald-600 font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition hover:bg-emerald-50 active:scale-[0.98]">
                    <span className="text-lg leading-none">+</span> Veículo
                    </button>
                </div>
                
                <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Envios Recentes</h3>
                <div className="flex-1 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center bg-gray-50 min-h-[150px]">
                    <span className="text-gray-400 text-sm">Nenhum envio ativo no momento</span>
                </div>
                </div>
            </div>
            )}

            {/* ==========================================
                TELA 2: TELA DE NOVO ENVIO
                ========================================== */}
            {currentScreen === 2 && (
            <div className="flex flex-col h-full bg-gray-50 animate-in slide-in-from-right-8 duration-300">
                {/* Header com botão de voltar */}
                <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => setCurrentScreen(1)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <h2 className="font-bold text-gray-900 text-lg">Novo Envio Meli Full</h2>
                </div>
                
                <div className="p-5 md:p-8 flex-1">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    
                    <div className="mb-6">
                    <label className="block text-sm text-gray-700 font-semibold mb-2">Identificação do Pallet</label>
                    <input 
                        type="text" 
                        value={nomePallet}
                        onChange={(e) => setNomePallet(e.target.value)}
                        placeholder="Ex: Pallet Eletrônicos Sul" 
                        className="w-full border border-gray-300 rounded-xl p-3.5 bg-gray-50 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition" 
                    />
                    </div>
                    
                    <input 
                    type="file" 
                    accept="application/pdf"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden" 
                    />
                    
                    <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 md:p-8 flex flex-col items-center justify-center text-center mb-8 cursor-pointer transition ${selectedFile ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
                    >
                    <svg className={`w-12 h-12 mb-3 ${selectedFile ? 'text-emerald-600' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 3v18h10v-8h-6V3H7zm8 0v6h6L15 3z"/>
                    </svg>
                    <span className="text-sm font-semibold text-gray-800">
                        {selectedFile ? 'Arquivo Inbound Pronto' : 'Toque para Anexar Inbound (PDF)'}
                    </span>
                    {selectedFile && (
                        <span className="text-xs text-emerald-600 mt-2 font-medium bg-emerald-100 px-3 py-1 rounded-full">
                        {selectedFile.name}
                        </span>
                    )}
                    </div>
                    
                    <button 
                    onClick={handleProcessarBackend}
                    disabled={isProcessing}
                    className={`w-full text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                    {isProcessing ? (
                        <span className="animate-pulse">⌛ Analisando Documento...</span>
                    ) : (
                        <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                        Criar e Processar Inbound
                        </>
                    )}
                    </button>
                </div>
                </div>
            </div>
            )}

            {/* ==========================================
                TELA 3: TELA DE BIPAGEM
                ========================================== */}
            {currentScreen === 3 && inboundData && (
            <div className="flex flex-col h-full bg-gray-50 animate-in slide-in-from-right-8 duration-300">
                {/* Header Fixo */}
                <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10 flex justify-between items-center shadow-sm">
                <HeaderLogo />
                </div>

                {/* Resumo do Envio */}
                <div className="bg-slate-800 px-5 py-4 text-white">
                <div className="font-bold text-base mb-1 truncate">{inboundData.nome}</div>
                <div className="flex gap-4 text-sm text-slate-300 font-medium">
                    <span>SKUs: <strong className="text-white">{inboundData.totalSku}</strong></span>
                    <span>•</span>
                    <span>Unidades: <strong className="text-white">{inboundData.totalUnidades}</strong></span>
                </div>
                </div>

                {/* Área Rolável de Skus */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                
                {skus.map((item) => {
                    const percentual = item.totalUnidades > 0 ? (item.bipados / item.totalUnidades) * 100 : 0;
                    
                    return (
                    <div key={item.sku} className={`border rounded-2xl p-4 transition-all shadow-sm ${item.status === 'concluido' ? 'bg-emerald-50/50 border-emerald-300' : 'bg-white border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-black text-gray-900 tracking-tight">SKU {item.sku}</div>
                        <div className="text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md">
                            {item.bipados} / {item.totalUnidades}
                        </div>
                        </div>
                        
                        <div className="text-xs text-gray-600 mb-4 leading-relaxed">{item.descricao}</div>
                        
                        <div className="w-full bg-gray-100 rounded-full h-2 mb-4 overflow-hidden border border-gray-200">
                        <div className={`h-full rounded-full transition-all duration-500 ${item.status === 'concluido' ? 'bg-emerald-500' : 'bg-[#1e293b]'}`} style={{ width: `${percentual}%` }}></div>
                        </div>
                        
                        <button className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-[0.98] ${item.status === 'concluido' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'}`}>
                        {item.status === 'concluido' ? (
                            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg> Pallet Confirmado</>
                        ) : (
                            <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Iniciar Bipagem</>
                        )}
                        </button>
                    </div>
                    )
                })}

                </div>
            </div>
            )}
        </div>
        </div>
    );
    }