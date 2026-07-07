import axios from 'axios';

// Utiliza a variável de ambiente do Vite se existir; caso contrário, usa o localhost como fallback
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;