import type { FC } from 'react'
import { usePlcStore } from '../store/usePlcStore'

const aspectColor: Record<string, string> = {
  red: 'text-rose-400',
  yellow: 'text-amber-400',
  'double-yellow': 'text-amber-400',
  green: 'text-emerald-400',
}

const Visualizer: FC = () => {
  const { systemRunning, signals, points, blockOccupied } = usePlcStore()

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">Network Visualizer</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-slate-800 bg-slate-950 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
          <div className={systemRunning ? 'mt-2 text-lg font-semibold text-emerald-400' : 'mt-2 text-lg font-semibold text-slate-400'}>
            {systemRunning ? 'Running' : 'Stopped'}
          </div>
        </div>
        {Object.entries(signals).map(([id, signal]) => (
          <div key={id} className="rounded border border-slate-800 bg-slate-950 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">{id}</div>
            <div className={`mt-2 text-lg font-semibold capitalize ${aspectColor[signal.aspect]}`}>{signal.aspect}</div>
          </div>
        ))}
        {Object.entries(points).map(([id, point]) => (
          <div key={id} className="rounded border border-slate-800 bg-slate-950 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">{id}</div>
            <div className="mt-2 text-lg font-semibold text-slate-200">{point.normal ? 'Normal' : 'Reverse'}</div>
          </div>
        ))}
        {Object.entries(blockOccupied).map(([id, occupied]) => (
          <div key={id} className="rounded border border-slate-800 bg-slate-950 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">{id}</div>
            <div className={occupied ? 'mt-2 text-lg font-semibold text-amber-400' : 'mt-2 text-lg font-semibold text-slate-200'}>
              {occupied ? 'Occupied' : 'Clear'}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default Visualizer
