/**
 * TypeScript port of `wastewaterLogic.st`.
 *
 * Section numbering, rung ordering and variable names match the Structured
 * Text source 1:1 so the two files can be diffed against each other. This
 * module is a PURE function of (inputs, commands, internal, outputs, dt) —
 * it performs no I/O and holds no module-level state, exactly like a POU
 * evaluated once per MAST scan.
 */

import {
  AERATION_MIN_LEVEL_M,
  AIR_VALVE_MIN_PCT,
  CLARIFIER_DISCHARGE_M,
  CLARIFIER_DISCHARGE_STOP_M,
  COAGULANT_DOSE_FRACTION,
  DEFAULT_MAX_TURBIDITY,
  DEFAULT_TARGET_DO,
  DO_DEADBAND,
  DO_INTEGRAL_LIMIT,
  DO_KI,
  DO_KP,
  EQ_ALL_STOP_M,
  EQ_LAG_START_M,
  EQ_LAG_STOP_M,
  EQ_LEAD_START_M,
  RAS_MIN_CLARIFIER_M,
  ST_AERATION_ACTIVE,
  ST_ALARM,
  ST_CLARIFYING,
  ST_EFFLUENT_DISCHARGE,
  ST_EQUALIZING,
  ST_OFF,
  TRIP_ESTOP,
  TRIP_EQ_FLOOD,
  TRIP_NONE,
  TRIP_TURBIDITY,
  TURBIDITY_TRIP_NTU,
  T_AERATION_COMPLETE_MS,
  VFD_LAG_PCT,
  VFD_LEAD_MAX_PCT,
  VFD_MIN_PCT,
  VFD_RAMP_PCT_PER_S,
  WEIR_TRAVEL_MS,
  clamp,
} from './types'
import type { PlantState, PlcCommands, PlcInputs, PlcInternal, PlcOutputs } from './types'

/**
 * Process variables that the control program consumes but which have no
 * entry in the prompt's I/O address table. The secondary clarifier level is
 * genuinely required by FB_WeirGateControl ("water in secondary clarifier
 * reaches discharge level") yet no transmitter is listed, so it is supplied
 * here as a plant-model value rather than being invented as a %IW address.
 * See ARCHITECTURE.md §5.
 */
export interface ProcessContext {
  /** Secondary clarifier level (0 … 4.0 m). */
  clarifierLevel: number
}

export interface ScanContext {
  inputs: PlcInputs
  commands: PlcCommands
  internal: PlcInternal
  outputs: PlcOutputs
  process: ProcessContext
  /** Scan period in milliseconds (MAST task period). */
  dtMs: number
}

export interface ScanResult {
  outputs: PlcOutputs
  internal: PlcInternal
  /** TRUE while the digestion batch complete timer has expired. */
  aerationDone: boolean
}

export function createInitialOutputs(): PlcOutputs {
  return {
    Q_Pump_RawInfluent1: false,
    Q_Pump_RawInfluent2: false,
    Q_Blower_AerationA: false,
    Q_Blower_AerationB: false,
    Q_Pump_RAS: false,
    Q_Pump_Coagulant: false,
    Q_Motor_WeirOpen: false,
    Q_Motor_WeirClose: false,
    AQ_VFD_InfluentSpeed: 0,
    AQ_AirValve_Aeration: 0,
  }
}

export function createInitialInternal(): PlcInternal {
  return {
    M_PlantState: ST_OFF,
    M_TargetDO: DEFAULT_TARGET_DO,
    M_MaxTurbidity: DEFAULT_MAX_TURBIDITY,
    M_LeadPumpToggle: 1,

    M_PlantRun: false,
    M_SafetyTrip: false,
    M_AlarmActive: false,
    M_AlarmCode: TRIP_NONE,

    M_LeadPumpCall: false,
    M_LagPumpCall: false,
    M_BlowerCallA: false,
    M_BlowerCallB: false,
    M_DoIntegral: 0,
    M_DoAtTargetMs: 0,
    M_WeirOpenCmd: false,
    M_WeirCloseTimerMs: WEIR_TRAVEL_MS,
    M_WeirClosedLS: true,
    M_CoagulantRunMs: 0,

    prev_PlantStart_PB: false,
    prev_PlantStop_PB: false,
    prev_ResetFault_PB: false,
    prev_SwapLeadPump: false,
    prev_PumpCallActive: false,
  }
}

/**
 * One MAST scan. Mirrors PROGRAM WastewaterPlant in wastewaterLogic.st.
 */
export function runWastewaterLogic({
  inputs,
  commands,
  internal,
  outputs,
  process,
  dtMs,
}: ScanContext): ScanResult {
  const dt = dtMs / 1000
  const m: PlcInternal = { ...internal }
  const q: PlcOutputs = { ...outputs }

  // =========================================================================
  // SECTION 1 — FB_SafetyInterlock (scanned first, inhibits everything below)
  // =========================================================================
  // Rung 1.1 — live trip conditions (parallel branch = OR).
  const condActive =
    !inputs.I_EStop_NC ||
    inputs.I_LSH_Equalization ||
    inputs.AI_Turbidity_Effluent > TURBIDITY_TRIP_NTU

  // Rung 1.2 — SET the retentive trip latch, capture the first-out code.
  if (condActive && !m.M_SafetyTrip) {
    m.M_SafetyTrip = true
    m.M_AlarmCode = !inputs.I_EStop_NC
      ? TRIP_ESTOP
      : inputs.I_LSH_Equalization
        ? TRIP_EQ_FLOOD
        : TRIP_TURBIDITY
  }

  // Rung 1.3 — RESET latch on the rising edge of the acknowledge pushbutton,
  // but only once every trip condition has physically cleared.
  const resetRising = inputs.I_ResetFault_PB && !m.prev_ResetFault_PB
  m.prev_ResetFault_PB = inputs.I_ResetFault_PB
  if (resetRising && !condActive) {
    m.M_SafetyTrip = false
    m.M_AlarmCode = TRIP_NONE
  }

  // Rung 1.4 — beacon and weir-shut demand follow the latch.
  m.M_AlarmActive = m.M_SafetyTrip
  const forceWeirShut = m.M_SafetyTrip

  // =========================================================================
  // SECTION 2 — master run seal-in and %MW0 state machine
  // =========================================================================
  const startRising = inputs.I_PlantStart_PB && !m.prev_PlantStart_PB
  const stopRising = inputs.I_PlantStop_PB && !m.prev_PlantStop_PB
  m.prev_PlantStart_PB = inputs.I_PlantStart_PB
  m.prev_PlantStop_PB = inputs.I_PlantStop_PB

  if (m.M_SafetyTrip || stopRising) {
    m.M_PlantRun = false // stop dominant
  } else if (startRising) {
    m.M_PlantRun = true
  }

  // =========================================================================
  // SECTION 3 — FB_LeadLagPump: influent duty/standby pumping
  // =========================================================================
  const pumpEnable =
    m.M_PlantRun && !m.M_SafetyTrip && !inputs.I_LSH_AerationA && !inputs.I_LSH_AerationB

  // Rung 3.1 / 3.2 — lead and lag calls, each with its own hysteresis band.
  if (!pumpEnable) {
    m.M_LeadPumpCall = false
    m.M_LagPumpCall = false
  } else {
    if (inputs.AI_LT_EqBasin >= EQ_LEAD_START_M) {
      m.M_LeadPumpCall = true
    } else if (inputs.AI_LT_EqBasin < EQ_ALL_STOP_M) {
      m.M_LeadPumpCall = false
    }

    if (inputs.AI_LT_EqBasin >= EQ_LAG_START_M) {
      m.M_LagPumpCall = true
    } else if (inputs.AI_LT_EqBasin < EQ_LAG_STOP_M) {
      m.M_LagPumpCall = false
    }

    m.M_LagPumpCall = m.M_LagPumpCall && m.M_LeadPumpCall
  }

  // Rung 3.3 — duty rotation on the falling edge of the pump call (or on an
  // explicit HMI swap request) so running hours are equalised.
  const pumpCallFalling = !m.M_LeadPumpCall && m.prev_PumpCallActive
  const swapRising = commands.Cmd_SwapLeadPump && !m.prev_SwapLeadPump
  m.prev_PumpCallActive = m.M_LeadPumpCall
  m.prev_SwapLeadPump = commands.Cmd_SwapLeadPump
  if (pumpCallFalling || swapRising) {
    m.M_LeadPumpToggle = m.M_LeadPumpToggle === 1 ? 2 : 1
  }

  // Rung 3.4 — map duty/standby calls onto the physical contactors.
  if (m.M_LeadPumpToggle === 1) {
    q.Q_Pump_RawInfluent1 = m.M_LeadPumpCall
    q.Q_Pump_RawInfluent2 = m.M_LagPumpCall
  } else {
    q.Q_Pump_RawInfluent1 = m.M_LagPumpCall
    q.Q_Pump_RawInfluent2 = m.M_LeadPumpCall
  }

  // Rung 3.5 — VFD speed reference with accel/decel ramp limiting.
  let targetSpeed: number
  if (m.M_LagPumpCall) {
    targetSpeed = VFD_LAG_PCT
  } else if (m.M_LeadPumpCall) {
    const span = clamp(
      (inputs.AI_LT_EqBasin - EQ_LEAD_START_M) / (EQ_LAG_START_M - EQ_LEAD_START_M),
      0,
      1,
    )
    targetSpeed = VFD_MIN_PCT + span * (VFD_LEAD_MAX_PCT - VFD_MIN_PCT)
  } else {
    targetSpeed = 0
  }
  const maxStep = VFD_RAMP_PCT_PER_S * dt
  q.AQ_VFD_InfluentSpeed =
    targetSpeed > q.AQ_VFD_InfluentSpeed
      ? Math.min(targetSpeed, q.AQ_VFD_InfluentSpeed + maxStep)
      : Math.max(targetSpeed, q.AQ_VFD_InfluentSpeed - maxStep)

  // =========================================================================
  // SECTION 4 — FB_AerationDO: dissolved oxygen control of the air header
  // =========================================================================
  const aerEnable = m.M_PlantRun && !m.M_SafetyTrip && m.M_PlantState >= ST_AERATION_ACTIVE
  const err = m.M_TargetDO - inputs.AI_DO_AerationA

  // Rung 4.1 — blower call with a symmetric deadband around the setpoint.
  if (!aerEnable) {
    m.M_BlowerCallA = false
  } else if (err > DO_DEADBAND) {
    m.M_BlowerCallA = true
  } else if (err < -DO_DEADBAND) {
    m.M_BlowerCallA = false
  }

  // Rung 4.2 — basin B trails basin A off the same air header.
  m.M_BlowerCallB = m.M_BlowerCallA && aerEnable

  // Rung 4.3 — diffuser dry-run interlock.
  q.Q_Blower_AerationA = m.M_BlowerCallA && inputs.AI_LT_AerationA >= AERATION_MIN_LEVEL_M
  q.Q_Blower_AerationB = m.M_BlowerCallB && inputs.AI_LT_AerationB >= AERATION_MIN_LEVEL_M

  // Rung 4.5 — high level float guards force the air off (evaluated before the
  // valve rung so a flooded basin also drops the air demand to 0 %).
  if (inputs.I_LSH_AerationA) q.Q_Blower_AerationA = false
  if (inputs.I_LSH_AerationB) q.Q_Blower_AerationB = false

  // Rung 4.4 — PI modulation of the air flow control valve.
  if (q.Q_Blower_AerationA || q.Q_Blower_AerationB) {
    m.M_DoIntegral = clamp(m.M_DoIntegral + DO_KI * err * dt, -DO_INTEGRAL_LIMIT, DO_INTEGRAL_LIMIT)
    q.AQ_AirValve_Aeration = clamp(
      AIR_VALVE_MIN_PCT + DO_KP * err + m.M_DoIntegral,
      AIR_VALVE_MIN_PCT,
      100,
    )
  } else {
    m.M_DoIntegral = 0
    q.AQ_AirValve_Aeration = 0
  }

  // Rung 4.6 — digestion batch complete once DO is held at setpoint.
  if (aerEnable && inputs.AI_DO_AerationA >= m.M_TargetDO - DO_DEADBAND) {
    m.M_DoAtTargetMs += dtMs
  } else {
    m.M_DoAtTargetMs = 0
  }
  const aerationDone = m.M_DoAtTargetMs >= T_AERATION_COMPLETE_MS

  // =========================================================================
  // SECTION 2 (cont.) — %MW0 state machine, evaluated once aerationDone and
  // the clarifier level for this scan are known.
  // =========================================================================
  if (m.M_SafetyTrip) {
    m.M_PlantState = ST_ALARM
  } else if (!m.M_PlantRun) {
    m.M_PlantState = ST_OFF
  } else {
    m.M_PlantState = nextPlantState(m.M_PlantState, {
      aerationLevelA: inputs.AI_LT_AerationA,
      clarifierLevel: process.clarifierLevel,
      turbidity: inputs.AI_Turbidity_Effluent,
      maxTurbidity: m.M_MaxTurbidity,
      aerationDone,
    })
  }

  // =========================================================================
  // SECTION 5 — RAS recirculation and coagulant dosing
  // =========================================================================
  // Rung 5.1 — RAS returns settled biomass to the head of the aeration train.
  q.Q_Pump_RAS =
    m.M_PlantRun &&
    !m.M_SafetyTrip &&
    m.M_PlantState >= ST_AERATION_ACTIVE &&
    m.M_PlantState !== ST_ALARM &&
    process.clarifierLevel > RAS_MIN_CLARIFIER_M &&
    inputs.AI_LT_AerationA < 5.5

  // Rung 5.2 — polymer coagulant dosing knocks down carry-over solids.
  q.Q_Pump_Coagulant =
    m.M_PlantRun &&
    !m.M_SafetyTrip &&
    m.M_PlantState >= ST_CLARIFYING &&
    m.M_PlantState !== ST_ALARM &&
    inputs.AI_Turbidity_Effluent > m.M_MaxTurbidity * COAGULANT_DOSE_FRACTION

  m.M_CoagulantRunMs = q.Q_Pump_Coagulant ? m.M_CoagulantRunMs + dtMs : m.M_CoagulantRunMs

  // =========================================================================
  // SECTION 6 — FB_WeirGateControl: motorised effluent sluice gate
  // =========================================================================
  const qualityOK = inputs.AI_Turbidity_Effluent < m.M_MaxTurbidity

  // Rung 6.1 — AUTO discharge permit latch.
  if (forceWeirShut || !m.M_PlantRun || !qualityOK) {
    m.M_WeirOpenCmd = false
  } else if (process.clarifierLevel >= CLARIFIER_DISCHARGE_M) {
    m.M_WeirOpenCmd = true
  } else if (process.clarifierLevel < CLARIFIER_DISCHARGE_STOP_M) {
    m.M_WeirOpenCmd = false
  }

  // Rung 6.2 — contactor commands, AUTO vs MANUAL jog.
  if (forceWeirShut) {
    q.Q_Motor_WeirOpen = false
    q.Q_Motor_WeirClose = !m.M_WeirClosedLS
  } else if (commands.Cmd_WeirManualMode) {
    q.Q_Motor_WeirOpen =
      commands.Cmd_WeirJogOpen && !commands.Cmd_WeirJogClose && !inputs.I_WeirOpenLS
    q.Q_Motor_WeirClose =
      commands.Cmd_WeirJogClose && !commands.Cmd_WeirJogOpen && !m.M_WeirClosedLS
  } else {
    q.Q_Motor_WeirOpen = m.M_WeirOpenCmd && !inputs.I_WeirOpenLS
    q.Q_Motor_WeirClose = !m.M_WeirOpenCmd && !m.M_WeirClosedLS
  }

  // Rung 6.3 — hard mutual exclusion on the reversing starter.
  if (q.Q_Motor_WeirOpen && q.Q_Motor_WeirClose) {
    q.Q_Motor_WeirOpen = false
    q.Q_Motor_WeirClose = false
  }

  // Rung 6.4 — derived closed position from the CLOSE travel timer (there is
  // no closed limit switch in the field I/O list).
  if (q.Q_Motor_WeirClose) {
    m.M_WeirCloseTimerMs += dtMs
    if (m.M_WeirCloseTimerMs >= WEIR_TRAVEL_MS) {
      m.M_WeirClosedLS = true
      q.Q_Motor_WeirClose = false
    }
  } else if (q.Q_Motor_WeirOpen) {
    m.M_WeirClosedLS = false
    m.M_WeirCloseTimerMs = 0
  }

  // =========================================================================
  // SECTION 7 — final safety enforcement: de-energise on trip or plant stop
  // =========================================================================
  if (m.M_SafetyTrip || !m.M_PlantRun) {
    q.Q_Pump_RawInfluent1 = false
    q.Q_Pump_RawInfluent2 = false
    q.Q_Blower_AerationA = false
    q.Q_Blower_AerationB = false
    q.Q_Pump_RAS = false
    q.Q_Pump_Coagulant = false
    q.AQ_VFD_InfluentSpeed = 0
    q.AQ_AirValve_Aeration = 0
  }

  return { outputs: q, internal: m, aerationDone }
}

interface StateTransitionInputs {
  aerationLevelA: number
  clarifierLevel: number
  turbidity: number
  maxTurbidity: number
  aerationDone: boolean
}

/** CASE M_PlantState OF … — SECTION 2 of wastewaterLogic.st. */
function nextPlantState(current: PlantState, t: StateTransitionInputs): PlantState {
  switch (current) {
    case ST_OFF:
    case ST_ALARM:
      return ST_EQUALIZING
    case ST_EQUALIZING:
      return t.aerationLevelA >= AERATION_MIN_LEVEL_M ? ST_AERATION_ACTIVE : ST_EQUALIZING
    case ST_AERATION_ACTIVE:
      if (t.aerationDone) return ST_CLARIFYING
      return t.aerationLevelA < AERATION_MIN_LEVEL_M ? ST_EQUALIZING : ST_AERATION_ACTIVE
    case ST_CLARIFYING:
      return t.clarifierLevel >= CLARIFIER_DISCHARGE_M && t.turbidity < t.maxTurbidity
        ? ST_EFFLUENT_DISCHARGE
        : ST_CLARIFYING
    case ST_EFFLUENT_DISCHARGE:
      return t.clarifierLevel < CLARIFIER_DISCHARGE_STOP_M ? ST_EQUALIZING : ST_EFFLUENT_DISCHARGE
    default:
      return ST_EQUALIZING
  }
}
