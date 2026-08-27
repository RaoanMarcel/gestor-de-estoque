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
    // Se o back-end gritar "401 Não Autorizado" (Sessão Expirada ou Duplicada)
    if (error.response && error.response.status === 401) {
      // Evita loop infinito se o usuário já estiver na tela de login
      if (window.location.pathname !== '/login') {
        console.warn('⚠️ Sessão expirada ou acessada em outro local. Deslogando...');
        localStorage.clear(); // Apaga o token e os dados da memória
        window.location.href = '/login'; // Chuta para o login instantaneamente
      }
    }
    return Promise.reject(error);
  }
);

export default api;