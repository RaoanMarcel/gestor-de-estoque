import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

/** Presença e travas são isoladas por tenant. As chaves internas levam o prefixo `${tid}:`. */
export class SocketService {
  private static instance: SocketService;
  private io: Server | null = null;

  // chave: `${tenantId}:${palletId}` -> Set<username>
  private activeUsersInRooms: Map<string, Set<string>> = new Map();

  // chave: `${tenantId}::${skuKey}` -> username   (skuKey vem do front: "full:5" / "receb:5")
  private lockedSkus: Map<string, string> = new Map();
  private socketData: Map<string, { username: string; tenantId: number; rooms: Set<string>; lockedSkus: Set<string> }> = new Map();

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) SocketService.instance = new SocketService();
    return SocketService.instance;
  }

  // ---------- helpers de nomenclatura ----------
  private malhaRoom(tid: number) { return `t:${tid}:malha`; }
  private palletRoom(tid: number, palletId: string | number) { return `t:${tid}:pallet:${palletId}`; }
  private lockKey(tid: number, skuKey: string) { return `${tid}::${skuKey}`; }
  private roomUserKey(tid: number, palletId: string) { return `${tid}:${palletId}`; }

  public init(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
    });

    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
      if (!token) return next(new Error('Acesso negado. Token não fornecido.'));
      try {
        const tokenLimpo = token.startsWith('Bearer ') ? token.slice(7) : token;
        const verificado = jwt.verify(tokenLimpo, JWT_SECRET) as any;
        (socket as any).usuario = verificado;
        next();
      } catch (error) {
        next(new Error('Token inválido ou expirado.'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const u = (socket as any).usuario || {};
      const username: string = u.username || 'Operador';
      const tenantId: number = Number(u.tenantId);

      if (!tenantId) {
        // super-admin ou token antigo sem tenant — não participa das salas de tenant
        socket.disconnect(true);
        return;
      }

      console.log(`🔌 Conectado: ${username} [t${tenantId}] [${socket.id}]`);

      socket.join(this.malhaRoom(tenantId));
      this.socketData.set(socket.id, { username, tenantId, rooms: new Set(), lockedSkus: new Set() });

      socket.emit('presence:global_update', this.getGlobalPresenceData(tenantId));
      socket.emit('sku_locks_initial', this.locksDoTenant(tenantId));

      // ---------- TRAVA DE SKU (por tenant) ----------
      socket.on('lock_sku', ({ skuId }: { skuId: string; usuario?: string }) => {
        const key = this.lockKey(tenantId, String(skuId));
        const donoAtual = this.lockedSkus.get(key);
        if (donoAtual && donoAtual !== username) {
          socket.emit('sku_locked_error', { skuId, usuario: donoAtual });
        } else {
          this.lockedSkus.set(key, username);
          this.socketData.get(socket.id)!.lockedSkus.add(key);
          this.io!.to(this.malhaRoom(tenantId)).emit('sku_lock_update', { skuId: String(skuId), lockedBy: username });
        }
      });

      socket.on('unlock_sku', ({ skuId }: { skuId: string }) => {
        this.unlockSku(socket, tenantId, this.lockKey(tenantId, String(skuId)));
      });

      socket.on('request_sku_locks', () => {
        socket.emit('sku_locks_initial', this.locksDoTenant(tenantId));
      });

      // ---------- PRESENÇA POR PALLET ----------
      socket.on('subscribe:pallet', (palletId: string | number) => {
        socket.join(this.palletRoom(tenantId, palletId));
        const ruKey = this.roomUserKey(tenantId, String(palletId));
        if (!this.activeUsersInRooms.has(ruKey)) this.activeUsersInRooms.set(ruKey, new Set());
        this.activeUsersInRooms.get(ruKey)!.add(username);
        this.socketData.get(socket.id)!.rooms.add(String(palletId));
        this.broadcastPresenceUpdate(tenantId, String(palletId));
      });

      socket.on('unsubscribe:pallet', (palletId: string | number) => {
        this.removeUserFromRoom(socket, tenantId, String(palletId), username);
      });

      socket.on('disconnect', () => {
        console.log(`❌ Desconectado: ${username} [t${tenantId}] [${socket.id}]`);
        const data = this.socketData.get(socket.id);
        if (data) {
          data.rooms.forEach((palletId) => this.removeUserFromRoom(socket, tenantId, palletId, username));
          data.lockedSkus.forEach((key) => this.unlockSku(socket, tenantId, key));
        }
        this.socketData.delete(socket.id);
      });
    });
  }

  /** Travas do tenant, já sem o prefixo — o front continua recebendo "full:5" / "receb:5". */
  private locksDoTenant(tid: number): Record<string, string> {
    const prefixo = `${tid}::`;
    const out: Record<string, string> = {};
    for (const [key, dono] of this.lockedSkus) {
      if (key.startsWith(prefixo)) out[key.slice(prefixo.length)] = dono;
    }
    return out;
  }

  private unlockSku(_socket: Socket, tid: number, key: string) {
    if (!this.lockedSkus.has(key)) return;
    this.lockedSkus.delete(key);
    this.socketData.forEach((d) => d.lockedSkus.delete(key));
    const skuId = key.slice(`${tid}::`.length);
    this.io?.to(this.malhaRoom(tid)).emit('sku_lock_update', { skuId, lockedBy: null });
  }

  private removeUserFromRoom(socket: Socket, tid: number, palletId: string, username: string) {
    socket.leave(this.palletRoom(tid, palletId));
    const ruKey = this.roomUserKey(tid, palletId);
    const users = this.activeUsersInRooms.get(ruKey);
    if (users) {
      users.delete(username);
      if (users.size === 0) this.activeUsersInRooms.delete(ruKey);
      this.broadcastPresenceUpdate(tid, palletId);
    }
  }

  private broadcastPresenceUpdate(tid: number, palletId: string) {
    if (!this.io) return;
    const users = Array.from(this.activeUsersInRooms.get(this.roomUserKey(tid, palletId)) || []);
    this.io.to(this.palletRoom(tid, palletId)).emit('presence:room_update', { users });
    this.io.to(this.malhaRoom(tid)).emit('presence:global_update', this.getGlobalPresenceData(tid));
  }

  private getGlobalPresenceData(tid: number) {
    const data: Record<string, string[]> = {};
    const prefixo = `${tid}:`;
    this.activeUsersInRooms.forEach((users, ruKey) => {
      if (ruKey.startsWith(prefixo)) data[ruKey.slice(prefixo.length)] = Array.from(users);
    });
    return data;
  }

  // ---------- API pública (chamada dos controllers) ----------
  /** Envia uma notificação para todos os sockets do tenant (sino global do front). */
  public notificar(tenantId: number, payload: any) {
    this.emitToGlobal(tenantId, 'notificacao', payload);
  }

  public emitToGlobal(tenantId: number, event: string, payload: any, excludeSocketId?: string) {
    if (!this.io || !tenantId) return;
    const room = this.io.to(this.malhaRoom(tenantId));
    (excludeSocketId ? room.except(excludeSocketId) : room).emit(event, payload);
  }

  public emitToPallet(tenantId: number, palletId: string | number, event: string, payload: any, excludeSocketId?: string) {
    if (!this.io || !tenantId) return;
    const room = this.io.to(this.palletRoom(tenantId, palletId));
    (excludeSocketId ? room.except(excludeSocketId) : room).emit(event, payload);
  }
}
