import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Gerando uma senha criptografada compatível com o "bcryptjs" do projeto
  const senhaCriptografada = await bcrypt.hash('admin123', 10)

  // O upsert garante que se o usuário já existir, ele não duplica e quebra o banco
  const usuario = await prisma.usuario.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      senha: senhaCriptografada,
      precisaMudarSenha: false, // Setamos false para não travar você na tela de troca
    },
  })

  console.log(`\n✅ Usuário inicial criado com sucesso no banco local!`)
  console.log(`👤 Usuário: ${usuario.username}`)
  console.log(`🔑 Senha original: admin123\n`)
}

main()
  .catch((e) => {
    console.error('❌ Erro ao rodar o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })