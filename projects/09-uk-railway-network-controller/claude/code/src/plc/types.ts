/**
 * Process-image types, network topology and engineering constants for the
 * UK Intercity Railway Network & Block Signaling Controller.
 *
 * Target CPU: Siemens S7-1500F / Schneider M580 Safety (SIL4 interlocking).
 * Every field in `PlcInputs` / `PlcOutputs` / `PlcInternal` maps 1:1 onto an
 * address in the hardware I/O list documented in `docs/PLC_LOGIC.md`.
 */

// ---------------------------------------------------------------------------
// Task / timing
// ---------------------------------------------------------------------------

/** MAST task period of the safety CPU. */
export const SCAN_CYCLE_MS = 50

/**
 * Simulation time compression: one real second of wall clock advances the
 * network clock (and therefore train movement) by 120 simulated seconds, so a
 * ~740 km London–Edinburgh run completes in roughly two minutes of demo time.
 */
export const TIME_COMPRESSION = 120

/** VFD 100 % traction reference corresponds to this line speed. */
export const VFD_FULL_SCALE_KMH = 220

/** Class-800 style acceleration / service brake rates, km/h per second. */
export const TRACTION_ACCEL_KMH_S = 0.62
export const SERVICE_BRAKE_KMH_S = 1.25
export const EMERGENCY_BRAKE_KMH_S = 3.2

/** Nominal station dwell, simulated seconds. */
export const STATION_DWELL_S = 360
/** Dwell used while `M_NetworkState = 2` (EXPRESS_SERVICE). */
export const EXPRESS_DWELL_S = 150

/** Time a terminated service stands before it works the diagram again. */
export const SERVICE_TURNAROUND_S = 900

/** Platform boarding chime duration, simulated seconds. */
export const BUZZER_HOLD_S = 60

/** Distance at which a train starts braking for a signal at danger, km. */
export const BRAKING_DISTANCE_KM = 14

/** Caution / preliminary-caution aspect speed ceilings, km/h. */
export const SPEED_CAP_YELLOW = 40
export const SPEED_CAP_DOUBLE_YELLOW = 90

/** Line-speed ceiling per network state. */
export const SCHEDULED_LINE_SPEED = 165
export const EXPRESS_LINE_SPEED = 200

/** Point detection must re-prove within this window or the CPU faults. */
export const POINT_DETECT_TIMEOUT_MS = 4000
/** Time the switch rails take to swing and lock, real ms. */
export const POINT_SWING_MS = 2400

/** A service is flagged DELAYED at or beyond this many minutes late. */
export const DELAY_THRESHOLD_MIN = 5

// ---------------------------------------------------------------------------
// Network state machine (%MW0)
// ---------------------------------------------------------------------------

export const ST_STOPPED = 0
export const ST_SCHEDULED_RUN = 1
export const ST_EXPRESS_SERVICE = 2
export const ST_SIGNAL_FAULT = 99

export type NetworkState =
  | typeof ST_STOPPED
  | typeof ST_SCHEDULED_RUN
  | typeof ST_EXPRESS_SERVICE
  | typeof ST_SIGNAL_FAULT

export const NETWORK_STATE_LABEL: Record<NetworkState, string> = {
  [ST_STOPPED]: 'STOPPED',
  [ST_SCHEDULED_RUN]: 'SCHEDULED_RUN',
  [ST_EXPRESS_SERVICE]: 'EXPRESS_SERVICE',
  [ST_SIGNAL_FAULT]: 'SIGNAL_FAULT',
}

// ---------------------------------------------------------------------------
// Process image
// ---------------------------------------------------------------------------

export interface PlcInputs {
  /** %I0.0 — master emergency signal trip, wired normally-closed (TRUE = healthy). */
  I_EStop_NC: boolean
  /** %I0.1 — master timetable network service run pushbutton (momentary). */
  I_MasterRun_PB: boolean
  /** %I0.2 — signal & interlock alarm reset pushbutton (momentary). */
  I_ResetFault_PB: boolean
  /** %I0.3 — axle-counter head, London Terminal block. */
  I_AxleCounter_London: boolean
  /** %I0.4 — axle-counter head, Birmingham New Street block. */
  I_AxleCounter_Brum: boolean
  /** %I0.5 — axle-counter head, Manchester Piccadilly block. */
  I_AxleCounter_Manchester: boolean
  /** %I0.6 — axle-counter head, Edinburgh Waverley block. */
  I_AxleCounter_Edinburgh: boolean
  /** %I0.7 — point detection: switch rails closed AND locked in commanded position. */
  I_PointSwitch_Normal: boolean
  /** %IW100 — actual train speed, Intercity Express 1 (0.0…220.0 km/h). */
  AI_TractionSpeed_Intercity1: number
  /** %IW102 — actual train speed, Intercity Express 2 (0.0…220.0 km/h). */
  AI_TractionSpeed_Intercity2: number
  /** %IW104 — ATP track-curvature speed limit telegram (0.0…200.0 km/h). */
  AI_TrackCurvature_Limit: number
}

export interface PlcOutputs {
  /** %Q0.0 — green aspect, London departure block. */
  Q_Signal_London_Green: boolean
  /** %Q0.1 — green aspect, Birmingham hub block. */
  Q_Signal_Brum_Green: boolean
  /** %Q0.2 — green aspect, Manchester hub block. */
  Q_Signal_Manchester_Green: boolean
  /** %Q0.3 — green aspect, Glasgow/Edinburgh border block. */
  Q_Signal_Scotland_Green: boolean
  /** %Q0.4 — point machine contactor, main track (normal lie). */
  Q_PointMotor_AlignMain: boolean
  /** %Q0.5 — point machine contactor, branch line (reverse lie). */
  Q_PointMotor_AlignBranch: boolean
  /** %Q0.6 — station platform boarding chime / warning horn. */
  Q_PlatformBuzzer: boolean
  /** %Q0.7 — traction current third-rail / catenary power relay. */
  Q_MasterSafetyRelay: boolean
  /** %QW100 — VFD traction speed reference, Train 1 (0…100 %). */
  AQ_VFD_TractionSpeed1: number
  /** %QW102 — VFD traction speed reference, Train 2 (0…100 %). */
  AQ_VFD_TractionSpeed2: number
}

export interface PlcInternal {
  /** %MW0 */ M_NetworkState: NetworkState
  /** %MW2 */ M_TargetSpeed_Train1: number
  /** %MW4 */ M_TargetSpeed_Train2: number
  /** %MW6 */ M_ActiveBlockCount: number
  /** %M10.0 — service run latch (set by %I0.1, reset by trip/stop). */
  M_NetworkRun: boolean
  /** %M10.1 — retentive SIL4 trip latch. */
  M_SafetyTrip: boolean
  /** %M10.2 — audible/visual alarm active. */
  M_AlarmActive: boolean
  /** %M10.3 — point detection lost longer than the detection timeout. */
  M_PointDetectFault: boolean
  /** %M10.4 — operator has requested the reverse (branch) lie. */
  M_PointReverseCmd: boolean
  /** %M10.5 / %M10.6 — brake demand raised by the block interlock. */
  M_BrakeDemand_Train1: boolean
  M_BrakeDemand_Train2: boolean
  /** %MW8 / %MW9 — solved movement authority speed for each service, km/h. */
  M_PermittedSpeed_Train1: number
  M_PermittedSpeed_Train2: number
  /** %MW60 — network clock, simulated seconds since midnight. */
  M_ClockSeconds: number
  /** %MD64 — point detection watchdog accumulator, ms. */
  M_PointDetectTimerMs: number
  /** %MD68 — platform chime one-shot timer, simulated seconds. */
  M_BuzzerTimerS: number
  /** %MW70 — worst-case service delay currently on the network, minutes. */
  M_WorstDelayMin: number
}

/** Operator commands raised by the HMI faceplates (not a hardware address). */
export interface HmiCommands {
  targetSpeed1: number
  targetSpeed2: number
  expressService: boolean
  pointReverseRequest: boolean
  stopOverride1: boolean
  stopOverride2: boolean
}

// ---------------------------------------------------------------------------
// Stations
// ---------------------------------------------------------------------------

export type StationCode = 'LON' | 'COV' | 'BHM' | 'BRS' | 'LIV' | 'MAN' | 'LEE' | 'GLA' | 'EDI'

export interface StationDef {
  code: StationCode
  /** Short label used on the mimic. */
  city: string
  /** Full National Rail station name used on the PIS board. */
  name: string
  region: string
  platforms: number
  /** Mimic coordinates in the 460 × 680 map viewBox. */
  x: number
  y: number
  /** Label offset so text does not collide with the track lines. */
  labelDx: number
  labelDy: number
}

export const STATIONS: StationDef[] = [
  { code: 'EDI', city: 'Edinburgh', name: 'Edinburgh Waverley', region: 'Scotland', platforms: 20, x: 228, y: 104, labelDx: 12, labelDy: -8 },
  { code: 'GLA', city: 'Glasgow', name: 'Glasgow Central', region: 'Scotland', platforms: 17, x: 170, y: 124, labelDx: -12, labelDy: -8 },
  { code: 'LEE', city: 'Leeds', name: 'Leeds City', region: 'Yorkshire', platforms: 17, x: 290, y: 268, labelDx: 12, labelDy: 4 },
  { code: 'MAN', city: 'Manchester', name: 'Manchester Piccadilly', region: 'North West', platforms: 14, x: 248, y: 300, labelDx: 12, labelDy: 14 },
  { code: 'LIV', city: 'Liverpool', name: 'Liverpool Lime Street', region: 'North West', platforms: 10, x: 206, y: 306, labelDx: -12, labelDy: 4 },
  { code: 'BHM', city: 'Birmingham', name: 'Birmingham New Street', region: 'West Midlands', platforms: 13, x: 252, y: 410, labelDx: -12, labelDy: 4 },
  { code: 'COV', city: 'Coventry', name: 'Coventry', region: 'West Midlands', platforms: 6, x: 302, y: 404, labelDx: 12, labelDy: -6 },
  { code: 'BRS', city: 'Bristol', name: 'Bristol Temple Meads', region: 'South West', platforms: 15, x: 208, y: 480, labelDx: -12, labelDy: 8 },
  { code: 'LON', city: 'London', name: 'London Euston', region: 'Greater London', platforms: 18, x: 338, y: 492, labelDx: 12, labelDy: 10 },
]

export const STATION_BY_CODE: Record<StationCode, StationDef> = STATIONS.reduce(
  (acc, station) => {
    acc[station.code] = station
    return acc
  },
  {} as Record<StationCode, StationDef>,
)

// ---------------------------------------------------------------------------
// Track blocks (axle-counter sections)
// ---------------------------------------------------------------------------

export type SignalAspect = 'red' | 'yellow' | 'double-yellow' | 'green'

export interface BlockDef {
  id: string
  kind: 'station' | 'section'
  /** Station block: both ends are the same station. */
  from: StationCode
  to: StationCode
  lengthKm: number
  /** Permanent-way ATP line speed for this block, km/h. */
  lineSpeedKmh: number
  /** Blocks that can be entered from this one, in the northbound direction. */
  next: string[]
  label: string
}

export const stationBlockId = (code: StationCode) => `BLK_${code}`
export const sectionBlockId = (from: StationCode, to: StationCode) => `SEC_${from}_${to}`

const SECTION_SPEC: Array<[StationCode, StationCode, number, number]> = [
  ['LON', 'COV', 152, 200],
  ['COV', 'BHM', 30, 145],
  ['BHM', 'MAN', 138, 175],
  ['BHM', 'LIV', 158, 160],
  ['LIV', 'MAN', 55, 120],
  ['MAN', 'GLA', 341, 200],
  ['GLA', 'EDI', 75, 130],
  ['BRS', 'BHM', 143, 180],
  ['BHM', 'LEE', 190, 160],
  ['LEE', 'EDI', 330, 195],
]

/** Northbound successor stations for each station node. */
const STATION_SUCCESSORS: Record<StationCode, StationCode[]> = {
  LON: ['COV'],
  COV: ['BHM'],
  BRS: ['BHM'],
  BHM: ['MAN', 'LIV', 'LEE'],
  LIV: ['MAN'],
  MAN: ['GLA'],
  LEE: ['EDI'],
  GLA: ['EDI'],
  EDI: [],
}

export const SECTION_BLOCKS: BlockDef[] = SECTION_SPEC.map(([from, to, lengthKm, lineSpeedKmh]) => ({
  id: sectionBlockId(from, to),
  kind: 'section' as const,
  from,
  to,
  lengthKm,
  lineSpeedKmh,
  next: [stationBlockId(to)],
  label: `${STATION_BY_CODE[from].city} – ${STATION_BY_CODE[to].city}`,
}))

export const STATION_BLOCKS: BlockDef[] = STATIONS.map((station) => ({
  id: stationBlockId(station.code),
  kind: 'station' as const,
  from: station.code,
  to: station.code,
  lengthKm: 2,
  lineSpeedKmh: 60,
  next: STATION_SUCCESSORS[station.code].map((to) => sectionBlockId(station.code, to)),
  label: `${station.name} platforms`,
}))

export const BLOCKS: BlockDef[] = [...STATION_BLOCKS, ...SECTION_BLOCKS]

export const BLOCK_BY_ID: Record<string, BlockDef> = BLOCKS.reduce(
  (acc, block) => {
    acc[block.id] = block
    return acc
  },
  {} as Record<string, BlockDef>,
)

export function sectionLengthKm(from: StationCode, to: StationCode): number {
  return BLOCK_BY_ID[sectionBlockId(from, to)]?.lengthKm ?? 0
}

/**
 * Hard-wired axle-counter heads. Every other block is evaluated from the
 * remote axle-counter evaluator telegrams (modelled by the plant simulation),
 * exactly as on a real ETCS L1 fringe where only the fringe boxes are
 * physically wired back to the interlocking.
 */
export const AXLE_COUNTER_BLOCK: Record<keyof Pick<
  PlcInputs,
  'I_AxleCounter_London' | 'I_AxleCounter_Brum' | 'I_AxleCounter_Manchester' | 'I_AxleCounter_Edinburgh'
>, string> = {
  I_AxleCounter_London: stationBlockId('LON'),
  I_AxleCounter_Brum: stationBlockId('BHM'),
  I_AxleCounter_Manchester: stationBlockId('MAN'),
  I_AxleCounter_Edinburgh: stationBlockId('EDI'),
}

/** The four physical signal heads and the block each one protects. */
export const SIGNAL_HEADS: Array<{
  coil: keyof PlcOutputs
  block: string
  name: string
}> = [
  { coil: 'Q_Signal_London_Green', block: sectionBlockId('LON', 'COV'), name: 'London departure block' },
  { coil: 'Q_Signal_Brum_Green', block: stationBlockId('BHM'), name: 'Birmingham hub block' },
  { coil: 'Q_Signal_Manchester_Green', block: stationBlockId('MAN'), name: 'Manchester hub block' },
  { coil: 'Q_Signal_Scotland_Green', block: stationBlockId('GLA'), name: 'Glasgow/Edinburgh border block' },
]

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export type ServiceId = 'IC1' | 'IC2'

export interface ServiceDef {
  id: ServiceId
  headcode: string
  name: string
  operator: string
  /** Calling pattern with the junction lying normal (main line). */
  mainStops: StationCode[]
  /** Calling pattern with Birmingham North Jn reversed (branch via Liverpool). */
  branchStops: StationCode[]
  /** Booked departure from the origin, simulated seconds since midnight. */
  bookedDepartureS: number
  /** Platform allocation per station. */
  platform: Partial<Record<StationCode, number>>
}

export const SERVICES: ServiceDef[] = [
  {
    id: 'IC1',
    headcode: '1S47',
    name: 'Caledonian Intercity Express',
    operator: 'Avanti West Coast',
    mainStops: ['LON', 'COV', 'BHM', 'MAN', 'GLA', 'EDI'],
    branchStops: ['LON', 'COV', 'BHM', 'LIV', 'MAN', 'GLA', 'EDI'],
    bookedDepartureS: 8 * 3600 + 5 * 60,
    platform: { LON: 3, COV: 1, BHM: 4, LIV: 7, MAN: 5, GLA: 2, EDI: 11 },
  },
  {
    id: 'IC2',
    headcode: '1E23',
    name: 'Western Crossrail Highland',
    operator: 'CrossCountry',
    mainStops: ['BRS', 'BHM', 'LEE', 'EDI'],
    branchStops: ['BRS', 'BHM', 'LEE', 'EDI'],
    bookedDepartureS: 8 * 3600 + 20 * 60,
    platform: { BRS: 9, BHM: 8, LEE: 6, EDI: 14 },
  },
]

export const SERVICE_BY_ID: Record<ServiceId, ServiceDef> = SERVICES.reduce(
  (acc, service) => {
    acc[service.id] = service
    return acc
  },
  {} as Record<ServiceId, ServiceDef>,
)

/** Planning speed used to build the working timetable, km/h. */
export const TIMETABLE_PLANNING_SPEED = 150

// ---------------------------------------------------------------------------
// Timetable
// ---------------------------------------------------------------------------

export type TimetableStatus = 'ON TIME' | 'BOARDING' | 'DEPARTED' | 'DELAYED' | 'ARRIVED' | 'CANCELLED'

export const STATUS_CODE: Record<TimetableStatus, number> = {
  'ON TIME': 0,
  BOARDING: 1,
  DEPARTED: 2,
  DELAYED: 3,
  ARRIVED: 4,
  CANCELLED: 5,
}

export interface TimetableEntry {
  id: string
  station: StationCode
  kind: 'departure' | 'arrival'
  /** Destination for a departure row, origin for an arrival row. */
  counterparty: string
  via: string
  headcode: string
  operator: string
  /** Simulated minutes since midnight. */
  scheduledMin: number
  expectedMin: number
  platform: number
  status: TimetableStatus
  /** TRUE when the row is one of the two PLC-tracked live services. */
  live: boolean
}

/** One %MW register frame per tracked service call. */
export interface TimetableRegister {
  address: string
  station: StationCode
  scheduledMin: number
  expectedMin: number
  platform: number
  statusCode: number
}

// ---------------------------------------------------------------------------
// Address map (used by the LD monitor annotations)
// ---------------------------------------------------------------------------

export const TAG_ADDRESS: Record<string, string> = {
  I_EStop_NC: '%I0.0',
  I_MasterRun_PB: '%I0.1',
  I_ResetFault_PB: '%I0.2',
  I_AxleCounter_London: '%I0.3',
  I_AxleCounter_Brum: '%I0.4',
  I_AxleCounter_Manchester: '%I0.5',
  I_AxleCounter_Edinburgh: '%I0.6',
  I_PointSwitch_Normal: '%I0.7',
  AI_TractionSpeed_Intercity1: '%IW100',
  AI_TractionSpeed_Intercity2: '%IW102',
  AI_TrackCurvature_Limit: '%IW104',

  Q_Signal_London_Green: '%Q0.0',
  Q_Signal_Brum_Green: '%Q0.1',
  Q_Signal_Manchester_Green: '%Q0.2',
  Q_Signal_Scotland_Green: '%Q0.3',
  Q_PointMotor_AlignMain: '%Q0.4',
  Q_PointMotor_AlignBranch: '%Q0.5',
  Q_PlatformBuzzer: '%Q0.6',
  Q_MasterSafetyRelay: '%Q0.7',
  AQ_VFD_TractionSpeed1: '%QW100',
  AQ_VFD_TractionSpeed2: '%QW102',

  M_NetworkState: '%MW0',
  M_TargetSpeed_Train1: '%MW2',
  M_TargetSpeed_Train2: '%MW4',
  M_ActiveBlockCount: '%MW6',
  M_PermittedSpeed_Train1: '%MW8',
  M_PermittedSpeed_Train2: '%MW9',
  M_NetworkRun: '%M10.0',
  M_SafetyTrip: '%M10.1',
  M_AlarmActive: '%M10.2',
  M_PointDetectFault: '%M10.3',
  M_PointReverseCmd: '%M10.4',
  M_BrakeDemand_Train1: '%M10.5',
  M_BrakeDemand_Train2: '%M10.6',
  M_ClockSeconds: '%MW60',
  M_WorstDelayMin: '%MW70',
}

// ---------------------------------------------------------------------------
// Small helpers shared by the logic, the plant model and the UI
// ---------------------------------------------------------------------------

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

/** Formats simulated seconds-since-midnight as `HH:MM`. */
export function formatClock(totalSeconds: number): string {
  const wrapped = ((totalSeconds % 86400) + 86400) % 86400
  const hours = Math.floor(wrapped / 3600)
  const minutes = Math.floor((wrapped % 3600) / 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** Formats simulated minutes-since-midnight as `HH:MM`. */
export function formatMinutes(totalMinutes: number): string {
  return formatClock(Math.round(totalMinutes) * 60)
}
