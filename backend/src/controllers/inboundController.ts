import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs'; 

const prisma = new PrismaClient();

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
            variacoes: item.variacoes,
            leituras: [] // Inicializando o JSON de leituras
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

export const cadastrarMotorista = async (req: Request, res: Response) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: 'O nome do motorista é obrigatório.' });

    const existe = await prisma.motorista.findFirst({
      where: { nome: { equals: nome.trim(), mode: 'insensitive' } }
    });
    
    if (existe) return res.status(400).json({ error: 'Este motorista já está cadastrado no sistema.' });

    const novoMotorista = await prisma.motorista.create({
      data: { nome: nome.trim() }
    });

    return res.status(201).json({ mensagem: 'Motorista cadastrado com sucesso!', motorista: novoMotorista });
  } catch (error) {
    console.error("Erro ao cadastrar motorista:", error);
    return res.status(500).json({ error: 'Erro interno ao cadastrar motorista.' });
  }
};

export const cadastrarVeiculo = async (req: Request, res: Response) => {
  try {
    const { modelo, placa } = req.body;
    if (!modelo || !placa) return res.status(400).json({ error: 'Modelo e placa são obrigatórios.' });

    const placaLimpa = placa.trim().toUpperCase();
    const existe = await prisma.veiculo.findUnique({ where: { placa: placaLimpa } });
    
    if (existe) {
      return res.status(400).json({ error: 'Esta placa já está cadastrada no sistema.' });
    }

    const novoVeiculo = await prisma.veiculo.create({
      data: { modelo: modelo.trim(), placa: placaLimpa }
    });

    return res.status(201).json({ mensagem: 'Veículo cadastrado com sucesso!', veiculo: novoVeiculo });
  } catch (error) {
    console.error("Erro ao cadastrar veículo:", error);
    return res.status(500).json({ error: 'Erro interno ao cadastrar veículo.' });
  }
};

export const listarDashboard = async (req: Request, res: Response) => {
  try {
    const motoristas = await prisma.motorista.findMany({ orderBy: { nome: 'asc' } });
    const veiculos = await prisma.veiculo.findMany({ orderBy: { placa: 'asc' } });
    
    const inbounds = await prisma.inboundFull.findMany({ 
      include: { 
        motorista: true, 
        veiculo: true, 
        usuario: true,
        skus: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return res.status(200).json({ motoristas, veiculos, inbounds });
  } catch (error) {
    console.error("Erro ao listar ativos:", error);
    return res.status(500).json({ error: 'Erro interno ao listar dados da tela inicial.' });
  }
};

export const finalizarInbound = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { motoristaId, veiculoId, skus } = req.body; 

    const inboundAtualizado = await prisma.inboundFull.update({
      where: { id: Number(id) },
      data: {
        status: 'CONCLUIDO',
        motoristaId: motoristaId ? Number(motoristaId) : null,
        veiculoId: veiculoId ? Number(veiculoId) : null,
      }
    });

    if (skus && Array.isArray(skus)) {
      for (const sku of skus) {
        await prisma.inboundSku.update({
          where: { id: sku.id },
          data: {
            quantidadeBipada: sku.quantidadeBipada,
            status: sku.status,
            leituras: sku.leituras 
          }
        });
      }
    }

    return res.status(200).json({ 
      mensagem: 'Carga e Produtos salvos no banco com sucesso!', 
      inbound: inboundAtualizado 
    });
  } catch (error) {
    console.error("Erro ao finalizar inbound:", error);
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
        { header: 'Motorista', key: 'motorista', width: 25 },
        { header: 'Placa do Veículo', key: 'veiculo', width: 18 },
        { header: 'Operador Responsável', key: 'usuario', width: 22 },
        { header: 'Data do Despacho (Bipagem)', key: 'dataBipagem', width: 25 }, 
        { header: 'SKU Bipado', key: 'sku', width: 15 },
        { header: 'Descrição do Produto', key: 'descricao', width: 45 },
        { header: 'Serial / EAN Lido', key: 'serial', width: 25 }, 
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00A650' } }; 

      inboundAtualizado.skus.forEach((sku: any) => { // 'any' aqui contorna o erro temporário de tipagem do Prisma
        let arrayLeituras: any[] = [];
        
        if (sku.leituras) {
          if (typeof sku.leituras === 'string') {
            try { arrayLeituras = JSON.parse(sku.leituras); } catch (e) { arrayLeituras = []; }
          } else if (Array.isArray(sku.leituras)) {
            arrayLeituras = sku.leituras;
          }
        }

        if (arrayLeituras.length === 0) {
          worksheet.addRow({
            pallet: inboundAtualizado?.nomePallet,
            motorista: inboundAtualizado?.motorista?.nome || 'Não definido',
            veiculo: inboundAtualizado?.veiculo?.placa || 'Não definido',
            usuario: inboundAtualizado?.usuario?.username || 'Sistema',
            dataBipagem: '-',
            sku: sku.sku,
            descricao: sku.descricao,
            serial: 'Bipagem Sem Serial'
          });
        } else {
          arrayLeituras.forEach(leitura => {
            worksheet.addRow({
              pallet: inboundAtualizado?.nomePallet,
              motorista: inboundAtualizado?.motorista?.nome || 'Não definido',
              veiculo: inboundAtualizado?.veiculo?.placa || 'Não definido',
              usuario: inboundAtualizado?.usuario?.username || 'Sistema',
              dataBipagem: leitura.data ? new Date(leitura.data).toLocaleString('pt-BR') : '-',
              sku: sku.sku,
              descricao: sku.descricao,
              serial: leitura.codigo
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
  } catch (error) {
    console.error("Erro na ação do coordenador:", error);
    return res.status(500).json({ error: 'Erro interno ao processar a ação.' });
  }
};