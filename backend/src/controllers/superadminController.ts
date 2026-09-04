import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prismaUnscoped } from '../lib/prisma.js';
import { MODULOS, MODULOS_PADRAO, sanitizarModulos } from '../lib/modulos.js';
import { notificarTenant } from '../lib/notificacoes.js';

// Conjunto completo de permissões — usado no cargo ADMIN do primeiro usuário de um tenant.
export const PERMISSOES_ADMIN = [
  'malha:create', 'malha:delete',
  'estoque:in', 'estoque:out', 'estoque:transfer', 'estoque:rma',
  'reports:export', 'reports:trace',
  'full:view', 'full:manage',
  'recebimento:view', 'recebimento:manage', 'recebimento:conferencia',
  'config:regras-email',
  'acessos:usuarios', 'acessos:cargos',
];

const slugify = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

/** Catálogo de módulos — o front usa para montar rótulos e o seletor. */
export const listarModulos = (_req: Request, res: Response) => {
  return res.json({ modulos: MODULOS });
};

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

    let modulos = MODULOS_PADRAO;
    if (req.body.modulos !== undefined) {
      const limpos = sanitizarModulos(req.body.modulos);
      if (!limpos) return res.status(400).json({ error: 'Lista de módulos inválida.' });
      modulos = limpos;
    }

    const slugEmUso = await prismaUnscoped.tenant.findUnique({ where: { slug: slugFinal } });
    if (slugEmUso) return res.status(409).json({ error: 'Já existe um tenant com esse slug.' });

    const usernameEmUso = await prismaUnscoped.usuario.findUnique({ where: { username: adminUsername } });
    if (usernameEmUso) return res.status(409).json({ error: 'Esse username já está em uso.' });

    const senhaHash = await bcrypt.hash(String(adminSenha), 10);

    const tenant = await prismaUnscoped.tenant.create({
      data: {
        nome: String(nome).trim(),
        slug: slugFinal,
        modulos,
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

    return res.status(201).json({ mensagem: 'Tenant criado.', tenant: { id: tenant.id, nome: tenant.nome, slug: tenant.slug, modulos: tenant.modulos }, admin });
  } catch (error) {
    console.error('[ERRO - POST /superadmin/tenants]:', error);
    return res.status(500).json({ error: 'Erro ao criar tenant.' });
  }
};

export const atualizarTenant = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { nome, status } = req.body;

    const data: { nome?: string; status?: string; modulos?: string[] } = {};
    if (nome !== undefined) {
      if (!String(nome).trim()) return res.status(400).json({ error: 'Nome inválido.' });
      data.nome = String(nome).trim();
    }
    if (status !== undefined) {
      if (!['ATIVO', 'SUSPENSO'].includes(status)) return res.status(400).json({ error: 'status inválido.' });
      data.status = status;
    }
    if (req.body.modulos !== undefined) {
      const limpos = sanitizarModulos(req.body.modulos);
      if (!limpos) return res.status(400).json({ error: 'Lista de módulos inválida.' });
      data.modulos = limpos;
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nada para atualizar.' });

    const tenant = await prismaUnscoped.tenant.update({ where: { id }, data, select: { id: true, nome: true, slug: true, status: true, modulos: true } });
    return res.json({ mensagem: 'Empresa atualizada.', tenant });
  } catch (error) {
    console.error('[ERRO - PATCH /superadmin/tenants/:id]:', error);
    return res.status(500).json({ error: 'Erro ao atualizar a empresa.' });
  }
};

export const listarUsuariosDoTenant = async (req: Request, res: Response) => {
  try {
    const tenantId = Number(req.params.id);
    if (!tenantId) return res.status(400).json({ error: 'Empresa inválida.' });

    const usuarios = await prismaUnscoped.usuario.findMany({
      where: { tenantId },
      orderBy: { username: 'asc' },
      select: {
        id: true,
        username: true,
        precisaMudarSenha: true,
        createdAt: true,
        cargo: { select: { nome: true } },
      },
    });
    return res.json({ usuarios });
  } catch (error) {
    console.error('[ERRO - GET /superadmin/tenants/:id/usuarios]:', error);
    return res.status(500).json({ error: 'Erro ao listar usuários da empresa.' });
  }
};

export const adicionarUsuarioNoTenant = async (req: Request, res: Response) => {
  try {
    const tenantId = Number(req.params.id);
    const { username, senha, comoAdmin } = req.body;
    if (!username || !senha) return res.status(400).json({ error: 'username e senha são obrigatórios.' });

    const tenant = await prismaUnscoped.tenant.findUnique({ where: { id: tenantId }, include: { cargos: true } });
    if (!tenant) return res.status(404).json({ error: 'Empresa não encontrada.' });

    const emUso = await prismaUnscoped.usuario.findUnique({ where: { username: String(username) } });
    if (emUso) return res.status(409).json({ error: 'Esse username já está em uso.' });

    let cargoId: number | null = null;
    if (comoAdmin) {
      const admin = tenant.cargos.find((c) => c.nome === 'ADMIN')
        ?? await prismaUnscoped.cargo.create({ data: { tenantId, nome: 'ADMIN', permissoes: PERMISSOES_ADMIN } });
      cargoId = admin.id;
    }

    const senhaHash = await bcrypt.hash(String(senha), 10);
    const usuario = await prismaUnscoped.usuario.create({
      data: { username: String(username).trim(), senha: senhaHash, precisaMudarSenha: true, tenantId, cargoId },
      select: { id: true, username: true },
    });
    return res.status(201).json({ mensagem: 'Usuário criado.', usuario });
  } catch (error) {
    console.error('[ERRO - POST /superadmin/tenants/:id/usuarios]:', error);
    return res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
};

export const removerUsuarioDoTenant = async (req: Request, res: Response) => {
  try {
    const tenantId = Number(req.params.id);
    const usuarioId = Number(req.params.usuarioId);

    const alvo = await prismaUnscoped.usuario.findUnique({ where: { id: usuarioId }, select: { tenantId: true, isSuperAdmin: true } });
    if (!alvo || alvo.isSuperAdmin || alvo.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Usuário não encontrado nessa empresa.' });
    }

    await prismaUnscoped.usuario.delete({ where: { id: usuarioId } });
    return res.json({ mensagem: 'Usuário removido.' });
  } catch (error) {
    console.error('[ERRO - DELETE /superadmin/tenants/:id/usuarios/:usuarioId]:', error);
    return res.status(500).json({ error: 'Erro ao remover usuário.' });
  }
};

export const notificarPlataforma = async (req: Request, res: Response) => {
  try {
    const titulo = String(req.body?.titulo || 'Aviso da plataforma').trim() || 'Aviso da plataforma';
    const texto = String(req.body?.texto || '').trim();
    const tenantId = req.body?.tenantId ? Number(req.body.tenantId) : null;
    if (!texto) return res.status(400).json({ error: 'Escreva a mensagem do aviso.' });

    let alvos: { id: number }[];
    if (tenantId) {
      const t = await prismaUnscoped.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
      if (!t) return res.status(404).json({ error: 'Empresa não encontrada.' });
      alvos = [t];
    } else {
      alvos = await prismaUnscoped.tenant.findMany({ where: { status: 'ATIVO' }, select: { id: true } });
    }

    for (const a of alvos) notificarTenant(a.id, { titulo, texto, tipo: 'SISTEMA' });
    return res.json({ ok: true, enviados: alvos.length });
  } catch (error) {
    console.error('[ERRO - POST /superadmin/notificar]:', error);
    return res.status(500).json({ error: 'Erro ao enviar o aviso.' });
  }
};
