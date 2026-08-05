import { create } from 'zustand'

export type PlcTagValue = boolean | number | string

/** Discrete states of the three-tank cascade sequencer. */
export type ProcessState = 'IDLE' | 'FILLING_A' | 'TRANSFERRING_AB' | 'DRAINING_BC'

export type LevelTag = 'ltTankA' | 'ltTankB' | 'ltTankC'

export interface PlcInputs {
  /** Hardware E-Stop, NC/safety-high logic: FALSE = emergency state. */
  eStop: boolean
  ltTankA: number
  ltTankB: number
  ltTankC: number
  /** Independent hardwired high-level float switches (overflow guard). */
  lshTankA: boolean
  lshTankB: boolean
}

export interface PlcOutputs {
  pumpFillA: boolean
  pumpTransferAB: boolean
  valveDrainBCPos: number
  alarmOverflow: boolean
  /** Bit 0 = Green/Run, Bit 1 = Yellow/Warning, Bit 2 = Red/Alarm. */
  alarmTower: number
}

export interface PlcSetpoints {
  spLevelAHigh: number
  spLevelBHigh: number
  spLevelBTarget: number
}

/** I/O force table mirroring Control Expert's I/O forcing feature: a forced
 * tag holds its current value and is skipped by the plant simulation until
 * released. */
export interface PlcForces {
  ltTankA: boolean
  ltTankB: boolean
  ltTankC: boolean
}

export interface PlcStoreState {
  systemRunning: boolean
  cycleTimeMs: number
  scanCount: number
  state: ProcessState
  inputs: PlcInputs
  outputs: PlcOutputs
  setpoints: PlcSetpoints
  forces: PlcForces
  /** One-shot momentary pushbutton commands, consumed by the scan engine. */
  startPbPulse: boolean
  stopPbPulse: boolean
  tags: Record<string, PlcTagValue>

  setSystemRunning: (running: boolean) => void
  setTag: (tagName: string, value: PlcTagValue) => void

  requestStart: () => void
  requestStop: () => void
  consumeStartPulse: () => void
  consumeStopPulse: () => void

  setEStop: (healthy: boolean) => void
  setLsh: (tank: 'lshTankA' | 'lshTankB', tripped: boolean) => void
  nudgeLevel: (tank: LevelTag, deltaPct: number) => void
  setForce: (tank: LevelTag, forced: boolean) => void
  setSetpoint: (key: keyof PlcSetpoints, value: number) => void

  applyScan: (patch: {
    state: ProcessState
    outputs: PlcOutputs
    inputs: Partial<PlcInputs>
    systemRunning: boolean
  }) => void
}

const clampPct = (value: number) => Math.min(100, Math.max(0, value))

export const usePlcStore = create<PlcStoreState>((set) => ({
  systemRunning: false,
  cycleTimeMs: 50,
  scanCount: 0,
  state: 'IDLE',
  inputs: {
    eStop: true,
    ltTankA: 0,
    ltTankB: 0,
    ltTankC: 0,
    lshTankA: false,
    lshTankB: false,
  },
  outputs: {
    pumpFillA: false,
    pumpTransferAB: false,
    valveDrainBCPos: 0,
    alarmOverflow: false,
    alarmTower: 0b010,
  },
  setpoints: {
    spLevelAHigh: 80.0,
    spLevelBHigh: 80.0,
    spLevelBTarget: 50.0,
  },
  forces: {
    ltTankA: false,
    ltTankB: false,
    ltTankC: false,
  },
  startPbPulse: false,
  stopPbPulse: false,
  tags: {
    systemReady: true,
    systemRunning: false,
    highLevelAlarm: false,
  },

  setSystemRunning: (running) =>
    set((state) => ({
      systemRunning: running,
      tags: {
        ...state.tags,
        systemRunning: running,
      },
    })),

  setTag: (tagName, value) =>
    set((state) => ({
      tags: {
        ...state.tags,
        [tagName]: value,
      },
    })),

  requestStart: () => set({ startPbPulse: true }),
  requestStop: () => set({ stopPbPulse: true }),
  consumeStartPulse: () => set({ startPbPulse: false }),
  consumeStopPulse: () => set({ stopPbPulse: false }),

  setEStop: (healthy) =>
    set((state) => ({ inputs: { ...state.inputs, eStop: healthy } })),

  setLsh: (tank, tripped) =>
    set((state) => ({ inputs: { ...state.inputs, [tank]: tripped } })),

  nudgeLevel: (tank, deltaPct) =>
    set((state) => ({
      inputs: {
        ...state.inputs,
        [tank]: clampPct(state.inputs[tank] + deltaPct),
      },
    })),

  setForce: (tank, forced) =>
    set((state) => ({ forces: { ...state.forces, [tank]: forced } })),

  setSetpoint: (key, value) =>
    set((state) => ({ setpoints: { ...state.setpoints, [key]: value } })),

  applyScan: ({ state: nextState, outputs, inputs, systemRunning }) =>
    set((prev) => ({
      state: nextState,
      outputs,
      inputs: { ...prev.inputs, ...inputs },
      systemRunning,
      scanCount: prev.scanCount + 1,
      tags: {
        ...prev.tags,
        systemRunning,
        highLevelAlarm: outputs.alarmOverflow,
      },
    })),
}))
