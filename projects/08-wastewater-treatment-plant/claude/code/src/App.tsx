import { useEffect, type FC } from 'react'
import CodeViewer from './components/CodeViewer'
import ControlPanel from './components/ControlPanel'
import Visualizer from './components/Visualizer'
import { plcEngine } from './plc/softPlcEngine'
import { usePlcStore } from './store/usePlcStore'

const App: FC = () => {
  const engineRunning = usePlcStore((s) => s.engineRunning)
  const safetyTrip = usePlcStore((s) => s.internal.M_SafetyTrip)

  // The controller is left in RUN for the lifetime of the page, exactly like a
  // real M580 with its key switch in RUN — the MAST task free-runs at 50 ms.
  useEffect(() => {
    plcEngine.start()
    return () => plcEngine.stop()
  }, [])

  return (
    <div className="min-h-screen bg-industrial-900 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">
              Municipal Wastewater Treatment &amp; Multi-Basin Aeration Control
            </h1>
            <p className="text-sm text-slate-400">
              Modicon M580 · EcoStruxure Control Expert · IEC 61131-3 FBD / LD / ST · MAST 50 ms
            </p>
          </div>
          <div className="flex items-center gap-2">
            {safetyTrip && (
              <span className="inline-flex items-center gap-2 rounded border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                Safety Interlock Tripped
              </span>
            )}
            <span
              className={
                engineRunning
                  ? 'inline-flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300'
                  : 'inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-400'
              }
            >
              <span
                className={
                  engineRunning
                    ? 'h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400'
                    : 'h-1.5 w-1.5 rounded-full bg-slate-500'
                }
              />
              {engineRunning ? 'CPU RUN' : 'CPU STOP'}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-6 px-6 py-6 lg:grid-cols-[340px_minmax(0,1fr)]">
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
