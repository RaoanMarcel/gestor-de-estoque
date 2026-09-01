import { PrismaClient } from '@prisma/client';
import { getTenantContext } from './tenantContext.js';

/**
 * Cliente Prisma único do processo, já estendido com o escopo automático de tenant.
 *
 * Toda leitura/escrita passa a filtrar por `tenantId` a partir do contexto do
 * request (ver `lib/tenantContext.ts`). Quando não há contexto (login, seed,
 * cron) ou o contexto é de super-admin, nenhum filtro é aplicado.
 *
 * IMPORTANTE: `upsert` com chave composta e SQL cru (`$queryRaw`/`$executeRaw`)
 * NÃO são escopados automaticamente — precisam passar `tenantId` na mão.
 */

// Único model sem coluna `tenantId`.
const MODELOS_SEM_TENANT = new Set(['Tenant']);

const OPERACOES_COM_WHERE = new Set([
  'findUnique', 'findUniqueOrThrow',
  'findFirst', 'findFirstOrThrow',
  'findMany',
  'update', 'updateMany', 'updateManyAndReturn',
  'delete', 'deleteMany',
  'count', 'aggregate', 'groupBy',
]);

const OPERACOES_COM_DATA = new Set(['create', 'createMany', 'createManyAndReturn']);

/** Adiciona `tenantId` no payload de create e recursivamente em todo nested create. */
function injetarTenantEmData(data: any, tenantId: number): void {
  if (Array.isArray(data)) {
    data.forEach((d) => injetarTenantEmData(d, tenantId));
    return;
  }
  if (!data || typeof data !== 'object') return;

  if (!('tenantId' in data)) data.tenantId = tenantId;

  for (const key of Object.keys(data)) {
    const val = data[key];
    if (!val || typeof val !== 'object') continue;
    if ('create' in val) injetarTenantEmData(val.create, tenantId);
    if ('createMany' in val && val.createMany?.data) injetarTenantEmData(val.createMany.data, tenantId);
    if ('connectOrCreate' in val) {
      const lista = Array.isArray(val.connectOrCreate) ? val.connectOrCreate : [val.connectOrCreate];
      lista.forEach((c: any) => c?.create && injetarTenantEmData(c.create, tenantId));
    }
  }
}

const base = new PrismaClient();

/**
 * Cliente SEM escopo de tenant. Use apenas para leituras legitimamente cross-tenant:
 * autenticação (achar o usuário antes de saber o tenant), checagem de username global,
 * rotas de super-admin. Nunca em fluxo operacional normal.
 */
export const prismaUnscoped = base;

export const prisma = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const ctx = getTenantContext();

        // Fora de request autenticado, super-admin, ou model sem tenant → sem escopo.
        if (!ctx || ctx.isSuperAdmin || ctx.tenantId == null || (model && MODELOS_SEM_TENANT.has(model))) {
          return query(args);
        }

        const tenantId = ctx.tenantId;
        const a: any = args ?? {};

        if (OPERACOES_COM_WHERE.has(operation)) {
          a.where = { ...(a.where ?? {}), tenantId };
        } else if (OPERACOES_COM_DATA.has(operation)) {
          injetarTenantEmData(a.data, tenantId);
        } else if (operation === 'upsert') {
          injetarTenantEmData(a.create, tenantId);
          const chaveWhere = JSON.stringify(a.where ?? {});
          if (!chaveWhere.includes('tenantId')) {
            console.warn(`[prisma] upsert em "${model}" sem tenantId no where — escopo NÃO garantido. Passe a chave composta.`);
          }
        }

        return query(a);
      },
    },
  },
});

export type ScopedPrisma = typeof prisma;
