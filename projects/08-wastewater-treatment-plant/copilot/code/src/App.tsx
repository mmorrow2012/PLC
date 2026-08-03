import { CodeViewer } from './components/CodeViewer';
import { ControlPanel } from './components/ControlPanel';
import { Visualizer } from './components/Visualizer';
import { createSoftPlcSnapshot } from './plc/softPlcEngine';
import { usePlcStore } from './store/usePlcStore';

export function App() {
  const snapshot = usePlcStore(createSoftPlcSnapshot);

  return (
    <div className="min-h-screen bg-industrial-950 text-slate-100">
      <header className="border-b border-industrial-700 px-6 py-4">
        <p className="text-sm uppercase tracking-[0.2em] text-industrial-accent">Portfolio Demonstrator</p>
        <h1 className="text-2xl font-semibold">Municipal Wastewater Treatment & Multi-Basin Control System</h1>
        <p className="mt-2 text-sm text-slate-400">
          Soft PLC scaffold with {snapshot.basinCount} process areas and a {snapshot.scanTimeMs} ms scan interval.
        </p>
      </header>
      <main className="grid gap-4 p-6 xl:grid-cols-[2fr_1fr]">
        <Visualizer />
        <div className="space-y-4">
          <ControlPanel />
          <CodeViewer />
        </div>
      </main>
    </div>
  );
}

export default App;
