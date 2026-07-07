import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api', // A URL da API que testamos no Insomnia
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;