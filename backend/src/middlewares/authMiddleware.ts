import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export interface TokenPayload {
  id: number;
  username: string;
}

// Estendendo a interface Request do Express de forma segura e sem usar 'any'
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
    // Injeta os dados do usuário autenticado no request
    (req as AuthRequest).usuario = decoded;
    next();
  } catch (error: unknown) {
    return res.status(401).json({ error: 'Token de segurança inválido ou expirado.' });
  }
};
