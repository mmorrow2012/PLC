import React, { useEffect } from 'react';
import { Visualizer } from './components/Visualizer';
import { ControlPanel } from './components/ControlPanel';
import { CodeViewer } from './components/CodeViewer';
import { startSoftPlcEngine, stopSoftPlcEngine } from './plc/softPlcEngine';
import { Train, ShieldAlert, Cpu } from 'lucide-react';

export const App: React.FC = () => {
  useEffect(() => {
    startSoftPlcEngine();
    return () => stopSoftPlcEngine();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Industrial Navigation Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-950 border border-sky-500/40 text-sky-400">
            <Train className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-wide font-mono">
              UK Intercity Railway Network & Signaling Controller
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-2 font-mono">
              <span>Schneider Electric Modicon M580 Safety PLC</span>
              <span>•</span>
              <span className="text-sky-400">9 Stations Intercity Grid</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span className="text-slate-300">PLC SCAN: 50ms</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400">M580 SIL4 SAFETY OK</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-[1700px] mx-auto w-full flex flex-col gap-6">
        {/* Top Section: Visualizer Map & Live Station Timetable Board */}
        <Visualizer />

        {/* Bottom Section: Controls & PLC Monitor split 50/50 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ControlPanel />
          <CodeViewer />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-3 text-center text-xs font-mono text-slate-500">
        UK Railway Network Controller — Schneider Modicon M580 PLC Demonstrator (Gemini AI)
      </footer>
    </div>
  );
};

export default App;
