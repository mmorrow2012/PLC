import React from 'react';
import { usePlcStore } from '../store/usePlcStore';

export const Visualizer: React.FC = () => {
  const { inputs, outputs, availableSpots, totalCapacity } = usePlcStore();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <h2 className="text-lg font-semibold text-slate-100">Garage Gate Simulation</h2>
        <div className="text-xs font-mono bg-slate-800 text-emerald-400 px-3 py-1 rounded border border-slate-700">
          SPOTS: {availableSpots} / {totalCapacity}
        </div>
      </div>
      
      <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 relative min-h-[300px] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-3 bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
            <span className={`w-3 h-3 rounded-full ${outputs.greenLight ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-slate-700'}`}></span>
            <span className="text-xs font-semibold text-slate-300">GREEN</span>
            <span className={`w-3 h-3 rounded-full ${outputs.redLight ? 'bg-rose-500 shadow-lg shadow-rose-500/50' : 'bg-slate-700'}`}></span>
            <span className="text-xs font-semibold text-slate-300">RED</span>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded text-slate-400 text-sm">
            <p>Gate Status: <span className="font-semibold text-white">{inputs.gateOpenLS ? 'OPEN' : inputs.gateCloseLS ? 'CLOSED' : 'MOVING'}</span></p>
            <p className="mt-1">Motor Open: <span className={outputs.gateMotorOpen ? 'text-emerald-400' : 'text-slate-500'}>{outputs.gateMotorOpen ? 'ACTIVE' : 'OFF'}</span></p>
            <p>Motor Close: <span className={outputs.gateMotorClose ? 'text-amber-400' : 'text-slate-500'}>{outputs.gateMotorClose ? 'ACTIVE' : 'OFF'}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};
