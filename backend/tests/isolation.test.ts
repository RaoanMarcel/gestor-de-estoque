/**
 * Teste de isolamento multitenant.
 *
 * Prova que a extension do Prisma (`src/lib/prisma.ts`) + o contexto de tenant
 * (`src/lib/tenantContext.ts`) impedem uma empresa de ler/escrever dados de outra.
 *
 * SEGURANÇA: só cria e apaga tenants com slug começando em `__isotest_`. Nunca
 * toca em dado real — pode rodar contra o banco de produção. Ainda assim, se você
 * tiver um `TEST_DATABASE_URL`, ele é usado no lugar do `DATABASE_URL`.
 *
 *   npm test
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const { prisma, prismaUnscoped } = await import('../src/lib/prisma.js');
const { runWithTenant } = await import('../src/lib/tenantContext.js');

const SLUG_PREFIX = '__isotest_';

/** Contexto de request "de mentira" para um tenant comum. */
const ctxTenant = (tenantId: number) => ({ tenantId, isSuperAdmin: false, usuarioId: null, username: 'iso' });
const ctxSuperAdmin = { tenantId: null, isSuperAdmin: true, usuarioId: null, username: 'iso-sa' };

async function criarTenantDeTeste(nome: string) {
  return prismaUnscoped.tenant.create({
    data: { nome, slug: SLUG_PREFIX + randomUUID().slice(0, 8), modulos: ['malha'] },
  });
}

async function apagarTenantsDeTeste() {
  const alvos = await prismaUnscoped.tenant.findMany({
    where: { slug: { startsWith: SLUG_PREFIX } },
    select: { id: true },
  });
  const ids = alvos.map((t) => t.id);
  if (ids.length === 0) return;

  const where = { tenantId: { in: ids } };
  // ordem segura de FK (filhos antes dos pais)
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

before(async () => {
  await apagarTenantsDeTeste();
  tenantA = (await criarTenantDeTeste('ISO A')).id;
  tenantB = (await criarTenantDeTeste('ISO B')).id;
});

after(async () => {
  await apagarTenantsDeTeste();
  await prismaUnscoped.$disconnect();
});

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

test('contexto de super-admin não acessa dados de tenant (lança)', async () => {
  await assert.rejects(
    () => runWithTenant(ctxSuperAdmin, async () => prisma.pallet.findMany()),
    /sem empresa no contexto/,
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
