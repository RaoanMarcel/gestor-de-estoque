/**
 * Teste de isolamento multitenant — as duas camadas:
 *   (a) extension da aplicação injeta tenantId  → sempre roda
 *   (b) RLS do Postgres recusa no banco          → roda quando FORCE RLS está ativo
 *
 * SEGURANÇA: só cria e apaga tenants com slug `__isotest_`. Nunca toca dado real —
 * pode rodar contra produção. Usa `TEST_DATABASE_URL` se existir, senão `DATABASE_URL`.
 *
 *   npm test
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const { prisma, prismaUnscoped, disconnectAll } = await import('../src/lib/prisma.js');
const { runWithTenant } = await import('../src/lib/tenantContext.js');

const SLUG_PREFIX = '__isotest_';
const ctxTenant = (tenantId: number) => ({ tenantId, isSuperAdmin: false, usuarioId: null, username: 'iso' });
const ctxSuperAdmin = { tenantId: null, isSuperAdmin: true, usuarioId: null, username: 'iso-sa' };

async function rlsForcado(): Promise<boolean> {
  const r = await prismaUnscoped.$queryRawUnsafe<{ forced: boolean; priv: boolean }[]>(`
    SELECT
      (SELECT relforcerowsecurity FROM pg_class
        WHERE relname = 'Pallet' AND relnamespace = 'public'::regnamespace) AS forced,
      (SELECT bool_or(rolsuper OR rolbypassrls) FROM pg_roles WHERE rolname = current_user) AS priv
  `);
  // RLS só é observável se o FORCE está ligado E o papel atual não é super/bypass.
  return r[0]?.forced === true && r[0]?.priv === false;
}

async function criarTenantDeTeste(nome: string) {
  return prismaUnscoped.tenant.create({
    data: { nome, slug: SLUG_PREFIX + randomUUID().slice(0, 8), modulos: ['malha'] },
  });
}

async function apagarTenantsDeTeste() {
  const alvos = await prismaUnscoped.tenant.findMany({
    where: { slug: { startsWith: SLUG_PREFIX } }, select: { id: true },
  });
  const ids = alvos.map((t) => t.id);
  if (ids.length === 0) return;
  const where = { tenantId: { in: ids } };
  await prismaUnscoped.produtoPallet.deleteMany({ where });
  await prismaUnscoped.historicoMovimentacao.deleteMany({ where });
  await prismaUnscoped.inboundSku.deleteMany({ where });
  await prismaUnscoped.recebimentoItem.deleteMany({ where });
  await prismaUnscoped.pallet.deleteMany({ where });
  await prismaUnscoped.inboundFull.deleteMany({ where });
  await prismaUnscoped.recebimento.deleteMany({ where });
  await prismaUnscoped.contador.deleteMany({ where });
  await prismaUnscoped.motorista.deleteMany({ where });
  await prismaUnscoped.veiculo.deleteMany({ where });
  await prismaUnscoped.usuario.deleteMany({ where });
  await prismaUnscoped.cargo.deleteMany({ where });
  await prismaUnscoped.tenant.deleteMany({ where: { id: { in: ids } } });
}

let tenantA: number;
let tenantB: number;
let forcado = false;

before(async () => {
  await apagarTenantsDeTeste();
  tenantA = (await criarTenantDeTeste('ISO A')).id;
  tenantB = (await criarTenantDeTeste('ISO B')).id;
  forcado = await rlsForcado();
  if (!forcado) {
    console.warn('\n⚠️  FORCE ROW LEVEL SECURITY não está ativo (migração 0006). ' +
      'Os casos "nível-banco" vão ser pulados.\n');
  }
});

after(async () => {
  await apagarTenantsDeTeste();
  await disconnectAll();
});

// ---------- camada da aplicação (sempre) ----------

test('create no contexto A grava tenantId = A', async () => {
  const p = await runWithTenant(ctxTenant(tenantA), async () =>
    prisma.pallet.create({ data: { numero: 'ISO-1' } as any }),
  );
  assert.equal(p.tenantId, tenantA);
});

test('findMany no contexto A só enxerga pallets de A', async () => {
  await runWithTenant(ctxTenant(tenantB), async () =>
    prisma.pallet.create({ data: { numero: 'ISO-1' } as any }),
  );
  const doA = await runWithTenant(ctxTenant(tenantA), async () => prisma.pallet.findMany());
  assert.ok(doA.length >= 1);
  assert.ok(doA.every((p) => p.tenantId === tenantA), 'vazou pallet de outro tenant');
});

test('A não consegue ler um pallet de B pelo id', async () => {
  const doB = await runWithTenant(ctxTenant(tenantB), async () =>
    prisma.pallet.create({ data: { numero: 'ISO-SEGREDO' } as any }),
  );
  const visto = await runWithTenant(ctxTenant(tenantA), async () =>
    prisma.pallet.findFirst({ where: { id: doB.id } }),
  );
  assert.equal(visto, null);
});

test('contexto de super-admin não acessa `prisma` (lança)', async () => {
  await assert.rejects(
    () => runWithTenant(ctxSuperAdmin, async () => prisma.pallet.findMany()),
    /conta de plataforma|sem empresa/,
  );
});

test('Contador gera sequência independente por tenant', async () => {
  const bump = (tid: number) =>
    runWithTenant(ctxTenant(tid), async () =>
      prisma.contador.upsert({
        where: { tenantId_chave: { tenantId: tid, chave: 'iso' } },
        update: { valor: { increment: 1 } },
        create: { chave: 'iso', valor: 1 } as any,
      }),
    );
  await bump(tenantA);
  await bump(tenantA);
  const a = await bump(tenantA);
  const b = await bump(tenantB);
  assert.equal(a.valor, 3);
  assert.equal(b.valor, 1);
});

test('dois contextos concorrentes não vazam um pro outro', async () => {
  const [ca, cb] = await Promise.all([
    runWithTenant(ctxTenant(tenantA), async () => {
      await new Promise((r) => setTimeout(r, 30));
      return prisma.pallet.count();
    }),
    runWithTenant(ctxTenant(tenantB), async () => {
      await new Promise((r) => setTimeout(r, 10));
      return prisma.pallet.count();
    }),
  ]);
  const realA = await prismaUnscoped.pallet.count({ where: { tenantId: tenantA } });
  const realB = await prismaUnscoped.pallet.count({ where: { tenantId: tenantB } });
  assert.equal(ca, realA);
  assert.equal(cb, realB);
});

// ---------- nível do banco (só com FORCE RLS) ----------

test('RLS: query crua no contexto A conta só os pallets de A', async (t) => {
  if (!forcado) return t.skip('FORCE RLS inativo');
  const total = await prismaUnscoped.pallet.count({ where: { tenantId: { in: [tenantA, tenantB] } } });
  const [{ n }] = await runWithTenant(ctxTenant(tenantA), async () =>
    prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*)::int AS n FROM "Pallet" WHERE "tenantId" IN (${tenantA}, ${tenantB})`,
    ),
  );
  const soA = await prismaUnscoped.pallet.count({ where: { tenantId: tenantA } });
  assert.equal(Number(n), soA);
  assert.ok(Number(n) < total, 'query crua enxergou pallets de B — RLS não filtrou');
});

test('RLS: prismaUnscoped (bypass) enxerga A e B', async (t) => {
  if (!forcado) return t.skip('FORCE RLS inativo');
  const ambos = await prismaUnscoped.pallet.findMany({
    where: { tenantId: { in: [tenantA, tenantB] } }, select: { tenantId: true },
  });
  assert.ok(ambos.some((p) => p.tenantId === tenantA));
  assert.ok(ambos.some((p) => p.tenantId === tenantB));
});

test('RLS: INSERT no contexto A com tenantId de B é recusado', async (t) => {
  if (!forcado) return t.skip('FORCE RLS inativo');
  await assert.rejects(() =>
    runWithTenant(ctxTenant(tenantA), async () =>
      prisma.$executeRawUnsafe(
        `INSERT INTO "Pallet" ("numero","tenantId","createdAt","updatedAt")
         VALUES ('ISO-HACK', ${tenantB}, now(), now())`,
      ),
    ),
  );
});
