import { create } from 'zustand';

export interface GreenhouseState {
  temperature: number;
  humidity: number;
  co2Ppm: number;
  lightLux: number;
}

export interface PlcStoreState {
  isRunning: boolean;
  scanTimeMs: number;
  greenhouse: GreenhouseState;
  setRunning: (isRunning: boolean) => void;
  setScanTimeMs: (scanTimeMs: number) => void;
  setGreenhouse: (greenhouse: GreenhouseState) => void;
}

export const usePlcStore = create<PlcStoreState>((set) => ({
  isRunning: false,
  scanTimeMs: 100,
  greenhouse: { temperature: 20, humidity: 60, co2Ppm: 400, lightLux: 5000 },
  setRunning: (isRunning) => set({ isRunning }),
  setScanTimeMs: (scanTimeMs) => set({ scanTimeMs }),
  setGreenhouse: (greenhouse) => set({ greenhouse }),
}));
