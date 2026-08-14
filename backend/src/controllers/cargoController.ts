// src/controllers/cargoController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const listarCargosEUsuarios = async (req: Request, res: Response) => {
  try {
    const cargos = await prisma.cargo.findMany({
      include: {
        _count: { select: { usuarios: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    // Trazemos os usuários apenas com ID, nome e o Cargo para listar na aba "Usuários Vinculados"
    const usuarios = await prisma.usuario.findMany({
      select: { id: true, username: true, cargoId: true }
    });

    res.json({ cargos, usuarios });
  } catch (error) {
    // 🚀 ALTERAÇÃO: Console.error adicionado para debugar falhas invisíveis
    console.error('[ERRO - GET /cargos]:', error);
    res.status(500).json({ error: 'Erro ao buscar dados de acessos.' });
  }
};

export const criarCargo = async (req: Request, res: Response) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome do cargo é obrigatório.' });

    const cargo = await prisma.cargo.create({
      data: { nome: nome.toUpperCase(), permissoes: [] }
    });
    res.status(201).json(cargo);
  } catch (error) {
    // 🚀 ALTERAÇÃO: Console.error adicionado
    console.error('[ERRO - POST /cargos]:', error);
    res.status(500).json({ error: 'Erro ao criar o cargo.' });
  }
};

export const atualizarPermissoes = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { permissoes } = req.body;

    const cargo = await prisma.cargo.update({
      where: { id: Number(id) },
      data: { permissoes }
    });
    res.json(cargo);
  } catch (error) {
    // 🚀 ALTERAÇÃO: Console.error adicionado
    console.error('[ERRO - PUT /cargos/:id]:', error);
    res.status(500).json({ error: 'Erro ao atualizar permissões.' });
  }
};

export const excluirCargo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.cargo.delete({
      where: { id: Number(id) }
    });
    res.json({ mensagem: 'Cargo excluído com sucesso.' });
  } catch (error) {
    // 🚀 ALTERAÇÃO: Console.error adicionado
    console.error('[ERRO - DELETE /cargos/:id]:', error);
    res.status(500).json({ error: 'Erro ao excluir o cargo.' });
  }
};