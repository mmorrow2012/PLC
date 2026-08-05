import {
  usePlcStore,
  type PlcInputs,
  type PlcOutputs,
  type PlcSetpoints,
  type ProcessState,
} from '../store/usePlcStore'

/** Tank B is considered drained once its level falls to/below this, allowing DRAINING_BC -> IDLE. */
const TANK_B_DRAINED_THRESHOLD = 5.0
/** Proportional gain (Kp) for the Tank B drain-valve controller. */
const VALVE_PROPORTIONAL_GAIN = 5.0

/** Plant simulation rates (%/s) — there is no physical process behind this
 * demo, so the engine integrates a simple linear tank model driven by the
 * same output tags the control logic computes. Tanks are modelled as
 * equal capacity for simplicity. */
const FILL_RATE_A_PCT_PER_S = 8.0
const TRANSFER_RATE_AB_PCT_PER_S = 6.0
const DRAIN_RATE_BC_MAX_PCT_PER_S = 5.0
/** Constant downstream draw from Tank C so the demo cycles indefinitely instead of Tank C growing unbounded. */
const CONSUMPTION_RATE_C_PCT_PER_S = 1.5

const clampPct = (value: number) => Math.min(100, Math.max(0, value))

export interface ScanContext {
  state: ProcessState
  inputs: PlcInputs
  prevOutputs: PlcOutputs
  setpoints: PlcSetpoints
  startPulse: boolean
  stopPulse: boolean
}

export interface ScanResult {
  state: ProcessState
  outputs: PlcOutputs
}

/**
 * Pure evaluation of one PLC scan's control logic. Mirrors
 * `src/plc/threeTankLogic.st` 1:1 (overflow latch -> E-Stop interlock ->
 * sequencer -> output mapping -> tower light) and is intentionally kept
 * free of timing/store concerns so it can be unit tested in isolation.
 */
export function evaluateScan(ctx: ScanContext): ScanResult {
  const { inputs, setpoints, startPulse, stopPulse } = ctx
  let state = ctx.state

  // 1. Overflow protection — latched, independent of sequencer state.
  const overflowCondition =
    inputs.ltTankA >= 100.0 || inputs.ltTankB >= 100.0 || inputs.lshTankA || inputs.lshTankB

  let alarmOverflow = ctx.prevOutputs.alarmOverflow || overflowCondition

  // Manual reset: Start_PB acknowledges the latch, but only once the field
  // condition that caused it has actually cleared. Reset returns the
  // sequencer to IDLE; a further Start_PB press is required to re-enter
  // FILLING_A.
  if (alarmOverflow && startPulse && !overflowCondition) {
    alarmOverflow = false
    state = 'IDLE'
  }

  // 2. Safety interlock — E-Stop loss forces IDLE immediately.
  const eStopTripped = !inputs.eStop
  if (eStopTripped) {
    state = 'IDLE'
  }

  const interlocked = eStopTripped || alarmOverflow

  // 3. Sequencer — advances only while healthy. Stop_PB aborts to IDLE.
  if (!interlocked) {
    if (stopPulse) {
      state = 'IDLE'
    } else {
      switch (state) {
        case 'IDLE':
          if (startPulse) state = 'FILLING_A'
          break
        case 'FILLING_A':
          if (inputs.ltTankA >= setpoints.spLevelAHigh) state = 'TRANSFERRING_AB'
          break
        case 'TRANSFERRING_AB':
          if (inputs.ltTankB >= setpoints.spLevelBHigh) state = 'DRAINING_BC'
          break
        case 'DRAINING_BC':
          if (inputs.ltTankB <= TANK_B_DRAINED_THRESHOLD) state = 'IDLE'
          break
      }
    }
  }

  // 4. Output mapping.
  let pumpFillA = false
  let pumpTransferAB = false
  let valveDrainBCPos = 0.0

  if (eStopTripped) {
    // Requirement 4: pumps forced off, drain valve held fully closed.
    valveDrainBCPos = 0.0
  } else if (alarmOverflow) {
    // Requirement 3: pumps forced off; drain valve driven fully open as a
    // protective measure to actively relieve Tank B toward Tank C.
    valveDrainBCPos = 100.0
  } else {
    switch (state) {
      case 'FILLING_A':
        pumpFillA = true
        break
      case 'TRANSFERRING_AB':
        pumpTransferAB = true
        valveDrainBCPos = clampPct(VALVE_PROPORTIONAL_GAIN * (inputs.ltTankB - setpoints.spLevelBTarget))
        break
      case 'DRAINING_BC':
        valveDrainBCPos = 100.0
        break
      default:
        break
    }
  }

  // 5. Tower light status bitmask.
  const red = alarmOverflow || eStopTripped
  const green = !red && state !== 'IDLE'
  const yellow = !red && !green
  const alarmTower = (green ? 0b001 : 0) | (yellow ? 0b010 : 0) | (red ? 0b100 : 0)

  return {
    state,
    outputs: { pumpFillA, pumpTransferAB, valveDrainBCPos, alarmOverflow, alarmTower },
  }
}

interface ForceFlags {
  ltTankA: boolean
  ltTankB: boolean
  ltTankC: boolean
}

/** Integrates the linear tank plant model one scan forward. Forced tags
 * (see PlcForces) hold their current value and are skipped, mirroring
 * Control Expert I/O forcing. */
function simulatePlant(
  inputs: PlcInputs,
  outputs: PlcOutputs,
  forces: ForceFlags,
  dtSeconds: number,
): Pick<PlcInputs, 'ltTankA' | 'ltTankB' | 'ltTankC'> {
  const fillFlow = outputs.pumpFillA ? FILL_RATE_A_PCT_PER_S : 0
  const transferFlow = outputs.pumpTransferAB ? TRANSFER_RATE_AB_PCT_PER_S : 0
  const drainFlow = (outputs.valveDrainBCPos / 100) * DRAIN_RATE_BC_MAX_PCT_PER_S

  const ltTankA = forces.ltTankA
    ? inputs.ltTankA
    : clampPct(inputs.ltTankA + (fillFlow - transferFlow) * dtSeconds)

  const ltTankB = forces.ltTankB
    ? inputs.ltTankB
    : clampPct(inputs.ltTankB + (transferFlow - drainFlow) * dtSeconds)

  const ltTankC = forces.ltTankC
    ? inputs.ltTankC
    : clampPct(inputs.ltTankC + (drainFlow - CONSUMPTION_RATE_C_PCT_PER_S) * dtSeconds)

  return { ltTankA, ltTankB, ltTankC }
}

/**
 * Cyclic soft-PLC scan engine. Runs continuously once started — like a real
 * MAST task, the scan itself never stops; only the sequencer state (driven
 * by evaluateScan) reflects whether the process is running or idle.
 */
export class SoftPlcEngine {
  private intervalId: number | null = null

  public constructor(private readonly cycleTimeMs = 50) {}

  public start(): void {
    if (this.intervalId !== null) {
      return
    }

    const dtSeconds = this.cycleTimeMs / 1000

    this.intervalId = window.setInterval(() => {
      const store = usePlcStore.getState()

      const startPulse = store.startPbPulse
      const stopPulse = store.stopPbPulse
      if (startPulse) store.consumeStartPulse()
      if (stopPulse) store.consumeStopPulse()

      const { state, outputs } = evaluateScan({
        state: store.state,
        inputs: store.inputs,
        prevOutputs: store.outputs,
        setpoints: store.setpoints,
        startPulse,
        stopPulse,
      })

      const simulatedLevels = simulatePlant(store.inputs, outputs, store.forces, dtSeconds)

      store.applyScan({
        state,
        outputs,
        inputs: simulatedLevels,
        systemRunning: state !== 'IDLE',
      })
    }, this.cycleTimeMs)
  }

  public stop(): void {
    if (this.intervalId === null) {
      return
    }

    window.clearInterval(this.intervalId)
    this.intervalId = null
  }

  public isRunning(): boolean {
    return this.intervalId !== null
  }
}
