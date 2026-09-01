import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto de tenant do request atual.
 *
 * É preenchido pelo middleware de autenticação (`autenticarToken`) e lido pela
 * extension do Prisma (`lib/prisma.ts`) para injetar `tenantId` em toda
 * leitura/escrita. Fora de um request autenticado (ex.: login, seed, cron)
 * `getTenantContext()` retorna `undefined` e a extension não filtra nada.
 */

export interface TenantContext {
  tenantId: number | null;
  isSuperAdmin: boolean;
  usuarioId?: number | null;
  username?: string | null;
}

const storage = new AsyncLocalStorage<TenantContext>();

/** Executa `fn` (e todo o resto da cadeia async dela) com o contexto de tenant ativo. */
export function runWithTenant<T>(ctx: TenantContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/** Contexto atual, ou `undefined` se estamos fora de um request autenticado. */
export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

/** `tenantId` atual, ou `null` (login, super-admin, tarefas de fundo). */
export function currentTenantId(): number | null {
  return storage.getStore()?.tenantId ?? null;
}

export function isSuperAdminContext(): boolean {
  return storage.getStore()?.isSuperAdmin ?? false;
}
