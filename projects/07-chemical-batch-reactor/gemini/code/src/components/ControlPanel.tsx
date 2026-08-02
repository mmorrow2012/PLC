import React from 'react';
import { usePlcStore } from '../store/usePlcStore';
import { Play, Square, AlertOctagon, RotateCcw, Power } from 'lucide-react';

export const ControlPanel: React.FC = () => {
  const {
    plcRunning,
    inputs,
    togglePlc,
    pressStart,
    pressStop,
    setEstop,
    resetSimulation,
    cycleCount,
    scanTimeMs
  } = usePlcStore();

  return (
    <div className="bg-industrial-900 border border-industrial-700 rounded-lg p-5 shadow-xl flex flex-col gap-4 h-full">
      <div className="flex justify-between items-center border-b border-industrial-700 pb-2">
        <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
          <Power className="text-amber-400 w-5 h-5" /> HMI Main Control Panel
        </h2>
        <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
          <span>Scan: {scanTimeMs}ms</span>
          <span>Cycles: {cycleCount}</span>
        </div>
      </div>

      {/* Main Operating Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={pressStart}
          disabled={inputs.estop}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded font-bold text-sm bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 text-white shadow-lg transition-all"
        >
          <Play className="w-4 h-4 fill-current" /> START BATCH
        </button>

        <button
          onClick={pressStop}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded font-bold text-sm bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-lg transition-all"
        >
          <Square className="w-4 h-4 fill-current" /> HOLD / PAUSE
        </button>
      </div>

      {/* Emergency Stop Circuit Switch */}
      <div className="bg-industrial-950 p-4 rounded-lg border border-rose-900/50 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4" /> HARDWARE E-STOP
          </div>
          <div className="text-xs text-gray-400">Interrupts all actuators and switches to emergency cooling</div>
        </div>
        <button
          onClick={() => setEstop(!inputs.estop)}
          className={`px-4 py-2 rounded font-mono font-bold text-xs uppercase shadow transition-all ${inputs.estop ? 'bg-rose-600 text-white animate-pulse' : 'bg-industrial-800 text-gray-300 border border-industrial-700 hover:bg-industrial-700'}`}
        >
          {inputs.estop ? 'ESTOP ACTIVE' : 'ESTOP SAFE'}
        </button>
      </div>

      {/* Soft PLC Run / Stop Engine Controls */}
      <div className="grid grid-cols-2 gap-3 mt-auto pt-2 border-t border-industrial-800">
        <button
          onClick={togglePlc}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded font-mono text-xs font-semibold border ${plcRunning ? 'bg-industrial-800 border-emerald-500/50 text-emerald-400' : 'bg-industrial-800 border-amber-500/50 text-amber-400'}`}
        >
          <Power className="w-3.5 h-3.5" /> PLC RUN: {plcRunning ? 'ENABLED' : 'PAUSED'}
        </button>

        <button
          onClick={resetSimulation}
          className="flex items-center justify-center gap-2 py-2 px-3 rounded font-mono text-xs font-semibold bg-industrial-800 border border-industrial-700 hover:bg-industrial-700 text-gray-300 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" /> RESET SYSTEM
        </button>
      </div>
    </div>
  );
};
