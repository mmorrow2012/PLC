import React from 'react';
import { usePlcStore } from '../store/usePlcStore';
import { TrendingUp } from 'lucide-react';

export const TrendChart: React.FC = () => {
  const { history } = usePlcStore();

  if (history.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-2xl h-[220px] flex items-center justify-center text-slate-500 font-mono text-xs">
        Waiting for PLC cycle telemetry history...
      </div>
    );
  }

  const chartWidth = 700;
  const chartHeight = 140;

  const pointsA = history
    .map((pt, i) => {
      const x = (i / (history.length - 1 || 1)) * chartWidth;
      const y = chartHeight - (pt.tankA / 100) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');

  const pointsB = history
    .map((pt, i) => {
      const x = (i / (history.length - 1 || 1)) * chartWidth;
      const y = chartHeight - (pt.tankB / 100) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');

  const pointsC = history
    .map((pt, i) => {
      const x = (i / (history.length - 1 || 1)) * chartWidth;
      const y = chartHeight - (pt.tankC / 100) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');

  const pointsValve = history
    .map((pt, i) => {
      const x = (i / (history.length - 1 || 1)) * chartWidth;
      const y = chartHeight - (pt.valvePos / 100) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl flex flex-col justify-between text-slate-100">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-sm text-slate-200">
            Real-Time Process SCADA Level Trends
          </h3>
        </div>
        <div className="flex items-center space-x-4 text-[11px] font-mono">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full inline-block" />
            <span className="text-slate-300">Tank A</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full inline-block" />
            <span className="text-slate-300">Tank B</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full inline-block" />
            <span className="text-slate-300">Tank C</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 bg-amber-400 rounded-full inline-block" />
            <span className="text-slate-300">Valve BC %</span>
          </span>
        </div>
      </div>

      <div className="bg-slate-950 rounded border border-slate-800 p-2 overflow-hidden">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-[140px] overflow-visible">
          {/* Grid lines */}
          <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="#1e293b" strokeWidth="1" />
          <line x1="0" y1="35" x2={chartWidth} y2="35" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="0" y1="70" x2={chartWidth} y2="70" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="0" y1="105" x2={chartWidth} y2="105" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="0" y1="140" x2={chartWidth} y2="140" stroke="#1e293b" strokeWidth="1" />

          {/* Polyline Curves */}
          <polyline points={pointsA} fill="none" stroke="#22d3ee" strokeWidth="2" />
          <polyline points={pointsB} fill="none" stroke="#818cf8" strokeWidth="2" />
          <polyline points={pointsC} fill="none" stroke="#34d399" strokeWidth="2" />
          <polyline points={pointsValve} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 2" />
        </svg>
      </div>
    </div>
  );
};
