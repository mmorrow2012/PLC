export enum BatchState {
  IDLE = 0,
  DOSING_A = 1,
  DOSING_B = 2,
  HEATING_MIXING = 3,
  PH_BALANCING = 4,
  DRAINING = 5,
  FAULT = 99
}

export interface DigitalInputs {
  I_EStop_NC: boolean;       // %I0.0 Master Hardware E-Stop (Normally Closed)
  I_StartBatch_PB: boolean;  // %I0.1 Start Pushbutton
  I_StopBatch_PB: boolean;   // %I0.2 Stop/Pause Pushbutton
  I_ResetFault_PB: boolean;  // %I0.3 Fault Reset Pushbutton
  I_LSH_TankA: boolean;      // %I0.4 High Level Float Guard Tank A
  I_LSH_TankB: boolean;      // %I0.5 High Level Float Guard Tank B
  I_LSH_Reactor: boolean;    // %I0.6 High Level Float Guard Reactor
  I_AgitatorHealth: boolean; // %I0.7 Mixer Overload Relay (Normally Closed)
}

export interface AnalogInputs {
  AI_LT_TankA: number;    // %IW100 Litres (0 - 1000)
  AI_LT_TankB: number;    // %IW102 Litres (0 - 1000)
  AI_LT_Reactor: number;  // %IW104 Litres (0 - 2000)
  AI_TT_Reactor: number;  // %IW106 Celsius (0 - 150)
  AI_pHT_Reactor: number; // %IW108 pH (0 - 14)
}

export interface DigitalOutputs {
  Q_PumpA_Run: boolean;          // %Q0.0 Chemical Feed Pump A
  Q_PumpB_Run: boolean;          // %Q0.1 Chemical Feed Pump B
  Q_Agitator_Run: boolean;       // %Q0.2 High-Shear Agitator Mixer
  Q_HeaterJacket_On: boolean;    // %Q0.3 Heating Jacket Contactor
  Q_PumpAcid_Dose: boolean;      // %Q0.4 Acid Dosing Micro-Pump
  Q_PumpBase_Dose: boolean;      // %Q0.5 Alkali Base Dosing Micro-Pump
  Q_Valve_ProductDrain: boolean; // %Q0.6 Bottom Discharge Valve
  Q_AlarmBeacon: boolean;        // %Q0.7 Master Alarm Beacon
}

export interface AnalogOutputs {
  AQ_V1_RatioA: number; // %QW100 Proportional Valve A Position (0-100%)
  AQ_V2_RatioB: number; // %QW102 Proportional Valve B Position (0-100%)
}

export interface MemoryWords {
  M_BatchState: BatchState; // %MW0
  M_RecipeRatioA: number;   // %MW2 Target Ratio Chemical A (L)
  M_RecipeRatioB: number;   // %MW4 Target Ratio Chemical B (L)
  M_TargetTemp: number;     // %MW6 Target Temperature (°C)
  M_TargetpH: number;       // %MW8 Target pH
}

export interface TelemetryPoint {
  timestamp: string;
  reactorLevel: number;
  reactorTemp: number;
  reactorpH: number;
  tankALevel: number;
  tankBLevel: number;
  productLevel: number;
  state: BatchState;
}

export interface PLCContextType {
  inputs: DigitalInputs;
  analogInputs: AnalogInputs;
  outputs: DigitalOutputs;
  analogOutputs: AnalogOutputs;
  memory: MemoryWords;
  productTankLevel: number;
  faultReason: string | null;
  scanTimeMs: number;
  simSpeed: number;
  isPaused: boolean;
  manualMode: boolean;
  telemetry: TelemetryPoint[];
  batchProgress: number;
  batchDosingStartA: number;
  batchDosingStartB: number;
  mixTimerSec: number;
  phTimerSec: number;
  
  // Controls
  setSimSpeed: (speed: number) => void;
  togglePause: () => void;
  toggleManualMode: () => void;
  pressStart: () => void;
  pressStop: () => void;
  pressReset: () => void;
  toggleEStop: () => void;
  toggleAgitatorHealth: () => void;
  updateRecipe: (key: keyof MemoryWords, value: number) => void;
  refillRawTanks: () => void;
  emptyProductTank: () => void;
  setManualOutput: (key: keyof DigitalOutputs, value: boolean) => void;
  setManualAnalogOutput: (key: keyof AnalogOutputs, value: number) => void;
  simulateOverheat: () => void;
  simulatepHDisturbance: (direction: 'acid' | 'base') => void;
}
