import { create } from 'zustand';

export interface PlcInputs {
  startPB: boolean;
  stopPB: boolean;
  estop: boolean;
  itemSensor: boolean;
}

export interface PlcOutputs {
  motorRun: boolean;
  alarmLight: boolean;
  runningLight: boolean;
}

export interface PlcState {
  // Mode & Execution
  isRunning: boolean;
  scanTimeMs: number;
  
  // I/O
  inputs: PlcInputs;
  outputs: PlcOutputs;

  // Code
  stCode: string;

  // Actions
  setRunning: (running: boolean) => void;
  updateInputs: (inputs: Partial<PlcInputs>) => void;
  updateOutputs: (outputs: Partial<PlcOutputs>) => void;
  setStCode: (code: string) => void;
  setScanTimeMs: (ms: number) => void;
}

export const usePlcStore = create<PlcState>((set) => ({
  isRunning: true,
  scanTimeMs: 100,
  
  inputs: {
    startPB: false,
    stopPB: true, // NC contact by default
    estop: true,  // NC contact by default
    itemSensor: false,
  },

  outputs: {
    motorRun: false,
    alarmLight: false,
    runningLight: false,
  },

  stCode: `// Conveyor Control Logic (Structured Text)
PROGRAM ConveyorControl
VAR_INPUT
    bStartPB : BOOL;
    bStopPB : BOOL;
    bEStop : BOOL;
    bItemSensor : BOOL;
END_VAR
VAR_OUTPUT
    bMotorRun : BOOL;
    bAlarmLight : BOOL;
    bRunningLight : BOOL;
END_VAR

// Logic Implementation
IF NOT bEStop THEN
    bMotorRun := FALSE;
    bAlarmLight := TRUE;
    bRunningLight := FALSE;
ELSIF bStartPB AND bStopPB THEN
    bMotorRun := TRUE;
    bAlarmLight := FALSE;
    bRunningLight := TRUE;
ELSIF NOT bStopPB THEN
    bMotorRun := FALSE;
    bRunningLight := FALSE;
END_IF;
END_PROGRAM`,

  setRunning: (running) => set({ isRunning: running }),
  updateInputs: (newInputs) =>
    set((state) => ({ inputs: { ...state.inputs, ...newInputs } })),
  updateOutputs: (newOutputs) =>
    set((state) => ({ outputs: { ...state.outputs, ...newOutputs } })),
  setStCode: (stCode) => set({ stCode }),
  setScanTimeMs: (scanTimeMs) => set({ scanTimeMs }),
}));
