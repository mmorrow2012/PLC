import { create } from 'zustand';

export interface TankLevels {
  tank1: number;
  tank2: number;
  tank3: number;
}

export interface PlcStoreState {
  isRunning: boolean;
  scanTimeMs: number;
  levels: TankLevels;
  setRunning: (isRunning: boolean) => void;
  setScanTimeMs: (scanTimeMs: number) => void;
  setLevels: (levels: TankLevels) => void;
}

export const usePlcStore = create<PlcStoreState>((set) => ({
  isRunning: false,
  scanTimeMs: 100,
  levels: { tank1: 0, tank2: 0, tank3: 0 },
  setRunning: (isRunning) => set({ isRunning }),
  setScanTimeMs: (scanTimeMs) => set({ scanTimeMs }),
  setLevels: (levels) => set({ levels }),
}));
