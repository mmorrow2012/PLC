/**
 * Working-timetable engine behind `FB_TimetableManager`.
 *
 * The booked plan is generated once from the calling patterns in `types.ts`
 * at the planning line speed; live running is then graded against it every
 * scan to produce the delay figure, the status badge and the `%MW10…%MW50`
 * departure register frames the PIS boards read.
 */

import {
  DELAY_THRESHOLD_MIN,
  SERVICE_BY_ID,
  STATION_BY_CODE,
  STATION_DWELL_S,
  ST_SIGNAL_FAULT,
  STATUS_CODE,
  TIMETABLE_PLANNING_SPEED,
  sectionLengthKm,
} from './types'
import type {
  NetworkState,
  ServiceDef,
  ServiceId,
  StationCode,
  TimetableEntry,
  TimetableRegister,
  TimetableStatus,
} from './types'
import { distanceCoveredKm } from './networkSimulation'
import type { TrainModel } from './networkSimulation'

// ---------------------------------------------------------------------------
// Booked plan
// ---------------------------------------------------------------------------

interface BookedPlan {
  /** Cumulative booked mileage at each station on the booked route. */
  cumKm: Partial<Record<StationCode, number>>
  /** Booked arrival / departure offsets from the origin departure, seconds. */
  arrivalS: Partial<Record<StationCode, number>>
  departureS: Partial<Record<StationCode, number>>
}

function buildBookedPlan(service: ServiceDef): BookedPlan {
  const cumKm: Partial<Record<StationCode, number>> = {}
  const arrivalS: Partial<Record<StationCode, number>> = {}
  const departureS: Partial<Record<StationCode, number>> = {}

  let km = 0
  let seconds = 0
  cumKm[service.mainStops[0]] = 0
  departureS[service.mainStops[0]] = 0

  for (let i = 1; i < service.mainStops.length; i += 1) {
    const from = service.mainStops[i - 1]
    const to = service.mainStops[i]
    const legKm = sectionLengthKm(from, to)
    km += legKm
    seconds += (legKm / TIMETABLE_PLANNING_SPEED) * 3600
    cumKm[to] = km
    arrivalS[to] = seconds
    if (i < service.mainStops.length - 1) {
      seconds += STATION_DWELL_S
      departureS[to] = seconds
    }
  }

  // Stations that only exist on the diversionary path are interpolated onto
  // the booked mileage so a diverted train can still be graded against plan.
  for (const station of service.branchStops) {
    if (cumKm[station] !== undefined) continue
    const index = service.branchStops.indexOf(station)
    const diverge = service.branchStops[index - 1]
    const converge = service.branchStops[index + 1]
    const before = cumKm[diverge] ?? 0
    const after = cumKm[converge] ?? before
    const legIn = sectionLengthKm(diverge, station)
    const legOut = sectionLengthKm(station, converge)
    const fraction = legIn + legOut > 0 ? legIn / (legIn + legOut) : 0.5
    cumKm[station] = before + (after - before) * fraction
  }

  return { cumKm, arrivalS, departureS }
}

const BOOKED_PLAN: Record<ServiceId, BookedPlan> = {
  IC1: buildBookedPlan(SERVICE_BY_ID.IC1),
  IC2: buildBookedPlan(SERVICE_BY_ID.IC2),
}

/** Booked mileage at the train's present position, km. */
function bookedProgressKm(train: TrainModel): number {
  const plan = BOOKED_PLAN[train.id]
  const from = train.stops[train.legIndex]
  const base = plan.cumKm[from] ?? distanceCoveredKm(train)
  if (train.atStation) return base
  const to = train.stops[train.legIndex + 1]
  const legLength = sectionLengthKm(from, to)
  const bookedLeg = (plan.cumKm[to] ?? base) - base
  const fraction = legLength > 0 ? train.legKm / legLength : 0
  return base + bookedLeg * fraction
}

/**
 * Lateness of a service, simulated seconds.
 *
 * Actual elapsed time since the booked origin departure minus the booked
 * running time to the mileage reached. A diversion via the branch adds an
 * unbooked call and unbooked mileage, so it correctly surfaces as delay.
 */
export function serviceDelayS(train: TrainModel, clockSeconds: number): number {
  if (train.finished) return 0
  const bookedSet = new Set<StationCode>(SERVICE_BY_ID[train.id].mainStops)
  const upTo = train.atStation ? train.legIndex - 1 : train.legIndex
  let dwellsTaken = 0
  for (let i = 1; i <= upTo; i += 1) {
    if (bookedSet.has(train.stops[i])) dwellsTaken += 1
  }
  const plannedElapsed =
    (bookedProgressKm(train) / TIMETABLE_PLANNING_SPEED) * 3600 + dwellsTaken * STATION_DWELL_S
  const actualElapsed = clockSeconds - train.scheduleBaseS
  return Math.max(0, actualElapsed - plannedElapsed)
}

// ---------------------------------------------------------------------------
// Live service rows
// ---------------------------------------------------------------------------

function viaText(stops: StationCode[]): string {
  const middle = stops.slice(1, -1).map((code) => STATION_BY_CODE[code].city)
  if (middle.length === 0) return 'non-stop'
  if (middle.length <= 2) return `via ${middle.join(' & ')}`
  return `via ${middle.slice(0, -1).join(', ')} & ${middle[middle.length - 1]}`
}

function liveEntries(
  train: TrainModel,
  clockSeconds: number,
  networkState: NetworkState,
  delayS: number,
): TimetableEntry[] {
  const service = SERVICE_BY_ID[train.id]
  const plan = BOOKED_PLAN[train.id]
  const delayMin = delayS / 60
  const origin = STATION_BY_CODE[train.stops[0]].name
  const destination = STATION_BY_CODE[train.stops[train.stops.length - 1]].name
  const via = viaText(train.stops)
  const entries: TimetableEntry[] = []

  train.stops.forEach((station, index) => {
    const platform = service.platform[station] ?? 1
    const isLast = index === train.stops.length - 1
    const passed = train.legIndex > index || (train.finished && index <= train.legIndex)
    const here = train.atStation && train.legIndex === index && !train.finished

    const push = (kind: 'departure' | 'arrival', bookedOffsetS: number | undefined) => {
      const scheduledS =
        bookedOffsetS !== undefined
          ? train.scheduleBaseS + bookedOffsetS
          : train.scheduleBaseS + (bookedProgressKm(train) / TIMETABLE_PLANNING_SPEED) * 3600
      const scheduledMin = scheduledS / 60
      const expectedMin = scheduledMin + delayMin

      let status: TimetableStatus
      if (kind === 'arrival' && (passed || here)) {
        status = 'ARRIVED'
      } else if (passed) {
        status = 'DEPARTED'
      } else if (here && kind === 'departure') {
        status = 'BOARDING'
      } else if (networkState === ST_SIGNAL_FAULT) {
        status = 'DELAYED'
      } else {
        status = delayMin >= DELAY_THRESHOLD_MIN ? 'DELAYED' : 'ON TIME'
      }

      entries.push({
        id: `${train.id}-${station}-${kind}`,
        station,
        kind,
        counterparty: kind === 'departure' ? destination : origin,
        via,
        headcode: service.headcode,
        operator: service.operator,
        scheduledMin,
        expectedMin,
        platform,
        status,
        live: true,
      })
    }

    if (!isLast) push('departure', plan.departureS[station])
    if (index > 0) push('arrival', plan.arrivalS[station])
  })

  // The clock only matters for ordering; keep the board chronological.
  return entries.filter((entry) => entry.expectedMin * 60 > clockSeconds - 3600)
}

// ---------------------------------------------------------------------------
// Background (non-tracked) services — give the PIS boards realistic volume
// ---------------------------------------------------------------------------

interface BackgroundPattern {
  station: StationCode
  kind: 'departure' | 'arrival'
  counterparty: string
  via: string
  headcode: string
  operator: string
  minuteOfHour: number
  hourOffset: number
  platform: number
  delayMin: number
}

const bg = (
  station: StationCode,
  kind: 'departure' | 'arrival',
  counterparty: string,
  via: string,
  headcode: string,
  operator: string,
  minuteOfHour: number,
  hourOffset: number,
  platform: number,
  delayMin = 0,
): BackgroundPattern => ({
  station,
  kind,
  counterparty,
  via,
  headcode,
  operator,
  minuteOfHour,
  hourOffset,
  platform,
  delayMin,
})

const BACKGROUND_PATTERNS: BackgroundPattern[] = [
  bg('LON', 'departure', 'Manchester Piccadilly', 'via Milton Keynes & Stoke', '1H12', 'Avanti West Coast', 13, 0, 9),
  bg('LON', 'departure', 'Glasgow Central', 'via Preston & Carlisle', '1S63', 'Avanti West Coast', 41, 0, 6, 9),
  bg('LON', 'arrival', 'Liverpool Lime Street', 'via Crewe', '1A28', 'Avanti West Coast', 27, 0, 12),
  bg('LON', 'departure', 'Birmingham New Street', 'via Coventry', '1B41', 'West Midlands Trains', 54, 0, 14),

  bg('COV', 'departure', 'Birmingham New Street', 'via Birmingham International', '2Y07', 'West Midlands Trains', 8, 0, 2),
  bg('COV', 'arrival', 'London Euston', 'via Rugby', '1A55', 'Avanti West Coast', 22, 0, 3),
  bg('COV', 'departure', 'Bournemouth', 'via Reading & Southampton', '1O31', 'CrossCountry', 47, 0, 1, 6),

  bg('BHM', 'departure', 'Edinburgh Waverley', 'via Sheffield & York', '1S44', 'CrossCountry', 6, 0, 5),
  bg('BHM', 'arrival', 'Bristol Temple Meads', 'via Cheltenham Spa', '1M19', 'CrossCountry', 24, 0, 10),
  bg('BHM', 'departure', 'Liverpool Lime Street', 'via Wolverhampton & Crewe', '1F26', 'West Midlands Trains', 38, 0, 7, 12),
  bg('BHM', 'departure', 'London Euston', 'via Coventry & Rugby', '1A73', 'Avanti West Coast', 57, 0, 3),

  bg('BRS', 'departure', 'Leeds City', 'via Birmingham & Sheffield', '1E45', 'CrossCountry', 11, 0, 12),
  bg('BRS', 'arrival', 'Cardiff Central', 'via Newport', '2C18', 'Transport for Wales', 33, 0, 4),
  bg('BRS', 'departure', 'London Paddington', 'via Bath Spa & Reading', '1A62', 'Great Western Railway', 49, 0, 13, 4),

  bg('LIV', 'departure', 'Manchester Piccadilly', 'via Warrington Central', '2F51', 'Northern', 9, 0, 5),
  bg('LIV', 'arrival', 'Birmingham New Street', 'via Crewe & Wolverhampton', '1F04', 'West Midlands Trains', 26, 0, 8),
  bg('LIV', 'departure', 'Edinburgh Waverley', 'via Preston & Carlisle', '1S09', 'TransPennine Express', 52, 0, 6, 15),

  bg('MAN', 'departure', 'Leeds City', 'via Huddersfield', '1E77', 'TransPennine Express', 4, 0, 13),
  bg('MAN', 'arrival', 'London Euston', 'via Stoke-on-Trent', '1H33', 'Avanti West Coast', 21, 0, 2),
  bg('MAN', 'departure', 'Glasgow Central', 'via Wigan & Carlisle', '1S71', 'TransPennine Express', 36, 0, 4, 7),
  bg('MAN', 'departure', 'Bristol Temple Meads', 'via Birmingham & Cheltenham', '1V52', 'CrossCountry', 58, 0, 9),

  bg('LEE', 'departure', 'Edinburgh Waverley', 'via York & Newcastle', '1S22', 'CrossCountry', 15, 0, 8),
  bg('LEE', 'arrival', 'Manchester Piccadilly', 'via Huddersfield', '1B58', 'TransPennine Express', 31, 0, 12),
  bg('LEE', 'departure', 'London Kings Cross', 'via Doncaster & Peterborough', '1A44', 'LNER', 44, 0, 4, 11),

  bg('GLA', 'departure', 'Edinburgh Waverley', 'via Falkirk High', '2Y19', 'ScotRail', 7, 0, 11),
  bg('GLA', 'arrival', 'London Euston', 'via Carlisle & Preston', '1S89', 'Avanti West Coast', 29, 0, 1),
  bg('GLA', 'departure', 'Manchester Piccadilly', 'via Carlisle & Lancaster', '1M43', 'TransPennine Express', 46, 0, 3, 5),

  bg('EDI', 'departure', 'Glasgow Central', 'via Shotts', '2Y61', 'ScotRail', 12, 0, 9),
  bg('EDI', 'arrival', 'Leeds City', 'via Newcastle & York', '1E08', 'CrossCountry', 34, 0, 16),
  bg('EDI', 'departure', 'London Kings Cross', 'via Newcastle & Doncaster', '1E15', 'LNER', 51, 0, 2, 8),
  bg('EDI', 'departure', 'Aberdeen', 'via Dundee & Arbroath', '1A87', 'ScotRail', 59, 0, 5),
]

function backgroundEntries(clockSeconds: number, networkState: NetworkState): TimetableEntry[] {
  const clockMin = clockSeconds / 60
  const hourStart = Math.floor(clockMin / 60) * 60

  return BACKGROUND_PATTERNS.map((pattern) => {
    let scheduledMin = hourStart + pattern.hourOffset * 60 + pattern.minuteOfHour
    // Roll a service that has already run well past into the following hour so
    // the board never fills up with stale rows.
    if (scheduledMin < clockMin - 12) scheduledMin += 60

    const disruption = networkState === ST_SIGNAL_FAULT ? 14 : 0
    const delayMin = pattern.delayMin + disruption
    const expectedMin = scheduledMin + delayMin

    let status: TimetableStatus
    if (expectedMin <= clockMin - 1) {
      status = pattern.kind === 'arrival' ? 'ARRIVED' : 'DEPARTED'
    } else if (pattern.kind === 'departure' && expectedMin - clockMin <= 4) {
      status = 'BOARDING'
    } else if (delayMin >= DELAY_THRESHOLD_MIN) {
      status = 'DELAYED'
    } else {
      status = 'ON TIME'
    }

    return {
      id: `${pattern.headcode}-${pattern.station}-${pattern.kind}`,
      station: pattern.station,
      kind: pattern.kind,
      counterparty: pattern.counterparty,
      via: pattern.via,
      headcode: pattern.headcode,
      operator: pattern.operator,
      scheduledMin,
      expectedMin,
      platform: pattern.platform,
      status,
      live: false,
    }
  })
}

// ---------------------------------------------------------------------------
// Public entry points used by FB_TimetableManager
// ---------------------------------------------------------------------------

export function buildTimetable(
  trains: TrainModel[],
  clockSeconds: number,
  networkState: NetworkState,
  delays: Record<ServiceId, number>,
): TimetableEntry[] {
  const live = trains.flatMap((train) =>
    liveEntries(train, clockSeconds, networkState, delays[train.id] ?? 0),
  )
  return [...live, ...backgroundEntries(clockSeconds, networkState)].sort(
    (a, b) => a.expectedMin - b.expectedMin || a.station.localeCompare(b.station),
  )
}

/**
 * Packs the eight nearest tracked departures into the `%MW10…%MW50` register
 * table, five words per frame: station index, booked time, expected time,
 * platform, status code.
 */
export function buildRegisters(entries: TimetableEntry[], clockSeconds: number): TimetableRegister[] {
  const clockMin = clockSeconds / 60
  return entries
    .filter((entry) => entry.kind === 'departure' && entry.expectedMin >= clockMin - 5)
    .sort((a, b) => Number(b.live) - Number(a.live) || a.expectedMin - b.expectedMin)
    .slice(0, 8)
    .map((entry, index) => ({
      address: `%MW${10 + index * 5}`,
      station: entry.station,
      scheduledMin: Math.round(entry.scheduledMin),
      expectedMin: Math.round(entry.expectedMin),
      platform: entry.platform,
      statusCode: STATUS_CODE[entry.status],
    }))
}
