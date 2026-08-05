import type { FC } from 'react'
import { usePlcStore } from '../store/usePlcStore'

const ControlPanel: FC = () => {
  const { systemRunning, setSystemRunning, cycleTimeMs } = usePlcStore()

  return (
    <aside className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">Control Panel</h2>
      <div className="space-y-4">
        <div className="rounded border border-slate-800 bg-slate-950 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Scan Cycle</div>
          <div className="mt-2 text-lg font-semibold text-slate-200">{cycleTimeMs} ms</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <button
            type="button"
            onClick={() => setSystemRunning(true)}
            disabled={systemRunning}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start
          </button>
          <button
            type="button"
            onClick={() => setSystemRunning(false)}
            disabled={!systemRunning}
            className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Stop
          </button>
        </div>
      </div>
    </aside>
  )
}

export default ControlPanel
