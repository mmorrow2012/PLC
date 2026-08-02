import React from 'react';
import { PlcState, BatchState } from '../types/plc';
import { Activity, ShieldAlert, Cpu, CheckCircle2, AlertOctagon } from 'lucide-react';

interface HeaderProps {
  plcState: PlcState;
  activeTab: 'scada' | 'logic' | 'hmi';
  setActiveTab: (tab: 'scada' | 'logic' | 'hmi') => void;
}

export const Header: React.FC<HeaderProps> = ({ plcState, activeTab, setActiveTab }) => {
  const getStateBadge = () => {
    switch (plcState.memory.M_BatchState) {
      case BatchState.IDLE:
        return <span className="bg-slate-700 text-slate-200 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border border-slate-600">STATE 0: IDLE</span>;
      case BatchState.DOSING_A:
        return <span className="bg-cyan-900/80 text-cyan-300 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border border-cyan-500 animate-pulse">STATE 1: DOSING A</span>;
      case BatchState.DOSING_B:
        return <span className="bg-purple-900/80 text-purple-300 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border border-purple-500 animate-pulse">STATE 2: DOSING B</span>;
      case BatchState.HEATING_MIXING:
        return <span className="bg-amber-900/80 text-amber-300 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border border-amber-500 animate-pulse">STATE 3: HEATING & MIXING</span>;
      case BatchState.PH_BALANCING:
        return <span className="bg-emerald-900/80 text-emerald-300 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border border-emerald-500 animate-pulse">STATE 4: pH BALANCING</span>;
      case BatchState.DRAINING:
        return <span className="bg-blue-900/80 text-blue-300 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border border-blue-500 animate-pulse">STATE 5: DRAINING</span>;
      case BatchState.FAULT:
        return <span className="bg-rose-900 text-rose-200 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border border-rose-500 animate-ping">STATE 99: FAULT TRIP</span>;
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-6 py-3 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-emerald-500 to-cyan-600 p-2.5 rounded-lg shadow-lg shadow-cyan-500/20">
          <Cpu className="w-6 h-6 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg tracking-tight text-slate-100">MODICON M580 SOFT-PLC</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700">Schneider EcoStruxure</span>
          </div>
          <p className="text-xs text-slate-400">4-Vessel Chemical Batching & Neutralization Engine</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {getStateBadge()}

        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-md border border-slate-800 font-mono text-xs">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          <span className="text-slate-400">SCAN:</span>
          <span className="text-emerald-400 font-bold">{plcState.scanTimeMs}ms</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">CYCLES:</span>
          <span className="text-slate-200">{plcState.scanCount}</span>
        </div>

        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border font-mono text-xs font-bold ${plcState.inputs.I_EStop_NC ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' : 'bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse'}`}>
          {plcState.inputs.I_EStop_NC ? (
            <><CheckCircle2 className="w-4 h-4 text-emerald-400" /> ESTOP: OK (24V)</>
          ) : (
            <><AlertOctagon className="w-4 h-4 text-rose-400" /> ESTOP: OPEN</>
          )}
        </div>
      </div>

      <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => setActiveTab('scada')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${activeTab === 'scada' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
        >
          SCADA Visualizer
        </button>
        <button
          onClick={() => setActiveTab('logic')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${activeTab === 'logic' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
        >
          PLC Ladder & FBD
        </button>
        <button
          onClick={() => setActiveTab('hmi')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${activeTab === 'hmi' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
        >
          HMI Controls & Recipe
        </button>
      </nav>
    </header>
  );
};
