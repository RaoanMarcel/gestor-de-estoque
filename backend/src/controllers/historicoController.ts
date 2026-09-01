import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const buscarHistoricoItem = async (req: Request, res: Response): Promise<Response | void> => {
  const { codigoItem } = req.params; 
  
  try {
    const codigoFormatado = String(codigoItem).trim().toUpperCase();

    const historico = await prisma.historicoMovimentacao.findMany({
      where: { codigoItem: codigoFormatado },
      orderBy: { bipadoEm: 'desc' },
      include: {
        usuario: {
          select: { username: true } 
        }
      }
    });
    
    if (!historico || historico.length === 0) {
      return res.status(200).json([]);
    }
    
    return res.status(200).json(historico);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
};