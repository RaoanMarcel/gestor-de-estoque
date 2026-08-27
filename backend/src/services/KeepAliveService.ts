// backend/src/services/KeepAliveService.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class KeepAliveService {
  private static intervalId: ReturnType<typeof setInterval> | null = null;

  public static start() {
    console.log('⏰ KeepAliveService: Vigilância iniciada. O Banco de Dados não irá hibernar.');

    // Roda a cada 4 minutos (4 * 60 segundos * 1000 milissegundos)
    // Motivo: Bancos como Neon dormem em 5 minutos. Supabase em 15. Render em 15.
    const INTERVALO = 4 * 60 * 1000;

    this.intervalId = setInterval(async () => {
      try {
        // "SELECT 1" é a query mais leve possível em qualquer banco SQL.
        // Ela não acessa nenhuma tabela sua, apenas pede pro motor do DB responder "1".
        await prisma.$queryRaw`SELECT 1`;
        
        // Descomente a linha abaixo se quiser ver o log do ping no seu terminal
        // console.log(`[${new Date().toISOString()}] ⚡ KeepAlive: Ping no banco realizado com sucesso.`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ KeepAlive: Erro ao pingar o banco de dados:`, error);
      }
    }, INTERVALO);
  }

  public static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('🛑 KeepAliveService: Vigilância encerrada.');
    }
  }
}