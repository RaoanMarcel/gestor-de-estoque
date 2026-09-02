import { Request } from 'express';

export interface AuthInfo {
  id: number;
  username: string;
  sessaoToken: string;
  /** `null` apenas para a conta de super-admin (plataforma / break-glass). */
  tenantId: number | null;
  isSuperAdmin: boolean;
}

/**
 * Lê os dados do usuário autenticado que o `autenticarToken` colocou no request.
 * Substitui os `(req as any).usuario?.id` espalhados pelos controllers.
 */
export function getAuth(req: Request): AuthInfo | null {
  const u = (req as any).usuario;
  if (!u || typeof u.id !== 'number') return null;
  return {
    id: u.id,
    username: u.username,
    sessaoToken: u.sessaoToken,
    tenantId: u.tenantId ?? null,
    isSuperAdmin: !!u.isSuperAdmin,
  };
}

/** `tenantId` do request atual (ou `null` — ex.: super-admin sem tenant). */
export function getTenantId(req: Request): number | null {
  return (req as any).usuario?.tenantId ?? null;
}

/**
 * `tenantId` do request atual, exigindo que exista. Use nas operações que criam
 * dados de uma empresa — se cair aqui sem tenant (ex.: super-admin batendo numa
 * rota de tenant), lança e o error handler responde 400 em vez de gravar lixo.
 */
export function requireTenantId(req: Request): number {
  const tid = getAuth(req)?.tenantId ?? null;
  if (tid == null) {
    const err = new Error('Operação exige contexto de empresa.') as Error & { status?: number };
    err.status = 400;
    throw err;
  }
  return tid;
}
