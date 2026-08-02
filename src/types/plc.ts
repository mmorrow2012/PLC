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
  I_EStop_NC: boolean;       // %I0.0 - Hardware E-Stop switch (Normally Closed, 24VDC)
  I_StartBatch_PB: boolean;  // %I0.1 - Operator Start Batch Pushbutton
  I_StopBatch_PB: boolean;   // %I0.2 - Operator Stop/Pause Pushbutton
  I_ResetFault_PB: boolean;  // %I0.3 - Fault Acknowledgment & Reset Pushbutton
  I_LSH_TankA: boolean;      // %I0.4 - High Level Float Guard Tank A
  I_LSH_TankB: boolean;      // %I0.5 - High Level Float Guard Tank B
  I_LSH_Reactor: boolean;    // %I0.6 - High Level Float Guard Reactor
  I_AgitatorHealth: boolean; // %I0.7 - Mixer Motor Overload Protection Relay (NC)
}

export interface AnalogInputs {
  AI_LT_TankA: number;     // %IW100 - Raw Tank A Level (0.0 to 1000.0 Litres)
  AI_LT_TankB: number;     // %IW102 - Raw Tank B Level (0.0 to 1000.0 Litres)
  AI_LT_Reactor: number;   // %IW104 - Chemical Reactor Level (0.0 to 2000.0 Litres)
  AI_TT_Reactor: number;   // %IW106 - Heating Jacket Temp (0.0 to 150.0 °C)
  AI_pHT_Reactor: number;  // %IW108 - Reactor pH Probe (0.0 to 14.0 pH)
}

export interface DigitalOutputs {
  Q_PumpA_Run: boolean;          // %Q0.0 - Feed Pump A Contactor
  Q_PumpB_Run: boolean;          // %Q0.1 - Feed Pump B Contactor
  Q_Agitator_Run: boolean;       // %Q0.2 - Reactor High-Shear Agitator
  Q_HeaterJacket_On: boolean;    // %Q0.3 - Heating Jacket Contactor
  Q_PumpAcid_Dose: boolean;      // %Q0.4 - Acid Dosing Pump
  Q_PumpBase_Dose: boolean;      // %Q0.5 - Alkali Base Dosing Pump
  Q_Valve_ProductDrain: boolean; // %Q0.6 - Bottom Discharge Drain Valve
  Q_AlarmBeacon: boolean;        // %Q0.7 - Audible & Visual Alarm Beacon
}

export interface AnalogOutputs {
  AQ_V1_RatioA: number; // %QW100 - Proportional Control Valve A Position (0-100%)
  AQ_V2_RatioB: number; // %QW102 - Proportional Control Valve B Position (0-100%)
}

export interface MemoryWords {
  M_BatchState: BatchState; // %MW0
  M_RecipeRatioA: number;   // %MW2 (Target Recipe Vol Chemical A, default 600 L)
  M_RecipeRatioB: number;   // %MW4 (Target Recipe Vol Chemical B, default 400 L)
  M_TargetTemp: number;     // %MW6 (Target Temperature, default 65.0 °C)
  M_TargetpH: number;       // %MW8 (Target Neutral pH, default 7.0)
}

export interface PhysicalState {
  tankALevel: number;          // Litres
  tankBLevel: number;          // Litres
  reactorLevel: number;        // Litres
  reactorTemp: number;         // °C
  reactorpH: number;           // pH
  productTankLevel: number;    // Litres
  dosingAStartReactorLevel: number;
  dosingBStartReactorLevel: number;
}

export interface ManualOverrides {
  enabled: boolean;
  Q_PumpA_Run?: boolean;
  Q_PumpB_Run?: boolean;
  Q_Agitator_Run?: boolean;
  Q_HeaterJacket_On?: boolean;
  Q_PumpAcid_Dose?: boolean;
  Q_PumpBase_Dose?: boolean;
  Q_Valve_ProductDrain?: boolean;
  AQ_V1_RatioA?: number;
  AQ_V2_RatioB?: number;
}

export interface AlarmItem {
  id: string;
  code: string;
  message: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp: string;
  acknowledged: boolean;
}

export interface PlcState {
  inputs: DigitalInputs;
  analogs: AnalogInputs;
  outputs: DigitalOutputs;
  analogOutputs: AnalogOutputs;
  memory: MemoryWords;
  physical: PhysicalState;
  overrides: ManualOverrides;
  alarms: AlarmItem[];
  isRunning: boolean;
  scanTimeMs: number;
  scanCount: number;
  lastFaultReason: string | null;
}
