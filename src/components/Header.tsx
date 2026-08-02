import React from 'react';
import { usePLC } from '../context/PLCContext';
import { BatchState } from '../types/plc';
import { Play, Pause, AlertTriangle, ShieldCheck, Activity, Cpu } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    memory,
    inputs,
    outputs,
    scanTimeMs,
    simSpeed,
    setSimSpeed,
    isPaused,
    togglePause,
    faultReason
  } = usePLC();

  const getStateBadge = (state: BatchState) => {
    switch (state) {
      case BatchState.IDLE:
        return <span className="px-3 py-1 bg-slate-700 text-slate-200 text-xs font-bold rounded-full border border-slate-500 uppercase tracking-wider">0: IDLE</span>;
      case BatchState.DOSING_A:
        return <span className="px-3 py-1 bg-blue-600/30 text-blue-400 text-xs font-bold rounded-full border border-blue-500 animate-pulse uppercase tracking-wider">1: DOSING TANK A</span>;
      case BatchState.DOSING_B:
        return <span className="px-3 py-1 bg-indigo-600/30 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500 animate-pulse uppercase tracking-wider">2: DOSING TANK B</span>;
      case BatchState.HEATING_MIXING:
        return <span className="px-3 py-1 bg-amber-600/30 text-amber-400 text-xs font-bold rounded-full border border-amber-500 animate-pulse uppercase tracking-wider">3: HEATING & MIXING</span>;
      case BatchState.PH_BALANCING:
        return <span className="px-3 py-1 bg-emerald-600/30 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500 animate-pulse uppercase tracking-wider">4: pH BALANCING</span>;
      case BatchState.DRAINING:
        return <span className="px-3 py-1 bg-cyan-600/30 text-cyan-400 text-xs font-bold rounded-full border border-cyan-500 animate-pulse uppercase tracking-wider">5: PRODUCT DRAINING</span>;
      case BatchState.FAULT:
        return <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full border border-red-400 animate-bounce uppercase tracking-wider">99: FAULT / TRIP</span>;
      default:
        return null;
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-4 py-3 flex flex-wrap items-center justify-between shadow-xl gap-4">
      {/* Title & Controller Specs */}
      <div className="flex items-center space-x-3">
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2.5 rounded-lg shadow-lg text-slate-950 font-black flex items-center justify-center">
          <Cpu className="w-6 h-6 text-slate-950" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-mono font-bold text-lg text-slate-100 tracking-tight">
              MODICON M580 / S7-1500 SOFT-PLC
            </h1>
            <span className="text-[10px] bg-slate-800 text-cyan-400 font-mono px-2 py-0.5 rounded border border-cyan-900">
              EcoStruxure Expert
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <span>Multi-Stage Chemical Batch Reactor & Liquid Blender</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">IEC 61131-3 Scan Loop</span>
          </p>
        </div>
      </div>

      {/* Controller Dynamic Status */}
      <div className="flex items-center space-x-4 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <div className="text-xs font-mono">
            <span className="text-slate-400">SCAN TIME: </span>
            <span className="text-emerald-400 font-bold">{scanTimeMs} ms</span>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        <div className="flex items-center space-x-2">
          {inputs.I_EStop_NC && inputs.I_AgitatorHealth && !outputs.Q_AlarmBeacon ? (
            <span className="flex items-center text-xs font-mono text-emerald-400 gap-1">
              <ShieldCheck className="w-4 h-4" /> SAFETY OK
            </span>
          ) : (
            <span className="flex items-center text-xs font-mono text-red-400 gap-1 font-bold animate-pulse">
              <AlertTriangle className="w-4 h-4" /> HARDWARE INTERLOCK TRIP
            </span>
          )}
        </div>

        <div className="h-4 w-px bg-slate-800" />

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-slate-400">STATE:</span>
          {getStateBadge(memory.M_BatchState)}
        </div>
      </div>

      {/* Control Simulation Speed & Pause */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 text-xs font-mono">
          <span className="text-slate-400 px-2">SIM SPEED:</span>
          {[1, 2, 5].map((spd) => (
            <button
              key={spd}
              onClick={() => setSimSpeed(spd)}
              className={`px-2 py-0.5 rounded transition-colors ${ 
                simSpeed === spd 
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow' 
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        <button
          onClick={togglePause}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${ 
            isPaused 
              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' 
              : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
          }`}
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          <span>{isPaused ? 'RESUME' : 'PAUSE SCAN'}</span>
        </button>
      </div>
    </header>
  );
};
