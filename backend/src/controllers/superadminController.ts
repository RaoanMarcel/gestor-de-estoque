import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prismaUnscoped } from '../lib/prisma.js';
import { getAuth } from '../lib/auth.js';

// Conjunto completo de permissões — usado no cargo ADMIN do primeiro usuário de um tenant.
export const PERMISSOES_ADMIN = [
  'malha:create', 'malha:delete',
  'estoque:in', 'estoque:out', 'estoque:transfer', 'estoque:rma',
  'reports:export', 'reports:trace',
  'full:view', 'full:manage',
  'recebimento:view', 'recebimento:manage', 'recebimento:conferencia',
  'acessos:usuarios', 'acessos:cargos',
];

const slugify = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export const listarTenants = async (_req: Request, res: Response) => {
  try {
    const tenants = await prismaUnscoped.tenant.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { usuarios: true, pallets: true, recebimentos: true } } },
    });
    return res.json({ tenants });
  } catch (error) {
    console.error('[ERRO - GET /superadmin/tenants]:', error);
    return res.status(500).json({ error: 'Erro ao listar tenants.' });
  }
};

export const criarTenant = async (req: Request, res: Response) => {
  try {
    const { nome, slug, adminUsername, adminSenha } = req.body;
    if (!nome || !adminUsername || !adminSenha) {
      return res.status(400).json({ error: 'nome, adminUsername e adminSenha são obrigatórios.' });
    }
    const slugFinal = slugify(slug || nome);
    if (!slugFinal) return res.status(400).json({ error: 'Slug inválido.' });

    const slugEmUso = await prismaUnscoped.tenant.findUnique({ where: { slug: slugFinal } });
    if (slugEmUso) return res.status(409).json({ error: 'Já existe um tenant com esse slug.' });

    const usernameEmUso = await prismaUnscoped.usuario.findUnique({ where: { username: adminUsername } });
    if (usernameEmUso) return res.status(409).json({ error: 'Esse username já está em uso.' });

    const senhaHash = await bcrypt.hash(String(adminSenha), 10);

    const tenant = await prismaUnscoped.tenant.create({
      data: {
        nome: String(nome).trim(),
        slug: slugFinal,
        cargos: {
          create: { nome: 'ADMIN', permissoes: PERMISSOES_ADMIN },
        },
      },
      include: { cargos: true },
    });

    const admin = await prismaUnscoped.usuario.create({
      data: {
        username: adminUsername,
        senha: senhaHash,
        precisaMudarSenha: true,
        tenantId: tenant.id,
        cargoId: tenant.cargos[0]?.id ?? null,
      },
      select: { id: true, username: true },
    });

    return res.status(201).json({ mensagem: 'Tenant criado.', tenant: { id: tenant.id, nome: tenant.nome, slug: tenant.slug }, admin });
  } catch (error) {
    console.error('[ERRO - POST /superadmin/tenants]:', error);
    return res.status(500).json({ error: 'Erro ao criar tenant.' });
  }
};

export const suspenderTenant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // ATIVO | SUSPENSO
    if (!['ATIVO', 'SUSPENSO'].includes(status)) return res.status(400).json({ error: 'status inválido.' });
    if (getAuth(req)?.tenantId === Number(id)) return res.status(400).json({ error: 'Não é possível alterar o próprio tenant.' });

    await prismaUnscoped.tenant.update({ where: { id: Number(id) }, data: { status } });
    return res.json({ mensagem: `Tenant ${status === 'ATIVO' ? 'reativado' : 'suspenso'}.` });
  } catch (error) {
    console.error('[ERRO - PATCH /superadmin/tenants/:id]:', error);
    return res.status(500).json({ error: 'Erro ao atualizar o tenant.' });
  }
};
