import { SocketService } from '../services/SocketService.js';

export interface NotificacaoDados {
  texto: string;
  titulo?: string;
  tipo?: 'INFO' | 'RECEBIMENTO' | 'RMA' | 'FULL' | 'SISTEMA';
  link?: string | null;
}

/**
 * Empurra uma notificação em tempo real para todos os usuários de um tenant.
 * O front (sino global) escuta o evento `notificacao` do socket.
 */
export function notificarTenant(tenantId: number | null | undefined, dados: NotificacaoDados) {
  if (!tenantId) return;
  SocketService.getInstance().notificar(tenantId, {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    criadoEm: new Date().toISOString(),
    tipo: dados.tipo || 'INFO',
    titulo: dados.titulo || 'Notificação',
    texto: dados.texto,
    link: dados.link ?? null,
  });
}
