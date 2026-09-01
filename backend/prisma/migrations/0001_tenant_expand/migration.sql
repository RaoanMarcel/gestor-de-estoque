-- =====================================================================
-- FASE EXPAND — 100% aditivo. Nenhum DROP / DELETE / TRUNCATE.
-- Roda com `prisma migrate deploy`. Depois: prisma/backfill.ts. Depois: 0002.
-- =====================================================================

-- Tenant
CREATE TABLE "Tenant" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- Usuario: flag de super-admin + tenantId (nullable nesta fase)
ALTER TABLE "Usuario" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN "tenantId" INTEGER;

-- tenantId nullable em todas as tabelas de domínio
ALTER TABLE "Pallet"                ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "ProdutoPallet"         ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "HistoricoMovimentacao" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "Cargo"                 ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "Contador"              ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "Motorista"             ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "Veiculo"               ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "InboundFull"           ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "InboundSku"            ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "Recebimento"           ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "RecebimentoItem"       ADD COLUMN "tenantId" INTEGER;
