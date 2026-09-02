-- =====================================================================
-- RLS — Fase 2: ATIVA. Aplica FORCE ROW LEVEL SECURITY nas 12 tabelas.
--
-- A partir daqui a política vale até para o dono das tabelas. O app tem
-- que estar rodando o código novo (pools por tenant + prismaUnscoped com
-- bypass) ANTES desta migração — ver prisma/migrations/CHECKLIST.md.
--
-- Rollback instantâneo, sem perda de dados:
--   DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY[...12 tabelas...]
--   LOOP EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', t); END LOOP; END $$;
-- =====================================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'Pallet','ProdutoPallet','HistoricoMovimentacao','Cargo','Usuario','Contador',
    'Motorista','Veiculo','InboundFull','InboundSku','Recebimento','RecebimentoItem'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
