/**
 * Tag dictionary, engineering constants and I/O address map for the
 * Municipal Wastewater Treatment & Multi-Basin Aeration Tank Control System.
 *
 * Target platform: Schneider Electric Modicon M580 / EcoStruxure Control
 * Expert (IEC 61131-3 FBD + LD with Structured Text POUs). The %I / %IW /
 * %Q / %QW / %MW addresses below are the authoritative memory allocation
 * table - `TAG_ADDRESS` is the single source of truth reused by the HMI,
 * the ladder renderer and PLC_LOGIC.md.
 */

// ---------------------------------------------------------------------------
// M_PlantState (%MW0) operating state enumeration
// ---------------------------------------------------------------------------
export const ST_OFF = 0
export const ST_EQUALIZING = 1
export const ST_AERATION_ACTIVE = 2
export const ST_CLARIFYING = 3
export const ST_EFFLUENT_DISCHARGE = 4
export const ST_ALARM = 99

export type PlantState =
  | typeof ST_OFF
  | typeof ST_EQUALIZING
  | typeof ST_AERATION_ACTIVE
  | typeof ST_CLARIFYING
  | typeof ST_EFFLUENT_DISCHARGE
  | typeof ST_ALARM

export const PLANT_STATE_LABEL: Record<PlantState, string> = {
  [ST_OFF]: 'OFF',
  [ST_EQUALIZING]: 'EQUALIZING',
  [ST_AERATION_ACTIVE]: 'AERATION_ACTIVE',
  [ST_CLARIFYING]: 'CLARIFYING',
  [ST_EFFLUENT_DISCHARGE]: 'EFFLUENT_DISCHARGE',
  [ST_ALARM]: 'ALARM',
}

export const PLANT_STATE_DESCRIPTION: Record<PlantState, string> = {
  [ST_OFF]: 'Plant stopped — all drives de-energised, weir gate closed.',
  [ST_EQUALIZING]: 'Equalization basin buffering raw influent; lead/lag pumps under level control.',
  [ST_AERATION_ACTIVE]: 'Biological digestion running — blowers modulating to the DO setpoint.',
  [ST_CLARIFYING]: 'Secondary clarification & coagulant dosing; solids settling before discharge.',
  [ST_EFFLUENT_DISCHARGE]: 'Effluent within consent limits — motorised weir gate open, discharging.',
  [ST_ALARM]: 'Safety interlock tripped — outputs inhibited, weir gate driven closed.',
}

// ---------------------------------------------------------------------------
// Process image
// ---------------------------------------------------------------------------

/** Digital inputs — %I0.0 … %I0.7 (24 VDC sinking input card). */
export interface PlcDigitalInputs {
  /** %I0.0 — Master hardware E-Stop, Normally Closed. TRUE = healthy/closed. */
  I_EStop_NC: boolean
  /** %I0.1 — Plant master run pushbutton (momentary). */
  I_PlantStart_PB: boolean
  /** %I0.2 — Plant master stop pushbutton (momentary). */
  I_PlantStop_PB: boolean
  /** %I0.3 — Alarm reset & fault acknowledgment (momentary). */
  I_ResetFault_PB: boolean
  /** %I0.4 — High-High level float guard, equalization basin (flooding interlock). */
  I_LSH_Equalization: boolean
  /** %I0.5 — High level float guard, aeration basin A. */
  I_LSH_AerationA: boolean
  /** %I0.6 — High level float guard, aeration basin B. */
  I_LSH_AerationB: boolean
  /** %I0.7 — Motorised effluent weir gate fully-open limit switch. */
  I_WeirOpenLS: boolean
}

/** Analog inputs — %IW100 … %IW108, 4-20 mA scaled to engineering units. */
export interface PlcAnalogInputs {
  /** %IW100 — Ultrasonic level transmitter, equalization basin (0.0 … 10.0 m). */
  AI_LT_EqBasin: number
  /** %IW102 — Level transmitter, aeration basin A (0.0 … 6.0 m). */
  AI_LT_AerationA: number
  /** %IW104 — Level transmitter, aeration basin B (0.0 … 6.0 m). */
  AI_LT_AerationB: number
  /** %IW106 — Dissolved oxygen probe, basin A (0.0 … 10.0 mg/L). */
  AI_DO_AerationA: number
  /** %IW108 — Turbidity sensor, effluent discharge (0.0 … 100.0 NTU). */
  AI_Turbidity_Effluent: number
}

export interface PlcInputs extends PlcDigitalInputs, PlcAnalogInputs {}

/** Digital outputs — %Q0.0 … %Q0.7 (24 VDC relay/contactor card). */
export interface PlcDigitalOutputs {
  /** %Q0.0 — Influent pump 1 duty contactor. */
  Q_Pump_RawInfluent1: boolean
  /** %Q0.1 — Influent pump 2 lag contactor. */
  Q_Pump_RawInfluent2: boolean
  /** %Q0.2 — Aeration basin A diffuser blower motor. */
  Q_Blower_AerationA: boolean
  /** %Q0.3 — Aeration basin B diffuser blower motor. */
  Q_Blower_AerationB: boolean
  /** %Q0.4 — Return Activated Sludge recirculation pump. */
  Q_Pump_RAS: boolean
  /** %Q0.5 — Chemical coagulant polymer dosing pump. */
  Q_Pump_Coagulant: boolean
  /** %Q0.6 — Motorised sluice weir gate OPEN contactor. */
  Q_Motor_WeirOpen: boolean
  /** %Q0.7 — Motorised sluice weir gate CLOSE contactor. */
  Q_Motor_WeirClose: boolean
}

/** Analog outputs — %QW100 / %QW102, engineering units scaled to 4-20 mA. */
export interface PlcAnalogOutputs {
  /** %QW100 — Influent pump VFD speed reference (0 … 100 %). */
  AQ_VFD_InfluentSpeed: number
  /** %QW102 — Aeration air flow control valve position (0 … 100 %). */
  AQ_AirValve_Aeration: number
}

export interface PlcOutputs extends PlcDigitalOutputs, PlcAnalogOutputs {}

/** HMI command image — soft pushbuttons / setpoint entries from the SCADA faceplate. */
export interface PlcCommands {
  /** Manual/Auto selector for the motorised weir gate (FALSE = AUTO). */
  Cmd_WeirManualMode: boolean
  /** Manual jog OPEN (held) — only honoured in manual mode. */
  Cmd_WeirJogOpen: boolean
  /** Manual jog CLOSE (held) — only honoured in manual mode. */
  Cmd_WeirJogClose: boolean
  /** Operator request to swap the lead/lag influent duty pump immediately. */
  Cmd_SwapLeadPump: boolean
}

/** Trip source codes latched into M_AlarmCode when FB_SafetyInterlock fires. */
export const TRIP_NONE = 0
export const TRIP_ESTOP = 1
export const TRIP_EQ_FLOOD = 2
export const TRIP_TURBIDITY = 3

export const TRIP_LABEL: Record<number, string> = {
  [TRIP_NONE]: 'No active trip',
  [TRIP_ESTOP]: 'E-STOP — %I0.0 I_EStop_NC contact open',
  [TRIP_EQ_FLOOD]: 'HIGH-HIGH LEVEL — %I0.4 equalization basin flooding guard',
  [TRIP_TURBIDITY]: 'CONSENT BREACH — effluent turbidity above 25.0 NTU',
}

/** Retentive internal memory (%MW table plus non-addressed working storage). */
export interface PlcInternal {
  /** %MW0 — operating state. */
  M_PlantState: PlantState
  /** %MW2 — dissolved oxygen target setpoint (mg/L). */
  M_TargetDO: number
  /** %MW4 — maximum allowed effluent turbidity for discharge (NTU). */
  M_MaxTurbidity: number
  /** %MW6 — lead/lag duty rotation toggle (1 = pump 1 lead, 2 = pump 2 lead). */
  M_LeadPumpToggle: number

  /** Master run seal-in latch (start/stop pushbutton latch). */
  M_PlantRun: boolean
  /** FB_SafetyInterlock trip latch — inhibits every actuator while TRUE. */
  M_SafetyTrip: boolean
  /** Audible/visual alarm active (mirrors M_SafetyTrip, cleared by acknowledgment). */
  M_AlarmActive: boolean
  /** Latched trip source, see TRIP_* codes. */
  M_AlarmCode: number

  /** FB_LeadLagPump — duty (lead) pump call. */
  M_LeadPumpCall: boolean
  /** FB_LeadLagPump — standby (lag) pump call. */
  M_LagPumpCall: boolean
  /** FB_AerationDO — blower A digestion demand. */
  M_BlowerCallA: boolean
  /** FB_AerationDO — blower B digestion demand. */
  M_BlowerCallB: boolean
  /** FB_AerationDO — PI integral accumulator (percent). */
  M_DoIntegral: number
  /** ms the DO probe has continuously held at/above setpoint (aeration complete timer). */
  M_DoAtTargetMs: number
  /** FB_WeirGateControl — AUTO discharge permit latch. */
  M_WeirOpenCmd: boolean
  /** ms the CLOSE contactor has been energised (stands in for the absent closed limit switch). */
  M_WeirCloseTimerMs: number
  /** Derived "gate fully closed" flag latched by the close-travel timer. */
  M_WeirClosedLS: boolean
  /** ms the coagulant dosing pump has run this batch (chemical usage counter). */
  M_CoagulantRunMs: number

  // Rising-edge memories (R_TRIG.M equivalents) --------------------------
  prev_PlantStart_PB: boolean
  prev_PlantStop_PB: boolean
  prev_ResetFault_PB: boolean
  prev_SwapLeadPump: boolean
  /** Previous-scan influent pump call, used to rotate duty on the falling edge. */
  prev_PumpCallActive: boolean
}

// ---------------------------------------------------------------------------
// Engineering constants (documented in PLC_LOGIC.md §3)
// ---------------------------------------------------------------------------

/** MAST task period configured on the M580 — the soft-PLC scan interval. */
export const SCAN_CYCLE_MS = 50

// FB_LeadLagPump ------------------------------------------------------------
/** Equalization basin level that calls the LEAD influent pump (m). */
export const EQ_LEAD_START_M = 3.0
/** Equalization basin level that calls the LAG influent pump (m). */
export const EQ_LAG_START_M = 6.0
/** Lag pump drops out below this level (hysteresis band). */
export const EQ_LAG_STOP_M = 4.5
/** Both pumps drop out below this level; duty rotation happens here. */
export const EQ_ALL_STOP_M = 1.0
/** VFD reference at the lead-start level (%). */
export const VFD_MIN_PCT = 40
/** VFD reference just below the lag-start level (%). */
export const VFD_LEAD_MAX_PCT = 85
/** VFD reference with both pumps running (%). */
export const VFD_LAG_PCT = 100
/** VFD accel/decel ramp limit (% per second). */
export const VFD_RAMP_PCT_PER_S = 45

// FB_AerationDO -------------------------------------------------------------
/** Default dissolved oxygen setpoint written to %MW2 (mg/L). */
export const DEFAULT_TARGET_DO = 2.5
/** DO control deadband either side of setpoint (mg/L). */
export const DO_DEADBAND = 0.25
/** Proportional gain, % air valve travel per mg/L of DO error. */
export const DO_KP = 30
/** Integral gain, % air valve travel per mg/L per second. */
export const DO_KI = 8
/** Integral windup clamp (%). */
export const DO_INTEGRAL_LIMIT = 60
/** Minimum air valve position while a blower is energised (%). */
export const AIR_VALVE_MIN_PCT = 15
/** Aeration basin level below which a blower must not run (diffuser dry-run guard, m). */
export const AERATION_MIN_LEVEL_M = 2.0
/** Continuous time at/above the DO setpoint that marks the digestion batch complete (ms). */
export const T_AERATION_COMPLETE_MS = 8000

// FB_WeirGateControl --------------------------------------------------------
/** Secondary clarifier level at which discharge is requested (m). */
export const CLARIFIER_DISCHARGE_M = 2.6
/** Secondary clarifier level at which discharge stops (m). */
export const CLARIFIER_DISCHARGE_STOP_M = 1.4
/** Default maximum discharge turbidity written to %MW4 (NTU). */
export const DEFAULT_MAX_TURBIDITY = 15.0
/** Full weir gate travel time, 0 → 100 % open (ms). */
export const WEIR_TRAVEL_MS = 4000

// FB_SafetyInterlock --------------------------------------------------------
/** Effluent turbidity that trips the plant outright (NTU). */
export const TURBIDITY_TRIP_NTU = 25.0

// Ancillary drives ----------------------------------------------------------
/** Secondary clarifier level below which the RAS pump is inhibited (m). */
export const RAS_MIN_CLARIFIER_M = 0.6
/** Coagulant dosing starts above this fraction of M_MaxTurbidity. */
export const COAGULANT_DOSE_FRACTION = 0.6

// Vessel spans (engineering ranges of the transmitters) ---------------------
export const EQ_BASIN_MAX_M = 10.0
export const AERATION_MAX_M = 6.0
export const PRIMARY_CLARIFIER_MAX_M = 4.0
export const SECONDARY_CLARIFIER_MAX_M = 4.0
export const DO_PROBE_MAX_MGL = 10.0
export const TURBIDITY_MAX_NTU = 100.0

// ---------------------------------------------------------------------------
// Memory allocation table
// ---------------------------------------------------------------------------
export const TAG_ADDRESS: Record<string, string> = {
  I_EStop_NC: '%I0.0',
  I_PlantStart_PB: '%I0.1',
  I_PlantStop_PB: '%I0.2',
  I_ResetFault_PB: '%I0.3',
  I_LSH_Equalization: '%I0.4',
  I_LSH_AerationA: '%I0.5',
  I_LSH_AerationB: '%I0.6',
  I_WeirOpenLS: '%I0.7',

  AI_LT_EqBasin: '%IW100',
  AI_LT_AerationA: '%IW102',
  AI_LT_AerationB: '%IW104',
  AI_DO_AerationA: '%IW106',
  AI_Turbidity_Effluent: '%IW108',

  Q_Pump_RawInfluent1: '%Q0.0',
  Q_Pump_RawInfluent2: '%Q0.1',
  Q_Blower_AerationA: '%Q0.2',
  Q_Blower_AerationB: '%Q0.3',
  Q_Pump_RAS: '%Q0.4',
  Q_Pump_Coagulant: '%Q0.5',
  Q_Motor_WeirOpen: '%Q0.6',
  Q_Motor_WeirClose: '%Q0.7',

  AQ_VFD_InfluentSpeed: '%QW100',
  AQ_AirValve_Aeration: '%QW102',

  M_PlantState: '%MW0',
  M_TargetDO: '%MW2',
  M_MaxTurbidity: '%MW4',
  M_LeadPumpToggle: '%MW6',

  M_PlantRun: '%M10',
  M_SafetyTrip: '%M11',
  M_AlarmActive: '%M12',
  M_LeadPumpCall: '%M13',
  M_LagPumpCall: '%M14',
  M_BlowerCallA: '%M15',
  M_BlowerCallB: '%M16',
  M_WeirOpenCmd: '%M17',
  M_WeirClosedLS: '%M18',
}

/** Engineering unit suffix for every analog tag, used by the HMI readouts. */
export const TAG_UNIT: Record<string, string> = {
  AI_LT_EqBasin: 'm',
  AI_LT_AerationA: 'm',
  AI_LT_AerationB: 'm',
  AI_DO_AerationA: 'mg/L',
  AI_Turbidity_Effluent: 'NTU',
  AQ_VFD_InfluentSpeed: '%',
  AQ_AirValve_Aeration: '%',
  M_TargetDO: 'mg/L',
  M_MaxTurbidity: 'NTU',
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}
