# Isolamento multitenant — como funciona e o que auditar

O isolamento entre empresas (tenants) hoje é **na camada da aplicação**: a extension do
Prisma injeta `tenantId` em toda leitura/escrita a partir do contexto do request.

- `src/lib/tenantContext.ts` — `AsyncLocalStorage` com `{ tenantId, isSuperAdmin }`,
  preenchido por `autenticarToken`.
- `src/lib/prisma.ts` — `prisma` (estendido, escopado) e `prismaUnscoped` (cru).
- `src/middlewares/authMiddleware.ts` — `autenticarToken` liga o contexto; `somenteTenant`
  barra conta de plataforma (super-admin) em rotas de operação.

## Regras para PRs

1. **Nunca** use `prismaUnscoped` num controller de operação. Ele só é aceitável para:
   leitura pré-autenticação, unicidade global de `username`, e as rotas de `/superadmin`.
2. Toda rota que lê/escreve dado de empresa passa por `autenticarToken` **e** `somenteTenant`.
3. `findUnique`/`update`/`delete` por campo que virou `@@unique([tenantId, x])` → use
   `findFirst`/`updateMany`/`deleteMany` ou a chave composta `tenantId_x`.
4. `upsert` não é reescrito com segurança pela extension — passe a chave composta
   `tenantId_x` no `where`.
5. SQL cru (`$queryRaw`/`$executeRaw`) **não** é escopado — inclua `tenant_id` na query.
6. Rode `npm test` (teste de isolamento) antes de subir.

## Inventário de acessos não escopados (revisado 2026-09)

| Local | O quê | Por que é seguro |
|---|---|---|
| `superadminController.ts` (todo) | `prismaUnscoped` | rota `/superadmin`, protegida por `autenticarToken` + `requireSuperAdmin`; a função do super-admin é cross-tenant |
| `usuarioController.ts` `criarUsuario` | `prismaUnscoped.usuario.findUnique({ where: { username } })` | `username` é único global; só checa existência, não expõe dado |
| `authController.ts` `login` / `refreshToken` / `alterarSenha` | `prisma` estendido, mas rota **pública** → sem contexto → passthrough | busca o usuário por `username` para autenticar; `alterarSenha` confere `senhaAtual` |
| `authController.ts` `alterarSenhaAutenticado` | `prismaUnscoped` por `id` do próprio token | age só sobre o próprio usuário autenticado |
| `authMiddleware.ts` `autenticarToken` | `prisma` estendido antes do contexto existir → passthrough | é o passo que descobre o tenant; lê o usuário por `id` do token |
| `KeepAliveService.ts` | `prismaUnscoped.$queryRaw\`SELECT 1\`` | ping de keep-alive, não toca dado |
| `server.ts` | `prismaUnscoped.$disconnect()` | só no shutdown |

## O que ainda falta (próxima rodada)

- **RLS do Postgres** — `ENABLE`/`FORCE ROW LEVEL SECURITY` + políticas `tenant_id =
  current_setting('app.tenant_id')` nas 12 tabelas, com a extension abrindo uma transação
  por operação para `set_config`. É a segunda camada: hoje, um bug que ignore a extension
  vaza dado; com RLS o banco recusa.
- **CI** — rodar `npm test` + `tsc` + build a cada push (GitHub Actions com Postgres de
  serviço).
