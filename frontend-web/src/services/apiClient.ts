import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      const user = useAuthStore.getState().user;
      useAuthStore.getState().logout();

      // Phân định cổng để điều hướng đúng người dùng (tránh nhầm lẫn Cổng Cán bộ và Doanh nghiệp)
      const isOwner = user?.role === 'OWNER' || window.location.pathname.startsWith('/doanh-nghiep');
      const targetLogin = isOwner ? '/doanh-nghiep/login' : '/admin-portal/login';

      if (window.location.pathname !== targetLogin && window.location.pathname !== '/login') {
        window.location.href = targetLogin;
      }
    }
    return Promise.reject(error);
  }
);
