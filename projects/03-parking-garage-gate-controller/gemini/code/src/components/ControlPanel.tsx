import React from 'react';
import { usePlcStore } from '../store/usePlcStore';

export const ControlPanel: React.FC = () => {
  const { inputs, outputs, setInputs, isAutoMode, toggleAutoMode } = usePlcStore();

  const handleTakeTicket = () => {
    setInputs({ ticketTaken: true, ticketButton: false });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">HMI Operator & Gate Field Controls</h2>
          <p className="text-xs text-slate-400">Simulate vehicle inductive loops, ticket dispenser kiosk, and independent barrier limit switches</p>
        </div>
        <button
          onClick={toggleAutoMode}
          className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-colors ${
            isAutoMode ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
          }`}
        >
          {isAutoMode ? 'PLC AUTO SCAN' : 'MANUAL OVERRIDE'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Entry Inductive Loop */}
        <button
          onClick={() => setInputs({ entryLoop: !inputs.entryLoop })}
          className={`p-3 rounded-md text-left border text-xs font-mono transition-all ${
            inputs.entryLoop
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950'
              : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <div className="font-sans text-xs text-slate-200 font-semibold mb-1">1. Entry Loop</div>
          <div>I_EntryLoop: {inputs.entryLoop ? 'DETECTED' : 'CLEAR'}</div>
        </button>

        {/* 2. Ticket Kiosk Pushbutton */}
        <button
          onClick={() => setInputs({ ticketButton: !inputs.ticketButton })}
          disabled={!inputs.entryLoop}
          className={`p-3 rounded-md text-left border text-xs font-mono transition-all ${
            inputs.ticketButton
              ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-950'
              : inputs.entryLoop
              ? 'bg-slate-800/80 border-cyan-700/60 text-slate-200 hover:bg-slate-800'
              : 'bg-slate-900 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="font-sans text-xs text-slate-200 font-semibold mb-1">2. Press Ticket PB</div>
          <div>I_TicketButton: {inputs.ticketButton ? 'PRESSED' : 'IDLE'}</div>
        </button>

        {/* 3. TAKE TICKET BUTTON */}
        <button
          onClick={handleTakeTicket}
          disabled={!outputs.dispenseTicket && !inputs.ticketButton}
          className={`p-3 rounded-md text-left border text-xs font-mono transition-all ${
            inputs.ticketTaken
              ? 'bg-amber-950/80 border-amber-400 text-amber-300 animate-pulse'
              : outputs.dispenseTicket
              ? 'bg-amber-600 text-slate-950 font-bold border-amber-300 shadow-lg shadow-amber-500/30 hover:bg-amber-500'
              : 'bg-slate-900 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="font-sans text-xs font-bold mb-1">3. TAKE TICKET 🎟️</div>
          <div>{outputs.dispenseTicket ? 'DISPENSED! CLICK!' : inputs.ticketTaken ? 'TAKEN' : 'WAIT TICKET'}</div>
        </button>

        {/* 4. Entry Gate Limit Switches */}
        <div className="p-3 rounded-md border text-xs font-mono bg-slate-800/40 border-slate-700 text-slate-300">
          <div className="font-sans text-xs text-slate-200 font-semibold mb-1">Entry Gate LS</div>
          <div className={inputs.entryGateOpenLS ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
            LS_Open: {inputs.entryGateOpenLS ? 'TRUE' : 'FALSE'}
          </div>
          <div className={inputs.entryGateCloseLS ? 'text-rose-400 font-bold' : 'text-slate-400'}>
            LS_Close: {inputs.entryGateCloseLS ? 'TRUE' : 'FALSE'}
          </div>
        </div>

        {/* 5. Exit Inductive Loop */}
        <button
          onClick={() => setInputs({ exitLoop: !inputs.exitLoop })}
          className={`p-3 rounded-md text-left border text-xs font-mono transition-all ${
            inputs.exitLoop
              ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-md shadow-amber-950'
              : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <div className="font-sans text-xs text-slate-200 font-semibold mb-1">4. Exit Loop</div>
          <div>I_ExitLoop: {inputs.exitLoop ? 'DETECTED' : 'CLEAR'}</div>
        </button>

        {/* 6. Exit Gate Limit Switches */}
        <div className="p-3 rounded-md border text-xs font-mono bg-slate-800/40 border-slate-700 text-slate-300">
          <div className="font-sans text-xs text-slate-200 font-semibold mb-1">Exit Gate LS</div>
          <div className={inputs.exitGateOpenLS ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
            LS_Open: {inputs.exitGateOpenLS ? 'TRUE' : 'FALSE'}
          </div>
          <div className={inputs.exitGateCloseLS ? 'text-rose-400 font-bold' : 'text-slate-400'}>
            LS_Close: {inputs.exitGateCloseLS ? 'TRUE' : 'FALSE'}
          </div>
        </div>

        {/* 7. Safety Photocell Beam */}
        <button
          onClick={() => setInputs({ safetyPhotocell: !inputs.safetyPhotocell })}
          className={`p-3 rounded-md text-left border text-xs font-mono transition-all ${
            inputs.safetyPhotocell
              ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
              : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <div className="font-sans text-xs text-slate-200 font-semibold mb-1">Safety Photocell</div>
          <div>I_Photocell: {inputs.safetyPhotocell ? 'BLOCKED ⚠️' : 'CLEAR'}</div>
        </button>
      </div>
    </div>
  );
};
