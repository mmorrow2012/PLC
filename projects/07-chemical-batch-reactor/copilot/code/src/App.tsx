import { useEffect } from 'react';
import { Beaker, Cpu } from 'lucide-react';
import { CodeViewer } from './components/CodeViewer';
import { ControlPanel } from './components/ControlPanel';
import { Visualizer } from './components/Visualizer';
import { softPlcEngine } from './plc/softPlcEngine';

export function App() {
  useEffect(() => {
    softPlcEngine.start();
    return () => softPlcEngine.stop();
  }, []);

  return (
    <div className="min-h-screen bg-industrial-950 text-slate-100">
      <header className="border-b border-industrial-800 bg-industrial-900 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-cyan-500/40 bg-cyan-950 p-2 text-cyan-400">
              <Beaker className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Chemical Batch Reactor</h1>
              <p className="text-sm text-slate-400">Copilot scaffold for the multi-stage liquid blending demonstrator</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-md border border-industrial-700 bg-industrial-950 px-3 py-2 text-xs uppercase tracking-wide text-slate-300">
            <Cpu className="h-4 w-4 text-cyan-400" />
            Soft PLC Ready
          </div>
        </div>
      </header>

      <main className="grid gap-4 p-6 lg:grid-cols-[2fr_1fr]">
        <Visualizer />
        <ControlPanel />
        <div className="lg:col-span-2">
          <CodeViewer />
        </div>
      </main>
    </div>
  );
}

export default App;
