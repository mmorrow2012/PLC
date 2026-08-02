import React from 'react';
import { usePlcStore } from '../store/usePlcStore';

export const Visualizer: React.FC = () => {
  const { tanks, valves, pumps } = usePlcStore();

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col h-full">
      <h2 className="text-lg font-semibold text-slate-200 mb-4 border-b border-slate-700 pb-2">
        Process Visualizer (P&ID)
      </h2>
      <div className="grid grid-cols-3 gap-4 flex-1 min-h-[250px]">
        {Object.entries(tanks).map(([key, tank]) => (
          <div key={key} className="flex flex-col items-center justify-end bg-slate-900 border border-slate-700 rounded p-3 relative">
            <div className="text-xs font-mono text-slate-400 mb-2">Tank {tank.id}</div>
            <div className="w-full bg-slate-800 rounded border border-slate-600 h-44 relative overflow-hidden flex flex-col justify-end">
              <div
                className="bg-sky-500 transition-all duration-300 opacity-80"
                style={{ height: `${tank.level}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white drop-shadow">
                {tank.level.toFixed(1)}%
              </div>
            </div>
            <div className="text-xs text-slate-400 mt-2">
              SP: {tank.targetLevel}%
            </div>
          </div>
        ))}
      </div>
      {/* Step-by-Step Demo Instructions Panel */}
      <div className="mt-4 bg-slate-950/90 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold text-xs font-mono tracking-wider uppercase">📋 Step-by-Step Demo Instructions</span>
          </div>
          <span className="text-[10px] font-mono bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded">Interactive Guide</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-sky-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
            <div>
              <p className="font-semibold text-slate-200">Start SoftPLC Engine</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Click the green <strong className="text-emerald-400">RUN PLC</strong> button in the Operator Control Panel to launch the scan loop.</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-sky-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
            <div>
              <p className="font-semibold text-slate-200">Observe Auto Level Control (AUTO)</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Watch pump <strong className="text-sky-300">P1</strong> fill Tank 1 (70% SP) and valves <strong className="text-sky-300">V1, V2, V3</strong> regulate intermediate cascade fluid levels.</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-sky-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
            <div>
              <p className="font-semibold text-slate-200">Switch to Manual Mode</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Click <strong className="text-amber-400">AUTO / MANUAL</strong> to yield control from automated ST logic to manual buttons.</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-sky-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
            <div>
              <p className="font-semibold text-slate-200">Test Manual Valve & Pump Overrides</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Click valve buttons (<strong className="text-slate-300">V1, V2, V3</strong>) or pump buttons (<strong className="text-slate-300">P1, P2</strong>) to directly control fluid column levels.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
        <div>Pumps: {Object.keys(pumps).length} Configured</div>
        <div>Valves: {Object.keys(valves).length} Configured</div>
      </div>
    </div>
  );
};
