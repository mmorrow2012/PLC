import type { FC } from 'react'
import { usePlcStore } from '../store/usePlcStore'

const TANK_WIDTH = 140
const TANK_HEIGHT = 180

interface TankGlassProps {
  x: number
  y: number
  levelPct: number
  label: string
  fillClassName: string
  tripped?: boolean
}

const TankGlass: FC<TankGlassProps> = ({ x, y, levelPct, label, fillClassName, tripped }) => {
  const clamped = Math.min(100, Math.max(0, levelPct))
  const liquidHeight = (clamped / 100) * (TANK_HEIGHT - 8)
  const liquidY = y + TANK_HEIGHT - 4 - liquidHeight

  return (
    <g>
      <text x={x + TANK_WIDTH / 2} y={y - 12} textAnchor="middle" className="fill-slate-300 text-xs font-semibold uppercase tracking-wide">
        {label}
      </text>
      <clipPath id={`clip-${label}`}>
        <rect x={x + 4} y={y + 4} width={TANK_WIDTH - 8} height={TANK_HEIGHT - 8} rx={4} />
      </clipPath>
      <rect
        x={x}
        y={y}
        width={TANK_WIDTH}
        height={TANK_HEIGHT}
        rx={8}
        className="fill-slate-950 stroke-slate-700"
        strokeWidth={2}
      />
      <rect
        x={x + 4}
        y={liquidY}
        width={TANK_WIDTH - 8}
        height={liquidHeight}
        clipPath={`url(#clip-${label})`}
        className={fillClassName}
        style={{ transition: 'y 0.18s linear, height 0.18s linear' }}
      />
      <rect
        x={x}
        y={y}
        width={TANK_WIDTH}
        height={TANK_HEIGHT}
        rx={8}
        fill="none"
        className="stroke-slate-600"
        strokeWidth={2}
      />
      <text x={x + TANK_WIDTH / 2} y={y + TANK_HEIGHT / 2} textAnchor="middle" dominantBaseline="middle" className="fill-slate-100 text-lg font-bold">
        {clamped.toFixed(1)}%
      </text>
      {tripped !== undefined && (
        <g transform={`translate(${x + TANK_WIDTH - 22}, ${y + 10})`}>
          <circle r={8} className={tripped ? 'fill-rose-500' : 'fill-slate-700'} />
          <text x={0} y={3} textAnchor="middle" className="fill-slate-100 text-[9px] font-bold">
            LSH
          </text>
        </g>
      )}
    </g>
  )
}

interface FlowPipeProps {
  x1: number
  y1: number
  x2: number
  y2: number
  active: boolean
  colorClassName: string
}

const FlowPipe: FC<FlowPipeProps> = ({ x1, y1, x2, y2, active, colorClassName }) => (
  <line
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    strokeWidth={6}
    strokeLinecap="round"
    className={active ? colorClassName : 'stroke-slate-700'}
    strokeDasharray={active ? '10 8' : undefined}
    style={active ? { animation: 'flow-dash 0.6s linear infinite' } : undefined}
  />
)

const STATE_LABELS: Record<string, string> = {
  IDLE: 'Idle / Standby',
  FILLING_A: 'Filling Tank A',
  TRANSFERRING_AB: 'Transferring A → B',
  DRAINING_BC: 'Draining B → C',
}

const Visualizer: FC = () => {
  const { state, inputs, outputs, setpoints, systemRunning } = usePlcStore()

  const alarmActive = outputs.alarmOverflow || !inputs.eStop

  const towerGreen = (outputs.alarmTower & 0b001) !== 0
  const towerYellow = (outputs.alarmTower & 0b010) !== 0
  const towerRed = (outputs.alarmTower & 0b100) !== 0

  const posA = { x: 40, y: 40 }
  const posB = { x: 320, y: 140 }
  const posC = { x: 600, y: 240 }

  return (
    <section className="relative rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <style>{`
        @keyframes flow-dash { to { stroke-dashoffset: -18; } }
        @keyframes alarm-pulse { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.32; } }
      `}</style>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Tank Visualizer</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-slate-500">
            State: <span className="font-semibold text-slate-200">{STATE_LABELS[state] ?? state}</span>
          </span>
          <div className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-950 px-2 py-1">
            <span className={`h-3 w-3 rounded-full ${towerGreen ? 'bg-emerald-500' : 'bg-emerald-900'}`} />
            <span className={`h-3 w-3 rounded-full ${towerYellow ? 'bg-amber-400' : 'bg-amber-900'}`} />
            <span className={`h-3 w-3 rounded-full ${towerRed ? 'bg-rose-500' : 'bg-rose-900'} ${towerRed ? 'animate-pulse' : ''}`} />
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded border border-slate-800 bg-slate-950">
        <svg viewBox="0 0 780 460" className="w-full" role="img" aria-label="Three-tank cascade visualizer">
          {/* Setpoint reference lines */}
          <line
            x1={posA.x}
            x2={posA.x + TANK_WIDTH}
            y1={posA.y + TANK_HEIGHT - 4 - ((setpoints.spLevelAHigh / 100) * (TANK_HEIGHT - 8))}
            y2={posA.y + TANK_HEIGHT - 4 - ((setpoints.spLevelAHigh / 100) * (TANK_HEIGHT - 8))}
            className="stroke-amber-500/70"
            strokeDasharray="4 3"
            strokeWidth={1.5}
          />
          <line
            x1={posB.x}
            x2={posB.x + TANK_WIDTH}
            y1={posB.y + TANK_HEIGHT - 4 - ((setpoints.spLevelBHigh / 100) * (TANK_HEIGHT - 8))}
            y2={posB.y + TANK_HEIGHT - 4 - ((setpoints.spLevelBHigh / 100) * (TANK_HEIGHT - 8))}
            className="stroke-amber-500/70"
            strokeDasharray="4 3"
            strokeWidth={1.5}
          />
          <line
            x1={posB.x}
            x2={posB.x + TANK_WIDTH}
            y1={posB.y + TANK_HEIGHT - 4 - ((setpoints.spLevelBTarget / 100) * (TANK_HEIGHT - 8))}
            y2={posB.y + TANK_HEIGHT - 4 - ((setpoints.spLevelBTarget / 100) * (TANK_HEIGHT - 8))}
            className="stroke-cyan-400/70"
            strokeDasharray="2 3"
            strokeWidth={1.5}
          />

          {/* Fill inlet above Tank A */}
          <g transform={`translate(${posA.x + TANK_WIDTH / 2}, ${posA.y - 34})`}>
            <rect x={-16} y={-6} width={32} height={16} rx={3} className={outputs.pumpFillA ? 'fill-emerald-500' : 'fill-slate-700'} />
            <text x={0} y={5} textAnchor="middle" className="fill-slate-100 text-[9px] font-bold">
              FILL
            </text>
          </g>
          <FlowPipe x1={posA.x + TANK_WIDTH / 2} y1={posA.y - 18} x2={posA.x + TANK_WIDTH / 2} y2={posA.y} active={outputs.pumpFillA} colorClassName="stroke-emerald-400" />

          <TankGlass x={posA.x} y={posA.y} levelPct={inputs.ltTankA} label="Tank A" fillClassName="fill-cyan-600/80" tripped={inputs.lshTankA} />

          {/* Transfer pump A -> B */}
          <FlowPipe x1={posA.x + TANK_WIDTH} y1={posA.y + TANK_HEIGHT - 20} x2={posB.x} y2={posB.y + 20} active={outputs.pumpTransferAB} colorClassName="stroke-emerald-400" />
          <g transform={`translate(${(posA.x + TANK_WIDTH + posB.x) / 2}, ${(posA.y + TANK_HEIGHT - 20 + posB.y + 20) / 2})`}>
            <circle r={16} className={outputs.pumpTransferAB ? 'fill-emerald-500' : 'fill-slate-700'} />
            <text x={0} y={4} textAnchor="middle" className="fill-slate-100 text-[9px] font-bold">
              P-AB
            </text>
          </g>

          <TankGlass x={posB.x} y={posB.y} levelPct={inputs.ltTankB} label="Tank B" fillClassName="fill-cyan-600/80" tripped={inputs.lshTankB} />

          {/* Proportional drain valve B -> C */}
          <FlowPipe x1={posB.x + TANK_WIDTH} y1={posB.y + TANK_HEIGHT - 20} x2={posC.x} y2={posC.y + 20} active={outputs.valveDrainBCPos > 0} colorClassName="stroke-sky-400" />
          <g transform={`translate(${(posB.x + TANK_WIDTH + posC.x) / 2}, ${(posB.y + TANK_HEIGHT - 20 + posC.y + 20) / 2})`}>
            <rect x={-20} y={-12} width={40} height={24} rx={4} className={outputs.valveDrainBCPos > 0 ? 'fill-sky-500' : 'fill-slate-700'} />
            <text x={0} y={4} textAnchor="middle" className="fill-slate-100 text-[9px] font-bold">
              {outputs.valveDrainBCPos.toFixed(0)}%
            </text>
          </g>

          <TankGlass x={posC.x} y={posC.y} levelPct={inputs.ltTankC} label="Tank C" fillClassName="fill-cyan-700/80" />

          {alarmActive && (
            <rect x={0} y={0} width={780} height={460} className="fill-rose-600" style={{ animation: 'alarm-pulse 1s ease-in-out infinite' }} />
          )}
        </svg>

        {alarmActive && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="animate-pulse rounded border border-rose-400 bg-rose-950/80 px-4 py-2 text-sm font-bold uppercase tracking-widest text-rose-200">
              {!inputs.eStop ? 'E-Stop Active' : 'Overflow Alarm'}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
          <div className={systemRunning ? 'mt-1 text-sm font-semibold text-emerald-400' : 'mt-1 text-sm font-semibold text-slate-400'}>
            {systemRunning ? 'Running' : 'Stopped'}
          </div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Pump Fill A</div>
          <div className={outputs.pumpFillA ? 'mt-1 text-sm font-semibold text-emerald-400' : 'mt-1 text-sm font-semibold text-slate-400'}>
            {outputs.pumpFillA ? 'ON' : 'OFF'}
          </div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Pump Transfer AB</div>
          <div className={outputs.pumpTransferAB ? 'mt-1 text-sm font-semibold text-emerald-400' : 'mt-1 text-sm font-semibold text-slate-400'}>
            {outputs.pumpTransferAB ? 'ON' : 'OFF'}
          </div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Drain Valve BC</div>
          <div className="mt-1 text-sm font-semibold text-slate-200">{outputs.valveDrainBCPos.toFixed(1)}%</div>
        </div>
      </div>
    </section>
  )
}

export default Visualizer
