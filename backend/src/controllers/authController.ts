import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; // 🚀 Importação nativa para gerar o UUID único da sessão

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'fallback_refresh_secret';

export interface TokenPayload {
  id: number;
  username: string;
  sessaoToken: string; // 🚀 Adicionado ao payload
}

export const authController = {
  async login(req: Request, res: Response): Promise<Response | void> {
    try {
      const { username, senha } = req.body;

      if (!username || !senha) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
      }

      const usuario = await prisma.usuario.findUnique({ 
        where: { username },
        include: { cargo: true }
      });

      if (!usuario) {
        return res.status(401).json({ error: 'Usuário ou senha incorretos' });
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: 'Usuário ou senha incorretos' });
      }

      // 🚀 GERA UM ID ÚNICO PARA ESTA SESSÃO ESPECÍFICA E SALVA NO BANCO
      const sessaoToken = crypto.randomUUID();
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { sessaoToken } // Atualiza a sessão, derrubando dispositivos antigos
      });

      const payload: TokenPayload = { id: usuario.id, username: usuario.username, sessaoToken };
      
      // 🚀 ALTERADO PARA 1 DIA DE VALIDADE
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' }); 
      // Refresh token também ajustado caso o sistema ainda o utilize em background
      const refreshToken = jwt.sign({ id: usuario.id, sessaoToken }, REFRESH_SECRET, { expiresIn: '1d' });

      return res.json({
        token,
        refreshToken,
        precisaMudarSenha: usuario.precisaMudarSenha,
        username: usuario.username,
        cargo: usuario.cargo?.nome || '',
        permissoes: usuario.cargo?.permissoes || []
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

      const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { id: number, sessaoToken: string };
      const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });

      // Se a sessão no banco mudou, o refresh token antigo não serve mais!
      if (!usuario || usuario.sessaoToken !== decoded.sessaoToken) {
        return res.status(401).json({ error: 'Sessão encerrada ou usuário inválido' });
      }

      const payload: TokenPayload = { id: usuario.id, username: usuario.username, sessaoToken: usuario.sessaoToken };
      const newToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

      return res.json({ token: newToken });
    } catch (error: unknown) {
      console.error('⚠️ [ERRO - REFRESH TOKEN]:', error);
      return res.status(401).json({ error: 'Refresh token inválido ou expirado' });
    }
  },

  async alterarSenha(req: Request, res: Response): Promise<Response | void> {
    try {
      const { username, novaSenha } = req.body;
      if (!username || !novaSenha) return res.status(400).json({ error: 'Dados incompletos' });
      if (novaSenha.length < 4) return res.status(400).json({ error: 'Mínimo 4 caracteres' });

      const senhaCriptografada = await bcrypt.hash(novaSenha, 10);

      // Ao mudar a senha, desloga todos os outros aparelhos limpando a sessão
      await prisma.usuario.update({
        where: { username },
        data: { senha: senhaCriptografada, precisaMudarSenha: false, sessaoToken: null }
      });

      return res.json({ mensagem: 'Senha atualizada com sucesso! Faça login novamente.' });
    } catch (error: unknown) {
      console.error('🔥 [ERRO CRÍTICO - ALTERAR SENHA]:', error);
      return res.status(500).json({ error: 'Erro ao atualizar a senha' });
    }
  },

  async alterarSenhaAutenticado(req: Request, res: Response): Promise<Response | void> {
    try {
      const usuarioId = (req as any).usuario?.id;
      const { senhaAtual, novaSenha } = req.body;

      if (!usuarioId || !senhaAtual || !novaSenha) return res.status(400).json({ error: 'Dados incompletos' });
      if (novaSenha.length < 4) return res.status(400).json({ error: 'Mínimo 4 caracteres' });

      const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
      if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

      const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
      if (!senhaValida) return res.status(401).json({ error: 'Senha atual incorreta' });

      const novaSenhaCriptografada = await bcrypt.hash(novaSenha, 10);

      await prisma.usuario.update({
        where: { id: usuarioId },
        data: { senha: novaSenhaCriptografada, precisaMudarSenha: false, sessaoToken: null }
      });

      return res.json({ mensagem: 'Senha atualizada com sucesso! Faça login novamente.' });
    } catch (error: unknown) {
      console.error('🔥 [ERRO CRÍTICO - ALTERAR SENHA AUTENTICADO]:', error);
      return res.status(500).json({ error: 'Erro ao atualizar a senha' });
    }
  },

  async cadastrarUsuario(req: Request, res: Response): Promise<Response | void> {
    try {
      const { username, senhaPadrao } = req.body;
      if (!username || !senhaPadrao) return res.status(400).json({ error: 'Username e senhaPadrao necessários' });

      const senhaCriptografada = await bcrypt.hash(senhaPadrao, 10);
      const novoUsuario = await prisma.usuario.create({
        data: { username, senha: senhaCriptografada, precisaMudarSenha: true }
      });

      return res.status(201).json({ mensagem: `Usuário ${novoUsuario.username} criado com sucesso!` });
    } catch (error: any) {
      if (error.code === 'P2002') return res.status(400).json({ error: 'Este nome de usuário já existe' });

      console.error('🔥 [ERRO CRÍTICO - CADASTRAR USUÁRIO]:', error);
      return res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  },

  async validarSenhaOperacao(req: Request, res: Response): Promise<Response | void> {
    const usuarioId = (req as any).usuario?.id; 
    const { senha } = req.body;

    if (!usuarioId || !senha) {
      return res.status(400).json({ error: 'Dados insuficientes para validação.' });
    }

    try {
      const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
      if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });

      const senhaValida = await bcrypt.compare(senha, usuario.senha);

      if (!senhaValida) {
        return res.status(401).json({ error: 'Senha incorreta. Ação bloqueada.' });
      }

      return res.status(200).json({ mensagem: 'Autenticação validada com sucesso.' });
    } catch (error) {
      return res.status(500).json({ error: 'Erro interno ao validar a senha.' });
    }
  }
};