import { create } from 'zustand';
import type { CustomIcPayload, SavedCustomIc } from '../../shared/types';
import { useAuthStore } from './useAuthStore';

interface CustomIcState {
  cloudIcs: SavedCustomIc[];
  sessionIcs: CustomIcPayload[];
  loading: boolean;
  error: string | null;

  fetchCloudIcs: () => Promise<void>;
  saveCloudIc: (icPayload: CustomIcPayload) => Promise<SavedCustomIc>;
  deleteCloudIc: (id: number) => Promise<void>;
  addSessionIc: (icPayload: CustomIcPayload) => void;
  clearCloudIcs: () => void;
}

export const useCustomIcStore = create<CustomIcState>((set, get) => ({
  cloudIcs: [],
  sessionIcs: [],
  loading: false,
  error: null,

  fetchCloudIcs: async () => {
    const token = useAuthStore.getState().token;
    if (!token) {
      set({ cloudIcs: [], loading: false, error: null });
      return;
    }
    set({ loading: true, error: null });
    try {
      const data = await useAuthStore.getState().apiFetch<{ customIcs: SavedCustomIc[] }>(
        '/api/custom-ics'
      );
      set({ cloudIcs: data.customIcs ?? [], loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : '加载云端集成芯片失败',
      });
    }
  },

  saveCloudIc: async (icPayload) => {
    set({ loading: true, error: null });
    try {
      const data = await useAuthStore.getState().apiFetch<{ customIc: SavedCustomIc }>(
        '/api/custom-ics',
        {
          method: 'POST',
          body: JSON.stringify({ icPayload }),
        }
      );
      set((s) => ({
        cloudIcs: [data.customIc, ...s.cloudIcs],
        loading: false,
      }));
      return data.customIc;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存云端集成芯片失败';
      set({ loading: false, error: msg });
      throw new Error(msg);
    }
  },

  deleteCloudIc: async (id) => {
    const prev = get().cloudIcs;
    set({ cloudIcs: prev.filter((item) => item.id !== id) });
    try {
      await useAuthStore.getState().apiFetch(`/api/custom-ics/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      set({
        cloudIcs: prev,
        error: err instanceof Error ? err.message : '删除云端芯片失败',
      });
    }
  },

  addSessionIc: (icPayload) => {
    set((s) => {
      const filtered = s.sessionIcs.filter((c) => c.name !== icPayload.name);
      return { sessionIcs: [icPayload, ...filtered].slice(0, 12) };
    });
  },

  clearCloudIcs: () => set({ cloudIcs: [], error: null }),
}));
