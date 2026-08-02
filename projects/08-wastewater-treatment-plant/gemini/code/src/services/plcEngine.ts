import { PLCSystemState, DigitalInputs, AnalogInputs, DigitalOutputs, AnalogOutputs, MemoryWords } from '../types/plc';

export function createInitialPLCState(): PLCSystemState {
  return {
    inputs: {
      I_EStop_NC: true,
      I_PlantStart_PB: false,
      I_PlantStop_PB: false,
      I_ResetFault_PB: false,
      I_LSH_Equalization: false,
      I_LSH_AerationA: false,
      I_LSH_AerationB: false,
      I_WeirOpenLS: false,
    },
    analogInputs: {
      AI_LT_EqBasin: 2.1,
      AI_LT_AerationA: 4.2,
      AI_LT_AerationB: 4.1,
      AI_DO_AerationA: 2.2,
      AI_Turbidity_Effluent: 8.5,
    },
    outputs: {
      Q_Pump_RawInfluent1: false,
      Q_Pump_RawInfluent2: false,
      Q_Blower_AerationA: false,
      Q_Blower_AerationB: false,
      Q_Pump_RAS: false,
      Q_Pump_Coagulant: false,
      Q_Motor_WeirOpen: false,
      Q_Motor_WeirClose: false,
    },
    analogOutputs: {
      AQ_VFD_InfluentSpeed: 0.0,
      AQ_AirValve_Aeration: 0.0,
    },
    memory: {
      M_PlantState: 0,
      M_TargetDO: 2.5,
      M_MaxTurbidity: 15.0,
      M_LeadPumpToggle: 1,
    },
    alarms: {
      eStopTripped: false,
      equalizationHighHigh: false,
      highTurbidityTrip: false,
      aerationHighLevel: false,
      activeAlarmsCount: 0,
    },
    fbState: {
      FB_LeadLagPump: {
        leadActive: false,
        lagActive: false,
        vfdOutput: 0,
        leadPumpId: 1,
      },
      FB_AerationDO: {
        blowerActive: false,
        airValvePosition: 0,
        doError: 0,
      },
      FB_WeirGateControl: {
        opening: false,
        closing: false,
        fullyOpen: false,
        allowDischarge: false,
      },
      FB_SafetyInterlock: {
        healthy: true,
        tripped: false,
        tripReason: '',
      },
    },
    simulation: {
      simulatedInfluentInflowRate: 35.0, // m3/h inflow simulation
      simulatedDOConsumptionRate: 0.05,
      simulatedTurbiditySpike: false,
      weirGatePositionPct: 0.0,
    },
    scanTimeMs: 12,
    scanCount: 0,
    isRunning: false,
  };
}

export function executePLCScan(state: PLCSystemState): PLCSystemState {
  const newState: PLCSystemState = JSON.parse(JSON.stringify(state));
  newState.scanCount += 1;

  const { inputs, analogInputs, memory, simulation } = newState;

  // --- 1. Simulation Physical Process Dynamic Model ---
  if (newState.isRunning && !newState.alarms.eStopTripped) {
    // Equalization Basin Level Dynamics
    let inflowDelta = (simulation.simulatedInfluentInflowRate / 3600) * 0.1;
    let outflowDelta = 0;
    if (newState.outputs.Q_Pump_RawInfluent1) outflowDelta += (newState.analogOutputs.AQ_VFD_InfluentSpeed / 100) * 0.025;
    if (newState.outputs.Q_Pump_RawInfluent2) outflowDelta += (newState.analogOutputs.AQ_VFD_InfluentSpeed / 100) * 0.025;
    
    analogInputs.AI_LT_EqBasin = Math.max(0, Math.min(10.0, analogInputs.AI_LT_EqBasin + inflowDelta - outflowDelta));
    inputs.I_LSH_Equalization = analogInputs.AI_LT_EqBasin >= 9.2;

    // DO Dynamics in Aeration Basin A
    let doOxygenation = 0;
    if (newState.outputs.Q_Blower_AerationA) {
      doOxygenation = (newState.analogOutputs.AQ_AirValve_Aeration / 100) * 0.12;
    }
    let doConsumption = simulation.simulatedDOConsumptionRate;
    analogInputs.AI_DO_AerationA = Math.max(0, Math.min(10.0, analogInputs.AI_DO_AerationA + doOxygenation - doConsumption));

    // Turbidity simulation
    if (simulation.simulatedTurbiditySpike) {
      analogInputs.AI_Turbidity_Effluent = Math.min(100, analogInputs.AI_Turbidity_Effluent + 1.5);
    } else {
      let coagulantCleaning = newState.outputs.Q_Pump_Coagulant ? 0.3 : 0.05;
      analogInputs.AI_Turbidity_Effluent = Math.max(4.0, analogInputs.AI_Turbidity_Effluent - coagulantCleaning);
    }

    // Weir Gate mechanical motion dynamics
    if (newState.outputs.Q_Motor_WeirOpen) {
      simulation.weirGatePositionPct = Math.min(100, simulation.weirGatePositionPct + 5);
    } else if (newState.outputs.Q_Motor_WeirClose) {
      simulation.weirGatePositionPct = Math.max(0, simulation.weirGatePositionPct - 5);
    }
    inputs.I_WeirOpenLS = simulation.weirGatePositionPct >= 98;
  }

  // --- 2. FB_SafetyInterlock Evaluation ---
  const estopFault = !inputs.I_EStop_NC;
  const eqHighFault = inputs.I_LSH_Equalization;
  const highTurbidityFault = analogInputs.AI_Turbidity_Effluent > 25.0;

  const isTripped = estopFault || eqHighFault || highTurbidityFault;
  let tripReason = '';
  if (estopFault) tripReason = 'Emergency Stop Activated (%I0.0)';
  else if (eqHighFault) tripReason = 'Equalization Basin Overflow High-High Guard (%I0.4)';
  else if (highTurbidityFault) tripReason = 'Critical Effluent Turbidity Exceeded > 25.0 NTU';

  newState.alarms.eStopTripped = estopFault;
  newState.alarms.equalizationHighHigh = eqHighFault;
  newState.alarms.highTurbidityTrip = highTurbidityFault;
  newState.alarms.activeAlarmsCount = (estopFault ? 1 : 0) + (eqHighFault ? 1 : 0) + (highTurbidityFault ? 1 : 0);

  newState.fbState.FB_SafetyInterlock = {
    healthy: !isTripped,
    tripped: isTripped,
    tripReason,
  };

  // If safety tripped or Stop PB pressed -> shutdown process
  if (isTripped) {
    memory.M_PlantState = 99; // ALARM state
  } else if (inputs.I_PlantStop_PB) {
    memory.M_PlantState = 0; // OFF
    newState.isRunning = false;
  } else if (inputs.I_PlantStart_PB && memory.M_PlantState === 0) {
    memory.M_PlantState = 1; // EQUALIZING / START
    newState.isRunning = true;
  }

  // Reset Fault Ack
  if (inputs.I_ResetFault_PB && !isTripped) {
    if (memory.M_PlantState === 99) {
      memory.M_PlantState = 0;
    }
  }

  // If system in Alarm or OFF, ensure safe output state
  if (memory.M_PlantState === 0 || memory.M_PlantState === 99) {
    newState.outputs.Q_Pump_RawInfluent1 = false;
    newState.outputs.Q_Pump_RawInfluent2 = false;
    newState.outputs.Q_Blower_AerationA = false;
    newState.outputs.Q_Blower_AerationB = false;
    newState.outputs.Q_Pump_RAS = false;
    newState.outputs.Q_Pump_Coagulant = false;
    newState.outputs.Q_Motor_WeirOpen = false;
    newState.outputs.Q_Motor_WeirClose = simulation.weirGatePositionPct > 0;
    newState.analogOutputs.AQ_VFD_InfluentSpeed = 0.0;
    newState.analogOutputs.AQ_AirValve_Aeration = 0.0;
    return newState;
  }

  // --- 3. FB_LeadLagPump (Equalization Basin Pump Control) ---
  const level = analogInputs.AI_LT_EqBasin;
  const isPump1Lead = memory.M_LeadPumpToggle === 1;
  let leadPump = false;
  let lagPump = false;
  let vfdSpeed = 0;

  if (level >= 3.0 && level < 6.0) {
    leadPump = true;
    lagPump = false;
    vfdSpeed = Math.min(100, Math.max(40, ((level - 3.0) / 3.0) * 100));
  } else if (level >= 6.0) {
    leadPump = true;
    lagPump = true;
    vfdSpeed = 100.0;
  }

  if (isPump1Lead) {
    newState.outputs.Q_Pump_RawInfluent1 = leadPump;
    newState.outputs.Q_Pump_RawInfluent2 = lagPump;
  } else {
    newState.outputs.Q_Pump_RawInfluent1 = lagPump;
    newState.outputs.Q_Pump_RawInfluent2 = leadPump;
  }
  newState.analogOutputs.AQ_VFD_InfluentSpeed = vfdSpeed;

  newState.fbState.FB_LeadLagPump = {
    leadActive: leadPump,
    lagActive: lagPump,
    vfdOutput: vfdSpeed,
    leadPumpId: memory.M_LeadPumpToggle,
  };

  // State transitions
  if (level >= 3.0 && memory.M_PlantState === 1) {
    memory.M_PlantState = 2; // AERATION_ACTIVE
  }

  // --- 4. FB_AerationDO (Dissolved Oxygen PID & Blower Control) ---
  const doActual = analogInputs.AI_DO_AerationA;
  const doTarget = memory.M_TargetDO;
  const doError = doTarget - doActual;
  let airValvePos = 0;
  let blowerOn = false;

  if (memory.M_PlantState >= 2) {
    blowerOn = true;
    newState.outputs.Q_Blower_AerationA = true;
    newState.outputs.Q_Blower_AerationB = true;
    newState.outputs.Q_Pump_RAS = true;
    newState.outputs.Q_Pump_Coagulant = true;

    if (doError > 0) {
      airValvePos = Math.min(100, 30 + doError * 35);
    } else {
      airValvePos = Math.max(15, 30 + doError * 15);
    }
  } else {
    newState.outputs.Q_Blower_AerationA = false;
    newState.outputs.Q_Blower_AerationB = false;
    newState.outputs.Q_Pump_RAS = false;
    newState.outputs.Q_Pump_Coagulant = false;
  }
  newState.analogOutputs.AQ_AirValve_Aeration = airValvePos;

  newState.fbState.FB_AerationDO = {
    blowerActive: blowerOn,
    airValvePosition: airValvePos,
    doError,
  };

  // Advance state to Clarifying/Discharge
  if (memory.M_PlantState === 2 && analogInputs.AI_DO_AerationA >= 2.0) {
    memory.M_PlantState = 3; // CLARIFYING
  }

  // --- 5. FB_WeirGateControl (Motorized Effluent Weir Sluice Gate) ---
  const turbidity = analogInputs.AI_Turbidity_Effluent;
  const maxAllowedTurbidity = memory.M_MaxTurbidity;
  const allowDischarge = (memory.M_PlantState >= 3) && (turbidity <= maxAllowedTurbidity);

  if (allowDischarge) {
    memory.M_PlantState = 4; // EFFLUENT_DISCHARGE
    if (!inputs.I_WeirOpenLS) {
      newState.outputs.Q_Motor_WeirOpen = true;
      newState.outputs.Q_Motor_WeirClose = false;
    } else {
      newState.outputs.Q_Motor_WeirOpen = false;
      newState.outputs.Q_Motor_WeirClose = false;
    }
  } else {
    newState.outputs.Q_Motor_WeirOpen = false;
    if (simulation.weirGatePositionPct > 0) {
      newState.outputs.Q_Motor_WeirClose = true;
    } else {
      newState.outputs.Q_Motor_WeirClose = false;
    }
  }

  newState.fbState.FB_WeirGateControl = {
    opening: newState.outputs.Q_Motor_WeirOpen,
    closing: newState.outputs.Q_Motor_WeirClose,
    fullyOpen: inputs.I_WeirOpenLS,
    allowDischarge,
  };

  return newState;
}