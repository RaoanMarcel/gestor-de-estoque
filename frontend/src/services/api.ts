import axios from 'axios';
import toast from 'react-hot-toast';

// Define a versão do frontend via variável da Vercel (Padrão 1.0.0)
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
    'x-app-version': APP_VERSION,
  },
});

// Filas para segurar requisições enquanto o token atualiza
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// 1. Interceptor de REQUISIÇÃO (Injeta Tokens)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wms_token');
  const socketId = localStorage.getItem('wms_socket_id');
  
  if (config.headers) {
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (socketId) config.headers['x-socket-id'] = socketId;
  }
  return config;
});

// 2. Interceptor de RESPOSTA (Gerencia Versão e Refresh)
api.interceptors.response.use(
  (response) => {
    // Se a versão mudou de forma segura (Minor/Patch), avisa sutilmente (apenas 1x por sessão)
    const serverVersion = response.headers['x-backend-version'];
    if (serverVersion && serverVersion !== APP_VERSION) {
      if (!sessionStorage.getItem('update_notified')) {
        toast('Nova atualização disponível no sistema! Recarregue a página quando possível.', { icon: '🔄', duration: 6000 });
        sessionStorage.setItem('update_notified', 'true');
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // FLUXO DE VERSION LOCK (Hard Update Forçado pelo Backend)
    if (error.response?.status === 426) {
      if (!sessionStorage.getItem('hard_update_triggered')) {
        sessionStorage.setItem('hard_update_triggered', 'true');
        toast.error('O Sistema foi atualizado e exige recarregamento. Aguarde...', { duration: 3000 });
        setTimeout(() => window.location.reload(), 3000); 
      }
      return Promise.reject(error);
    }

    // FLUXO DE REFRESH TOKEN (Quando o token de 8h expira)
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login' && originalRequest.url !== '/auth/refresh') {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      isRefreshing = true;
      const refreshToken = localStorage.getItem('wms_refresh_token');

      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
        
        localStorage.setItem('wms_token', data.token);
        api.defaults.headers.common['Authorization'] = 'Bearer ' + data.token;
        originalRequest.headers['Authorization'] = 'Bearer ' + data.token;
        
        processQueue(null, data.token);
        return api(originalRequest); // Refaz a requisição original que havia falhado

      } catch (err) {
        // Se o Refresh Token (7 dias) também expirou ou foi invalidado
        processQueue(err, null);
        localStorage.clear();
        toast.error('Sua sessão de segurança expirou. Faça login novamente.');
        setTimeout(() => window.location.href = '/login', 1500);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;