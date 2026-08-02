import React, { useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { Visualizer } from './components/Visualizer';
import { CodeViewer } from './components/CodeViewer';
import { plcEngine } from './plc/softPlcEngine';
import { usePlcStore } from './store/usePlcStore';

export const App: React.FC = () => {
  const scanTimeMs = usePlcStore((state) => state.scanTimeMs);
  const plcMode = usePlcStore((state) => state.plcMode);

  useEffect(() => {
    plcEngine.start();
    return () => plcEngine.stop();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans">
      <header className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-cyan-400 flex items-center space-x-2">
            <span>Wastewater Treatment Plant SCADA & SoftPLC</span>
          </h1>
          <p className="text-xs text-slate-400">Industrial Process Automation & Logic Simulation</p>
        </div>
        <div className="flex space-x-4 text-xs font-mono bg-slate-900 px-3 py-1.5 rounded border border-slate-800">
          <div>
            <span className="text-slate-500">MODE: </span>
            <span className={plcMode === 'RUN' ? 'text-emerald-400' : 'text-amber-400'}>{plcMode}</span>
          </div>
          <div>
            <span className="text-slate-500">CYCLE: </span>
            <span className="text-cyan-400">{scanTimeMs} ms</span>
          </div>
        </div>
      </header>

      <main className="space-y-4 max-w-7xl mx-auto">
        <ControlPanel />
        <Visualizer />
        <CodeViewer />
      </main>
    </div>
  );
};

export default App;