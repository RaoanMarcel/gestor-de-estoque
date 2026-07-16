import axios from 'axios';
import { io } from 'socket.io-client';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wms_token');
  
  if (config.headers) {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    const socketId = localStorage.getItem('wms_socket_id');
    if (socketId) {
      config.headers['x-socket-id'] = socketId;
    }
  }
  
  return config;
});

export default api;