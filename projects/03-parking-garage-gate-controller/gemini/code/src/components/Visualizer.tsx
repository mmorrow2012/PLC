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

      {/* Step-by-Step Demo Instructions Panel */}
      <div className="mt-4 bg-slate-950/90 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold text-xs font-mono tracking-wider uppercase">📋 Step-by-Step Demo Instructions</span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">Interactive Guide</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-emerald-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
            <div>
              <p className="font-semibold text-slate-200">Simulate Vehicle Entry Arrival</p>
              <p className="text-slate-400 text-[11px] mt-0.5">In the Control Panel, click <strong className="text-emerald-400">VEHICLE ON ENTRY LOOP</strong> to detect a car at the entry gate.</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-emerald-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
            <div>
              <p className="font-semibold text-slate-200">Dispense & Take Ticket</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Click <strong className="text-cyan-300">PRESS TICKET BUTTON</strong> to dispense a ticket, then click <strong className="text-cyan-300">TAKE TICKET</strong> to actuate gate opening.</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-emerald-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
            <div>
              <p className="font-semibold text-slate-200">Observe Gate & Signal Lights</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Watch <strong className="text-emerald-400">Motor Open</strong> actuate, gate status change to OPEN, and traffic light switch to <strong className="text-emerald-400">GREEN</strong>.</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-emerald-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
            <div>
              <p className="font-semibold text-slate-200">Test Safety Photocell Anti-Crush</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Click <strong className="text-rose-400">TRIP SAFETY PHOTOCELL</strong> while gate is closing to verify obstacle safety reversing logic.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
