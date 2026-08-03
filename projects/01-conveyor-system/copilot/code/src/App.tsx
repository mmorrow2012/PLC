import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import { Factory, Cpu } from 'lucide-react';
import CodeViewer from './components/CodeViewer';
import ControlPanel from './components/ControlPanel';
import Visualizer from './components/Visualizer';
import { SoftPlcEngine } from './plc/softPlcEngine';
import { usePlcStore } from './store/usePlcStore';

const App: FC = () => {
  const plcEngineRef = useRef<SoftPlcEngine | null>(null);
  const { plcRunning, cycleTimeMs } = usePlcStore();

  useEffect(() => {
    // Initialize PLC engine
    plcEngineRef.current = new SoftPlcEngine(cycleTimeMs);

    return () => {
      plcEngineRef.current?.stop();
    };
  }, [cycleTimeMs]);

  useEffect(() => {
    if (!plcEngineRef.current) return;

    if (plcRunning) {
      plcEngineRef.current.start(
        () => {
          // Scan callback (called on each cycle)
        },
        () => usePlcStore.getState(),
        (updater) => usePlcStore.setState(updater(usePlcStore.getState()))
      );
    } else {
      plcEngineRef.current.stop();
    }
  }, [plcRunning]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Factory className="h-6 w-6 text-amber-400" />
            <div>
              <h1 className="text-xl font-semibold">Automated Conveyor Belt System</h1>
              <p className="text-sm text-slate-400">Schneider M580 PLC Simulation — IEC 61131-3 Structured Text</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className={`h-5 w-5 ${plcRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-600'}`} />
            <span className={`inline-flex items-center gap-2 rounded border px-3 py-1 text-xs font-medium ${
              plcRunning
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-700 bg-slate-800 text-slate-400'
            }`}>
              {plcRunning ? '● PLC Running' : '○ PLC Stopped'}
            </span>
          </div>
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
  );
};

export default App;
