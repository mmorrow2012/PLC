import { create } from 'zustand'
import { BLOCKS, SCAN_CYCLE_MS, ST_STOPPED, clamp } from '../plc/types'
import type {
  HmiCommands,
  PlcInputs,
  PlcInternal,
  PlcOutputs,
  ServiceId,
  SignalAspect,
  TimetableEntry,
  TimetableRegister,
} from '../plc/types'
import { NETWORK_START_CLOCK_S, createNetworkModel } from '../plc/networkSimulation'
import type { NetworkModel } from '../plc/networkSimulation'

/** Electro-mechanical point machine sitting between %Q0.4/%Q0.5 and %I0.7. */
export interface PointMachine {
  commandedReverse: boolean
  provenReverse: boolean
  swingRemainingMs: number
  detected: boolean
}

export interface ScanMetrics {
  configuredCycleTimeMs: number
  lastCycleTimeMs: number
  scanCount: number
  lastScanAt: number
}

export interface ScanPayload {
  inputs: PlcInputs
  outputs: PlcOutputs
  internal: PlcInternal
  network: NetworkModel
  point: PointMachine
  aspects: Record<string, SignalAspect>
  occupancy: Record<string, boolean>
  timetable: TimetableEntry[]
  registers: TimetableRegister[]
  delays: Record<ServiceId, number>
  metrics: ScanMetrics
}

export interface PlcStoreState {
  engineRunning: boolean
  inputs: PlcInputs
  outputs: PlcOutputs
  internal: PlcInternal
  commands: HmiCommands
  network: NetworkModel
  point: PointMachine
  aspects: Record<string, SignalAspect>
  occupancy: Record<string, boolean>
  timetable: TimetableEntry[]
  registers: TimetableRegister[]
  delays: Record<ServiceId, number>
  /** Animation-table style forces applied to the input and output images. */
  forces: Partial<Record<string, boolean>>
  metrics: ScanMetrics

  setEngineRunning: (running: boolean) => void
  applyScan: (payload: ScanPayload) => void
  consumePulses: () => void

  pressMasterRun: () => void
  pressResetFault: () => void
  toggleEStop: () => void
  setTargetSpeed: (train: ServiceId, value: number) => void
  nudgeTargetSpeed: (train: ServiceId, delta: number) => void
  toggleExpressService: () => void
  togglePointRequest: () => void
  toggleStopOverride: (train: ServiceId) => void
  setForce: (tag: string, value: boolean | undefined) => void
  clearForces: () => void
  resetNetwork: () => void
}

const initialInputs: PlcInputs = {
  I_EStop_NC: true,
  I_MasterRun_PB: false,
  I_ResetFault_PB: false,
  I_AxleCounter_London: true,
  I_AxleCounter_Brum: false,
  I_AxleCounter_Manchester: false,
  I_AxleCounter_Edinburgh: false,
  I_PointSwitch_Normal: true,
  AI_TractionSpeed_Intercity1: 0,
  AI_TractionSpeed_Intercity2: 0,
  AI_TrackCurvature_Limit: 60,
}

const initialOutputs: PlcOutputs = {
  Q_Signal_London_Green: false,
  Q_Signal_Brum_Green: false,
  Q_Signal_Manchester_Green: false,
  Q_Signal_Scotland_Green: false,
  Q_PointMotor_AlignMain: false,
  Q_PointMotor_AlignBranch: false,
  Q_PlatformBuzzer: false,
  Q_MasterSafetyRelay: false,
  AQ_VFD_TractionSpeed1: 0,
  AQ_VFD_TractionSpeed2: 0,
}

const initialInternal: PlcInternal = {
  M_NetworkState: ST_STOPPED,
  M_TargetSpeed_Train1: 160,
  M_TargetSpeed_Train2: 150,
  M_ActiveBlockCount: 0,
  M_NetworkRun: false,
  M_SafetyTrip: false,
  M_AlarmActive: false,
  M_PointDetectFault: false,
  M_PointReverseCmd: false,
  M_BrakeDemand_Train1: false,
  M_BrakeDemand_Train2: false,
  M_PermittedSpeed_Train1: 0,
  M_PermittedSpeed_Train2: 0,
  M_ClockSeconds: NETWORK_START_CLOCK_S,
  M_PointDetectTimerMs: 0,
  M_BuzzerTimerS: 0,
  M_WorstDelayMin: 0,
}

const initialCommands: HmiCommands = {
  targetSpeed1: 160,
  targetSpeed2: 150,
  expressService: false,
  pointReverseRequest: false,
  stopOverride1: false,
  stopOverride2: false,
}

const initialPoint: PointMachine = {
  commandedReverse: false,
  provenReverse: false,
  swingRemainingMs: 0,
  detected: true,
}

function allRed(): Record<string, SignalAspect> {
  const aspects: Record<string, SignalAspect> = {}
  for (const block of BLOCKS) aspects[block.id] = 'red'
  return aspects
}

function freshNetwork() {
  const network = createNetworkModel()
  return { network, occupancy: { ...network.blockOccupancy } }
}

export const usePlcStore = create<PlcStoreState>((set) => {
  const seed = freshNetwork()

  return {
    engineRunning: false,
    inputs: initialInputs,
    outputs: initialOutputs,
    internal: initialInternal,
    commands: initialCommands,
    network: seed.network,
    point: initialPoint,
    aspects: allRed(),
    occupancy: seed.occupancy,
    timetable: [],
    registers: [],
    delays: { IC1: 0, IC2: 0 },
    forces: {},
    metrics: {
      configuredCycleTimeMs: SCAN_CYCLE_MS,
      lastCycleTimeMs: SCAN_CYCLE_MS,
      scanCount: 0,
      lastScanAt: 0,
    },

    setEngineRunning: (running) => set({ engineRunning: running }),

    applyScan: (payload) => set(payload),

    // Momentary pushbuttons have now been seen by a full scan — release them.
    consumePulses: () =>
      set((state) =>
        state.inputs.I_MasterRun_PB || state.inputs.I_ResetFault_PB
          ? { inputs: { ...state.inputs, I_MasterRun_PB: false, I_ResetFault_PB: false } }
          : {},
      ),

    pressMasterRun: () => set((state) => ({ inputs: { ...state.inputs, I_MasterRun_PB: true } })),

    pressResetFault: () => set((state) => ({ inputs: { ...state.inputs, I_ResetFault_PB: true } })),

    toggleEStop: () =>
      set((state) => ({ inputs: { ...state.inputs, I_EStop_NC: !state.inputs.I_EStop_NC } })),

    setTargetSpeed: (train, value) =>
      set((state) => ({
        commands: {
          ...state.commands,
          [train === 'IC1' ? 'targetSpeed1' : 'targetSpeed2']: clamp(Math.round(value), 0, 200),
        },
      })),

    nudgeTargetSpeed: (train, delta) =>
      set((state) => {
        const key = train === 'IC1' ? 'targetSpeed1' : 'targetSpeed2'
        return { commands: { ...state.commands, [key]: clamp(state.commands[key] + delta, 0, 200) } }
      }),

    toggleExpressService: () =>
      set((state) => ({
        commands: { ...state.commands, expressService: !state.commands.expressService },
      })),

    togglePointRequest: () =>
      set((state) => ({
        commands: { ...state.commands, pointReverseRequest: !state.commands.pointReverseRequest },
      })),

    toggleStopOverride: (train) =>
      set((state) => {
        const key = train === 'IC1' ? 'stopOverride1' : 'stopOverride2'
        return { commands: { ...state.commands, [key]: !state.commands[key] } }
      }),

    setForce: (tag, value) =>
      set((state) => {
        const forces = { ...state.forces }
        if (value === undefined) {
          delete forces[tag]
        } else {
          forces[tag] = value
        }
        return { forces }
      }),

    clearForces: () => set({ forces: {} }),

    resetNetwork: () =>
      set(() => {
        const next = freshNetwork()
        return {
          inputs: { ...initialInputs },
          outputs: { ...initialOutputs },
          internal: { ...initialInternal },
          commands: { ...initialCommands },
          network: next.network,
          point: { ...initialPoint },
          aspects: allRed(),
          occupancy: next.occupancy,
          timetable: [],
          registers: [],
          delays: { IC1: 0, IC2: 0 },
          forces: {},
        }
      }),
  }
})
