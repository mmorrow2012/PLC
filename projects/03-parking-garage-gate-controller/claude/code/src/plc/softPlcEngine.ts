import { usePlcStore } from '../store/usePlcStore'
import { runParkingGateLogic } from './gateLogic'
import { advanceGateAngle, GATE_ANGLE_CLOSED, GATE_ANGLE_OPEN } from './gateSimulation'
import type { PlcInputs } from './types'

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
    // The gate arm advances using last scan's output motor commands,
    // matching real scan-cycle causality (outputs from scan N drive the
    // process that scan N+1's inputs observe).
    const gateAngle = advanceGateAngle(
      state.gateAngle,
      state.outputs.Motor_GateUp,
      state.outputs.Motor_GateDown,
      state.gateJammed,
      this.cycleTimeMs,
    )

    const inputs: PlcInputs = {
      E_Stop: state.inputs.E_Stop,
      Sensor_VehiclePresence: state.inputs.Sensor_VehiclePresence,
      Sensor_GateOpenLimit: gateAngle >= GATE_ANGLE_OPEN,
      Sensor_GateClosedLimit: gateAngle <= GATE_ANGLE_CLOSED,
      Sensor_Obstruction: state.inputs.Sensor_Obstruction,
    }

    const commands = state.commands

    // --- Execute logic (mirrors parkingGateLogic.st) --------------------
    const { outputs, internal } = runParkingGateLogic({
      inputs,
      commands,
      internal: state.internal,
      outputs: state.outputs,
      dtMs: this.cycleTimeMs,
    })

    // --- Write outputs (output image) -----------------------------------
    usePlcStore.getState().applyScan({
      inputs,
      outputs,
      internal,
      gateAngle,
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
