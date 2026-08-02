import React from 'react';
import { PLCSystemState } from '../types/plc';
import { Activity, ShieldAlert, Cpu, CheckCircle2, AlertTriangle, Play, Square } from 'lucide-react';

interface HeaderProps {
  plcState: PLCSystemState;
  onToggleScan: () => void;
}

export const Header: React.FC<HeaderProps> = ({ plcState, onToggleScan }) => {
  const getStateBadge = () => {
    switch (plcState.memory.M_PlantState) {
      case 0:
        return <span className="bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5"><Square className="w-3 h-3 text-slate-400" /> PLANT STOPPED (0)</span>;
      case 1:
        return <span className="bg-amber-950/80 text-amber-300 border border-amber-700/50 px-3 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> EQUALIZATION (1)</span>;
      case 2:
        return <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 px-3 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-cyan-400 animate-spin" /> AERATION ACTIVE (2)</span>;
      case 3:
        return <span className="bg-blue-950/80 text-blue-300 border border-blue-700/50 px-3 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-blue-400" /> CLARIFYING (3)</span>;
      case 4:
        return <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 px-3 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-bounce" /> DISCHARGING (4)</span>;
      case 99:
        return <span className="bg-rose-950/80 text-rose-300 border border-rose-700/50 px-3 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 animate-pulse"><AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> SAFETY TRIP / ALARM (99)</span>;
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex flex-wrap justify-between items-center gap-4 shadow-lg sticky top-0 z-50">
      <div className="flex items-center gap-3.5">
        <div className="p-2.5 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-xl shadow-md border border-cyan-400/30 text-white">
          <Cpu className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">WWTP Process SCADA & Soft-PLC</h1>
            <span className="bg-slate-800 border border-slate-700 text-cyan-400 font-mono text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
              Schneider Modicon M580
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-3 mt-0.5 font-mono">
            <span>Scan Loop: {plcState.scanTimeMs}ms</span>
            <span>•</span>
            <span>Cycle Count: #{plcState.scanCount.toLocaleString()}</span>
            <span>•</span>
            <span className="text-cyan-400">%MW0 state = {plcState.memory.M_PlantState}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3.5">
        {getStateBadge()}

        <button
          onClick={onToggleScan}
          className={`px-4 py-2 rounded-lg font-medium text-xs font-mono transition-all flex items-center gap-2 shadow-sm shadow-slate-950/50 ${ 
            plcState.isRunning
              ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold border border-amber-400'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold border border-emerald-400'
          }`}
        >
          {plcState.isRunning ? (
            <><Square className="w-3.5 h-3.5 fill-current" /> PAUSE PLC SCAN</>
          ) : (
            <><Play className="w-3.5 h-3.5 fill-current" /> START PLC SCAN</>
          )}
        </button>
      </div>
    </header>
  );
};