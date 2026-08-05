import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToast } from './toastContext';

interface SocketContextData {
  socket: Socket | null;
  isConnected: boolean;
}

interface SocketProviderProps {
  children: ReactNode;
}

const SocketContext = createContext<SocketContextData>({ 
  socket: null, 
  isConnected: false 
});

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const toast = useToast();

  useEffect(() => {
    const token = localStorage.getItem('wms_token');
    
    if (!token) return;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const socketUrl = apiUrl.replace(/\/api\/?$/, ''); 

    const socketInstance = io(socketUrl, {
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

    socketInstance.on('connect_error', (err: Error) => {
      console.error('Erro de WebSocket:', err.message);
      
      if (err.message.includes('Token') || err.message.includes('Acesso negado')) {
        toast.error('Sessão de tempo real expirada. A conexão foi perdida.');
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Iniciar o socket uma vez apenas em seu ciclo

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextData => useContext(SocketContext);
