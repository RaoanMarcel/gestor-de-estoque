import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import palletRoutes from './routes/palletRoutes.js';
import { authController } from './controllers/authController.js';
import { autenticarToken } from './middlewares/authMiddleware.js';
import { SocketService } from './services/SocketService.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Inicializa o WebSocket
SocketService.getInstance().init(httpServer);

const prisma = new PrismaClient();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/status', (req, res) => {
  res.json({ status: 'API Rodando perfeitamente!', timestamp: new Date() });
});

app.post('/api/auth/login', authController.login);
app.post('/api/auth/alterar-senha', authController.alterarSenha); // Rota pública mantida para o fluxo obrigatório de primeiro login
app.post('/api/auth/alterar-senha-autenticado', autenticarToken, authController.alterarSenhaAutenticado); // NOVA rota de segurança
app.post('/api/auth/admin/cadastrar', authController.cadastrarUsuario);

app.use('/api', autenticarToken, palletRoutes);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor ativo na porta ${PORT}`);
});

const gracefulShutdown = async () => {
  console.log('Encerrando conexões graciosamente...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);