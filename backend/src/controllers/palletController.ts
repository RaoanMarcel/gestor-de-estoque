import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SocketService } from '../services/SocketService.js';

const prisma = new PrismaClient();

const PREFIXO_SEQUENCIAL = 'CR-';
const DIGITOS_SEQUENCIAL = 5;
const CHAVE_CONTADOR = 'PRODUTO';

// Extrai o socketId da requisição para ignorar o autor (UX sem delay)
const getSocketId = (req: Request): string | undefined => {
  return req.headers['x-socket-id'] as string | undefined;
};

export const criarPallet = async (req: Request, res: Response) => {
  try {
    const { numero, rua, estrutura, nivel, tipo, descricao } = req.body;

    if (!numero) {
      return res.status(400).json({ error: 'O número do pallet é obrigatório!' });
    }

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

export const buscarPalletPorId = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const pallet = await prisma.pallet.findUnique({
      where: { id: Number(id) },
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
  const idNum = Number(palletId);

  try {
    const pallet = await prisma.pallet.findUnique({ where: { id: idNum } });
    if (!pallet) return res.status(404).json({ error: 'Pallet inexistente.' });

    // Controle de Concorrência Otimista
    if (versao && pallet.versao !== versao) {
      return res.status(409).json({ error: 'Conflito! Este pallet foi modificado por outro operador. A tela será atualizada.' });
    }

    if (acao === 'ENTRADA') {
      const totalAtual = await prisma.produtoPallet.count({ where: { palletId: idNum } });
      if (totalAtual >= 140) {
        return res.status(400).json({ error: 'Alerta de Lotação! Este pallet atingiu o limite de 140 volumes.' });
      }

      const item = await prisma.$transaction(async (tx) => {
        let codigoFinal = String(codigoItem);
        if (gerarSequencial) {
          codigoFinal = await gerarProximoCodigoSequencial(tx);
        }
        
        // Atualiza a versão do pallet para prevenir concorrência e cria o item
        await tx.pallet.update({ where: { id: idNum }, data: { versao: { increment: 1 } } });
        return tx.produtoPallet.create({ data: { palletId: idNum, codigoItem: codigoFinal } });
      });

      await prisma.historicoMovimentacao.create({
        data: { codigoItem: item.codigoItem, acao: 'ENTRADA', palletAlvo: pallet.numero }
      });

      SocketService.getInstance().emitToGlobal('grid:updated', { acao: 'ATUALIZADO', palletId: idNum }, getSocketId(req));
      SocketService.getInstance().emitToPallet(idNum, 'pallet:updated', { acao: 'ENTRADA', item }, getSocketId(req));

      return res.status(200).json({ mensagem: 'Item adicionado com sucesso!', item });
    } 
    
    if (acao === 'SAIDA') {
      const itemExistente = await prisma.produtoPallet.findUnique({ where: { codigoItem: String(codigoItem) } });
      if (!itemExistente || itemExistente.palletId !== idNum) {
        return res.status(400).json({ error: 'Alerta! Este produto não consta neste pallet.' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.pallet.update({ where: { id: idNum }, data: { versao: { increment: 1 } } });
        await tx.produtoPallet.delete({ where: { codigoItem: String(codigoItem) } });
      });

      await prisma.historicoMovimentacao.create({
        data: { codigoItem: String(codigoItem), acao: 'SAIDA', palletAlvo: pallet.numero }
      });

      SocketService.getInstance().emitToGlobal('grid:updated', { acao: 'ATUALIZADO', palletId: idNum }, getSocketId(req));
      SocketService.getInstance().emitToPallet(idNum, 'pallet:updated', { acao: 'SAIDA', codigoItem }, getSocketId(req));

      return res.status(200).json({ mensagem: 'Item removido do pallet com sucesso!' });
    }

    return res.status(400).json({ error: 'Ação inválida. Use ENTRADA ou SAIDA.' });

  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Alerta de Duplicidade! Este código já foi utilizado!'});
    return res.status(500).json({ error: 'Erro operacional ao processar bip.' });
  }
};

export const transferirUm = async (req: Request, res: Response) => {
  try {
    const { codigoItem, numeroPalletDestino } = req.body;
    if (!codigoItem || !numeroPalletDestino) return res.status(400).json({ error: 'Dados obrigatórios ausentes.' });

    const produtoOrigem = await prisma.produtoPallet.findUnique({ where: { codigoItem: String(codigoItem) } });
    if (!produtoOrigem) return res.status(404).json({ error: 'Produto de origem não encontrado.' });

    const palletDestino = await prisma.pallet.findUnique({ where: { numero: String(numeroPalletDestino) }, include: { produtos: true } });
    if (!palletDestino) return res.status(404).json({ error: `Pallet destino não localizado.` });
    if (palletDestino.produtos.length >= 140) return res.status(400).json({ error: `Alerta de Lotação no destino.` });

    const produtoAtualizado = await prisma.$transaction(async (tx) => {
      await tx.pallet.update({ where: { id: produtoOrigem.palletId }, data: { versao: { increment: 1 } } });
      await tx.pallet.update({ where: { id: palletDestino.id }, data: { versao: { increment: 1 } } });
      return tx.produtoPallet.update({ where: { codigoItem: String(codigoItem) }, data: { palletId: palletDestino.id } });
    });

    await prisma.historicoMovimentacao.create({ data: { codigoItem: String(codigoItem), acao: 'TRANSFERENCIA', palletAlvo: palletDestino.numero } });

    const socketId = getSocketId(req);
    // Atualiza a malha global
    SocketService.getInstance().emitToGlobal('grid:updated', { acao: 'TRANSFERENCIA', palletOrigemId: produtoOrigem.palletId, palletDestinoId: palletDestino.id }, socketId);
    
    // Atualiza as telas de quem está dentro dos pallets afetados
    SocketService.getInstance().emitToPallet(produtoOrigem.palletId, 'pallet:updated', { acao: 'SAIDA', codigoItem }, socketId);
    SocketService.getInstance().emitToPallet(palletDestino.id, 'pallet:updated', { acao: 'ENTRADA', item: produtoAtualizado }, socketId);

    return res.status(200).json({ mensagem: 'Produto transferido!', item: produtoAtualizado });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao processar a transferência.' });
  }
};

export const transferirEmLote = async (req: Request, res: Response) => {
  try {
    const { codigosItens, numeroPalletDestino } = req.body;
    if (!codigosItens || codigosItens.length === 0 || !numeroPalletDestino) return res.status(400).json({ error: 'Dados ausentes.' });

    const primeiroItem = await prisma.produtoPallet.findUnique({ where: { codigoItem: String(codigosItens[0]) } });
    if(!primeiroItem) return res.status(404).json({ error: 'Itens não encontrados' });

    const palletDestino = await prisma.pallet.findUnique({ where: { numero: String(numeroPalletDestino) }, include: { produtos: true } });
    if (!palletDestino) return res.status(404).json({ error: `Pallet destino não encontrado.` });

    if (codigosItens.length > (140 - palletDestino.produtos.length)) {
      return res.status(400).json({ error: `Espaço insuficiente no destino.` });
    }

    await prisma.$transaction(async (tx) => {
      await tx.pallet.update({ where: { id: primeiroItem.palletId }, data: { versao: { increment: 1 } } });
      await tx.pallet.update({ where: { id: palletDestino.id }, data: { versao: { increment: 1 } } });
      await tx.produtoPallet.updateMany({ where: { codigoItem: { in: codigosItens } }, data: { palletId: palletDestino.id } });
    });

    const logsData = codigosItens.map((codigo: string) => ({ codigoItem: String(codigo), acao: 'TRANSFERENCIA_LOTE', palletAlvo: palletDestino.numero }));
    await prisma.historicoMovimentacao.createMany({ data: logsData });

    const socketId = getSocketId(req);
    SocketService.getInstance().emitToGlobal('grid:updated', { acao: 'TRANSFERENCIA_LOTE' }, socketId);
    SocketService.getInstance().emitToPallet(primeiroItem.palletId, 'pallet:updated', { acao: 'SAIDA_LOTE', codigosItens }, socketId);
    SocketService.getInstance().emitToPallet(palletDestino.id, 'pallet:refresh', {}, socketId); // Lotes complexos forçam o front a fazer fetch limpo

    return res.status(200).json({ mensagem: 'Lote transferido com sucesso!' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao transferir em lote.' });
  }
};

export const enviarParaRMA = async (req: Request, res: Response) => {
  try {
    const { codigosItens, numeroPalletOrigem } = req.body;
    if (!codigosItens || codigosItens.length === 0) return res.status(400).json({ error: 'Nenhum item selecionado.' });

    const primeiroItem = await prisma.produtoPallet.findUnique({ where: { codigoItem: String(codigosItens[0]) } });
    if (!primeiroItem) return res.status(400).json({ error: 'Erro ao localizar itens.' });

    await prisma.$transaction(async (tx) => {
      await tx.pallet.update({ where: { id: primeiroItem.palletId }, data: { versao: { increment: 1 } } });
      await tx.produtoPallet.deleteMany({ where: { codigoItem: { in: codigosItens } } });
    });

    const logsRMA = codigosItens.map((codigo: string) => ({ codigoItem: String(codigo), acao: 'ENVIADO_RMA', palletAlvo: String(numeroPalletOrigem) }));
    await prisma.historicoMovimentacao.createMany({ data: logsRMA });

    const socketId = getSocketId(req);
    SocketService.getInstance().emitToGlobal('grid:updated', { acao: 'ATUALIZADO', palletId: primeiroItem.palletId }, socketId);
    SocketService.getInstance().emitToPallet(primeiroItem.palletId, 'pallet:updated', { acao: 'SAIDA_LOTE', codigosItens }, socketId);

    return res.status(200).json({ mensagem: `Enviado para RMA com sucesso.` });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao processar envio para o RMA.' });
  }
};

export const excluirPallet = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idNum = Number(id);

    const palletAlvo = await prisma.pallet.findUnique({ where: { id: idNum }, include: { produtos: true } });
    if (!palletAlvo) return res.status(404).json({ error: 'Pallet não localizado.' });
    if (palletAlvo.produtos.length > 0) return res.status(400).json({ error: `Esvazie o pallet antes de excluir.` });

    await prisma.pallet.delete({ where: { id: idNum } });

    await prisma.historicoMovimentacao.create({ data: { codigoItem: 'SISTEMA', acao: 'EXCLUSAO_PALLET', palletAlvo: String(palletAlvo.numero) } });

    const socketId = getSocketId(req);
    SocketService.getInstance().emitToGlobal('grid:updated', { acao: 'EXCLUIDO', palletId: idNum }, socketId);
    SocketService.getInstance().emitToPallet(idNum, 'pallet:deleted', { palletId: idNum }); // Expulsa todos da tela

    return res.status(200).json({ mensagem: `Pallet removido com sucesso.` });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao tentar excluir a posição.' });
  }
};

export const biparItemEmLote = async (req: Request, res: Response) => {
  const { palletId, codigosItens, acao, versao } = req.body;
  const idNum = Number(palletId);

  if (!codigosItens || codigosItens.length === 0) return res.status(400).json({ error: 'Nenhum item enviado.' });

  try {
    const pallet = await prisma.pallet.findUnique({ where: { id: idNum } });
    if (!pallet) return res.status(404).json({ error: 'Pallet inexistente.' });

    if (versao && pallet.versao !== versao) {
      return res.status(409).json({ error: 'Conflito de versão! Tela sendo atualizada.' });
    }

    if (acao === 'SAIDA') {
      await prisma.$transaction(async (tx) => {
        await tx.pallet.update({ where: { id: idNum }, data: { versao: { increment: 1 } } });
        await tx.produtoPallet.deleteMany({ where: { palletId: idNum, codigoItem: { in: codigosItens.map(String) } } });
      });

      const logsData = codigosItens.map((codigo: string) => ({ codigoItem: String(codigo), acao: 'SAIDA', palletAlvo: pallet.numero }));
      await prisma.historicoMovimentacao.createMany({ data: logsData });

      const socketId = getSocketId(req);
      SocketService.getInstance().emitToGlobal('grid:updated', { acao: 'ATUALIZADO', palletId: idNum }, socketId);
      SocketService.getInstance().emitToPallet(idNum, 'pallet:updated', { acao: 'SAIDA_LOTE', codigosItens }, socketId);

      return res.status(200).json({ mensagem: `${codigosItens.length} itens removidos com sucesso!` });
    }
    return res.status(400).json({ error: 'Ação inválida.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao processar lote.' });
  }
};