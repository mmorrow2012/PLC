import { create } from 'zustand';

export interface PlcState {
  isRunning: boolean;
  cycleTimeMs: number;
  tags: Record<string, boolean | number | string>;
  setRunning: (running: boolean) => void;
  setTag: (key: string, value: boolean | number | string) => void;
}

export const usePlcStore = create<PlcState>((set) => ({
  isRunning: false,
  cycleTimeMs: 50,
  tags: {
    bStart: false,
    bStop: false,
    bSystemActive: false,
  },
  setRunning: (isRunning) => set({ isRunning }),
  setTag: (key, value) =>
    set((state) => ({
      tags: { ...state.tags, [key]: value },
    })),
}));
