import type { FC } from 'react'
import { usePlcStore } from '../store/usePlcStore'

const Visualizer: FC = () => {
  const { systemRunning, pumps, aerationBlowerRunning, aerationBasinLevel, clarifierLevel } = usePlcStore()

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">Plant Visualizer</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-slate-800 bg-slate-950 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
          <div className={systemRunning ? 'mt-2 text-lg font-semibold text-emerald-400' : 'mt-2 text-lg font-semibold text-slate-400'}>
            {systemRunning ? 'Running' : 'Stopped'}
          </div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Influent Pump</div>
          <div className="mt-2 text-lg font-semibold text-slate-200">{pumps.influentPumpRunning ? 'Running' : 'Stopped'}</div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Aeration Blower</div>
          <div className="mt-2 text-lg font-semibold text-slate-200">{aerationBlowerRunning ? 'Running' : 'Stopped'}</div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Aeration Basin / Clarifier</div>
          <div className="mt-2 text-lg font-semibold text-slate-200">
            {aerationBasinLevel}% / {clarifierLevel}%
          </div>
        </div>
      </div>
    </section>
  )
}

export default Visualizer
