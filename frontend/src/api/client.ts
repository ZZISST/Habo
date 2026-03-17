import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { ApiError } from "@/types";

// API base URL - в production нужно изменить на реальный URL бэкенда
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Создаем axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor для добавления токена авторизации
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("access_token");

    // Добавляем токен если он есть и это не демо-токен
    if (token && !token.startsWith("demo_token_") && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const url = error.config?.url || "";
    const isAuthEndpoint = url.includes("/auth/");
    const token = localStorage.getItem("access_token");
    const isDemoMode = token?.startsWith("demo_token_");

    // Для демо режима не перенаправляем на логин при 401
    if (error.response?.status === 401 && !isAuthEndpoint && !isDemoMode) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
