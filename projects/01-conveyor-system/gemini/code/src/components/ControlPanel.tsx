import React from 'react';
import { usePlcStore } from '../store/usePlcStore';

export const ControlPanel: React.FC = () => {
  const { isRunning, setRunning } = usePlcStore();

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
        HMI &amp; Operational Controls
      </h2>
      <div className="flex gap-3">
        <button
          onClick={() => setRunning(true)}
          disabled={isRunning}
          className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded font-medium text-sm transition-colors shadow"
        >
          START PLC
        </button>
        <button
          onClick={() => setRunning(false)}
          disabled={!isRunning}
          className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded font-medium text-sm transition-colors shadow"
        >
          STOP PLC
        </button>
      </div>
      <div className="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono flex justify-between items-center">
        <span className="text-slate-400">Engine Status:</span>
        <span className={isRunning ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
          {isRunning ? 'RUNNING' : 'STOPPED'}
        </span>
      </div>
    </div>
  );
};

export default ControlPanel;
