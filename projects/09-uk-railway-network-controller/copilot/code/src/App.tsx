import CodeViewer from './components/CodeViewer';
import ControlPanel from './components/ControlPanel';
import Visualizer from './components/Visualizer';
import { runSoftPlcScan } from './plc/softPlcEngine';
import { usePlcStore } from './store/usePlcStore';

function App() {
  const cycleTimeMs = usePlcStore((state) => state.cycleTimeMs);
  const snapshot = runSoftPlcScan(cycleTimeMs);

  return (
    <main className="min-h-screen bg-industrial-900 px-4 py-6 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-lg border border-industrial-700 bg-industrial-800 p-6 shadow-lg">
          <p className="text-sm uppercase tracking-[0.3em] text-industrial-accent">PLC Portfolio Demonstrator</p>
          <h1 className="mt-2 text-3xl font-bold">UK Intercity Railway Network &amp; Signaling Controller</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-300">
            Scaffolded operator workspace for visualization, soft PLC execution, and Structured Text inspection.
          </p>
          <p className="mt-3 text-xs text-slate-400">Latest scan timestamp: {snapshot.timestamp}</p>
        </header>
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Visualizer />
          <ControlPanel />
        </section>
        <CodeViewer />
      </div>
    </main>
  );
}

export default App;
