import type { FC } from 'react'
import { BellRing, ShieldAlert, TrainFront } from 'lucide-react'
import CodeViewer from './components/CodeViewer'
import ControlPanel from './components/ControlPanel'
import TimetableBoard from './components/TimetableBoard'
import Visualizer from './components/Visualizer'
import { NETWORK_STATE_LABEL, ST_SIGNAL_FAULT, formatClock } from './plc/types'
import { usePlcStore } from './store/usePlcStore'

const App: FC = () => {
  const internal = usePlcStore((s) => s.internal)
  const outputs = usePlcStore((s) => s.outputs)
  const forced = usePlcStore((s) => Object.keys(s.forces).length)

  const faulted = internal.M_NetworkState === ST_SIGNAL_FAULT

  return (
    <div className="min-h-screen bg-industrial-900 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TrainFront className="text-industrial-accent" size={24} />
            <div>
              <h1 className="text-xl font-semibold">UK Intercity Railway Network & Signalling Controller</h1>
              <p className="text-sm text-slate-400">
                S7-1500F / M580 Safety · SIL4 axle-counter block interlocking · 9 stations · MAST 50 ms
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {forced > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-medium text-amber-300">
                <ShieldAlert size={13} />
                {forced} I/O force{forced > 1 ? 's' : ''} active
              </span>
            )}
            {outputs.Q_PlatformBuzzer && (
              <span className="inline-flex items-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 font-medium text-cyan-300">
                <BellRing size={13} className="animate-pulse" />
                %Q0.6 boarding chime
              </span>
            )}
            <span className="rounded border border-slate-700 bg-slate-950 px-3 py-1 font-mono text-slate-300">
              {formatClock(internal.M_ClockSeconds)}
            </span>
            <span
              className={
                faulted
                  ? 'inline-flex items-center gap-2 rounded border border-rose-500/40 bg-rose-500/10 px-3 py-1 font-medium text-rose-300'
                  : internal.M_NetworkRun
                    ? 'inline-flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-medium text-emerald-300'
                    : 'inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-800 px-3 py-1 font-medium text-slate-300'
              }
            >
              <span
                className={
                  faulted
                    ? 'h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400'
                    : internal.M_NetworkRun
                      ? 'h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400'
                      : 'h-1.5 w-1.5 rounded-full bg-slate-500'
                }
              />
              {NETWORK_STATE_LABEL[internal.M_NetworkState]}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-6 px-6 py-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <ControlPanel />
        <div className="grid min-w-0 gap-6">
          <Visualizer />
          <TimetableBoard />
          <CodeViewer />
        </div>
      </main>

      <footer className="border-t border-slate-800 px-6 py-4 text-center text-[11px] text-slate-600">
        Soft-PLC demonstrator — the scan engine, block interlocking and timetable engine are a
        faithful port of <span className="font-mono text-slate-500">src/plc/railwayLogic.st</span>.
      </footer>
    </div>
  )
}

export default App
