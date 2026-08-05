import { type FC, useEffect, useRef } from 'react'
import { usePlcStore } from '../store/usePlcStore'
import {
  ALM_BIT_FAULT,
  ALM_BIT_RUN,
  ALM_BIT_WARN,
  BELT_DIVERTER_POSITION,
  BELT_END_POSITION,
  BELT_SENSOR_POSITION,
  COLOR_ACCEPT,
  COLOR_REJECT,
  type Part,
} from '../plc/types'

const BELT_X0 = 70
const BELT_X1 = 830
const BELT_Y = 150
const BELT_H = 44

const posToX = (position: number) => BELT_X0 + (position / 100) * (BELT_X1 - BELT_X0)

const partFill = (color: Part['color']) => {
  if (color === COLOR_REJECT) return '#ef4444'
  if (color === COLOR_ACCEPT) return '#22c55e'
  return '#3b82f6'
}

const partLabel = (color: Part['color']) => {
  if (color === COLOR_REJECT) return 'R'
  if (color === COLOR_ACCEPT) return 'A'
  return 'S'
}

const Visualizer: FC = () => {
  const inputs = usePlcStore((s) => s.inputs)
  const outputs = usePlcStore((s) => s.outputs)
  const internal = usePlcStore((s) => s.internal)
  const parts = usePlcStore((s) => s.parts)
  const counters = usePlcStore((s) => s.counters)
  const metrics = usePlcStore((s) => s.metrics)

  const treadGroupRef = useRef<SVGGElement | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const TREAD_SPACING = 40
    const tick = () => {
      const state = usePlcStore.getState()
      const speed = state.outputs.VFD_Run ? state.outputs.VFD_Speed_Ref : 0
      const now = performance.now()
      const offset = ((now * (speed / 100) * 0.09) % TREAD_SPACING) - TREAD_SPACING
      if (treadGroupRef.current) {
        treadGroupRef.current.style.transform = `translateX(${offset}px)`
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const sensorX = posToX(BELT_SENSOR_POSITION)
  const diverterX = posToX(BELT_DIVERTER_POSITION)
  const estopTripped = !inputs.E_Stop
  const faultAwaitingReset = internal.EStopFaultLatched && inputs.E_Stop

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Conveyor Visualizer</h2>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Scan #{metrics.scanCount}</span>
          <span className="text-slate-600">|</span>
          <span>{metrics.lastCycleTimeMs.toFixed(1)} ms/cycle</span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded border border-slate-800 bg-slate-950">
        <svg viewBox="0 0 900 300" className="h-72 w-full">
          {/* Belt bed */}
          <rect x={BELT_X0 - 10} y={BELT_Y - 8} width={BELT_X1 - BELT_X0 + 20} height={BELT_H + 16} rx={6} fill="#0b1220" stroke="#1e293b" />
          <clipPath id="beltClip">
            <rect x={BELT_X0} y={BELT_Y} width={BELT_X1 - BELT_X0} height={BELT_H} />
          </clipPath>
          <rect x={BELT_X0} y={BELT_Y} width={BELT_X1 - BELT_X0} height={BELT_H} fill="#1e293b" />
          <g clipPath="url(#beltClip)">
            <g ref={treadGroupRef}>
              {Array.from({ length: 40 }, (_, i) => (
                <rect key={i} x={i * 40} y={BELT_Y} width={18} height={BELT_H} fill="#111827" opacity={0.5} />
              ))}
            </g>
          </g>

          {/* Accept bin */}
          <g transform={`translate(${BELT_X1 + 10}, ${BELT_Y - 10})`}>
            <rect width={40} height={64} rx={4} fill="#052e1c" stroke="#16a34a" />
            <text x={20} y={80} textAnchor="middle" className="fill-emerald-400 text-[10px]">ACCEPT</text>
          </g>

          {/* Reject chute */}
          <g transform={`translate(${diverterX - 15}, ${BELT_Y + BELT_H + 12})`}>
            <rect width={70} height={54} rx={4} fill="#3f0d0d" stroke="#ef4444" />
            <text x={35} y={68} textAnchor="middle" className="fill-rose-400 text-[10px]">REJECT</text>
          </g>

          {/* Parts */}
          {parts.map((part) => {
            const x = posToX(part.position)
            let y = BELT_Y + BELT_H / 2
            let opacity = 1
            if (part.rejected && part.position > BELT_DIVERTER_POSITION) {
              const t = Math.min(
                1,
                (part.position - BELT_DIVERTER_POSITION) / (BELT_END_POSITION - BELT_DIVERTER_POSITION),
              )
              y = BELT_Y + BELT_H / 2 + t * 70
              opacity = 1 - t * 0.6
            }
            return (
              <g key={part.id} opacity={opacity}>
                <circle cx={x} cy={y} r={13} fill={partFill(part.color)} stroke="#0f172a" strokeWidth={2} />
                <text x={x} y={y + 4} textAnchor="middle" className="fill-slate-900 text-[10px] font-bold">
                  {partLabel(part.color)}
                </text>
              </g>
            )
          })}

          {/* Sensor station */}
          <g transform={`translate(${sensorX}, ${BELT_Y - 40})`}>
            <rect x={-6} y={0} width={12} height={30} fill="#334155" />
            <circle cx={0} cy={-6} r={9} fill={inputs.Sensor_PartDetect ? '#facc15' : '#3f3f1a'} stroke="#1e293b" />
            <text x={0} y={26} textAnchor="middle" className="fill-slate-500 text-[9px]">SENSOR</text>
          </g>

          {/* Diverter arm */}
          <g transform={`translate(${diverterX}, ${BELT_Y})`}>
            <circle r={4} fill="#94a3b8" />
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={BELT_H + 20}
              stroke="#f97316"
              strokeWidth={6}
              strokeLinecap="round"
              style={{
                transformOrigin: '0px 0px',
                transform: `rotate(${outputs.Actuator_Diverter ? 40 : 0}deg)`,
                transition: 'transform 150ms ease-out',
              }}
            />
            <text x={0} y={-8} textAnchor="middle" className="fill-slate-500 text-[9px]">DIVERTER</text>
          </g>

          {/* Alarm tower */}
          <g transform="translate(30, 40)">
            <rect x={-14} y={-10} width={28} height={90} rx={4} fill="#0b1220" stroke="#1e293b" />
            <circle cx={0} cy={4} r={9} fill={outputs.Alarm_Tower & ALM_BIT_RUN ? '#22c55e' : '#14532d'} />
            <circle cx={0} cy={30} r={9} fill={outputs.Alarm_Tower & ALM_BIT_WARN ? '#facc15' : '#4d3b0a'} />
            <circle cx={0} cy={56} r={9} fill={outputs.Alarm_Tower & ALM_BIT_FAULT ? '#ef4444' : '#4a1414'} className={outputs.Alarm_Tower & ALM_BIT_FAULT ? 'animate-pulse' : ''} />
          </g>

          {/* VFD readout */}
          <g transform="translate(70, 230)">
            <text x={0} y={0} className="fill-slate-400 text-[11px]">
              VFD_Run: <tspan className={outputs.VFD_Run ? 'fill-emerald-400' : 'fill-slate-500'}>{String(outputs.VFD_Run)}</tspan>
            </text>
            <text x={220} y={0} className="fill-slate-400 text-[11px]">
              VFD_Speed_Ref: <tspan className="fill-slate-200">{outputs.VFD_Speed_Ref.toFixed(1)}%</tspan>
            </text>
            <text x={460} y={0} className="fill-slate-400 text-[11px]">
              Accepted: <tspan className="fill-emerald-400">{counters.accepted}</tspan>{' '}
              Special: <tspan className="fill-blue-400">{counters.special}</tspan>{' '}
              Rejected: <tspan className="fill-rose-400">{counters.rejected}</tspan>
            </text>
          </g>
        </svg>

        {estopTripped && (
          <div className="pointer-events-none absolute inset-0 flex animate-pulse items-center justify-center bg-rose-600/30">
            <span className="rounded bg-rose-700 px-4 py-2 text-lg font-bold tracking-wide text-white shadow-lg">
              EMERGENCY STOP ACTIVE
            </span>
          </div>
        )}
        {!estopTripped && faultAwaitingReset && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-2">
            <span className="rounded bg-amber-600/90 px-3 py-1 text-xs font-semibold text-white shadow">
              FAULT LATCHED — MANUAL RESET REQUIRED
            </span>
          </div>
        )}
      </div>
    </section>
  )
}

export default Visualizer
