import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();


export const exportarHistoricoExcel = async (req: Request, res: Response) => {
  try {
    // Recebe o identificador do pallet e o nome do arquivo vindos do frontend
    const { palletAlvo, nomeArquivo } = req.body;

    if (!palletAlvo) {
      return res.status(400).json({ error: "É necessário selecionar um pallet para exportar." });
    }

    // 1. Busca os logs no banco filtrando pelo pallet escolhido
    const logs = await (prisma as any).historicoMovimentacao.findMany({
      where: { palletAlvo: String(palletAlvo) },
      orderBy: { bipadoEm: 'desc' }
    });

    // 2. Inicia a construção da planilha Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Histórico de Movimentação');

    // Estrutura das colunas do arquivo
    worksheet.columns = [
      { header: 'ID Log', key: 'id', width: 12 },
      { header: 'Código da Triagem', key: 'codigoItem', width: 25 },
      { header: 'Operação', key: 'acao', width: 15 },
      { header: 'Pallet Relacionado', key: 'palletAlvo', width: 20 },
      { header: 'Data e Hora', key: 'bipadoEm', width: 25 },
    ];

    // Estilização básica do cabeçalho (Fundo azul escuro e texto branco negrito)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E3A8A' } 
    };

    // 3. Alimenta as linhas com os registros do banco local
    logs.forEach((log: any) => {
      worksheet.addRow({
        id: log.id,
        codigoItem: log.codigoItem,
        acao: log.acao,
        palletAlvo: log.palletAlvo,
        bipadoEm: new Date(log.bipadoEm).toLocaleString('pt-BR')
      });
    });

    // Define o nome digitado pelo usuário (ou adota um padrão caso esteja em branco)
    const nomeFinal = nomeArquivo ? `${nomeArquivo}.xlsx` : `historico-${palletAlvo}.xlsx`;

    // Configura os cabeçalhos HTTP necessários para disparar o download no navegador
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${encodeURIComponent(nomeFinal)}`
    );

    // Envia o arquivo binário direto para a resposta da API
    await workbook.xlsx.write(res);
    return res.end();

  } catch (error) {
    console.error("Erro ao gerar planilha:", error);
    return res.status(500).json({ error: "Erro interno ao gerar o arquivo Excel." });
  }
};

// ====================================================================
// 📋 2. EXPORTAR RELATÓRIO DE ESTOQUE FANTASMA (RMA) - NOVO
// ====================================================================
export const exportarRelatorioRMA = async (req: Request, res: Response) => {
  try {
    // 1. Busca no banco local todos os logs com a ação específica de RMA
    const registrosRMA = await (prisma as any).historicoMovimentacao.findMany({
      where: {
        acao: 'ENVIADO_RMA'
      },
      orderBy: {
        bipadoEm: 'desc' // Traz os descartes mais recentes primeiro sincronizado com o campo correto
      }
    });

    if (registrosRMA.length === 0) {
      return res.status(404).json({ error: 'Nenhum registro de RMA encontrado para gerar o relatório.' });
    }

    // 2. Cria a estrutura da planilha Excel usando o exceljs
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Estoque Fantasma - RMA');

    // Define as colunas do relatório técnico
    worksheet.columns = [
      { header: 'ID Log', key: 'id', width: 12 },
      { header: 'Código da Triagem', key: 'codigoItem', width: 25 },
      { header: 'Ação Realizada', key: 'acao', width: 20 },
      { header: 'Pallet Origem (Defeito)', key: 'palletAlvo', width: 25 },
      { header: 'Data/Hora do Despacho', key: 'bipadoEm', width: 25 }
    ];

    // Estiliza o cabeçalho (Fundo Cinza/Slate Escuro para diferenciar do relatório comum)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { 
      type: 'pattern', 
      pattern: 'solid', 
      fgColor: { argb: '334155' } 
    };

    // 3. Alimenta as linhas da planilha cruzando as informações do banco
    registrosRMA.forEach((log: any) => {
      worksheet.addRow({
        id: log.id,
        codigoItem: log.codigoItem,
        acao: 'LANÇADO AO RMA',
        palletAlvo: log.palletAlvo, // Nome do pallet de defeito de onde ele saiu
        bipadoEm: new Date(log.bipadoEm).toLocaleString('pt-BR')
      });
    });

    // Define o nome padrão para o download do arquivo de auditoria
    const nomeFinal = 'relatorio-estoque-fantasma-rma.xlsx';

    // Configura os headers de resposta para download de arquivo binário no navegador
    res.setHeader(
      'Content-Type', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition', 
      `attachment; filename=${encodeURIComponent(nomeFinal)}`
    );

    // Transmite a planilha diretamente pelo buffer de rede
    await workbook.xlsx.write(res);
    return res.end();

  } catch (error) {
    console.error("Erro ao gerar planilha de RMA:", error);
    return res.status(500).json({ error: 'Erro interno do servidor ao gerar relatório de RMA.' });
  }
};