import { create } from 'zustand';
import { api, clearTokens, getAccessToken, getRefreshToken, setTokens } from '../../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: getAccessToken(),
  refreshToken: getRefreshToken(),
  isLoading: false,
  isAuthenticated: Boolean(getAccessToken()),

  async init() {
    const token = getAccessToken();
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    try {
      set({ isLoading: true });
      const response = await api.get('/auth/me');
      set({
        user: response.data,
        isAuthenticated: true,
        accessToken: getAccessToken(),
        refreshToken: getRefreshToken(),
      });
    } catch {
      clearTokens();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  async login(email, password) {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', { email, password });
      setTokens(response.data.accessToken, response.data.refreshToken);
      set({
        user: response.data.user,
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        isAuthenticated: true,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  async register(name, email, password) {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/register', { name, email, password });
      setTokens(response.data.accessToken, response.data.refreshToken);
      set({
        user: response.data.user,
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        isAuthenticated: true,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  async logout() {
    const refreshToken = getRefreshToken();

    try {
      await api.post('/auth/logout', { refreshToken });
    } finally {
      clearTokens();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
    }
  },
}));
