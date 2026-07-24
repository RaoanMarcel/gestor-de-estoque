import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export interface TokenPayload {
  id: number;
  username: string;
}

export interface AuthRequest extends Request {
  usuario?: TokenPayload;
}

export const autenticarToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    (req as AuthRequest).usuario = decoded;
    next();
  } catch (error: unknown) {
    return res.status(401).json({ error: 'Token de segurança inválido ou expirado.' });
  }
};
