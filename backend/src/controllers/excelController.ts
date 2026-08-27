import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();

export const exportarHistoricoExcel = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { palletAlvo, nomeArquivo } = req.body;
    if (!palletAlvo) return res.status(400).json({ error: "É necessário selecionar um pallet para exportar." });

    const logs = await prisma.historicoMovimentacao.findMany({
      where: {
        OR: [
          { palletOrigem: String(palletAlvo) },
          { palletDestino: String(palletAlvo) }
        ]
      },
      include: { usuario: { select: { username: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const palletInfo = await prisma.pallet.findUnique({
      where: { numero: String(palletAlvo) },
      select: { descricao: true }
    });
    const descricaoPallet = palletInfo?.descricao || 'Sem descrição vinculada';

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Histórico de Movimentação');

    worksheet.columns = [
      { header: 'ID Log', key: 'id', width: 10 },
      { header: 'Operador', key: 'usuario', width: 18 },
      { header: 'Código da Triagem', key: 'codigoItem', width: 22 },
      { header: 'Operação', key: 'acao', width: 22 },
      { header: 'Pallet Origem', key: 'palletOrigem', width: 15 },
      { header: 'Pallet Destino', key: 'palletDestino', width: 15 },
      { header: 'Descrição do Pallet', key: 'descricao', width: 35 },
      { header: 'Data e Hora', key: 'createdAt', width: 22 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };

    logs.forEach((log) => {
      worksheet.addRow({
        id: log.id,
        usuario: log.usuario?.username || 'Sistema',
        codigoItem: log.codigoItem,
        acao: log.acao,
        palletOrigem: log.palletOrigem || '-',
        palletDestino: log.palletDestino || '-',
        descricao: descricaoPallet,
        createdAt: log.createdAt ? new Date(log.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-'
      });
    });

    const nomeFinal = nomeArquivo ? `${nomeArquivo}.xlsx` : `historico-${palletAlvo}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(nomeFinal)}`);

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error("Erro ao gerar planilha:", error);
    return res.status(500).json({ error: "Erro interno ao gerar o arquivo Excel." });
  }
};

export const exportarRelatorioRMA = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const registrosRMA = await prisma.historicoMovimentacao.findMany({
      where: { acao: 'ENVIADO_RMA' },
      include: { usuario: { select: { username: true } } },
      orderBy: { createdAt: 'desc' }
    });

    if (registrosRMA.length === 0) return res.status(404).json({ error: 'Nenhum registro de RMA encontrado.' });

    const palletsNomes = [...new Set(registrosRMA.map(r => r.palletOrigem).filter(Boolean))] as string[];
    const palletsDb = await prisma.pallet.findMany({
      where: { numero: { in: palletsNomes } },
      select: { numero: true, descricao: true }
    });
    const mapaDescricao = new Map(palletsDb.map(p => [p.numero, p.descricao]));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Estoque Fantasma - RMA');

    worksheet.columns = [
      { header: 'ID Log', key: 'id', width: 10 },
      { header: 'Operador', key: 'usuario', width: 18 },
      { header: 'Código da Triagem', key: 'codigoItem', width: 22 },
      { header: 'Ação Realizada', key: 'acao', width: 20 },
      { header: 'Pallet Origem', key: 'palletOrigem', width: 20 },
      { header: 'Descrição do Pallet', key: 'descricao', width: 35 },
      { header: 'Data/Hora do Despacho', key: 'createdAt', width: 22 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };

    registrosRMA.forEach((log) => {
      worksheet.addRow({
        id: log.id,
        usuario: log.usuario?.username || 'Sistema',
        codigoItem: log.codigoItem,
        acao: 'LANÇADO AO RMA',
        palletOrigem: log.palletOrigem || '-',
        descricao: log.palletOrigem ? (mapaDescricao.get(log.palletOrigem) || 'Sem descrição') : '-',
        createdAt: log.createdAt ? new Date(log.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-'
      });
    });

    const nomeFinal = 'relatorio-estoque-fantasma-rma.xlsx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(nomeFinal)}`);

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error("Erro ao gerar planilha de RMA:", error);
    return res.status(500).json({ error: 'Erro interno ao gerar relatório de RMA.' });
  }
};

export const exportarRelatorioGeralItens = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const produtos = await prisma.produtoPallet.findMany({
      where: {
        pallet: {
          OR: [
            { tipo: 'PADRAO' },
            { tipo: null },
            { tipo: '' }
          ]
        }
      },
      include: {
        pallet: {
          select: { numero: true, rua: true, estrutura: true, nivel: true, tipo: true }
        }
      },
      orderBy: { bipadoEm: 'desc' }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Triagem Padrão');

    worksheet.columns = [
      { header: 'Código do Item', key: 'codigo', width: 25 },
      { header: 'Pallet / Posição', key: 'pallet', width: 20 },
      { header: 'Tipo de Posição', key: 'tipo', width: 20 },
      { header: 'Rua', key: 'rua', width: 10 },
      { header: 'Estrutura', key: 'estrutura', width: 15 },
      { header: 'Nível', key: 'nivel', width: 10 },
      { header: 'Data de Entrada', key: 'data', width: 25 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

    produtos.forEach((p) => {
      worksheet.addRow({
        codigo: p.codigoItem,
        pallet: p.pallet?.numero || 'N/A',
        tipo: p.pallet?.tipo || 'PADRAO',
        rua: p.pallet?.rua || '-',
        estrutura: p.pallet?.estrutura || '-',
        nivel: p.pallet?.nivel || '-',
        data: p.bipadoEm ? new Date(p.bipadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Relatorio_Triagem.xlsx');

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error('Erro ao gerar relatório geral:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório geral de itens.' });
  }
};