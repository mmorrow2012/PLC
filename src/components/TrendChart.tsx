import React from 'react';
import { usePLC } from '../context/PLCContext';
import { TrendingUp } from 'lucide-react';

export const TrendChart: React.FC = () => {
  const { telemetry } = usePLC();

  if (telemetry.length === 0) return null;

  const maxPoints = 30;
  const data = telemetry.slice(-maxPoints);
  const width = 600;
  const height = 140;
  const padding = 25;

  // Scales
  const minL = 0;
  const maxL = 2000;
  const minT = 10;
  const maxT = 100;
  const minPH = 0;
  const maxPH = 14;

  const getX = (i: number) => padding + (i / (maxPoints - 1)) * (width - 2 * padding);
  const getY = (val: number, min: number, max: number) =>
    height - padding - ((val - min) / (max - min)) * (height - 2 * padding);

  const levelPoints = data.map((d, i) => `${getX(i)},${getY(d.reactorLevel, minL, maxL)}`).join(' ');
  const tempPoints = data.map((d, i) => `${getX(i)},${getY(d.reactorTemp, minT, maxT)}`).join(' ');
  const phPoints = data.map((d, i) => `${getX(i)},${getY(d.reactorpH, minPH, maxPH)}`).join(' ');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl font-mono">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h2 className="font-bold text-slate-100 text-sm uppercase tracking-wide">
            Real-Time SCADA Telemetry & Trend Recorder
          </h2>
        </div>
        <div className="flex items-center space-x-4 text-xs font-bold">
          <span className="flex items-center space-x-1 text-cyan-400">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
            <span>Level (0-2000L)</span>
          </span>
          <span className="flex items-center space-x-1 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span>Temp (10-100°C)</span>
          </span>
          <span className="flex items-center space-x-1 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            <span>pH (0-14)</span>
          </span>
        </div>
      </div>

      <div className="bg-slate-950 rounded-lg p-2 border border-slate-800 overflow-x-auto">
        <svg className="w-full h-36" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {/* Horizontal Gridlines */}
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={padding}
              y1={padding + ratio * (height - 2 * padding)}
              x2={width - padding}
              y2={padding + ratio * (height - 2 * padding)}
              stroke="#1e293b"
              strokeDasharray="4 4"
            />
          ))}

          {/* Level Curve */}
          <polyline points={levelPoints} fill="none" stroke="#22d3ee" strokeWidth="2" />

          {/* Temperature Curve */}
          <polyline points={tempPoints} fill="none" stroke="#f59e0b" strokeWidth="2" />

          {/* pH Curve */}
          <polyline points={phPoints} fill="none" stroke="#10b981" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
};
