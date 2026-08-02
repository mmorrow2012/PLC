import { create } from 'zustand';

export type GateState = 'IDLE' | 'OPENING' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'FAULT';

export interface PlcInputs {
  E_Stop: boolean;                 // NC Logic (true = normal/safe, false = emergency)
  Sensor_VehiclePresence: boolean; // Vehicle present at gate
  Sensor_GateOpenLimit: boolean;   // Gate limit switch OPEN
  Sensor_GateClosedLimit: boolean; // Gate limit switch CLOSED
  Sensor_Obstruction: boolean;     // Safety obstruction sensor
  PB_ManualOpen: boolean;          // Operator PB Open
  PB_ManualClose: boolean;         // Operator PB Close
  PB_Reset: boolean;               // Fault Reset
}

export interface PlcOutputs {
  Motor_GateUp: boolean;
  Motor_GateDown: boolean;
  Light_Green: boolean;
  Light_Red: boolean;
  Alarm_StuckGate: boolean;
  Buzzer: boolean;
}

export interface SimulationState {
  gateAngle: number;         // 0 degrees (closed) to 90 degrees (fully open)
  vehiclePos: number;        // -100 (far approach), 0 (at sensor), 100 (passed)
  isVehicleInLane: boolean;  // whether a simulated vehicle is active
  autoDriveVehicle: boolean; // automatically drive vehicle through when green
  gateState: GateState;
  watchdogTimeMs: number;    // Elapsed watchdog time
  autoCloseTimeMs: number;   // Elapsed auto-close delay time
  scanRateMs: number;        // Soft PLC loop cycle time (default 50ms)
  scanCount: number;         // Loop iteration counter
  lastScanDurationMs: number;// Measured execution duration
  plcRunning: boolean;
  forcedInputs: Partial<Record<keyof PlcInputs, boolean>>;
}

interface PlcStore extends SimulationState {
  inputs: PlcInputs;
  outputs: PlcOutputs;

  // Actions
  setInput: (key: keyof PlcInputs, val: boolean) => void;
  toggleInput: (key: keyof PlcInputs) => void;
  setForcedInput: (key: keyof PlcInputs, val: boolean | undefined) => void;
  setOutput: (outputs: Partial<PlcOutputs>) => void;
  setGateState: (state: GateState) => void;
  setGateAngle: (angle: number | ((prev: number) => number)) => void;
  setVehiclePos: (pos: number | ((prev: number) => number)) => void;
  setVehicleInLane: (inLane: boolean) => void;
  setAutoDriveVehicle: (autoDrive: boolean) => void;
  setTimerValues: (watchdogMs: number, autoCloseMs: number) => void;
  setPlcRunning: (running: boolean) => void;
  setScanRateMs: (rate: number) => void;
  recordScan: (durationMs: number) => void;
  resetSimulation: () => void;
}

const INITIAL_INPUTS: PlcInputs = {
  E_Stop: true, // NC Logic: true = ok, false = ESTOP active
  Sensor_VehiclePresence: false,
  Sensor_GateOpenLimit: false,
  Sensor_GateClosedLimit: true, // Initially closed
  Sensor_Obstruction: false,
  PB_ManualOpen: false,
  PB_ManualClose: false,
  PB_Reset: false,
};

const INITIAL_OUTPUTS: PlcOutputs = {
  Motor_GateUp: false,
  Motor_GateDown: false,
  Light_Green: false,
  Light_Red: true,
  Alarm_StuckGate: false,
  Buzzer: false,
};

export const usePlcStore = create<PlcStore>((set) => ({
  inputs: { ...INITIAL_INPUTS },
  outputs: { ...INITIAL_OUTPUTS },
  forcedInputs: {},
  gateAngle: 0,
  vehiclePos: -100,
  isVehicleInLane: false,
  autoDriveVehicle: false,
  gateState: 'CLOSED',
  watchdogTimeMs: 0,
  autoCloseTimeMs: 0,
  scanRateMs: 50,
  scanCount: 0,
  lastScanDurationMs: 1.2,
  plcRunning: true,

  setInput: (key, val) =>
    set((state) => ({
      inputs: { ...state.inputs, [key]: val },
    })),

  toggleInput: (key) =>
    set((state) => ({
      inputs: { ...state.inputs, [key]: !state.inputs[key] },
    })),

  setForcedInput: (key, val) =>
    set((state) => {
      const nextForced = { ...state.forcedInputs };
      if (val === undefined) {
        delete nextForced[key];
      } else {
        nextForced[key] = val;
      }
      return { forcedInputs: nextForced };
    }),

  setOutput: (newOutputs) =>
    set((state) => ({
      outputs: { ...state.outputs, ...newOutputs },
    })),

  setGateState: (gateState) => set({ gateState }),

  setGateAngle: (angleOrFn) =>
    set((state) => ({
      gateAngle: typeof angleOrFn === 'function' ? angleOrFn(state.gateAngle) : angleOrFn,
    })),

  setVehiclePos: (posOrFn) =>
    set((state) => ({
      vehiclePos: typeof posOrFn === 'function' ? posOrFn(state.vehiclePos) : posOrFn,
    })),

  setVehicleInLane: (isVehicleInLane) => set({ isVehicleInLane }),

  setAutoDriveVehicle: (autoDriveVehicle) => set({ autoDriveVehicle }),

  setTimerValues: (watchdogTimeMs, autoCloseTimeMs) =>
    set({ watchdogTimeMs, autoCloseTimeMs }),

  setPlcRunning: (plcRunning) => set({ plcRunning }),

  setScanRateMs: (scanRateMs) => set({ scanRateMs }),

  recordScan: (durationMs) =>
    set((state) => ({
      scanCount: state.scanCount + 1,
      lastScanDurationMs: durationMs,
    })),

  resetSimulation: () =>
    set({
      inputs: { ...INITIAL_INPUTS },
      outputs: { ...INITIAL_OUTPUTS },
      forcedInputs: {},
      gateAngle: 0,
      vehiclePos: -100,
      isVehicleInLane: false,
      gateState: 'CLOSED',
      watchdogTimeMs: 0,
      autoCloseTimeMs: 0,
      scanCount: 0,
    }),
}));
