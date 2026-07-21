import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SocketService } from '../services/SocketService.js';

const prisma = new PrismaClient();

const PREFIXO_SEQUENCIAL = 'CR-';
const DIGITOS_SEQUENCIAL = 5;
const CHAVE_CONTADOR = 'PRODUTO';

const getSocketId = (req: Request): string | undefined => {
  return req.headers['x-socket-id'] as string | undefined;
};

export const criarPallet = async (req: Request, res: Response) => {
  try {
    const { numero, rua, estrutura, nivel, tipo, descricao } = req.body;

    if (!numero) return res.status(400).json({ error: 'O número do pallet é obrigatório!' });

    const novoPallet = await prisma.pallet.create({
      data: { numero, rua, estrutura, nivel, descricao, tipo: tipo || "PADRAO" }
    });

    SocketService.getInstance().emitToGlobal('grid:updated', { acao: 'CRIADO', pallet: novoPallet }, getSocketId(req));
    return res.status(201).json(novoPallet);
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao criar pallet.' });
  }
};

export const listarPallets = async (_req: Request, res: Response) => {
  try {
    const pallets = await prisma.pallet.findMany({
      include: { 
        _count: { select: { produtos: true } },
        produtos: { select: { codigoItem: true } }
      }
    });
    return res.status(200).json(pallets);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar pallets.' });
  }
};

export const buscarPalletPorIdentificador = async (req: Request, res: Response) => {
  const { identificador } = req.params;
  try {
    const pallet = await prisma.pallet.findUnique({
      where: { numero: String(identificador) },
      include: { produtos: { orderBy: { bipadoEm: 'desc' } } }
    });
    
    if (!pallet) return res.status(404).json({ error: 'Pallet não encontrado.' });
    return res.status(200).json(pallet);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar pallet.' });
  }
};

const gerarProximoCodigoSequencial = async (tx: any): Promise<string> => {
  const contador = await tx.contador.upsert({
    where: { chave: CHAVE_CONTADOR },
    update: { valor: { increment: 1 } },
    create: { chave: CHAVE_CONTADOR, valor: 1 }
  });
  return `${PREFIXO_SEQUENCIAL}${String(contador.valor).padStart(DIGITOS_SEQUENCIAL, '0')}`;
};

export const biparItem = async (req: Request, res: Response) => {
  const { palletId, codigoItem, acao, gerarSequencial, versao } = req.body;
  const numeroPallet = String(palletId); 
  const usuarioId = (req as any).usuario?.id; 

  try {
    const pallet = await prisma.pallet.findUnique({ where: { numero: numeroPallet } });
    if (!pallet) return res.status(404).json({ error: 'Pallet inexistente.' });

    const idInterno = pallet.id;

    if (versao && (pallet as any).versao !== versao) {
      return res.status(409).json({ error: 'Conflito! Este pallet foi modificado por outro operador. A tela será atualizada.' });
    }

    if (acao === 'ENTRADA') {
      const totalAtual = await prisma.produtoPallet.count({ where: { palletId: idInterno } });
      if (totalAtual >= 140) return res.status(400).json({ error: 'Alerta de Lotação!' });

      const item = await prisma.$transaction(async (tx) => {
        let codigoFinal = String(codigoItem);
        if (gerarSequencial) codigoFinal = await gerarProximoCodigoSequencial(tx);
        
        await tx.pallet.update({ where: { id: idInterno }, data: { versao: { increment: 1 } } });
        return tx.produtoPallet.create({ data: { palletId: idInterno, codigoItem: codigoFinal } });
      });

      await prisma.historicoMovimentacao.create({
        data: { codigoItem: item.codigoItem, acao: 'ENTRADA', palletDestino: pallet.numero, usuarioId }
      });

      SocketService.getInstance().emitToGlobal('grid:updated', { acao: 'ATUALIZADO', palletId: idInterno }, getSocketId(req));
      SocketService.getInstance().emitToPallet(numeroPallet, 'pallet:updated', { acao: 'ENTRADA', item }, getSocketId(req));

      return res.status(200).json({ mensagem: 'Item adicionado com sucesso!', item });
    } 
    
    if (acao === 'SAIDA') {
      const itemExistente = await prisma.produtoPallet.findUnique({ where: { codigoItem: String(codigoItem) } });
      if (!itemExistente || itemExistente.palletId !== idInterno) return res.status(400).json({ error: 'Alerta! Este produto não consta neste pallet.' });

      await prisma.$transaction(async (tx) => {
        await tx.pallet.update({ where: { id: idInterno }, data: { versao: { increment: 1 } } });
        await tx.produtoPallet.delete({ where: { codigoItem: String(codigoItem) } });
      });

      await prisma.historicoMovimentacao.create({
        data: { codigoItem: String(codigoItem), acao: 'SAIDA', palletOrigem: pallet.numero, usuarioId }
      });

      SocketService.getInstance().emitToGlobal('grid:updated', { acao: 'ATUALIZADO', palletId: idInterno }, getSocketId(req));
      SocketService.getInstance().emitToPallet(numeroPallet, 'pallet:updated', { acao: 'SAIDA', codigoItem }, getSocketId(req));

      return res.status(200).json({ mensagem: 'Item removido do pallet com sucesso!' });
    }

    return res.status(400).json({ error: 'Ação inválida.' });

  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Alerta de Duplicidade! Este código já foi utilizado!'});
    return res.status(500).json({ error: 'Erro operacional ao processar bip.' });
  }
};

export const transferirUm = async (req: Request, res: Response) => {
  try {
    const { codigoItem, numeroPalletDestino } = req.body;
    const usuarioId = (req as any).usuario?.id;

    if (!codigoItem || !numeroPalletDestino) return res.status(400).json({ error: 'Dados obrigatórios ausentes.' });

    const produtoOrigem = await prisma.produtoPallet.findUnique({ where: { codigoItem: String(codigoItem) }, include: { pallet: true } });
    if (!produtoOrigem) return res.status(404).json({ error: 'Produto de origem não encontrado.' });

    const palletDestino = await prisma.pallet.findUnique({ where: { numero: String(numeroPalletDestino) }, include: { produtos: true } });
    if (!palletDestino) return res.status(404).json({ error: `Pallet destino não localizado.` });
    if (palletDestino.produtos.length >= 140) return res.status(400).json({ error: `Alerta de Lotação no destino.` });

    const produtoAtualizado = await prisma.$transaction(async (tx) => {
      await tx.pallet.update({ where: { id: produtoOrigem.palletId }, data: { versao: { increment: 1 } } });
      await tx.pallet.update({ where: { id: palletDestino.id }, data: { versao: { increment: 1 } } });
      return tx.produtoPallet.update({ where: { codigoItem: String(codigoItem) }, data: { palletId: palletDestino.id } });
    });

    await prisma.historicoMovimentacao.create({ 
      data: { codigoItem: String(codigoItem), acao: 'TRANSFERENCIA', palletOrigem: produtoOrigem.pallet.numero, palletDestino: palletDestino.numero, usuarioId } 
    });

    const socketId = getSocketId(req);
    SocketService.getInstance().emitToGlobal('grid:updated', { acao: 'TRANSFERENCIA', palletOrigemId: produtoOrigem.palletId, palletDestinoId: palletDestino.id }, socketId);
    SocketService.getInstance().emitToPallet(produtoOrigem.pallet.numero, 'pallet:updated', { acao: 'SAIDA', codigoItem }, socketId);
    SocketService.getInstance().emitToPallet(palletDestino.numero, 'pallet:updated', { acao: 'ENTRADA', item: produtoAtualizado }, socketId);

    return res.status(200).json({ mensagem: 'Produto transferido!', item: produtoAtualizado });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao processar a transferência.' });
  }
};

export const transferirEmLote = async (req: Request, res: Response) => {
  try {
    const { codigosItens, numeroPalletDestino } = req.body;
    const usuarioId = (req as any).usuario?.id;

    if (!codigosItens || codigosItens.length === 0 || !numeroPalletDestino) return res.status(400).json({ error: 'Dados ausentes.' });

    const primeiroItem = await prisma.produtoPallet.findUnique({ where: { codigoItem: String(codigosItens[0]) }, include: { pallet: true } });
    if(!primeiroItem) return res.status(404).json({ error: 'Itens não encontrados' });

    const palletDestino = await prisma.pallet.findUnique({ where: { numero: String(numeroPalletDestino) }, include: { produtos: true } });
    if (!palletDestino) return res.status(404).json({ error: `Pallet destino não encontrado.` });
    if (codigosItens.length > (140 - palletDestino.produtos.length)) return res.status(400).json({ error: `Espaço insuficiente no destino.` });

    await prisma.$transaction(async (tx) => {
      await tx.pallet.update({ where: { id: primeiroItem.palletId }, data: { versao: { increment: 1 } } });
      await tx.pallet.update({ where: { id: palletDestino.id }, data: { versao: { increment: 1 } } });
      await tx.produtoPallet.updateMany({ where: { codigoItem: { in: codigosItens } }, data: { palletId: palletDestino.id } });
    });

    const logsData = codigosItens.map((codigo: string) => ({ 
      codigoItem: String(codigo), acao: 'TRANSFERENCIA_LOTE', palletOrigem: primeiroItem.pallet.numero, palletDestino: palletDestino.numero, usuarioId 
    }));
    await prisma.historicoMovimentacao.createMany({ data: logsData });

    const socketId = getSocketId(req);
    SocketService.getInstance().emitToGlobal('grid:updated', { acao: 'TRANSFERENCIA_LOTE' }, socketId);
    SocketService.getInstance().emitToPallet(primeiroItem.pallet.numero, 'pallet:updated', { acao: 'SAIDA_LOTE', codigosItens }, socketId);
    SocketService.getInstance().emitToPallet(palletDestino.numero, 'pallet:refresh', {}, socketId); 

    return res.status(200).json({ mensagem: 'Lote transferido com sucesso!' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao transferir em lote.' });
  }
};

export const enviarParaRMA = async (req: Request, res: Response) => {
  try {
    const { codigosItens, numeroPalletOrigem } = req.body;
    const usuarioId = (req as any).usuario?.id;

    if (!codigosItens || codigosItens.length === 0) return res.status(400).json({ error: 'Nenhum item selecionado.' });

    const primeiroItem = await prisma.produtoPallet.findUnique({ where: { codigoItem: String(codigosItens[0]) }, include: { pallet: true } });
    if (!primeiroItem) return res.status(400).json({ error: 'Erro ao localizar itens.' });

    await prisma.$transaction(async (tx) => {
      await tx.pallet.update({ where: { id: primeiroItem.palletId }, data: { versao: { increment: 1 } } });
      await tx.produtoPallet.deleteMany({ where: { codigoItem: { in: codigosItens } } });
    });

    const logsRMA = codigosItens.map((codigo: string) => ({ 
      codigoItem: String(codigo), acao: 'ENVIADO_RMA', palletOrigem: String(numeroPalletOrigem), usuarioId 
    }));
    await prisma.historicoMovimentacao.createMany({ data: logsRMA });

    const socketId = getSocketId(req);
    SocketService.getInstance().emitToGlobal('grid:updated', { acao: 'ATUALIZADO', palletId: primeiroItem.palletId }, socketId);
    SocketService.getInstance().emitToPallet(primeiroItem.pallet.numero, 'pallet:updated', { acao: 'SAIDA_LOTE', codigosItens }, socketId);

    return res.status(200).json({ mensagem: `Enviado para RMA com sucesso.` });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao processar envio para o RMA.' });
  }
};

export const excluirPallet = async (req: Request, res: Response) => {
  try {
    const { identificador } = req.params;
    const usuarioId = (req as any).usuario?.id;

    const palletAlvo = await prisma.pallet.findUnique({ where: { numero: String(identificador) }, include: { produtos: true } });
    if (!palletAlvo) return res.status(404).json({ error: 'Pallet não localizado.' });
    if (palletAlvo.produtos.length > 0) return res.status(400).json({ error: `Esvazie o pallet antes de excluir.` });

    await prisma.pallet.delete({ where: { id: palletAlvo.id } });

    await prisma.historicoMovimentacao.create({ 
      data: { codigoItem: 'SISTEMA', acao: 'EXCLUSAO_PALLET', palletOrigem: String(palletAlvo.numero), usuarioId } 
    });

    const socketId = getSocketId(req);
    SocketService.getInstance().emitToGlobal('grid:updated', { acao: 'EXCLUIDO', palletId: palletAlvo.id }, socketId);
    SocketService.getInstance().emitToPallet(palletAlvo.numero, 'pallet:deleted', { palletId: palletAlvo.id });

    return res.status(200).json({ mensagem: `Pallet removido com sucesso.` });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao tentar excluir a posição.' });
  }
};

export const biparItemEmLote = async (req: Request, res: Response) => {
  const { palletId, codigosItens, acao, versao } = req.body;
  const numeroPallet = String(palletId);
  const usuarioId = (req as any).usuario?.id;

  if (!codigosItens || codigosItens.length === 0) return res.status(400).json({ error: 'Nenhum item enviado.' });

  try {
    const pallet = await prisma.pallet.findUnique({ where: { numero: numeroPallet } });
    if (!pallet) return res.status(404).json({ error: 'Pallet inexistente.' });

    const idInterno = pallet.id;

    if (versao && (pallet as any).versao !== versao) {
      return res.status(409).json({ error: 'Conflito de versão! Tela sendo atualizada.' });
    }

    if (acao === 'SAIDA') {
      await prisma.$transaction(async (tx) => {
        await tx.pallet.update({ where: { id: idInterno }, data: { versao: { increment: 1 } } });
        await tx.produtoPallet.deleteMany({ where: { palletId: idInterno, codigoItem: { in: codigosItens.map(String) } } });
      });

      const logsData = codigosItens.map((codigo: string) => ({ 
        codigoItem: String(codigo), acao: 'SAIDA', palletOrigem: pallet.numero, usuarioId 
      }));
      await prisma.historicoMovimentacao.createMany({ data: logsData });

      const socketId = getSocketId(req);
      SocketService.getInstance().emitToGlobal('grid:updated', { acao: 'ATUALIZADO', palletId: idInterno }, socketId);
      SocketService.getInstance().emitToPallet(numeroPallet, 'pallet:updated', { acao: 'SAIDA_LOTE', codigosItens }, socketId);

      return res.status(200).json({ mensagem: `${codigosItens.length} itens removidos com sucesso!` });
    }
    return res.status(400).json({ error: 'Ação inválida.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao processar lote.' });
  }
};