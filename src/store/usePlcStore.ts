import { create } from 'zustand';

export enum ProcessState {
  IDLE = 0,
  FILLING_A = 1,
  TRANSFERRING_AB = 2,
  DRAINING_BC = 3,
  ALARM_STATE = 4,
}

export interface PlcInputs {
  E_Stop: boolean;          // Hardware NC E-Stop switch (true = OK, false = Emergency)
  Start_PB: boolean;        // Operator Start pushbutton
  Stop_PB: boolean;         // Operator Stop pushbutton
  Alarm_Reset_PB: boolean;  // Manual Reset pushbutton
  LT_TankA: number;         // Level Transmitter Tank A (0.0 to 100.0%)
  LT_TankB: number;         // Level Transmitter Tank B (0.0 to 100.0%)
  LT_TankC: number;         // Level Transmitter Tank C (0.0 to 100.0%)
  LSH_TankA: boolean;       // Float Switch High Level Tank A (true = Overflow)
  LSH_TankB: boolean;       // Float Switch High Level Tank B (true = Overflow)
}

export interface PlcOutputs {
  Pump_Fill_A: boolean;       // Inlet Fill Pump Tank A
  Pump_Transfer_AB: boolean;  // Transfer Pump Tank A -> B
  Valve_Drain_BC_Pos: number; // Valve Position B -> C (0.0 to 100.0%)
  Alarm_Overflow: boolean;    // Latched Overflow Alarm
  Alarm_Tower: number;        // DWORD Bitmask: Bit 0 = Green, Bit 1 = Yellow, Bit 2 = Red
  State_Display: ProcessState;
}

export interface PlcSetpoints {
  SP_LevelA_High: number;   // Fill Cutoff Setpoint (%)
  SP_LevelB_High: number;   // High Limit Setpoint (%)
  SP_LevelB_Target: number; // Cascade Target Level (%)
  Kp_Drain: number;         // Proportional Gain for Drain Control
}

export interface HistoryPoint {
  timestamp: string;
  tankA: number;
  tankB: number;
  tankC: number;
  valvePos: number;
  state: ProcessState;
}

export interface PlcStoreState {
  inputs: PlcInputs;
  outputs: PlcOutputs;
  setpoints: PlcSetpoints;
  
  // Simulation & Debug Controls
  forcedInputs: Partial<Record<keyof PlcInputs, boolean | number>>;
  simulationSpeed: number; // 0 = Paused, 1 = 1x, 2 = 2x, 5 = 5x
  scanTimeMs: number;
  scanCounter: number;
  eStopLatched: boolean;
  history: HistoryPoint[];

  // User Action Handlers
  setInput: <K extends keyof PlcInputs>(key: K, value: PlcInputs[K]) => void;
  setSetpoint: <K extends keyof PlcSetpoints>(key: K, value: PlcSetpoints[K]) => void;
  toggleEStop: () => void;
  pressStart: () => void;
  releaseStart: () => void;
  pressStop: () => void;
  releaseStop: () => void;
  triggerReset: () => void;
  setForceInput: <K extends keyof PlcInputs>(key: K, value: PlcInputs[K] | undefined) => void;
  clearAllForces: () => void;
  setSimulationSpeed: (speed: number) => void;
  
  // Internal PLC Scan Updates
  updatePlcState: (
    newOutputs: PlcOutputs,
    newInputs: PlcInputs,
    eStopLatched: boolean,
    scanTime: number
  ) => void;
  resetSimulation: () => void;
}

const initialInputs: PlcInputs = {
  E_Stop: true, // NC contact: true is normal, false is emergency
  Start_PB: false,
  Stop_PB: false,
  Alarm_Reset_PB: false,
  LT_TankA: 0.0,
  LT_TankB: 0.0,
  LT_TankC: 0.0,
  LSH_TankA: false,
  LSH_TankB: false,
};

const initialOutputs: PlcOutputs = {
  Pump_Fill_A: false,
  Pump_Transfer_AB: false,
  Valve_Drain_BC_Pos: 0.0,
  Alarm_Overflow: false,
  Alarm_Tower: 0x02, // Yellow / Standby
  State_Display: ProcessState.IDLE,
};

const initialSetpoints: PlcSetpoints = {
  SP_LevelA_High: 80.0,
  SP_LevelB_High: 85.0,
  SP_LevelB_Target: 50.0,
  Kp_Drain: 2.5,
};

export const usePlcStore = create<PlcStoreState>((set) => ({
  inputs: initialInputs,
  outputs: initialOutputs,
  setpoints: initialSetpoints,
  forcedInputs: {},
  simulationSpeed: 1,
  scanTimeMs: 1.8,
  scanCounter: 0,
  eStopLatched: false,
  history: [],

  setInput: (key, value) =>
    set((state) => ({
      inputs: { ...state.inputs, [key]: value },
    })),

  setSetpoint: (key, value) =>
    set((state) => ({
      setpoints: { ...state.setpoints, [key]: value },
    })),

  toggleEStop: () =>
    set((state) => ({
      inputs: { ...state.inputs, E_Stop: !state.inputs.E_Stop },
    })),

  pressStart: () =>
    set((state) => ({
      inputs: { ...state.inputs, Start_PB: true },
    })),

  releaseStart: () =>
    set((state) => ({
      inputs: { ...state.inputs, Start_PB: false },
    })),

  pressStop: () =>
    set((state) => ({
      inputs: { ...state.inputs, Stop_PB: true },
    })),

  releaseStop: () =>
    set((state) => ({
      inputs: { ...state.inputs, Stop_PB: false },
    })),

  triggerReset: () => {
    set((state) => ({
      inputs: { ...state.inputs, Alarm_Reset_PB: true },
    }));
    setTimeout(() => {
      set((state) => ({
        inputs: { ...state.inputs, Alarm_Reset_PB: false },
      }));
    }, 150);
  },

  setForceInput: (key, value) =>
    set((state) => {
      const newForces = { ...state.forcedInputs };
      if (value === undefined) {
        delete newForces[key];
      } else {
        newForces[key] = value as any;
      }
      return { forcedInputs: newForces };
    }),

  clearAllForces: () => set({ forcedInputs: {} }),

  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

  updatePlcState: (newOutputs, newInputs, eStopLatched, scanTime) =>
    set((state) => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      const newPoint: HistoryPoint = {
        timestamp: timeStr,
        tankA: parseFloat(newInputs.LT_TankA.toFixed(1)),
        tankB: parseFloat(newInputs.LT_TankB.toFixed(1)),
        tankC: parseFloat(newInputs.LT_TankC.toFixed(1)),
        valvePos: parseFloat(newOutputs.Valve_Drain_BC_Pos.toFixed(1)),
        state: newOutputs.State_Display,
      };

      const updatedHistory = [...state.history.slice(-50), newPoint];

      return {
        outputs: newOutputs,
        inputs: newInputs,
        eStopLatched,
        scanTimeMs: scanTime,
        scanCounter: state.scanCounter + 1,
        history: updatedHistory,
      };
    }),

  resetSimulation: () =>
    set({
      inputs: initialInputs,
      outputs: initialOutputs,
      setpoints: initialSetpoints,
      forcedInputs: {},
      eStopLatched: false,
      history: [],
      scanCounter: 0,
    }),
}));
