import { create } from 'zustand';

export type BasinStatus = 'idle' | 'running' | 'maintenance';

export interface BasinState {
  id: string;
  label: string;
  levelPercent: number;
  status: BasinStatus;
}

export interface PlcStoreState {
  isRunning: boolean;
  scanTimeMs: number;
  basins: BasinState[];
  setRunning: (isRunning: boolean) => void;
  setScanTimeMs: (scanTimeMs: number) => void;
  updateBasinLevel: (basinId: string, levelPercent: number) => void;
}

const initialBasins: BasinState[] = [
  { id: 'influent', label: 'Influent Equalization', levelPercent: 52, status: 'idle' },
  { id: 'aeration-a', label: 'Aeration Basin A', levelPercent: 64, status: 'running' },
  { id: 'clarifier', label: 'Secondary Clarifier', levelPercent: 41, status: 'idle' }
];

export const usePlcStore = create<PlcStoreState>((set) => ({
  isRunning: false,
  scanTimeMs: 100,
  basins: initialBasins,
  setRunning: (isRunning) => set({ isRunning }),
  setScanTimeMs: (scanTimeMs) => set({ scanTimeMs }),
  updateBasinLevel: (basinId, levelPercent) =>
    set((state) => ({
      basins: state.basins.map((basin) =>
        basin.id === basinId ? { ...basin, levelPercent } : basin,
      ),
    })),
}));
