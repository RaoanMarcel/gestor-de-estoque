import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getAuth } from '../lib/auth.js';
import ExcelJS from 'exceljs';
import { getMascaraPorSku } from './maskController.js'; // 🚀 IMPORTANDO O ARQUIVO DE MÁSCARAS

const decodeZPLText = (text: string) => {
  const urlEncoded = text.replace(/_([0-9A-Fa-f]{2})/g, '%$1');
  try { return decodeURIComponent(urlEncoded); } catch (e) { return text.replace(/_([0-9A-Fa-f]{2})/g, ''); }
};

export const processarInboundPdf = async (req: Request, res: Response) => {
  try {
    const { nomePallet } = req.body;
    const arquivoTxt = (req as any).file;
    const auth = getAuth(req);
    const usuarioId = auth?.id ?? null;
    const tid = auth!.tenantId;

    if (!arquivoTxt || !arquivoTxt.buffer) return res.status(400).json({ error: 'Nenhum arquivo TXT foi enviado.' });

    const zplData = arquivoTxt.buffer.toString('utf-8');
    const blocos = zplData.split(/\^XA/i).filter((b: string) => b.trim() !== '');
    const produtosRaw: any[] = [];

    for (const bloco of blocos) {
      if (!bloco.includes('^XZ')) continue;
      const matchML = bloco.match(/\^BCN,.*?\^FD([A-Z0-9]+)\^FS/i) || bloco.match(/\^FD([A-Z0-9]{7,15})\^FS/i);
      const ml = matchML ? matchML[1] : 'N/A';
      const matchSKU = bloco.match(/\^FDSKU:\s*([A-Z0-9\-]+)\^FS/i);
      const sku = matchSKU ? matchSKU[1] : 'N/A';
      const matchQtd = bloco.match(/\^PQ(\d+)/i);
      const quantidade = matchQtd ? parseInt(matchQtd[1], 10) : 1;

      const todosFDs = Array.from(bloco.matchAll(/\^FD(.*?)\^FS/gi)).map((m: any) => m[1]);
      let descricao = 'Produto (Sem descrição)';

      const fdValidos = todosFDs.filter(texto => {
        const t = texto.trim();
        if (!t || t === ml || t.toUpperCase().startsWith('SKU:')) return false;
        return true;
      });

      if (fdValidos.length > 0) descricao = decodeZPLText(fdValidos[0].trim());
      if (sku !== 'N/A') produtosRaw.push({ ml, ean: 'N/A', sku, descricao, quantidade });
    }

    const skusExtraidos: any[] = [];
    for (const p of produtosRaw) {
      const existente = skusExtraidos.find(s => s.sku === p.sku);
      const novaVariacao = { codigoML: p.ml, codigoUniversal: p.ean, quantidade: p.quantidade };
      if (existente) {
        existente.quantidadeTotal += novaVariacao.quantidade;
        existente.variacoes.push(novaVariacao);
        if (p.descricao.length > existente.descricao.length) existente.descricao = p.descricao;
      } else {
        skusExtraidos.push({ sku: p.sku, descricao: p.descricao, quantidadeTotal: novaVariacao.quantidade, variacoes: [novaVariacao] });
      }
    }

    if (skusExtraidos.length === 0) return res.status(400).json({ error: 'Nenhum produto válido encontrado no arquivo TXT.' });

    const totalUnidadesCalc = skusExtraidos.reduce((acc, item) => acc + item.quantidadeTotal, 0);

    const novoInbound = await prisma.inboundFull.create({
      data: {
        numeroFrete: null,
        nomePallet,
        status: 'PENDENTE',
        usuarioId: usuarioId ? Number(usuarioId) : null,
        tenantId: tid,
        skus: {
          create: skusExtraidos.map(item => ({
            sku: item.sku,
            descricao: item.descricao,
            quantidadeTotal: item.quantidadeTotal,
            quantidadeBipada: 0,
            status: 'PENDENTE',
            variacoes: item.variacoes,
            leituras: [],
            tenantId: tid
          }))
        }
      },
      include: { skus: true, usuario: { select: { username: true } } }
    });

    // 🚀 INJETANDO A MÁSCARA ANTES DE ENVIAR PARA O FRONT
    const inboundTratado = {
      ...novoInbound,
      skus: novoInbound.skus.map((sku: any) => ({
        ...sku,
        mascaraPredefinida: getMascaraPorSku(sku.sku)
      }))
    };

    return res.status(201).json({ mensagem: 'Inbound processado via TXT e salvo com sucesso!', inbound: inboundTratado, totalSku: novoInbound.skus.length, totalUnidades: totalUnidadesCalc });
  } catch (error: any) { return res.status(500).json({ error: 'Erro interno ao processar o arquivo TXT.' }); }
};

export const cadastrarMotorista = async (req: Request, res: Response) => {
  try {
    const { nome } = req.body;
    const tid = getAuth(req)!.tenantId;
    if (!nome) return res.status(400).json({ error: 'O nome do motorista é obrigatório.' });
    const existe = await prisma.motorista.findFirst({ where: { nome: { equals: nome.trim(), mode: 'insensitive' } } });
    if (existe) return res.status(400).json({ error: 'Este motorista já está cadastrado no sistema.' });
    const novoMotorista = await prisma.motorista.create({ data: { nome: nome.trim(), tenantId: tid } });
    return res.status(201).json({ mensagem: 'Motorista cadastrado com sucesso!', motorista: novoMotorista });
  } catch (error) { return res.status(500).json({ error: 'Erro interno ao cadastrar motorista.' }); }
};

export const cadastrarVeiculo = async (req: Request, res: Response) => {
  try {
    const { modelo, placa } = req.body;
    const tid = getAuth(req)!.tenantId;
    if (!modelo || !placa) return res.status(400).json({ error: 'Modelo e placa são obrigatórios.' });
    const placaLimpa = placa.trim().toUpperCase();
    const existe = await prisma.veiculo.findFirst({ where: { placa: placaLimpa } });
    if (existe) return res.status(400).json({ error: 'Esta placa já está cadastrada no sistema.' });
    const novoVeiculo = await prisma.veiculo.create({ data: { modelo: modelo.trim(), placa: placaLimpa, tenantId: tid } });
    return res.status(201).json({ mensagem: 'Veículo cadastrado com sucesso!', veiculo: novoVeiculo });
  } catch (error) { return res.status(500).json({ error: 'Erro interno ao cadastrar veículo.' }); }
};

export const listarDashboard = async (req: Request, res: Response) => {
  try {
    const motoristas = await prisma.motorista.findMany({ orderBy: { nome: 'asc' } });
    const veiculos = await prisma.veiculo.findMany({ orderBy: { placa: 'asc' } });
    
    const inboundsDb = await prisma.inboundFull.findMany({ 
      include: { motorista: true, veiculo: true, usuario: { select: { username: true } }, skus: true },
      orderBy: { createdAt: 'desc' }
    });
    
    // 🚀 INJETANDO A MÁSCARA NA LISTAGEM
    const inbounds = inboundsDb.map(inb => ({
      ...inb,
      skus: inb.skus.map((sku: any) => ({
        ...sku,
        leituras: typeof sku.leituras === 'string' ? JSON.parse(sku.leituras) : (sku.leituras || []),
        mascaraPredefinida: getMascaraPorSku(sku.sku)
      }))
    }));

    return res.status(200).json({ motoristas, veiculos, inbounds });
  } catch (error) { return res.status(500).json({ error: 'Erro interno ao listar dados.' }); }
};

export const finalizarInbound = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { motoristaId, veiculoId, skus } = req.body; 

    const inboundDb = await prisma.inboundFull.findUnique({ where: { id: Number(id) }, include: { skus: true } });
    if (!inboundDb) return res.status(404).json({ error: 'Envio não encontrado' });

    if (skus && Array.isArray(skus)) {
      const transacoes = skus.map((sku: any) => {
        const skuStatus = sku.quantidadeBipada >= sku.quantidadeTotal ? 'CONCLUIDO' : (sku.quantidadeBipada > 0 ? 'EM_PROCESSO' : 'PENDENTE');
        return prisma.inboundSku.update({
          where: { id: sku.id },
          data: { quantidadeBipada: sku.quantidadeBipada, status: skuStatus, leituras: sku.leituras }
        });
      });
      await prisma.$transaction(transacoes);
    }

    const skusParaCalculo = skus && Array.isArray(skus) ? skus : inboundDb.skus;
    const totalEsperado = skusParaCalculo.reduce((acc: number, s: any) => acc + s.quantidadeTotal, 0);
    const totalBipado = skusParaCalculo.reduce((acc: number, s: any) => acc + s.quantidadeBipada, 0);

    let statusDesejado = inboundDb.status;
    
    if (statusDesejado !== 'ENVIADO') {
      if (totalBipado === 0) {
        statusDesejado = 'PENDENTE';
      } else if (totalBipado > 0 && totalBipado < totalEsperado) {
        statusDesejado = 'EM_PROCESSO';
      } else if (totalBipado >= totalEsperado) {
        if (motoristaId && veiculoId) {
          statusDesejado = 'CONCLUIDO';
        } else {
          statusDesejado = 'EM_PROCESSO';
        }
      }
    }

    const inboundAtualizado = await prisma.inboundFull.update({
      where: { id: Number(id) },
      data: {
        status: statusDesejado,
        motoristaId: motoristaId ? Number(motoristaId) : null,
        veiculoId: veiculoId ? Number(veiculoId) : null,
      },
      include: { motorista: true, veiculo: true, usuario: { select: { username: true } }, skus: true }
    });

    // 🚀 INJETANDO A MÁSCARA NA RESPOSTA DA FINALIZAÇÃO
    const inboundTratado = {
      ...inboundAtualizado,
      skus: inboundAtualizado.skus.map((sku: any) => ({
        ...sku,
        mascaraPredefinida: getMascaraPorSku(sku.sku)
      }))
    };

    return res.status(200).json({ mensagem: 'Sincronizado com sucesso!', inbound: inboundTratado });
  } catch (error) { 
    console.error("Erro no finalizarInbound:", error);
    return res.status(500).json({ error: 'Erro ao finalizar a carga Inbound.' }); 
  }
};

export const acaoCoordenador = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { acao } = req.body;

    if (acao === 'EXCLUIR') {
      await prisma.inboundFull.delete({ where: { id: Number(id) } });
      return res.status(200).json({ mensagem: 'O Envio foi removido do sistema!' });
    } 
    else if (acao === 'ENVIAR' || acao === 'REIMPRIMIR') {
      let inboundAtualizado;
      if (acao === 'ENVIAR') {
        inboundAtualizado = await prisma.inboundFull.update({
          where: { id: Number(id) },
          data: { status: 'ENVIADO' }, 
          include: { motorista: true, veiculo: true, skus: true, usuario: true }
        });
      } else {
        inboundAtualizado = await prisma.inboundFull.findUnique({
          where: { id: Number(id) },
          include: { motorista: true, veiculo: true, skus: true, usuario: true }
        });
      }

      if (!inboundAtualizado) return res.status(404).json({ error: 'Envio não encontrado.' });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rastreabilidade Full');

      worksheet.columns = [
        { header: 'ID do Envio / Pallet', key: 'pallet', width: 25 },
        { header: 'Operador (Importador)', key: 'usuarioImportou', width: 22 },
        { header: 'Motorista', key: 'motorista', width: 25 },
        { header: 'Placa do Veículo', key: 'veiculo', width: 18 },
        { header: 'Data do Despacho (Bipagem)', key: 'dataBipagem', width: 25 }, 
        { header: 'SKU Bipado', key: 'sku', width: 15 },
        { header: 'Descrição do Produto', key: 'descricao', width: 45 },
        { header: 'Serial / EAN Lido', key: 'serial', width: 25 }, 
        { header: 'Operador (Bipou)', key: 'usuarioBipou', width: 22 }, 
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00A650' } }; 

      inboundAtualizado.skus.forEach((sku: any) => { 
        let arrayLeituras: any[] = [];
        try { arrayLeituras = typeof sku.leituras === 'string' ? JSON.parse(sku.leituras) : (sku.leituras || []); } catch(e){}

        const nomeImportador = (inboundAtualizado as any).usuario?.username || (inboundAtualizado as any).usuario?.nome || 'Sistema';

        if (arrayLeituras.length === 0) {
          worksheet.addRow({
            pallet: inboundAtualizado?.nomePallet,
            usuarioImportou: nomeImportador,
            motorista: inboundAtualizado?.motorista?.nome || 'Não definido',
            veiculo: inboundAtualizado?.veiculo?.placa || 'Não definido',
            dataBipagem: '-',
            sku: sku.sku,
            descricao: sku.descricao,
            serial: 'Bipagem Manual (Sem Serial)',
            usuarioBipou: '-'
          });
        } else {
          arrayLeituras.forEach(leitura => {
            const dataFormatada = leitura.data 
                ? new Date(leitura.data).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) 
                : '-';

            worksheet.addRow({
              pallet: inboundAtualizado?.nomePallet,
              usuarioImportou: nomeImportador,
              motorista: inboundAtualizado?.motorista?.nome || 'Não definido',
              veiculo: inboundAtualizado?.veiculo?.placa || 'Não definido',
              dataBipagem: dataFormatada,
              sku: sku.sku,
              descricao: sku.descricao,
              serial: leitura.codigo,
              usuarioBipou: leitura.usuarioNome || 'Não registrado'
            });
          });
        }
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=Rastreabilidade_${inboundAtualizado.nomePallet}.xlsx`);
      await workbook.xlsx.write(res);
      return res.end();
    }
    return res.status(400).json({ error: 'Ação desconhecida.' });
  } catch (error) { return res.status(500).json({ error: 'Erro interno ao processar a ação.' }); }
};