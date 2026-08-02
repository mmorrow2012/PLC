import React from 'react';
import { usePlcStore } from '../store/usePlcStore';

export const Visualizer: React.FC = () => {
  const store = usePlcStore();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-slate-200">
      <h2 className="text-lg font-bold mb-3 text-cyan-400">Process Visualizer (SCADA Diagram)</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Influent Tank */}
        <div className="bg-slate-950 p-3 rounded border border-slate-800 flex flex-col justify-between h-44">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span>01. INFLUENT TANK</span>
            <span className="text-cyan-400">{store.influentFlow} L/s</span>
          </div>
          <div className="relative w-full h-24 bg-slate-900 border border-slate-800 rounded overflow-hidden my-2">
            <div
              className="absolute bottom-0 w-full bg-amber-900/60 transition-all duration-300"
              style={{ height: `${store.influentLevel}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-slate-200">
              Level: {store.influentLevel}%
            </div>
          </div>
        </div>

        {/* Aeration Basin */}
        <div className="bg-slate-950 p-3 rounded border border-slate-800 flex flex-col justify-between h-44">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span>02. AERATION BASIN</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${store.aerationBlowerRunning ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'}`}>
              BLOWER: {store.aerationBlowerRunning ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
          <div className="relative w-full h-24 bg-slate-900 border border-slate-800 rounded overflow-hidden my-2 flex items-center justify-center">
            <div
              className="absolute bottom-0 w-full bg-cyan-900/60 transition-all duration-300"
              style={{ height: `${Math.min(100, (store.aerationDO / 5) * 100)}%` }}
            />
            <div className="z-10 text-center">
              <div className="text-lg font-mono font-bold text-cyan-300">{store.aerationDO} mg/L</div>
              <div className="text-[10px] text-slate-400">Dissolved Oxygen</div>
            </div>
          </div>
        </div>

        {/* Clarifier / Effluent */}
        <div className="bg-slate-950 p-3 rounded border border-slate-800 flex flex-col justify-between h-44">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span>03. SECONDARY CLARIFIER</span>
            <span className="text-emerald-400">{store.effluentFlow} L/s</span>
          </div>
          <div className="relative w-full h-24 bg-slate-900 border border-slate-800 rounded overflow-hidden my-2 flex flex-col justify-around p-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Sludge Level:</span>
              <span className="font-mono text-amber-400">{store.clarifierSludgeLevel}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Effluent Turbidity:</span>
              <span className="font-mono text-emerald-400">{store.effluentTurbidity} NTU</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};