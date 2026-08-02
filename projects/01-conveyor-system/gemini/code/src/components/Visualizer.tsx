import React from 'react';
import { usePlcStore } from '../store/usePlcStore';

export const Visualizer: React.FC = () => {
  const { outputs, inputs } = usePlcStore();

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-800 p-4">
      <div className="mb-3 border-b border-slate-800 pb-2 flex justify-between items-center">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
          Industrial Simulation View
        </h2>
        <span className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${outputs.motorRun ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
          {outputs.motorRun ? 'RUNNING' : 'STOPPED'}
        </span>
      </div>

      <div className="flex-1 border border-slate-800 bg-slate-950/50 rounded flex flex-col justify-center items-center relative overflow-hidden p-6">
        {/* Conveyor Belt Visualization */}
        <div className="w-full max-w-md bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-xl">
          <div className="text-xs text-slate-400 mb-2 font-mono">CONVEYOR BELT #01</div>
          
          <div className="relative h-12 bg-slate-900 rounded border border-slate-700 flex items-center justify-between px-4 overflow-hidden">
            {/* Belt animation lines */}
            <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent ${outputs.motorRun ? 'animate-pulse' : ''}`} />

            <div className="z-10 font-mono text-xs text-slate-300">
              S1 Sensor: <span className={inputs.itemSensor ? 'text-emerald-400 font-bold' : 'text-slate-500'}>{inputs.itemSensor ? 'DETECTED' : 'CLEAR'}</span>
            </div>

            <div className="z-10 font-mono text-xs text-slate-300">
              Motor: <span className={outputs.motorRun ? 'text-emerald-400 font-bold' : 'text-rose-500'}>{outputs.motorRun ? 'ON' : 'OFF'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
