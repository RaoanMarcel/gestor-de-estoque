-- =====================================================================
-- RLS — Fase 1: liga Row Level Security e cria as políticas de isolamento.
--
-- DORMENTE: sem FORCE, o dono das tabelas (que é quem roda migrações, o
-- seed e o prismaUnscoped) ignora as políticas. Efeito zero no app até a
-- migração 0006 aplicar o FORCE. Nada de dado é tocado.
--
-- A política libera a linha quando:
--   - a sessão tem app.rls_bypass = 'on'  (prismaUnscoped: auth, /superadmin, seed), OU
--   - "tenantId" bate com app.current_tenant (pool de conexão do tenant).
-- Ambos os GUCs entram pela string de conexão (?options=-c ...), ver src/lib/prisma.ts.
-- =====================================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'Pallet','ProdutoPallet','HistoricoMovimentacao','Cargo','Usuario','Contador',
    'Motorista','Veiculo','InboundFull','InboundSku','Recebimento','RecebimentoItem'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
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
