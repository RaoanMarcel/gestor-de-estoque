-- =====================================================================
-- 0010_rma_fornecedor — pré-cadastro leve de fornecedor no módulo RMA.
-- 100% aditivo: 1 tabela nova + 2 colunas nullable em "Rma".
-- Backfill: cria um pré-cadastro por fornecedor já usado e liga os RMAs
-- existentes. Nenhuma linha é apagada; nada fica NOT NULL.
-- =====================================================================

-- CreateTable
CREATE TABLE "RmaFornecedor" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" INTEGER NOT NULL,

    CONSTRAINT "RmaFornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RmaFornecedor_tenantId_nome_key" ON "RmaFornecedor"("tenantId", "nome");

-- CreateIndex
CREATE INDEX "RmaFornecedor_tenantId_idx" ON "RmaFornecedor"("tenantId");

-- AddForeignKey
ALTER TABLE "RmaFornecedor" ADD CONSTRAINT "RmaFornecedor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Rma" ADD COLUMN     "fornecedorEmail" TEXT,
ADD COLUMN     "fornecedorRefId" INTEGER;

-- CreateIndex
CREATE INDEX "Rma_tenantId_fornecedorRefId_idx" ON "Rma"("tenantId", "fornecedorRefId");

-- AddForeignKey
ALTER TABLE "Rma" ADD CONSTRAINT "Rma_fornecedorRefId_fkey" FOREIGN KEY ("fornecedorRefId") REFERENCES "RmaFornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------
-- Backfill (antes de ligar a RLS): 1 pré-cadastro por fornecedor já
-- usado num RMA real, e vínculo dos RMAs existentes.
-- ---------------------------------------------------------------------
INSERT INTO "RmaFornecedor" ("nome", "email", "tenantId", "createdAt", "updatedAt")
SELECT DISTINCT btrim("fornecedor"), NULL, "tenantId", now(), now()
FROM "Rma"
WHERE COALESCE("demo", false) = false
  AND "fornecedor" IS NOT NULL
  AND btrim("fornecedor") <> ''
ON CONFLICT ("tenantId", "nome") DO NOTHING;

UPDATE "Rma" r
SET "fornecedorRefId" = f."id"
FROM "RmaFornecedor" f
WHERE f."tenantId" = r."tenantId"
  AND f."nome" = btrim(r."fornecedor")
  AND r."fornecedorRefId" IS NULL;

-- ---------------------------------------------------------------------
-- RLS na tabela nova (mesmo padrão das migrações 0005/0006/0007).
-- ---------------------------------------------------------------------
ALTER TABLE "RmaFornecedor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RmaFornecedor" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "RmaFornecedor"
  USING (
    current_setting('app.rls_bypass', true) = 'on'
    OR "tenantId" = NULLIF(current_setting('app.current_tenant', true), '')::int
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = 'on'
    OR "tenantId" = NULLIF(current_setting('app.current_tenant', true), '')::int
  );
