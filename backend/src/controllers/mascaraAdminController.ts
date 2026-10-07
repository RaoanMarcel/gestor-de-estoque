// backend/src/controllers/mascaraAdminController.ts
//
// CRUD das máscaras de bipagem por SKU + a senha extra (separada do login) que
// trava essa tela. Pensado para o time do Full conseguir cadastrar uma máscara
// nova sem depender de um deploy do backend.
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma, prismaUnscoped } from '../lib/prisma.js';
import { getAuth, requireTenantId } from '../lib/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const TIPO_TOKEN_MASCARA = 'mascara_unlock';

/**
 * Middleware de rota: exige o token de curta duração emitido por `verificarSenha`,
 * além do login normal (`autenticarToken`, aplicado antes na mesma rota). É a
 * trava extra: mesmo um usuário logado não mexe nas máscaras sem a senha.
 */
// IMPORTANTE: nunca usar 401 aqui. O frontend tem um interceptador global
// (App.tsx) que desloga o usuário da PLATAFORMA INTEIRA em qualquer 401 — é a
// convenção de "sessão/token expirou". Como a senha de máscaras é uma trava à
// parte do login, os erros dela usam 403 (que o interceptador ignora, a menos
// que venha com code "TENANT_SUSPENSO").
export const exigirSenhaMascara = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['x-mascara-token'] as string | undefined;
  if (!token) {
    return res.status(403).json({ error: 'Informe a senha de máscaras para continuar.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { tipo?: string; tenantId?: number };
    const auth = getAuth(req);
    if (decoded.tipo !== TIPO_TOKEN_MASCARA || decoded.tenantId !== auth?.tenantId) {
      return res.status(403).json({ error: 'Sessão de máscaras inválida.' });
    }
    next();
  } catch {
    return res.status(403).json({ error: 'Sessão de máscaras expirada. Informe a senha novamente.' });
  }
};

export const verificarSenha = async (req: Request, res: Response) => {
  try {
    const { senha } = req.body;
    const tid = requireTenantId(req);
    if (!senha) return res.status(400).json({ error: 'Informe a senha.' });

    const tenant = await prismaUnscoped.tenant.findUnique({ where: { id: tid }, select: { mascarasSenhaHash: true } });

    if (!tenant?.mascarasSenhaHash) {
      return res.status(409).json({ code: 'SENHA_NAO_DEFINIDA', error: 'Nenhuma senha de máscaras foi definida ainda.' });
    }

    const confere = await bcrypt.compare(senha, tenant.mascarasSenhaHash);
    if (!confere) return res.status(403).json({ error: 'Senha incorreta.' });

    const token = jwt.sign({ tipo: TIPO_TOKEN_MASCARA, tenantId: tid }, JWT_SECRET, { expiresIn: '4h' });
    return res.json({ token });
  } catch (error: any) {
    return res.status(error.status || 500).json({ error: error.message || 'Erro ao verificar a senha.' });
  }
};

export const definirSenha = async (req: Request, res: Response) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    const tid = requireTenantId(req);
    if (!novaSenha || String(novaSenha).length < 4) {
      return res.status(400).json({ error: 'A nova senha precisa ter pelo menos 4 caracteres.' });
    }

    const tenant = await prismaUnscoped.tenant.findUnique({ where: { id: tid }, select: { mascarasSenhaHash: true } });

    if (tenant?.mascarasSenhaHash) {
      if (!senhaAtual) return res.status(400).json({ error: 'Informe a senha atual.' });
      const confere = await bcrypt.compare(senhaAtual, tenant.mascarasSenhaHash);
      if (!confere) return res.status(403).json({ error: 'Senha atual incorreta.' });
    }

    const novoHash = await bcrypt.hash(String(novaSenha), 10);
    await prismaUnscoped.tenant.update({ where: { id: tid }, data: { mascarasSenhaHash: novoHash } });

    return res.json({ mensagem: tenant?.mascarasSenhaHash ? 'Senha de máscaras atualizada!' : 'Senha de máscaras definida!' });
  } catch (error: any) {
    return res.status(error.status || 500).json({ error: error.message || 'Erro ao definir a senha.' });
  }
};

export const listarMascaras = async (_req: Request, res: Response) => {
  try {
    const mascaras = await prisma.mascaraSku.findMany({ orderBy: { sku: 'asc' } });
    return res.json({ mascaras });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar as máscaras.' });
  }
};

export const salvarMascara = async (req: Request, res: Response) => {
  try {
    const { sku, mascara } = req.body;
    const tid = requireTenantId(req);
    if (!sku || !String(sku).trim() || !mascara || !String(mascara).trim()) {
      return res.status(400).json({ error: 'Informe o SKU e a máscara.' });
    }

    const skuLimpo = String(sku).trim();
    const mascaraLimpa = String(mascara).trim();

    const registro = await prisma.mascaraSku.upsert({
      where: { tenantId_sku: { tenantId: tid, sku: skuLimpo } },
      update: { mascara: mascaraLimpa },
      create: { sku: skuLimpo, mascara: mascaraLimpa, tenantId: tid },
    });

    return res.status(201).json({ mensagem: 'Máscara salva com sucesso!', mascara: registro });
  } catch (error: any) {
    return res.status(error.status || 500).json({ error: error.message || 'Erro ao salvar a máscara.' });
  }
};

export const removerMascara = async (req: Request, res: Response) => {
  try {
    const sku = String(req.params.sku);
    const removido = await prisma.mascaraSku.deleteMany({ where: { sku } });
    if (removido.count === 0) return res.status(404).json({ error: 'Máscara não encontrada.' });
    return res.json({ mensagem: 'Máscara removida.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover a máscara.' });
  }
};
