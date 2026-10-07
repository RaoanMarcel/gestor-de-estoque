// Script de uso único: leva as 7 máscaras que estavam hardcoded em
// maskController.ts (antes da tabela MascaraSku existir) para dentro do banco,
// para TODO tenant já existente. Depois de rodado uma vez não precisa mais —
// as máscaras passam a ser cadastradas pela tela "🔒 Máscaras de SKU".
//
// Rodar depois de aplicar a migração 0011_mascara_sku:
//   npx tsx prisma/migrate-mascaras-antigas.ts
import { PrismaClient } from '@prisma/client'

// Mesmo motivo do seed.ts: roda fora de request e grava em todos os tenants →
// precisa do bypass do RLS (FORCE RLS da migração 0006/0007/0011).
function urlComBypass(): string {
  const base = process.env.DATABASE_URL
  if (!base) throw new Error('DATABASE_URL não definida')
  const [semQuery, query = ''] = base.split('?')
  const params = new URLSearchParams(query)
  params.delete('options')
  const partes = [...params].map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
  partes.push(`options=${encodeURIComponent('-c app.rls_bypass=on')}`)
  return `${semQuery}?${partes.join('&')}`
}

const prisma = new PrismaClient({ datasources: { db: { url: urlComBypass() } } })

const MASCARAS_ANTIGAS: Record<string, string> = {
  '012400': '**********',
  '012249': 'BR********',
  '003427': 'NAH*****************',
  '013684': '########',
  '012535': '**********',
  '013227': '********',
  '001897': '**********',
}

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, nome: true } })

  for (const tenant of tenants) {
    for (const [sku, mascara] of Object.entries(MASCARAS_ANTIGAS)) {
      await prisma.mascaraSku.upsert({
        where: { tenantId_sku: { tenantId: tenant.id, sku } },
        update: {},
        create: { tenantId: tenant.id, sku, mascara },
      })
    }
    console.log(`✅ ${tenant.nome} (id ${tenant.id}): ${Object.keys(MASCARAS_ANTIGAS).length} máscaras conferidas/criadas.`)
  }

  console.log('\n✅ Migração das máscaras antigas concluída.')
}

main()
  .catch((e) => {
    console.error('❌ Erro ao migrar as máscaras antigas:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
