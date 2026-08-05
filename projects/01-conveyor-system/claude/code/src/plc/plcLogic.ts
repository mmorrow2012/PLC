import {
  ALM_BIT_FAULT,
  ALM_BIT_RUN,
  ALM_BIT_WARN,
  COLOR_REJECT,
  DIVERTER_DWELL_MS,
  type PlcCommands,
  type PlcInputs,
  type PlcInternal,
  type PlcOutputs,
  SPEED_RAMP_MS,
  WEIGHT_MAX_KG,
  WEIGHT_MIN_KG,
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
 * TypeScript mirror of src/plc/conveyorLogic.st. Executed once per soft-PLC
 * scan by softPlcEngine.ts. Kept as a pure function so the scan engine can
 * remain a thin driver and the control logic stays independently testable.
 */
export function runConveyorLogic(scan: PlcScanIn): PlcScanOut {
  const { inputs, commands, dtMs } = scan
  const internal = { ...scan.internal }
  let VFD_Run = scan.outputs.VFD_Run

  // --- 1) Safety interlock ------------------------------------------------
  if (!inputs.E_Stop) {
    internal.EStopFaultLatched = true
  }

  // R_TRIG on Cmd_ManualReset: rising edge only, and only accepted while
  // the E-Stop circuit is currently healthy.
  const resetRisingEdge = commands.Cmd_ManualReset && !internal.prevCmdManualReset
  if (resetRisingEdge && inputs.E_Stop) {
    internal.EStopFaultLatched = false
  }
  internal.prevCmdManualReset = commands.Cmd_ManualReset

  internal.SystemReady = inputs.E_Stop && !internal.EStopFaultLatched

  if (commands.Cmd_Stop || !internal.SystemReady) {
    VFD_Run = false
  } else if (commands.Cmd_Start && internal.SystemReady) {
    VFD_Run = true
  }

  // --- 2) Speed control (soft-ramp toward Speed_Setpoint) -----------------
  if (VFD_Run) {
    internal.speedRampElapsedMs = Math.min(internal.speedRampElapsedMs + dtMs, SPEED_RAMP_MS)
    internal.RampedSpeed =
      internal.speedRampElapsedMs >= SPEED_RAMP_MS
        ? commands.Speed_Setpoint
        : commands.Speed_Setpoint * (internal.speedRampElapsedMs / SPEED_RAMP_MS)
  } else {
    internal.speedRampElapsedMs = 0
    internal.RampedSpeed = 0
  }
  const VFD_Speed_Ref = internal.RampedSpeed

  // --- 3) Part sorting ------------------------------------------------------
  const partDetectRisingEdge = inputs.Sensor_PartDetect && !internal.prevSensorPartDetect
  internal.prevSensorPartDetect = inputs.Sensor_PartDetect

  if (partDetectRisingEdge) {
    internal.RejectLatched =
      inputs.Sensor_Color === COLOR_REJECT ||
      inputs.Sensor_Weight < WEIGHT_MIN_KG ||
      inputs.Sensor_Weight > WEIGHT_MAX_KG
  }

  let Actuator_Diverter = scan.outputs.Actuator_Diverter
  if (partDetectRisingEdge && internal.RejectLatched) {
    internal.diverterDwellRemainingMs = DIVERTER_DWELL_MS
    Actuator_Diverter = true
  } else if (Actuator_Diverter) {
    internal.diverterDwellRemainingMs = Math.max(internal.diverterDwellRemainingMs - dtMs, 0)
    if (internal.diverterDwellRemainingMs <= 0) {
      Actuator_Diverter = false
      internal.RejectLatched = false
    }
  }

  // --- 4) Annunciation --------------------------------------------------
  let Alarm_Tower = 0
  if (VFD_Run) {
    Alarm_Tower |= ALM_BIT_RUN
  } else if (internal.SystemReady) {
    Alarm_Tower |= ALM_BIT_WARN
  }
  if (internal.EStopFaultLatched || !inputs.E_Stop) {
    Alarm_Tower |= ALM_BIT_FAULT
  }

  return {
    outputs: { VFD_Run, VFD_Speed_Ref, Actuator_Diverter, Alarm_Tower },
    internal,
  }
}

export function createInitialInternal(): PlcInternal {
  return {
    EStopFaultLatched: false,
    SystemReady: true,
    RejectLatched: false,
    RampedSpeed: 0,
    speedRampElapsedMs: 0,
    diverterDwellRemainingMs: 0,
    prevSensorPartDetect: false,
    prevCmdManualReset: false,
  }
}

export function createInitialOutputs(): PlcOutputs {
  return {
    VFD_Run: false,
    VFD_Speed_Ref: 0,
    Actuator_Diverter: false,
    Alarm_Tower: ALM_BIT_WARN,
  }
}
