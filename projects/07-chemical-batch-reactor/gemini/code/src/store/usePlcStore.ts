import { create } from 'zustand';

export type ReactorPhase = 'IDLE' | 'CHARGING_A' | 'CHARGING_B' | 'HEATING' | 'REACTION' | 'COOLING' | 'DRAINING' | 'CLEANING' | 'ESTOP' | 'FAULT';

export interface PlcInputs {
  startPb: boolean;
  stopPb: boolean;
  estop: boolean;
  drainManual: boolean;
  temperature: number; // °C
  level: number;       // Liters
  pressure: number;    // bar
}

export interface PlcOutputs {
  valveA: boolean;
  valveB: boolean;
  drainValve: boolean;
  agitator: boolean;
  heater: boolean;
  coolingValve: boolean;
  heaterPower: number;   // 0 - 100%
  agitatorSpeed: number; // 0 - 100%
}

export interface PlcState {
  // Engine Control
  plcRunning: boolean;
  scanTimeMs: number;
  cycleCount: number;
  
  // Sequence Status
  phase: ReactorPhase;
  phaseTimer: number; // seconds in current phase
  setpointTemp: number; // target °C
  targetVolumeA: number; // Liters
  targetVolumeB: number; // Liters
  
  // Reactor Dynamics / Simulation Values
  volumeA: number;
  volumeB: number;
  concentration: number; // reaction progress 0-100%
  
  // Hardware Signals
  inputs: PlcInputs;
  outputs: PlcOutputs;

  // Actions
  togglePlc: () => void;
  setEstop: (active: boolean) => void;
  pressStart: () => void;
  pressStop: () => void;
  updateInput: <K extends keyof PlcInputs>(key: K, value: PlcInputs[K]) => void;
  updateOutput: <K extends keyof PlcOutputs>(key: K, value: PlcOutputs[K]) => void;
  tickScan: (dtMs: number) => void;
  resetSimulation: () => void;
}

export const usePlcStore = create<PlcState>((set, get) => ({
  plcRunning: true,
  scanTimeMs: 50,
  cycleCount: 0,
  
  phase: 'IDLE',
  phaseTimer: 0,
  setpointTemp: 85.0,
  targetVolumeA: 400,
  targetVolumeB: 300,

  volumeA: 0,
  volumeB: 0,
  concentration: 0,

  inputs: {
    startPb: false,
    stopPb: false,
    estop: false, // NC in hardware, false = safe
    drainManual: false,
    temperature: 22.5,
    level: 0,
    pressure: 1.01,
  },

  outputs: {
    valveA: false,
    valveB: false,
    drainValve: false,
    agitator: false,
    heater: false,
    coolingValve: false,
    heaterPower: 0,
    agitatorSpeed: 0,
  },

  togglePlc: () => set((s) => ({ plcRunning: !s.plcRunning })),
  
  setEstop: (active) => set((s) => ({
    inputs: { ...s.inputs, estop: active },
    phase: active ? 'ESTOP' : (s.phase === 'ESTOP' ? 'IDLE' : s.phase),
  })),

  pressStart: () => set((s) => ({
    inputs: { ...s.inputs, startPb: true }
  })),

  pressStop: () => set((s) => ({
    inputs: { ...s.inputs, stopPb: true }
  })),

  updateInput: (key, value) => set((s) => ({
    inputs: { ...s.inputs, [key]: value }
  })),

  updateOutput: (key, value) => set((s) => ({
    outputs: { ...s.outputs, [key]: value }
  })),

  resetSimulation: () => set({
    phase: 'IDLE',
    phaseTimer: 0,
    volumeA: 0,
    volumeB: 0,
    concentration: 0,
    cycleCount: 0,
    inputs: {
      startPb: false,
      stopPb: false,
      estop: false,
      drainManual: false,
      temperature: 22.5,
      level: 0,
      pressure: 1.01,
    },
    outputs: {
      valveA: false,
      valveB: false,
      drainValve: false,
      agitator: false,
      heater: false,
      coolingValve: false,
      heaterPower: 0,
      agitatorSpeed: 0,
    }
  }),

  tickScan: (_dtMs) => {
    const state = get();
    if (!state.plcRunning) return;
    
    // Cycle increment placeholder
    set((s) => ({ cycleCount: s.cycleCount + 1 }));
  }
}));
