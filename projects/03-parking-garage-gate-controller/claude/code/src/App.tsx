import type { FC } from 'react'
import CodeViewer from './components/CodeViewer'
import ControlPanel from './components/ControlPanel'
import Visualizer from './components/Visualizer'

const App: FC = () => {
  return (
    <div className="min-h-screen bg-industrial-900 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Parking Garage Gate Controller</h1>
            <p className="text-sm text-slate-400">Industrial automation portfolio demonstrator scaffold</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            Scaffold Ready
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
