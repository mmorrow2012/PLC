import { useEffect, type FC } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  GitBranch,
  Play,
  RotateCcw,
  Siren,
  Square,
  TrainTrack,
  Zap,
} from 'lucide-react'
import { plcEngine } from '../plc/softPlcEngine'
import {
  NETWORK_STATE_LABEL,
  ST_SIGNAL_FAULT,
  stationBlockId,
} from '../plc/types'
import type { ServiceId } from '../plc/types'
import { usePlcStore } from '../store/usePlcStore'

const FORCEABLE_TAGS: Array<{ tag: string; label: string; address: string }> = [
  { tag: 'I_AxleCounter_London', label: 'Axle counter — London', address: '%I0.3' },
  { tag: 'I_AxleCounter_Brum', label: 'Axle counter — Birmingham', address: '%I0.4' },
  { tag: 'I_AxleCounter_Manchester', label: 'Axle counter — Manchester', address: '%I0.5' },
  { tag: 'I_AxleCounter_Edinburgh', label: 'Axle counter — Edinburgh', address: '%I0.6' },
  { tag: 'I_PointSwitch_Normal', label: 'Point detection', address: '%I0.7' },
]

interface SpeedFaceplateProps {
  train: ServiceId
  headcode: string
  address: string
  accent: string
}

const SpeedFaceplate: FC<SpeedFaceplateProps> = ({ train, headcode, address, accent }) => {
  const commands = usePlcStore((s) => s.commands)
  const internal = usePlcStore((s) => s.internal)
  const setTargetSpeed = usePlcStore((s) => s.setTargetSpeed)
  const nudgeTargetSpeed = usePlcStore((s) => s.nudgeTargetSpeed)
  const toggleStopOverride = usePlcStore((s) => s.toggleStopOverride)

  const isLead = train === 'IC1'
  const target = isLead ? commands.targetSpeed1 : commands.targetSpeed2
  const permitted = isLead ? internal.M_PermittedSpeed_Train1 : internal.M_PermittedSpeed_Train2
  const override = isLead ? commands.stopOverride1 : commands.stopOverride2
  const braking = isLead ? internal.M_BrakeDemand_Train1 : internal.M_BrakeDemand_Train2

  return (
    <div className="rounded border border-slate-800 bg-slate-950 p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <TrainTrack size={14} style={{ color: accent }} />
          {headcode} speed setpoint
        </span>
        <span className="font-mono text-[10px] text-slate-500">{address}</span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-2xl" style={{ color: accent }}>
          {target}
        </span>
        <span className="text-[10px] text-slate-500">km/h demand</span>
        <span
          className={
            braking
              ? 'ml-auto rounded bg-rose-500/15 px-1.5 py-0.5 font-mono text-[10px] text-rose-300'
              : 'ml-auto rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400'
          }
        >
          {braking ? 'BRAKE DEMAND' : `MA ${permitted.toFixed(0)} km/h`}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={200}
        step={5}
        value={target}
        onChange={(event) => setTargetSpeed(train, Number(event.target.value))}
        className="mt-2 w-full accent-cyan-400"
        aria-label={`${headcode} target speed`}
      />

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => nudgeTargetSpeed(train, 10)}
          className="flex items-center justify-center gap-1 rounded bg-emerald-600/90 px-2 py-1.5 text-[11px] font-medium text-white transition hover:bg-emerald-500"
        >
          <ChevronUp size={13} />
          Speed up
        </button>
        <button
          type="button"
          onClick={() => nudgeTargetSpeed(train, -10)}
          className="flex items-center justify-center gap-1 rounded bg-amber-600/90 px-2 py-1.5 text-[11px] font-medium text-white transition hover:bg-amber-500"
        >
          <ChevronDown size={13} />
          Slow down
        </button>
      </div>

      <button
        type="button"
        onClick={() => toggleStopOverride(train)}
        className={
          override
            ? 'mt-2 w-full rounded border border-violet-400/50 bg-violet-500/20 px-2 py-1.5 text-[11px] font-medium text-violet-200'
            : 'mt-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] font-medium text-slate-400 transition hover:text-slate-200'
        }
      >
        Station stop override {override ? '— NON-STOP' : '— booked calls'}
      </button>
    </div>
  )
}

const ControlPanel: FC = () => {
  const engineRunning = usePlcStore((s) => s.engineRunning)
  const inputs = usePlcStore((s) => s.inputs)
  const internal = usePlcStore((s) => s.internal)
  const outputs = usePlcStore((s) => s.outputs)
  const commands = usePlcStore((s) => s.commands)
  const occupancy = usePlcStore((s) => s.occupancy)
  const forces = usePlcStore((s) => s.forces)
  const metrics = usePlcStore((s) => s.metrics)

  const pressMasterRun = usePlcStore((s) => s.pressMasterRun)
  const pressResetFault = usePlcStore((s) => s.pressResetFault)
  const toggleEStop = usePlcStore((s) => s.toggleEStop)
  const toggleExpressService = usePlcStore((s) => s.toggleExpressService)
  const togglePointRequest = usePlcStore((s) => s.togglePointRequest)
  const setForce = usePlcStore((s) => s.setForce)
  const clearForces = usePlcStore((s) => s.clearForces)
  const resetNetwork = usePlcStore((s) => s.resetNetwork)

  // The CPU runs for as long as the page is mounted, exactly like a real rack.
  useEffect(() => {
    plcEngine.start()
    return () => plcEngine.stop()
  }, [])

  const junctionLocked = Boolean(occupancy[stationBlockId('BHM')])
  const pointRequestPending = commands.pointReverseRequest !== internal.M_PointReverseCmd
  const faulted = internal.M_NetworkState === ST_SIGNAL_FAULT

  return (
    <aside className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
          <Cpu size={15} className="text-industrial-accent" />
          Signalling Control Desk
        </h2>

        <div className="grid grid-cols-2 gap-2 rounded border border-slate-800 bg-slate-950 p-3 font-mono text-[11px]">
          <div>
            <div className="text-[9px] uppercase tracking-wide text-slate-500">MAST scan</div>
            <div className="text-slate-200">
              {metrics.lastCycleTimeMs.toFixed(0)} / {metrics.configuredCycleTimeMs} ms
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wide text-slate-500">Scan count</div>
            <div className="text-slate-200">#{metrics.scanCount}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wide text-slate-500">%MW0 state</div>
            <div className={faulted ? 'text-rose-300' : 'text-slate-200'}>
              {internal.M_NetworkState} · {NETWORK_STATE_LABEL[internal.M_NetworkState]}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wide text-slate-500">CPU</div>
            <div className={engineRunning ? 'text-emerald-300' : 'text-slate-400'}>
              {engineRunning ? 'RUN' : 'STOP'}
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          <button
            type="button"
            onClick={pressMasterRun}
            disabled={faulted}
            className={
              internal.M_NetworkRun
                ? 'flex items-center justify-center gap-2 rounded bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50'
                : 'flex items-center justify-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50'
            }
          >
            {internal.M_NetworkRun ? <Square size={16} /> : <Play size={16} />}
            {internal.M_NetworkRun ? 'Stop service (%I0.1)' : 'Start service (%I0.1)'}
          </button>

          <button
            type="button"
            onClick={toggleEStop}
            className={
              inputs.I_EStop_NC
                ? 'flex items-center justify-center gap-2 rounded border-2 border-rose-500/60 bg-rose-600/90 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-rose-500'
                : 'flex items-center justify-center gap-2 rounded border-2 border-amber-400/70 bg-amber-500/20 px-4 py-3 text-sm font-bold uppercase tracking-wide text-amber-200'
            }
          >
            <Siren size={16} />
            {inputs.I_EStop_NC ? 'Emergency stop' : 'Release mushroom'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={pressResetFault}
              className="flex items-center justify-center gap-1.5 rounded bg-slate-700 px-3 py-2 text-xs font-medium text-slate-100 transition hover:bg-slate-600"
            >
              <RotateCcw size={14} />
              Reset (%I0.2)
            </button>
            <button
              type="button"
              onClick={toggleExpressService}
              className={
                commands.expressService
                  ? 'flex items-center justify-center gap-1.5 rounded border border-cyan-400/50 bg-cyan-500/20 px-3 py-2 text-xs font-medium text-cyan-200'
                  : 'flex items-center justify-center gap-1.5 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-400 transition hover:text-slate-200'
              }
            >
              <Zap size={14} />
              Express
            </button>
          </div>

          <button
            type="button"
            onClick={togglePointRequest}
            className={
              commands.pointReverseRequest
                ? 'flex items-center justify-between gap-2 rounded border border-violet-400/50 bg-violet-500/20 px-3 py-2 text-xs font-medium text-violet-200'
                : 'flex items-center justify-between gap-2 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 transition hover:text-slate-100'
            }
          >
            <span className="flex items-center gap-1.5">
              <GitBranch size={14} />
              Birmingham North Jn
            </span>
            <span className="font-mono text-[10px]">
              {commands.pointReverseRequest ? 'REVERSE · via Liverpool' : 'NORMAL · via Manchester'}
            </span>
          </button>

          <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[10px] text-slate-400">
            <div className="flex justify-between">
              <span>%Q0.4 / %Q0.5 point motor</span>
              <span className={outputs.Q_PointMotor_AlignMain || outputs.Q_PointMotor_AlignBranch ? 'text-amber-300' : 'text-slate-600'}>
                {outputs.Q_PointMotor_AlignBranch
                  ? 'DRIVING REVERSE'
                  : outputs.Q_PointMotor_AlignMain
                    ? 'DRIVING NORMAL'
                    : 'AT REST'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>%I0.7 detection</span>
              <span className={inputs.I_PointSwitch_Normal ? 'text-emerald-300' : 'text-rose-300'}>
                {inputs.I_PointSwitch_Normal ? 'PROVED & LOCKED' : 'OUT OF CORRESPONDENCE'}
              </span>
            </div>
            {pointRequestPending && junctionLocked && (
              <div className="mt-1 text-amber-300">
                Route locked — request held until the Birmingham hub block clears.
              </div>
            )}
          </div>
        </div>
      </section>

      <SpeedFaceplate train="IC1" headcode="1S47 Train 1" address="%MW2 → %QW100" accent="#22d3ee" />
      <SpeedFaceplate train="IC2" headcode="1E23 Train 2" address="%MW4 → %QW102" accent="#c084fc" />

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Field I/O forces
          </h2>
          <button
            type="button"
            onClick={clearForces}
            className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400 transition hover:text-slate-200"
          >
            Clear all
          </button>
        </div>
        <p className="mb-2 text-[10px] leading-relaxed text-slate-500">
          Animation-table style forcing. A forced axle counter is seen by the interlock itself, so
          holding a block occupied really does put the protecting signal back to danger.
        </p>
        <ul className="space-y-1.5">
          {FORCEABLE_TAGS.map((entry) => {
            const forced = forces[entry.tag]
            return (
              <li key={entry.tag} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate text-slate-400">
                  <span className="font-mono text-slate-500">{entry.address}</span> {entry.label}
                </span>
                <span className="inline-flex overflow-hidden rounded border border-slate-700">
                  {([true, false] as const).map((value) => (
                    <button
                      key={String(value)}
                      type="button"
                      onClick={() => setForce(entry.tag, forced === value ? undefined : value)}
                      className={
                        forced === value
                          ? 'bg-amber-500/25 px-1.5 py-0.5 font-mono text-[10px] text-amber-200'
                          : 'bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 hover:text-slate-300'
                      }
                    >
                      {value ? '1' : '0'}
                    </button>
                  ))}
                </span>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          onClick={resetNetwork}
          className="mt-3 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] font-medium text-slate-300 transition hover:text-white"
        >
          Reset network to 08:00 diagram
        </button>
      </section>
    </aside>
  )
}

export default ControlPanel
