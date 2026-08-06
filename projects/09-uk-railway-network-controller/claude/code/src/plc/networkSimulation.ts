/**
 * Physical model of the railway that sits *outside* the PLC.
 *
 * The soft-PLC never writes to this module directly — it publishes an output
 * image (VFD references, signal aspects, the master traction relay) and this
 * model integrates the resulting train movement one scan later, which is what
 * gives the demonstrator honest scan causality. Axle-counter inputs are read
 * back out of the resulting block-occupancy table.
 */

import {
  BLOCK_BY_ID,
  EMERGENCY_BRAKE_KMH_S,
  EXPRESS_DWELL_S,
  SERVICES,
  SERVICE_BY_ID,
  SERVICE_TURNAROUND_S,
  STATION_DWELL_S,
  ST_EXPRESS_SERVICE,
  TIME_COMPRESSION,
  TRACTION_ACCEL_KMH_S,
  SERVICE_BRAKE_KMH_S,
  VFD_FULL_SCALE_KMH,
  clamp,
  sectionBlockId,
  sectionLengthKm,
  stationBlockId,
} from './types'
import type {
  PlcInternal,
  PlcOutputs,
  ServiceId,
  SignalAspect,
  StationCode,
} from './types'

export interface TrainModel {
  id: ServiceId
  /** Calling pattern actually being worked (may divert via the branch). */
  stops: StationCode[]
  /** Index of the station the train is at, or of the leg's departure station. */
  legIndex: number
  /** Distance run into the current leg, km. */
  legKm: number
  atStation: boolean
  dwellRemainingS: number
  speedKmh: number
  finished: boolean
  turnaroundRemainingS: number
  /** Simulated seconds since midnight of this run's booked origin departure. */
  scheduleBaseS: number
  viaBranch: boolean
  currentBlock: string
  /** TRUE when movement authority has been withdrawn by the interlocking. */
  heldAtSignal: boolean
}

export interface NetworkModel {
  trains: TrainModel[]
  /** Axle-counter occupancy for every block on the network. */
  blockOccupancy: Record<string, boolean>
  /** Which service is standing in each occupied block. */
  blockOwner: Record<string, ServiceId>
}

export const NETWORK_START_CLOCK_S = 8 * 3600

function createTrain(id: ServiceId, clockS: number): TrainModel {
  const service = SERVICE_BY_ID[id]
  const stops = service.mainStops
  return {
    id,
    stops,
    legIndex: 0,
    legKm: 0,
    atStation: true,
    dwellRemainingS: Math.max(0, service.bookedDepartureS - clockS),
    speedKmh: 0,
    finished: false,
    turnaroundRemainingS: 0,
    scheduleBaseS: service.bookedDepartureS,
    viaBranch: false,
    currentBlock: stationBlockId(stops[0]),
    heldAtSignal: false,
  }
}

export function createNetworkModel(): NetworkModel {
  const trains = SERVICES.map((service) => createTrain(service.id, NETWORK_START_CLOCK_S))
  return withOccupancy({ trains, blockOccupancy: {}, blockOwner: {} })
}

/** Block currently claimed by a train. */
export function trainBlock(train: TrainModel): string {
  if (train.atStation) {
    return stationBlockId(train.stops[train.legIndex])
  }
  return sectionBlockId(train.stops[train.legIndex], train.stops[train.legIndex + 1])
}

/** Next block the train will claim, or `null` at a terminus. */
export function trainNextBlock(train: TrainModel): string | null {
  if (train.atStation) {
    const next = train.stops[train.legIndex + 1]
    return next ? sectionBlockId(train.stops[train.legIndex], next) : null
  }
  return stationBlockId(train.stops[train.legIndex + 1])
}

/** Remaining distance to the block boundary ahead, km. */
export function distanceToBlockEndKm(train: TrainModel): number {
  if (train.atStation) return 0
  const length = sectionLengthKm(train.stops[train.legIndex], train.stops[train.legIndex + 1])
  return Math.max(0, length - train.legKm)
}

/** ATP line speed of the block the train is standing in. */
export function trainLineSpeed(train: TrainModel): number {
  return BLOCK_BY_ID[trainBlock(train)]?.lineSpeedKmh ?? 100
}

/** Cumulative distance run on this trip, km — used to grade the timetable. */
export function distanceCoveredKm(train: TrainModel): number {
  let total = 0
  for (let i = 0; i < train.legIndex; i += 1) {
    total += sectionLengthKm(train.stops[i], train.stops[i + 1])
  }
  return total + (train.atStation ? 0 : train.legKm)
}

function withOccupancy(model: NetworkModel): NetworkModel {
  const blockOccupancy: Record<string, boolean> = {}
  const blockOwner: Record<string, ServiceId> = {}
  for (const id of Object.keys(BLOCK_BY_ID)) {
    blockOccupancy[id] = false
  }
  for (const train of model.trains) {
    const block = trainBlock(train)
    blockOccupancy[block] = true
    blockOwner[block] = train.id
  }
  return { ...model, blockOccupancy, blockOwner }
}

export interface AdvanceContext {
  outputs: PlcOutputs
  internal: PlcInternal
  aspects: Record<string, SignalAspect>
  stopOverride: Record<ServiceId, boolean>
  /** Lie the point machine has been commanded to (TRUE = branch / reverse). */
  pointReverse: boolean
  /** Point detection proved and locked. */
  pointsProven: boolean
  clockSeconds: number
  dtMs: number
}

/**
 * Integrates one scan of train movement.
 *
 * Traction follows the VFD reference the CPU published last scan; the master
 * safety relay dropping out applies the emergency brake regardless of it.
 */
export function advanceNetwork(model: NetworkModel, ctx: AdvanceContext): NetworkModel {
  const dtSimS = (ctx.dtMs / 1000) * TIME_COMPRESSION
  const traction = ctx.outputs.Q_MasterSafetyRelay
  const dwellS = ctx.internal.M_NetworkState === ST_EXPRESS_SERVICE ? EXPRESS_DWELL_S : STATION_DWELL_S

  // Occupancy as seen at the start of the scan — a train may not move into a
  // block another train is standing in, and may not overtake itself.
  const occupied = { ...model.blockOccupancy }
  const ownerOf = { ...model.blockOwner }

  const isClearFor = (blockId: string | null, train: TrainModel): boolean => {
    if (!blockId) return false
    return !occupied[blockId] || ownerOf[blockId] === train.id
  }

  const trains = model.trains.map((source) => {
    const train = { ...source }
    const service = SERVICE_BY_ID[train.id]
    const vfdRef = train.id === 'IC1' ? ctx.outputs.AQ_VFD_TractionSpeed1 : ctx.outputs.AQ_VFD_TractionSpeed2
    const override = ctx.stopOverride[train.id]

    // --- Terminated services turn round and work the diagram again ---------
    if (train.finished) {
      train.speedKmh = 0
      train.turnaroundRemainingS -= dtSimS
      if (train.turnaroundRemainingS <= 0) {
        const fresh = createTrain(train.id, ctx.clockSeconds)
        fresh.scheduleBaseS = ctx.clockSeconds + 300
        fresh.dwellRemainingS = 300
        return fresh
      }
      train.currentBlock = trainBlock(train)
      return train
    }

    // --- Traction / brake dynamics -----------------------------------------
    const commandedKmh = traction ? (vfdRef / 100) * VFD_FULL_SCALE_KMH : 0
    const brakeRate = traction ? SERVICE_BRAKE_KMH_S : EMERGENCY_BRAKE_KMH_S
    if (commandedKmh > train.speedKmh) {
      train.speedKmh = Math.min(commandedKmh, train.speedKmh + TRACTION_ACCEL_KMH_S * dtSimS)
    } else {
      train.speedKmh = Math.max(commandedKmh, train.speedKmh - brakeRate * dtSimS)
    }
    train.speedKmh = clamp(train.speedKmh, 0, VFD_FULL_SCALE_KMH)

    if (train.atStation) {
      // --- Standing at a platform ------------------------------------------
      train.speedKmh = 0
      train.dwellRemainingS = Math.max(0, train.dwellRemainingS - dtSimS)

      const nextBlock = trainNextBlock(train)
      const aspect = nextBlock ? ctx.aspects[nextBlock] : 'red'
      // A train may not leave a junction station until the points that lie in
      // its route are detected and locked.
      const routeLocked = train.stops[train.legIndex] !== 'BHM' || ctx.pointsProven
      const departurePermitted =
        traction &&
        ctx.internal.M_NetworkRun &&
        !ctx.internal.M_SafetyTrip &&
        routeLocked &&
        nextBlock !== null &&
        aspect !== 'red' &&
        isClearFor(nextBlock, train)

      train.heldAtSignal = train.dwellRemainingS <= 0 && !departurePermitted

      if (train.dwellRemainingS <= 0 && departurePermitted) {
        // Birmingham North Jn: the lie of the points selects the onward path.
        if (train.stops[train.legIndex] === 'BHM' && train.id === 'IC1') {
          train.viaBranch = ctx.pointReverse
          train.stops = train.viaBranch ? service.branchStops : service.mainStops
        }
        train.atStation = false
        train.legKm = 0
        train.heldAtSignal = false
      }
    } else {
      // --- Running in section -----------------------------------------------
      const from = train.stops[train.legIndex]
      const to = train.stops[train.legIndex + 1]
      const legLengthKm = sectionLengthKm(from, to)
      const nextBlock = stationBlockId(to)
      const nextClear = isClearFor(nextBlock, train) && ctx.aspects[nextBlock] !== 'red'

      train.legKm += (train.speedKmh * dtSimS) / 3600

      if (!nextClear) {
        // Overlap protection: physically impossible to pass the block joint.
        const limit = Math.max(0, legLengthKm - 0.12)
        if (train.legKm >= limit) {
          train.legKm = limit
          train.speedKmh = 0
          train.heldAtSignal = true
        } else {
          train.heldAtSignal = false
        }
      } else {
        train.heldAtSignal = false
        if (train.legKm >= legLengthKm) {
          train.legKm = 0
          train.legIndex += 1
          train.atStation = true
          train.speedKmh = 0
          const isTerminus = train.legIndex >= train.stops.length - 1
          train.dwellRemainingS = isTerminus ? 0 : override ? 0 : dwellS
          if (isTerminus) {
            train.finished = true
            train.turnaroundRemainingS = SERVICE_TURNAROUND_S
          }
        }
      }
    }

    train.currentBlock = trainBlock(train)

    // Release the old claim / take the new one so the next train in the map
    // sees a consistent occupancy picture within the same scan.
    for (const [blockId, owner] of Object.entries(ownerOf)) {
      if (owner === train.id) {
        occupied[blockId] = false
        delete ownerOf[blockId]
      }
    }
    occupied[train.currentBlock] = true
    ownerOf[train.currentBlock] = train.id

    return train
  })

  return withOccupancy({ ...model, trains })
}
