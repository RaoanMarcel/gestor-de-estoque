import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptador de REQUISIÇÃO (Coloca o Token na ida)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('wms_token');
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 🚀 NOVIDADE: Interceptador de RESPOSTA (Leão de Chácara na volta)
api.interceptors.response.use(
  (response) => {
    // Se deu tudo certo, só deixa a resposta passar normalmente
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;

    if (window.location.pathname !== '/login') {
      // 401: sessão expirada ou aberta em outra máquina.
      if (status === 401) {
        console.warn('⚠️ Sessão expirada ou acessada em outro local. Deslogando...');
        localStorage.clear();
        window.location.href = '/login';
      }
      // 403 + TENANT_SUSPENSO: o acesso da empresa foi suspenso no meio da sessão.
      else if (status === 403 && code === 'TENANT_SUSPENSO') {
        console.warn('⚠️ Acesso da empresa suspenso. Deslogando...');
        localStorage.clear();
        alert('O acesso da sua empresa foi suspenso. Fale com o suporte.');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;