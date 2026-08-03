import { create } from 'zustand';

export interface TrafficSignalState {
  red: boolean;
  amber: boolean;
  green: boolean;
}

export interface IntersectionState {
  northSouth: TrafficSignalState;
  eastWest: TrafficSignalState;
  pedestrianCallActive: boolean;
  walkSignal: boolean;
}

export interface PlcStoreState {
  isRunning: boolean;
  scanTimeMs: number;
  intersection: IntersectionState;
  setRunning: (isRunning: boolean) => void;
  setScanTimeMs: (scanTimeMs: number) => void;
  setIntersection: (intersection: IntersectionState) => void;
}

export const initialIntersectionState: IntersectionState = {
  northSouth: { red: false, amber: false, green: true },
  eastWest: { red: true, amber: false, green: false },
  pedestrianCallActive: false,
  walkSignal: false,
};

export const usePlcStore = create<PlcStoreState>((set) => ({
  isRunning: false,
  scanTimeMs: 100,
  intersection: initialIntersectionState,
  setRunning: (isRunning) => set({ isRunning }),
  setScanTimeMs: (scanTimeMs) => set({ scanTimeMs }),
  setIntersection: (intersection) => set({ intersection }),
}));
