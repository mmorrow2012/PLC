import { create } from 'zustand';

export interface TankData {
  id: number;
  level: number;
  targetLevel: number;
  maxCapacity: number;
  inflowRate: number;
  outflowRate: number;
}

export interface ValveState {
  id: string;
  isOpen: boolean;
  flowRate: number;
}

export interface PumpState {
  id: string;
  isRunning: boolean;
  speedPct: number;
}

export interface PlcState {
  isRunning: boolean;
  scanTimeMs: number;
  cycleCount: number;
  autoMode: boolean;
  
  tanks: Record<string, TankData>;
  valves: Record<string, ValveState>;
  pumps: Record<string, PumpState>;
  
  setRunning: (running: boolean) => void;
  setAutoMode: (auto: boolean) => void;
  updateTankLevel: (tankId: string, level: number) => void;
  toggleValve: (valveId: string) => void;
  togglePump: (pumpId: string) => void;
  tick: () => void;
}

export const usePlcStore = create<PlcState>((set) => ({
  isRunning: false,
  scanTimeMs: 10,
  cycleCount: 0,
  autoMode: true,

  tanks: {
    tank1: { id: 1, level: 45.0, targetLevel: 70.0, maxCapacity: 1000, inflowRate: 0, outflowRate: 0 },
    tank2: { id: 2, level: 30.0, targetLevel: 50.0, maxCapacity: 1000, inflowRate: 0, outflowRate: 0 },
    tank3: { id: 3, level: 15.0, targetLevel: 30.0, maxCapacity: 1000, inflowRate: 0, outflowRate: 0 },
  },

  valves: {
    V1: { id: 'V1', isOpen: false, flowRate: 20 },
    V2: { id: 'V2', isOpen: false, flowRate: 15 },
    V3: { id: 'V3', isOpen: false, flowRate: 15 },
  },

  pumps: {
    P1: { id: 'P1', isRunning: false, speedPct: 100 },
    P2: { id: 'P2', isRunning: false, speedPct: 100 },
  },

  setRunning: (running) => set({ isRunning: running }),
  setAutoMode: (auto) => set({ autoMode: auto }),
  updateTankLevel: (tankId, level) =>
    set((state) => ({
      tanks: {
        ...state.tanks,
        [tankId]: { ...state.tanks[tankId], level: Math.min(100, Math.max(0, level)) },
      },
    })),
  toggleValve: (valveId) =>
    set((state) => ({
      valves: {
        ...state.valves,
        [valveId]: { ...state.valves[valveId], isOpen: !state.valves[valveId].isOpen },
      },
    })),
  togglePump: (pumpId) =>
    set((state) => ({
      pumps: {
        ...state.pumps,
        [pumpId]: { ...state.pumps[pumpId], isRunning: !state.pumps[pumpId].isRunning },
      },
    })),
  tick: () => set((state) => ({ cycleCount: state.cycleCount + 1 })),
}));
