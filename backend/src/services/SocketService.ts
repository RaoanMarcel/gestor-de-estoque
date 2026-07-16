import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export class SocketService {
  private static instance: SocketService;
  private io: Server | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public init(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      }
    });

    // Middleware de Autenticação do WebSocket
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
      
      if (!token) {
        return next(new Error('Acesso negado. Token não fornecido.'));
      }

      try {
        const tokenLimpo = token.replace('Bearer ', '');
        const verificado = jwt.verify(tokenLimpo, JWT_SECRET);
        (socket as any).usuario = verificado;
        next();
      } catch (error) {
        next(new Error('Token inválido ou expirado.'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const username = (socket as any).usuario?.username || 'Operador';
      console.log(`🔌 Conectado: ${username} [${socket.id}]`);
      
      // Todos entram na malha global automaticamente
      socket.join('global_malha');

      // Sistema de Presença e Subscrição Granular
      socket.on('subscribe:pallet', (palletId: string | number) => {
        const sala = `pallet_${palletId}`;
        socket.join(sala);
        socket.to(sala).emit('presence:pallet_joined', { username });
      });

      socket.on('unsubscribe:pallet', (palletId: string | number) => {
        const sala = `pallet_${palletId}`;
        socket.leave(sala);
        socket.to(sala).emit('presence:pallet_left', { username });
      });

      socket.on('disconnect', () => {
        console.log(`❌ Desconectado: ${username} [${socket.id}]`);
      });
    });
  }

  // Emite para a Home (Malha)
  public emitToGlobal(event: string, payload: any, excludeSocketId?: string) {
    if (!this.io) return;
    if (excludeSocketId) {
      this.io.to('global_malha').except(excludeSocketId).emit(event, payload);
    } else {
      this.io.to('global_malha').emit(event, payload);
    }
  }

  // Emite apenas para quem está com a tela daquele pallet aberta
  public emitToPallet(palletId: string | number, event: string, payload: any, excludeSocketId?: string) {
    if (!this.io) return;
    const sala = `pallet_${palletId}`;
    if (excludeSocketId) {
      this.io.to(sala).except(excludeSocketId).emit(event, payload);
    } else {
      this.io.to(sala).emit(event, payload);
    }
  }
}