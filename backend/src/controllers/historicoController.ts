import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const buscarHistoricoItem = async (req: Request, res: Response) => {
  const { codigoItem } = req.params;

  if (!codigoItem) {
    return res.status(400).json({ error: 'Código do item não fornecido.' });
  }

  try {
    const historico = await prisma.historicoMovimentacao.findMany({
      where: {
        OR: [
          { codigoItem: String(codigoItem) },
          { codigoAnterior: String(codigoItem) } 
        ]
      },
      include: {
        usuario: {
          select: { username: true } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!historico || historico.length === 0) {
      return res.status(404).json({ error: 'Nenhum histórico encontrado para este código de rastreio.' });
    }

    return res.status(200).json(historico);
  } catch (error) {
    console.error("Erro ao buscar histórico da linha do tempo:", error);
    return res.status(500).json({ error: 'Erro interno ao buscar a linha do tempo do produto.' });
  }
};