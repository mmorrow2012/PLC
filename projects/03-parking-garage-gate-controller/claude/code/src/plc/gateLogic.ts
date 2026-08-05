import {
  ST_CLOSED,
  ST_CLOSING,
  ST_IDLE,
  ST_OPEN,
  ST_OPENING,
  T_AUTO_CLOSE_DELAY_MS,
  T_WATCHDOG_TIMEOUT_MS,
  type PlcCommands,
  type PlcInputs,
  type PlcInternal,
  type PlcOutputs,
} from './types'

export interface PlcScanIn {
  inputs: PlcInputs
  commands: PlcCommands
  internal: PlcInternal
  outputs: PlcOutputs
  dtMs: number
}

export interface PlcScanOut {
  outputs: PlcOutputs
  internal: PlcInternal
}

/**
 * TypeScript mirror of src/plc/parkingGateLogic.st. Executed once per
 * soft-PLC scan by softPlcEngine.ts. Kept as a pure function so the scan
 * engine can remain a thin driver and the control logic stays
 * independently testable. Section numbers below match the .st source.
 */
export function runParkingGateLogic(scan: PlcScanIn): PlcScanOut {
  const { inputs, commands, dtMs } = scan
  const internal = { ...scan.internal }
  let { Motor_GateUp, Motor_GateDown, Light_Green, Light_Red, Alarm_StuckGate, Buzzer } = scan.outputs

  // --- 1) Safety interlock -------------------------------------------------
  if (!inputs.E_Stop) {
    internal.EStopFaultLatched = true
  }

  const eStopResetClk = commands.PB_ManualOpen || commands.PB_ManualClose
  const eStopResetRisingEdge = eStopResetClk && !internal.prevEStopResetClk
  internal.prevEStopResetClk = eStopResetClk
  if (eStopResetRisingEdge && inputs.E_Stop) {
    internal.EStopFaultLatched = false
  }

  // --- 2) Timer pre-evaluation (against last scan's GateState) ------------
  const manualOpenRisingEdge = commands.PB_ManualOpen && !internal.prevPbManualOpen
  const manualCloseRisingEdge = commands.PB_ManualClose && !internal.prevPbManualClose
  internal.prevPbManualOpen = commands.PB_ManualOpen
  internal.prevPbManualClose = commands.PB_ManualClose

  const autoCloseIn = internal.GateState === ST_OPEN && !inputs.Sensor_VehiclePresence
  internal.autoCloseElapsedMs = autoCloseIn ? Math.min(internal.autoCloseElapsedMs + dtMs, T_AUTO_CLOSE_DELAY_MS) : 0
  const autoCloseQ = autoCloseIn && internal.autoCloseElapsedMs >= T_AUTO_CLOSE_DELAY_MS

  const watchdogOpenIn = internal.GateState === ST_OPENING
  internal.watchdogOpenElapsedMs = watchdogOpenIn
    ? Math.min(internal.watchdogOpenElapsedMs + dtMs, T_WATCHDOG_TIMEOUT_MS)
    : 0
  const watchdogOpenQ = watchdogOpenIn && internal.watchdogOpenElapsedMs >= T_WATCHDOG_TIMEOUT_MS

  const watchdogCloseIn = internal.GateState === ST_CLOSING
  internal.watchdogCloseElapsedMs = watchdogCloseIn
    ? Math.min(internal.watchdogCloseElapsedMs + dtMs, T_WATCHDOG_TIMEOUT_MS)
    : 0
  const watchdogCloseQ = watchdogCloseIn && internal.watchdogCloseElapsedMs >= T_WATCHDOG_TIMEOUT_MS

  // --- 3) Gate sequencer ---------------------------------------------------
  switch (internal.GateState) {
    case ST_IDLE: {
      Motor_GateUp = false
      Motor_GateDown = false
      Light_Green = false
      Light_Red = true
      Buzzer = false
      if (inputs.Sensor_VehiclePresence || manualOpenRisingEdge) {
        internal.GateState = ST_OPENING
      }
      break
    }
    case ST_OPENING: {
      Motor_GateUp = true
      Motor_GateDown = false
      Light_Green = false
      Light_Red = true
      Buzzer = true
      if (inputs.Sensor_GateOpenLimit) {
        Motor_GateUp = false
        Buzzer = false
        internal.GateState = ST_OPEN
      }
      break
    }
    case ST_OPEN: {
      Motor_GateUp = false
      Motor_GateDown = false
      Light_Green = true
      Light_Red = false
      Buzzer = false
      if (autoCloseQ || manualCloseRisingEdge) {
        internal.GateState = ST_CLOSING
      }
      break
    }
    case ST_CLOSING: {
      Motor_GateUp = false
      Motor_GateDown = true
      Light_Green = false
      Light_Red = true
      Buzzer = true
      if (inputs.Sensor_Obstruction) {
        Motor_GateDown = false
        Motor_GateUp = true
        internal.GateState = ST_OPENING
      } else if (inputs.Sensor_GateClosedLimit) {
        Motor_GateDown = false
        Buzzer = false
        internal.GateState = ST_CLOSED
      }
      break
    }
    case ST_CLOSED: {
      Motor_GateUp = false
      Motor_GateDown = false
      Light_Green = false
      Light_Red = true
      Buzzer = false
      internal.GateState = ST_IDLE
      break
    }
  }

  // --- 4) Stuck gate watchdog ----------------------------------------------
  if ((watchdogOpenQ || watchdogCloseQ) && !Alarm_StuckGate) {
    Alarm_StuckGate = true
    Motor_GateUp = false
    Motor_GateDown = false
    Buzzer = false
  }

  // --- 5) Stuck gate recovery ------------------------------------------------
  if (Alarm_StuckGate) {
    Motor_GateUp = false
    Motor_GateDown = false
    Light_Green = false
    Light_Red = true

    if (commands.PB_ManualOpen && inputs.E_Stop) {
      Motor_GateUp = true
      if (inputs.Sensor_GateOpenLimit) {
        Motor_GateUp = false
        Alarm_StuckGate = false
        internal.GateState = ST_OPEN
      }
    } else if (commands.PB_ManualClose && inputs.E_Stop) {
      Motor_GateDown = true
      if (inputs.Sensor_GateClosedLimit) {
        Motor_GateDown = false
        Alarm_StuckGate = false
        internal.GateState = ST_IDLE
      }
    }

    Buzzer = Motor_GateUp || Motor_GateDown
  }

  // --- 6) Mutual exclusion guard --------------------------------------------
  if (Motor_GateUp && Motor_GateDown) {
    Motor_GateUp = false
    Motor_GateDown = false
  }

  // --- 7) Safety interlock enforcement (absolute, last word) ----------------
  if (!inputs.E_Stop || internal.EStopFaultLatched) {
    Motor_GateUp = false
    Motor_GateDown = false
    Buzzer = false
    Light_Green = false
    Light_Red = true
  }

  return {
    outputs: { Motor_GateUp, Motor_GateDown, Light_Green, Light_Red, Alarm_StuckGate, Buzzer },
    internal,
  }
}

export function createInitialInternal(): PlcInternal {
  return {
    GateState: ST_IDLE,
    EStopFaultLatched: false,
    prevPbManualOpen: false,
    prevPbManualClose: false,
    prevEStopResetClk: false,
    autoCloseElapsedMs: 0,
    watchdogOpenElapsedMs: 0,
    watchdogCloseElapsedMs: 0,
  }
}

export function createInitialOutputs(): PlcOutputs {
  return {
    Motor_GateUp: false,
    Motor_GateDown: false,
    Light_Green: false,
    Light_Red: true,
    Alarm_StuckGate: false,
    Buzzer: false,
  }
}
