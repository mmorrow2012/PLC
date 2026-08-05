import type { FC } from 'react'
import { usePlcStore, type LevelTag } from '../store/usePlcStore'

const LEVEL_ROWS: Array<{ tag: LevelTag; label: string }> = [
  { tag: 'ltTankA', label: 'LT_TankA' },
  { tag: 'ltTankB', label: 'LT_TankB' },
  { tag: 'ltTankC', label: 'LT_TankC' },
]

const ControlPanel: FC = () => {
  const {
    systemRunning,
    cycleTimeMs,
    scanCount,
    state,
    inputs,
    outputs,
    forces,
    requestStart,
    requestStop,
    setEStop,
    setLsh,
    nudgeLevel,
    setForce,
  } = usePlcStore()

  const canReset = outputs.alarmOverflow && inputs.ltTankA < 100 && inputs.ltTankB < 100 && !inputs.lshTankA && !inputs.lshTankB

  return (
    <aside className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">Control Panel</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded border border-slate-800 bg-slate-950 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Scan Cycle</div>
            <div className="mt-1 text-lg font-semibold text-slate-200">{cycleTimeMs} ms</div>
          </div>
          <div className="rounded border border-slate-800 bg-slate-950 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Scan Count</div>
            <div className="mt-1 text-lg font-semibold text-slate-200">{scanCount}</div>
          </div>
        </div>

        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Sequencer State</div>
          <div className="mt-1 text-sm font-semibold text-slate-200">{state}</div>
        </div>

        {/* E-Stop */}
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-slate-500">Hardware E-Stop</span>
            <span className={inputs.eStop ? 'text-xs font-semibold text-emerald-400' : 'text-xs font-semibold text-rose-400'}>
              {inputs.eStop ? 'Healthy' : 'Tripped'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setEStop(!inputs.eStop)}
            className={`w-full rounded px-4 py-2 text-sm font-bold uppercase tracking-wide transition ${
              inputs.eStop
                ? 'bg-rose-600 text-white hover:bg-rose-500'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {inputs.eStop ? 'Trip E-Stop' : 'Restore E-Stop'}
          </button>
        </div>

        {/* Start / Stop */}
        <div className="grid gap-3 grid-cols-2">
          <button
            type="button"
            onClick={requestStart}
            disabled={!inputs.eStop}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start
          </button>
          <button
            type="button"
            onClick={requestStop}
            disabled={!systemRunning}
            className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Stop
          </button>
        </div>

        {/* Alarm reset */}
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-slate-500">Alarm_Overflow</span>
            <span className={outputs.alarmOverflow ? 'text-xs font-semibold text-rose-400' : 'text-xs font-semibold text-slate-500'}>
              {outputs.alarmOverflow ? 'Latched' : 'Clear'}
            </span>
          </div>
          <button
            type="button"
            onClick={requestStart}
            disabled={!canReset}
            title={!outputs.alarmOverflow ? 'No alarm latched' : 'Field condition must clear before reset'}
            className="w-full rounded bg-rose-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Acknowledge &amp; Reset (Start_PB)
          </button>
        </div>

        {/* LSH float switches */}
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">High-Level Float Switches</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLsh('lshTankA', !inputs.lshTankA)}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
                inputs.lshTankA ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              LSH_TankA {inputs.lshTankA ? 'TRIPPED' : 'OK'}
            </button>
            <button
              type="button"
              onClick={() => setLsh('lshTankB', !inputs.lshTankB)}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
                inputs.lshTankB ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              LSH_TankB {inputs.lshTankB ? 'TRIPPED' : 'OK'}
            </button>
          </div>
        </div>

        {/* Analog level nudges / forces */}
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Analog Level Test Inputs</div>
          <div className="space-y-2">
            {LEVEL_ROWS.map(({ tag, label }) => (
              <div key={tag} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs text-slate-400">{label}</span>
                <button
                  type="button"
                  onClick={() => nudgeLevel(tag, -5)}
                  className="rounded bg-slate-800 px-2 py-1 text-xs font-bold text-slate-200 hover:bg-slate-700"
                  aria-label={`Decrease ${label}`}
                >
                  −5
                </button>
                <span className="w-14 text-center text-xs font-semibold text-slate-200">{inputs[tag].toFixed(1)}%</span>
                <button
                  type="button"
                  onClick={() => nudgeLevel(tag, 5)}
                  className="rounded bg-slate-800 px-2 py-1 text-xs font-bold text-slate-200 hover:bg-slate-700"
                  aria-label={`Increase ${label}`}
                >
                  +5
                </button>
                <label className="ml-auto flex items-center gap-1 text-[10px] uppercase text-slate-500">
                  <input
                    type="checkbox"
                    checked={forces[tag]}
                    onChange={(event) => setForce(tag, event.target.checked)}
                    className="h-3 w-3"
                  />
                  Force
                </label>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-snug text-slate-500">
            Forced tags hold their value and are excluded from the plant simulation until released — mirrors Control
            Expert I/O forcing.
          </p>
        </div>
      </div>
    </aside>
  )
}

export default ControlPanel
