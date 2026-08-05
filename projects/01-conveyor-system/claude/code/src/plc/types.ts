export const COLOR_REJECT = 1
export const COLOR_ACCEPT = 2
export const COLOR_SPECIAL = 3

export type PartColor = typeof COLOR_REJECT | typeof COLOR_ACCEPT | typeof COLOR_SPECIAL

export const ALM_BIT_RUN = 0x01
export const ALM_BIT_WARN = 0x02
export const ALM_BIT_FAULT = 0x04

export interface PlcInputs {
  E_Stop: boolean
  Sensor_PartDetect: boolean
  Sensor_Color: PartColor
  Sensor_Weight: number
}

export interface PlcCommands {
  Cmd_Start: boolean
  Cmd_Stop: boolean
  Cmd_ManualReset: boolean
  Speed_Setpoint: number
}

export interface PlcOutputs {
  VFD_Run: boolean
  VFD_Speed_Ref: number
  Actuator_Diverter: boolean
  Alarm_Tower: number
}

export interface PlcInternal {
  EStopFaultLatched: boolean
  SystemReady: boolean
  RejectLatched: boolean
  RampedSpeed: number
  /** ms elapsed since VFD_Run last became TRUE, mirrors Tmr_SpeedRamp.ET */
  speedRampElapsedMs: number
  /** ms remaining on the diverter dwell timer, mirrors Tmr_DiverterDwell */
  diverterDwellRemainingMs: number
  prevSensorPartDetect: boolean
  prevCmdManualReset: boolean
}

export interface Part {
  id: number
  /** position along the belt, 0 = infeed, 100 = discharge */
  position: number
  color: PartColor
  weight: number
  /** true once the sort decision has been evaluated for this part */
  evaluated: boolean
  /** true if this part was decided to be rejected/diverted */
  rejected: boolean
  /** true once the part has physically been pushed off the main lane */
  diverted: boolean
}

export const WEIGHT_MIN_KG = 0.2
export const WEIGHT_MAX_KG = 5.0
export const DIVERTER_DWELL_MS = 750
export const SPEED_RAMP_MS = 2000

export const BELT_SENSOR_POSITION = 60
export const BELT_DIVERTER_POSITION = 78
export const BELT_END_POSITION = 100
