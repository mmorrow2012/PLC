import React, { useEffect } from 'react';
import { Visualizer } from './components/Visualizer';
import { ControlPanel } from './components/ControlPanel';
import { CodeViewer } from './components/CodeViewer';
import { plcEngine } from './plc/softPlcEngine';

export const App: React.FC = () => {
  useEffect(() => {
    return () => {
      plcEngine.stop();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-xl font-bold tracking-tight">
            Three-Tank Liquid Level PLC Control
          </h1>
        </div>
        <span className="text-xs font-mono bg-slate-700 px-2.5 py-1 rounded text-slate-300">
          SoftPLC v1.0
        </span>
      </header>

      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Visualizer />
          <CodeViewer />
        </div>
        <div className="lg:col-span-5">
          <ControlPanel />
        </div>
      </main>
    </div>
  );
};

export default App;
