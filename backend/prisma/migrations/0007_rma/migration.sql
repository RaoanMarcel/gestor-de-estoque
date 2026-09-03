-- =====================================================================
-- 0007_rma — Módulo RMA. 100% aditivo: 4 tabelas novas + 2 colunas em
-- ProdutoPallet. Nenhum dado existente é tocado.
-- =====================================================================

-- AlterTable
ALTER TABLE "ProdutoPallet" ADD COLUMN     "ean" TEXT,
ADD COLUMN     "numeroSerie" TEXT;

-- CreateTable
CREATE TABLE "Rma" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "fornecedor" TEXT NOT NULL,
    "fornecedorCnpj" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "canhoto" TEXT,
    "palletId" INTEGER,
    "abertoPorId" INTEGER,
    "finalizadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" INTEGER NOT NULL,

    CONSTRAINT "Rma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RmaItem" (
    "id" SERIAL NOT NULL,
    "rmaId" INTEGER NOT NULL,
    "produtoPalletId" INTEGER,
    "codigoTriagem" TEXT NOT NULL,
    "identificador" TEXT,
    "tipoIdentificador" TEXT,
    "produtoNome" TEXT,
    "produtoCodigo" TEXT,
    "origemPalletId" INTEGER,
    "desfecho" TEXT NOT NULL DEFAULT 'PENDENTE',
    "retornoSerie" TEXT,
    "retornoNotaId" INTEGER,
    "destinoEstoque" TEXT,
    "destinoPalletId" INTEGER,
    "resolvidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" INTEGER NOT NULL,

    CONSTRAINT "RmaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RmaNota" (
    "id" SERIAL NOT NULL,
    "rmaId" INTEGER NOT NULL,
    "direcao" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "numero" TEXT,
    "serie" TEXT,
    "chaveAcesso" TEXT,
    "natureza" TEXT,
    "dataEmissao" TIMESTAMP(3),
    "statusNota" TEXT,
    "xmlOriginal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" INTEGER NOT NULL,

    CONSTRAINT "RmaNota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RmaAnotacao" (
    "id" SERIAL NOT NULL,
    "rmaId" INTEGER NOT NULL,
    "usuarioId" INTEGER,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" INTEGER NOT NULL,

    CONSTRAINT "RmaAnotacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Rma_tenantId_status_idx" ON "Rma"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Rma_tenantId_numero_key" ON "Rma"("tenantId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "RmaItem_produtoPalletId_key" ON "RmaItem"("produtoPalletId");

-- CreateIndex
CREATE INDEX "RmaItem_tenantId_rmaId_idx" ON "RmaItem"("tenantId", "rmaId");

-- CreateIndex
CREATE INDEX "RmaNota_tenantId_rmaId_idx" ON "RmaNota"("tenantId", "rmaId");

-- CreateIndex
CREATE UNIQUE INDEX "RmaNota_tenantId_chaveAcesso_key" ON "RmaNota"("tenantId", "chaveAcesso");

-- CreateIndex
CREATE INDEX "RmaAnotacao_tenantId_rmaId_idx" ON "RmaAnotacao"("tenantId", "rmaId");

-- AddForeignKey
ALTER TABLE "Rma" ADD CONSTRAINT "Rma_palletId_fkey" FOREIGN KEY ("palletId") REFERENCES "Pallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rma" ADD CONSTRAINT "Rma_abertoPorId_fkey" FOREIGN KEY ("abertoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rma" ADD CONSTRAINT "Rma_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RmaItem" ADD CONSTRAINT "RmaItem_rmaId_fkey" FOREIGN KEY ("rmaId") REFERENCES "Rma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RmaItem" ADD CONSTRAINT "RmaItem_produtoPalletId_fkey" FOREIGN KEY ("produtoPalletId") REFERENCES "ProdutoPallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RmaItem" ADD CONSTRAINT "RmaItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RmaNota" ADD CONSTRAINT "RmaNota_rmaId_fkey" FOREIGN KEY ("rmaId") REFERENCES "Rma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RmaNota" ADD CONSTRAINT "RmaNota_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RmaAnotacao" ADD CONSTRAINT "RmaAnotacao_rmaId_fkey" FOREIGN KEY ("rmaId") REFERENCES "Rma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RmaAnotacao" ADD CONSTRAINT "RmaAnotacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RmaAnotacao" ADD CONSTRAINT "RmaAnotacao_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------
-- RLS nas tabelas novas (mesmo padrão das migrações 0005/0006).
-- ---------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Rma','RmaItem','RmaNota','RmaAnotacao']
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
