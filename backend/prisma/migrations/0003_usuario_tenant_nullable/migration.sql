-- =====================================================================
-- Usuario.tenantId passa a aceitar NULL.
-- Motivo: a conta de super-admin (plataforma / break-glass) não pertence
-- a nenhuma empresa. Mudança aditiva — nenhuma linha existente é alterada
-- por este ALTER (o vínculo do super-admin é anulado por um UPDATE à parte,
-- ver CHECKLIST.md).
-- =====================================================================

ALTER TABLE "Usuario" ALTER COLUMN "tenantId" DROP NOT NULL;
