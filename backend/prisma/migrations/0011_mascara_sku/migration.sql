-- =====================================================================
-- 0011_mascara_sku — Tira o dicionário de máscaras de bipagem do código
-- (antes hardcoded em maskController.ts) e coloca numa tabela editável
-- pela própria tela do Full. 100% aditivo: 1 coluna em Tenant + 1 tabela
-- nova. Nenhum dado existente é tocado.
-- =====================================================================

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "mascarasSenhaHash" TEXT;

-- CreateTable
CREATE TABLE "MascaraSku" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "mascara" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" INTEGER NOT NULL,

    CONSTRAINT "MascaraSku_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MascaraSku_tenantId_sku_key" ON "MascaraSku"("tenantId", "sku");

-- AddForeignKey
ALTER TABLE "MascaraSku" ADD CONSTRAINT "MascaraSku_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------
-- RLS na tabela nova (mesmo padrão das migrações 0005/0006/0007).
-- ---------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['MascaraSku']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$
      CREATE POLICY tenant_isolation ON %I
      USING (
        current_setting('app.rls_bypass', true) = 'on'
        OR "tenantId" = NULLIF(current_setting('app.current_tenant', true), '')::int
      )
      WITH CHECK (
        current_setting('app.rls_bypass', true) = 'on'
        OR "tenantId" = NULLIF(current_setting('app.current_tenant', true), '')::int
      )
    $p$, t);
  END LOOP;
END $$;
