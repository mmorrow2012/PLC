import { create } from 'zustand';

export type PlcTagValue = boolean | number | string;

// Part being sorted on the conveyor
export interface Part {
  id: number;
  position: number; // 0-100 position along belt
  color: number; // 1=Red/Reject, 2=Green/Accept, 3=Blue/Special
  weight: number; // kg
  diverted: boolean;
  passed: boolean;
}

// PLC I/O Tags
export interface PlcInputs {
  E_Stop: boolean; // Emergency stop (NC logic - FALSE = emergency)
  Reset_PB: boolean; // Reset pushbutton
  Sensor_PartDetect: boolean; // Part presence at sorting station
  Sensor_Color: number; // Color sensor (1/2/3)
  Sensor_Weight: number; // Weight sensor (kg)
}

export interface PlcOutputs {
  VFD_Run: boolean; // Motor run command
  VFD_Speed_Ref: number; // Speed % (0-100)
  Actuator_Diverter: boolean; // Diverter solenoid
  Alarm_Tower: number; // Alarm bitmask (DWORD)
}

// Ladder rung state for visualization
export interface LadderRung {
  id: string;
  description: string;
  energized: boolean;
}

export interface PlcStoreState {
  // Core state
  plcRunning: boolean;
  scanCount: number;
  cycleTimeMs: number;
  
  // I/O Tags
  inputs: PlcInputs;
  outputs: PlcOutputs;
  
  // Internal state
  safetyLatched: boolean; // Safety fault latch
  parts: Part[]; // Parts on belt
  partCountTotal: number;
  partCountAccept: number;
  partCountReject: number;
  nextPartId: number;
  
  // HMI controls
  speedSetpoint: number; // VFD speed slider (0-100%)
  forceTable: Record<string, PlcTagValue>; // Force values
  
  // Ladder diagram visualization
  ladderRungs: LadderRung[];
  
  // Actions
  startPlc: () => void;
  stopPlc: () => void;
  resetSafety: () => void;
  setSpeedSetpoint: (speed: number) => void;
  spawnPart: (color: number) => void;
  updateScanCycle: () => void;
  setInput: (name: keyof PlcInputs, value: boolean | number) => void;
  setOutput: (name: keyof PlcOutputs, value: boolean | number) => void;
  setForce: (tagName: string, value: PlcTagValue | null) => void;
  updateLadderRung: (id: string, energized: boolean) => void;
}

const minSpacing = 15; // Minimum spacing between parts (%)

export const usePlcStore = create<PlcStoreState>((set, get) => ({
  // Initial state
  plcRunning: false,
  scanCount: 0,
  cycleTimeMs: 50,
  
  inputs: {
    E_Stop: true, // NC logic - TRUE = safe
    Reset_PB: false,
    Sensor_PartDetect: false,
    Sensor_Color: 0,
    Sensor_Weight: 0.0,
  },
  
  outputs: {
    VFD_Run: false,
    VFD_Speed_Ref: 0.0,
    Actuator_Diverter: false,
    Alarm_Tower: 0,
  },
  
  safetyLatched: false,
  parts: [],
  partCountTotal: 0,
  partCountAccept: 0,
  partCountReject: 0,
  nextPartId: 1,
  
  speedSetpoint: 50.0,
  forceTable: {},
  
  ladderRungs: [
    { id: 'rung1', description: 'Safety E-Stop Interlock', energized: false },
    { id: 'rung2', description: 'VFD Run Enable', energized: false },
    { id: 'rung3', description: 'Part Detection & Inspection', energized: false },
    { id: 'rung4', description: 'Reject Diverter Logic', energized: false },
    { id: 'rung5', description: 'Speed Reference Output', energized: false },
  ],
  
  // Actions
  startPlc: () => set({ plcRunning: true }),
  
  stopPlc: () => set({
    plcRunning: false,
    outputs: {
      VFD_Run: false,
      VFD_Speed_Ref: 0.0,
      Actuator_Diverter: false,
      Alarm_Tower: 0,
    },
  }),
  
  resetSafety: () => {
    const state = get();
    if (state.inputs.E_Stop) {
      set({ safetyLatched: false });
    }
  },
  
  setSpeedSetpoint: (speed) => set({ speedSetpoint: Math.max(0, Math.min(100, speed)) }),
  
  spawnPart: (color) => {
    const state = get();
    // Check spacing from last part
    const lastPart = state.parts[state.parts.length - 1];
    if (lastPart && lastPart.position < minSpacing) {
      return; // Too close, skip spawn
    }
    
    const newPart: Part = {
      id: state.nextPartId,
      position: 0,
      color,
      weight: 0.5 + Math.random() * 2.0, // 0.5-2.5 kg
      diverted: false,
      passed: false,
    };
    
    set({
      parts: [...state.parts, newPart],
      nextPartId: state.nextPartId + 1,
    });
  },
  
  updateScanCycle: () => set((state) => ({ scanCount: state.scanCount + 1 })),
  
  setInput: (name, value) =>
    set((state) => ({
      inputs: { ...state.inputs, [name]: value },
    })),
  
  setOutput: (name, value) =>
    set((state) => ({
      outputs: { ...state.outputs, [name]: value },
    })),
  
  setForce: (tagName, value) =>
    set((state) => {
      const newForceTable = { ...state.forceTable };
      if (value === null) {
        delete newForceTable[tagName];
      } else {
        newForceTable[tagName] = value;
      }
      return { forceTable: newForceTable };
    }),
  
  updateLadderRung: (id, energized) =>
    set((state) => ({
      ladderRungs: state.ladderRungs.map((rung) =>
        rung.id === id ? { ...rung, energized } : rung
      ),
    })),
}));
