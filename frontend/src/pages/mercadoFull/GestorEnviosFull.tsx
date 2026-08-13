    import React, { useState, useRef } from 'react';
    import { useNavigate } from 'react-router-dom';
    import { useToast } from '../../contexts/toastContext';

    interface Variacao {
    codigoML: string;
    codigoUniversal: string;
    quantidade: number;
    }

    interface InboundSKU {
    id: number;
    sku: string;
    descricao: string;
    quantidadeTotal: number;
    quantidadeBipada: number;
    status: 'PENDENTE' | 'CONCLUIDO';
    variacoes?: Variacao[];
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

    export default function GestorEnviosFull() {
    const navigate = useNavigate();
    const toast = useToast();
    const [currentScreen, setCurrentScreen] = useState(1);
    
    const [nomePallet, setNomePallet] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [inboundData, setInboundData] = useState<{ id: number, nome: string, totalSku: number, totalUnidades: number } | null>(null);
    const [skus, setSkus] = useState<InboundSKU[]>([]);
    const [skuEmBipagem, setSkuEmBipagem] = useState<InboundSKU | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
        setSelectedFile(e.target.files[0]);
        }
    };

    const handleProcessarBackend = async () => {
        if (!selectedFile || !nomePallet) {
        toast.error("Preencha o nome do pallet e anexe o arquivo Inbound (TXT).");
        return;
        }
        
        setIsProcessing(true);

        try {
        const token = localStorage.getItem('wms_token');
        const formData = new FormData();
        formData.append('nomePallet', nomePallet);
        // Mantido como 'inboundPdf' para não quebrar o upload.single() do seu backend Multer
        formData.append('inboundPdf', selectedFile);

        const response = await fetch(`${API_URL}/inbounds/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao processar o arquivo.');
        }

        toast.success(data.mensagem || 'Inbound salvo com sucesso!');

        setInboundData({
            id: data.inbound.id,
            nome: data.inbound.nomePallet,
            totalSku: data.totalSku,
            totalUnidades: data.totalUnidades
        });
        
        setSkus(data.inbound.skus);
        setCurrentScreen(3);
        setSkuEmBipagem(null);
        
        } catch (error: any) {
        console.error("Erro na API:", error);
        toast.error(error.message || "Falha de conexão com o servidor.");
        } finally {
        setIsProcessing(false);
        }
    };

    const HeaderLogo = () => (
        <div className="flex items-center gap-1.5">
        <span className="text-emerald-500 italic font-black text-2xl leading-none">⚡ FULL</span>
        <span className="font-semibold text-gray-800 text-base leading-tight">Gestor de<br/>Envios</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F6F8FC] md:p-8 flex items-start justify-center font-sans antialiased">
        <div className="w-full min-h-screen md:min-h-0 md:max-w-2xl bg-white md:rounded-2xl md:shadow-xl md:border md:border-gray-200 flex flex-col relative overflow-hidden transition-all duration-300">
            
            {/* TELA 1: PÁGINA INICIAL */}
            {currentScreen === 1 && (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="p-5 md:p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <HeaderLogo />
                <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-700 transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                </div>

                <div className="p-5 md:p-8 flex-1 bg-gray-50 flex flex-col">
                <div className="bg-white border border-gray-200 text-gray-600 text-center text-sm py-2.5 rounded-lg mb-8 shadow-sm">
                    Aguardando Início...
                </div>

                <button onClick={() => setCurrentScreen(2)} className="w-full bg-[#1e293b] text-emerald-500 font-semibold py-4 rounded-xl mb-8 flex items-center justify-center gap-2 transition hover:bg-slate-800 shadow-md active:scale-[0.98]">
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
                </div>
            </div>
            )}

            {/* TELA 2: TELA DE NOVO ENVIO */}
            {currentScreen === 2 && (
            <div className="flex flex-col h-full bg-gray-50 animate-in slide-in-from-right-8 duration-300">
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
                    
                    {/* Alterado para aceitar apenas arquivos .txt */}
                    <input type="file" accept=".txt" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    
                    <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-6 md:p-8 flex flex-col items-center justify-center text-center mb-8 cursor-pointer transition ${selectedFile ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                    <svg className={`w-12 h-12 mb-3 ${selectedFile ? 'text-emerald-600' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 3v18h10v-8h-6V3H7zm8 0v6h6L15 3z"/>
                    </svg>
                    <span className="text-sm font-semibold text-gray-800">
                        {selectedFile ? 'Arquivo Inbound Pronto' : 'Toque para Anexar Inbound (TXT)'}
                    </span>
                    {selectedFile && (
                        <span className="text-xs text-emerald-600 mt-2 font-medium bg-emerald-100 px-3 py-1 rounded-full">
                        {selectedFile.name}
                        </span>
                    )}
                    </div>
                    
                    <button onClick={handleProcessarBackend} disabled={isProcessing} className={`w-full text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                    {isProcessing ? (
                        <span className="animate-pulse">⌛ Analisando Documento...</span>
                    ) : (
                        <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg> Criar e Processar Inbound</>
                    )}
                    </button>
                </div>
                </div>
            </div>
            )}

            {/* TELA 3: TELA DE BIPAGEM */}
            {currentScreen === 3 && inboundData && (
            <div className="flex flex-col h-full bg-gray-50 animate-in slide-in-from-right-8 duration-300">
                
                <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10 flex justify-between items-center shadow-sm">
                {skuEmBipagem ? (
                    <button onClick={() => setSkuEmBipagem(null)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold text-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                    Voltar para lista
                    </button>
                ) : (
                    <HeaderLogo />
                )}
                </div>

                {!skuEmBipagem && (
                <div className="bg-slate-800 px-5 py-4 text-white">
                    <div className="font-bold text-base mb-1 truncate">{inboundData.nome}</div>
                    <div className="flex gap-4 text-sm text-slate-300 font-medium">
                    <span>SKUs: <strong className="text-white">{inboundData.totalSku}</strong></span>
                    <span>•</span>
                    <span>Unidades: <strong className="text-white">{inboundData.totalUnidades}</strong></span>
                    </div>
                </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                
                {/* VISÃO 1: LISTA AGRUPADA COM BADGES */}
                {!skuEmBipagem && (
                    <div className="space-y-4">
                    {skus.map((item) => {
                        const percentual = item.quantidadeTotal > 0 ? (item.quantidadeBipada / item.quantidadeTotal) * 100 : 0;
                        
                        // Verifica as variações para criar os badges visuais na tela 1
                        const hasVarios = item.variacoes && item.variacoes.length > 1;
                        const primeiraVariacao = item.variacoes && item.variacoes.length > 0 ? item.variacoes[0] : null;
                        
                        return (
                        <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                            <div className="text-[15px] font-bold text-slate-900 tracking-tight">
                                SKU {item.sku}
                            </div>
                            <div className="text-xs font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md">
                                {item.quantidadeBipada} / {item.quantidadeTotal}
                            </div>
                            </div>

                            {/* BADGES: Exibe Códigos Rápidos */}
                            {primeiraVariacao && (
                            <div className="flex gap-2 mb-3">
                                <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                ML: {hasVarios ? 'Múltiplos' : primeiraVariacao.codigoML}
                                </span>
                                <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                EAN: {hasVarios ? 'Múltiplos' : primeiraVariacao.codigoUniversal}
                                </span>
                            </div>
                            )}
                            
                            <div className="text-[13px] text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                            {item.descricao}
                            </div>
                            
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${item.status === 'CONCLUIDO' ? 'bg-emerald-500' : 'bg-slate-300'}`} style={{ width: `${percentual}%` }}></div>
                            </div>
                            
                            <button 
                            onClick={() => setSkuEmBipagem(item)} 
                            className="w-full py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-slate-700 flex items-center justify-center gap-2 transition hover:bg-gray-100 active:scale-[0.99]"
                            >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> 
                            Iniciar Bipagem
                            </button>
                        </div>
                        );
                    })}
                    </div>
                )}

                {/* VISÃO 2: TABELA DE DETALHES (COM VARIAÇÕES EMPILHADAS) */}
                {skuEmBipagem && (
                    <div className="w-full max-w-lg mx-auto bg-white border border-gray-200 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                    
                    <div className="flex bg-[#F2F2F2] border-b border-gray-200">
                        <div className="flex-1 p-3 text-[13px] font-semibold text-gray-700 uppercase tracking-wide">
                        Produto
                        </div>
                        <div className="w-24 p-3 text-[13px] font-semibold text-gray-700 uppercase tracking-wide text-center border-l border-gray-200">
                        Unidades
                        </div>
                    </div>

                    <div className="flex border-b border-gray-200">
                        <div className="flex-1 p-4 space-y-2.5">
                        <div className="text-[14px] font-bold text-gray-900">
                            SKU: {skuEmBipagem.sku}
                        </div>
                        <div className="text-[14px] text-gray-700 leading-snug">
                            {skuEmBipagem.descricao}
                        </div>
                        
                        {/* CAIXA DE VARIAÇÕES EAN/ML */}
                        {skuEmBipagem.variacoes && skuEmBipagem.variacoes.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-gray-100">
                            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Variações de Links/EAN agrupadas:
                            </div>
                            <div className="space-y-1.5">
                                {skuEmBipagem.variacoes.map((varItem, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100 text-[12px]">
                                    <div className="flex flex-col gap-0.5">
                                    <span className="text-gray-700"><strong>ML:</strong> {varItem.codigoML}</span>
                                    <span className="text-gray-700"><strong>EAN:</strong> {varItem.codigoUniversal}</span>
                                    </div>
                                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                    + {varItem.quantidade} un
                                    </span>
                                </div>
                                ))}
                            </div>
                            </div>
                        )}
                        </div>
                        
                        <div className="w-24 p-4 flex items-center justify-center border-l border-gray-200 bg-gray-50/50">
                        <span className="text-xl font-medium text-gray-900 border border-gray-300 px-3 py-1 bg-white shadow-sm">
                            {skuEmBipagem.quantidadeTotal}
                        </span>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50">
                        <button className="w-full py-3.5 border-2 border-red-500 text-red-500 font-bold text-[15px] hover:bg-red-50 transition uppercase tracking-wide rounded-sm active:bg-red-100">
                        Iniciar Bipagem
                        </button>
                    </div>

                    </div>
                )}

                </div>
            </div>
            )}
        </div>
        </div>
    );
    }