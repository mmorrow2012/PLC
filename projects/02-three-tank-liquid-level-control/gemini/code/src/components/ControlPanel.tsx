import React from 'react';
import { usePlcStore } from '../store/usePlcStore';
import { plcEngine } from '../plc/softPlcEngine';

export const ControlPanel: React.FC = () => {
  const { isRunning, autoMode, setAutoMode, cycleCount, valves, pumps, toggleValve, togglePump } = usePlcStore();

  const handleRunToggle = () => {
    if (isRunning) {
      plcEngine.stop();
    } else {
      plcEngine.start();
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col h-full">
      <h2 className="text-lg font-semibold text-slate-200 mb-4 border-b border-slate-700 pb-2">
        Operator Control Panel
      </h2>
      
      <div className="flex gap-2 mb-6">
        <button
          onClick={handleRunToggle}
          className={`flex-1 py-2 px-4 rounded font-bold transition-colors ${
            isRunning
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {isRunning ? 'STOP PLC' : 'RUN PLC'}
        </button>

        <button
          onClick={() => setAutoMode(!autoMode)}
          className={`px-4 py-2 rounded font-bold transition-colors ${
            autoMode
              ? 'bg-sky-600 hover:bg-sky-500 text-white'
              : 'bg-amber-600 hover:bg-amber-500 text-white'
          }`}
        >
          {autoMode ? 'AUTO' : 'MANUAL'}
        </button>
      </div>

      <div className="space-y-4 flex-1">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-2">Valves Control</h3>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(valves).map(([id, valve]) => (
              <button
                key={id}
                onClick={() => toggleValve(id)}
                disabled={autoMode}
                className={`py-1.5 px-3 rounded text-xs font-mono font-bold transition-colors ${
                  valve.isOpen
                    ? 'bg-emerald-700 text-emerald-100'
                    : 'bg-slate-700 text-slate-400'
                } ${autoMode ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
              >
                {id}: {valve.isOpen ? 'OPEN' : 'CLOSED'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-2">Pumps Control</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(pumps).map(([id, pump]) => (
              <button
                key={id}
                onClick={() => togglePump(id)}
                disabled={autoMode}
                className={`py-1.5 px-3 rounded text-xs font-mono font-bold transition-colors ${
                  pump.isRunning
                    ? 'bg-emerald-700 text-emerald-100'
                    : 'bg-slate-700 text-slate-400'
                } ${autoMode ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
              >
                {id}: {pump.isRunning ? 'ON' : 'OFF'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-700 text-xs font-mono text-slate-400 flex justify-between">
        <span>Scan Cycle: {cycleCount}</span>
        <span>Status: {isRunning ? 'EXECUTING' : 'IDLE'}</span>
      </div>
    </div>
  );
};
