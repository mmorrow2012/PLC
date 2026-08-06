/**
 * Declarative model of the Function Block Diagram / Ladder Diagram networks
 * compiled from `railwayLogic.st`.
 *
 * `LadderDiagram.tsx` renders this structure as a live 24 V power-flow
 * monitor: every contact, comparison box, function-block body and coil is
 * evaluated against the current process image each scan, exactly like the
 * animated program view in TIA Portal / EcoStruxure Control Expert.
 */

import { DELAY_THRESHOLD_MIN, POINT_DETECT_TIMEOUT_MS, TAG_ADDRESS } from './types'

export type LadderValue = boolean | number
export type TagMap = Record<string, LadderValue>

export type CompareOp = '>' | '>=' | '<' | '<=' | '=' | '<>'

export type LadderNode =
  /** Normally-open / normally-closed contact, or a rising-edge (P) contact. */
  | { kind: 'contact'; variant: 'NO' | 'NC' | 'P'; tag: string }
  /** IEC comparison block (GT / GE / LT / LE / EQ / NE). */
  | { kind: 'compare'; tag: string; op: CompareOp; ref: number | string }
  /** Parallel branch — OR of the contained series paths. */
  | { kind: 'parallel'; branches: LadderNode[][] }

export interface LadderCoil {
  /** `coil` = plain output, `set`/`reset` = latch pair, `analog` = MOVE to %QW/%MW. */
  variant: 'coil' | 'set' | 'reset' | 'analog'
  tag: string
}

export interface LadderRung {
  id: string
  comment: string
  nodes: LadderNode[]
  coils: LadderCoil[]
}

export interface LadderBlockPin {
  name: string
  tag: string
}

export interface LadderBlock {
  name: string
  inputs: LadderBlockPin[]
  outputs: LadderBlockPin[]
  /** Tag whose truthiness marks the FB as actively controlling this scan. */
  enableTag: string
}

export interface LadderNetwork {
  id: string
  title: string
  comment: string
  block?: LadderBlock
  rungs: LadderRung[]
}

// ---------------------------------------------------------------------------
// Derived tags — expression results the ladder shows as named intermediates.
// They carry no %M address because in the ST source they are FB locals.
// ---------------------------------------------------------------------------

export const DERIVED_TAGS = {
  tripCondActive: '_TripCondActive',
  clearLondon: '_ClearLondonDep',
  aheadLondon: '_AheadOccLondonDep',
  clearBrum: '_ClearBrumHub',
  aheadBrum: '_AheadOccBrumHub',
  clearManchester: '_ClearManchesterHub',
  aheadManchester: '_AheadOccManchesterHub',
  clearScotland: '_ClearScotBorder',
  aheadScotland: '_AheadOccScotBorder',
  atpOverspeed1: '_ATP_Overspeed_T1',
  atpOverspeed2: '_ATP_Overspeed_T2',
  atpLimitTrain2: '_ATP_Limit_T2',
  boardingCall: '_BoardingCall',
  delayAlarm: '_DelayAlarm',
  junctionClear: '_JunctionClear',
  routeRequestBranch: '_RouteRequest_Branch',
} as const

export const NETWORKS: LadderNetwork[] = [
  {
    id: 'safety',
    title: 'Network 1 — FB_SafetyInterlock (SIL4)',
    comment:
      'Highest-priority network, solved before any movement authority. Trips on a broken E-Stop chain (%I0.0 = FALSE) or on loss of point detection (%I0.7 = FALSE) for longer than the 4 s detection watchdog, de-energising the traction supply relay %Q0.7 and applying the emergency brake to every service.',
    block: {
      name: 'FB_SafetyInterlock',
      enableTag: 'M_SafetyTrip',
      inputs: [
        { name: 'EStopChain', tag: 'I_EStop_NC' },
        { name: 'PointDetect', tag: 'I_PointSwitch_Normal' },
        { name: 'ResetPB', tag: 'I_ResetFault_PB' },
        { name: 'RunLatch', tag: 'M_NetworkRun' },
      ],
      outputs: [
        { name: 'Trip', tag: 'M_SafetyTrip' },
        { name: 'AlarmActive', tag: 'M_AlarmActive' },
        { name: 'DetectFault', tag: 'M_PointDetectFault' },
        { name: 'TractionRelay', tag: 'Q_MasterSafetyRelay' },
      ],
    },
    rungs: [
      {
        id: '1.1',
        comment: 'Trip collector — any conducting branch latches the retentive SIL4 trip',
        nodes: [
          {
            kind: 'parallel',
            branches: [
              [{ kind: 'contact', variant: 'NC', tag: 'I_EStop_NC' }],
              [{ kind: 'contact', variant: 'NO', tag: 'M_PointDetectFault' }],
            ],
          },
        ],
        coils: [{ variant: 'set', tag: 'M_SafetyTrip' }],
      },
      {
        id: '1.2',
        comment: 'Acknowledged reset — only unlatches with every trip condition already healthy',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: 'I_ResetFault_PB' },
          { kind: 'contact', variant: 'NC', tag: DERIVED_TAGS.tripCondActive },
        ],
        coils: [{ variant: 'reset', tag: 'M_SafetyTrip' }],
      },
      {
        id: '1.3',
        comment: 'Traction current relay — catenary/third rail is live only on a healthy running network',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: 'M_NetworkRun' },
          { kind: 'contact', variant: 'NC', tag: 'M_SafetyTrip' },
        ],
        coils: [{ variant: 'coil', tag: 'Q_MasterSafetyRelay' }],
      },
      {
        id: '1.4',
        comment: 'Point detection watchdog — 4 000 ms out of correspondence is a signalling failure',
        nodes: [
          { kind: 'contact', variant: 'NC', tag: 'I_PointSwitch_Normal' },
          { kind: 'compare', tag: 'M_PointDetectTimerMs', op: '>=', ref: POINT_DETECT_TIMEOUT_MS },
        ],
        coils: [{ variant: 'coil', tag: 'M_PointDetectFault' }],
      },
    ],
  },
  {
    id: 'interlock',
    title: 'Network 2 — FB_TrackBlockInterlock',
    comment:
      'Absolute block working. Each green aspect is proved by its own block being clear of axle counts AND the block beyond it being clear; anything less and the aspect steps down to yellow or red, withdrawing movement authority from the trailing service at full braking distance.',
    block: {
      name: 'FB_TrackBlockInterlock',
      enableTag: 'M_NetworkRun',
      inputs: [
        { name: 'AxleLondon', tag: 'I_AxleCounter_London' },
        { name: 'AxleBrum', tag: 'I_AxleCounter_Brum' },
        { name: 'AxleManchester', tag: 'I_AxleCounter_Manchester' },
        { name: 'AxleEdinburgh', tag: 'I_AxleCounter_Edinburgh' },
        { name: 'SafetyTrip', tag: 'M_SafetyTrip' },
      ],
      outputs: [
        { name: 'SigLondon', tag: 'Q_Signal_London_Green' },
        { name: 'SigBrum', tag: 'Q_Signal_Brum_Green' },
        { name: 'SigManchester', tag: 'Q_Signal_Manchester_Green' },
        { name: 'SigScotland', tag: 'Q_Signal_Scotland_Green' },
        { name: 'BlockCount', tag: 'M_ActiveBlockCount' },
      ],
    },
    rungs: [
      {
        id: '2.1',
        comment: 'London departure block — clear ahead, network running, no trip',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: DERIVED_TAGS.clearLondon },
          { kind: 'contact', variant: 'NC', tag: DERIVED_TAGS.aheadLondon },
          { kind: 'contact', variant: 'NO', tag: 'M_NetworkRun' },
          { kind: 'contact', variant: 'NC', tag: 'M_SafetyTrip' },
        ],
        coils: [{ variant: 'coil', tag: 'Q_Signal_London_Green' }],
      },
      {
        id: '2.2',
        comment: 'Birmingham New Street hub block — the busiest conflict point on the network',
        nodes: [
          { kind: 'contact', variant: 'NC', tag: 'I_AxleCounter_Brum' },
          { kind: 'contact', variant: 'NC', tag: DERIVED_TAGS.aheadBrum },
          { kind: 'contact', variant: 'NO', tag: 'M_NetworkRun' },
          { kind: 'contact', variant: 'NC', tag: 'M_SafetyTrip' },
        ],
        coils: [{ variant: 'coil', tag: 'Q_Signal_Brum_Green' }],
      },
      {
        id: '2.3',
        comment: 'Manchester Piccadilly hub block — main and branch routes converge here',
        nodes: [
          { kind: 'contact', variant: 'NC', tag: 'I_AxleCounter_Manchester' },
          { kind: 'contact', variant: 'NC', tag: DERIVED_TAGS.aheadManchester },
          { kind: 'contact', variant: 'NO', tag: 'M_NetworkRun' },
          { kind: 'contact', variant: 'NC', tag: 'M_SafetyTrip' },
        ],
        coils: [{ variant: 'coil', tag: 'Q_Signal_Manchester_Green' }],
      },
      {
        id: '2.4',
        comment: 'Glasgow / Edinburgh border block — proved against the Waverley axle counter',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: DERIVED_TAGS.clearScotland },
          { kind: 'contact', variant: 'NC', tag: 'I_AxleCounter_Edinburgh' },
          { kind: 'contact', variant: 'NO', tag: 'M_NetworkRun' },
          { kind: 'contact', variant: 'NC', tag: 'M_SafetyTrip' },
        ],
        coils: [{ variant: 'coil', tag: 'Q_Signal_Scotland_Green' }],
      },
      {
        id: '2.5',
        comment: 'Occupied-block census across all 19 axle-counter sections',
        nodes: [{ kind: 'contact', variant: 'NO', tag: 'M_NetworkRun' }],
        coils: [{ variant: 'analog', tag: 'M_ActiveBlockCount' }],
      },
      {
        id: '2.6',
        comment: 'Brake demand — signal at danger inside braking distance holds the trailing service',
        nodes: [
          {
            kind: 'parallel',
            branches: [
              [{ kind: 'contact', variant: 'NO', tag: 'M_BrakeDemand_Train1' }],
              [{ kind: 'contact', variant: 'NO', tag: 'M_SafetyTrip' }],
            ],
          },
        ],
        coils: [{ variant: 'coil', tag: 'M_BrakeDemand_Train1' }],
      },
    ],
  },
  {
    id: 'speed',
    title: 'Network 3 — FB_SpeedSupervision',
    comment:
      'Solves the movement-authority ceiling for each service as MIN(operator setpoint %MW2/%MW4, network line speed, ATP curvature limit %IW104, permanent-way block limit, braking curve) and slews the VFD traction references %QW100 / %QW102 towards it instead of stepping them.',
    block: {
      name: 'FB_SpeedSupervision',
      enableTag: 'Q_MasterSafetyRelay',
      inputs: [
        { name: 'ActualSpeed1', tag: 'AI_TractionSpeed_Intercity1' },
        { name: 'ActualSpeed2', tag: 'AI_TractionSpeed_Intercity2' },
        { name: 'Setpoint1', tag: 'M_TargetSpeed_Train1' },
        { name: 'Setpoint2', tag: 'M_TargetSpeed_Train2' },
        { name: 'ATPLimit', tag: 'AI_TrackCurvature_Limit' },
      ],
      outputs: [
        { name: 'Permitted1', tag: 'M_PermittedSpeed_Train1' },
        { name: 'Permitted2', tag: 'M_PermittedSpeed_Train2' },
        { name: 'VFDRef1', tag: 'AQ_VFD_TractionSpeed1' },
        { name: 'VFDRef2', tag: 'AQ_VFD_TractionSpeed2' },
      ],
    },
    rungs: [
      {
        id: '3.1',
        comment: 'Train 1 traction reference — released while power is on and no brake demand stands',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: 'Q_MasterSafetyRelay' },
          { kind: 'compare', tag: 'M_PermittedSpeed_Train1', op: '>', ref: 0 },
          { kind: 'contact', variant: 'NC', tag: 'M_BrakeDemand_Train1' },
        ],
        coils: [{ variant: 'analog', tag: 'AQ_VFD_TractionSpeed1' }],
      },
      {
        id: '3.2',
        comment: 'Train 2 traction reference',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: 'Q_MasterSafetyRelay' },
          { kind: 'compare', tag: 'M_PermittedSpeed_Train2', op: '>', ref: 0 },
          { kind: 'contact', variant: 'NC', tag: 'M_BrakeDemand_Train2' },
        ],
        coils: [{ variant: 'analog', tag: 'AQ_VFD_TractionSpeed2' }],
      },
      {
        id: '3.3',
        comment: 'ATP overspeed supervision — actual speed above the curvature telegram',
        nodes: [
          {
            kind: 'compare',
            tag: 'AI_TractionSpeed_Intercity1',
            op: '>',
            ref: 'AI_TrackCurvature_Limit',
          },
        ],
        coils: [{ variant: 'coil', tag: DERIVED_TAGS.atpOverspeed1 }],
      },
      {
        id: '3.4',
        comment: 'ATP overspeed supervision, trailing service — limit read from the track database',
        nodes: [
          {
            kind: 'compare',
            tag: 'AI_TractionSpeed_Intercity2',
            op: '>',
            ref: DERIVED_TAGS.atpLimitTrain2,
          },
        ],
        coils: [{ variant: 'coil', tag: DERIVED_TAGS.atpOverspeed2 }],
      },
    ],
  },
  {
    id: 'timetable',
    title: 'Network 4 — FB_TimetableManager',
    comment:
      'Drives the network clock, the %MW0 operating-state machine and the %MW10–%MW50 departure register table that feeds the passenger information boards at all nine stations, and sounds the platform chime for the last minute of each station dwell.',
    block: {
      name: 'FB_TimetableManager',
      enableTag: 'M_NetworkRun',
      inputs: [
        { name: 'RunPB', tag: 'I_MasterRun_PB' },
        { name: 'SafetyTrip', tag: 'M_SafetyTrip' },
        { name: 'BlockCount', tag: 'M_ActiveBlockCount' },
        { name: 'Clock', tag: 'M_ClockSeconds' },
      ],
      outputs: [
        { name: 'State', tag: 'M_NetworkState' },
        { name: 'WorstDelay', tag: 'M_WorstDelayMin' },
        { name: 'Chime', tag: 'Q_PlatformBuzzer' },
      ],
    },
    rungs: [
      {
        id: '4.1',
        comment: 'Alternate-action service run selector on the rising edge of %I0.1',
        nodes: [
          { kind: 'contact', variant: 'P', tag: 'I_MasterRun_PB' },
          { kind: 'contact', variant: 'NC', tag: 'M_SafetyTrip' },
        ],
        coils: [{ variant: 'set', tag: 'M_NetworkRun' }],
      },
      {
        id: '4.2',
        comment: 'Platform boarding chime — last 60 s of the station dwell',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: DERIVED_TAGS.boardingCall },
          { kind: 'contact', variant: 'NO', tag: 'M_NetworkRun' },
          { kind: 'contact', variant: 'NC', tag: 'M_SafetyTrip' },
        ],
        coils: [{ variant: 'coil', tag: 'Q_PlatformBuzzer' }],
      },
      {
        id: '4.3',
        comment: 'Operating state word — 0 STOPPED / 1 SCHEDULED_RUN / 2 EXPRESS_SERVICE / 99 SIGNAL_FAULT',
        nodes: [
          {
            kind: 'parallel',
            branches: [
              [{ kind: 'contact', variant: 'NO', tag: 'M_NetworkRun' }],
              [{ kind: 'contact', variant: 'NO', tag: 'M_SafetyTrip' }],
            ],
          },
        ],
        coils: [{ variant: 'analog', tag: 'M_NetworkState' }],
      },
      {
        id: '4.4',
        comment: 'Delay attribution — a service 5 minutes or more down is reported DELAYED on the PIS',
        nodes: [{ kind: 'compare', tag: 'M_WorstDelayMin', op: '>=', ref: DELAY_THRESHOLD_MIN }],
        coils: [{ variant: 'coil', tag: DERIVED_TAGS.delayAlarm }],
      },
    ],
  },
  {
    id: 'points',
    title: 'Network 5 — Point Machine & Route Locking',
    comment:
      'Birmingham North Junction. The machine may only be driven while the junction block is clear of axle counts, so a set route can never be pulled from under a train; the contactors drop as soon as detection re-proves in the commanded lie.',
    rungs: [
      {
        id: '5.1',
        comment: 'Drive to NORMAL (main line, Birmingham → Manchester)',
        nodes: [
          { kind: 'contact', variant: 'NC', tag: 'M_PointReverseCmd' },
          { kind: 'contact', variant: 'NC', tag: 'I_PointSwitch_Normal' },
          { kind: 'contact', variant: 'NC', tag: 'M_SafetyTrip' },
        ],
        coils: [{ variant: 'coil', tag: 'Q_PointMotor_AlignMain' }],
      },
      {
        id: '5.2',
        comment: 'Drive to REVERSE (branch line, Birmingham → Liverpool)',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: 'M_PointReverseCmd' },
          { kind: 'contact', variant: 'NC', tag: 'I_PointSwitch_Normal' },
          { kind: 'contact', variant: 'NC', tag: 'M_SafetyTrip' },
        ],
        coils: [{ variant: 'coil', tag: 'Q_PointMotor_AlignBranch' }],
      },
      {
        id: '5.3',
        comment: 'Route locking — a reverse request is only accepted with the junction block clear',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: DERIVED_TAGS.routeRequestBranch },
          { kind: 'contact', variant: 'NO', tag: DERIVED_TAGS.junctionClear },
          { kind: 'contact', variant: 'NC', tag: 'M_SafetyTrip' },
        ],
        coils: [{ variant: 'coil', tag: 'M_PointReverseCmd' }],
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Live evaluation
// ---------------------------------------------------------------------------

function truthy(value: LadderValue | undefined): boolean {
  return typeof value === 'number' ? value !== 0 : Boolean(value)
}

function resolveRef(ref: number | string, tags: TagMap): number {
  if (typeof ref === 'number') return ref
  const value = tags[ref]
  return typeof value === 'number' ? value : Number(truthy(value))
}

export function evaluateCompare(op: CompareOp, left: number, right: number): boolean {
  switch (op) {
    case '>':
      return left > right
    case '>=':
      return left >= right
    case '<':
      return left < right
    case '<=':
      return left <= right
    case '=':
      return left === right
    case '<>':
      return left !== right
  }
}

/** Does this single element pass power? */
export function evaluateNode(node: LadderNode, tags: TagMap): boolean {
  switch (node.kind) {
    case 'contact': {
      const value = truthy(tags[node.tag])
      return node.variant === 'NC' ? !value : value
    }
    case 'compare': {
      const left = tags[node.tag]
      return evaluateCompare(
        node.op,
        typeof left === 'number' ? left : Number(truthy(left)),
        resolveRef(node.ref, tags),
      )
    }
    case 'parallel':
      return node.branches.some((branch) => branch.every((child) => evaluateNode(child, tags)))
  }
}

/** Power reaching the coils at the right rail. */
export function evaluateRung(rung: LadderRung, tags: TagMap): boolean {
  return rung.nodes.every((node) => evaluateNode(node, tags))
}

/** Human-readable value for the online-monitor annotation under each element. */
export function formatTagValue(tag: string, tags: TagMap): string {
  const value = tags[tag]
  if (value === undefined) return '—'
  if (typeof value === 'boolean') return value ? '1' : '0'
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function tagAddress(tag: string): string {
  return TAG_ADDRESS[tag] ?? ''
}
