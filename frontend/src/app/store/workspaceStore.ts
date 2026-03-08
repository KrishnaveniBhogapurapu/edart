import { AppWorkspaceConfig, ComputedCandle } from '@candle/engine';
import { create } from 'zustand';
import { api } from '../../lib/api';

const defaultConfig: AppWorkspaceConfig = {
  mode: 'MOCK',
  interval: '3m',
  session: {
    marketStartTime: '09:15',
    timezone: 'Asia/Kolkata',
  },
  variables: [],
  activeVariableCollectionId: null,
  api: {},
};

interface WorkspaceState {
  config: AppWorkspaceConfig;
  status: { realTime?: string; systemTime?: string };
  rows: ComputedCandle[];
  errors: string[];
  fetchWorkspace: () => Promise<void>;
  saveWorkspace: (
    next: Partial<Pick<AppWorkspaceConfig, 'mode' | 'interval' | 'session' | 'api'>>,
  ) => Promise<void>;
  setRows: (rows: ComputedCandle[]) => void;
  appendRows: (rows: ComputedCandle[]) => void;
  setStatus: (status: { realTime?: string; systemTime?: string }) => void;
  setErrors: (errors: string[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  config: defaultConfig,
  status: {},
  rows: [],
  errors: [],

  async fetchWorkspace() {
    const response = await api.get('/config/workspace');
    set({
      config: {
        ...defaultConfig,
        ...response.data,
      },
    });
  },

  async saveWorkspace(next) {
    const payload = {
      ...(next.mode ? { mode: next.mode } : {}),
      ...(next.interval ? { interval: next.interval } : {}),
      ...(next.session
        ? {
            session: {
              ...get().config.session,
              ...next.session,
            },
          }
        : {}),
      ...(next.api
        ? {
            api: {
              ...(get().config.api ?? {}),
              ...next.api,
            },
          }
        : {}),
    };

    const response = await api.put('/config/workspace', payload);
    set({
      config: {
        ...defaultConfig,
        ...response.data,
      },
    });
  },

  setRows(rows) {
    set({ rows });
  },

  appendRows(rows) {
    if (!rows.length) {
      return;
    }
    set({ rows: [...get().rows, ...rows] });
  },

  setStatus(status) {
    set({ status });
  },

  setErrors(errors) {
    set({ errors });
  },
}));
