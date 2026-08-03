import { create } from 'zustand';

export type GatePosition = 'closed' | 'opening' | 'open' | 'closing';

export interface PlcStoreState {
  isRunning: boolean;
  scanTimeMs: number;
  gatePosition: GatePosition;
  occupancy: number;
  capacity: number;
  setRunning: (isRunning: boolean) => void;
  setScanTimeMs: (scanTimeMs: number) => void;
  setGatePosition: (gatePosition: GatePosition) => void;
  setOccupancy: (occupancy: number) => void;
}

export const usePlcStore = create<PlcStoreState>((set) => ({
  isRunning: false,
  scanTimeMs: 100,
  gatePosition: 'closed',
  occupancy: 0,
  capacity: 50,
  setRunning: (isRunning) => set({ isRunning }),
  setScanTimeMs: (scanTimeMs) => set({ scanTimeMs }),
  setGatePosition: (gatePosition) => set({ gatePosition }),
  setOccupancy: (occupancy) => set({ occupancy }),
}));
