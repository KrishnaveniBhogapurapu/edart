import { create } from 'zustand';

interface UIState {
  selectedRowIndex: number | null;
  streamState: 'idle' | 'connected' | 'error';
  streamError: string | null;
  setSelectedRowIndex: (index: number | null) => void;
  setStreamState: (state: 'idle' | 'connected' | 'error') => void;
  setStreamError: (error: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedRowIndex: null,
  streamState: 'idle',
  streamError: null,
  setSelectedRowIndex: (index) => set({ selectedRowIndex: index }),
  setStreamState: (state) => set({ streamState: state }),
  setStreamError: (error) => set({ streamError: error }),
}));
