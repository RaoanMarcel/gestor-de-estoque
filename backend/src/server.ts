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

// Define a versão do backend via variável do Render (Padrão 1.0.0)
const APP_VERSION = process.env.APP_VERSION || '1.0.0';

app.use(cors());
app.use(express.json());

// --- MIDDLEWARE GLOBAL DE VERSIONAMENTO (VERSION LOCK) ---
app.use((req, res, next) => {
  res.setHeader('X-Backend-Version', APP_VERSION);
  
  // Ignora a rota de status para health-checks do Render
  if (req.path === '/api/status') return next();

  const clientVersion = req.headers['x-app-version'] as string;
  
  if (clientVersion) {
    const clientMajor = clientVersion.split('.')[0];
    const serverMajor = APP_VERSION.split('.')[0];
    
    // Se houve uma quebra de compatibilidade (Major diferente), força a atualização
    if (clientMajor !== serverMajor) {
      return res.status(426).json({ 
        error: 'Upgrade Required', 
        mensagem: 'O sistema foi atualizado para uma versão incompatível. É necessário recarregar.'
      });
    }
  }
  
  next();
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'API Rodando perfeitamente!', versao: APP_VERSION, timestamp: new Date() });
});

// Rotas de Autenticação
app.post('/api/auth/login', authController.login);
app.post('/api/auth/refresh', authController.refreshToken); // Nova rota de rotação de token
app.post('/api/auth/alterar-senha', authController.alterarSenha); 
app.post('/api/auth/alterar-senha-autenticado', autenticarToken, authController.alterarSenhaAutenticado);
app.post('/api/auth/admin/cadastrar', authController.cadastrarUsuario);

// Rotas do Sistema
app.use('/api', autenticarToken, palletRoutes);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor ativo na porta ${PORT} | Versão: ${APP_VERSION}`);
});

const gracefulShutdown = async () => {
  console.log('Encerrando conexões graciosamente...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);