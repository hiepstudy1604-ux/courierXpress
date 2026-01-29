
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'multipart/form-data',
  }
});

// Interceptor for Auth
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cx_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const agentService = {
  create: async (formData: FormData) => {
    return api.post('/admin/agents', formData);
  },
  
  checkAvailability: async (agentCode: string) => {
    return api.get(`/admin/agents/check/${agentCode}`);
  }
};
