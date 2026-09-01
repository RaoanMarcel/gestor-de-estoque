import { Request } from 'express';

export interface AuthInfo {
  id: number;
  username: string;
  sessaoToken: string;
  tenantId: number;
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
