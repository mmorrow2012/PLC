import { PlcState, BatchState, AlarmItem } from '../types/plc';

export function createInitialPlcState(): PlcState {
  return {
    inputs: {
      I_EStop_NC: true,       // 24V healthy
      I_StartBatch_PB: false,
      I_StopBatch_PB: false,
      I_ResetFault_PB: false,
      I_LSH_TankA: false,
      I_LSH_TankB: false,
      I_LSH_Reactor: false,
      I_AgitatorHealth: true, // Motor overload relay normal
    },
    analogs: {
      AI_LT_TankA: 900.0,
      AI_LT_TankB: 850.0,
      AI_LT_Reactor: 0.0,
      AI_TT_Reactor: 22.5,
      AI_pHT_Reactor: 7.0,
    },
    outputs: {
      Q_PumpA_Run: false,
      Q_PumpB_Run: false,
      Q_Agitator_Run: false,
      Q_HeaterJacket_On: false,
      Q_PumpAcid_Dose: false,
      Q_PumpBase_Dose: false,
      Q_Valve_ProductDrain: false,
      Q_AlarmBeacon: false,
    },
    analogOutputs: {
      AQ_V1_RatioA: 0.0,
      AQ_V2_RatioB: 0.0,
    },
    memory: {
      M_BatchState: BatchState.IDLE,
      M_RecipeRatioA: 600.0,
      M_RecipeRatioB: 400.0,
      M_TargetTemp: 65.0,
      M_TargetpH: 7.0,
    },
    physical: {
      tankALevel: 900.0,
      tankBLevel: 850.0,
      reactorLevel: 0.0,
      reactorTemp: 22.5,
      reactorpH: 7.0,
      productTankLevel: 150.0,
      dosingAStartReactorLevel: 0.0,
      dosingBStartReactorLevel: 0.0,
    },
    overrides: {
      enabled: false,
    },
    alarms: [],
    isRunning: true,
    scanTimeMs: 12.4,
    scanCount: 0,
    lastFaultReason: null,
  };
}

export function tickPlc(state: PlcState, deltaTimeMs: number): PlcState {
  if (!state.isRunning) return state;

  const dt = deltaTimeMs / 1000.0; // seconds
  const next = JSON.parse(JSON.stringify(state)) as PlcState;
  next.scanCount += 1;

  // -----------------------------------------------------
  // 1. PHYSICAL SIMULATION STEP
  // -----------------------------------------------------
  const phys = next.physical;
  const outs = next.outputs;
  const aOuts = next.analogOutputs;

  // Pump A & Valve A dosing
  if (outs.Q_PumpA_Run && aOuts.AQ_V1_RatioA > 0) {
    const flowRate = 40.0 * (aOuts.AQ_V1_RatioA / 100.0); // Litres/sec
    const transfer = Math.min(phys.tankALevel, flowRate * dt);
    phys.tankALevel -= transfer;
    const oldVol = phys.reactorLevel;
    phys.reactorLevel += transfer;
    
    // Chemical A is acidic (pH ~ 3.5)
    if (phys.reactorLevel > 0) {
      phys.reactorpH = (phys.reactorpH * oldVol + 3.5 * transfer) / phys.reactorLevel;
    }
  }

  // Pump B & Valve B dosing
  if (outs.Q_PumpB_Run && aOuts.AQ_V2_RatioB > 0) {
    const flowRate = 40.0 * (aOuts.AQ_V2_RatioB / 100.0); // Litres/sec
    const transfer = Math.min(phys.tankBLevel, flowRate * dt);
    phys.tankBLevel -= transfer;
    const oldVol = phys.reactorLevel;
    phys.reactorLevel += transfer;
    
    // Chemical B is alkaline (pH ~ 10.5)
    if (phys.reactorLevel > 0) {
      phys.reactorpH = (phys.reactorpH * oldVol + 10.5 * transfer) / phys.reactorLevel;
    }
  }

  // Thermal Jacket Heating & Ambient Cooling
  if (outs.Q_HeaterJacket_On) {
    const volFactor = Math.max(1.0, phys.reactorLevel / 200.0);
    const heatRate = 8.0 / volFactor; // °C / sec
    phys.reactorTemp = Math.min(115.0, phys.reactorTemp + heatRate * dt);
  }
  // Thermal cooling to ambient 22°C
  const ambientCooling = 0.15 * (phys.reactorTemp - 22.0) * dt;
  phys.reactorTemp = Math.max(22.0, phys.reactorTemp - ambientCooling);

  // Micro-pump Acid Dosing (pH lowering)
  if (outs.Q_PumpAcid_Dose) {
    phys.reactorpH = Math.max(1.0, phys.reactorpH - 1.2 * dt);
  }

  // Micro-pump Base Dosing (pH raising)
  if (outs.Q_PumpBase_Dose) {
    phys.reactorpH = Math.min(14.0, phys.reactorpH + 1.2 * dt);
  }

  // Product Drain Valve
  if (outs.Q_Valve_ProductDrain) {
    const drainRate = 50.0; // Litres/sec
    const transfer = Math.min(phys.reactorLevel, drainRate * dt);
    phys.reactorLevel -= transfer;
    phys.productTankLevel = Math.min(3000.0, phys.productTankLevel + transfer);
  }

  // -----------------------------------------------------
  // 2. SENSOR SIGNAL MAPPING (%IW / %IX)
  // -----------------------------------------------------
  next.analogs.AI_LT_TankA = Math.max(0, phys.tankALevel);
  next.analogs.AI_LT_TankB = Math.max(0, phys.tankBLevel);
  next.analogs.AI_LT_Reactor = Math.max(0, phys.reactorLevel);
  next.analogs.AI_TT_Reactor = phys.reactorTemp;
  next.analogs.AI_pHT_Reactor = phys.reactorpH;

  next.inputs.I_LSH_TankA = phys.tankALevel >= 980.0;
  next.inputs.I_LSH_TankB = phys.tankBLevel >= 980.0;
  next.inputs.I_LSH_Reactor = phys.reactorLevel >= 1850.0;

  // -----------------------------------------------------
  // 3. SOFT-PLC SCAN LOOP LOGIC EXECUTION
  // -----------------------------------------------------
  const inputs = next.inputs;
  const analogs = next.analogs;
  const memory = next.memory;

  // --- FB_SafetyInterlock Function Block ---
  let faultDetected = false;
  let faultReason = '';

  if (!inputs.I_EStop_NC) {
    faultDetected = true;
    faultReason = 'E-STOP SWITCH OPEN (SAFETY TRIP)';
  } else if (inputs.I_LSH_Reactor) {
    faultDetected = true;
    faultReason = 'REACTOR HIGH LEVEL FLOAT SWITCH (LSH-103) TRIP';
  } else if (inputs.I_LSH_TankA) {
    faultDetected = true;
    faultReason = 'TANK A HIGH LEVEL FLOAT GUARD TRIP';
  } else if (inputs.I_LSH_TankB) {
    faultDetected = true;
    faultReason = 'TANK B HIGH LEVEL FLOAT GUARD TRIP';
  } else if (!inputs.I_AgitatorHealth) {
    faultDetected = true;
    faultReason = 'AGITATOR MIXER OVERLOAD RELAY TRIP';
  } else if (analogs.AI_TT_Reactor > 90.0) {
    faultDetected = true;
    faultReason = 'THERMAL RUNAWAY CRITICAL TEMP EXCEEDED (> 90.0°C)';
  }

  if (faultDetected) {
    memory.M_BatchState = BatchState.FAULT;
    next.lastFaultReason = faultReason;
    outs.Q_AlarmBeacon = true;

    // Safety Lockdown
    outs.Q_PumpA_Run = false;
    outs.Q_PumpB_Run = false;
    outs.Q_Agitator_Run = false;
    outs.Q_HeaterJacket_On = false;
    outs.Q_PumpAcid_Dose = false;
    outs.Q_PumpBase_Dose = false;
    outs.Q_Valve_ProductDrain = false;
    aOuts.AQ_V1_RatioA = 0.0;
    aOuts.AQ_V2_RatioB = 0.0;

    // Register alarm if not active
    if (!next.alarms.some(a => a.code === 'FAULT_TRIP' && !a.acknowledged)) {
      next.alarms.unshift({
        id: `alm_${Date.now()}`,
        code: 'FAULT_TRIP',
        message: faultReason,
        severity: 'CRITICAL',
        timestamp: new Date().toLocaleTimeString(),
        acknowledged: false,
      });
    }
  }

  // --- Fault Reset Logic (%I0.3) ---
  if (inputs.I_ResetFault_PB) {
    if (memory.M_BatchState === BatchState.FAULT && !faultDetected) {
      memory.M_BatchState = BatchState.IDLE;
      outs.Q_AlarmBeacon = false;
      next.lastFaultReason = null;
    }
    // Acknowledge all alarms
    next.alarms.forEach(a => a.acknowledged = true);
  }

  // --- State Machine & Function Blocks execution ---
  if (memory.M_BatchState !== BatchState.FAULT) {
    switch (memory.M_BatchState) {
      case BatchState.IDLE:
        outs.Q_PumpA_Run = false;
        outs.Q_PumpB_Run = false;
        outs.Q_Agitator_Run = false;
        outs.Q_HeaterJacket_On = false;
        outs.Q_PumpAcid_Dose = false;
        outs.Q_PumpBase_Dose = false;
        outs.Q_Valve_ProductDrain = false;
        aOuts.AQ_V1_RatioA = 0.0;
        aOuts.AQ_V2_RatioB = 0.0;

        if (inputs.I_StartBatch_PB) {
          phys.dosingAStartReactorLevel = analogs.AI_LT_Reactor;
          memory.M_BatchState = BatchState.DOSING_A;
        }
        break;

      case BatchState.DOSING_A:
        outs.Q_PumpA_Run = true;
        aOuts.AQ_V1_RatioA = 100.0;
        outs.Q_PumpB_Run = false;
        aOuts.AQ_V2_RatioB = 0.0;

        const dosedA = analogs.AI_LT_Reactor - phys.dosingAStartReactorLevel;
        if (dosedA >= memory.M_RecipeRatioA || analogs.AI_LT_TankA <= 2.0) {
          outs.Q_PumpA_Run = false;
          aOuts.AQ_V1_RatioA = 0.0;
          phys.dosingBStartReactorLevel = analogs.AI_LT_Reactor;
          memory.M_BatchState = BatchState.DOSING_B;
        }
        break;

      case BatchState.DOSING_B:
        outs.Q_PumpB_Run = true;
        aOuts.AQ_V2_RatioB = 100.0;
        outs.Q_PumpA_Run = false;
        aOuts.AQ_V1_RatioA = 0.0;

        const dosedB = analogs.AI_LT_Reactor - phys.dosingBStartReactorLevel;
        if (dosedB >= memory.M_RecipeRatioB || analogs.AI_LT_TankB <= 2.0) {
          outs.Q_PumpB_Run = false;
          aOuts.AQ_V2_RatioB = 0.0;
          memory.M_BatchState = BatchState.HEATING_MIXING;
        }
        break;

      case BatchState.HEATING_MIXING:
        outs.Q_Agitator_Run = true; // Mixer prevents scorching
        outs.Q_HeaterJacket_On = analogs.AI_TT_Reactor < memory.M_TargetTemp;

        if (analogs.AI_TT_Reactor >= memory.M_TargetTemp) {
          outs.Q_HeaterJacket_On = false;
          memory.M_BatchState = BatchState.PH_BALANCING;
        }
        break;

      case BatchState.PH_BALANCING:
        outs.Q_Agitator_Run = true; // High-shear mixing during pH adjustment
        outs.Q_HeaterJacket_On = false;

        const currentpH = analogs.AI_pHT_Reactor;
        const targetpH = memory.M_TargetpH;

        if (currentpH > targetpH + 0.15) {
          outs.Q_PumpAcid_Dose = true;
          outs.Q_PumpBase_Dose = false;
        } else if (currentpH < targetpH - 0.15) {
          outs.Q_PumpAcid_Dose = false;
          outs.Q_PumpBase_Dose = true;
        } else {
          outs.Q_PumpAcid_Dose = false;
          outs.Q_PumpBase_Dose = false;
          memory.M_BatchState = BatchState.DRAINING;
        }
        break;

      case BatchState.DRAINING:
        outs.Q_Agitator_Run = false;
        outs.Q_PumpAcid_Dose = false;
        outs.Q_PumpBase_Dose = false;
        outs.Q_Valve_ProductDrain = true;

        if (analogs.AI_LT_Reactor <= 5.0) {
          outs.Q_Valve_ProductDrain = false;
          memory.M_BatchState = BatchState.IDLE;
        }
        break;
    }
  }

  // --- Handle Pause / Stop PB ---
  if (inputs.I_StopBatch_PB && memory.M_BatchState !== BatchState.FAULT) {
    memory.M_BatchState = BatchState.IDLE;
    outs.Q_PumpA_Run = false;
    outs.Q_PumpB_Run = false;
    outs.Q_Agitator_Run = false;
    outs.Q_HeaterJacket_On = false;
    outs.Q_PumpAcid_Dose = false;
    outs.Q_PumpBase_Dose = false;
    outs.Q_Valve_ProductDrain = false;
  }

  // --- Manual Mode Overrides (Commissioning) ---
  if (next.overrides.enabled) {
    if (next.overrides.Q_PumpA_Run !== undefined) outs.Q_PumpA_Run = next.overrides.Q_PumpA_Run;
    if (next.overrides.Q_PumpB_Run !== undefined) outs.Q_PumpB_Run = next.overrides.Q_PumpB_Run;
    if (next.overrides.Q_Agitator_Run !== undefined) outs.Q_Agitator_Run = next.overrides.Q_Agitator_Run;
    if (next.overrides.Q_HeaterJacket_On !== undefined) outs.Q_HeaterJacket_On = next.overrides.Q_HeaterJacket_On;
    if (next.overrides.Q_PumpAcid_Dose !== undefined) outs.Q_PumpAcid_Dose = next.overrides.Q_PumpAcid_Dose;
    if (next.overrides.Q_PumpBase_Dose !== undefined) outs.Q_PumpBase_Dose = next.overrides.Q_PumpBase_Dose;
    if (next.overrides.Q_Valve_ProductDrain !== undefined) outs.Q_Valve_ProductDrain = next.overrides.Q_Valve_ProductDrain;
  }

  return next;
}
