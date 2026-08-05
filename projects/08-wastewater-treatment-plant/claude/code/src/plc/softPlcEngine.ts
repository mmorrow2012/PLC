import { usePlcStore } from '../store/usePlcStore'
import {
  LSH_AERATION_TRIP_M,
  LSH_EQ_TRIP_M,
  advancePlant,
} from './plantSimulation'
import { SCAN_CYCLE_MS } from './types'
import type { PlcInputs, PlcOutputs } from './types'
import { runWastewaterLogic } from './wastewaterLogic'

export interface PlcScanResult {
  timestamp: number
  cycleTimeMs: number
}

export type PlcScanCallback = (result: PlcScanResult) => void

/**
 * Cyclic soft-PLC scan engine.
 *
 * Every tick reproduces the classic IEC 61131-3 scan cycle at the 50 ms MAST
 * task period documented in ARCHITECTURE.md:
 *
 *   1. advance the plant using LAST scan's output image (scan causality)
 *   2. READ INPUTS  — build the input image from the field instruments
 *   3. apply HMI forces to the input image (animation-table "Force Value")
 *   4. EXECUTE LOGIC — runWastewaterLogic(), the port of wastewaterLogic.st
 *   5. apply HMI forces to the output image
 *   6. WRITE OUTPUTS — publish the new process image to the store
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

    // --- 1. Advance the physical plant with last scan's outputs -------------
    const plant = advancePlant(state.plant, state.outputs, state.disturbances, this.cycleTimeMs)

    // --- 2. READ INPUTS ----------------------------------------------------
    // Analog channels and float switches come off the plant model; the E-Stop
    // and the three momentary pushbuttons are latched by the HMI.
    const inputs: PlcInputs = {
      I_EStop_NC: state.inputs.I_EStop_NC,
      I_PlantStart_PB: state.inputs.I_PlantStart_PB,
      I_PlantStop_PB: state.inputs.I_PlantStop_PB,
      I_ResetFault_PB: state.inputs.I_ResetFault_PB,
      I_LSH_Equalization: plant.eqBasinLevel >= LSH_EQ_TRIP_M,
      I_LSH_AerationA: plant.aerationALevel >= LSH_AERATION_TRIP_M,
      I_LSH_AerationB: plant.aerationBLevel >= LSH_AERATION_TRIP_M,
      I_WeirOpenLS: plant.weirPosition >= 100,
      AI_LT_EqBasin: plant.eqBasinLevel,
      AI_LT_AerationA: plant.aerationALevel,
      AI_LT_AerationB: plant.aerationBLevel,
      AI_DO_AerationA: plant.dissolvedOxygen,
      AI_Turbidity_Effluent: plant.turbidity,
    }

    // --- 3. Forced inputs must be seen BY the logic, not just displayed -----
    applyForces(inputs, state.forces)

    // --- 4. EXECUTE LOGIC (mirrors wastewaterLogic.st) ----------------------
    const { outputs, internal } = runWastewaterLogic({
      inputs,
      commands: state.commands,
      internal: state.internal,
      outputs: state.outputs,
      process: { clarifierLevel: plant.clarifierLevel },
      dtMs: this.cycleTimeMs,
    })

    // --- 5. Forced outputs override the solved coil state -------------------
    applyForces(outputs, state.forces)

    // --- 6. WRITE OUTPUTS ---------------------------------------------------
    const store = usePlcStore.getState()
    store.applyScan({
      inputs,
      outputs,
      internal,
      plant,
      metrics: {
        configuredCycleTimeMs: this.cycleTimeMs,
        lastCycleTimeMs: actualDtMs,
        scanCount: state.metrics.scanCount + 1,
        lastScanAt: Date.now(),
      },
    })
    // Momentary pushbuttons have now been seen by a full scan — release them.
    store.consumePulses()

    return { timestamp: Date.now(), cycleTimeMs: actualDtMs }
  }
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
