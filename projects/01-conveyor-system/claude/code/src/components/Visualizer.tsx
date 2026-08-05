import type { FC } from 'react'
import { usePlcStore } from '../store/usePlcStore'

const Visualizer: FC = () => {
  const { conveyorRunning, crateCount, motorSpeedRpm } = usePlcStore()

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">Conveyor Visualizer</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded border border-slate-800 bg-slate-950 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
          <div className={conveyorRunning ? 'mt-2 text-lg font-semibold text-emerald-400' : 'mt-2 text-lg font-semibold text-slate-400'}>
            {conveyorRunning ? 'Running' : 'Stopped'}
          </div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Motor Speed</div>
          <div className="mt-2 text-lg font-semibold text-slate-200">{motorSpeedRpm} RPM</div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Detected Crates</div>
          <div className="mt-2 text-lg font-semibold text-slate-200">{crateCount}</div>
        </div>
      </div>
    </section>
  )
}

export default Visualizer
