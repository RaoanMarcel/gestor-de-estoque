    import { Request, Response } from 'express';
    import { createRequire } from 'module';
    import { PrismaClient } from '@prisma/client';

    const require = createRequire(import.meta.url);
    const prisma = new PrismaClient();

    export const processarInboundPdf = async (req: Request, res: Response) => {
    try {
        const { nomePallet } = req.body;
        
        // Forçamos a leitura como 'any' para evitar que o TS reclame do Multer (req.file)
        const arquivoPdf = (req as any).file; 
        const usuarioId = (req as any).usuarioId || null; 

        if (!arquivoPdf) {
        return res.status(400).json({ error: 'Nenhum arquivo PDF foi enviado.' });
        }

        if (!nomePallet) {
        return res.status(400).json({ error: 'O nome do pallet é obrigatório.' });
        }

        // =======================================================================
        // 🚀 ISOLAMENTO TOTAL DA BIBLIOTECA (Não derruba mais o servidor!)
        // =======================================================================
        let parsePdf: Function | null = null;
        try {
        // Puxa a biblioteca apenas no momento do envio do arquivo
        const pdfParseRaw = require('pdf-parse');
        
        // Procura a função escondida pelo empacotador TSX/Node 24
        if (typeof pdfParseRaw === 'function') {
            parsePdf = pdfParseRaw;
        } else if (pdfParseRaw && typeof pdfParseRaw.default === 'function') {
            parsePdf = pdfParseRaw.default;
        } else if (pdfParseRaw && typeof pdfParseRaw.PDFParse === 'function') {
            parsePdf = pdfParseRaw.PDFParse;
        }
        } catch (importError) {
        console.error("Falha ao carregar a biblioteca de PDF internamente:", importError);
        return res.status(500).json({ error: 'Erro interno no carregador de PDFs do servidor.' });
        }

        if (!parsePdf) {
        return res.status(500).json({ error: 'O motor de PDF não é compatível com a versão atual do Node.' });
        }
        // =======================================================================

        // 1. Extrai o texto bruto de dentro do PDF de forma segura
        const dadosPdf = await parsePdf(arquivoPdf.buffer);
        
        // Garantimos que o texto será lido como string
        const textoPdf: string = String(dadosPdf.text || '');

        // 2. Extração do Número do Frete (Ex: Frete #72595700)
        const matchFrete = textoPdf.match(/Frete\s*#?(\d+)/i);
        const numeroFrete = matchFrete ? matchFrete[1] : null;

        // 3. Lógica super inteligente para ler Inbounds do Mercado Livre
        const skusExtraidos: { sku: string; descricao: string; quantidadeTotal: number }[] = [];
        
        // Tipamos explicitamente o "l" como string
        const linhas = textoPdf.split('\n').map((l: string) => l.trim()).filter((l: string) => l !== '');
        
        for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i];
        
        if (linha.startsWith('SKU:')) {
            const partesSku = linha.split(':');
            const skuCodigo = partesSku[1]?.trim();
            
            if (skuCodigo) {
            let quantidade = 1;
            const qtdeLinha = linhas[i + 1]?.replace('|', '').trim();
            const parsedQtde = parseInt(qtdeLinha);
            
            if (!isNaN(parsedQtde) && parsedQtde > 0) {
                quantidade = parsedQtde;
            }

            let descricaoProduto = `Produto ML (SKU ${skuCodigo})`; 
            
            for (let j = i + 1; j < i + 8 && j < linhas.length; j++) {
                const linhaAtual = linhas[j];
                if (
                !linhaAtual.includes('|') && 
                !linhaAtual.toLowerCase().includes('etiquetagem') && 
                !linhaAtual.toLowerCase().includes('obrigatória') &&
                !linhaAtual.startsWith('Código ML') &&
                isNaN(parseInt(linhaAtual))
                ) {
                descricaoProduto = linhaAtual; 
                break;
                }
            }

            // Se o SKU já foi encontrado antes, ele SOMA as unidades.
            const itemExistente = skusExtraidos.find(s => s.sku === skuCodigo);
            
            if (itemExistente) {
                itemExistente.quantidadeTotal += quantidade;
            } else {
                skusExtraidos.push({
                sku: skuCodigo,
                descricao: descricaoProduto,
                quantidadeTotal: quantidade
                });
            }
            }
        }
        }

        if (skusExtraidos.length === 0) {
        return res.status(400).json({ error: 'Não foi possível encontrar nenhum SKU válido no PDF anexado.' });
        }

        const totalUnidadesCalc = skusExtraidos.reduce((acc, item) => acc + item.quantidadeTotal, 0);

        // 4. Salva no Banco de Dados usando o Prisma
        const novoInbound = await prisma.inboundFull.create({
        data: {
            numeroFrete,
            nomePallet,
            status: 'PENDENTE',
            usuarioId: usuarioId ? Number(usuarioId) : null,
            skus: {
            create: skusExtraidos.map(item => ({
                sku: item.sku,
                descricao: item.descricao,
                quantidadeTotal: item.quantidadeTotal,
                quantidadeBipada: 0,
                status: 'PENDENTE'
            }))
            }
        },
        include: {
            skus: true
        }
        });

        return res.status(201).json({
        mensagem: 'Inbound processado e salvo com sucesso!',
        inbound: novoInbound,
        totalSku: novoInbound.skus.length,
        totalUnidades: totalUnidadesCalc
        });

    } catch (error: any) {
        console.error("Erro ao processar PDF do Inbound:", error);
        return res.status(500).json({ error: 'Erro interno ao processar o arquivo PDF.' });
    }
    };