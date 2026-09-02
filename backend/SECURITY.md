# Isolamento multitenant — como funciona e o que auditar

Duas camadas independentes:

1. **Aplicação** — `src/lib/prisma.ts`. O `import { prisma }` é um Proxy que resolve, a cada
   acesso, o **pool de conexões da empresa do request** (`clienteDoTenant`). Uma extension
   ainda injeta `tenantId` em todo `where`/`data` (cinto). Contexto vem de
   `src/lib/tenantContext.ts` (`AsyncLocalStorage`), preenchido por `autenticarToken`.
2. **Banco (RLS)** — `FORCE ROW LEVEL SECURITY` + política `tenant_isolation` nas 12 tabelas
   (migrações `0005`/`0006`). Cada pool de tenant conecta com
   `?options=-c app.current_tenant=<id>`; o `prismaUnscoped` conecta com
   `-c app.rls_bypass=on`. O Postgres filtra sozinho — inclusive dentro dos `$transaction`.

`src/middlewares/authMiddleware.ts` — `autenticarToken` liga o contexto; `somenteTenant`
barra a conta de plataforma (super-admin) nas rotas de operação, com 403 limpo.

## Regras para PRs

1. **Nunca** use `prismaUnscoped` num controller de operação. Só é aceitável em: auth
   pré-contexto, unicidade global de `username`, rotas `/superadmin`, keep-alive.
2. Toda rota que lê/escreve dado de empresa passa por `autenticarToken` **e** `somenteTenant`.
3. `findUnique`/`update`/`delete` por campo que virou `@@unique([tenantId, x])` → use
   `findFirst`/`updateMany`/`deleteMany` ou a chave composta `tenantId_x`.
4. `upsert` — passe a chave composta `tenantId_x` no `where`.
5. SQL cru pelo client de tenant JÁ é filtrado por RLS (o GUC está na conexão). Pelo
   `prismaUnscoped`, não — inclua `tenantId` na query.
6. **Migração com DML** (`INSERT`/`UPDATE`/`DELETE` em tabela de tenant): comece o `.sql`
   com `SET LOCAL "app.rls_bypass" = 'on';`, senão o FORCE RLS bloqueia.
7. Rode `npm test` (teste de isolamento — roda no CI com RLS forçado de verdade) antes de subir.

## Inventário de acessos não escopados (revisado 2026-09)

| Local | O quê | Por que é seguro |
|---|---|---|
| `superadminController.ts` (todo) | `prismaUnscoped` | rota `/superadmin`, `autenticarToken` + `requireSuperAdmin`; função cross-tenant |
| `usuarioController.ts` `criarUsuario` | `prismaUnscoped.usuario.findUnique({ where: { username } })` | `username` é único global; só checa existência |
| `authController.ts` `login` / `refreshToken` | `prismaUnscoped` | roda antes de existir contexto de tenant; autentica por `username` |
| `authController.ts` `alterarSenha` / `alterarSenhaAutenticado` | `prismaUnscoped` | `alterarSenha` (pública) confere `senhaAtual`; `alterarSenhaAutenticado` age só sobre o próprio `id` do token |
| `authMiddleware.ts` `autenticarToken` | `prismaUnscoped.usuario.findUnique` | é o passo que descobre o tenant; lê o usuário por `id` do token |
| `KeepAliveService.ts` | `prismaUnscoped.$queryRaw\`SELECT 1\`` | ping de keep-alive |
| `prisma/seed.ts` | `PrismaClient` com `-c app.rls_bypass=on` | roda fora de request, semeia a 1ª empresa |

## Teto conhecido (pool por tenant)

`src/lib/prisma.ts` cria **um pool por empresa** (`connection_limit=5`) + o pool
`prismaUnscoped` (`10`, caminho quente de auth). O Render dá `max_connections=103`, então
cabem **~15 empresas ativas** antes de faltar conexão. TODO ao chegar perto disso: migrar
para transação-por-request com `set_config` (mais código, sem teto), ou pgbouncer. Hoje há
1 empresa.

## O que ainda falta

- Role de banco dedicada só pra runtime (hoje o app conecta com o mesmo papel dono das
  tabelas; o FORCE RLS cobre isso, mas uma role sem privilégio de dono seria mais limpo).
- Banco de staging pra testar migração antes de produção.
