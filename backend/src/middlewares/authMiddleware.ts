import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export function autenticarToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  try {
    const verificado = jwt.verify(token, JWT_SECRET);
    (req as any).usuario = verificado;
    next(); 
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido ou expirado.' });
  }
}