import { create } from 'zustand';
import type { UserProfile } from '../../shared/types';

const TOKEN_STORAGE_KEY = 'electrolab_jwt_token';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  loading: boolean;
  initAuth: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: {
    username: string;
    password: string;
    displayName: string;
    university: string;
    major: string;
    bio?: string;
  }) => Promise<void>;
  logout: () => void;
  apiFetch: <T>(url: string, options?: RequestInit) => Promise<T>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null,
  user: null,
  loading: false,

  apiFetch: async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const token = get().token;
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const resp = await fetch(url, { ...options, headers });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      if (resp.status === 401 && token) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        set({ token: null, user: null });
      }
      throw new Error(data.error || `请求失败 (${resp.status})`);
    }
    return data as T;
  },

  initAuth: async () => {
    const token = get().token;
    if (!token) return;
    set({ loading: true });
    try {
      const data = await get().apiFetch<{ user: UserProfile }>('/api/auth/me');
      set({ user: data.user, loading: false });
    } catch {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      set({ token: null, user: null, loading: false });
    }
  },

  login: async (username, password) => {
    const data = await get().apiFetch<{ token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    set({ token: data.token, user: data.user });
  },

  register: async (payload) => {
    const data = await get().apiFetch<{ token: string; user: UserProfile }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    set({ token: data.token, user: data.user });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    set({ token: null, user: null });
  },
}));
