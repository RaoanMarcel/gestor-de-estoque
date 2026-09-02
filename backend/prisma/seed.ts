import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// O seed roda fora de request e precisa mexer em todas as empresas → RLS desligado
// via GUC na conexão (ver src/lib/prisma.ts). Sem o bypass, o FORCE RLS (migração 0006)
// bloquearia os upserts.
function urlComBypass(): string {
  const base = process.env.DATABASE_URL
  if (!base) throw new Error('DATABASE_URL não definida')
  const [semQuery, query = ''] = base.split('?')
  const params = new URLSearchParams(query)
  params.delete('options')
  const partes = [...params].map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
  partes.push(`options=${encodeURIComponent('-c app.rls_bypass=on')}`)
  return `${semQuery}?${partes.join('&')}`
}

const prisma = new PrismaClient({ datasources: { db: { url: urlComBypass() } } })

// Nome do tenant principal (a empresa que já usa o sistema hoje).
const TENANT_NOME = process.env.SEED_TENANT_NOME || 'Empresa Principal'
const TENANT_SLUG = process.env.SEED_TENANT_SLUG || 'principal'

const PERMISSOES_ADMIN = [
  'malha:create', 'malha:delete',
  'estoque:in', 'estoque:out', 'estoque:transfer', 'estoque:rma',
  'reports:export', 'reports:trace',
  'full:view', 'full:manage',
  'recebimento:view', 'recebimento:manage', 'recebimento:conferencia',
  'acessos:usuarios', 'acessos:cargos',
]

async function main() {
  // A empresa que já usa o sistema hoje nasce com todos os módulos disponíveis.
  const MODULOS_TENANT_PRINCIPAL = ['malha', 'estoque', 'rma', 'full', 'recebimento', 'reports', 'acessos']

  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: {},
    create: { nome: TENANT_NOME, slug: TENANT_SLUG, modulos: MODULOS_TENANT_PRINCIPAL },
  })

  const cargoAdmin = await prisma.cargo.upsert({
    where: { tenantId_nome: { tenantId: tenant.id, nome: 'ADMIN' } },
    update: { permissoes: PERMISSOES_ADMIN },
    create: { tenantId: tenant.id, nome: 'ADMIN', permissoes: PERMISSOES_ADMIN },
  })

  // admin comum do tenant principal (NÃO é super-admin — enxerga só o próprio tenant)
  const senhaAdmin = await bcrypt.hash('admin123', 10)
  const admin = await prisma.usuario.upsert({
    where: { username: 'admin' },
    update: { tenantId: tenant.id },
    create: {
      username: 'admin',
      senha: senhaAdmin,
      precisaMudarSenha: false,
      isSuperAdmin: false,
      tenantId: tenant.id,
      cargoId: cargoAdmin.id,
    },
  })

  // conta dedicada de super-admin (cross-tenant) — bootstrap/break-glass.
  // A senha é sempre re-sincronizada a partir do env (troque depois de logar).
  const senhaSuper = await bcrypt.hash(process.env.SEED_SUPERADMIN_SENHA || 'super123', 10)
  const superadmin = await prisma.usuario.upsert({
    where: { username: 'superadmin' },
    update: { isSuperAdmin: true, senha: senhaSuper, precisaMudarSenha: false, sessaoToken: null, tenantId: null, cargoId: null },
    create: {
      username: 'superadmin',
      senha: senhaSuper,
      precisaMudarSenha: false,
      isSuperAdmin: true,
      tenantId: null,
    },
  })

  console.log(`\n✅ Seed concluído.`)
  console.log(`🏢 Tenant: ${tenant.nome} (id ${tenant.id}, slug "${tenant.slug}")`)
  console.log(`👤 ${admin.username} / admin123  (admin do tenant)`)
  console.log(`👑 ${superadmin.username} / ${process.env.SEED_SUPERADMIN_SENHA || 'super123'}  (super-admin — troque a senha!)\n`)
}

main()
  .catch((e) => {
    console.error('❌ Erro ao rodar o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
