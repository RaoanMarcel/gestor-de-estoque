-- =====================================================================
-- FASE CONTRACT — só roda DEPOIS do backfill (prisma/backfill.ts) ter
-- preenchido tenantId em 100% das linhas de todas as tabelas.
-- Os SET NOT NULL abaixo ABORTAM (sem apagar nada) se sobrar linha nula.
-- =====================================================================

-- 1) tenantId obrigatório
ALTER TABLE "Usuario"               ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Pallet"                ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ProdutoPallet"         ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "HistoricoMovimentacao" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Cargo"                 ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Contador"              ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Motorista"             ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Veiculo"               ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InboundFull"           ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InboundSku"            ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Recebimento"           ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "RecebimentoItem"       ALTER COLUMN "tenantId" SET NOT NULL;

-- 2) Foreign keys
ALTER TABLE "Pallet"                ADD CONSTRAINT "Pallet_tenantId_fkey"                FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProdutoPallet"         ADD CONSTRAINT "ProdutoPallet_tenantId_fkey"         FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HistoricoMovimentacao" ADD CONSTRAINT "HistoricoMovimentacao_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Cargo"                 ADD CONSTRAINT "Cargo_tenantId_fkey"                 FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Usuario"              ADD CONSTRAINT "Usuario_tenantId_fkey"                FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contador"             ADD CONSTRAINT "Contador_tenantId_fkey"               FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Motorista"           ADD CONSTRAINT "Motorista_tenantId_fkey"               FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Veiculo"             ADD CONSTRAINT "Veiculo_tenantId_fkey"                 FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InboundFull"         ADD CONSTRAINT "InboundFull_tenantId_fkey"             FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InboundSku"          ADD CONSTRAINT "InboundSku_tenantId_fkey"              FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Recebimento"         ADD CONSTRAINT "Recebimento_tenantId_fkey"             FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecebimentoItem"     ADD CONSTRAINT "RecebimentoItem_tenantId_fkey"         FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3) Troca dos índices únicos globais por compostos (tenantId, campo).
--    DROP INDEX não apaga linha nenhuma. O CREATE composto não falha porque
--    os valores já eram únicos globalmente (logo, únicos dentro do tenant).
DROP INDEX "Cargo_nome_key";
DROP INDEX "Contador_chave_key";
DROP INDEX "Pallet_numero_key";
DROP INDEX "ProdutoPallet_codigoItem_key";
DROP INDEX "Recebimento_chaveAcesso_key";
DROP INDEX "Veiculo_placa_key";

CREATE UNIQUE INDEX "Cargo_tenantId_nome_key"                 ON "Cargo"("tenantId", "nome");
CREATE UNIQUE INDEX "Contador_tenantId_chave_key"             ON "Contador"("tenantId", "chave");
CREATE UNIQUE INDEX "Pallet_tenantId_numero_key"              ON "Pallet"("tenantId", "numero");
CREATE UNIQUE INDEX "ProdutoPallet_tenantId_codigoItem_key"   ON "ProdutoPallet"("tenantId", "codigoItem");
CREATE UNIQUE INDEX "Recebimento_tenantId_chaveAcesso_key"    ON "Recebimento"("tenantId", "chaveAcesso");
CREATE UNIQUE INDEX "Veiculo_tenantId_placa_key"              ON "Veiculo"("tenantId", "placa");
