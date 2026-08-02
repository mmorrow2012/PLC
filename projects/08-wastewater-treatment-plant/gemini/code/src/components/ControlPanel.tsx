import React from 'react';
import { usePlcStore } from '../store/usePlcStore';

export const ControlPanel: React.FC = () => {
  const { plcMode, setPlcMode, aerationBlowerRunning, toggleBlower, resetAlarms, alarmActive } = usePlcStore();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-slate-200">
      <h2 className="text-lg font-bold mb-3 text-cyan-400 flex items-center justify-between">
        <span>Control Panel & Override</span>
        <span className={`text-xs px-2 py-0.5 rounded ${alarmActive ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}`}>
          {alarmActive ? 'ALARM ACTIVE' : 'SYSTEM NORMAL'}
        </span>
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 block mb-1">PLC Mode</label>
          <div className="flex space-x-1">
            {(['RUN', 'PAUSE', 'STOP'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setPlcMode(mode)}
                className={`flex-1 py-1 text-xs font-semibold rounded ${
                  plcMode === mode
                    ? mode === 'RUN' ? 'bg-emerald-600 text-white' : mode === 'PAUSE' ? 'bg-amber-600 text-white' : 'bg-red-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Manual Controls</label>
          <div className="flex space-x-2">
            <button
              onClick={toggleBlower}
              className={`flex-1 py-1 text-xs font-semibold rounded border ${
                aerationBlowerRunning
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-600'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              Blower {aerationBlowerRunning ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={resetAlarms}
              className="py-1 px-3 text-xs font-semibold bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-slate-300"
            >
              Reset Alarms
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};