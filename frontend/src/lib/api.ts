import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from './constants';

const ACCESS_KEY = 'candle_access_token';
const REFRESH_KEY = 'candle_refresh_token';

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status !== 401 ||
      original?._retry ||
      !original ||
      original.url?.includes('/auth/login') ||
      original.url?.includes('/auth/register') ||
      original.url?.includes('/auth/refresh')
    ) {
      throw error;
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      throw error;
    }

    if (!refreshPromise) {
      refreshPromise = axios
        .post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        })
        .then((res) => {
          const nextAccess = res.data.accessToken as string;
          const nextRefresh = res.data.refreshToken as string;
          setTokens(nextAccess, nextRefresh);
          return nextAccess;
        })
        .catch(() => {
          clearTokens();
          return null;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const nextAccessToken = await refreshPromise;
    if (!nextAccessToken) {
      throw error;
    }

    original._retry = true;
    original.headers.Authorization = `Bearer ${nextAccessToken}`;

    return api.request(original);
  },
);
