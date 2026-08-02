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
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
        <div>Pumps: {Object.keys(pumps).length} Configured</div>
        <div>Valves: {Object.keys(valves).length} Configured</div>
      </div>
    </div>
  );
};
