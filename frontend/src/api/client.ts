import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 10000,
});

// Request interceptor: tambahkan token JWT ke header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('staff');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;

// Uploaded photos use the API host when the frontend connects to another origin.
export const photoUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  const apiBase = new URL(import.meta.env.VITE_API_URL || '/api/v1', window.location.origin);
  return new URL(path, apiBase.origin).href;
};

export const apiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
};
