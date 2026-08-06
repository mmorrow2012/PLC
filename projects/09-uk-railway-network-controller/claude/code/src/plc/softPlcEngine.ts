import { usePlcStore } from '../store/usePlcStore'
import type { PointMachine } from '../store/usePlcStore'
import { advanceNetwork, trainBlock } from './networkSimulation'
import type { NetworkModel } from './networkSimulation'
import { runRailwayLogic } from './railwayLogic'
import { AXLE_COUNTER_BLOCK, BLOCK_BY_ID, POINT_SWING_MS, SCAN_CYCLE_MS } from './types'
import type { PlcInputs, PlcOutputs, ServiceId } from './types'

export interface PlcScanResult {
  timestamp: number
  cycleTimeMs: number
}

export type PlcScanCallback = (result: PlcScanResult) => void

/**
 * Cyclic soft-PLC scan engine.
 *
 * Every tick reproduces the IEC 61131-3 scan cycle at the 50 ms MAST task
 * period documented in ARCHITECTURE.md:
 *
 *   1. drive the point machine from LAST scan's %Q0.4 / %Q0.5 contactors
 *   2. advance the railway using LAST scan's output image (scan causality)
 *   3. READ INPUTS  — build the input image from the axle counters and ATP
 *   4. apply HMI forces to the input image (animation-table "Force Value")
 *   5. EXECUTE LOGIC — runRailwayLogic(), the port of railwayLogic.st
 *   6. apply HMI forces to the output image
 *   7. WRITE OUTPUTS — publish the new process image to the store
 */
export class SoftPlcEngine {
  private intervalId: number | null = null
  private lastTickAt: number | null = null

  public constructor(private readonly cycleTimeMs = SCAN_CYCLE_MS) {}

  public start(onScan?: PlcScanCallback): void {
    if (this.intervalId !== null) {
      return
    }
    this.lastTickAt = performance.now()
    this.intervalId = window.setInterval(() => {
      const result = this.tick()
      onScan?.(result)
    }, this.cycleTimeMs)
    usePlcStore.getState().setEngineRunning(true)
  }

  public stop(): void {
    if (this.intervalId === null) {
      return
    }
    window.clearInterval(this.intervalId)
    this.intervalId = null
    usePlcStore.getState().setEngineRunning(false)
  }

  public isRunning(): boolean {
    return this.intervalId !== null
  }

  private tick(): PlcScanResult {
    const now = performance.now()
    const actualDtMs = this.lastTickAt !== null ? now - this.lastTickAt : this.cycleTimeMs
    this.lastTickAt = now

    const state = usePlcStore.getState()

    // --- 1. Point machine --------------------------------------------------
    const point = advancePoint(state.point, state.outputs, state.internal.M_PointReverseCmd, this.cycleTimeMs)

    // --- 2. Advance the railway with last scan's outputs -------------------
    const network = advanceNetwork(state.network, {
      outputs: state.outputs,
      internal: state.internal,
      aspects: state.aspects,
      stopOverride: {
        IC1: state.commands.stopOverride1,
        IC2: state.commands.stopOverride2,
      },
      pointReverse: point.commandedReverse,
      pointsProven: point.detected,
      clockSeconds: state.internal.M_ClockSeconds,
      dtMs: this.cycleTimeMs,
    })

    // --- 3. READ INPUTS ----------------------------------------------------
    const inputs: PlcInputs = {
      I_EStop_NC: state.inputs.I_EStop_NC,
      I_MasterRun_PB: state.inputs.I_MasterRun_PB,
      I_ResetFault_PB: state.inputs.I_ResetFault_PB,
      I_AxleCounter_London: Boolean(network.blockOccupancy[AXLE_COUNTER_BLOCK.I_AxleCounter_London]),
      I_AxleCounter_Brum: Boolean(network.blockOccupancy[AXLE_COUNTER_BLOCK.I_AxleCounter_Brum]),
      I_AxleCounter_Manchester: Boolean(
        network.blockOccupancy[AXLE_COUNTER_BLOCK.I_AxleCounter_Manchester],
      ),
      I_AxleCounter_Edinburgh: Boolean(
        network.blockOccupancy[AXLE_COUNTER_BLOCK.I_AxleCounter_Edinburgh],
      ),
      I_PointSwitch_Normal: point.detected,
      AI_TractionSpeed_Intercity1: speedOf(network, 'IC1'),
      AI_TractionSpeed_Intercity2: speedOf(network, 'IC2'),
      AI_TrackCurvature_Limit: atpLimitOf(network, 'IC1'),
    }

    // --- 4. Forced inputs must be seen BY the logic, not just displayed -----
    applyForces(inputs, state.forces)

    // --- 5. EXECUTE LOGIC (mirrors railwayLogic.st) ------------------------
    const solved = runRailwayLogic({
      inputs,
      commands: state.commands,
      internal: state.internal,
      outputs: state.outputs,
      network,
      dtMs: this.cycleTimeMs,
    })

    // --- 6. Forced outputs override the solved coil state ------------------
    applyForces(solved.outputs, state.forces)

    // --- 7. WRITE OUTPUTS ---------------------------------------------------
    const store = usePlcStore.getState()
    store.applyScan({
      inputs,
      outputs: solved.outputs,
      internal: solved.internal,
      network,
      point,
      aspects: solved.aspects,
      occupancy: solved.occupancy,
      timetable: solved.timetable,
      registers: solved.registers,
      delays: solved.delays,
      metrics: {
        configuredCycleTimeMs: this.cycleTimeMs,
        lastCycleTimeMs: actualDtMs,
        scanCount: state.metrics.scanCount + 1,
        lastScanAt: Date.now(),
      },
    })
    store.consumePulses()

    return { timestamp: Date.now(), cycleTimeMs: actualDtMs }
  }
}

function speedOf(network: NetworkModel, id: ServiceId): number {
  const train = network.trains.find((candidate) => candidate.id === id)
  return train ? Math.round(train.speedKmh * 10) / 10 : 0
}

/** ATP curvature telegram broadcast to the lead service, km/h. */
function atpLimitOf(network: NetworkModel, id: ServiceId): number {
  const train = network.trains.find((candidate) => candidate.id === id)
  if (!train) return 200
  return BLOCK_BY_ID[trainBlock(train)]?.lineSpeedKmh ?? 200
}

/**
 * Models the point machine and its detection contacts. Detection drops out as
 * soon as the switch rails start to move and only re-proves once they are
 * closed and locked in the commanded lie.
 */
function advancePoint(
  point: PointMachine,
  outputs: PlcOutputs,
  commandedReverse: boolean,
  dtMs: number,
): PointMachine {
  if (commandedReverse !== point.commandedReverse) {
    return {
      commandedReverse,
      provenReverse: point.provenReverse,
      swingRemainingMs: POINT_SWING_MS,
      detected: false,
    }
  }
  if (point.swingRemainingMs > 0) {
    // The contactor has to stay picked up for the rails to keep moving.
    const driving = outputs.Q_PointMotor_AlignMain || outputs.Q_PointMotor_AlignBranch
    const swingRemainingMs = driving ? point.swingRemainingMs - dtMs : point.swingRemainingMs
    if (swingRemainingMs > 0) {
      return { ...point, swingRemainingMs, detected: false }
    }
    return {
      commandedReverse,
      provenReverse: commandedReverse,
      swingRemainingMs: 0,
      detected: true,
    }
  }
  return point
}

function applyForces(
  image: PlcInputs | PlcOutputs,
  forces: Partial<Record<string, boolean>>,
): void {
  const record = image as unknown as Record<string, boolean | number>
  for (const [tag, value] of Object.entries(forces)) {
    if (value !== undefined && tag in record) {
      record[tag] = value
    }
  }
}

export const plcEngine = new SoftPlcEngine(SCAN_CYCLE_MS)
