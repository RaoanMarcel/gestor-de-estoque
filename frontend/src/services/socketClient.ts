import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  auth: { 
    token: localStorage.getItem('wms_token') 
  }
});