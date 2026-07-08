import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import palletRoutes from './routes/palletRoutes.js';
import { authController } from './controllers/authController.js';
import { autenticarToken } from './middlewares/authMiddleware.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

// ==========================================
// 🔓 ROTAS PÚBLICAS (Sem Token / Sem Bloqueio)
// ==========================================

// Endpoint de verificação (Health Check) usado pelo Render
app.get('/api/status', (req, res) => {
  res.json({ status: 'API Rodando perfeitamente!', timestamp: new Date() });
});

// Rotas de Autenticação do Usuário
app.post('/api/auth/login', authController.login);
app.post('/api/auth/alterar-senha', authController.alterarSenha);

// Rota auxiliar interna para você criar novos usuários via Insomnia/Postman
app.post('/api/auth/admin/cadastrar', authController.cadastrarUsuario);

// ==========================================
// 🔒 ROTAS PROTEGIDAS (Exigem o Header com Token JWT)
// ==========================================

// Injeta o middleware de autenticação antes de liberar os endpoints de pallets/produtos
app.use('/api', autenticarToken, palletRoutes);

// ==========================================
// 🚀 INICIALIZAÇÃO E INFRAESTRUTURA
// ==========================================

// Ajuste crucial para o Render: mantido o '0.0.0.0' no listen
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor ativo na porta ${PORT}`);
});

// Gerenciamento correto de encerramento do contêiner (Render usa SIGTERM e SIGINT)
const gracefulShutdown = async () => {
  console.log('Encerrando conexões graciosamente...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);