/**
 * Catálogo de módulos da plataforma.
 *
 * `Tenant.modulos` guarda as `chave`s dos módulos que a empresa contratou no plano.
 * Por enquanto isso só é exibido/editado no console do super-admin (`/superadmin`) —
 * o app do cliente continua sendo controlado pelas permissões de cargo. Travar o app
 * pelos módulos é um passo futuro.
 */

export interface Modulo {
  chave: string;
  nome: string;
  /** já existe no produto (true) ou é pré-venda / roadmap (false). */
  disponivel: boolean;
}

export const MODULOS: readonly Modulo[] = [
  { chave: 'malha', nome: 'Endereçamento / Malha', disponivel: true },
  { chave: 'estoque', nome: 'Movimentações de estoque', disponivel: true },
  { chave: 'rma', nome: 'RMA / Devoluções', disponivel: true },
  { chave: 'full', nome: 'Mercado Full', disponivel: true },
  { chave: 'recebimento', nome: 'Recebimento de mercadoria', disponivel: true },
  { chave: 'reports', nome: 'Relatórios e rastreio', disponivel: true },
  { chave: 'acessos', nome: 'Usuários e cargos', disponivel: true },
  { chave: 'financeiro', nome: 'Financeiro', disponivel: false },
  { chave: 'tms', nome: 'Transporte (TMS)', disponivel: false },
  { chave: 'oms', nome: 'Pedidos (OMS)', disponivel: false },
  { chave: 'bi', nome: 'Business Intelligence', disponivel: false },
];

/** Módulos que uma empresa nova recebe por padrão. */
export const MODULOS_PADRAO: string[] = ['malha', 'estoque', 'recebimento', 'reports', 'acessos'];

const CHAVES_VALIDAS = new Set(MODULOS.map((m) => m.chave));

/**
 * Normaliza uma lista recebida do cliente: mantém só chaves conhecidas, sem repetição,
 * na ordem do catálogo. Retorna `null` se algum item for inválido (para o caller
 * responder 400).
 */
export function sanitizarModulos(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const pedidos = new Set<string>();
  for (const item of input) {
    if (typeof item !== 'string' || !CHAVES_VALIDAS.has(item)) return null;
    pedidos.add(item);
  }
  return MODULOS.filter((m) => pedidos.has(m.chave)).map((m) => m.chave);
}
