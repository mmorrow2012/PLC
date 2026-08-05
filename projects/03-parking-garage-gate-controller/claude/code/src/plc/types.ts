export const ST_IDLE = 0
export const ST_OPENING = 1
export const ST_OPEN = 2
export const ST_CLOSING = 3
export const ST_CLOSED = 4

export type GateState =
  | typeof ST_IDLE
  | typeof ST_OPENING
  | typeof ST_OPEN
  | typeof ST_CLOSING
  | typeof ST_CLOSED

export const GATE_STATE_LABEL: Record<GateState, string> = {
  [ST_IDLE]: 'IDLE',
  [ST_OPENING]: 'OPENING',
  [ST_OPEN]: 'OPEN',
  [ST_CLOSING]: 'CLOSING',
  [ST_CLOSED]: 'CLOSED',
}

export interface PlcInputs {
  E_Stop: boolean
  Sensor_VehiclePresence: boolean
  Sensor_GateOpenLimit: boolean
  Sensor_GateClosedLimit: boolean
  Sensor_Obstruction: boolean
}

export interface PlcCommands {
  PB_ManualOpen: boolean
  PB_ManualClose: boolean
}

export interface PlcOutputs {
  Motor_GateUp: boolean
  Motor_GateDown: boolean
  Light_Green: boolean
  Light_Red: boolean
  Alarm_StuckGate: boolean
  Buzzer: boolean
}

export interface PlcInternal {
  GateState: GateState
  EStopFaultLatched: boolean
  prevPbManualOpen: boolean
  prevPbManualClose: boolean
  prevEStopResetClk: boolean
  /** ms elapsed since Tmr_AutoClose.IN last became TRUE, mirrors Tmr_AutoClose.ET */
  autoCloseElapsedMs: number
  /** ms elapsed since Tmr_WatchdogOpen.IN last became TRUE, mirrors Tmr_WatchdogOpen.ET */
  watchdogOpenElapsedMs: number
  /** ms elapsed since Tmr_WatchdogClose.IN last became TRUE, mirrors Tmr_WatchdogClose.ET */
  watchdogCloseElapsedMs: number
}

export const T_WATCHDOG_TIMEOUT_MS = 8000
export const T_AUTO_CLOSE_DELAY_MS = 5000

/** Full 0 (closed) - 90 (open) degree gate arm travel time at nominal motor speed. */
export const GATE_TRAVEL_MS_NOMINAL = 3000
