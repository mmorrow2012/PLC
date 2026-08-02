import React, { useEffect } from 'react';
import { Visualizer } from './components/Visualizer';
import { ControlPanel } from './components/ControlPanel';
import { CodeViewer } from './components/CodeViewer';
import { plcEngine } from './plc/softPlcEngine';
import { usePlcStore } from './store/usePlcStore';

export const App: React.FC = () => {
  const isRunning = usePlcStore((state) => state.isRunning);

  useEffect(() => {
    if (isRunning) {
      plcEngine.start();
    } else {
      plcEngine.stop();
    }
    return () => plcEngine.stop();
  }, [isRunning]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-3 flex justify-between items-center backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]" />
          <h1 className="text-base font-semibold tracking-wide text-slate-100 font-mono">
            Industrial Conveyor System — SoftPLC
          </h1>
        </div>
        <div className="text-xs font-mono text-slate-400">
          IEC 61131-3 Simulation | Gemini Edition
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-57px)]">
        {/* Left Column: Editor */}
        <div className="h-full">
          <CodeViewer />
        </div>

        {/* Right Column: Visualizer & Control Panel */}
        <div className="flex flex-col gap-4 h-full">
          <div className="flex-1">
            <Visualizer />
          </div>
          <div className="flex-1">
            <ControlPanel />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
