import type { FC } from 'react'
import { usePlcStore } from '../store/usePlcStore'
import { GATE_STATE_LABEL, type GateState } from '../plc/types'

const POST_X = 260
const ARM_Y = 120
const ARM_LENGTH = 190

const Visualizer: FC = () => {
  const inputs = usePlcStore((s) => s.inputs)
  const outputs = usePlcStore((s) => s.outputs)
  const internal = usePlcStore((s) => s.internal)
  const gateAngle = usePlcStore((s) => s.gateAngle)
  const gateJammed = usePlcStore((s) => s.gateJammed)
  const metrics = usePlcStore((s) => s.metrics)

  const estopTripped = !inputs.E_Stop
  const stuckGate = outputs.Alarm_StuckGate
  const moving = outputs.Motor_GateUp || outputs.Motor_GateDown
  const stateLabel = GATE_STATE_LABEL[internal.GateState as GateState]

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Gate Visualizer</h2>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Scan #{metrics.scanCount}</span>
          <span className="text-slate-600">|</span>
          <span>{metrics.lastCycleTimeMs.toFixed(1)} ms/cycle</span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded border border-slate-800 bg-slate-950">
        <svg viewBox="0 0 700 300" className="h-72 w-full">
          {/* Lane / roadway */}
          <rect x={0} y={ARM_Y + 60} width={700} height={70} fill="#0b1220" stroke="#1e293b" />
          <line x1={0} y1={ARM_Y + 95} x2={700} y2={ARM_Y + 95} stroke="#334155" strokeWidth={2} strokeDasharray="16 12" />

          {/* Approaching vehicle */}
          {inputs.Sensor_VehiclePresence && (
            <g transform={`translate(${POST_X - 130}, ${ARM_Y + 70})`}>
              <rect x={0} y={0} width={70} height={34} rx={6} fill="#38bdf8" stroke="#0f172a" strokeWidth={2} />
              <circle cx={16} cy={36} r={7} fill="#0f172a" />
              <circle cx={54} cy={36} r={7} fill="#0f172a" />
              <text x={35} y={22} textAnchor="middle" className="fill-slate-900 text-[10px] font-bold">
                VEHICLE
              </text>
            </g>
          )}

          {/* Gate post */}
          <rect x={POST_X - 10} y={ARM_Y - 10} width={20} height={140} rx={4} fill="#1e293b" stroke="#334155" />

          {/* Gate arm - rotates from horizontal (0deg, blocking) to vertical (-90deg, raised) */}
          <g transform={`translate(${POST_X}, ${ARM_Y})`}>
            <circle r={6} fill="#94a3b8" />
            <line
              x1={0}
              y1={0}
              x2={ARM_LENGTH}
              y2={0}
              stroke={stuckGate ? '#f97316' : '#facc15'}
              strokeWidth={10}
              strokeLinecap="round"
              style={{
                transformOrigin: '0px 0px',
                transform: `rotate(${-gateAngle}deg)`,
                transition: gateJammed ? 'none' : 'transform 120ms linear',
              }}
            />
            <line
              x1={0}
              y1={0}
              x2={ARM_LENGTH}
              y2={0}
              stroke="#0f172a"
              strokeWidth={10}
              strokeDasharray="4 22"
              strokeLinecap="round"
              opacity={0.5}
              style={{
                transformOrigin: '0px 0px',
                transform: `rotate(${-gateAngle}deg)`,
                transition: gateJammed ? 'none' : 'transform 120ms linear',
              }}
            />
          </g>

          {/* Traffic light */}
          <g transform="translate(40, 40)">
            <rect x={-16} y={-10} width={32} height={100} rx={6} fill="#0b1220" stroke="#1e293b" />
            <circle cx={0} cy={8} r={11} fill={outputs.Light_Red ? '#ef4444' : '#4a1414'} className={outputs.Light_Red ? 'animate-pulse' : ''} />
            <circle cx={0} cy={38} r={11} fill={outputs.Light_Green ? '#22c55e' : '#14532d'} />
            <text x={0} y={92} textAnchor="middle" className="fill-slate-500 text-[9px]">
              SIGNAL
            </text>
          </g>

          {/* Buzzer */}
          <g transform={`translate(${POST_X}, ${ARM_Y - 40})`}>
            <circle r={10} fill={outputs.Buzzer ? '#f59e0b' : '#4d3b0a'} className={outputs.Buzzer ? 'animate-pulse' : ''} />
            <text x={0} y={-16} textAnchor="middle" className="fill-slate-500 text-[9px]">
              BUZZER
            </text>
          </g>

          {/* Obstruction sensor beam */}
          {inputs.Sensor_Obstruction && (
            <g>
              <line
                x1={POST_X + 40}
                y1={ARM_Y - 20}
                x2={POST_X + 40}
                y2={ARM_Y + 130}
                stroke="#ef4444"
                strokeWidth={4}
                strokeDasharray="6 6"
                className="animate-pulse"
              />
              <text x={POST_X + 40} y={ARM_Y - 26} textAnchor="middle" className="fill-rose-400 text-[9px] font-bold">
                OBSTRUCTION
              </text>
            </g>
          )}

          {/* State / gate readout */}
          <g transform="translate(40, 240)">
            <text x={0} y={0} className="fill-slate-400 text-[11px]">
              GateState: <tspan className="fill-cyan-300 font-semibold">{stateLabel}</tspan>
            </text>
            <text x={220} y={0} className="fill-slate-400 text-[11px]">
              Motor_GateUp: <tspan className={outputs.Motor_GateUp ? 'fill-emerald-400' : 'fill-slate-500'}>{String(outputs.Motor_GateUp)}</tspan>
            </text>
            <text x={420} y={0} className="fill-slate-400 text-[11px]">
              Motor_GateDown: <tspan className={outputs.Motor_GateDown ? 'fill-emerald-400' : 'fill-slate-500'}>{String(outputs.Motor_GateDown)}</tspan>
            </text>
            <text x={0} y={20} className="fill-slate-400 text-[11px]">
              Gate Angle: <tspan className="fill-slate-200">{gateAngle.toFixed(0)}°</tspan> {moving && <tspan className="fill-slate-500">(moving)</tspan>}
            </text>
            {gateJammed && (
              <text x={220} y={20} className="fill-amber-400 text-[11px] font-semibold">
                MECHANICAL JAM SIMULATED
              </text>
            )}
          </g>
        </svg>

        {estopTripped && (
          <div className="pointer-events-none absolute inset-0 flex animate-pulse items-center justify-center bg-rose-600/30">
            <span className="rounded bg-rose-700 px-4 py-2 text-lg font-bold tracking-wide text-white shadow-lg">
              EMERGENCY STOP ACTIVE
            </span>
          </div>
        )}
        {!estopTripped && stuckGate && (
          <div className="pointer-events-none absolute inset-0 flex animate-pulse items-center justify-center bg-orange-600/20">
            <span className="rounded bg-orange-600/90 px-4 py-2 text-lg font-bold tracking-wide text-white shadow-lg">
              STUCK GATE — MANUAL ACKNOWLEDGEMENT REQUIRED
            </span>
          </div>
        )}
        {!estopTripped && internal.EStopFaultLatched && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-2">
            <span className="rounded bg-amber-600/90 px-3 py-1 text-xs font-semibold text-white shadow">
              E-STOP FAULT LATCHED — MANUAL RESET REQUIRED
            </span>
          </div>
        )}
      </div>
    </section>
  )
}

export default Visualizer
