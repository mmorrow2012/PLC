import { create } from 'zustand'
import { createInitialInternal, createInitialOutputs } from '../plc/gateLogic'
import { GATE_ANGLE_CLOSED } from '../plc/gateSimulation'
import type { PlcCommands, PlcInputs, PlcInternal, PlcOutputs } from '../plc/types'

/** Union of every I/O tag name that can be force-overridden from the HMI, mirroring
 * the "Force Value" feature in EcoStruxure Control Expert's animation tables. */
export type ForceableTag = keyof PlcInputs | keyof PlcOutputs
export type ForceValue = boolean

export interface ScanMetrics {
  configuredCycleTimeMs: number
  lastCycleTimeMs: number
  scanCount: number
  lastScanAt: number
}

export interface ApplyScanPayload {
  inputs: PlcInputs
  outputs: PlcOutputs
  internal: PlcInternal
  gateAngle: number
  metrics: Partial<ScanMetrics>
}

export interface PlcStoreState {
  inputs: PlcInputs
  commands: PlcCommands
  outputs: PlcOutputs
  internal: PlcInternal
  gateAngle: number
  gateJammed: boolean
  metrics: ScanMetrics
  forces: Partial<Record<ForceableTag, ForceValue>>
  engineRunning: boolean

  // HMI operator actions -----------------------------------------------
  setEStop: (healthy: boolean) => void
  setVehiclePresence: (present: boolean) => void
  setObstruction: (present: boolean) => void
  setGateJammed: (jammed: boolean) => void
  /** PB_ManualOpen / PB_ManualClose are momentary pushbuttons modeled as a held
   * contact (true while pressed) rather than a single-scan pulse, since the
   * stuck-gate recovery jog (parkingGateLogic.st section 5) requires the
   * operator to hold the button down across multiple scans. */
  setManualOpen: (pressed: boolean) => void
  setManualClose: (pressed: boolean) => void
  setForce: (tag: ForceableTag, value: ForceValue) => void
  clearForce: (tag: ForceableTag) => void
  systemReset: () => void
  setEngineRunning: (running: boolean) => void

  applyScan: (payload: ApplyScanPayload) => void
}

const initialInputs: PlcInputs = {
  E_Stop: true,
  Sensor_VehiclePresence: false,
  Sensor_GateOpenLimit: false,
  Sensor_GateClosedLimit: true,
  Sensor_Obstruction: false,
}

const initialCommands: PlcCommands = {
  PB_ManualOpen: false,
  PB_ManualClose: false,
}

const initialMetrics: ScanMetrics = {
  configuredCycleTimeMs: 50,
  lastCycleTimeMs: 0,
  scanCount: 0,
  lastScanAt: 0,
}

export const usePlcStore = create<PlcStoreState>((set) => ({
  inputs: { ...initialInputs },
  commands: { ...initialCommands },
  outputs: createInitialOutputs(),
  internal: createInitialInternal(),
  gateAngle: GATE_ANGLE_CLOSED,
  gateJammed: false,
  metrics: { ...initialMetrics },
  forces: {},
  engineRunning: false,

  setEStop: (healthy) =>
    set((state) => {
      if ('E_Stop' in state.forces) return state
      return { inputs: { ...state.inputs, E_Stop: healthy } }
    }),

  setVehiclePresence: (present) =>
    set((state) => {
      if ('Sensor_VehiclePresence' in state.forces) return state
      return { inputs: { ...state.inputs, Sensor_VehiclePresence: present } }
    }),

  setObstruction: (present) =>
    set((state) => {
      if ('Sensor_Obstruction' in state.forces) return state
      return { inputs: { ...state.inputs, Sensor_Obstruction: present } }
    }),

  setGateJammed: (jammed) => set({ gateJammed: jammed }),

  setManualOpen: (pressed) => set((state) => ({ commands: { ...state.commands, PB_ManualOpen: pressed } })),
  setManualClose: (pressed) => set((state) => ({ commands: { ...state.commands, PB_ManualClose: pressed } })),

  setForce: (tag, value) => set((state) => ({ forces: { ...state.forces, [tag]: value } })),

  clearForce: (tag) =>
    set((state) => {
      const forces = { ...state.forces }
      delete forces[tag]
      return { forces }
    }),

  systemReset: () =>
    set(() => ({
      inputs: { ...initialInputs },
      commands: { ...initialCommands },
      outputs: createInitialOutputs(),
      internal: createInitialInternal(),
      gateAngle: GATE_ANGLE_CLOSED,
      gateJammed: false,
      metrics: { ...initialMetrics },
      forces: {},
    })),

  setEngineRunning: (running) => set({ engineRunning: running }),

  applyScan: ({ inputs, outputs, internal, gateAngle, metrics }) =>
    set((state) => {
      const forcedInputs = { ...inputs }
      const forcedOutputs = { ...outputs }
      for (const [tag, value] of Object.entries(state.forces)) {
        if (tag in forcedInputs) {
          ;(forcedInputs as Record<string, ForceValue>)[tag] = value
        } else if (tag in forcedOutputs) {
          ;(forcedOutputs as Record<string, ForceValue>)[tag] = value
        }
      }
      return {
        inputs: forcedInputs,
        outputs: forcedOutputs,
        internal,
        gateAngle,
        metrics: { ...state.metrics, ...metrics },
      }
    }),
}))
