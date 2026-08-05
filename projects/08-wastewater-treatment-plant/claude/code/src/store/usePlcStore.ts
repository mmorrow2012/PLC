import { create } from 'zustand'
import {
  createInitialDisturbances,
  createInitialPlant,
  type PlantDisturbances,
  type PlantModel,
} from '../plc/plantSimulation'
import { createInitialInternal, createInitialOutputs } from '../plc/wastewaterLogic'
import { SCAN_CYCLE_MS, clamp } from '../plc/types'
import type {
  PlcCommands,
  PlcDigitalInputs,
  PlcDigitalOutputs,
  PlcInputs,
  PlcInternal,
  PlcOutputs,
} from '../plc/types'

/**
 * Tags that can be force-overridden from the HMI, mirroring the "Force Value"
 * column of an EcoStruxure Control Expert animation table. Only discrete I/O
 * can be forced — analog channels are driven by the plant model / control
 * algorithm and forcing them would be meaningless on real hardware too.
 */
export type ForceableTag = keyof PlcDigitalInputs | keyof PlcDigitalOutputs

export const FORCEABLE_INPUTS: Array<keyof PlcDigitalInputs> = [
  'I_LSH_Equalization',
  'I_LSH_AerationA',
  'I_LSH_AerationB',
  'I_WeirOpenLS',
]

export const FORCEABLE_OUTPUTS: Array<keyof PlcDigitalOutputs> = [
  'Q_Pump_RawInfluent1',
  'Q_Pump_RawInfluent2',
  'Q_Blower_AerationA',
  'Q_Blower_AerationB',
  'Q_Pump_RAS',
  'Q_Pump_Coagulant',
]

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
  plant: PlantModel
  metrics: Partial<ScanMetrics>
}

/** Momentary pushbuttons — asserted by the HMI, cleared by the engine after one scan. */
export type PushbuttonTag = 'I_PlantStart_PB' | 'I_PlantStop_PB' | 'I_ResetFault_PB'

export interface PlcStoreState {
  inputs: PlcInputs
  commands: PlcCommands
  outputs: PlcOutputs
  internal: PlcInternal
  plant: PlantModel
  disturbances: PlantDisturbances
  metrics: ScanMetrics
  forces: Partial<Record<ForceableTag, boolean>>
  /** Pushbuttons asserted this scan; the engine clears them once logic has seen them. */
  pendingPulses: PushbuttonTag[]
  engineRunning: boolean

  // --- HMI operator actions -------------------------------------------------
  /** Hardware E-Stop mushroom head. TRUE = released/healthy (NC contact closed). */
  setEStopHealthy: (healthy: boolean) => void
  pressPushbutton: (tag: PushbuttonTag) => void
  setTargetDO: (value: number) => void
  setMaxTurbidity: (value: number) => void
  swapLeadPump: () => void
  setWeirManualMode: (manual: boolean) => void
  setWeirJog: (direction: 'open' | 'close', pressed: boolean) => void
  setRawInflowPct: (pct: number) => void
  injectTurbidityShock: (ntu: number) => void
  setBypassDrain: (open: boolean) => void
  setForce: (tag: ForceableTag, value: boolean) => void
  clearForce: (tag: ForceableTag) => void
  systemReset: () => void
  setEngineRunning: (running: boolean) => void

  // --- Engine plumbing -------------------------------------------------------
  applyScan: (payload: ApplyScanPayload) => void
  consumePulses: () => void
}

const initialInputs: PlcInputs = {
  I_EStop_NC: true,
  I_PlantStart_PB: false,
  I_PlantStop_PB: false,
  I_ResetFault_PB: false,
  I_LSH_Equalization: false,
  I_LSH_AerationA: false,
  I_LSH_AerationB: false,
  I_WeirOpenLS: false,
  AI_LT_EqBasin: 0,
  AI_LT_AerationA: 0,
  AI_LT_AerationB: 0,
  AI_DO_AerationA: 0,
  AI_Turbidity_Effluent: 0,
}

const initialCommands: PlcCommands = {
  Cmd_WeirManualMode: false,
  Cmd_WeirJogOpen: false,
  Cmd_WeirJogClose: false,
  Cmd_SwapLeadPump: false,
}

const initialMetrics: ScanMetrics = {
  configuredCycleTimeMs: SCAN_CYCLE_MS,
  lastCycleTimeMs: 0,
  scanCount: 0,
  lastScanAt: 0,
}

export const usePlcStore = create<PlcStoreState>((set) => ({
  inputs: { ...initialInputs },
  commands: { ...initialCommands },
  outputs: createInitialOutputs(),
  internal: createInitialInternal(),
  plant: createInitialPlant(),
  disturbances: createInitialDisturbances(),
  metrics: { ...initialMetrics },
  forces: {},
  pendingPulses: [],
  engineRunning: false,

  setEStopHealthy: (healthy) =>
    set((state) => ({ inputs: { ...state.inputs, I_EStop_NC: healthy } })),

  // A momentary pushbutton must be visible to at least one full scan. Rather
  // than relying on the UI to hold the contact long enough (a fast click can
  // open and close inside one 50 ms scan interval), the press is queued and
  // the engine clears it only after the logic has executed.
  pressPushbutton: (tag) =>
    set((state) => ({
      inputs: { ...state.inputs, [tag]: true },
      pendingPulses: state.pendingPulses.includes(tag)
        ? state.pendingPulses
        : [...state.pendingPulses, tag],
    })),

  setTargetDO: (value) =>
    set((state) => ({ internal: { ...state.internal, M_TargetDO: clamp(value, 0.5, 6) } })),

  setMaxTurbidity: (value) =>
    set((state) => ({ internal: { ...state.internal, M_MaxTurbidity: clamp(value, 5, 24) } })),

  // Cmd_SwapLeadPump is rising-edge sensed inside FB_LeadLagPump, so it is
  // asserted here and dropped by the scan that observed it.
  swapLeadPump: () =>
    set((state) => ({ commands: { ...state.commands, Cmd_SwapLeadPump: true } })),

  setWeirManualMode: (manual) =>
    set((state) => ({
      commands: {
        ...state.commands,
        Cmd_WeirManualMode: manual,
        Cmd_WeirJogOpen: false,
        Cmd_WeirJogClose: false,
      },
    })),

  setWeirJog: (direction, pressed) =>
    set((state) => ({
      commands: {
        ...state.commands,
        Cmd_WeirJogOpen: direction === 'open' ? pressed : state.commands.Cmd_WeirJogOpen,
        Cmd_WeirJogClose: direction === 'close' ? pressed : state.commands.Cmd_WeirJogClose,
      },
    })),

  setRawInflowPct: (pct) =>
    set((state) => ({ disturbances: { ...state.disturbances, rawInflowPct: clamp(pct, 0, 100) } })),

  injectTurbidityShock: (ntu) =>
    set((state) => ({ disturbances: { ...state.disturbances, turbidityShockNtu: ntu } })),

  setBypassDrain: (open) =>
    set((state) => ({ disturbances: { ...state.disturbances, bypassDrainOpen: open } })),

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
      plant: createInitialPlant(),
      disturbances: createInitialDisturbances(),
      metrics: { ...initialMetrics },
      forces: {},
      pendingPulses: [],
    })),

  setEngineRunning: (running) => set({ engineRunning: running }),

  applyScan: ({ inputs, outputs, internal, plant, metrics }) =>
    set((state) => ({
      inputs,
      outputs,
      internal,
      plant,
      metrics: { ...state.metrics, ...metrics },
      // One-shot commands and the turbidity shock injection are consumed by
      // the scan that observed them.
      commands: state.commands.Cmd_SwapLeadPump
        ? { ...state.commands, Cmd_SwapLeadPump: false }
        : state.commands,
      disturbances: state.disturbances.turbidityShockNtu
        ? { ...state.disturbances, turbidityShockNtu: 0 }
        : state.disturbances,
    })),

  consumePulses: () =>
    set((state) => {
      if (state.pendingPulses.length === 0) return state
      const inputs = { ...state.inputs }
      for (const tag of state.pendingPulses) {
        inputs[tag] = false
      }
      return { inputs, pendingPulses: [] }
    }),
}))
