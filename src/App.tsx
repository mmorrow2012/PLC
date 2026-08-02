import React, { useEffect } from 'react';
import { Visualizer } from './components/Visualizer';
import { ControlPanel } from './components/ControlPanel';
import { CodeViewer } from './components/CodeViewer';
import { startSoftPlc, stopSoftPlc } from './plc/softPlcEngine';
import { usePlcStore } from './store/usePlcStore';
import { Cpu, Play, Pause, Activity } from 'lucide-react';

export const App: React.FC = () => {
  const { plcRunning, setPlcRunning, scanCount } = usePlcStore();

  useEffect(() => {
    startSoftPlc();
    return () => {
      stopSoftPlc();
    };
  }, []);

  const togglePlcExecution = () => {
    setPlcRunning(!plcRunning);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Application Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Schneider Modicon M580 Gate Controller
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  IEC 61131-3 ST
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                EcoStruxure Control Expert Soft-PLC Runtime & Digital Twin Simulation
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 font-mono text-xs">
            <button
              onClick={togglePlcExecution}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2 transition shadow-sm ${
                plcRunning
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
              }`}
            >
              {plcRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  PLC RUNNING
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  PLC PAUSED
                </>
              )}
            </button>

            <div className="hidden sm:flex items-center space-x-3 text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="flex items-center gap-1 text-slate-300">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                Scan: 50ms
              </span>
              <span>|</span>
              <span>Scans: {scanCount}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <Visualizer />
            <ControlPanel />
          </div>

          <div className="lg:col-span-5 space-y-6">
            <CodeViewer />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-3 text-center text-xs text-slate-500 font-mono">
        Modicon M580 Parking Garage Gate Controller — IEC 61131-3 Implementation — 2026-08-02
      </footer>
    </div>
  );
};

export default App;
