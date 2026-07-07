import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. Criar Novo Pallet
export const criarPallet = async (req: Request, res: Response) => {
  const { numero, rua, estrutura, nivel } = req.body;
  try {
    const novoPallet = await prisma.pallet.create({
      data: { numero, rua, estrutura, nivel }
    });
    return res.status(201).json(novoPallet);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Já existe um pallet com este número registrado!' });
    }
    return res.status(500).json({ error: 'Erro ao criar pallet.' });
  }
};

// 2. Listar Todos os Pallets (Para a tela de visão geral)
export const listarPallets = async (_req: Request, res: Response) => {
  try {
    const pallets = await prisma.pallet.findMany({
      include: { _count: { select: { produtos: true } } } // Mostra quantos tipos de produtos tem dentro
    });
    return res.status(200).json(pallets);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar pallets.' });
  }
};

// 3. Buscar um Pallet Específico com a sua listagem lateral atualizada
export const buscarPalletPorId = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const pallet = await prisma.pallet.findUnique({
      where: { id: Number(id) },
      include: { produtos: { orderBy: { bipadoEm: 'desc' } } } // Traz os itens mais recentes no topo
    });
    
    if (!pallet) return res.status(404).json({ error: 'Pallet não encontrado.' });
    return res.status(200).json(pallet);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar pallet.' });
  }
};

// 4. O Fluxo do BIP (Entrada / Saída)
export const biparItem = async (req: Request, res: Response) => {
  const { palletId, codigoItem, acao } = req.body; // acao: 'ENTRADA' ou 'SAIDA'

  try {
    const pallet = await prisma.pallet.findUnique({ where: { id: Number(palletId) } });
    if (!pallet) return res.status(404).json({ error: 'Pallet inexistente.' });

    if (acao === 'ENTRADA') {
      const item = await prisma.produtoPallet.upsert({
        where: { palletId_codigoItem: { palletId: Number(palletId), codigoItem } },
        update: { quantidade: { increment: 1 } },
        create: { palletId: Number(palletId), codigoItem, quantidade: 1 }
      });
      return res.status(200).json({ mensagem: 'Item adicionado!', item });
    } 
    
    if (acao === 'SAIDA') {
      const itemExistente = await prisma.produtoPallet.findUnique({
        where: { palletId_codigoItem: { palletId: Number(palletId), codigoItem } }
      });

      // Erro de segurança de estoque do "Mundo Real"
      if (!itemExistente || itemExistente.quantidade <= 0) {
        return res.status(400).json({ error: 'Alerta! Este produto não consta neste pallet.' });
      }

      if (itemExistente.quantidade === 1) {
        await prisma.produtoPallet.delete({
          where: { palletId_codigoItem: { palletId: Number(palletId), codigoItem } }
        });
        return res.status(200).json({ mensagem: 'Item zerado e removido do pallet.' });
      } else {
        const itemAtualizado = await prisma.produtoPallet.update({
          where: { palletId_codigoItem: { palletId: Number(palletId), codigoItem } },
          data: { quantidade: { decrement: 1 } }
        });
        return res.status(200).json({ mensagem: 'Uma unidade subtraída.', item: itemAtualizado });
      }
    }

    return res.status(400).json({ error: 'Ação inválida. Use ENTRADA ou SAIDA.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro operacional ao processar bip.' });
  }
};