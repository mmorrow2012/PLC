import { useEffect, type FC } from 'react'
import CodeViewer from './components/CodeViewer'
import ControlPanel from './components/ControlPanel'
import Visualizer from './components/Visualizer'
import { SoftPlcEngine } from './plc/softPlcEngine'
import { usePlcStore } from './store/usePlcStore'

const engine = new SoftPlcEngine(50)

const App: FC = () => {
  const { outputs, inputs } = usePlcStore()

  useEffect(() => {
    engine.start()
    return () => engine.stop()
  }, [])

  const alarmed = outputs.alarmOverflow || !inputs.eStop

  return (
    <div className="min-h-screen bg-industrial-900 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Three-Tank Liquid Level Control</h1>
            <p className="text-sm text-slate-400">Schneider Modicon M580 soft-PLC simulator — cascade level control</p>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded border px-3 py-1 text-xs font-medium ${
              alarmed
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${alarmed ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'}`} />
            {alarmed ? 'Fault' : 'Scan Active'}
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <ControlPanel />
        <div className="grid gap-6">
          <Visualizer />
          <CodeViewer />
        </div>
      </main>
    </div>
  )
}

export default App
