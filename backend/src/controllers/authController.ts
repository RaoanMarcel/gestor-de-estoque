import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const authController = {
  async login(req: Request, res: Response) {
    try {
      const { username, senha } = req.body;

      if (!username || !senha) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
      }

      const usuario = await prisma.usuario.findUnique({ where: { username } });
      if (!usuario) {
        return res.status(401).json({ error: 'Usuário ou senha incorretos' });
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: 'Usuário ou senha incorretos' });
      }

      const token = jwt.sign({ id: usuario.id, username: usuario.username }, JWT_SECRET, { expiresIn: '7d' });

      return res.json({
        token,
        precisaMudarSenha: usuario.precisaMudarSenha,
        username: usuario.username
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro interno no servidor de login' });
    }
  },

  // Mantido intacto para o fluxo de primeiro acesso unificado
  async alterarSenha(req: Request, res: Response) {
    try {
      const { username, novaSenha } = req.body;

      if (!username || !novaSenha) {
        return res.status(400).json({ error: 'Dados incompletos' });
      }

      if (novaSenha.length < 4) {
        return res.status(400).json({ error: 'A nova senha deve ter pelo menos 4 caracteres' });
      }

      const senhaCriptografada = await bcrypt.hash(novaSenha, 10);

      await prisma.usuario.update({
        where: { username },
        data: {
          senha: senhaCriptografada,
          precisaMudarSenha: false
        }
      });

      return res.json({ mensagem: 'Senha atualizada com sucesso!' });
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao atualizar a senha' });
    }
  },

  // NOVA FUNCIONALIDADE: Troca de senha autenticada segura
  async alterarSenhaAutenticado(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).usuario?.id;
      const { senhaAtual, novaSenha } = req.body;

      if (!usuarioId || !senhaAtual || !novaSenha) {
        return res.status(400).json({ error: 'Dados incompletos para a troca de senha' });
      }

      if (novaSenha.length < 4) {
        return res.status(400).json({ error: 'A nova senha deve ter pelo menos 4 caracteres' });
      }

      // Busca o usuário baseado no ID decodificado do JWT
      const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Valida se a senha antiga informada está correta
      const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: 'Senha atual incorreta' });
      }

      // Gera o hash da nova senha
      const novaSenhaCriptografada = await bcrypt.hash(novaSenha, 10);

      await prisma.usuario.update({
        where: { id: usuarioId },
        data: {
          senha: novaSenhaCriptografada,
          precisaMudarSenha: false
        }
      });

      return res.json({ mensagem: 'Senha atualizada com sucesso!' });
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao atualizar a senha' });
    }
  },

  async cadastrarUsuario(req: Request, res: Response) {
    try {
      const { username, senhaPadrao } = req.body;

      if (!username || !senhaPadrao) {
        return res.status(400).json({ error: 'Username e senhaPadrao necessários' });
      }

      const senhaCriptografada = await bcrypt.hash(senhaPadrao, 10);

      const novoUsuario = await prisma.usuario.create({
        data: {
          username,
          senha: senhaCriptografada,
          precisaMudarSenha: true 
        }
      });

      return res.status(201).json({ mensagem: `Usuário ${novoUsuario.username} criado com sucesso!` });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Este nome de usuário já existe' });
      }
      return res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  }
};