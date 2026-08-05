/**
 * First-order plant model of the wastewater works.
 *
 * This is PLANT SIMULATION, not control logic — it exists purely to give the
 * soft-PLC something physical to act on. Every transmitter reading the PLC
 * consumes (%IW100 … %IW108) and every float switch (%I0.4 … %I0.6) is
 * DERIVED from this model, exactly as a real instrument would be. The
 * control program in `wastewaterLogic.ts` never reads this module.
 *
 * Hydraulic train:
 *
 *   raw sewage ──▶ Equalization ──[influent pumps/VFD]──▶ Primary Clarifier
 *                                                              │ overflow weir
 *                                        ┌─────────────────────┴──────────┐
 *                                        ▼                                ▼
 *                                  Aeration A                       Aeration B
 *                                        └──────────[transfer weir]───────┘
 *                                                       ▼
 *                                             Secondary Clarifier
 *                                              │ RAS pump      │ motorised weir gate
 *                                              └──▶ aeration   └──▶ outfall
 */

import {
  AERATION_MAX_M,
  EQ_BASIN_MAX_M,
  PRIMARY_CLARIFIER_MAX_M,
  SECONDARY_CLARIFIER_MAX_M,
  TURBIDITY_MAX_NTU,
  WEIR_TRAVEL_MS,
  clamp,
} from './types'
import type { PlcOutputs } from './types'

/** Live physical state of the works. */
export interface PlantModel {
  /** Equalization basin level (0 … 10.0 m) → %IW100. */
  eqBasinLevel: number
  /** Primary clarifier level (0 … 4.0 m) — no transmitter, visualiser only. */
  primaryLevel: number
  /** Aeration basin A level (0 … 6.0 m) → %IW102. */
  aerationALevel: number
  /** Aeration basin B level (0 … 6.0 m) → %IW104. */
  aerationBLevel: number
  /** Secondary clarifier level (0 … 4.0 m) → FB_WeirGateControl.ClarifierLevel. */
  clarifierLevel: number
  /** Dissolved oxygen in basin A (0 … 10.0 mg/L) → %IW106. */
  dissolvedOxygen: number
  /** Effluent turbidity (0 … 100.0 NTU) → %IW108. */
  turbidity: number
  /** Motorised weir gate travel, 0 % closed … 100 % fully open. */
  weirPosition: number
  /** Cumulative treated effluent discharged to the outfall (m³, arbitrary scale). */
  dischargedVolume: number
}

/** Operator-adjustable simulation knobs (field simulation panel, not PLC I/O). */
export interface PlantDisturbances {
  /** Raw sewage catchment inflow, 0 … 100 % of storm capacity. */
  rawInflowPct: number
  /** Pending turbidity shock load to inject on the next scan (NTU). */
  turbidityShockNtu: number
  /**
   * Manual storm bypass penstock to the overflow tank. Hand-wound in the
   * field, so it is deliberately NOT a PLC output — it is the operator's only
   * way to drain the equalization basin while a safety trip has the influent
   * pumps inhibited, and therefore the recovery path out of a %I0.4
   * high-high flooding trip.
   */
  bypassDrainOpen: boolean
}

// --- Vessel plan areas (relative; converts volumetric flow to level rate) ---
const AREA = {
  eq: 1.0,
  primary: 0.7,
  aeration: 0.9,
  clarifier: 1.1,
} as const

// --- Hydraulic constants ----------------------------------------------------
/** Catchment inflow at 100 % storm loading (flow units/s). */
const RAW_INFLOW_MAX = 0.75
/** Combined influent pump capacity, both pumps at 100 % VFD reference. */
const PUMP_CAPACITY = 0.5
/** Primary clarifier overflow weir crest height (m). */
const PRIMARY_WEIR_M = 1.2
const PRIMARY_WEIR_K = 0.9
/** Aeration basin transfer weir crest height (m). */
const AERATION_WEIR_M = 3.0
const AERATION_WEIR_K = 0.8
/** Secondary clarifier outfall capacity at 100 % gate travel. */
const DISCHARGE_K = 0.7
/** Return activated sludge recirculation flow. */
const RAS_FLOW = 0.1
/** Manual storm bypass penstock discharge capacity. */
const BYPASS_DRAIN_FLOW = 0.9
/**
 * Mechanical gate travel is commissioned ~5 % faster than the PLC's 4 s close
 * timer, so the gate physically seats before the timer derives ClosedLS —
 * the same margin you would dial into a real travel-timeout setting.
 */
const GATE_TRAVEL_MS = WEIR_TRAVEL_MS * 0.95

// --- Water quality constants ------------------------------------------------
/** Oxygen transfer rate into basin A at 100 % air valve travel (mg/L per s). */
const O2_TRANSFER = 0.55
/** Biological oxygen uptake rate of the mixed liquor (mg/L per s). */
const O2_UPTAKE = 0.18
/** Turbidity floor with a healthy, lightly-loaded plant (NTU). */
const TURBIDITY_BASE_NTU = 3
/** Additional turbidity at full hydraulic loading — short-circuiting solids. */
const TURBIDITY_LOAD_NTU = 14
/** Turbidity knocked down by polymer coagulant dosing (NTU). */
const TURBIDITY_COAGULANT_NTU = 14
/** First-order settling response rate (per second). */
const TURBIDITY_TAU = 0.25

// --- Float switch trip points ----------------------------------------------
/** %I0.4 high-high float, equalization basin (m). */
export const LSH_EQ_TRIP_M = 9.5
/** %I0.5 / %I0.6 high float, aeration basins (m). */
export const LSH_AERATION_TRIP_M = 5.6

export function createInitialPlant(): PlantModel {
  return {
    eqBasinLevel: 0.4,
    primaryLevel: 0.2,
    aerationALevel: 1.6,
    aerationBLevel: 1.6,
    clarifierLevel: 0.3,
    dissolvedOxygen: 0.4,
    turbidity: 4.0,
    weirPosition: 0,
    dischargedVolume: 0,
  }
}

export function createInitialDisturbances(): PlantDisturbances {
  return {
    rawInflowPct: 22,
    turbidityShockNtu: 0,
    bypassDrainOpen: false,
  }
}

/**
 * Advance the plant one scan period using LAST scan's output image — this
 * reproduces real scan-cycle causality, where the actuators written at the
 * end of scan N drive the process that scan N+1's inputs observe.
 */
export function advancePlant(
  plant: PlantModel,
  outputs: PlcOutputs,
  disturbances: PlantDisturbances,
  dtMs: number,
): PlantModel {
  const dt = dtMs / 1000
  const next: PlantModel = { ...plant }

  // --- Motorised weir gate travel ------------------------------------------
  const travelPerScan = (100 / GATE_TRAVEL_MS) * dtMs
  if (outputs.Q_Motor_WeirOpen) {
    next.weirPosition = clamp(plant.weirPosition + travelPerScan, 0, 100)
  } else if (outputs.Q_Motor_WeirClose) {
    next.weirPosition = clamp(plant.weirPosition - travelPerScan, 0, 100)
  }

  // --- Volumetric flows ----------------------------------------------------
  const qRaw = RAW_INFLOW_MAX * (disturbances.rawInflowPct / 100)

  const pumpsRunning =
    (outputs.Q_Pump_RawInfluent1 ? 1 : 0) + (outputs.Q_Pump_RawInfluent2 ? 1 : 0)
  const qPumpDemand = PUMP_CAPACITY * (pumpsRunning / 2) * (outputs.AQ_VFD_InfluentSpeed / 100)
  // A pump can only move what is actually in the wet well this scan.
  const qPump = Math.min(qPumpDemand, (plant.eqBasinLevel * AREA.eq) / dt)
  const qBypass = disturbances.bypassDrainOpen
    ? Math.min(BYPASS_DRAIN_FLOW, (plant.eqBasinLevel * AREA.eq) / dt)
    : 0

  const qPrimaryOut = PRIMARY_WEIR_K * Math.max(0, plant.primaryLevel - PRIMARY_WEIR_M)
  const qAerationOutA = AERATION_WEIR_K * Math.max(0, plant.aerationALevel - AERATION_WEIR_M)
  const qAerationOutB = AERATION_WEIR_K * Math.max(0, plant.aerationBLevel - AERATION_WEIR_M)
  const qRas = outputs.Q_Pump_RAS && plant.clarifierLevel > 0.05 ? RAS_FLOW : 0
  const qDischarge =
    (plant.weirPosition / 100) * DISCHARGE_K * clamp(plant.clarifierLevel / 0.5, 0, 1)

  // --- Vessel mass balances -------------------------------------------------
  next.eqBasinLevel = clamp(
    plant.eqBasinLevel + ((qRaw - qPump - qBypass) / AREA.eq) * dt,
    0,
    EQ_BASIN_MAX_M,
  )
  next.primaryLevel = clamp(
    plant.primaryLevel + ((qPump - qPrimaryOut) / AREA.primary) * dt,
    0,
    PRIMARY_CLARIFIER_MAX_M,
  )
  next.aerationALevel = clamp(
    plant.aerationALevel + ((qPrimaryOut / 2 + qRas / 2 - qAerationOutA) / AREA.aeration) * dt,
    0,
    AERATION_MAX_M,
  )
  next.aerationBLevel = clamp(
    plant.aerationBLevel + ((qPrimaryOut / 2 + qRas / 2 - qAerationOutB) / AREA.aeration) * dt,
    0,
    AERATION_MAX_M,
  )
  next.clarifierLevel = clamp(
    plant.clarifierLevel +
      ((qAerationOutA + qAerationOutB - qRas - qDischarge) / AREA.clarifier) * dt,
    0,
    SECONDARY_CLARIFIER_MAX_M,
  )
  next.dischargedVolume = plant.dischargedVolume + qDischarge * dt

  // --- Dissolved oxygen ------------------------------------------------------
  const aeratingA = outputs.Q_Blower_AerationA ? outputs.AQ_AirValve_Aeration / 100 : 0
  const uptake = O2_UPTAKE * (0.55 + qPrimaryOut)
  next.dissolvedOxygen = clamp(
    plant.dissolvedOxygen + (O2_TRANSFER * aeratingA - uptake) * dt,
    0,
    10,
  )

  // --- Effluent turbidity ----------------------------------------------------
  let turbidityTarget =
    TURBIDITY_BASE_NTU + TURBIDITY_LOAD_NTU * clamp(qPump / PUMP_CAPACITY, 0, 1)
  if (outputs.Q_Pump_Coagulant) {
    turbidityTarget -= TURBIDITY_COAGULANT_NTU
  }
  turbidityTarget = clamp(turbidityTarget, 1, TURBIDITY_MAX_NTU)
  next.turbidity = clamp(
    plant.turbidity + (turbidityTarget - plant.turbidity) * TURBIDITY_TAU * dt +
      disturbances.turbidityShockNtu,
    0,
    TURBIDITY_MAX_NTU,
  )

  return next
}

/** Fraction of the tank each level represents, for the SVG visualiser. */
export const VESSEL_SPAN = {
  eq: EQ_BASIN_MAX_M,
  primary: PRIMARY_CLARIFIER_MAX_M,
  aeration: AERATION_MAX_M,
  clarifier: SECONDARY_CLARIFIER_MAX_M,
} as const
