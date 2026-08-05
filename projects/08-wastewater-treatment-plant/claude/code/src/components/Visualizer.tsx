import { useMemo, type FC } from 'react'
import { VESSEL_SPAN } from '../plc/plantSimulation'
import {
  CLARIFIER_DISCHARGE_M,
  EQ_LAG_START_M,
  EQ_LEAD_START_M,
  PLANT_STATE_DESCRIPTION,
  PLANT_STATE_LABEL,
  TRIP_LABEL,
  TURBIDITY_TRIP_NTU,
  clamp,
} from '../plc/types'
import { usePlcStore } from '../store/usePlcStore'

// --- Vessel geometry in the SVG user space ---------------------------------
const BASIN = {
  eq: { x: 24, y: 74, w: 118, h: 226 },
  primary: { x: 202, y: 128, w: 108, h: 172 },
  aerationA: { x: 372, y: 112, w: 132, h: 188 },
  aerationB: { x: 520, y: 112, w: 132, h: 188 },
  clarifier: { x: 716, y: 128, w: 130, h: 172 },
} as const

type Rect = { x: number; y: number; w: number; h: number }

function waterRect(rect: Rect, level: number, span: number) {
  const frac = clamp(level / span, 0, 1)
  const h = rect.h * frac
  return { x: rect.x, y: rect.y + rect.h - h, width: rect.w, height: h }
}

interface VesselProps {
  rect: Rect
  label: string
  level: number
  span: number
  unit?: string
  fill?: string
}

const Vessel: FC<VesselProps> = ({ rect, label, level, span, unit = 'm', fill = '#0e7490' }) => {
  const water = waterRect(rect, level, span)
  return (
    <g>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        rx={3}
        fill="#0b1220"
        stroke="#475569"
        strokeWidth={2}
      />
      <rect {...water} fill={fill} opacity={0.85} />
      {water.height > 2 && (
        <rect x={water.x} y={water.y} width={water.width} height={2.5} fill="#67e8f9" opacity={0.9} />
      )}
      <text
        x={rect.x + rect.w / 2}
        y={rect.y - 22}
        textAnchor="middle"
        fontSize={11}
        fill="#cbd5e1"
        fontWeight={600}
      >
        {label}
      </text>
      <text
        x={rect.x + rect.w / 2}
        y={rect.y - 8}
        textAnchor="middle"
        fontSize={10.5}
        fill="#67e8f9"
        fontFamily="monospace"
      >
        {level.toFixed(2)} {unit} / {span.toFixed(1)} {unit}
      </text>
    </g>
  )
}

interface PumpProps {
  cx: number
  cy: number
  running: boolean
  speedPct: number
  label: string
  lead: boolean
}

const Pump: FC<PumpProps> = ({ cx, cy, running, speedPct, label, lead }) => {
  // Bucketed so the CSS animation is not restarted on every 50 ms scan.
  const bucket = Math.max(1, Math.round(speedPct / 25))
  const duration = running ? `${1.4 / bucket}s` : '0s'
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={17}
        fill={running ? 'rgba(16,185,129,0.18)' : '#0b1220'}
        stroke={running ? '#34d399' : '#475569'}
        strokeWidth={2}
      />
      <g
        className={running ? 'wwtp-rotor' : undefined}
        style={{ transformOrigin: `${cx}px ${cy}px`, animationDuration: duration }}
      >
        <line
          x1={cx - 10}
          y1={cy}
          x2={cx + 10}
          y2={cy}
          stroke={running ? '#34d399' : '#64748b'}
          strokeWidth={2.4}
        />
        <line
          x1={cx}
          y1={cy - 10}
          x2={cx}
          y2={cy + 10}
          stroke={running ? '#34d399' : '#64748b'}
          strokeWidth={2.4}
        />
      </g>
      <text x={cx} y={cy + 32} textAnchor="middle" fontSize={9} fill="#94a3b8" fontFamily="monospace">
        {label}
      </text>
      {lead && (
        <text x={cx} y={cy - 24} textAnchor="middle" fontSize={8.5} fill="#fbbf24" fontFamily="monospace">
          LEAD
        </text>
      )}
    </g>
  )
}

interface DiffuserProps {
  rect: Rect
  active: boolean
  intensity: number
  level: number
}

/** Fine-bubble diffuser grid with rising air bubbles. */
const Diffuser: FC<DiffuserProps> = ({ rect, active, intensity, level }) => {
  const columns = 5
  const surfaceY = rect.y + rect.h * (1 - clamp(level / VESSEL_SPAN.aeration, 0, 1))
  const bubbles = useMemo(
    () =>
      Array.from({ length: columns * 3 }, (_, i) => ({
        col: i % columns,
        delay: (i * 0.27) % 1.6,
        r: 1.8 + ((i * 7) % 3) * 0.7,
      })),
    [],
  )
  const travel = Math.max(12, rect.y + rect.h - 8 - surfaceY)

  return (
    <g>
      {/* Diffuser header pipe along the floor */}
      <rect
        x={rect.x + 10}
        y={rect.y + rect.h - 9}
        width={rect.w - 20}
        height={4}
        rx={2}
        fill={active ? '#38bdf8' : '#334155'}
      />
      {active &&
        bubbles.map((bubble, index) => {
          const x = rect.x + 18 + bubble.col * ((rect.w - 36) / (columns - 1))
          return (
            <circle
              key={index}
              cx={x}
              cy={rect.y + rect.h - 10}
              r={bubble.r}
              fill="#e0f2fe"
              opacity={0.75}
              className="wwtp-bubble"
              style={{
                animationDelay: `${bubble.delay}s`,
                animationDuration: `${2.4 - 1.1 * clamp(intensity / 100, 0, 1)}s`,
                // @ts-expect-error — CSS custom property consumed by the keyframes
                '--rise': `${-travel}px`,
              }}
            />
          )
        })}
    </g>
  )
}

const Visualizer: FC = () => {
  const plant = usePlcStore((s) => s.plant)
  const outputs = usePlcStore((s) => s.outputs)
  const internal = usePlcStore((s) => s.internal)
  const inputs = usePlcStore((s) => s.inputs)

  const gateLift = (plant.weirPosition / 100) * 52
  const discharging = plant.weirPosition > 2
  const turbidityColor =
    plant.turbidity >= TURBIDITY_TRIP_NTU
      ? '#ef4444'
      : plant.turbidity >= internal.M_MaxTurbidity
        ? '#f59e0b'
        : '#34d399'

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          SCADA Plant Overview
        </h2>
        <div className="flex items-center gap-2">
          <span
            className={
              internal.M_SafetyTrip
                ? 'rounded border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 font-mono text-[11px] text-rose-300'
                : 'rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] text-cyan-200'
            }
          >
            %MW0 = {internal.M_PlantState} · {PLANT_STATE_LABEL[internal.M_PlantState]}
          </span>
        </div>
      </div>

      <p className="mb-3 text-xs text-slate-400">
        {PLANT_STATE_DESCRIPTION[internal.M_PlantState]}
      </p>

      <style>{`
        @keyframes wwtp-rotor-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .wwtp-rotor { animation-name: wwtp-rotor-spin; animation-timing-function: linear; animation-iteration-count: infinite; }
        @keyframes wwtp-bubble-rise {
          0%   { transform: translateY(0); opacity: 0; }
          15%  { opacity: 0.85; }
          100% { transform: translateY(var(--rise, -120px)); opacity: 0; }
        }
        .wwtp-bubble { animation-name: wwtp-bubble-rise; animation-timing-function: ease-out; animation-iteration-count: infinite; }
        @keyframes wwtp-flow-dash { to { stroke-dashoffset: -24; } }
        .wwtp-flow { stroke-dasharray: 8 6; animation: wwtp-flow-dash 0.7s linear infinite; }
      `}</style>

      <div className="overflow-x-auto rounded border border-slate-800 bg-slate-950 p-2">
        <svg viewBox="0 0 980 360" className="min-w-[900px]" role="img" aria-label="Wastewater plant mimic">
          {/* --- Raw influent channel --- */}
          <path
            d="M 0 96 L 24 96"
            stroke="#64748b"
            strokeWidth={6}
            fill="none"
            className={inputs.AI_LT_EqBasin < 10 ? 'wwtp-flow' : undefined}
          />
          <text x={2} y={86} fontSize={9.5} fill="#94a3b8" fontFamily="monospace">
            RAW INFLUENT
          </text>

          {/* --- Equalization basin --- */}
          <Vessel
            rect={BASIN.eq}
            label="Equalization Basin"
            level={plant.eqBasinLevel}
            span={VESSEL_SPAN.eq}
          />
          {/* Pump call setpoint markers */}
          {[
            { level: EQ_LEAD_START_M, text: 'LEAD 3.0' },
            { level: EQ_LAG_START_M, text: 'LAG 6.0' },
          ].map(({ level, text }) => {
            const y = BASIN.eq.y + BASIN.eq.h * (1 - level / VESSEL_SPAN.eq)
            return (
              <g key={text}>
                <line
                  x1={BASIN.eq.x}
                  y1={y}
                  x2={BASIN.eq.x + BASIN.eq.w}
                  y2={y}
                  stroke="#fbbf24"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.75}
                />
                <text x={BASIN.eq.x + BASIN.eq.w + 3} y={y + 3} fontSize={8} fill="#fbbf24" fontFamily="monospace">
                  {text}
                </text>
              </g>
            )
          })}
          {inputs.I_LSH_Equalization && (
            <text x={BASIN.eq.x + BASIN.eq.w / 2} y={BASIN.eq.y + 16} textAnchor="middle" fontSize={10} fill="#f87171" fontFamily="monospace">
              LSH %I0.4 HIGH-HIGH
            </text>
          )}

          {/* --- Influent pumps --- */}
          <Pump
            cx={172}
            cy={196}
            running={outputs.Q_Pump_RawInfluent1}
            speedPct={outputs.AQ_VFD_InfluentSpeed}
            label="P1 %Q0.0"
            lead={internal.M_LeadPumpToggle === 1}
          />
          <Pump
            cx={172}
            cy={262}
            running={outputs.Q_Pump_RawInfluent2}
            speedPct={outputs.AQ_VFD_InfluentSpeed}
            label="P2 %Q0.1"
            lead={internal.M_LeadPumpToggle === 2}
          />
          <path
            d="M 142 196 L 155 196 M 189 196 L 202 196 M 142 262 L 155 262 M 189 262 L 189 196"
            stroke={outputs.AQ_VFD_InfluentSpeed > 0 ? '#22d3ee' : '#475569'}
            strokeWidth={4}
            fill="none"
            className={outputs.AQ_VFD_InfluentSpeed > 0 ? 'wwtp-flow' : undefined}
          />
          <text x={172} y={310} textAnchor="middle" fontSize={9.5} fill="#67e8f9" fontFamily="monospace">
            VFD {outputs.AQ_VFD_InfluentSpeed.toFixed(0)} %
          </text>

          {/* --- Primary clarifier --- */}
          <Vessel
            rect={BASIN.primary}
            label="Primary Clarifier"
            level={plant.primaryLevel}
            span={VESSEL_SPAN.primary}
            fill="#0f766e"
          />
          <path
            d="M 310 168 L 372 168"
            stroke={plant.primaryLevel > 1.2 ? '#22d3ee' : '#475569'}
            strokeWidth={4}
            fill="none"
            className={plant.primaryLevel > 1.2 ? 'wwtp-flow' : undefined}
          />

          {/* --- Aeration basins --- */}
          <Vessel
            rect={BASIN.aerationA}
            label="Aeration Basin A"
            level={plant.aerationALevel}
            span={VESSEL_SPAN.aeration}
            fill="#0369a1"
          />
          <Diffuser
            rect={BASIN.aerationA}
            active={outputs.Q_Blower_AerationA}
            intensity={outputs.AQ_AirValve_Aeration}
            level={plant.aerationALevel}
          />
          <Vessel
            rect={BASIN.aerationB}
            label="Aeration Basin B"
            level={plant.aerationBLevel}
            span={VESSEL_SPAN.aeration}
            fill="#0369a1"
          />
          <Diffuser
            rect={BASIN.aerationB}
            active={outputs.Q_Blower_AerationB}
            intensity={outputs.AQ_AirValve_Aeration}
            level={plant.aerationBLevel}
          />

          {/* Blowers + air header */}
          {[
            { x: BASIN.aerationA.x + 34, running: outputs.Q_Blower_AerationA, tag: '%Q0.2' },
            { x: BASIN.aerationB.x + 34, running: outputs.Q_Blower_AerationB, tag: '%Q0.3' },
          ].map(({ x, running, tag }) => (
            <g key={tag}>
              <rect
                x={x}
                y={44}
                width={64}
                height={24}
                rx={4}
                fill={running ? 'rgba(56,189,248,0.18)' : '#0b1220'}
                stroke={running ? '#38bdf8' : '#475569'}
                strokeWidth={1.6}
              />
              <text x={x + 32} y={59} textAnchor="middle" fontSize={9.5} fill={running ? '#7dd3fc' : '#64748b'} fontFamily="monospace">
                BLOWER {tag}
              </text>
              <line
                x1={x + 32}
                y1={68}
                x2={x + 32}
                y2={92}
                stroke={running ? '#38bdf8' : '#334155'}
                strokeWidth={3}
                className={running ? 'wwtp-flow' : undefined}
              />
            </g>
          ))}
          <text x={BASIN.aerationA.x + 66} y={332} textAnchor="middle" fontSize={9.5} fill="#7dd3fc" fontFamily="monospace">
            DO {plant.dissolvedOxygen.toFixed(2)} / SP {internal.M_TargetDO.toFixed(2)} mg/L
          </text>
          <text x={BASIN.aerationB.x + 66} y={332} textAnchor="middle" fontSize={9.5} fill="#7dd3fc" fontFamily="monospace">
            AIR VALVE %QW102 {outputs.AQ_AirValve_Aeration.toFixed(0)} %
          </text>
          <path
            d="M 504 176 L 520 176"
            stroke="#22d3ee"
            strokeWidth={3}
            fill="none"
            opacity={0.6}
          />
          <path
            d="M 652 176 L 716 176"
            stroke={plant.aerationBLevel > 3 ? '#22d3ee' : '#475569'}
            strokeWidth={4}
            fill="none"
            className={plant.aerationBLevel > 3 ? 'wwtp-flow' : undefined}
          />

          {/* --- Coagulant dosing --- */}
          <rect
            x={706}
            y={40}
            width={58}
            height={28}
            rx={4}
            fill={outputs.Q_Pump_Coagulant ? 'rgba(217,70,239,0.2)' : '#0b1220'}
            stroke={outputs.Q_Pump_Coagulant ? '#e879f9' : '#475569'}
            strokeWidth={1.6}
          />
          <text x={735} y={58} textAnchor="middle" fontSize={9} fill={outputs.Q_Pump_Coagulant ? '#f0abfc' : '#64748b'} fontFamily="monospace">
            COAG %Q0.5
          </text>
          <line
            x1={735}
            y1={68}
            x2={735}
            y2={106}
            stroke={outputs.Q_Pump_Coagulant ? '#e879f9' : '#334155'}
            strokeWidth={3}
            className={outputs.Q_Pump_Coagulant ? 'wwtp-flow' : undefined}
          />

          {/* --- Secondary clarifier --- */}
          <Vessel
            rect={BASIN.clarifier}
            label="Secondary Clarifier"
            level={plant.clarifierLevel}
            span={VESSEL_SPAN.clarifier}
            fill="#0f766e"
          />
          {(() => {
            const y =
              BASIN.clarifier.y +
              BASIN.clarifier.h * (1 - CLARIFIER_DISCHARGE_M / VESSEL_SPAN.clarifier)
            return (
              <>
                <line
                  x1={BASIN.clarifier.x}
                  y1={y}
                  x2={BASIN.clarifier.x + BASIN.clarifier.w}
                  y2={y}
                  stroke="#fbbf24"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.75}
                />
                <text x={BASIN.clarifier.x + 4} y={y - 3} fontSize={8} fill="#fbbf24" fontFamily="monospace">
                  DISCHARGE 2.6
                </text>
              </>
            )
          })()}

          {/* --- RAS return line --- */}
          <path
            d="M 716 292 L 690 292 L 690 344 L 438 344 L 438 300"
            stroke={outputs.Q_Pump_RAS ? '#34d399' : '#334155'}
            strokeWidth={3}
            fill="none"
            className={outputs.Q_Pump_RAS ? 'wwtp-flow' : undefined}
          />
          <text x={560} y={357} textAnchor="middle" fontSize={9} fill={outputs.Q_Pump_RAS ? '#6ee7b7' : '#64748b'} fontFamily="monospace">
            RAS RECIRCULATION %Q0.4 {outputs.Q_Pump_RAS ? 'RUN' : 'STOP'}
          </text>

          {/* --- Motorised weir sluice gate --- */}
          <g>
            <rect x={846} y={196} width={52} height={104} fill="#0b1220" stroke="#475569" strokeWidth={2} />
            {/* effluent passing under the raised gate */}
            {discharging && (
              <rect
                x={846}
                y={300 - 10 - gateLift}
                width={52}
                height={10 + gateLift}
                fill="#0e7490"
                opacity={0.8}
              />
            )}
            <rect
              x={849}
              y={196 - gateLift}
              width={46}
              height={92}
              rx={2}
              fill={outputs.Q_Motor_WeirOpen || outputs.Q_Motor_WeirClose ? '#78716c' : '#57534e'}
              stroke={inputs.I_WeirOpenLS ? '#34d399' : '#a8a29e'}
              strokeWidth={2}
            />
            <line x1={872} y1={196 - gateLift} x2={872} y2={150} stroke="#a8a29e" strokeWidth={3} />
            <rect
              x={856}
              y={128}
              width={32}
              height={22}
              rx={3}
              fill={
                outputs.Q_Motor_WeirOpen
                  ? 'rgba(52,211,153,0.25)'
                  : outputs.Q_Motor_WeirClose
                    ? 'rgba(251,146,60,0.25)'
                    : '#0b1220'
              }
              stroke={
                outputs.Q_Motor_WeirOpen ? '#34d399' : outputs.Q_Motor_WeirClose ? '#fb923c' : '#475569'
              }
              strokeWidth={1.6}
            />
            <text x={872} y={143} textAnchor="middle" fontSize={9} fill="#cbd5e1" fontFamily="monospace">
              M
            </text>
            <text x={872} y={120} textAnchor="middle" fontSize={9} fill="#cbd5e1" fontFamily="monospace">
              WEIR GATE
            </text>
            <text x={872} y={318} textAnchor="middle" fontSize={9.5} fill="#67e8f9" fontFamily="monospace">
              {plant.weirPosition.toFixed(0)} % OPEN
            </text>
            <text
              x={872}
              y={330}
              textAnchor="middle"
              fontSize={8.5}
              fill={outputs.Q_Motor_WeirOpen ? '#34d399' : outputs.Q_Motor_WeirClose ? '#fb923c' : '#64748b'}
              fontFamily="monospace"
            >
              {outputs.Q_Motor_WeirOpen
                ? '%Q0.6 OPENING'
                : outputs.Q_Motor_WeirClose
                  ? '%Q0.7 CLOSING'
                  : 'STOPPED'}
            </text>
          </g>

          {/* --- Outfall --- */}
          <path
            d="M 898 288 L 972 288"
            stroke={discharging ? '#22d3ee' : '#334155'}
            strokeWidth={6}
            fill="none"
            className={discharging ? 'wwtp-flow' : undefined}
          />
          <text x={936} y={278} textAnchor="middle" fontSize={9} fill="#94a3b8" fontFamily="monospace">
            OUTFALL
          </text>
          <text x={936} y={306} textAnchor="middle" fontSize={9} fill={turbidityColor} fontFamily="monospace">
            {plant.turbidity.toFixed(1)} NTU
          </text>

          {/* --- Trip banner --- */}
          {internal.M_SafetyTrip && (
            <g>
              <rect x={220} y={8} width={540} height={26} rx={4} fill="rgba(239,68,68,0.18)" stroke="#ef4444" />
              <text x={490} y={26} textAnchor="middle" fontSize={12} fill="#fca5a5" fontFamily="monospace">
                ⚠ SAFETY INTERLOCK TRIPPED — {TRIP_LABEL[internal.M_AlarmCode]}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* --- Step-by-step demo card --- */}
      <div className="mt-4 rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-4">
        <h3 className="mb-2 text-sm font-semibold text-cyan-200">
          Interactive demo — four steps to exercise every function block
        </h3>
        <ol className="space-y-2 text-xs leading-relaxed text-slate-300">
          <li>
            <span className="mr-1.5 rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-cyan-200">1</span>
            <strong>Start the plant.</strong> Press <em>PLANT START</em> on the HMI. Raw sewage fills
            the equalization basin; at <span className="font-mono">3.0 m</span>{' '}
            <span className="font-mono">FB_LeadLagPump</span> starts the lead influent pump and the
            VFD ramps up. Push the <em>Raw Influent</em> slider past 60 % to reach{' '}
            <span className="font-mono">6.0 m</span> and watch the lag pump cut in at 100 % speed.
          </li>
          <li>
            <span className="mr-1.5 rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-cyan-200">2</span>
            <strong>Watch aeration take over.</strong> Once basin A passes{' '}
            <span className="font-mono">2.0 m</span> the state word steps to{' '}
            <span className="font-mono">AERATION_ACTIVE</span>,{' '}
            <span className="font-mono">FB_AerationDO</span> starts both diffuser blowers and
            modulates %QW102. Drag the <em>DO setpoint</em> slider up and down — the bubble density
            and the blower contactors follow the PI demand.
          </li>
          <li>
            <span className="mr-1.5 rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-cyan-200">3</span>
            <strong>Discharge through the weir gate.</strong> When the secondary clarifier reaches{' '}
            <span className="font-mono">2.6 m</span> and turbidity is inside the %MW4 consent limit,{' '}
            <span className="font-mono">FB_WeirGateControl</span> drives %Q0.6 and the sluice gate
            lifts over 4 s. Lower the <em>Max turbidity</em> setpoint below the live NTU reading and
            the gate is held shut instead — effluent quality vetoes the discharge.
          </li>
          <li>
            <span className="mr-1.5 rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-cyan-200">4</span>
            <strong>Trip the safety interlock.</strong> Hit <em>Storm / toxic shock</em> to spike
            turbidity past <span className="font-mono">25.0 NTU</span>, or press the E-Stop
            mushroom. <span className="font-mono">FB_SafetyInterlock</span> latches, every drive
            de-energises, the gate is driven closed and %MW0 goes to 99. Release the cause, then
            press <em>RESET FAULT</em> — the latch only clears once the condition is gone.
          </li>
        </ol>
      </div>
    </section>
  )
}

export default Visualizer
