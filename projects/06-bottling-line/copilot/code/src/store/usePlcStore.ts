import { create } from 'zustand';

export type BottlingLineMode = 'stopped' | 'idle' | 'running';

export interface BottlingLineState {
  conveyorRunning: boolean;
  bottleAtFiller: boolean;
  fillerOpen: boolean;
  capperReady: boolean;
}

export interface PlcStoreState {
  isRunning: boolean;
  scanTimeMs: number;
  mode: BottlingLineMode;
  line: BottlingLineState;
  setRunning: (isRunning: boolean) => void;
  setScanTimeMs: (scanTimeMs: number) => void;
  setMode: (mode: BottlingLineMode) => void;
  setLine: (line: BottlingLineState) => void;
}

export const usePlcStore = create<PlcStoreState>((set) => ({
  isRunning: false,
  scanTimeMs: 100,
  mode: 'stopped',
  line: {
    conveyorRunning: false,
    bottleAtFiller: false,
    fillerOpen: false,
    capperReady: true,
  },
  setRunning: (isRunning) => set({ isRunning }),
  setScanTimeMs: (scanTimeMs) => set({ scanTimeMs }),
  setMode: (mode) => set({ mode }),
  setLine: (line) => set({ line }),
}));
