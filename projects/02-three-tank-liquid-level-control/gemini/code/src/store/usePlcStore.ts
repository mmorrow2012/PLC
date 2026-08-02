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
  tick: () =>
    set((state) => {
      const tanks = { ...state.tanks };
      const valves = { ...state.valves };
      const pumps = { ...state.pumps };

      // 1. Automatic Control Mode (IEC 61131-3 ST Logic execution)
      if (state.autoMode) {
        // Tank 1 Inlet Pump P1 logic with hysteresis (70% SP)
        if (tanks.tank1.level < 68.0) {
          pumps.P1 = { ...pumps.P1, isRunning: true };
        } else if (tanks.tank1.level > 72.0) {
          pumps.P1 = { ...pumps.P1, isRunning: false };
        }

        // Valve V1: Transfer Tank 1 -> Tank 2
        valves.V1 = {
          ...valves.V1,
          isOpen: tanks.tank1.level > 15.0 && tanks.tank2.level < tanks.tank2.targetLevel,
        };

        // Valve V2: Transfer Tank 2 -> Tank 3
        valves.V2 = {
          ...valves.V2,
          isOpen: tanks.tank2.level > 15.0 && tanks.tank3.level < tanks.tank3.targetLevel,
        };

        // Valve V3: Tank 3 Process Drain Valve
        valves.V3 = {
          ...valves.V3,
          isOpen: tanks.tank3.level > 25.0,
        };
      }

      // 2. Physical Hydraulic Simulation Tick
      let t1Level = tanks.tank1.level;
      let t2Level = tanks.tank2.level;
      let t3Level = tanks.tank3.level;

      // Pump P1 fills Tank 1
      if (pumps.P1?.isRunning) {
        t1Level += 0.6;
      }

      // Valve V1 drains Tank 1 into Tank 2
      if (valves.V1?.isOpen && t1Level > 0) {
        const transfer = Math.min(0.4, t1Level);
        t1Level -= transfer;
        t2Level += transfer;
      }

      // Valve V2 drains Tank 2 into Tank 3
      if (valves.V2?.isOpen && t2Level > 0) {
        const transfer = Math.min(0.4, t2Level);
        t2Level -= transfer;
        t3Level += transfer;
      }

      // Valve V3 drains Tank 3 out of system
      if (valves.V3?.isOpen && t3Level > 0) {
        t3Level -= Math.min(0.35, t3Level);
      }

      tanks.tank1 = { ...tanks.tank1, level: Math.min(100, Math.max(0, Number(t1Level.toFixed(2)))) };
      tanks.tank2 = { ...tanks.tank2, level: Math.min(100, Math.max(0, Number(t2Level.toFixed(2)))) };
      tanks.tank3 = { ...tanks.tank3, level: Math.min(100, Math.max(0, Number(t3Level.toFixed(2)))) };

      return {
        cycleCount: state.cycleCount + 1,
        tanks,
        valves,
        pumps,
      };
    }),
}));
