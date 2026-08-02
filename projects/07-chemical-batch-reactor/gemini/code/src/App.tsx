import React, { useEffect } from 'react';
import { Visualizer } from './components/Visualizer';
import { ControlPanel } from './components/ControlPanel';
import { CodeViewer } from './components/CodeViewer';
import { softPlcEngine } from './plc/softPlcEngine';
import { Activity, Cpu, Terminal } from 'lucide-react';

export const App: React.FC = () => {
  useEffect(() => {
    softPlcEngine.start(50); // Start 50ms scan loop
    return () => softPlcEngine.stop();
  }, []);

  return (
    <div className="min-h-screen bg-industrial-950 text-gray-100 flex flex-col font-sans">
      {/* Industrial Header */}
      <header className="bg-industrial-900 border-b border-industrial-800 px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950 border border-cyan-500/40 rounded-lg text-cyan-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide text-gray-100">Chemical Batch Reactor</h1>
            <p className="text-xs font-mono text-cyan-400/80">IEC 61131-3 Soft PLC Automation Demonstrator</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 bg-industrial-950 px-3 py-1.5 rounded border border-industrial-800">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-gray-300">SYSTEM: <strong className="text-emerald-400">ONLINE</strong></span>
          </div>
          <div className="flex items-center gap-2 bg-industrial-950 px-3 py-1.5 rounded border border-industrial-800">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-gray-300">TARGET: <strong className="text-cyan-400">VIRTUAL PLC</strong></span>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1800px] w-full mx-auto">
        {/* Visualizer (Spans 2 cols) */}
        <div className="lg:col-span-2">
          <Visualizer />
        </div>

        {/* Control Panel (1 col) */}
        <div className="lg:col-span-1">
          <ControlPanel />
        </div>

        {/* Code Viewer (Spans Full Width at Bottom) */}
        <div className="lg:col-span-3 min-h-[400px]">
          <CodeViewer />
        </div>
      </main>

      {/* Industrial Footer Status Bar */}
      <footer className="bg-industrial-900 border-t border-industrial-800 px-6 py-2 text-xs font-mono text-gray-400 flex justify-between items-center">
        <span>PLC Scan Cycle: 50ms | Dynamic Soft Simulation</span>
        <span>Industrial PLC Portfolio Demonstrator — 2026</span>
      </footer>
    </div>
  );
};

export default App;
