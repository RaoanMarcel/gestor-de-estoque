import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export interface TokenPayload {
  id: number;
  username: string;
  sessaoToken: string; // 🚀 Sessão incluída na checagem
}

export interface AuthRequest extends Request {
  usuario?: TokenPayload;
}

export const autenticarToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    // 🚀 VALIDAÇÃO DE SESSÃO ÚNICA NO BANCO DE DADOS
    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { sessaoToken: true }
    });

    // Se a sessão no banco for diferente da sessão do Token, alguém logou em outra máquina
    if (!usuarioDb || usuarioDb.sessaoToken !== decoded.sessaoToken) {
      return res.status(401).json({ 
        error: 'Sessão encerrada.', 
        mensagem: 'Sua conta foi acessada em outro dispositivo. Faça login novamente.' 
      });
    }

    (req as AuthRequest).usuario = decoded;
    next();
  } catch (error: unknown) {
    return res.status(401).json({ error: 'Token de segurança inválido ou expirado.' });
  }
};