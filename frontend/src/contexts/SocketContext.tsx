import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToast } from './toastContext';

interface SocketContextData {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextData>({ socket: null, isConnected: false });

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const token = localStorage.getItem('wms_token');
    if (!token) return;

    const socketInstance = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Erro de WebSocket:', err.message);
      if (err.message.includes('Token')) {
        toast.error('Sessão expirada. Faça login novamente.');
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);