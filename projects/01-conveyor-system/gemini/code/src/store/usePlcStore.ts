import { create } from 'zustand';

export interface ConveyorPart {
  id: string;
  x: number; // 0% to 100% position along main conveyor
  color: number; // 1 = Red (Reject), 2 = Green (Accept), 3 = Blue (Special)
  weight: number; // kg
  diverted: boolean;
  divertProgress: number; // 0.0 to 1.0 (movement into reject lane)
  passed: boolean; // Flagged when item finishes sorting evaluation
}

export interface PlcInputs {
  E_Stop: boolean; // Normally Closed: TRUE = Safe/Normal, FALSE = E-STOP Active
  Reset_PB: boolean; // Manual reset pulse
  Sensor_PartDetect: boolean; // Photoelectric sensor at divert decision point
  Sensor_Color: number; // 1: Red, 2: Green, 3: Blue
  Sensor_Weight: number; // Weight reading (kg)
  Target_Speed: number; // Target VFD setpoint (0 - 100%)
}

export interface PlcOutputs {
  VFD_Run: boolean;
  VFD_Speed_Ref: number; // Dynamic output speed (0 - 100%)
  Actuator_Diverter: boolean;
  Alarm_Tower: number; // Bitmask: Bit 0 = Green, Bit 1 = Yellow, Bit 2 = Red
}

export interface ForcedTag {
  isForced: boolean;
  forcedValue: any;
}

export interface PlcStore {
  // Real-time Memory Image
  inputs: PlcInputs;
  outputs: PlcOutputs;
  systemFault: boolean;

  // PLC Diagnostics
  partCountTotal: number;
  partCountAccept: number;
  partCountReject: number;
  scanTimeMs: number;
  cycleCount: number;
  isScanRunning: boolean;

  // Physical Simulation State
  parts: ConveyorPart[];

  // Force Overrides Table
  forces: Record<string, ForcedTag>;

  // Actions & Mutators
  setInput: <K extends keyof PlcInputs>(key: K, value: PlcInputs[K]) => void;
  setOutput: <K extends keyof PlcOutputs>(key: K, value: PlcOutputs[K]) => void;
  setForce: (tagName: string, isForced: boolean, value?: any) => void;
  triggerReset: () => void;
  toggleEStop: () => void;
  spawnPart: (color?: number, weight?: number) => void;
  clearStats: () => void;
  toggleScanEngine: () => void;
}

export const usePlcStore = create<PlcStore>((set, get) => ({
  inputs: {
    E_Stop: true, // NC Logic (True = Safe)
    Reset_PB: false,
    Sensor_PartDetect: false,
    Sensor_Color: 0,
    Sensor_Weight: 0.0,
    Target_Speed: 65.0,
  },
  outputs: {
    VFD_Run: false,
    VFD_Speed_Ref: 0.0,
    Actuator_Diverter: false,
    Alarm_Tower: 0x04, // Initialized to Red Alarm until start/reset
  },
  systemFault: true, // System starts in latched fault state requiring reset

  partCountTotal: 0,
  partCountAccept: 0,
  partCountReject: 0,
  scanTimeMs: 0.05,
  cycleCount: 0,
  isScanRunning: true,

  parts: [],
  forces: {},

  setInput: (key, value) =>
    set((state) => ({
      inputs: { ...state.inputs, [key]: value },
    })),

  setOutput: (key, value) =>
    set((state) => ({
      outputs: { ...state.outputs, [key]: value },
    })),

  setForce: (tagName, isForced, value) =>
    set((state) => {
      const existing = state.forces[tagName] || { isForced: false, forcedValue: false };
      return {
        forces: {
          ...state.forces,
          [tagName]: {
            isForced,
            forcedValue: value !== undefined ? value : existing.forcedValue,
          },
        },
      };
    }),

  triggerReset: () => {
    set((state) => ({
      inputs: { ...state.inputs, Reset_PB: true },
    }));
    // Auto reset pulse after 150ms
    setTimeout(() => {
      set((state) => ({
        inputs: { ...state.inputs, Reset_PB: false },
      }));
    }, 150);
  },

  toggleEStop: () =>
    set((state) => ({
      inputs: { ...state.inputs, E_Stop: !state.inputs.E_Stop },
    })),

  spawnPart: (customColor, customWeight) => {
    const colorOptions = [1, 2, 2, 2, 3]; // Higher chance for Green (Accept)
    const selectedColor = customColor ?? colorOptions[Math.floor(Math.random() * colorOptions.length)];
    let selectedWeight = customWeight ?? Number((Math.random() * 4.5 + 0.3).toFixed(2));
    
    // Force out-of-spec weight occasionally if color is Green
    if (selectedColor === 1) {
      selectedWeight = Number((Math.random() * 2.0 + 0.5).toFixed(2)); // Red usually standard weight
    }

    const state = get();
    // Enforce minimum infeed belt spacing so parts don't overlap physically
    const minSpacing = 15;
    const lastPart = state.parts[state.parts.length - 1];
    let startX = 0;
    if (lastPart && lastPart.x < minSpacing) {
      startX = Math.min(0, lastPart.x - minSpacing);
    }

    const newPart: ConveyorPart = {
      id: `part-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      x: startX,
      color: selectedColor,
      weight: selectedWeight,
      diverted: false,
      divertProgress: 0.0,
      passed: false,
    };

    set({ parts: [...state.parts, newPart] });
  },

  clearStats: () =>
    set({
      partCountTotal: 0,
      partCountAccept: 0,
      partCountReject: 0,
      cycleCount: 0,
      parts: [],
    }),

  toggleScanEngine: () =>
    set((state) => ({ isScanRunning: !state.isScanRunning })),
}));
