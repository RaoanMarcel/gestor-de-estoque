# Aplicar a fundação multitenant em produção — passo a passo

> Ordem obrigatória. Não pule o backup. Nunca rode `prisma migrate dev` contra produção.

## 0. Antes de tudo — BACKUP

```bash
pg_dump "<DATABASE_URL de produção>" -Fc -f backup_pre_multitenant.dump
```
(ou snapshot no painel do Render). **Confirme que o arquivo existe e tem tamanho > 0.**

## 1. Testar numa cópia primeiro

Restaure o dump num banco separado (local ou um "branch" do Render) e faça os passos 2–6
apontando `DATABASE_URL` para essa cópia. Só depois repita em produção.

## 2. Baseline do estado atual (não executa SQL)

```bash
npx prisma migrate resolve --applied 0000_baseline
```
Isso registra no `_prisma_migrations` que o banco já está no estado pré-multitenant.

## 3. Contagem ANTES (guarde a saída)

```sql
SELECT 'Pallet' t, count(*) FROM "Pallet"
UNION ALL SELECT 'ProdutoPallet', count(*) FROM "ProdutoPallet"
UNION ALL SELECT 'HistoricoMovimentacao', count(*) FROM "HistoricoMovimentacao"
UNION ALL SELECT 'Cargo', count(*) FROM "Cargo"
UNION ALL SELECT 'Usuario', count(*) FROM "Usuario"
UNION ALL SELECT 'Contador', count(*) FROM "Contador"
UNION ALL SELECT 'Motorista', count(*) FROM "Motorista"
UNION ALL SELECT 'Veiculo', count(*) FROM "Veiculo"
UNION ALL SELECT 'InboundFull', count(*) FROM "InboundFull"
UNION ALL SELECT 'InboundSku', count(*) FROM "InboundSku"
UNION ALL SELECT 'Recebimento', count(*) FROM "Recebimento"
UNION ALL SELECT 'RecebimentoItem', count(*) FROM "RecebimentoItem";
```
Spot-check dos seriais do Full (não pode mudar depois):
```sql
SELECT id, sku, leituras FROM "InboundSku" WHERE leituras IS NOT NULL ORDER BY id LIMIT 5;
```

## 4. Expand (aditivo)

Ajuste o nome do tenant se quiser:
```bash
export SEED_TENANT_NOME="Nome da sua empresa"
export SEED_TENANT_SLUG="minhaempresa"
```
```bash
npx prisma migrate deploy      # aplica 0001_tenant_expand
```

## 5. Backfill

Edite `prisma/backfill.ts` → a lista `SUPERADMINS` (usernames que serão super-admin).
```bash
npx tsx prisma/backfill.ts
```
Confira a saída: `ainda_nulas=0` em todas as tabelas.

## 6. Contract

```bash
npx prisma migrate deploy      # aplica 0002_tenant_contract
```
Se abortar em `SET NOT NULL` → alguma tabela ficou com tenantId nulo. **Nada foi perdido**;
rode o backfill de novo e repita.

## 7. Contagem DEPOIS + verificação

- Rode a mesma query do passo 3 → **os números têm que ser idênticos**.
- Rode o spot-check dos `leituras` → **conteúdo idêntico**.
- `npx prisma generate` e suba o backend novo.
- `npx tsx prisma/seed.ts` (idempotente). Cria/garante:
  - tenant principal + cargo `ADMIN`;
  - usuário `admin` (senha `admin123`) — admin **do tenant**, enxerga só o próprio;
  - usuário `superadmin` (senha `SEED_SUPERADMIN_SENHA` ou `super123`) — **cross-tenant**,
    usado só para `POST /api/superadmin/tenants`. **Troque essa senha logo.**

## 8. Criar o 2º tenant (quando quiser)

```bash
curl -X POST https://<api>/api/superadmin/tenants \
  -H "Authorization: Bearer <token do superadmin>" -H "Content-Type: application/json" \
  -d '{"nome":"Cliente X","slug":"cliente-x","adminUsername":"clientex.admin","adminSenha":"trocar123"}'
```

## Rollback

`pg_restore --clean --if-exists -d "<DATABASE_URL>" backup_pre_multitenant.dump`
