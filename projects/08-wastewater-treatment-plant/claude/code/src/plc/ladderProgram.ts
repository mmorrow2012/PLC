/**
 * Declarative model of the Function Block Diagram / Ladder Diagram networks
 * compiled from `wastewaterLogic.st`.
 *
 * `LadderDiagram.tsx` renders this structure as a live 24 V power-flow
 * monitor: every contact, comparison box, DFB body and coil is evaluated
 * against the current process image each scan, exactly like the animated
 * program view in EcoStruxure Control Expert.
 */

import {
  AERATION_MIN_LEVEL_M,
  CLARIFIER_DISCHARGE_M,
  EQ_LAG_START_M,
  EQ_LEAD_START_M,
  RAS_MIN_CLARIFIER_M,
  ST_AERATION_ACTIVE,
  ST_CLARIFYING,
  TAG_ADDRESS,
  TURBIDITY_TRIP_NTU,
} from './types'

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
  /** `coil` = plain output, `set`/`reset` = latch pair, `analog` = MOVE to %QW. */
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
  /** Tag whose truthiness marks the DFB as actively controlling this scan. */
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
// They carry no %M address because in the ST source they are DFB locals.
// ---------------------------------------------------------------------------
export const DERIVED_TAGS = {
  tripCondActive: '_TripCondActive',
  pumpEnable: '_PumpEnable',
  aerEnable: '_AerEnable',
  clarifierLevel: '_ClarifierLevel',
  coagSetpoint: '_CoagSetpoint',
  leadIsPump1: '_LeadIsPump1',
  leadIsPump2: '_LeadIsPump2',
} as const

export const NETWORKS: LadderNetwork[] = [
  {
    id: 'safety',
    title: 'Network 1 — FB_SafetyInterlock',
    comment:
      'Highest-priority network. Trips on a broken E-Stop chain, the equalization basin high-high float, or effluent turbidity above 25.0 NTU. The latch is retentive and only clears on an acknowledged, condition-free reset.',
    block: {
      name: 'FB_SafetyInterlock',
      enableTag: 'M_SafetyTrip',
      inputs: [
        { name: 'EStopHealthy', tag: 'I_EStop_NC' },
        { name: 'FloatHH_Eq', tag: 'I_LSH_Equalization' },
        { name: 'Turbidity', tag: 'AI_Turbidity_Effluent' },
        { name: 'ResetPB', tag: 'I_ResetFault_PB' },
      ],
      outputs: [
        { name: 'Trip', tag: 'M_SafetyTrip' },
        { name: 'AlarmActive', tag: 'M_AlarmActive' },
        { name: 'ForceWeirShut', tag: 'M_SafetyTrip' },
      ],
    },
    rungs: [
      {
        id: '1.1',
        comment: 'Trip condition collector — any branch conducting sets the latch',
        nodes: [
          {
            kind: 'parallel',
            branches: [
              [{ kind: 'contact', variant: 'NC', tag: 'I_EStop_NC' }],
              [{ kind: 'contact', variant: 'NO', tag: 'I_LSH_Equalization' }],
              [
                {
                  kind: 'compare',
                  tag: 'AI_Turbidity_Effluent',
                  op: '>',
                  ref: TURBIDITY_TRIP_NTU,
                },
              ],
            ],
          },
        ],
        coils: [{ variant: 'set', tag: 'M_SafetyTrip' }],
      },
      {
        id: '1.2',
        comment: 'Fault acknowledgment — rising edge, only with every condition cleared',
        nodes: [
          { kind: 'contact', variant: 'P', tag: 'I_ResetFault_PB' },
          { kind: 'contact', variant: 'NC', tag: DERIVED_TAGS.tripCondActive },
        ],
        coils: [{ variant: 'reset', tag: 'M_SafetyTrip' }],
      },
      {
        id: '1.3',
        comment: 'Alarm beacon and horn follow the trip latch',
        nodes: [{ kind: 'contact', variant: 'NO', tag: 'M_SafetyTrip' }],
        coils: [{ variant: 'coil', tag: 'M_AlarmActive' }],
      },
    ],
  },
  {
    id: 'run',
    title: 'Network 2 — Master Run Seal-in & %MW0 State Machine',
    comment:
      'Classic start/stop seal-in with a stop-dominant safety branch. M_PlantState sequences OFF → EQUALIZING → AERATION_ACTIVE → CLARIFYING → EFFLUENT_DISCHARGE, forced to 99 (ALARM) whenever the interlock is latched.',
    rungs: [
      {
        id: '2.1',
        comment: 'Run latch — start pushbutton sealed by its own contact',
        nodes: [
          {
            kind: 'parallel',
            branches: [
              [{ kind: 'contact', variant: 'NO', tag: 'I_PlantStart_PB' }],
              [{ kind: 'contact', variant: 'NO', tag: 'M_PlantRun' }],
            ],
          },
          { kind: 'contact', variant: 'NC', tag: 'I_PlantStop_PB' },
          { kind: 'contact', variant: 'NC', tag: 'M_SafetyTrip' },
        ],
        coils: [{ variant: 'coil', tag: 'M_PlantRun' }],
      },
      {
        id: '2.2',
        comment: 'Operating state word — driven by the CASE sequencer',
        nodes: [{ kind: 'contact', variant: 'NO', tag: 'M_PlantRun' }],
        coils: [{ variant: 'analog', tag: 'M_PlantState' }],
      },
    ],
  },
  {
    id: 'leadlag',
    title: 'Network 3 — FB_LeadLagPump',
    comment:
      'Influent duty/standby pumping off %IW100. Lead pump at 3.0 m, lag pump at 6.0 m with the VFD reference ramping to 100 %. Duty rotates on the falling edge of the pump call so running hours stay balanced.',
    block: {
      name: 'FB_LeadLagPump',
      enableTag: DERIVED_TAGS.pumpEnable,
      inputs: [
        { name: 'Enable', tag: DERIVED_TAGS.pumpEnable },
        { name: 'Level', tag: 'AI_LT_EqBasin' },
        { name: 'LeadToggle', tag: 'M_LeadPumpToggle' },
      ],
      outputs: [
        { name: 'Pump1', tag: 'Q_Pump_RawInfluent1' },
        { name: 'Pump2', tag: 'Q_Pump_RawInfluent2' },
        { name: 'SpeedRef', tag: 'AQ_VFD_InfluentSpeed' },
      ],
    },
    rungs: [
      {
        id: '3.1',
        comment: 'Pumping permissive — inhibited by either aeration high-level float',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: 'M_PlantRun' },
          { kind: 'contact', variant: 'NC', tag: 'M_SafetyTrip' },
          { kind: 'contact', variant: 'NC', tag: 'I_LSH_AerationA' },
          { kind: 'contact', variant: 'NC', tag: 'I_LSH_AerationB' },
        ],
        coils: [{ variant: 'coil', tag: DERIVED_TAGS.pumpEnable }],
      },
      {
        id: '3.2',
        comment: 'Lead pump call at 3.0 m (drops out below 1.0 m — hysteresis in the DFB)',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: DERIVED_TAGS.pumpEnable },
          { kind: 'compare', tag: 'AI_LT_EqBasin', op: '>=', ref: EQ_LEAD_START_M },
        ],
        coils: [{ variant: 'coil', tag: 'M_LeadPumpCall' }],
      },
      {
        id: '3.3',
        comment: 'Lag pump call at 6.0 m (drops out below 4.5 m)',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: 'M_LeadPumpCall' },
          { kind: 'compare', tag: 'AI_LT_EqBasin', op: '>=', ref: EQ_LAG_START_M },
        ],
        coils: [{ variant: 'coil', tag: 'M_LagPumpCall' }],
      },
      {
        id: '3.4',
        comment: 'Duty rotation mapping — %MW6 decides which motor is lead',
        nodes: [
          {
            kind: 'parallel',
            branches: [
              [
                { kind: 'contact', variant: 'NO', tag: 'M_LeadPumpCall' },
                { kind: 'contact', variant: 'NO', tag: DERIVED_TAGS.leadIsPump1 },
              ],
              [
                { kind: 'contact', variant: 'NO', tag: 'M_LagPumpCall' },
                { kind: 'contact', variant: 'NO', tag: DERIVED_TAGS.leadIsPump2 },
              ],
            ],
          },
        ],
        coils: [{ variant: 'coil', tag: 'Q_Pump_RawInfluent1' }],
      },
      {
        id: '3.5',
        comment: 'Duty rotation mapping — mirror image for influent pump 2',
        nodes: [
          {
            kind: 'parallel',
            branches: [
              [
                { kind: 'contact', variant: 'NO', tag: 'M_LeadPumpCall' },
                { kind: 'contact', variant: 'NO', tag: DERIVED_TAGS.leadIsPump2 },
              ],
              [
                { kind: 'contact', variant: 'NO', tag: 'M_LagPumpCall' },
                { kind: 'contact', variant: 'NO', tag: DERIVED_TAGS.leadIsPump1 },
              ],
            ],
          },
        ],
        coils: [{ variant: 'coil', tag: 'Q_Pump_RawInfluent2' }],
      },
      {
        id: '3.6',
        comment: 'VFD speed reference, rate limited to 45 %/s',
        nodes: [{ kind: 'contact', variant: 'NO', tag: 'M_LeadPumpCall' }],
        coils: [{ variant: 'analog', tag: 'AQ_VFD_InfluentSpeed' }],
      },
    ],
  },
  {
    id: 'aeration',
    title: 'Network 4 — FB_AerationDO',
    comment:
      'Dissolved oxygen PI loop. %IW106 is compared against the %MW2 setpoint and the air header valve %QW102 is modulated; the diffuser blowers start on a ±0.25 mg/L deadband and are hard interlocked against dry running.',
    block: {
      name: 'FB_AerationDO',
      enableTag: DERIVED_TAGS.aerEnable,
      inputs: [
        { name: 'Enable', tag: DERIVED_TAGS.aerEnable },
        { name: 'DO_Measured', tag: 'AI_DO_AerationA' },
        { name: 'DO_Setpoint', tag: 'M_TargetDO' },
        { name: 'LevelA', tag: 'AI_LT_AerationA' },
        { name: 'LevelB', tag: 'AI_LT_AerationB' },
      ],
      outputs: [
        { name: 'BlowerA', tag: 'Q_Blower_AerationA' },
        { name: 'BlowerB', tag: 'Q_Blower_AerationB' },
        { name: 'ValvePos', tag: 'AQ_AirValve_Aeration' },
      ],
    },
    rungs: [
      {
        id: '4.1',
        comment: 'Aeration permissive — only from AERATION_ACTIVE onwards',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: 'M_PlantRun' },
          { kind: 'contact', variant: 'NC', tag: 'M_SafetyTrip' },
          { kind: 'compare', tag: 'M_PlantState', op: '>=', ref: ST_AERATION_ACTIVE },
        ],
        coils: [{ variant: 'coil', tag: DERIVED_TAGS.aerEnable }],
      },
      {
        id: '4.2',
        comment: 'Basin A blower — DO deadband call plus diffuser dry-run guard',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: 'M_BlowerCallA' },
          { kind: 'compare', tag: 'AI_LT_AerationA', op: '>=', ref: AERATION_MIN_LEVEL_M },
          { kind: 'contact', variant: 'NC', tag: 'I_LSH_AerationA' },
        ],
        coils: [{ variant: 'coil', tag: 'Q_Blower_AerationA' }],
      },
      {
        id: '4.3',
        comment: 'Basin B blower — trails basin A on the shared air header',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: 'M_BlowerCallB' },
          { kind: 'compare', tag: 'AI_LT_AerationB', op: '>=', ref: AERATION_MIN_LEVEL_M },
          { kind: 'contact', variant: 'NC', tag: 'I_LSH_AerationB' },
        ],
        coils: [{ variant: 'coil', tag: 'Q_Blower_AerationB' }],
      },
      {
        id: '4.4',
        comment: 'Air flow control valve position from the PI algorithm',
        nodes: [
          {
            kind: 'parallel',
            branches: [
              [{ kind: 'contact', variant: 'NO', tag: 'Q_Blower_AerationA' }],
              [{ kind: 'contact', variant: 'NO', tag: 'Q_Blower_AerationB' }],
            ],
          },
        ],
        coils: [{ variant: 'analog', tag: 'AQ_AirValve_Aeration' }],
      },
    ],
  },
  {
    id: 'ras',
    title: 'Network 5 — RAS Recirculation & Coagulant Dosing',
    comment:
      'Return activated sludge keeps the mixed liquor population alive; polymer coagulant is dosed once effluent turbidity climbs past 60 % of the %MW4 consent limit, well before the weir gate would be held shut.',
    rungs: [
      {
        id: '5.1',
        comment: 'RAS pump — returns settled biomass to the head of the aeration train',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: 'M_PlantRun' },
          { kind: 'contact', variant: 'NC', tag: 'M_SafetyTrip' },
          { kind: 'compare', tag: 'M_PlantState', op: '>=', ref: ST_AERATION_ACTIVE },
          {
            kind: 'compare',
            tag: DERIVED_TAGS.clarifierLevel,
            op: '>',
            ref: RAS_MIN_CLARIFIER_M,
          },
        ],
        coils: [{ variant: 'coil', tag: 'Q_Pump_RAS' }],
      },
      {
        id: '5.2',
        comment: 'Coagulant dosing pump — knocks down carry-over solids',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: 'M_PlantRun' },
          { kind: 'contact', variant: 'NC', tag: 'M_SafetyTrip' },
          { kind: 'compare', tag: 'M_PlantState', op: '>=', ref: ST_CLARIFYING },
          {
            kind: 'compare',
            tag: 'AI_Turbidity_Effluent',
            op: '>',
            ref: DERIVED_TAGS.coagSetpoint,
          },
        ],
        coils: [{ variant: 'coil', tag: 'Q_Pump_Coagulant' }],
      },
    ],
  },
  {
    id: 'weir',
    title: 'Network 6 — FB_WeirGateControl',
    comment:
      'Motorised sluice weir gate. The discharge permit needs BOTH clarifier level ≥ 2.6 m and turbidity inside the %MW4 consent limit. %Q0.6 and %Q0.7 are hard mutually exclusive on the reversing starter.',
    block: {
      name: 'FB_WeirGateControl',
      enableTag: 'M_WeirOpenCmd',
      inputs: [
        { name: 'ClarifierLevel', tag: DERIVED_TAGS.clarifierLevel },
        { name: 'Turbidity', tag: 'AI_Turbidity_Effluent' },
        { name: 'MaxTurbidity', tag: 'M_MaxTurbidity' },
        { name: 'OpenLS', tag: 'I_WeirOpenLS' },
        { name: 'ForceShut', tag: 'M_SafetyTrip' },
      ],
      outputs: [
        { name: 'OpenCmd', tag: 'M_WeirOpenCmd' },
        { name: 'MotorOpen', tag: 'Q_Motor_WeirOpen' },
        { name: 'MotorClose', tag: 'Q_Motor_WeirClose' },
      ],
    },
    rungs: [
      {
        id: '6.1',
        comment: 'Discharge permit — level AND effluent quality, both required',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: 'M_PlantRun' },
          { kind: 'contact', variant: 'NC', tag: 'M_SafetyTrip' },
          {
            kind: 'compare',
            tag: DERIVED_TAGS.clarifierLevel,
            op: '>=',
            ref: CLARIFIER_DISCHARGE_M,
          },
          { kind: 'compare', tag: 'AI_Turbidity_Effluent', op: '<', ref: 'M_MaxTurbidity' },
        ],
        coils: [{ variant: 'set', tag: 'M_WeirOpenCmd' }],
      },
      {
        id: '6.2',
        comment: 'OPEN contactor — drops out on the fully-open limit switch',
        nodes: [
          { kind: 'contact', variant: 'NO', tag: 'M_WeirOpenCmd' },
          { kind: 'contact', variant: 'NC', tag: 'I_WeirOpenLS' },
          { kind: 'contact', variant: 'NC', tag: 'Q_Motor_WeirClose' },
        ],
        coils: [{ variant: 'coil', tag: 'Q_Motor_WeirOpen' }],
      },
      {
        id: '6.3',
        comment: 'CLOSE contactor — driven by loss of permit or by the safety trip',
        nodes: [
          {
            kind: 'parallel',
            branches: [
              [{ kind: 'contact', variant: 'NC', tag: 'M_WeirOpenCmd' }],
              [{ kind: 'contact', variant: 'NO', tag: 'M_SafetyTrip' }],
            ],
          },
          { kind: 'contact', variant: 'NC', tag: 'M_WeirClosedLS' },
          { kind: 'contact', variant: 'NC', tag: 'Q_Motor_WeirOpen' },
        ],
        coils: [{ variant: 'coil', tag: 'Q_Motor_WeirClose' }],
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
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

export function tagAddress(tag: string): string {
  return TAG_ADDRESS[tag] ?? ''
}
