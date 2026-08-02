export type PlantOperatingState = 0 | 1 | 2 | 3 | 4 | 99;
// 0=OFF, 1=EQUALIZING, 2=AERATION_ACTIVE, 3=CLARIFYING, 4=EFFLUENT_DISCHARGE, 99=ALARM

export interface DigitalInputs {
  I_EStop_NC: boolean;          // %I0.0 - Hardware E-Stop (NC, True=OK)
  I_PlantStart_PB: boolean;     // %I0.1 - Master Start Pushbutton
  I_PlantStop_PB: boolean;      // %I0.2 - Master Stop Pushbutton
  I_ResetFault_PB: boolean;     // %I0.3 - Alarm Reset / Ack
  I_LSH_Equalization: boolean;  // %I0.4 - High-High Level Float (Equalization)
  I_LSH_AerationA: boolean;     // %I0.5 - High Level Float Aeration A
  I_LSH_AerationB: boolean;     // %I0.6 - High Level Float Aeration B
  I_WeirOpenLS: boolean;        // %I0.7 - Weir Gate Open Limit Switch
}

export interface AnalogInputs {
  AI_LT_EqBasin: number;         // %IW100 - Equalization Level (0-10m)
  AI_LT_AerationA: number;       // %IW102 - Aeration Basin A Level (0-6m)
  AI_LT_AerationB: number;       // %IW104 - Aeration Basin B Level (0-6m)
  AI_DO_AerationA: number;       // %IW106 - Dissolved Oxygen (0-10 mg/L)
  AI_Turbidity_Effluent: number; // %IW108 - Effluent Turbidity (0-100 NTU)
}

export interface DigitalOutputs {
  Q_Pump_RawInfluent1: boolean;  // %Q0.0 - Influent Pump 1 Contactor
  Q_Pump_RawInfluent2: boolean;  // %Q0.1 - Influent Pump 2 Contactor
  Q_Blower_AerationA: boolean;   // %Q0.2 - Aeration Basin A Blower Motor
  Q_Blower_AerationB: boolean;   // %Q0.3 - Aeration Basin B Blower Motor
  Q_Pump_RAS: boolean;           // %Q0.4 - Return Activated Sludge Pump
  Q_Pump_Coagulant: boolean;     // %Q0.5 - Coagulant Dosing Pump
  Q_Motor_WeirOpen: boolean;     // %Q0.6 - Weir Gate Open Contactor
  Q_Motor_WeirClose: boolean;    // %Q0.7 - Weir Gate Close Contactor
}

export interface AnalogOutputs {
  AQ_VFD_InfluentSpeed: number;  // %QW100 - VFD Speed Reference (0-100%)
  AQ_AirValve_Aeration: number;  // %QW102 - Air Flow Valve Position (0-100%)
}

export interface MemoryWords {
  M_PlantState: PlantOperatingState; // %MW0
  M_TargetDO: number;               // %MW2 (mg/L, default 2.5)
  M_MaxTurbidity: number;           // %MW4 (NTU, default 15.0)
  M_LeadPumpToggle: number;         // %MW6 (1=Pump 1 Lead, 2=Pump 2 Lead)
}

export interface AlarmStatus {
  eStopTripped: boolean;
  equalizationHighHigh: boolean;
  highTurbidityTrip: boolean;
  aerationHighLevel: boolean;
  activeAlarmsCount: number;
}

export interface FunctionBlockState {
  FB_LeadLagPump: {
    leadActive: boolean;
    lagActive: boolean;
    vfdOutput: number;
    leadPumpId: number;
  };
  FB_AerationDO: {
    blowerActive: boolean;
    airValvePosition: number;
    doError: number;
  };
  FB_WeirGateControl: {
    opening: boolean;
    closing: boolean;
    fullyOpen: boolean;
    allowDischarge: boolean;
  };
  FB_SafetyInterlock: {
    healthy: boolean;
    tripped: boolean;
    tripReason: string;
  };
}

export interface SimulationOverrides {
  simulatedInfluentInflowRate: number; // m3/h dynamic simulation
  simulatedDOConsumptionRate: number;
  simulatedTurbiditySpike: boolean;
  weirGatePositionPct: number;          // 0-100% physical gate position
}

export interface PLCSystemState {
  inputs: DigitalInputs;
  analogInputs: AnalogInputs;
  outputs: DigitalOutputs;
  analogOutputs: AnalogOutputs;
  memory: MemoryWords;
  alarms: AlarmStatus;
  fbState: FunctionBlockState;
  simulation: SimulationOverrides;
  scanTimeMs: number;
  scanCount: number;
  isRunning: boolean;
}