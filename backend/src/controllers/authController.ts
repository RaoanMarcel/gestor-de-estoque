import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prismaUnscoped } from '../lib/prisma.js';
import { getAuth } from '../lib/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'fallback_refresh_secret';

export interface TokenPayload {
  id: number;
  username: string;
  sessaoToken: string;
  /** `null` apenas para a conta de super-admin (plataforma / break-glass). */
  tenantId: number | null;
  isSuperAdmin: boolean;
}

export const authController = {
  async login(req: Request, res: Response): Promise<Response | void> {
    try {
      const { username, senha } = req.body;

      if (!username || !senha) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
      }

      const usuario = await prismaUnscoped.usuario.findUnique({
        where: { username },
        include: { cargo: true, tenant: { select: { nome: true, status: true, modulos: true } } },
      });

      if (!usuario) {
        return res.status(401).json({ error: 'Usuário ou senha incorretos' });
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: 'Usuário ou senha incorretos' });
      }

      if (!usuario.isSuperAdmin && usuario.tenant?.status !== 'ATIVO') {
        return res.status(403).json({ code: 'TENANT_SUSPENSO', error: 'O acesso da sua empresa está suspenso.' });
      }

      const sessaoToken = crypto.randomUUID();
      await prismaUnscoped.usuario.update({
        where: { id: usuario.id },
        data: { sessaoToken },
      });

      const payload: TokenPayload = {
        id: usuario.id,
        username: usuario.username,
        sessaoToken,
        tenantId: usuario.tenantId,
        isSuperAdmin: usuario.isSuperAdmin,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
      const refreshToken = jwt.sign({ id: usuario.id, sessaoToken }, REFRESH_SECRET, { expiresIn: '1d' });

      return res.json({
        token,
        refreshToken,
        precisaMudarSenha: usuario.precisaMudarSenha,
        username: usuario.username,
        cargo: usuario.cargo?.nome || '',
        permissoes: usuario.cargo?.permissoes || [],
        tenantId: usuario.tenantId,
        tenantNome: usuario.tenant?.nome ?? null,
        modulos: usuario.tenant?.modulos ?? [],
        isSuperAdmin: usuario.isSuperAdmin,
      });
    } catch (error: unknown) {
      console.error('🔥 [ERRO CRÍTICO - POST /login]:', error);
      return res.status(500).json({ error: 'Erro interno no servidor de login. Verifique os logs do backend.' });
    }
  },

  async refreshToken(req: Request, res: Response): Promise<Response | void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(401).json({ error: 'Refresh token ausente' });

      const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { id: number; sessaoToken: string };
      const usuario = await prismaUnscoped.usuario.findUnique({ where: { id: decoded.id } });

      if (!usuario || usuario.sessaoToken !== decoded.sessaoToken) {
        return res.status(401).json({ error: 'Sessão encerrada ou usuário inválido' });
      }

      const payload: TokenPayload = {
        id: usuario.id,
        username: usuario.username,
        sessaoToken: usuario.sessaoToken,
        tenantId: usuario.tenantId,
        isSuperAdmin: usuario.isSuperAdmin,
      };
      const newToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

      return res.json({ token: newToken });
    } catch (error: unknown) {
      console.error('⚠️ [ERRO - REFRESH TOKEN]:', error);
      return res.status(401).json({ error: 'Refresh token inválido ou expirado' });
    }
  },

  async alterarSenha(req: Request, res: Response): Promise<Response | void> {
    try {
      const { username, senhaAtual, novaSenha } = req.body;
      if (!username || !senhaAtual || !novaSenha) return res.status(400).json({ error: 'Dados incompletos' });
      if (novaSenha.length < 4) return res.status(400).json({ error: 'Mínimo 4 caracteres' });

      // Rota pública (usuário ainda não autenticado, trocando a senha padrão no 1º acesso).
      // username é único global → prismaUnscoped.
      const usuario = await prismaUnscoped.usuario.findUnique({ where: { username } });
      if (!usuario) return res.status(401).json({ error: 'Usuário ou senha incorretos' });

      const senhaConfere = await bcrypt.compare(senhaAtual, usuario.senha);
      if (!senhaConfere) return res.status(401).json({ error: 'Usuário ou senha incorretos' });

      const senhaCriptografada = await bcrypt.hash(novaSenha, 10);

      await prismaUnscoped.usuario.update({
        where: { id: usuario.id },
        data: { senha: senhaCriptografada, precisaMudarSenha: false, sessaoToken: null },
      });

      return res.json({ mensagem: 'Senha atualizada com sucesso! Faça login novamente.' });
    } catch (error: unknown) {
      console.error('🔥 [ERRO CRÍTICO - ALTERAR SENHA]:', error);
      return res.status(500).json({ error: 'Erro ao atualizar a senha' });
    }
  },

  async alterarSenhaAutenticado(req: Request, res: Response): Promise<Response | void> {
    try {
      const auth = getAuth(req);
      const { senhaAtual, novaSenha } = req.body;

      if (!auth || !senhaAtual || !novaSenha) return res.status(400).json({ error: 'Dados incompletos' });
      if (novaSenha.length < 4) return res.status(400).json({ error: 'Mínimo 4 caracteres' });

      // Busca/atualiza o próprio usuário autenticado (por id confiável do token).
      // prismaUnscoped porque a conta de super-admin não tem tenant no contexto.
      const usuario = await prismaUnscoped.usuario.findUnique({ where: { id: auth.id } });
      if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

      const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
      if (!senhaValida) return res.status(401).json({ error: 'Senha atual incorreta' });

      const novaSenhaCriptografada = await bcrypt.hash(novaSenha, 10);

      await prismaUnscoped.usuario.update({
        where: { id: auth.id },
        data: { senha: novaSenhaCriptografada, precisaMudarSenha: false, sessaoToken: null },
      });

      return res.json({ mensagem: 'Senha atualizada com sucesso! Faça login novamente.' });
    } catch (error: unknown) {
      console.error('🔥 [ERRO CRÍTICO - ALTERAR SENHA AUTENTICADO]:', error);
      return res.status(500).json({ error: 'Erro ao atualizar a senha' });
    }
  },
};
