import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getAuth, requireTenantId } from '../lib/auth.js';
import { parseNfeXml } from '../services/nfeParser.js';
import { notificarTenant } from '../lib/notificacoes.js';
import {
  RMA_STATUS, DESFECHO, DESFECHOS_FINAIS, DESFECHOS_RETORNO, DIRECAO_NOTA, TIPO_NOTA, DESTINO_ESTOQUE,
  proximoNumeroRma, proximoNumeroPalletRma, classificarNota,
  semearDemo, simularRetornoDemo, FORNECEDOR_DEMO,
} from '../lib/rma.js';

const tid = (req: Request) => requireTenantId(req);

const ehRetornoAoEstoque = (desfecho: string) => (DESFECHOS_RETORNO as readonly string[]).includes(desfecho);

const serieIgual = (a?: string | null, b?: string | null) =>
  !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

const txLongo = <T,>(fn: (tx: any) => Promise<T>) => prisma.$transaction(fn, { timeout: 25000, maxWait: 12000 });

function derivarStatus(rma: { status: string }, itens: { desfecho: string }[], notas: { direcao: string }[]): string {
  if (rma.status === RMA_STATUS.FINALIZADO || rma.status === RMA_STATUS.CANCELADO) return rma.status;
  const temResolvido = itens.some((i) => i.desfecho !== DESFECHO.PENDENTE);
  const temEntrada = notas.some((n) => n.direcao === DIRECAO_NOTA.ENTRADA);
  const temSaida = notas.some((n) => n.direcao === DIRECAO_NOTA.SAIDA);
  if (temResolvido || temEntrada) return RMA_STATUS.EM_CONFERENCIA;
  if (temSaida) return RMA_STATUS.AGUARDANDO_RETORNO;
  return RMA_STATUS.ABERTO;
}

async function recomputarStatus(client: any, rmaId: number) {
  const rma = await client.rma.findUnique({
    where: { id: rmaId },
    include: { itens: { select: { desfecho: true } }, notas: { select: { direcao: true } } },
  });
  if (!rma) return;
  const novo = derivarStatus(rma, rma.itens, rma.notas);
  if (novo !== rma.status) await client.rma.update({ where: { id: rmaId }, data: { status: novo } });
}

const incluirDetalhe = {
  pallet: { select: { id: true, numero: true } },
  fornecedorRef: { select: { id: true, nome: true, email: true } },
  abertoPor: { select: { username: true } },
  itens: { orderBy: { id: 'asc' as const } },
  notas: { orderBy: { id: 'asc' as const } },
  anotacoes: { orderBy: { createdAt: 'desc' as const }, include: { usuario: { select: { username: true } } } },
};

type LinhaNota = { descricao?: string | null; codigo?: string | null; quantidade?: number | null };

type ItemCobertura = { id: number; desfecho?: string; produtoCodigo?: string | null; produtoNome?: string | null };

function linhasDeRetorno(notas: { direcao: string; itens?: unknown }[]): LinhaNota[] {
  return notas
    .filter((n) => n.direcao === DIRECAO_NOTA.ENTRADA)
    .flatMap((n) => (Array.isArray(n.itens) ? (n.itens as LinhaNota[]) : []));
}

const normTxt = (s: unknown) => String(s ?? '').trim().toLowerCase();
const qtdLinha = (l: LinhaNota) => Math.max(1, Math.round(Number(l.quantidade) || 1));
const chavesProduto = (it: ItemCobertura) => [normTxt(it.produtoCodigo), normTxt(it.produtoNome)].filter(Boolean);

function orcamentoRetorno(itens: ItemCobertura[], notas: { direcao: string; itens?: unknown }[]) {
  const linhas = linhasDeRetorno(notas);
  const porProduto = new Map<string, number>();
  for (const l of linhas) {
    const ch = normTxt(l.codigo) || normTxt(l.descricao);
    if (ch) porProduto.set(ch, (porProduto.get(ch) || 0) + qtdLinha(l));
  }
  const casaPorSku = itens.some((it) => chavesProduto(it).some((ch) => porProduto.has(ch)));
  return {
    temDetalhe: linhas.length > 0,
    casaPorSku,
    porProduto,
    geral: linhas.reduce((s, l) => s + qtdLinha(l), 0),
  };
}

function anotarCobertura<T extends ItemCobertura>(
  itens: T[],
  notas: { direcao: string; itens?: unknown }[],
): (T & { esperadoNoRetorno: boolean })[] {
  const notasEntrada = notas.filter((n) => n.direcao === DIRECAO_NOTA.ENTRADA);
  const cobre = new Map<number, boolean>();

  if (notasEntrada.length === 0) {
    for (const it of itens) cobre.set(it.id, false);
    return itens.map((it) => ({ ...it, esperadoNoRetorno: false }));
  }

  const orc = orcamentoRetorno(itens, notas);
  if (!orc.temDetalhe) {
    return itens.map((it) => ({ ...it, esperadoNoRetorno: true }));
  }

  const porProduto = new Map(orc.porProduto);
  let geral = orc.geral;
  const consome = (it: ItemCobertura): boolean => {
    if (orc.casaPorSku) {
      for (const ch of chavesProduto(it)) {
        if ((porProduto.get(ch) || 0) > 0) { porProduto.set(ch, porProduto.get(ch)! - 1); return true; }
      }
      return false;
    }
    if (geral > 0) { geral -= 1; return true; }
    return false;
  };

  const ordenados = [...itens].sort((a, b) => a.id - b.id);
  for (const it of ordenados) if (ehRetornoAoEstoque(it.desfecho || '')) cobre.set(it.id, consome(it));
  for (const it of ordenados) if (!ehRetornoAoEstoque(it.desfecho || '')) cobre.set(it.id, consome(it));

  return itens.map((it) => ({ ...it, esperadoNoRetorno: !!cobre.get(it.id) }));
}

function bipagemForaDoOrcamento(
  itens: (ItemCobertura & { codigoTriagem?: string })[],
  notas: { direcao: string; itens?: unknown }[],
  idsAlvo: number[],
): { id: number; codigo: string } | null {
  const orc = orcamentoRetorno(itens, notas);
  if (!orc.temDetalhe) return null;

  const porProduto = new Map(orc.porProduto);
  let geral = orc.geral;
  const consome = (it: ItemCobertura): boolean => {
    if (orc.casaPorSku) {
      for (const ch of chavesProduto(it)) {
        if ((porProduto.get(ch) || 0) > 0) { porProduto.set(ch, porProduto.get(ch)! - 1); return true; }
      }
      return false;
    }
    if (geral > 0) { geral -= 1; return true; }
    return false;
  };

  const alvo = new Set(idsAlvo);
  for (const it of itens) if (ehRetornoAoEstoque(it.desfecho || '') && !alvo.has(it.id)) consome(it);
  for (const id of idsAlvo) {
    const it = itens.find((x) => x.id === id);
    if (!it || ehRetornoAoEstoque(it.desfecho || '')) continue;
    if (!consome(it)) return { id, codigo: it.codigoTriagem || String(id) };
  }
  return null;
}

async function carregarDetalhe(rmaId: number) {
  const rma = await prisma.rma.findFirst({ where: { id: rmaId }, include: incluirDetalhe });
  if (!rma) return null;
  return { ...rma, itens: anotarCobertura(rma.itens, rma.notas) };
}

export const listarRmas = async (req: Request, res: Response) => {
  try {
    const { status, fornecedor, busca } = req.query as Record<string, string>;
    const where: any = {};
    if (status) where.status = status;
    if (fornecedor) where.fornecedor = { contains: fornecedor, mode: 'insensitive' };
    if (busca) {
      where.OR = [
        { numero: { contains: busca, mode: 'insensitive' } },
        { fornecedor: { contains: busca, mode: 'insensitive' } },
        { notas: { some: { numero: { contains: busca } } } },
        { itens: { some: { identificador: { contains: busca } } } },
      ];
    }

    const rmas = await prisma.rma.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        abertoPor: { select: { username: true } },
        itens: { select: { desfecho: true } },
        _count: { select: { notas: true } },
      },
    });

    const lista = rmas.map((r) => {
      const total = r.itens.length;
      const resolvidos = r.itens.filter((i) => i.desfecho !== DESFECHO.PENDENTE).length;
      const { itens, ...resto } = r;
      return { ...resto, totalItens: total, resolvidos };
    });
    return res.json({ rmas: lista });
  } catch (error) {
    console.error('[ERRO GET /rma]', error);
    return res.status(500).json({ error: 'Erro ao listar RMAs.' });
  }
};

export const obterRma = async (req: Request, res: Response) => {
  try {
    const rma = await carregarDetalhe(Number(req.params.id));
    if (!rma) return res.status(404).json({ error: 'RMA não encontrado.' });
    return res.json({ rma });
  } catch (error) {
    console.error('[ERRO GET /rma/:id]', error);
    return res.status(500).json({ error: 'Erro ao carregar o RMA.' });
  }
};

export const listarFontes = async (_req: Request, res: Response) => {
  try {
    const pallets = await prisma.pallet.findMany({
      where: { tipo: { contains: 'DEFEITO', mode: 'insensitive' } },
      include: { produtos: { orderBy: { bipadoEm: 'desc' } } },
      orderBy: { numero: 'asc' },
    });
    return res.json({ pallets });
  } catch (error) {
    console.error('[ERRO GET /rma/fontes]', error);
    return res.status(500).json({ error: 'Erro ao listar pallets de defeito.' });
  }
};

export const listarPalletsTriagem = async (_req: Request, res: Response) => {
  try {
    const pallets = await prisma.pallet.findMany({
      where: { OR: [{ tipo: { contains: 'TRIAGEM', mode: 'insensitive' } }, { tipo: 'PADRAO' }, { tipo: null }] },
      select: { id: true, numero: true, tipo: true, _count: { select: { produtos: true } } },
      orderBy: { numero: 'asc' },
    });
    return res.json({ pallets });
  } catch (error) {
    console.error('[ERRO GET /rma/pallets-triagem]', error);
    return res.status(500).json({ error: 'Erro ao listar pallets.' });
  }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const listarFornecedores = async (_req: Request, res: Response) => {
  try {
    const fornecedores = await prisma.rmaFornecedor.findMany({
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, email: true, _count: { select: { rmas: true } } },
    });
    return res.json({ fornecedores });
  } catch (error) {
    console.error('[ERRO GET /rma/fornecedores]', error);
    return res.status(500).json({ error: 'Erro ao listar fornecedores.' });
  }
};

export const criarFornecedor = async (req: Request, res: Response) => {
  try {
    const t = tid(req);
    const nome = String(req.body.nome || '').trim();
    const email = req.body.email ? String(req.body.email).trim() : null;
    if (!nome) return res.status(400).json({ error: 'Informe o nome do fornecedor.' });
    if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: 'E-mail inválido.' });

    const existe = await prisma.rmaFornecedor.findFirst({ where: { nome: { equals: nome, mode: 'insensitive' } } });
    if (existe) return res.status(409).json({ error: 'Já existe um fornecedor com esse nome.' });

    const fornecedor = await prisma.rmaFornecedor.create({ data: { nome, email, tenantId: t } });
    return res.status(201).json({ fornecedor });
  } catch (error) {
    console.error('[ERRO POST /rma/fornecedores]', error);
    return res.status(500).json({ error: 'Erro ao cadastrar o fornecedor.' });
  }
};

export const atualizarFornecedor = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const fornecedor = await prisma.rmaFornecedor.findFirst({ where: { id } });
    if (!fornecedor) return res.status(404).json({ error: 'Fornecedor não encontrado.' });

    const data: { nome?: string; email?: string | null } = {};
    if (req.body.nome !== undefined) {
      const nome = String(req.body.nome).trim();
      if (!nome) return res.status(400).json({ error: 'O nome não pode ficar vazio.' });
      data.nome = nome;
    }
    if (req.body.email !== undefined) {
      const email = String(req.body.email || '').trim() || null;
      if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: 'E-mail inválido.' });
      data.email = email;
    }
    const atualizado = await prisma.rmaFornecedor.update({ where: { id }, data });
    return res.json({ fornecedor: atualizado });
  } catch (error) {
    console.error('[ERRO PATCH /rma/fornecedores/:id]', error);
    return res.status(500).json({ error: 'Erro ao atualizar o fornecedor.' });
  }
};

async function resolverFornecedor(tx: any, tenantId: number, body: any) {
  const porId = Number(body.fornecedorId);
  if (Number.isFinite(porId) && porId > 0) {
    const f = await tx.rmaFornecedor.findFirst({ where: { id: porId } });
    if (!f) throw new Error('Fornecedor não encontrado.');
    return { nome: f.nome as string, email: (f.email ?? null) as string | null, refId: f.id as number };
  }
  const nome = String(body.fornecedor || '').trim();
  if (!nome) throw new Error('Informe o fornecedor.');
  const email = body.fornecedorEmail ? String(body.fornecedorEmail).trim() : null;
  const f = await tx.rmaFornecedor.upsert({
    where: { tenantId_nome: { tenantId, nome } },
    update: email ? { email } : {},
    create: { tenantId, nome, email },
  });
  return { nome: f.nome as string, email: (f.email ?? null) as string | null, refId: f.id as number };
}

export const criarRma = async (req: Request, res: Response) => {
  try {
    const t = tid(req);
    const auth = getAuth(req);

    const rma = await txLongo(async (tx) => {
      const forn = await resolverFornecedor(tx, t, req.body);
      const numero = await proximoNumeroRma(tx, t);
      const numeroPallet = await proximoNumeroPalletRma(tx, t);
      const pallet = await tx.pallet.create({
        data: { numero: numeroPallet, tipo: 'RMA', descricao: `RMA ${numero} — ${forn.nome}`, rua: 'RMA', tenantId: t },
      });
      return tx.rma.create({
        data: {
          numero,
          fornecedor: forn.nome,
          fornecedorEmail: forn.email,
          fornecedorRefId: forn.refId,
          fornecedorCnpj: req.body.fornecedorCnpj ? String(req.body.fornecedorCnpj).trim() : null,
          status: RMA_STATUS.ABERTO,
          palletId: pallet.id,
          abertoPorId: auth?.id ?? null,
          tenantId: t,
        },
      });
    });
    return res.status(201).json({ rma: await carregarDetalhe(rma.id) });
  } catch (error: any) {
    console.error('[ERRO POST /rma]', error);
    return res.status(400).json({ error: error?.message || 'Erro ao criar o RMA.' });
  }
};

export const criarDemo = async (req: Request, res: Response) => {
  try {
    const t = tid(req);
    const auth = getAuth(req);

    const existente = await prisma.rma.findFirst({ where: { demo: true }, select: { id: true } });
    if (existente) return res.status(200).json({ rma: await carregarDetalhe(existente.id), jaExistia: true });

    const novoId = await txLongo(async (tx) => {
      const numero = await proximoNumeroRma(tx, t);
      const numeroPallet = await proximoNumeroPalletRma(tx, t);
      const pallet = await tx.pallet.create({
        data: { numero: numeroPallet, tipo: 'RMA', descricao: `RMA ${numero} — demonstração`, rua: 'RMA', tenantId: t },
      });
      const novo = await tx.rma.create({
        data: { numero, fornecedor: FORNECEDOR_DEMO, status: RMA_STATUS.ABERTO, demo: true, palletId: pallet.id, abertoPorId: auth?.id ?? null, tenantId: t },
      });
      await semearDemo(tx, novo.id, t);
      return novo.id;
    });
    return res.status(201).json({ rma: await carregarDetalhe(novoId) });
  } catch (error) {
    console.error('[ERRO POST /rma/demo]', error);
    return res.status(500).json({ error: 'Erro ao criar a demonstração.' });
  }
};

export const simularRetorno = async (req: Request, res: Response) => {
  try {
    const t = tid(req);
    const rmaId = Number(req.params.id);
    const rma = await prisma.rma.findFirst({ where: { id: rmaId } });
    if (!rma) return res.status(404).json({ error: 'RMA não encontrado.' });
    if (!rma.demo) return res.status(400).json({ error: 'Só a demonstração aceita retorno simulado.' });

    await txLongo(async (tx) => { await simularRetornoDemo(tx, rmaId, t); });
    const atualizado = await carregarDetalhe(rmaId);
    return res.json({ rma: atualizado });
  } catch (error) {
    console.error('[ERRO POST /rma/:id/simular-retorno]', error);
    return res.status(500).json({ error: 'Erro ao simular o retorno.' });
  }
};

export const reiniciarDemo = async (req: Request, res: Response) => {
  try {
    const t = tid(req);
    const rmaId = Number(req.params.id);
    const rma = await prisma.rma.findFirst({ where: { id: rmaId } });
    if (!rma) return res.status(404).json({ error: 'RMA não encontrado.' });
    if (!rma.demo) return res.status(400).json({ error: 'Só o RMA de demonstração pode ser reiniciado.' });

    await txLongo(async (tx) => { await semearDemo(tx, rmaId, t); });
    const atualizado = await carregarDetalhe(rmaId);
    return res.json({ rma: atualizado });
  } catch (error) {
    console.error('[ERRO POST /rma/:id/reiniciar]', error);
    return res.status(500).json({ error: 'Erro ao reiniciar a demonstração.' });
  }
};

export const excluirRma = async (req: Request, res: Response) => {
  try {
    const rmaId = Number(req.params.id);
    const rma = await prisma.rma.findFirst({ where: { id: rmaId }, include: { _count: { select: { itens: true } } } });
    if (!rma) return res.status(404).json({ error: 'RMA não encontrado.' });
    if (rma._count.itens > 0) return res.status(400).json({ error: 'Este RMA tem itens — remova-os antes de excluir.' });
    if (rma.status === RMA_STATUS.FINALIZADO) return res.status(400).json({ error: 'RMA finalizado não pode ser excluído.' });

    await txLongo(async (tx) => {
      await tx.rma.delete({ where: { id: rmaId } });
      if (rma.palletId) await tx.pallet.deleteMany({ where: { id: rma.palletId } });
    });
    return res.json({ ok: true });
  } catch (error) {
    console.error('[ERRO DELETE /rma/:id]', error);
    return res.status(500).json({ error: 'Erro ao excluir o RMA.' });
  }
};

export const adicionarItens = async (req: Request, res: Response) => {
  try {
    const t = tid(req);
    const auth = getAuth(req);
    const rmaId = Number(req.params.id);
    let itens: any[] = Array.isArray(req.body.itens) ? req.body.itens : [];

    if (itens.length === 0 && Array.isArray(req.body.codigosItens) && req.body.codigosItens.length > 0) {
      const encontrados = await prisma.produtoPallet.findMany({
        where: { codigoItem: { in: req.body.codigosItens.map(String) } },
        select: { id: true },
      });
      itens = encontrados.map((p) => ({ produtoPalletId: p.id }));
    }
    if (itens.length === 0) return res.status(400).json({ error: 'Nenhum item selecionado.' });

    const rma = await prisma.rma.findFirst({
      where: { id: rmaId },
      include: { notas: { where: { direcao: DIRECAO_NOTA.SAIDA }, select: { id: true } } },
    });
    if (!rma) return res.status(404).json({ error: 'RMA não encontrado.' });
    if (rma.status === RMA_STATUS.FINALIZADO || rma.status === RMA_STATUS.CANCELADO) {
      return res.status(400).json({ error: 'Este RMA já foi encerrado.' });
    }
    if (rma.notas.length > 0) {
      return res.status(400).json({ error: 'A nota de remessa já foi gerada — os itens estão travados.' });
    }

    await txLongo(async (tx) => {
      for (const it of itens) {
        const pp = await tx.produtoPallet.findFirst({
          where: { id: Number(it.produtoPalletId) },
          include: { rmaItem: { select: { id: true } } },
        });
        if (!pp) throw new Error(`Item ${it.produtoPalletId} não encontrado.`);
        if (pp.rmaItem) throw new Error(`O item ${pp.codigoItem} já está num RMA.`);

        const identificador = it.identificador ? String(it.identificador).trim() : null;
        const tipoIdentificador = it.tipoIdentificador === 'EAN' ? 'EAN' : it.tipoIdentificador === 'SERIE' ? 'SERIE' : null;

        await tx.produtoPallet.update({
          where: { id: pp.id },
          data: {
            palletId: rma.palletId!,
            numeroSerie: tipoIdentificador === 'SERIE' ? identificador : pp.numeroSerie,
            ean: tipoIdentificador === 'EAN' ? identificador : pp.ean,
          },
        });

        await tx.rmaItem.create({
          data: {
            rmaId, tenantId: t,
            produtoPalletId: pp.id,
            origemPalletId: pp.palletId,
            codigoTriagem: pp.codigoItem,
            identificador, tipoIdentificador,
            produtoCodigo: pp.codigoItem,
            desfecho: DESFECHO.PENDENTE,
          },
        });

        await tx.historicoMovimentacao.create({
          data: {
            codigoItem: pp.codigoItem,
            acao: 'ENVIADO_RMA',
            palletOrigem: String(pp.palletId),
            palletAlvo: rma.numero,
            usuarioId: auth?.id ?? null,
            tenantId: t,
          } as any,
        });
      }
      await recomputarStatus(tx, rmaId);
    });

    const atualizado = await carregarDetalhe(rmaId);
    return res.json({ rma: atualizado });
  } catch (error: any) {
    console.error('[ERRO POST /rma/:id/itens]', error);
    return res.status(400).json({ error: error?.message || 'Erro ao adicionar itens.' });
  }
};

export const removerItem = async (req: Request, res: Response) => {
  try {
    const rmaId = Number(req.params.id);
    const itemId = Number(req.params.itemId);

    const rma = await prisma.rma.findFirst({
      where: { id: rmaId },
      include: { notas: { where: { direcao: DIRECAO_NOTA.SAIDA }, select: { id: true } } },
    });
    if (!rma) return res.status(404).json({ error: 'RMA não encontrado.' });
    if (rma.status === RMA_STATUS.FINALIZADO || rma.status === RMA_STATUS.CANCELADO) {
      return res.status(400).json({ error: 'RMA encerrado — não dá para remover itens.' });
    }
    if (rma.notas.length > 0) {
      return res.status(400).json({ error: 'A nota de remessa já foi gerada — os itens estão travados.' });
    }

    await txLongo(async (tx) => {
      const item = await tx.rmaItem.findFirst({ where: { id: itemId, rmaId } });
      if (!item) throw new Error('Item não encontrado neste RMA.');

      if (item.produtoPalletId && item.origemPalletId) {
        const destino = await tx.pallet.findFirst({ where: { id: item.origemPalletId } });
        if (destino) await tx.produtoPallet.update({ where: { id: item.produtoPalletId }, data: { palletId: destino.id } });
      }
      await tx.rmaItem.delete({ where: { id: itemId } });
      await recomputarStatus(tx, rmaId);
    });

    const atualizado = await carregarDetalhe(rmaId);
    return res.json({ rma: atualizado });
  } catch (error: any) {
    console.error('[ERRO DELETE /rma/:id/itens/:itemId]', error);
    return res.status(400).json({ error: error?.message || 'Erro ao remover o item.' });
  }
};

export const definirDesfecho = async (req: Request, res: Response) => {
  try {
    const rmaId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const { desfecho } = req.body;

    if (![DESFECHO.CREDITO, DESFECHO.DESCARTE, DESFECHO.PENDENTE].includes(desfecho)) {
      return res.status(400).json({ error: 'Aqui só dá para marcar Crédito ou Descarte. Troca e conserto são pela bipagem do retorno.' });
    }

    const rma = await prisma.rma.findFirst({
      where: { id: rmaId },
      include: { itens: true, notas: { select: { direcao: true, itens: true } } },
    });
    if (!rma) return res.status(404).json({ error: 'RMA não encontrado.' });
    if (rma.status === RMA_STATUS.FINALIZADO) return res.status(400).json({ error: 'RMA já finalizado.' });
    const temNotaRetorno = rma.notas.some((n) => n.direcao === DIRECAO_NOTA.ENTRADA);
    if (!temNotaRetorno) {
      return res.status(400).json({ error: 'Importe a nota de retorno antes de definir desfechos.' });
    }
    const cobertura = anotarCobertura(rma.itens, rma.notas);
    const alvo = cobertura.find((i) => i.id === itemId);
    if (alvo?.esperadoNoRetorno && desfecho !== DESFECHO.PENDENTE) {
      return res.status(400).json({ error: 'Este item consta na nota de retorno — registre a troca pela conferência (bipagem).' });
    }

    await txLongo(async (tx) => {
      const item = await tx.rmaItem.findFirst({ where: { id: itemId, rmaId } });
      if (!item) throw new Error('Item não encontrado.');
      if (ehRetornoAoEstoque(item.desfecho)) throw new Error('Este item já foi bipado no retorno (troca ou conserto).');
      await tx.rmaItem.update({
        where: { id: itemId },
        data: { desfecho, retornoSerie: null, resolvidoEm: desfecho === DESFECHO.PENDENTE ? null : new Date() },
      });
      await recomputarStatus(tx, rmaId);
    });

    const atualizado = await carregarDetalhe(rmaId);
    return res.json({ rma: atualizado });
  } catch (error: any) {
    console.error('[ERRO PATCH /rma/:id/itens/:itemId]', error);
    return res.status(400).json({ error: error?.message || 'Erro ao definir o desfecho.' });
  }
};

export const importarNota = async (req: Request, res: Response) => {
  try {
    const t = tid(req);
    const rmaId = Number(req.params.id);
    const rma = await prisma.rma.findFirst({ where: { id: rmaId }, select: { id: true } });
    if (!rma) return res.status(404).json({ error: 'RMA não encontrado.' });

    const arquivo = (req as any).file;
    let dados: any;

    if (arquivo?.buffer) {
      let parsed;
      try { parsed = parseNfeXml(arquivo.buffer.toString('utf-8')); }
      catch (err: any) { return res.status(400).json({ error: err.message || 'XML inválido.' }); }
      const { cabecalho } = parsed;
      if (cabecalho.chaveAcesso) {
        const jaExiste = await prisma.rmaNota.findFirst({ where: { chaveAcesso: cabecalho.chaveAcesso } });
        if (jaExiste) return res.status(409).json({ error: 'Esta NF-e já está vinculada a um RMA.' });
      }
      const { direcao, tipo } = classificarNota(cabecalho);
      dados = {
        direcao: req.body.direcao || direcao,
        tipo: req.body.tipo || tipo,
        numero: cabecalho.numeroNota,
        serie: cabecalho.serieNota,
        chaveAcesso: cabecalho.chaveAcesso,
        natureza: cabecalho.naturezaOperacao,
        dataEmissao: cabecalho.dataEmissao,
        statusNota: 'IMPORTADA',
        xmlOriginal: arquivo.buffer.toString('utf-8'),
        itens: parsed.itens.map((i) => ({ descricao: i.descricao, codigo: i.codigoProduto, quantidade: i.quantidade })),
      };
    } else {
      const { numero, serie, tipo, direcao, natureza } = req.body;
      if (!numero || !tipo || !direcao) return res.status(400).json({ error: 'Informe número, tipo e direção da nota.' });
      const linhas = Array.isArray(req.body.itens)
        ? req.body.itens
            .map((i: any) => ({ descricao: String(i?.descricao || '').trim(), codigo: String(i?.codigo || '').trim(), quantidade: Math.max(1, Math.round(Number(i?.quantidade) || 1)) }))
            .filter((i: any) => i.descricao || i.codigo)
        : null;
      dados = {
        direcao: direcao === DIRECAO_NOTA.ENTRADA ? DIRECAO_NOTA.ENTRADA : DIRECAO_NOTA.SAIDA,
        tipo: [TIPO_NOTA.REMESSA, TIPO_NOTA.DEVOLUCAO, TIPO_NOTA.RETORNO, TIPO_NOTA.OUTRA].includes(tipo) ? tipo : TIPO_NOTA.OUTRA,
        numero: String(numero).trim(),
        serie: serie ? String(serie).trim() : null,
        natureza: natureza ? String(natureza).trim() : null,
        dataEmissao: req.body.dataEmissao ? new Date(req.body.dataEmissao) : null,
        statusNota: 'MANUAL',
        ...(linhas && linhas.length ? { itens: linhas } : {}),
      };
    }

    await txLongo(async (tx) => {
      await tx.rmaNota.create({ data: { rmaId, tenantId: t, ...dados } });
      await recomputarStatus(tx, rmaId);
    });

    const atualizado = await carregarDetalhe(rmaId);
    if (dados.direcao === DIRECAO_NOTA.ENTRADA) {
      notificarTenant(t, {
        tipo: 'RMA', titulo: 'RMA',
        texto: `${atualizado?.numero || 'RMA'}: nota de retorno recebida — pronta para a conferência.`,
        link: '/rma',
      });
    }
    return res.status(201).json({ rma: atualizado });
  } catch (error: any) {
    console.error('[ERRO POST /rma/:id/notas]', error);
    return res.status(400).json({ error: error?.message || 'Erro ao vincular a nota.' });
  }
};

export const removerNota = async (req: Request, res: Response) => {
  try {
    const rmaId = Number(req.params.id);
    const notaId = Number(req.params.notaId);
    const nota = await prisma.rmaNota.findFirst({ where: { id: notaId, rmaId } });
    if (!nota) return res.status(404).json({ error: 'Nota não encontrada.' });
    await txLongo(async (tx) => {
      await tx.rmaNota.delete({ where: { id: notaId } });
      await recomputarStatus(tx, rmaId);
    });
    const atualizado = await carregarDetalhe(rmaId);
    return res.json({ rma: atualizado });
  } catch (error) {
    console.error('[ERRO DELETE /rma/:id/notas/:notaId]', error);
    return res.status(500).json({ error: 'Erro ao remover a nota.' });
  }
};

export const confrontarRetorno = async (req: Request, res: Response) => {
  try {
    const rmaId = Number(req.params.id);
    const { notaId, bipagens, marcarRestantesCredito } = req.body;
    const lista: any[] = Array.isArray(bipagens) ? bipagens : [];

    const rma = await prisma.rma.findFirst({
      where: { id: rmaId },
      include: { itens: true, notas: { select: { direcao: true, itens: true } } },
    });
    if (!rma) return res.status(404).json({ error: 'RMA não encontrado.' });
    if (rma.status === RMA_STATUS.FINALIZADO) return res.status(400).json({ error: 'RMA já finalizado.' });
    if (!rma.notas.some((n) => n.direcao === DIRECAO_NOTA.ENTRADA)) {
      return res.status(400).json({ error: 'Importe a nota de retorno antes da conferência.' });
    }

    const idsAlvo = lista.map((b) => Number(b.rmaItemId)).filter((n) => Number.isFinite(n));
    const fora = bipagemForaDoOrcamento(rma.itens, rma.notas, idsAlvo);
    if (fora) {
      return res.status(400).json({ error: `O item ${fora.codigo} não consta na nota de retorno (ou a quantidade da nota já foi atingida) — não dá para bipar.` });
    }

    await txLongo(async (tx) => {
      for (const b of lista) {
        const item = await tx.rmaItem.findFirst({ where: { id: Number(b.rmaItemId), rmaId } });
        if (!item) continue;
        const serieVolta = b.novaSerie ? String(b.novaSerie).trim() : null;
        const conserto = item.tipoIdentificador === 'SERIE' && serieIgual(serieVolta, item.identificador);
        await tx.rmaItem.update({
          where: { id: item.id },
          data: {
            desfecho: conserto ? DESFECHO.CONSERTO : DESFECHO.TROCA,
            retornoSerie: serieVolta,
            retornoNotaId: notaId ? Number(notaId) : null,
            resolvidoEm: new Date(),
          },
        });
      }
      if (marcarRestantesCredito) {
        await tx.rmaItem.updateMany({
          where: { rmaId, desfecho: DESFECHO.PENDENTE },
          data: { desfecho: DESFECHO.CREDITO, resolvidoEm: new Date() },
        });
      }
      await recomputarStatus(tx, rmaId);
    });

    const atualizado = await carregarDetalhe(rmaId);
    return res.json({ rma: atualizado });
  } catch (error: any) {
    console.error('[ERRO POST /rma/:id/confronto]', error);
    return res.status(400).json({ error: error?.message || 'Erro no confronto.' });
  }
};

export const finalizarRma = async (req: Request, res: Response) => {
  try {
    const t = tid(req);
    const auth = getAuth(req);
    const rmaId = Number(req.params.id);
    const destinos: any[] = Array.isArray(req.body.destinos) ? req.body.destinos : [];
    const mapaDestino = new Map<number, any>(destinos.map((d) => [Number(d.rmaItemId), d]));

    const rma = await prisma.rma.findFirst({ where: { id: rmaId }, include: { itens: true } });
    if (!rma) return res.status(404).json({ error: 'RMA não encontrado.' });
    if (rma.status === RMA_STATUS.FINALIZADO) return res.status(400).json({ error: 'RMA já finalizado.' });

    const pendente = rma.itens.find((i) => i.desfecho === DESFECHO.PENDENTE);
    if (pendente) return res.status(400).json({ error: `O item ${pendente.codigoTriagem} ainda não tem desfecho.` });

    await txLongo(async (tx) => {
      for (const item of rma.itens) {
        if (item.produtoPalletId) {
          await tx.produtoPallet.deleteMany({ where: { id: item.produtoPalletId } });
        }

        if (ehRetornoAoEstoque(item.desfecho)) {
          const ehConserto = item.desfecho === DESFECHO.CONSERTO;
          const d = mapaDestino.get(item.id) || {};
          const destino = d.destino === DESTINO_ESTOQUE.TRIAGEM ? DESTINO_ESTOQUE.TRIAGEM : DESTINO_ESTOQUE.FANTASMA_NOVO;
          let palletDestinoId: number | null = null;

          if (rma.demo) {
            await tx.rmaItem.update({ where: { id: item.id }, data: { destinoEstoque: destino } });
            continue;
          }

          if (destino === DESTINO_ESTOQUE.TRIAGEM) {
            const palletId = Number(d.palletId);
            const alvo = await tx.pallet.findFirst({ where: { id: palletId } });
            if (!alvo) throw new Error(`Pallet de triagem inválido para o item ${item.codigoTriagem}.`);
            const codigo = (item.retornoSerie && item.retornoSerie.trim()) || `RMA-RET-${item.id}`;
            const jaExiste = await tx.produtoPallet.findFirst({ where: { codigoItem: codigo } });
            if (jaExiste) throw new Error(`Já existe um item com o código "${codigo}".`);
            await tx.produtoPallet.create({
              data: {
                codigoItem: codigo,
                palletId: alvo.id,
                numeroSerie: item.retornoSerie || null,
                usuarioId: auth?.id ?? null,
                tenantId: t,
              },
            });
            palletDestinoId = alvo.id;
            await tx.historicoMovimentacao.create({
              data: { codigoItem: codigo, codigoAnterior: item.codigoTriagem, acao: ehConserto ? 'RMA_RETORNO_CONSERTO' : 'RMA_RETORNO_TRIAGEM', palletDestino: String(alvo.id), palletOrigem: rma.numero, usuarioId: auth?.id ?? null, tenantId: t } as any,
            });
          } else {
            await tx.historicoMovimentacao.create({
              data: { codigoItem: item.retornoSerie || item.codigoTriagem, codigoAnterior: item.codigoTriagem, acao: ehConserto ? 'RMA_RETORNO_CONSERTO' : 'RMA_RETORNO_NOVO', palletOrigem: rma.numero, usuarioId: auth?.id ?? null, tenantId: t } as any,
            });
          }

          await tx.rmaItem.update({ where: { id: item.id }, data: { destinoEstoque: destino, destinoPalletId: palletDestinoId } });
        } else if (!rma.demo) {
          await tx.historicoMovimentacao.create({
            data: { codigoItem: item.codigoTriagem, acao: item.desfecho === DESFECHO.CREDITO ? 'RMA_CREDITO' : 'RMA_DESCARTE', palletOrigem: rma.numero, usuarioId: auth?.id ?? null, tenantId: t } as any,
          });
        }
      }

      await tx.rma.update({ where: { id: rmaId }, data: { status: RMA_STATUS.FINALIZADO, finalizadoEm: new Date() } });
    });

    const atualizado = await carregarDetalhe(rmaId);
    return res.json({ rma: atualizado });
  } catch (error: any) {
    console.error('[ERRO POST /rma/:id/finalizar]', error);
    return res.status(400).json({ error: error?.message || 'Erro ao finalizar o RMA.' });
  }
};

export const cancelarRma = async (req: Request, res: Response) => {
  try {
    const rmaId = Number(req.params.id);
    const rma = await prisma.rma.findFirst({ where: { id: rmaId }, include: { itens: true } });
    if (!rma) return res.status(404).json({ error: 'RMA não encontrado.' });
    if (rma.status === RMA_STATUS.FINALIZADO) return res.status(400).json({ error: 'RMA já finalizado.' });

    await txLongo(async (tx) => {
      for (const item of rma.itens) {
        if (item.produtoPalletId && item.origemPalletId) {
          const destino = await tx.pallet.findFirst({ where: { id: item.origemPalletId } });
          if (destino) await tx.produtoPallet.updateMany({ where: { id: item.produtoPalletId }, data: { palletId: destino.id } });
        }
      }
      await tx.rmaItem.deleteMany({ where: { rmaId } });
      await tx.rma.update({ where: { id: rmaId }, data: { status: RMA_STATUS.CANCELADO } });
    });

    const atualizado = await carregarDetalhe(rmaId);
    return res.json({ rma: atualizado });
  } catch (error: any) {
    console.error('[ERRO POST /rma/:id/cancelar]', error);
    return res.status(400).json({ error: error?.message || 'Erro ao cancelar o RMA.' });
  }
};

export const anotar = async (req: Request, res: Response) => {
  try {
    const t = tid(req);
    const auth = getAuth(req);
    const rmaId = Number(req.params.id);
    const texto = String(req.body.texto || '').trim();
    if (!texto) return res.status(400).json({ error: 'Escreva algo.' });

    const rma = await prisma.rma.findFirst({ where: { id: rmaId } });
    if (!rma) return res.status(404).json({ error: 'RMA não encontrado.' });

    await prisma.rmaAnotacao.create({ data: { rmaId, texto, usuarioId: auth?.id ?? null, tenantId: t } });
    const atualizado = await carregarDetalhe(rmaId);
    return res.status(201).json({ rma: atualizado });
  } catch (error) {
    console.error('[ERRO POST /rma/:id/anotacoes]', error);
    return res.status(500).json({ error: 'Erro ao salvar a anotação.' });
  }
};
