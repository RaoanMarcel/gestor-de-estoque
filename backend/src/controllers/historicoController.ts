import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const buscarHistoricoItem = async (req: Request, res: Response) => {
  const { codigoItem } = req.params;
  try {
    const historico = await prisma.historicoMovimentacao.findMany({
      where: { codigoItem: String(codigoItem) },
      orderBy: { bipadoEm: 'desc' },
      include: {
        usuario: {
          select: { username: true }
        }
      }
    });
    
    return res.status(200).json(historico);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
};