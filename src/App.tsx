import React, { useEffect } from 'react';
import { Visualizer } from './components/Visualizer';
import { ControlPanel } from './components/ControlPanel';
import { CodeViewer } from './components/CodeViewer';
import { TrendChart } from './components/TrendChart';
import { softPlcEngine } from './plc/softPlcEngine';
import { usePlcStore, ProcessState } from './store/usePlcStore';
import { Cpu, Server, Activity, ShieldCheck, AlertOctagon, RotateCcw } from 'lucide-react';

export const App: React.FC = () => {
  const { outputs, inputs, scanTimeMs, scanCounter, eStopLatched, resetSimulation } = usePlcStore();

  useEffect(() => {
    softPlcEngine.start();
    return () => softPlcEngine.stop();
  }, []);

  const isFault = outputs.Alarm_Overflow || !inputs.E_Stop || eStopLatched;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 space-y-4">
      {/* Top SCADA Header Bar */}
      <header className="bg-slate-900 border border-slate-800 rounded-xl px-6 py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="bg-indigo-600/20 p-2.5 rounded-lg border border-indigo-500/30">
            <Server className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-extrabold text-lg tracking-wider text-slate-100">
                Schneider Modicon M580
              </h1>
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                RUN MODE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              EcoStruxure Control Expert | 3-Tank Liquid Level Cascade System
            </p>
          </div>
        </div>

        {/* Controller Diagnostics */}
        <div className="flex items-center space-x-6 font-mono text-xs">
          <div className="flex items-center space-x-2 border-r border-slate-800 pr-6">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-slate-400 block text-[10px]">SCAN TIME</span>
              <span className="text-slate-200 font-bold">{scanTimeMs.toFixed(1)} ms</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 border-r border-slate-800 pr-6">
            <Activity className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-slate-400 block text-[10px]">SCAN CYCLES</span>
              <span className="text-slate-200 font-bold">{scanCounter}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isFault ? (
              <AlertOctagon className="w-5 h-5 text-red-500 animate-bounce" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            )}
            <div>
              <span className="text-slate-400 block text-[10px]">SYSTEM HEALTH</span>
              <span className={isFault ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                {isFault ? 'SAFETY FAULT' : 'HEALTHY'}
              </span>
            </div>
          </div>

          <button
            onClick={resetSimulation}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg border border-slate-700 transition-all ml-2"
            title="Reset Entire Simulation Environment"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Primary Workspace Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left / Center Column: Visualizer & SCADA Level Trend */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <Visualizer />
          <TrendChart />
        </div>

        {/* Right Column: HMI Control Desk & ST Code Viewer */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          <ControlPanel />
          <CodeViewer />
        </div>
      </div>
    </div>
  );
};
export default App;
