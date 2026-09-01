/**
 * BACKFILL multitenant — roda ENTRE a migração 0001 (expand) e a 0002 (contract).
 *
 *   npx prisma migrate deploy      # aplica 0001
 *   npx tsx prisma/backfill.ts     # este script
 *   npx prisma migrate deploy      # aplica 0002
 *
 * O que faz (idempotente, só toca a coluna tenantId nova):
 *  1. Garante o Tenant principal.
 *  2. UPDATE ... SET "tenantId" = <id> WHERE "tenantId" IS NULL  (12 tabelas).
 *  3. Marca isSuperAdmin nos usernames de SUPERADMINS.
 *
 * Não faz DELETE / DROP / TRUNCATE. Não toca em nenhuma outra coluna.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_NOME = process.env.SEED_TENANT_NOME || 'Empresa Principal';
const TENANT_SLUG = process.env.SEED_TENANT_SLUG || 'principal';

// Usernames de contas EXISTENTES que devem virar super-admin (cross-tenant).
// Normalmente deixe VAZIO: o `prisma/seed.ts` cria uma conta dedicada "superadmin".
// Só preencha se quiser promover um usuário já existente.
const SUPERADMINS: string[] = [];

const TABELAS = [
  'Pallet', 'ProdutoPallet', 'HistoricoMovimentacao', 'Cargo', 'Usuario',
  'Contador', 'Motorista', 'Veiculo', 'InboundFull', 'InboundSku',
  'Recebimento', 'RecebimentoItem',
];

async function main() {
  // 1) Tenant principal
  const existente = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id FROM "Tenant" WHERE slug = $1 LIMIT 1`, TENANT_SLUG,
  );
  let tenantId: number;
  if (existente.length) {
    tenantId = existente[0].id;
  } else {
    const criado = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "Tenant" (nome, slug, status, "createdAt", "updatedAt")
       VALUES ($1, $2, 'ATIVO', now(), now()) RETURNING id`,
      TENANT_NOME, TENANT_SLUG,
    );
    tenantId = criado[0].id;
  }
  console.log(`🏢 Tenant "${TENANT_NOME}" (slug ${TENANT_SLUG}) = id ${tenantId}`);

  // 2) Backfill por tabela
  for (const t of TABELAS) {
    const antes = await prisma.$queryRawUnsafe<any[]>(`SELECT count(*)::int AS n FROM "${t}"`);
    const nulos = await prisma.$queryRawUnsafe<any[]>(`SELECT count(*)::int AS n FROM "${t}" WHERE "tenantId" IS NULL`);
    await prisma.$executeRawUnsafe(`UPDATE "${t}" SET "tenantId" = $1 WHERE "tenantId" IS NULL`, tenantId);
    const depois = await prisma.$queryRawUnsafe<any[]>(`SELECT count(*)::int AS n FROM "${t}" WHERE "tenantId" IS NULL`);
    console.log(`  ${t.padEnd(24)} linhas=${antes[0].n}  preenchidas=${nulos[0].n}  ainda_nulas=${depois[0].n}`);
    if (depois[0].n !== 0) throw new Error(`❌ ${t} ainda tem ${depois[0].n} linhas com tenantId nulo!`);
  }

  // 3) Super-admins
  if (SUPERADMINS.length) {
    const r = await prisma.$executeRawUnsafe(
      `UPDATE "Usuario" SET "isSuperAdmin" = true WHERE username = ANY($1::text[])`,
      SUPERADMINS,
    );
    console.log(`👑 isSuperAdmin=true em ${r} usuário(s): ${SUPERADMINS.join(', ')}`);
  }

  console.log('\n✅ Backfill concluído. Pode rodar a migração 0002_tenant_contract.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
