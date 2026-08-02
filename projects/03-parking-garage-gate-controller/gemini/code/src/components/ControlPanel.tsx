import React from 'react';
import { usePlcStore } from '../store/usePlcStore';

export const ControlPanel: React.FC = () => {
  const { inputs, setInputs, isAutoMode, toggleAutoMode } = usePlcStore();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <h2 className="text-lg font-semibold text-slate-100">HMI & Manual Control Panel</h2>
        <button
          onClick={toggleAutoMode}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            isAutoMode ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
          }`}
        >
          {isAutoMode ? 'PLC AUTO SCAN' : 'MANUAL OVERRIDE'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setInputs({ entryLoop: !inputs.entryLoop })}
          className={`p-3 rounded-md text-left border text-xs font-mono transition-all ${
            inputs.entryLoop
              ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
              : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <div className="font-sans text-xs text-slate-300 font-semibold mb-1">Entry Loop</div>
          <div>I_EntryLoop: {inputs.entryLoop ? 'TRUE' : 'FALSE'}</div>
        </button>

        <button
          onClick={() => setInputs({ ticketButton: !inputs.ticketButton })}
          className={`p-3 rounded-md text-left border text-xs font-mono transition-all ${
            inputs.ticketButton
              ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
              : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <div className="font-sans text-xs text-slate-300 font-semibold mb-1">Ticket Request</div>
          <div>I_TicketButton: {inputs.ticketButton ? 'TRUE' : 'FALSE'}</div>
        </button>

        <button
          onClick={() => setInputs({ safetyPhotocell: !inputs.safetyPhotocell })}
          className={`p-3 rounded-md text-left border text-xs font-mono transition-all ${
            inputs.safetyPhotocell
              ? 'bg-rose-950/60 border-rose-500 text-rose-300'
              : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <div className="font-sans text-xs text-slate-300 font-semibold mb-1">Safety Photocell</div>
          <div>I_SafetyPhotocell: {inputs.safetyPhotocell ? 'BLOCKED' : 'CLEAR'}</div>
        </button>

        <button
          onClick={() => setInputs({ exitLoop: !inputs.exitLoop })}
          className={`p-3 rounded-md text-left border text-xs font-mono transition-all ${
            inputs.exitLoop
              ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
              : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <div className="font-sans text-xs text-slate-300 font-semibold mb-1">Exit Loop</div>
          <div>I_ExitLoop: {inputs.exitLoop ? 'TRUE' : 'FALSE'}</div>
        </button>
      </div>
    </div>
  );
};
