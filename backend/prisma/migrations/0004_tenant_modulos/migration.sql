-- =====================================================================
-- Tenant.modulos: módulos contratados no plano da empresa.
-- Mudança aditiva — coluna nova com DEFAULT, nenhuma linha é reescrita.
-- O backfill da empresa existente (Pro4ce) é um UPDATE à parte, ver
-- CHECKLIST.md.
-- =====================================================================

ALTER TABLE "Tenant" ADD COLUMN "modulos" TEXT[] NOT NULL DEFAULT ARRAY[]::text[];
