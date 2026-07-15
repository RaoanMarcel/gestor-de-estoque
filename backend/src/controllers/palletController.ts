// backend\src\controllers\palletController.ts
import { Request, Response } from 'express';

const { PrismaClient } = require('@prisma/client');

const prisma: any = new PrismaClient();

const PREFIXO_SEQUENCIAL = 'CR-';
const DIGITOS_SEQUENCIAL = 5;
const CHAVE_CONTADOR = 'PRODUTO';

// Helper reutilizável para emitir eventos WebSocket sem duplicar código
const notificarMudanca = (req: Request, palletId?: number | string) => {
  const io = req.app.get('io');
  if (!io) return;

  // Atualiza a tela de listagem geral (Dashboard / Visão Geral)
  io.emit('global_map_refresh');

  // Se houver um pallet específico modificado, avisa a sala dele
  if (palletId) {
    io.to(`pallet_${palletId}`).emit('pallet_updated', { palletId: Number(palletId) });
  }
};

// 1. Criar Novo Pallet
export const criarPallet = async (req: Request, res: Response) => {
  try {
    const { numero, rua, estrutura, nivel, tipo, descricao } = req.body;

    if (!numero) {
      return res.status(400).json({ error: 'O número do pallet é obrigatório!' });
    }

    const novoPallet = await (prisma as any).pallet.create({
      data: {
        numero,
        rua,
        estrutura,
        nivel,
        descricao,
        tipo: tipo || "PADRAO" 
      }
    });

    // Notifica o mapa que um novo espaço surgiu
    notificarMudanca(req);

    return res.status(201).json(novoPallet);
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao criar pallet.' });
  }
};

// 2. Listar Todos os Pallets
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

// 3. Buscar um Pallet Específico
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

// 4. Bipar Item (Entrada / Saída Individual)
export const biparItem = async (req: Request, res: Response) => {
  const { palletId, codigoItem, acao, gerarSequencial } = req.body;

  try {
    const pallet = await prisma.pallet.findUnique({ where: { id: Number(palletId) } });
    if (!pallet) return res.status(404).json({ error: 'Pallet inexistente.' });

    if (acao === 'ENTRADA') {
      const totalAtual = await prisma.produtoPallet.count({
        where: { palletId: Number(palletId) }
      });

      if (totalAtual >= 140) {
        return res.status(400).json({ 
          error: 'Alerta de Lotação! Este pallet atingiu o limite máximo de 140 volumes.' 
        });
      }

      let item;

      if (gerarSequencial) {
        item = await prisma.$transaction(async (tx: any) => {
          const codigoGerado = await gerarProximoCodigoSequencial(tx);
          return tx.produtoPallet.create({
            data: {
              palletId: Number(palletId),
              codigoItem: codigoGerado
            }
          });
        });
      } else {
        item = await prisma.produtoPallet.create({
          data: { 
            palletId: Number(palletId), 
            codigoItem: String(codigoItem) 
          }
        });
      }

      await prisma.historicoMovimentacao.create({
        data: {
          codigoItem: item.codigoItem,
          acao: 'ENTRADA',
          palletAlvo: pallet.numero || `Pallet #${pallet.id}`
        }
      });

      // Dispara tempo real para as telas conectadas
      notificarMudanca(req, palletId);

      return res.status(200).json({ mensagem: 'Item adicionado com sucesso!', item });
    } 
    
    if (acao === 'SAIDA') {
      const itemExistente = await prisma.produtoPallet.findUnique({
        where: { codigoItem: String(codigoItem) }
      });

      if (!itemExistente || itemExistente.palletId !== Number(palletId)) {
        return res.status(400).json({ error: 'Alerta! Este produto não consta neste pallet.' });
      }

      await prisma.produtoPallet.delete({
        where: { codigoItem: String(codigoItem) }
      });

      await prisma.historicoMovimentacao.create({
        data: {
          codigoItem: String(codigoItem),
          acao: 'SAIDA',
          palletAlvo: pallet.numero || `Pallet #${pallet.id}`
        }
      });

      // Dispara tempo real para as telas conectadas
      notificarMudanca(req, palletId);

      return res.status(200).json({ mensagem: 'Item removido do pallet com sucesso!' });
    }

    return res.status(400).json({ error: 'Ação inválida. Use ENTRADA ou SAIDA.' });

  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'Alerta de Duplicidade! Esta triagem já foi utilizado!'});
    }
    console.error("Erro no servidor:", error);
    return res.status(500).json({ error: 'Erro operacional ao processar bip.' });
  }
};

// 5. Transferência Individual
export const transferirUm = async (req: Request, res: Response) => {
  try {
    const { codigoItem, numeroPalletDestino } = req.body;

    if (!codigoItem || !numeroPalletDestino) {
      return res.status(400).json({ error: 'Código do item e pallet de destino são obrigatórios.' });
    }

    const produtoOrigem = await (prisma as any).produtoPallet.findUnique({
      where: { codigoItem: String(codigoItem) }
    });

    if (!produtoOrigem) {
      return res.status(404).json({ error: 'Produto de origem não encontrado.' });
    }

    const palletDestino = await (prisma as any).pallet.findUnique({
      where: { numero: String(numeroPalletDestino) },
      include: { produtos: true }
    });

    if (!palletDestino) {
      return res.status(404).json({ error: `Pallet de destino "${numeroPalletDestino}" não foi localizado.` });
    }

    if (palletDestino.produtos.length >= 140) {
      return res.status(400).json({ 
        error: `Alerta de Lotação! O pallet destino "${numeroPalletDestino}" já atingiu o limite de 140 volumes.` 
      });
    }

    const produtoAtualizado = await (prisma as any).produtoPallet.update({
      where: { codigoItem: String(codigoItem) },
      data: { palletId: palletDestino.id }
    });

    await (prisma as any).historicoMovimentacao.create({
      data: {
        codigoItem: String(codigoItem),
        acao: 'TRANSFERENCIA',
        palletAlvo: String(numeroPalletDestino)
      }
    });

    // Atualiza tanto o pallet de onde saiu (origem) quanto o que recebeu (destino)
    notificarMudanca(req, produtoOrigem.palletId);
    notificarMudanca(req, palletDestino.id);

    return res.status(200).json({ 
      mensagem: 'Produto transferido com sucesso!', 
      item: produtoAtualizado 
    });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao processar a transferência individual.' });
  }
};

// 6. Transferência em Lote
export const transferirEmLote = async (req: Request, res: Response) => {
  try {
    const { codigosItens, numeroPalletDestino } = req.body;

    if (!codigosItens || !Array.isArray(codigosItens) || codigosItens.length === 0) {
      return res.status(400).json({ error: 'Nenhum item selecionado para transferência.' });
    }

    if (!numeroPalletDestino) {
      return res.status(400).json({ error: 'Pallet de destino não informado.' });
    }

    // Pega o id do pallet de origem usando o primeiro item como referência antes de atualizar
    const primeiroItem = await (prisma as any).produtoPallet.findUnique({
      where: { codigoItem: String(codigosItens[0]) }
    });

    const palletDestino = await (prisma as any).pallet.findUnique({
      where: { numero: String(numeroPalletDestino) },
      include: { produtos: true }
    });

    if (!palletDestino) {
      return res.status(404).json({ error: `Pallet de destino "${numeroPalletDestino}" não encontrado.` });
    }

    const espacoDisponivel = 140 - palletDestino.produtos.length;
    if (codigosItens.length > espacoDisponivel) {
      return res.status(400).json({ 
        error: `Espaço insuficiente no pallet "${numeroPalletDestino}". Vagas restantes: ${espacoDisponivel}. Você tentou transferir: ${codigosItens.length} itens.` 
      });
    }

    await (prisma as any).produtoPallet.updateMany({
      where: { codigoItem: { in: codigosItens } },
      data: { palletId: palletDestino.id }
    });

    const logsData = codigosItens.map((codigo: string) => ({
      codigoItem: String(codigo),
      acao: 'TRANSFERENCIA_LOTE',
      palletAlvo: String(numeroPalletDestino)
    }));

    await (prisma as any).historicoMovimentacao.createMany({ data: logsData });

    // Força atualização em massa dos envolvidos
    if (primeiroItem) notificarMudanca(req, primeiroItem.palletId);
    notificarMudanca(req, palletDestino.id);

    return res.status(200).json({ 
      mensagem: `${codigosItens.length} produtos transferidos para o pallet "${numeroPalletDestino}" com sucesso!` 
    });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao processar a transferência em lote.' });
  }
};

// 7. Lançar ao RMA (Exclusivo Pallets Defeito)
export const enviarParaRMA = async (req: Request, res: Response) => {
  try {
    const { codigosItens, numeroPalletOrigem } = req.body;

    if (!codigosItens || !Array.isArray(codigosItens) || codigosItens.length === 0) {
      return res.status(400).json({ error: 'Nenhum item selecionado para o RMA.' });
    }

    const primeiroItem = await (prisma as any).produtoPallet.findUnique({
      where: { codigoItem: String(codigosItens[0]) }
    });

    await (prisma as any).produtoPallet.deleteMany({
      where: { codigoItem: { in: codigosItens } }
    });

    const logsRMA = codigosItens.map((codigo: string) => ({
      codigoItem: String(codigo),
      acao: 'ENVIADO_RMA',
      palletAlvo: String(numeroPalletOrigem)
    }));

    await (prisma as any).historicoMovimentacao.createMany({ data: logsRMA });

    // Notifica a saída do pallet de origem
    if (primeiroItem) notificarMudanca(req, primeiroItem.palletId);

    return res.status(200).json({
      mensagem: `Sucesso! ${codigosItens.length} volumes foram despachados para o sistema de RMA e removidos do pallet físico.`
    });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao processar envio para o RMA.' });
  }
};

// 8. Excluir Pallet da Malha
export const excluirPallet = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const palletAlvo = await (prisma as any).pallet.findUnique({
      where: { id: Number(id) },
      include: { produtos: true }
    });

    if (!palletAlvo) {
      return res.status(404).json({ error: 'Pallet não localizado no sistema.' });
    }

    if (palletAlvo.produtos && palletAlvo.produtos.length > 0) {
      return res.status(400).json({ 
        error: `Bloqueio de Segurança! O pallet "${palletAlvo.numero}" possui ${palletAlvo.produtos.length} produtos armazenados. Esvazie-o antes de excluir.` 
      });
    }

    await (prisma as any).pallet.delete({
      where: { id: Number(id) }
    });

    await (prisma as any).historicoMovimentacao.create({
      data: {
        codigoItem: 'SISTEMA',
        acao: 'EXCLUSAO_PALLET',
        palletAlvo: String(palletAlvo.numero)
      }
    });

    // Avisa a malha inteira que uma vaga sumiu do painel principal
    notificarMudanca(req, palletAlvo.id);
    return res.status(200).json({ mensagem: `O pallet "${palletAlvo.numero}" foi removido da malha com sucesso.` });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao tentar excluir a posição do mapa.' });
  }
};

// 9. Bipar Item em Lote (Cache do Front-end)
export const biparItemEmLote = async (req: Request, res: Response) => {
  const { palletId, codigosItens, acao } = req.body;

  if (!codigosItens || !Array.isArray(codigosItens) || codigosItens.length === 0) {
    return res.status(400).json({ error: 'Nenhum item enviado para exclusão em lote.' });
  }

  try {
    const pallet = await prisma.pallet.findUnique({ where: { id: Number(palletId) } });
    if (!pallet) return res.status(404).json({ error: 'Pallet inexistente.' });

    if (acao === 'SAIDA') {
      await prisma.produtoPallet.deleteMany({
        where: {
          palletId: Number(palletId),
          codigoItem: { in: codigosItens.map(String) }
        }
      });

      const logsData = codigosItens.map((codigo: string) => ({
        codigoItem: String(codigo),
        acao: 'SAIDA',
        palletAlvo: pallet.numero || `Pallet #${pallet.id}`
      }));

      await prisma.historicoMovimentacao.createMany({ data: logsData });

      // Atualiza o tempo real para todos na sala correspondente
      notificarMudanca(req, palletId);

      return res.status(200).json({ mensagem: `${codigosItens.length} itens removidos com sucesso!` });
    }

    return res.status(400).json({ error: 'Ação inválida para lote temporário.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro operacional ao processar lote de exclusão.' });
  }
};