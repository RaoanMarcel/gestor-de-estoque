import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export class SocketService {
  private static instance: SocketService;
  private io: Server | null = null;
  
  private activeUsersInRooms: Map<string, Set<string>> = new Map();
  private socketData: Map<string, { username: string; rooms: Set<string> }> = new Map();

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public init(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
    });

    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
      if (!token) return next(new Error('Acesso negado. Token não fornecido.'));
      try {
        const tokenLimpo = token.startsWith('Bearer ') ? token.slice(7) : token;
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
      
      socket.join('global_malha');
      this.socketData.set(socket.id, { username, rooms: new Set() });
      
      socket.emit('presence:global_update', this.getGlobalPresenceData());

      socket.on('subscribe:pallet', (palletId: string | number) => {
        const sala = `pallet_${palletId}`;
        socket.join(sala);
        
        if (!this.activeUsersInRooms.has(String(palletId))) {
          this.activeUsersInRooms.set(String(palletId), new Set());
        }
        this.activeUsersInRooms.get(String(palletId))!.add(username);
        this.socketData.get(socket.id)!.rooms.add(String(palletId));

        this.broadcastPresenceUpdate(String(palletId));
      });

      socket.on('unsubscribe:pallet', (palletId: string | number) => {
        this.removeUserFromRoom(socket, String(palletId), username);
      });

      socket.on('disconnect', () => {
        console.log(`❌ Desconectado: ${username} [${socket.id}]`);
        const userData = this.socketData.get(socket.id);
        if (userData) {
          userData.rooms.forEach(palletId => {
            this.removeUserFromRoom(socket, palletId, username);
          });
        }
        this.socketData.delete(socket.id);
      });
    });
  }

  private removeUserFromRoom(socket: Socket, palletId: string, username: string) {
    const sala = `pallet_${palletId}`;
    socket.leave(sala);
    
    const roomUsers = this.activeUsersInRooms.get(palletId);
    if (roomUsers) {
      roomUsers.delete(username);
      if (roomUsers.size === 0) {
        this.activeUsersInRooms.delete(palletId);
      }
      this.broadcastPresenceUpdate(palletId);
    }
  }

  private broadcastPresenceUpdate(palletId: string) {
    if (!this.io) return;
    const users = Array.from(this.activeUsersInRooms.get(palletId) || []);
    
    this.io.to(`pallet_${palletId}`).emit('presence:room_update', { users });
    this.io.to('global_malha').emit('presence:global_update', this.getGlobalPresenceData());
  }

  private getGlobalPresenceData() {
    const data: Record<string, string[]> = {};
    this.activeUsersInRooms.forEach((users, palletId) => {
      data[palletId] = Array.from(users);
    });
    return data;
  }

  public emitToGlobal(event: string, payload: any, excludeSocketId?: string) {
    if (!this.io) return;
    if (excludeSocketId) {
      this.io.to('global_malha').except(excludeSocketId).emit(event, payload);
    } else {
      this.io.to('global_malha').emit(event, payload);
    }
  }

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