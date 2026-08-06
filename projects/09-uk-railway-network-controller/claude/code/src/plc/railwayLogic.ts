/**
 * TypeScript port of `railwayLogic.st`.
 *
 * One call = one MAST scan. The function is pure: it takes the process image
 * plus the plant context and returns the new output image, the new internal
 * (%M) image and the derived interlocking data (aspects, timetable, register
 * frames) the HMI renders. Keeping it pure is what lets the ST source, the
 * ladder monitor and the mimic all agree on a single solved state.
 *
 * Execution order matches the ST `PROGRAM Main` body:
 *   1. FB_SafetyInterlock      — highest priority, drops the traction relay
 *   2. FB_TrackBlockInterlock  — axle counters → aspects → movement authority
 *   3. FB_SpeedSupervision     — movement authority → VFD speed references
 *   4. FB_TimetableManager     — clock, state machine, PIS, %MW registers
 *   5. Point control network   — %Q0.4 / %Q0.5 with route locking
 */

import {
  AXLE_COUNTER_BLOCK,
  BLOCKS,
  BLOCK_BY_ID,
  BRAKING_DISTANCE_KM,
  BUZZER_HOLD_S,
  EXPRESS_LINE_SPEED,
  POINT_DETECT_TIMEOUT_MS,
  SCHEDULED_LINE_SPEED,
  SIGNAL_HEADS,
  SPEED_CAP_DOUBLE_YELLOW,
  SPEED_CAP_YELLOW,
  ST_EXPRESS_SERVICE,
  ST_SCHEDULED_RUN,
  ST_SIGNAL_FAULT,
  ST_STOPPED,
  TIME_COMPRESSION,
  VFD_FULL_SCALE_KMH,
  clamp,
  stationBlockId,
} from './types'
import type {
  HmiCommands,
  NetworkState,
  PlcInputs,
  PlcInternal,
  PlcOutputs,
  ServiceId,
  SignalAspect,
  TimetableEntry,
  TimetableRegister,
} from './types'
import {
  distanceToBlockEndKm,
  trainBlock,
  trainNextBlock,
} from './networkSimulation'
import type { NetworkModel, TrainModel } from './networkSimulation'
import { buildRegisters, buildTimetable, serviceDelayS } from './timetable'

/** VFD reference slew limits, percent of full scale per scan. */
const VFD_RAMP_UP_PCT = 0.55
const VFD_RAMP_DOWN_PCT = 1.8

/** Yellow aspect: run at 90 km/h until the last 30 km, then 40 km/h. */
const YELLOW_APPROACH_KM = 30

export interface LogicContext {
  inputs: PlcInputs
  commands: HmiCommands
  internal: PlcInternal
  outputs: PlcOutputs
  network: NetworkModel
  dtMs: number
}

export interface LogicResult {
  outputs: PlcOutputs
  internal: PlcInternal
  aspects: Record<string, SignalAspect>
  occupancy: Record<string, boolean>
  timetable: TimetableEntry[]
  registers: TimetableRegister[]
  delays: Record<ServiceId, number>
}

// ---------------------------------------------------------------------------
// FB_SafetyInterlock (%Q0.7)
// ---------------------------------------------------------------------------

interface SafetyResult {
  trip: boolean
  alarm: boolean
  pointDetectFault: boolean
  detectTimerMs: number
}

function fbSafetyInterlock(
  inputs: PlcInputs,
  internal: PlcInternal,
  dtMs: number,
): SafetyResult {
  // Point detection watchdog — the switch rails are allowed to be out of
  // detection while the machine is driving over, but not indefinitely.
  const detectTimerMs = inputs.I_PointSwitch_Normal
    ? 0
    : Math.min(internal.M_PointDetectTimerMs + dtMs, POINT_DETECT_TIMEOUT_MS * 4)
  const pointDetectFault = detectTimerMs >= POINT_DETECT_TIMEOUT_MS

  const tripCondition = !inputs.I_EStop_NC || pointDetectFault

  // Retentive SIL4 latch: set dominant, cleared only by an acknowledged reset
  // with every trip condition already healthy.
  let trip = internal.M_SafetyTrip
  if (tripCondition) {
    trip = true
  } else if (inputs.I_ResetFault_PB) {
    trip = false
  }

  return { trip, alarm: trip || tripCondition, pointDetectFault, detectTimerMs }
}

// ---------------------------------------------------------------------------
// FB_TrackBlockInterlock (%Q0.0 – %Q0.3)
// ---------------------------------------------------------------------------

interface InterlockResult {
  occupancy: Record<string, boolean>
  aspects: Record<string, SignalAspect>
  activeBlockCount: number
  brake: Record<ServiceId, boolean>
}

function fbTrackBlockInterlock(
  inputs: PlcInputs,
  network: NetworkModel,
  networkRun: boolean,
  safetyTrip: boolean,
): InterlockResult {
  // Axle-counter image: the remote evaluator telegrams for every section, with
  // the four hard-wired heads taken straight off the %I0.3 – %I0.6 terminals so
  // that a forced input really does put a block back to occupied.
  const occupancy: Record<string, boolean> = { ...network.blockOccupancy }
  for (const [tag, blockId] of Object.entries(AXLE_COUNTER_BLOCK)) {
    occupancy[blockId] = inputs[tag as keyof typeof AXLE_COUNTER_BLOCK]
  }

  const aspects: Record<string, SignalAspect> = {}
  for (const block of BLOCKS) {
    if (safetyTrip || !networkRun) {
      aspects[block.id] = 'red'
      continue
    }
    if (occupancy[block.id]) {
      aspects[block.id] = 'red'
      continue
    }
    const nextOccupied = block.next.some((id) => occupancy[id])
    if (nextOccupied) {
      aspects[block.id] = 'yellow'
      continue
    }
    const secondOccupied = block.next.some((id) =>
      (BLOCK_BY_ID[id]?.next ?? []).some((further) => occupancy[further]),
    )
    aspects[block.id] = secondOccupied ? 'double-yellow' : 'green'
  }

  const activeBlockCount = BLOCKS.reduce((count, block) => count + (occupancy[block.id] ? 1 : 0), 0)

  const brake: Record<ServiceId, boolean> = { IC1: false, IC2: false }
  for (const train of network.trains) {
    const nextBlock = trainNextBlock(train)
    const aspect = nextBlock ? aspects[nextBlock] : 'red'
    brake[train.id] =
      aspect === 'red' && (train.atStation || distanceToBlockEndKm(train) <= BRAKING_DISTANCE_KM)
  }

  return { occupancy, aspects, activeBlockCount, brake }
}

// ---------------------------------------------------------------------------
// FB_SpeedSupervision (%QW100 / %QW102)
// ---------------------------------------------------------------------------

/**
 * Movement-authority speed ceiling for one train, km/h.
 *
 * Mirrors the ATP braking curve: a signal at danger is approached on a linear
 * ramp that reaches zero at the block joint, a single yellow is a caution and
 * a preliminary caution keeps the train below 145 km/h.
 */
function authoritySpeed(
  train: TrainModel,
  aspects: Record<string, SignalAspect>,
  lineSpeedCap: number,
): number {
  const nextBlock = trainNextBlock(train)
  if (!nextBlock) return 0
  const aspect = aspects[nextBlock] ?? 'red'

  if (train.atStation) {
    return aspect === 'red' ? 0 : lineSpeedCap
  }

  const distanceKm = distanceToBlockEndKm(train)
  switch (aspect) {
    case 'red':
      return clamp((distanceKm / BRAKING_DISTANCE_KM) * lineSpeedCap, 0, lineSpeedCap)
    case 'yellow':
      return distanceKm > YELLOW_APPROACH_KM ? SPEED_CAP_DOUBLE_YELLOW : SPEED_CAP_YELLOW
    case 'double-yellow':
      return Math.min(lineSpeedCap, 145)
    default:
      return lineSpeedCap
  }
}

interface SpeedResult {
  permitted: Record<ServiceId, number>
  reference: Record<ServiceId, number>
}

function fbSpeedSupervision(
  network: NetworkModel,
  aspects: Record<string, SignalAspect>,
  targets: Record<ServiceId, number>,
  atpLimits: Record<ServiceId, number>,
  outputs: PlcOutputs,
  state: NetworkState,
  tractionHealthy: boolean,
): SpeedResult {
  const lineSpeedCap = state === ST_EXPRESS_SERVICE ? EXPRESS_LINE_SPEED : SCHEDULED_LINE_SPEED
  const permitted: Record<ServiceId, number> = { IC1: 0, IC2: 0 }
  const reference: Record<ServiceId, number> = {
    IC1: outputs.AQ_VFD_TractionSpeed1,
    IC2: outputs.AQ_VFD_TractionSpeed2,
  }

  for (const train of network.trains) {
    const blockLineSpeed = BLOCK_BY_ID[trainBlock(train)]?.lineSpeedKmh ?? lineSpeedCap
    const solved = tractionHealthy
      ? Math.min(
          targets[train.id],
          lineSpeedCap,
          atpLimits[train.id],
          blockLineSpeed,
          authoritySpeed(train, aspects, lineSpeedCap),
        )
      : 0
    permitted[train.id] = clamp(solved, 0, VFD_FULL_SCALE_KMH)

    // Ramp the analog reference instead of stepping it — a step demand on a
    // traction VFD is what makes passengers spill their tea.
    const demandPct = (permitted[train.id] / VFD_FULL_SCALE_KMH) * 100
    const current = reference[train.id]
    reference[train.id] = tractionHealthy
      ? clamp(
          demandPct > current
            ? Math.min(demandPct, current + VFD_RAMP_UP_PCT)
            : Math.max(demandPct, current - VFD_RAMP_DOWN_PCT),
          0,
          100,
        )
      : 0
  }

  return { permitted, reference }
}

// ---------------------------------------------------------------------------
// FB_TimetableManager (%MW0, %MW6, %MW10 – %MW50, %Q0.6)
// ---------------------------------------------------------------------------

interface TimetableResult {
  clockSeconds: number
  state: NetworkState
  timetable: TimetableEntry[]
  registers: TimetableRegister[]
  delays: Record<ServiceId, number>
  worstDelayMin: number
  buzzer: boolean
  buzzerTimerS: number
}

function fbTimetableManager(
  network: NetworkModel,
  internal: PlcInternal,
  commands: HmiCommands,
  networkRun: boolean,
  safetyTrip: boolean,
  dtMs: number,
): TimetableResult {
  const dtSimS = (dtMs / 1000) * TIME_COMPRESSION
  const clockSeconds = internal.M_ClockSeconds + dtSimS

  let state: NetworkState
  if (safetyTrip) {
    state = ST_SIGNAL_FAULT
  } else if (!networkRun) {
    state = ST_STOPPED
  } else {
    state = commands.expressService ? ST_EXPRESS_SERVICE : ST_SCHEDULED_RUN
  }

  const delays: Record<ServiceId, number> = { IC1: 0, IC2: 0 }
  for (const train of network.trains) {
    delays[train.id] = serviceDelayS(train, clockSeconds)
  }

  const timetable = buildTimetable(network.trains, clockSeconds, state, delays)
  const registers = buildRegisters(timetable, clockSeconds)
  const worstDelayMin = Math.round(Math.max(delays.IC1, delays.IC2) / 60)

  // Boarding chime: sounds for the last minute of every station dwell.
  const boarding = network.trains.some(
    (train) => train.atStation && !train.finished && train.dwellRemainingS > 0 && train.dwellRemainingS <= BUZZER_HOLD_S,
  )
  const buzzerTimerS = boarding ? BUZZER_HOLD_S : Math.max(0, internal.M_BuzzerTimerS - dtSimS)

  return {
    clockSeconds,
    state,
    timetable,
    registers,
    delays,
    worstDelayMin,
    buzzer: networkRun && !safetyTrip && buzzerTimerS > 0,
    buzzerTimerS,
  }
}

// ---------------------------------------------------------------------------
// PROGRAM Main
// ---------------------------------------------------------------------------

export function runRailwayLogic(ctx: LogicContext): LogicResult {
  const { inputs, commands, internal, outputs, network, dtMs } = ctx

  // --- Network service run latch (%M10.0) ---------------------------------
  // The run pushbutton is wired as an alternate-action selector: each press
  // toggles the timetable service on or off.
  const safety = fbSafetyInterlock(inputs, internal, dtMs)
  let networkRun = internal.M_NetworkRun
  if (inputs.I_MasterRun_PB) networkRun = !networkRun
  if (safety.trip) networkRun = false

  const masterSafetyRelay = networkRun && !safety.trip

  // --- FB_TrackBlockInterlock ---------------------------------------------
  const interlock = fbTrackBlockInterlock(inputs, network, networkRun, safety.trip)

  // --- FB_SpeedSupervision -------------------------------------------------
  const targets: Record<ServiceId, number> = {
    IC1: clamp(commands.targetSpeed1, 0, 200),
    IC2: clamp(commands.targetSpeed2, 0, 200),
  }
  // %IW104 carries the ATP telegram for the lead service; the trailing service
  // reads its limit out of the same static track-limit table in the DFB.
  const trailing = network.trains.find((train) => train.id === 'IC2')
  const atpLimits: Record<ServiceId, number> = {
    IC1: inputs.AI_TrackCurvature_Limit,
    IC2: trailing ? (BLOCK_BY_ID[trainBlock(trailing)]?.lineSpeedKmh ?? 200) : 200,
  }
  const speed = fbSpeedSupervision(
    network,
    interlock.aspects,
    targets,
    atpLimits,
    outputs,
    commands.expressService ? ST_EXPRESS_SERVICE : ST_SCHEDULED_RUN,
    masterSafetyRelay,
  )

  // --- FB_TimetableManager -------------------------------------------------
  const timetable = fbTimetableManager(
    network,
    internal,
    commands,
    networkRun,
    safety.trip,
    dtMs,
  )

  // --- Point control network ----------------------------------------------
  // Route locking: the machine may only be driven while the junction block is
  // clear of traffic, so a set route cannot be pulled from under a train.
  const junctionClear = !interlock.occupancy[stationBlockId('BHM')]
  const pointReverseCmd =
    safety.trip || !junctionClear ? internal.M_PointReverseCmd : commands.pointReverseRequest
  const pointsProven = inputs.I_PointSwitch_Normal

  const nextOutputs: PlcOutputs = {
    Q_Signal_London_Green: interlock.aspects[SIGNAL_HEADS[0].block] === 'green',
    Q_Signal_Brum_Green: interlock.aspects[SIGNAL_HEADS[1].block] === 'green',
    Q_Signal_Manchester_Green: interlock.aspects[SIGNAL_HEADS[2].block] === 'green',
    Q_Signal_Scotland_Green: interlock.aspects[SIGNAL_HEADS[3].block] === 'green',
    Q_PointMotor_AlignMain: !pointReverseCmd && !pointsProven && !safety.trip,
    Q_PointMotor_AlignBranch: pointReverseCmd && !pointsProven && !safety.trip,
    Q_PlatformBuzzer: timetable.buzzer,
    Q_MasterSafetyRelay: masterSafetyRelay,
    AQ_VFD_TractionSpeed1: speed.reference.IC1,
    AQ_VFD_TractionSpeed2: speed.reference.IC2,
  }

  const nextInternal: PlcInternal = {
    M_NetworkState: timetable.state,
    M_TargetSpeed_Train1: targets.IC1,
    M_TargetSpeed_Train2: targets.IC2,
    M_ActiveBlockCount: interlock.activeBlockCount,
    M_NetworkRun: networkRun,
    M_SafetyTrip: safety.trip,
    M_AlarmActive: safety.alarm,
    M_PointDetectFault: safety.pointDetectFault,
    M_PointReverseCmd: pointReverseCmd,
    M_BrakeDemand_Train1: interlock.brake.IC1,
    M_BrakeDemand_Train2: interlock.brake.IC2,
    M_PermittedSpeed_Train1: speed.permitted.IC1,
    M_PermittedSpeed_Train2: speed.permitted.IC2,
    M_ClockSeconds: timetable.clockSeconds,
    M_PointDetectTimerMs: safety.detectTimerMs,
    M_BuzzerTimerS: timetable.buzzerTimerS,
    M_WorstDelayMin: timetable.worstDelayMin,
  }

  return {
    outputs: nextOutputs,
    internal: nextInternal,
    aspects: interlock.aspects,
    occupancy: interlock.occupancy,
    timetable: timetable.timetable,
    registers: timetable.registers,
    delays: timetable.delays,
  }
}
