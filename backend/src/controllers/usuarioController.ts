import { Request, Response } from 'express';
import { prisma, prismaUnscoped } from '../lib/prisma.js';
import { getAuth } from '../lib/auth.js';
import bcrypt from 'bcryptjs';

export const listarUsuarios = async (req: Request, res: Response) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { isSuperAdmin: false }, // super-admin não aparece para os admins das empresas
      select: {
        id: true,
        username: true,
        precisaMudarSenha: true,
        createdAt: true,
        cargoId: true,
        cargo: { select: { id: true, nome: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
};

export const criarUsuario = async (req: Request, res: Response) => {
  try {
    const { username, senha, cargoId } = req.body;

    if (!username || !senha) {
      return res.status(400).json({ error: 'Username e senha são obrigatórios.' });
    }

    // username é globalmente único — checagem cross-tenant (prismaUnscoped).
    const usuarioExistente = await prismaUnscoped.usuario.findUnique({ where: { username } });
    if (usuarioExistente) {
      return res.status(400).json({ error: 'Usuário já existe.' });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    const novoUsuario = await prisma.usuario.create({
      data: {
        username,
        senha: senhaHash,
        precisaMudarSenha: true,
        cargoId: cargoId ? Number(cargoId) : null,
        tenantId: getAuth(req)!.tenantId,
      },
      select: { id: true, username: true, cargoId: true, createdAt: true }
    });

    res.status(201).json({ mensagem: 'Usuário criado com sucesso!', usuario: novoUsuario });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno ao criar usuário.' });
  }
};

// 🚀 ALTERAÇÃO: Função mantida para garantir a atualização do cargo do usuário individualmente
export const atualizarCargoUsuario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cargoId } = req.body;

    const alvo = await prisma.usuario.findFirst({ where: { id: Number(id) }, select: { isSuperAdmin: true } });
    if (!alvo || alvo.isSuperAdmin) return res.status(404).json({ error: 'Usuário não encontrado.' });

    await prisma.usuario.update({
      where: { id: Number(id) },
      data: { cargoId: cargoId ? Number(cargoId) : null }
    });

    res.json({ mensagem: 'Cargo do usuário atualizado com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar o cargo do usuário.' });
  }
};

export const excluirUsuario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const alvo = await prisma.usuario.findFirst({ where: { id: Number(id) }, select: { isSuperAdmin: true } });
    if (!alvo || alvo.isSuperAdmin) return res.status(404).json({ error: 'Usuário não encontrado.' });

    await prisma.usuario.delete({ where: { id: Number(id) } });
    res.json({ mensagem: 'Usuário excluído com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir usuário.' });
  }
};