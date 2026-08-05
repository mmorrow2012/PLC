import { type FC, useEffect, useState } from 'react'
import { plcEngine } from '../plc/softPlcEngine'
import { COLOR_ACCEPT, COLOR_REJECT, COLOR_SPECIAL, type PartColor } from '../plc/types'
import { type ForceableTag, usePlcStore } from '../store/usePlcStore'

const COLOR_OPTIONS: Array<{ value: PartColor; label: string; swatch: string }> = [
  { value: COLOR_ACCEPT, label: 'Accept (Green)', swatch: 'bg-emerald-500' },
  { value: COLOR_REJECT, label: 'Reject (Red)', swatch: 'bg-rose-500' },
  { value: COLOR_SPECIAL, label: 'Special (Blue)', swatch: 'bg-blue-500' },
]

const FORCEABLE_TAGS: ForceableTag[] = ['VFD_Run', 'VFD_Speed_Ref', 'Actuator_Diverter', 'Alarm_Tower']

const ControlPanel: FC = () => {
  const inputs = usePlcStore((s) => s.inputs)
  const internal = usePlcStore((s) => s.internal)
  const outputs = usePlcStore((s) => s.outputs)
  const commands = usePlcStore((s) => s.commands)
  const metrics = usePlcStore((s) => s.metrics)
  const forces = usePlcStore((s) => s.forces)
  const engineRunning = usePlcStore((s) => s.engineRunning)

  const setEStop = usePlcStore((s) => s.setEStop)
  const pulseStart = usePlcStore((s) => s.pulseStart)
  const pulseStop = usePlcStore((s) => s.pulseStop)
  const pulseManualReset = usePlcStore((s) => s.pulseManualReset)
  const setSpeedSetpoint = usePlcStore((s) => s.setSpeedSetpoint)
  const spawnPart = usePlcStore((s) => s.spawnPart)
  const setForce = usePlcStore((s) => s.setForce)
  const clearForce = usePlcStore((s) => s.clearForce)
  const systemReset = usePlcStore((s) => s.systemReset)

  const [spawnColor, setSpawnColor] = useState<PartColor>(COLOR_ACCEPT)
  const [spawnWeight, setSpawnWeight] = useState(1.5)

  useEffect(() => {
    plcEngine.start()
    return () => plcEngine.stop()
  }, [])

  const faultLatched = internal.EStopFaultLatched

  return (
    <aside className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">HMI Control Panel</h2>

      <div className="space-y-5">
        {/* Scan engine status */}
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Soft-PLC Scan Engine</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className={engineRunning ? 'text-lg font-semibold text-emerald-400' : 'text-lg font-semibold text-slate-400'}>
              {engineRunning ? 'RUNNING' : 'STOPPED'}
            </span>
            <span className="text-xs text-slate-500">{metrics.configuredCycleTimeMs} ms target</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Actual: {metrics.lastCycleTimeMs.toFixed(1)} ms · Scan #{metrics.scanCount}
          </div>
        </div>

        {/* E-Stop */}
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Safety Circuit</div>
          <button
            type="button"
            onClick={() => setEStop(!inputs.E_Stop)}
            disabled={'E_Stop' in forces}
            className={
              inputs.E_Stop
                ? 'w-full rounded border border-emerald-600 bg-emerald-600/20 px-4 py-3 text-sm font-bold uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-50'
                : 'w-full animate-pulse rounded border border-rose-500 bg-rose-600 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-rose-500'
            }
          >
            {inputs.E_Stop ? 'E-Stop: Healthy (click to trip)' : 'E-STOP TRIPPED — click to restore'}
          </button>
          <button
            type="button"
            onClick={pulseManualReset}
            disabled={!faultLatched || !inputs.E_Stop}
            className="mt-2 w-full rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Manual Reset {faultLatched && inputs.E_Stop ? '(required)' : ''}
          </button>
        </div>

        {/* Start / Stop */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={pulseStart}
            disabled={!internal.SystemReady || outputs.VFD_Run}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start
          </button>
          <button
            type="button"
            onClick={pulseStop}
            disabled={!outputs.VFD_Run}
            className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Stop
          </button>
        </div>

        {/* Speed setpoint */}
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
            <span>Speed Setpoint</span>
            <span className="font-mono text-slate-300">{commands.Speed_Setpoint.toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={commands.Speed_Setpoint}
            onChange={(e) => setSpeedSetpoint(Number(e.target.value))}
            className="w-full accent-cyan-500"
          />
        </div>

        {/* Spawn parts */}
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Spawn Part</div>
          <div className="mb-2 grid grid-cols-3 gap-1.5">
            {COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSpawnColor(opt.value)}
                className={`flex items-center gap-1.5 rounded border px-2 py-1.5 text-[11px] transition ${
                  spawnColor === opt.value ? 'border-cyan-500 bg-cyan-500/10 text-cyan-200' : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${opt.swatch}`} />
                {opt.label.split(' ')[0]}
              </button>
            ))}
          </div>
          <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Weight (kg)</span>
            <span className="font-mono text-slate-300">{spawnWeight.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={6}
            step={0.05}
            value={spawnWeight}
            onChange={(e) => setSpawnWeight(Number(e.target.value))}
            className="mb-3 w-full accent-cyan-500"
          />
          <button
            type="button"
            onClick={() => spawnPart(spawnColor, spawnWeight)}
            className="w-full rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-500"
          >
            Spawn Part
          </button>
        </div>

        {/* Forced overrides */}
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Forced I/O Overrides</div>
          <div className="space-y-1.5">
            {FORCEABLE_TAGS.map((tag) => {
              const isForced = tag in forces
              return (
                <div key={tag} className="flex items-center justify-between text-[11px]">
                  <span className={isForced ? 'font-mono text-amber-300' : 'font-mono text-slate-400'}>{tag}</span>
                  <button
                    type="button"
                    onClick={() =>
                      isForced ? clearForce(tag) : setForce(tag, typeof outputs[tag as keyof typeof outputs] === 'boolean' ? true : outputs[tag as keyof typeof outputs])
                    }
                    className={
                      isForced
                        ? 'rounded border border-amber-500 bg-amber-500/20 px-2 py-0.5 text-amber-200'
                        : 'rounded border border-slate-700 px-2 py-0.5 text-slate-400 hover:border-slate-500'
                    }
                  >
                    {isForced ? 'Unforce' : 'Force'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={systemReset}
          className="w-full rounded border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
        >
          System Reset (clear simulation)
        </button>
      </div>
    </aside>
  )
}

export default ControlPanel
