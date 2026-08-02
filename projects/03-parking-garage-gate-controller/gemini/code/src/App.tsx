import React, { useEffect } from 'react';
import { Visualizer } from './components/Visualizer';
import { CodeViewer } from './components/CodeViewer';
import { ControlPanel } from './components/ControlPanel';
import { plcEngine } from './plc/softPlcEngine';

export const App: React.FC = () => {
  useEffect(() => {
    plcEngine.start();
    return () => {
      plcEngine.stop();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-6 space-y-4">
      <header className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-lg">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            Parking Garage Gate Controller PLC
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            IEC 61131-3 SoftPLC Demonstrator & Real-Time HMI Simulator
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono text-slate-400">SCAN TIME: ~10ms</div>
            <div className="text-xs font-mono text-emerald-400">STATUS: RUNNING</div>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Visualizer />
        <CodeViewer />
      </main>

      <footer>
        <ControlPanel />
      </footer>
    </div>
  );
};

export default App;
