import { create } from 'zustand'
import { createInitialInternal, createInitialOutputs } from '../plc/plcLogic'
import {
  COLOR_ACCEPT,
  COLOR_REJECT,
  COLOR_SPECIAL,
  type Part,
  type PartColor,
  type PlcCommands,
  type PlcInputs,
  type PlcInternal,
  type PlcOutputs,
} from '../plc/types'

/** Union of every I/O tag name that can be force-overridden from the HMI, mirroring
 * the "Force Value" feature in EcoStruxure Control Expert's animation tables. */
export type ForceableTag = keyof PlcInputs | keyof PlcOutputs
export type ForceValue = boolean | number

export interface ScanMetrics {
  configuredCycleTimeMs: number
  lastCycleTimeMs: number
  scanCount: number
  lastScanAt: number
}

export interface PartCounters {
  nextPartId: number
  accepted: number
  rejected: number
  special: number
  total: number
}

export interface ApplyScanPayload {
  inputs: PlcInputs
  outputs: PlcOutputs
  internal: PlcInternal
  parts: Part[]
  counters: Partial<PartCounters>
  metrics: Partial<ScanMetrics>
}

export interface PlcStoreState {
  inputs: PlcInputs
  commands: PlcCommands
  outputs: PlcOutputs
  internal: PlcInternal
  parts: Part[]
  counters: PartCounters
  metrics: ScanMetrics
  forces: Partial<Record<ForceableTag, ForceValue>>
  engineRunning: boolean

  // HMI operator actions -----------------------------------------------
  setEStop: (healthy: boolean) => void
  pulseStart: () => void
  pulseStop: () => void
  pulseManualReset: () => void
  setSpeedSetpoint: (value: number) => void
  spawnPart: (color: PartColor, weight: number) => void
  setForce: (tag: ForceableTag, value: ForceValue) => void
  clearForce: (tag: ForceableTag) => void
  clearAllForces: () => void
  systemReset: () => void
  setEngineRunning: (running: boolean) => void

  // Consumed by softPlcEngine.ts only ------------------------------------
  consumeCommandPulses: () => PlcCommands
  applyScan: (payload: ApplyScanPayload) => void
}

const initialInputs: PlcInputs = {
  E_Stop: true,
  Sensor_PartDetect: false,
  Sensor_Color: COLOR_ACCEPT,
  Sensor_Weight: 0,
}

const initialCommands: PlcCommands = {
  Cmd_Start: false,
  Cmd_Stop: false,
  Cmd_ManualReset: false,
  Speed_Setpoint: 75,
}

const initialCounters: PartCounters = {
  nextPartId: 1,
  accepted: 0,
  rejected: 0,
  special: 0,
  total: 0,
}

const initialMetrics: ScanMetrics = {
  configuredCycleTimeMs: 50,
  lastCycleTimeMs: 0,
  scanCount: 0,
  lastScanAt: 0,
}

export { COLOR_ACCEPT, COLOR_REJECT, COLOR_SPECIAL }

export const usePlcStore = create<PlcStoreState>((set, get) => ({
  inputs: { ...initialInputs },
  commands: { ...initialCommands },
  outputs: createInitialOutputs(),
  internal: createInitialInternal(),
  parts: [],
  counters: { ...initialCounters },
  metrics: { ...initialMetrics },
  forces: {},
  engineRunning: false,

  setEStop: (healthy) =>
    set((state) => {
      if ('E_Stop' in state.forces) return state
      return { inputs: { ...state.inputs, E_Stop: healthy } }
    }),

  pulseStart: () => set((state) => ({ commands: { ...state.commands, Cmd_Start: true } })),
  pulseStop: () => set((state) => ({ commands: { ...state.commands, Cmd_Stop: true } })),
  pulseManualReset: () => set((state) => ({ commands: { ...state.commands, Cmd_ManualReset: true } })),

  setSpeedSetpoint: (value) =>
    set((state) => ({
      commands: { ...state.commands, Speed_Setpoint: Math.max(0, Math.min(100, value)) },
    })),

  spawnPart: (color, weight) =>
    set((state) => {
      const part: Part = {
        id: state.counters.nextPartId,
        position: 0,
        color,
        weight,
        evaluated: false,
        rejected: false,
        diverted: false,
      }
      return {
        parts: [...state.parts, part],
        counters: { ...state.counters, nextPartId: state.counters.nextPartId + 1 },
      }
    }),

  setForce: (tag, value) => set((state) => ({ forces: { ...state.forces, [tag]: value } })),

  clearForce: (tag) =>
    set((state) => {
      const forces = { ...state.forces }
      delete forces[tag]
      return { forces }
    }),

  clearAllForces: () => set({ forces: {} }),

  systemReset: () =>
    set(() => ({
      inputs: { ...initialInputs },
      commands: { ...initialCommands },
      outputs: createInitialOutputs(),
      internal: createInitialInternal(),
      parts: [],
      counters: { ...initialCounters },
      metrics: { ...initialMetrics },
      forces: {},
    })),

  setEngineRunning: (running) => set({ engineRunning: running }),

  consumeCommandPulses: () => {
    const commands = get().commands
    set((state) => ({
      commands: { ...state.commands, Cmd_Start: false, Cmd_Stop: false, Cmd_ManualReset: false },
    }))
    return commands
  },

  applyScan: ({ inputs, outputs, internal, parts, counters, metrics }) =>
    set((state) => {
      const forcedInputs = { ...inputs }
      const forcedOutputs = { ...outputs }
      for (const [tag, value] of Object.entries(state.forces)) {
        if (tag in forcedInputs) {
          ;(forcedInputs as Record<string, ForceValue>)[tag] = value as ForceValue
        } else if (tag in forcedOutputs) {
          ;(forcedOutputs as Record<string, ForceValue>)[tag] = value as ForceValue
        }
      }
      return {
        inputs: forcedInputs,
        outputs: forcedOutputs,
        internal,
        parts,
        counters: { ...state.counters, ...counters },
        metrics: { ...state.metrics, ...metrics },
      }
    }),
}))
