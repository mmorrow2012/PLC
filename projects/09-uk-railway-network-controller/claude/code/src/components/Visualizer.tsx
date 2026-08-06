import { Fragment, type CSSProperties, type FC } from 'react'
import { AlertTriangle, Gauge, MapPin, TrainFront } from 'lucide-react'
import {
  NETWORK_STATE_LABEL,
  SECTION_BLOCKS,
  SIGNAL_HEADS,
  STATIONS,
  STATION_BY_CODE,
  ST_SIGNAL_FAULT,
  formatClock,
  sectionBlockId,
  sectionLengthKm,
  stationBlockId,
} from '../plc/types'
import type { SignalAspect, StationCode } from '../plc/types'
import { usePlcStore } from '../store/usePlcStore'
import type { TrainModel } from '../plc/networkSimulation'

// Stylised Great Britain coastline for the mimic background.
const COASTLINE =
  'M 196 22 L 232 30 L 250 60 L 244 96 L 268 130 L 286 168 L 300 214 L 296 250 ' +
  'L 310 286 L 318 330 L 330 360 L 348 398 L 342 430 L 368 452 L 380 470 L 356 506 ' +
  'L 330 528 L 300 540 L 268 556 L 236 556 L 196 546 L 150 566 L 120 584 L 96 600 ' +
  'L 150 556 L 176 540 L 188 520 L 206 516 L 186 498 L 176 470 L 150 462 L 140 436 ' +
  'L 162 420 L 170 398 L 186 392 L 196 372 L 186 344 L 200 320 L 188 296 L 176 268 ' +
  'L 160 240 L 168 214 L 150 190 L 140 160 L 120 140 L 146 126 L 128 100 L 150 84 ' +
  'L 140 60 L 170 44 Z'

const ASPECT_COLOR: Record<SignalAspect, string> = {
  red: '#ef4444',
  yellow: '#f59e0b',
  'double-yellow': '#fbbf24',
  green: '#22c55e',
}

const TRAIN_COLOR: Record<string, string> = {
  IC1: '#22d3ee',
  IC2: '#c084fc',
}

interface Point {
  x: number
  y: number
}

function stationPoint(code: StationCode): Point {
  const station = STATION_BY_CODE[code]
  return { x: station.x, y: station.y }
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/** Offsets a point perpendicular to the a→b direction, for signal masts. */
function offsetNormal(a: Point, b: Point, at: Point, distance: number): Point {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.hypot(dx, dy) || 1
  return { x: at.x + (-dy / length) * distance, y: at.y + (dx / length) * distance }
}

function trainPosition(train: TrainModel): Point {
  const from = stationPoint(train.stops[train.legIndex])
  if (train.atStation) return from
  const to = stationPoint(train.stops[train.legIndex + 1])
  const length = sectionLengthKm(train.stops[train.legIndex], train.stops[train.legIndex + 1])
  return lerp(from, to, length > 0 ? Math.min(1, train.legKm / length) : 0)
}

const SIGNAL_BLOCK_SET = new Set(SIGNAL_HEADS.map((head) => head.block))

interface AspectLampProps {
  x: number
  y: number
  aspect: SignalAspect
  label?: string
  large?: boolean
}

const AspectLamp: FC<AspectLampProps> = ({ x, y, aspect, label, large = false }) => {
  const radius = large ? 4.2 : 2.6
  const spacing = large ? 10 : 6.4
  const lamps: SignalAspect[] = ['green', 'yellow', 'red']
  return (
    <g>
      {large && (
        <rect
          x={x - radius - 3.5}
          y={y - spacing - radius - 3.5}
          width={(radius + 3.5) * 2}
          height={spacing * 2 + (radius + 3.5) * 2}
          rx={5}
          fill="#0b1220"
          stroke="#334155"
          strokeWidth={1}
        />
      )}
      {lamps.map((lamp, index) => {
        const lit = lamp === aspect || (aspect === 'double-yellow' && lamp === 'yellow')
        const cy = y - spacing + index * spacing
        return (
          <circle
            key={lamp}
            cx={x}
            cy={cy}
            r={radius}
            fill={lit ? ASPECT_COLOR[lamp] : '#1f2937'}
            stroke={lit ? ASPECT_COLOR[lamp] : '#334155'}
            strokeWidth={0.8}
            className={lit && lamp === 'red' ? 'aspect-pulse' : undefined}
            style={lit ? { filter: `drop-shadow(0 0 4px ${ASPECT_COLOR[lamp]})` } : undefined}
          />
        )
      })}
      {label && (
        <text x={x + radius + 7} y={y + 3} fontSize={7.5} fontFamily="monospace" fill="#94a3b8">
          {label}
        </text>
      )}
    </g>
  )
}

const DEMO_STEPS = [
  {
    title: 'Start the timetable service',
    body: 'Press START SERVICE (%I0.1). The traction relay %Q0.7 picks up, FB_TrackBlockInterlock clears the aspects to green and 1S47 leaves London Euston for Edinburgh.',
  },
  {
    title: 'Modulate traction speed',
    body: 'Drag the Train 1 slider or tap SPEED UP / SLOW DOWN. %MW2 is the operator setpoint; FB_SpeedSupervision slews %QW100 towards MIN(setpoint, line speed, ATP limit %IW104, braking curve).',
  },
  {
    title: 'Swing the junction and watch the interlock',
    body: 'Toggle POINT SWITCH at Birmingham North Jn. Route locking refuses the request while the hub block holds axle counts; once clear, %Q0.5 drives the machine, detection %I0.7 re-proves and 1S47 diverts via Liverpool — the PIS boards flip to DELAYED.',
  },
  {
    title: 'Trip the network and recover',
    body: 'Hit E-STOP (%I0.0 opens). Every aspect drops to danger, %Q0.7 de-energises and both services emergency brake. Release the mushroom, then press RESET (%I0.2) to unlatch the SIL4 trip and restart.',
  },
]

const Visualizer: FC = () => {
  const network = usePlcStore((s) => s.network)
  const occupancy = usePlcStore((s) => s.occupancy)
  const aspects = usePlcStore((s) => s.aspects)
  const inputs = usePlcStore((s) => s.inputs)
  const internal = usePlcStore((s) => s.internal)
  const outputs = usePlcStore((s) => s.outputs)
  const delays = usePlcStore((s) => s.delays)

  const faulted = internal.M_NetworkState === ST_SIGNAL_FAULT

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
          <MapPin size={15} className="text-industrial-accent" />
          UK Network SCADA Mimic
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-slate-300">
            %MW60 {formatClock(internal.M_ClockSeconds)}
          </span>
          <span
            className={
              faulted
                ? 'rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 font-mono text-rose-300'
                : internal.M_NetworkRun
                  ? 'rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-emerald-300'
                  : 'rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-slate-400'
            }
          >
            %MW0 {internal.M_NetworkState} · {NETWORK_STATE_LABEL[internal.M_NetworkState]}
          </span>
          <span className="rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-amber-300">
            %MW6 {internal.M_ActiveBlockCount} blocks occupied
          </span>
          <span
            className={
              outputs.Q_MasterSafetyRelay
                ? 'rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-emerald-300'
                : 'rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 font-mono text-rose-300'
            }
          >
            %Q0.7 catenary {outputs.Q_MasterSafetyRelay ? 'LIVE' : 'ISOLATED'}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded border border-slate-800 bg-[#070b13]">
          <svg
            viewBox="0 0 460 680"
            className="h-[620px] w-full"
            role="img"
            aria-label="UK railway network mimic"
          >
            <defs>
              <filter id="mimic-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="2.6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0b1220" />
                <stop offset="100%" stopColor="#060a12" />
              </linearGradient>
            </defs>

            <rect x={0} y={0} width={460} height={680} fill="url(#sea)" />
            <path
              d={COASTLINE}
              fill="#111c2e"
              stroke="#1f3350"
              strokeWidth={1.4}
              strokeLinejoin="round"
            />

            {/* --- Track sections ------------------------------------------ */}
            {SECTION_BLOCKS.map((block) => {
              const a = stationPoint(block.from)
              const b = stationPoint(block.to)
              const id = sectionBlockId(block.from, block.to)
              const occupied = occupancy[id]
              const aspect = aspects[id] ?? 'red'
              const stroke = occupied ? '#f59e0b' : aspect === 'green' ? '#2563eb' : '#334155'
              const mid = lerp(a, b, 0.42)
              const lampAt = offsetNormal(a, b, mid, 11)
              return (
                <Fragment key={id}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="#0f172a"
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={stroke}
                    strokeWidth={occupied ? 3.6 : 2.2}
                    strokeLinecap="round"
                    className={occupied ? 'block-occupied' : undefined}
                    filter={occupied ? 'url(#mimic-glow)' : undefined}
                  />
                  {!SIGNAL_BLOCK_SET.has(id) && <AspectLamp x={lampAt.x} y={lampAt.y} aspect={aspect} />}
                </Fragment>
              )
            })}

            {/* --- The four hard-wired signal heads ------------------------- */}
            {SIGNAL_HEADS.map((head) => {
              const aspect = aspects[head.block] ?? 'red'
              const isSection = head.block.startsWith('SEC_')
              const [, from, to] = head.block.split('_')
              const a = stationPoint(from as StationCode)
              const b = isSection ? stationPoint(to as StationCode) : { x: a.x + 30, y: a.y - 30 }
              const anchor = isSection ? lerp(a, b, 0.24) : a
              const at = offsetNormal(a, b, anchor, isSection ? 18 : 22)
              return (
                <AspectLamp
                  key={head.coil}
                  x={at.x}
                  y={at.y}
                  aspect={aspect}
                  label={head.coil.replace('Q_Signal_', '').replace('_Green', '')}
                  large
                />
              )
            })}

            {/* --- Stations ------------------------------------------------- */}
            {STATIONS.map((station) => {
              const occupied = occupancy[stationBlockId(station.code)]
              return (
                <g key={station.code}>
                  {occupied && (
                    <circle
                      cx={station.x}
                      cy={station.y}
                      r={11}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={1.6}
                      className="block-occupied"
                      filter="url(#mimic-glow)"
                    />
                  )}
                  <circle
                    cx={station.x}
                    cy={station.y}
                    r={5.6}
                    fill={occupied ? '#f59e0b' : '#0f172a'}
                    stroke={occupied ? '#fbbf24' : '#64748b'}
                    strokeWidth={2}
                  />
                  <text
                    x={station.x + station.labelDx}
                    y={station.y + station.labelDy}
                    textAnchor={station.labelDx < 0 ? 'end' : 'start'}
                    fontSize={10.5}
                    fontFamily="monospace"
                    fill={occupied ? '#fcd34d' : '#cbd5e1'}
                  >
                    {station.city}
                  </text>
                  <text
                    x={station.x + station.labelDx}
                    y={station.y + station.labelDy + 10}
                    textAnchor={station.labelDx < 0 ? 'end' : 'start'}
                    fontSize={7.5}
                    fontFamily="monospace"
                    fill="#64748b"
                  >
                    {station.code} · {station.platforms} plat
                  </text>
                </g>
              )
            })}

            {/* --- Trains --------------------------------------------------- */}
            {network.trains.map((train) => {
              const position = trainPosition(train)
              const color = TRAIN_COLOR[train.id]
              return (
                <g key={train.id} filter="url(#mimic-glow)">
                  <rect
                    x={position.x - 13}
                    y={position.y - 7}
                    width={26}
                    height={14}
                    rx={5}
                    fill={color}
                    fillOpacity={train.finished ? 0.35 : 0.9}
                    stroke="#0b1220"
                    strokeWidth={1.2}
                  />
                  <text
                    x={position.x}
                    y={position.y + 3.6}
                    textAnchor="middle"
                    fontSize={8}
                    fontFamily="monospace"
                    fill="#08131f"
                    fontWeight={700}
                  >
                    {train.id}
                  </text>
                  <text
                    x={position.x}
                    y={position.y - 11}
                    textAnchor="middle"
                    fontSize={8.5}
                    fontFamily="monospace"
                    fill={train.heldAtSignal ? '#f87171' : color}
                  >
                    {train.heldAtSignal ? 'HELD AT SIGNAL' : `${train.speedKmh.toFixed(0)} km/h`}
                  </text>
                </g>
              )
            })}

            {/* --- Legend ---------------------------------------------------- */}
            <g transform="translate(14, 604)">
              <rect x={0} y={0} width={432} height={64} rx={6} fill="#0b1220" stroke="#1e293b" />
              <text x={10} y={16} fontSize={9} fontFamily="monospace" fill="#94a3b8">
                MIMIC LEGEND
              </text>
              <circle cx={16} cy={32} r={4} fill="#f59e0b" />
              <text x={26} y={35} fontSize={8.5} fontFamily="monospace" fill="#cbd5e1">
                block occupied
              </text>
              <line x1={132} y1={32} x2={156} y2={32} stroke="#2563eb" strokeWidth={2.6} />
              <text x={162} y={35} fontSize={8.5} fontFamily="monospace" fill="#cbd5e1">
                cleared route
              </text>
              <circle cx={276} cy={32} r={4} fill="#22c55e" />
              <circle cx={290} cy={32} r={4} fill="#f59e0b" />
              <circle cx={304} cy={32} r={4} fill="#ef4444" />
              <text x={314} y={35} fontSize={8.5} fontFamily="monospace" fill="#cbd5e1">
                signal aspect
              </text>
              <rect x={10} y={45} width={20} height={11} rx={4} fill="#22d3ee" />
              <text x={36} y={54} fontSize={8.5} fontFamily="monospace" fill="#cbd5e1">
                1S47 Caledonian
              </text>
              <rect x={166} y={45} width={20} height={11} rx={4} fill="#c084fc" />
              <text x={192} y={54} fontSize={8.5} fontFamily="monospace" fill="#cbd5e1">
                1E23 CrossCountry
              </text>
            </g>
          </svg>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {network.trains.map((train) => {
              const isLead = train.id === 'IC1'
              const speed = isLead
                ? inputs.AI_TractionSpeed_Intercity1
                : inputs.AI_TractionSpeed_Intercity2
              const permitted = isLead
                ? internal.M_PermittedSpeed_Train1
                : internal.M_PermittedSpeed_Train2
              const reference = isLead ? outputs.AQ_VFD_TractionSpeed1 : outputs.AQ_VFD_TractionSpeed2
              const delayMin = Math.round((delays[train.id] ?? 0) / 60)
              const station = STATION_BY_CODE[train.stops[train.legIndex]]
              return (
                <div key={train.id} className="rounded border border-slate-800 bg-slate-950 p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                      <TrainFront size={14} style={{ color: TRAIN_COLOR[train.id] }} />
                      {isLead ? '1S47' : '1E23'} · {train.id}
                    </span>
                    <span
                      className={
                        delayMin >= 5
                          ? 'rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-300'
                          : 'rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300'
                      }
                    >
                      {delayMin >= 5 ? `${delayMin} min late` : 'on time'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="font-mono text-2xl text-slate-100">{speed.toFixed(0)}</span>
                    <span className="pb-1 text-[10px] text-slate-500">km/h actual</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-slate-800">
                    <div
                      className="h-full rounded"
                      style={
                        {
                          width: `${Math.min(100, (speed / 220) * 100)}%`,
                          background: TRAIN_COLOR[train.id],
                        } as CSSProperties
                      }
                    />
                  </div>
                  <dl className="mt-2 space-y-1 font-mono text-[10px] text-slate-400">
                    <div className="flex justify-between gap-2">
                      <dt>Movement authority</dt>
                      <dd className="text-slate-200">{permitted.toFixed(0)} km/h</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>{isLead ? '%QW100' : '%QW102'} VFD ref</dt>
                      <dd className="text-slate-200">{reference.toFixed(1)} %</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Occupying</dt>
                      <dd className="truncate text-slate-200">{train.currentBlock}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>{train.atStation ? 'Standing at' : 'Running from'}</dt>
                      <dd className="text-slate-200">{station.city}</dd>
                    </div>
                  </dl>
                </div>
              )
            })}
          </div>

          {faulted && (
            <div className="flex items-start gap-2 rounded border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">SIGNAL FAULT — %MW0 = 99</p>
                <p className="mt-1 text-rose-300/80">
                  {internal.M_PointDetectFault
                    ? 'Point detection lost at Birmingham North Jn for longer than the 4 s watchdog.'
                    : 'Master emergency signal trip operated (%I0.0 open).'}{' '}
                  All aspects are at danger and the traction supply is isolated until an acknowledged
                  reset.
                </p>
              </div>
            </div>
          )}

          <div className="rounded border border-cyan-500/25 bg-cyan-500/5 p-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-200">
              <Gauge size={14} />
              Interactive demo — four steps
            </h3>
            <ol className="mt-2 space-y-2">
              {DEMO_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 font-mono text-[10px] text-cyan-200">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-slate-200">{step.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Visualizer
