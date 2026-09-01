import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { prismaUnscoped } from './lib/prisma.js';
import palletRoutes from './routes/palletRoutes.js';
import { authController } from './controllers/authController.js';
import { autenticarToken } from './middlewares/authMiddleware.js';
import { SocketService } from './services/SocketService.js';
import inboundRoutes from './routes/inboundRoutes.js';
import usuarioRoute from './routes/usuarioRoute.js';
import cargoRoutes from './routes/cargoRoutes.js';
import recebimentoRoutes from './routes/recebimentoRoutes.js';
import superadminRoutes from './routes/superadminRoutes.js';

// 🚀 IMPORTAÇÃO DO NOVO SERVIÇO DE VIGILÂNCIA DO BANCO
import { KeepAliveService } from './services/KeepAliveService.js';

dotenv.config();

// A variável 'app' é criada aqui, então só podemos usar app.use() daqui para baixo!
const app = express();
const httpServer = createServer(app); 

SocketService.getInstance().init(httpServer);

const prisma = prismaUnscoped;
const PORT = Number(process.env.PORT) || 3001;
const APP_VERSION = process.env.APP_VERSION || '1.0.0';

app.use(cors());

// CORREÇÃO DO LIMITE DE PAYLOAD (ERRO 413): Aumentado de 100kb para 50mb
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Backend-Version', APP_VERSION);
  if (req.path === '/api/status') return next();

  const clientVersion = req.headers['x-app-version'] as string | undefined;
  if (clientVersion) {
    const clientMajor = clientVersion.split('.')[0];
    const serverMajor = APP_VERSION.split('.')[0];
    if (clientMajor !== serverMajor) {
      return res.status(426).json({ 
        error: 'Upgrade Required', 
        mensagem: 'O sistema foi atualizado para uma versão incompatível. É necessário recarregar.'
      });
    }
  }
  next();
});

app.get('/api/status', (req: Request, res: Response) => {
  res.json({ status: 'API Rodando!', versao: APP_VERSION, timestamp: new Date() });
});

// ROTAS PÚBLICAS
const publicAuthRouter = express.Router();
publicAuthRouter.post('/login', authController.login);
publicAuthRouter.post('/refresh', authController.refreshToken); 
publicAuthRouter.post('/alterar-senha', authController.alterarSenha); 
publicAuthRouter.post('/admin/cadastrar', authController.cadastrarUsuario);

app.use('/api/auth', publicAuthRouter);
app.use('/api/usuarios', usuarioRoute);

app.post('/api/auth/alterar-senha-autenticado', autenticarToken, authController.alterarSenhaAutenticado);

// ROTAS DA APLICAÇÃO
app.use('/api', palletRoutes);
app.use('/api/inbounds', inboundRoutes);
app.use('/api/cargos', cargoRoutes);
app.use('/api/recebimentos', recebimentoRoutes);
app.use('/api/superadmin', superadminRoutes);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor ativo na porta ${PORT} | Versão: ${APP_VERSION}`);
  
  // 🚀 LIGA O CRON JOB ASSIM QUE O SERVIDOR FICA ONLINE
  KeepAliveService.start();
});

const gracefulShutdown = async () => {
  // 🚀 DESLIGA O CRON JOB ANTES DE DERRUBAR O SERVIDOR
  KeepAliveService.stop();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);