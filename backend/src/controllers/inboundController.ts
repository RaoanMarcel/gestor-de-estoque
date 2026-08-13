    import { Request, Response } from 'express';
    import { PrismaClient } from '@prisma/client';

    const prisma = new PrismaClient();

    // Tradutor de ZPL: Transforma códigos Hexadecimais (_C3_B3) em Acentos Reais (ó)
    const decodeZPLText = (text: string) => {
    const urlEncoded = text.replace(/_([0-9A-Fa-f]{2})/g, '%$1');
    try {
        return decodeURIComponent(urlEncoded);
    } catch (e) {
        return text.replace(/_([0-9A-Fa-f]{2})/g, '');
    }
    };

    export const processarInboundPdf = async (req: Request, res: Response) => {
    try {
        const { nomePallet } = req.body;
        const arquivoTxt = (req as any).file;
        const usuarioId = (req as any).usuarioId || null;

        if (!arquivoTxt || !arquivoTxt.buffer) {
        return res.status(400).json({ error: 'Nenhum arquivo TXT foi enviado.' });
        }

        // Lê o conteúdo do arquivo TXT/ZPL
        const zplData = arquivoTxt.buffer.toString('utf-8');

        // Corta o texto a cada nova etiqueta (^XA)
        const blocos = zplData.split(/\^XA/i).filter((b: string) => b.trim() !== '');
        const produtosRaw: any[] = [];

        for (const bloco of blocos) {
        if (!bloco.includes('^XZ')) continue;

        // 1. Extrai o Código ML
        const matchML = bloco.match(/\^BCN,.*?\^FD([A-Z0-9]+)\^FS/i) || bloco.match(/\^FD([A-Z0-9]{7,15})\^FS/i);
        const ml = matchML ? matchML[1] : 'N/A';

        // 2. Extrai o SKU
        const matchSKU = bloco.match(/\^FDSKU:\s*([A-Z0-9\-]+)\^FS/i);
        const sku = matchSKU ? matchSKU[1] : 'N/A';

        // 3. Extrai a Quantidade
        const matchQtd = bloco.match(/\^PQ(\d+)/i);
        const quantidade = matchQtd ? parseInt(matchQtd[1], 10) : 1;

        // 4. Extrai a Descrição
        const todosFDs = Array.from(bloco.matchAll(/\^FD(.*?)\^FS/gi)).map((m: any) => m[1]);
        let descricao = 'Produto (Sem descrição)';

        const fdValidos = todosFDs.filter(texto => {
            const t = texto.trim();
            if (!t) return false;
            if (t === ml) return false;
            if (t.toUpperCase().startsWith('SKU:')) return false;
            return true;
        });

        if (fdValidos.length > 0) {
            descricao = decodeZPLText(fdValidos[0].trim());
        }

        if (sku !== 'N/A') {
            produtosRaw.push({ ml, ean: 'N/A', sku, descricao, quantidade });
        }
        }

        // 5. AGRUPAMENTO INTELIGENTE DAS GAVETAS (SKUs Repetidos)
        const skusExtraidos: any[] = [];

        for (const p of produtosRaw) {
        const existente = skusExtraidos.find(s => s.sku === p.sku);
        const novaVariacao = {
            codigoML: p.ml,
            codigoUniversal: p.ean,
            quantidade: p.quantidade
        };

        if (existente) {
            existente.quantidadeTotal += novaVariacao.quantidade;
            existente.variacoes.push(novaVariacao);

            if (p.descricao.length > existente.descricao.length) {
            existente.descricao = p.descricao;
            }
        } else {
            skusExtraidos.push({
            sku: p.sku,
            descricao: p.descricao,
            quantidadeTotal: novaVariacao.quantidade,
            variacoes: [novaVariacao]
            });
        }
        }

        if (skusExtraidos.length === 0) {
        return res.status(400).json({ error: 'Não foi possível encontrar nenhum produto válido no arquivo TXT.' });
        }

        const totalUnidadesCalc = skusExtraidos.reduce((acc, item) => acc + item.quantidadeTotal, 0);

        // 6. PERSISTÊNCIA NO BANCO
        const novoInbound = await prisma.inboundFull.create({
        data: {
            numeroFrete: null,
            nomePallet,
            status: 'PENDENTE',
            usuarioId: usuarioId ? Number(usuarioId) : null,
            skus: {
            create: skusExtraidos.map(item => ({
                sku: item.sku,
                descricao: item.descricao,
                quantidadeTotal: item.quantidadeTotal,
                quantidadeBipada: 0,
                status: 'PENDENTE',
                variacoes: item.variacoes // <-- VOLTOU! Agora o banco aceita salvar isso.
            }))
            }
        },
        include: { skus: true }
        });

        return res.status(201).json({
        mensagem: 'Inbound processado via TXT e salvo com sucesso!',
        inbound: novoInbound,
        totalSku: novoInbound.skus.length,
        totalUnidades: totalUnidadesCalc
        });

    } catch (error: any) {
        console.error("Erro ao processar TXT/ZPL:", error);
        return res.status(500).json({ error: 'Erro interno ao processar o arquivo TXT.' });
    }
    };