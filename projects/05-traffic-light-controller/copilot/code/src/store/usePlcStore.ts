import { create } from 'zustand';

export type LightColor = 'red' | 'yellow' | 'green';

export interface TrafficLightState {
  northSouth: LightColor;
  eastWest: LightColor;
  pedestrianCall: boolean;
}

export interface PlcStoreState {
  isRunning: boolean;
  scanTimeMs: number;
  trafficLight: TrafficLightState;
  setRunning: (isRunning: boolean) => void;
  setScanTimeMs: (scanTimeMs: number) => void;
  setTrafficLight: (trafficLight: TrafficLightState) => void;
}

export const usePlcStore = create<PlcStoreState>((set) => ({
  isRunning: false,
  scanTimeMs: 100,
  trafficLight: {
    northSouth: 'green',
    eastWest: 'red',
    pedestrianCall: false,
  },
  setRunning: (isRunning) => set({ isRunning }),
  setScanTimeMs: (scanTimeMs) => set({ scanTimeMs }),
  setTrafficLight: (trafficLight) => set({ trafficLight }),
}));
