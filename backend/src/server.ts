import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import palletRoutes from './routes/palletRoutes.js';

dotenv.config();

const app = express();
// Certifique-se de que suas rotas (palletRoutes) importam o Prisma de um arquivo centralizado 
// ou usem uma instância global para que o banco funcione perfeitamente.
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api', palletRoutes);

// Endpoint de verificação (Health Check) usado por plataformas de nuvem
app.get('/api/status', (req, res) => {
  res.json({ status: 'API Rodando perfeitamente!', timestamp: new Date() });
});

// Ajuste crucial para o Render: adicionado o '0.0.0.0' no listen
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor ativo na porta ${PORT}`);
});

// Gerenciamento correto de encerramento do contêiner (Render usa SIGTERM e SIGINT)
const gracefulShutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);