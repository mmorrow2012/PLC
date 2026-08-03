import { create } from 'zustand';

export type PlcState = {
  cycleTimeMs: number;
  isRunning: boolean;
  toggleRunning: () => void;
};

export const usePlcStore = create<PlcState>((set) => ({
  cycleTimeMs: 100,
  isRunning: false,
  toggleRunning: () => {
    set((state) => ({ isRunning: !state.isRunning }));
  }
}));
