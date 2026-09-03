import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getAuth, requireTenantId } from '../lib/auth.js';
import { parseNfeXml } from '../services/nfeParser.js';
import { notificarTenant } from '../lib/notificacoes.js';

const STATUS_RESOLVIDO = ['CONFERIDO', 'DISPENSADO'];

// 🚀 Normaliza o campo leituras (que pode voltar como string do banco) para array
const tratarItens = (itens: any[]) =>
  itens.map((item) => ({
    ...item,
    leituras: typeof item.leituras === 'string' ? JSON.parse(item.leituras) : (item.leituras || []),
  }));

const incluirRelacoes = {
  itens: { orderBy: { numItem: 'asc' } as const },
  usuario: { select: { username: true } },
};

// Recalcula o status do recebimento a partir da situação dos itens
const calcularStatusRecebimento = (statusAtual: string, itens: any[]): string => {
  if (statusAtual === 'FINALIZADO' || statusAtual === 'AGENDADO' || statusAtual === 'PRE_AGENDADO') return statusAtual;
  if (itens.length === 0) return 'IMPORTADO';

  const resolvidos = itens.filter((i) => STATUS_RESOLVIDO.includes(i.status)).length;
  const comProgresso = itens.some((i) => i.quantidadeConferida > 0 || STATUS_RESOLVIDO.includes(i.status));

  if (resolvidos === itens.length) return 'CONFERIDO';
  if (comProgresso) return 'EM_CONFERENCIA';
  return 'IMPORTADO';
};

const getUsuarioId = (req: Request): number | null => getAuth(req)?.id ?? null;
const getTid = (req: Request): number => requireTenantId(req);

export const listarDashboard = async (_req: Request, res: Response) => {
  try {
    const recebimentosDb = await prisma.recebimento.findMany({
      include: incluirRelacoes,
      orderBy: { createdAt: 'desc' },
    });

    const recebimentos = recebimentosDb.map((r) => ({ ...r, itens: tratarItens(r.itens) }));
    return res.status(200).json({ recebimentos });
  } catch (error) {
    console.error('[ERRO - GET /recebimentos/dashboard]:', error);
    return res.status(500).json({ error: 'Erro interno ao listar recebimentos.' });
  }
};

// Passo 1 — pré-agendamento: cria a "casca" do recebimento (sem data nem NF ainda).
export const criarRecebimento = async (req: Request, res: Response) => {
  try {
    const { identificacao, fornecedor, observacao } = req.body;

    if (!identificacao || !String(identificacao).trim()) {
      return res.status(400).json({ error: 'A identificação do recebimento é obrigatória.' });
    }

    const novo = await prisma.recebimento.create({
      data: {
        identificacao: String(identificacao).trim(),
        fornecedor: fornecedor ? String(fornecedor).trim() : null,
        observacao: observacao ? String(observacao).trim() : null,
        status: 'PRE_AGENDADO',
        usuarioId: getUsuarioId(req),
        tenantId: getTid(req),
      },
      include: incluirRelacoes,
    });

    return res.status(201).json({ mensagem: 'Pré-agendamento criado!', recebimento: { ...novo, itens: [] } });
  } catch (error) {
    console.error('[ERRO - POST /recebimentos]:', error);
    return res.status(500).json({ error: 'Erro interno ao criar o recebimento.' });
  }
};

// Passo 2 — agendamento: preenche data prevista / nº da NF / observação e libera a importação.
export const agendarRecebimento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fornecedor, numeroNota, dataAgendada, observacao } = req.body;

    const alvo = await prisma.recebimento.findUnique({ where: { id: Number(id) } });
    if (!alvo) return res.status(404).json({ error: 'Recebimento não encontrado.' });
    if (alvo.status !== 'PRE_AGENDADO' && alvo.status !== 'AGENDADO') {
      return res.status(400).json({ error: 'Este recebimento já passou da etapa de agendamento.' });
    }

    const recebimento = await prisma.recebimento.update({
      where: { id: Number(id) },
      data: {
        fornecedor: fornecedor !== undefined ? (String(fornecedor).trim() || null) : alvo.fornecedor,
        numeroNota: numeroNota ? String(numeroNota).trim() : null,
        dataAgendada: dataAgendada ? new Date(dataAgendada) : null,
        observacao: observacao !== undefined ? (String(observacao).trim() || null) : alvo.observacao,
        status: 'AGENDADO',
      },
      include: incluirRelacoes,
    });

    return res.status(200).json({ mensagem: 'Recebimento agendado!', recebimento: { ...recebimento, itens: tratarItens(recebimento.itens) } });
  } catch (error) {
    console.error('[ERRO - POST /recebimentos/:id/agendar]:', error);
    return res.status(500).json({ error: 'Erro interno ao agendar o recebimento.' });
  }
};

export const importarXml = async (req: Request, res: Response) => {
  try {
    const arquivo = (req as any).file;
    const { recebimentoId } = req.body;
    const tid = getTid(req);

    if (!arquivo || !arquivo.buffer) {
      return res.status(400).json({ error: 'Nenhum arquivo XML foi enviado.' });
    }

    let parsed;
    try {
      parsed = parseNfeXml(arquivo.buffer.toString('utf-8'));
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'XML inválido.' });
    }

    const { cabecalho, itens } = parsed;

    // Impede importar a mesma NF-e duas vezes
    if (cabecalho.chaveAcesso) {
      const jaExiste = await prisma.recebimento.findFirst({
        where: { chaveAcesso: cabecalho.chaveAcesso, id: recebimentoId ? { not: Number(recebimentoId) } : undefined },
      });
      if (jaExiste) {
        return res.status(409).json({ error: `Esta NF-e já foi importada (recebimento #${jaExiste.id}).` });
      }
    }

    const dadosNota = {
      numeroNota: cabecalho.numeroNota,
      serieNota: cabecalho.serieNota,
      chaveAcesso: cabecalho.chaveAcesso,
      fornecedor: cabecalho.fornecedor,
      fornecedorCnpj: cabecalho.fornecedorCnpj,
      valorTotal: cabecalho.valorTotal,
      dataEmissao: cabecalho.dataEmissao,
      xmlOriginal: arquivo.buffer.toString('utf-8'),
      status: 'IMPORTADO',
    };

    const itensCreate = itens.map((item) => ({
      numItem: item.numItem,
      codigoProduto: item.codigoProduto,
      ean: item.ean,
      eanTributavel: item.eanTributavel,
      descricao: item.descricao,
      ncm: item.ncm,
      cfop: item.cfop,
      unidade: item.unidade,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
      valorTotal: item.valorTotal,
      precisaConferencia: true,
      quantidadeConferida: 0,
      status: 'PENDENTE',
      leituras: [] as any,
      tenantId: tid,
    }));

    let recebimento;

    if (recebimentoId) {
      const alvo = await prisma.recebimento.findUnique({ where: { id: Number(recebimentoId) } });
      if (!alvo) return res.status(404).json({ error: 'Agendamento não encontrado.' });
      if (alvo.status !== 'AGENDADO' && alvo.status !== 'PRE_AGENDADO') {
        return res.status(400).json({ error: 'Este recebimento já possui uma nota importada.' });
      }

      recebimento = await prisma.recebimento.update({
        where: { id: Number(recebimentoId) },
        data: {
          ...dadosNota,
          identificacao: alvo.identificacao,
          itens: { create: itensCreate },
        },
        include: incluirRelacoes,
      });
    } else {
      recebimento = await prisma.recebimento.create({
        data: {
          ...dadosNota,
          identificacao: cabecalho.numeroNota ? `NF ${cabecalho.numeroNota}` : 'Recebimento sem número',
          usuarioId: getUsuarioId(req),
          tenantId: tid,
          itens: { create: itensCreate },
        },
        include: incluirRelacoes,
      });
    }

    notificarTenant(tid, {
      tipo: 'RECEBIMENTO',
      titulo: 'Recebimento',
      texto: `Nova NF importada: ${recebimento.identificacao} (${recebimento.itens.length} itens).`,
      link: '/recebimento',
    });

    return res.status(201).json({
      mensagem: 'XML importado com sucesso!',
      recebimento: { ...recebimento, itens: tratarItens(recebimento.itens) },
      totalItens: recebimento.itens.length,
    });
  } catch (error) {
    console.error('[ERRO - POST /recebimentos/importar-xml]:', error);
    return res.status(500).json({ error: 'Erro interno ao importar o XML.' });
  }
};

export const atualizarConferencia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { itens } = req.body;

    const recebimentoDb = await prisma.recebimento.findUnique({
      where: { id: Number(id) },
      include: { itens: true },
    });
    if (!recebimentoDb) return res.status(404).json({ error: 'Recebimento não encontrado.' });
    if (recebimentoDb.status === 'FINALIZADO') {
      return res.status(400).json({ error: 'Este recebimento já foi finalizado.' });
    }

    if (Array.isArray(itens) && itens.length > 0) {
      const transacoes = itens.map((item: any) => {
        const precisaConferencia = item.precisaConferencia !== false;
        const qtdConferida = Number(item.quantidadeConferida) || 0;
        const alvo = recebimentoDb.itens.find((i) => i.id === item.id);
        const qtdTotal = alvo ? alvo.quantidade : qtdConferida;

        let status: string;
        if (!precisaConferencia) {
          status = 'DISPENSADO';
        } else if (qtdConferida >= qtdTotal && qtdTotal > 0) {
          status = 'CONFERIDO';
        } else if (qtdConferida > 0) {
          status = 'EM_PROCESSO';
        } else {
          status = 'PENDENTE';
        }

        return prisma.recebimentoItem.update({
          where: { id: item.id },
          data: {
            precisaConferencia,
            quantidadeConferida: precisaConferencia ? qtdConferida : 0,
            status,
            leituras: item.leituras ?? [],
          },
        });
      });
      await prisma.$transaction(transacoes);
    }

    const itensAtualizados = await prisma.recebimentoItem.findMany({ where: { recebimentoId: Number(id) } });
    const novoStatus = calcularStatusRecebimento(recebimentoDb.status, itensAtualizados);

    const recebimento = await prisma.recebimento.update({
      where: { id: Number(id) },
      data: { status: novoStatus },
      include: incluirRelacoes,
    });

    return res.status(200).json({
      mensagem: 'Conferência sincronizada!',
      recebimento: { ...recebimento, itens: tratarItens(recebimento.itens) },
    });
  } catch (error) {
    console.error('[ERRO - PUT /recebimentos/:id/conferencia]:', error);
    return res.status(500).json({ error: 'Erro interno ao salvar a conferência.' });
  }
};

export const acaoRecebimento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { acao } = req.body;

    if (acao === 'EXCLUIR') {
      await prisma.recebimento.delete({ where: { id: Number(id) } });
      return res.status(200).json({ mensagem: 'Recebimento removido do sistema.' });
    }

    if (acao === 'FINALIZAR') {
      const alvo = await prisma.recebimento.findUnique({ where: { id: Number(id) }, include: { itens: true } });
      if (!alvo) return res.status(404).json({ error: 'Recebimento não encontrado.' });

      const pendentes = alvo.itens.filter((i) => !STATUS_RESOLVIDO.includes(i.status));
      if (pendentes.length > 0) {
        return res.status(400).json({ error: `Ainda há ${pendentes.length} item(ns) sem conferência ou dispensa.` });
      }

      const recebimento = await prisma.recebimento.update({
        where: { id: Number(id) },
        data: { status: 'FINALIZADO' },
        include: incluirRelacoes,
      });
      return res.status(200).json({
        mensagem: 'Recebimento finalizado!',
        recebimento: { ...recebimento, itens: tratarItens(recebimento.itens) },
      });
    }

    return res.status(400).json({ error: 'Ação desconhecida.' });
  } catch (error) {
    console.error('[ERRO - POST /recebimentos/:id/acao]:', error);
    return res.status(500).json({ error: 'Erro interno ao processar a ação.' });
  }
};
