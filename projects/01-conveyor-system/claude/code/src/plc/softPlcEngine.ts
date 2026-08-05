import { usePlcStore } from '../store/usePlcStore'
import { advanceParts, dischargeCompletedParts, findSensorCrossing } from './beltSimulation'
import { runConveyorLogic } from './plcLogic'
import { COLOR_SPECIAL, type Part, type PlcInputs } from './types'

export interface PlcScanResult {
  timestamp: number
  cycleTimeMs: number
}

export type PlcScanCallback = (result: PlcScanResult) => void

/**
 * Cyclic soft-PLC scan engine. Each tick reproduces the classic IEC 61131-3
 * scan cycle - read inputs, execute logic, write outputs - at a fixed
 * ~50ms task period, matching the MAST task configuration documented in
 * ARCHITECTURE.md for the target M580 hardware.
 */
export class SoftPlcEngine {
  private intervalId: number | null = null
  private lastTickAt: number | null = null

  public constructor(private readonly cycleTimeMs = 50) {}

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

    // --- Read inputs (input image) -----------------------------------
    // Physical world advances using last scan's output speed reference,
    // matching real scan-cycle causality (outputs from scan N drive the
    // process that scan N+1's inputs observe).
    const movedParts = advanceParts(state.parts, state.outputs.VFD_Speed_Ref, this.cycleTimeMs)
    const crossing = findSensorCrossing(movedParts)

    const inputs: PlcInputs = {
      E_Stop: state.inputs.E_Stop,
      Sensor_PartDetect: crossing !== null,
      Sensor_Color: crossing ? crossing.color : state.inputs.Sensor_Color,
      Sensor_Weight: crossing ? crossing.weight : state.inputs.Sensor_Weight,
    }

    let partsAfterCrossing = movedParts
    if (crossing) {
      partsAfterCrossing = movedParts.map((part) =>
        part.id === crossing.id ? { ...part, evaluated: true } : part,
      )
    }

    const commands = state.consumeCommandPulses()

    // --- Execute logic (mirrors conveyorLogic.st) ----------------------
    const { outputs, internal } = runConveyorLogic({
      inputs,
      commands,
      internal: state.internal,
      outputs: state.outputs,
      dtMs: this.cycleTimeMs,
    })

    let partsAfterSort = partsAfterCrossing
    if (crossing) {
      partsAfterSort = partsAfterCrossing.map((part) =>
        part.id === crossing.id ? { ...part, rejected: internal.RejectLatched } : part,
      )
    }

    // --- Discharge / tally -------------------------------------------
    const { remaining, discharged } = dischargeCompletedParts(partsAfterSort)
    const counters = discharged.reduce(
      (acc, part: Part) => {
        acc.total += 1
        if (part.rejected) {
          acc.rejected += 1
        } else if (part.color === COLOR_SPECIAL) {
          acc.special += 1
        } else {
          acc.accepted += 1
        }
        return acc
      },
      { total: 0, accepted: 0, rejected: 0, special: 0 },
    )

    // --- Write outputs (output image) ----------------------------------
    usePlcStore.getState().applyScan({
      inputs,
      outputs,
      internal,
      parts: remaining,
      counters: {
        total: state.counters.total + counters.total,
        accepted: state.counters.accepted + counters.accepted,
        rejected: state.counters.rejected + counters.rejected,
        special: state.counters.special + counters.special,
      },
      metrics: {
        configuredCycleTimeMs: this.cycleTimeMs,
        lastCycleTimeMs: actualDtMs,
        scanCount: state.metrics.scanCount + 1,
        lastScanAt: Date.now(),
      },
    })

    return { timestamp: Date.now(), cycleTimeMs: actualDtMs }
  }
}

export const plcEngine = new SoftPlcEngine(50)
