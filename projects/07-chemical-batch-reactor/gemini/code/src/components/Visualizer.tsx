import React from 'react';
import { usePlcStore } from '../store/usePlcStore';
import { Flame, Snowflake, RotateCw, ArrowDown, Droplets, Gauge, Thermometer } from 'lucide-react';

export const Visualizer: React.FC = () => {
  const { inputs, outputs, phase } = usePlcStore();

  const maxCapacity = 1000; // Liters
  const fillHeightPercent = Math.min(100, (inputs.level / maxCapacity) * 100);

  return (
    <div className="bg-industrial-900 border border-industrial-700 rounded-lg p-5 shadow-xl flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 border-b border-industrial-700 pb-2">
        <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
          <Droplets className="text-cyan-400 w-5 h-5" /> Chemical Reactor Vessel Visualizer
        </h2>
        <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-industrial-800 text-cyan-300 border border-cyan-500/30">
          PHASE: {phase}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 items-stretch">
        {/* Main Vessel Visual */}
        <div className="lg:col-span-3 relative bg-industrial-950 border border-industrial-800 rounded-lg p-6 flex items-center justify-center min-h-[380px]">
          {/* Inlet Pipe A */}
          <div className="absolute top-2 left-16 flex flex-col items-center">
            <div className={`w-4 h-12 ${outputs.valveA ? 'bg-cyan-500 animate-pulse' : 'bg-gray-600'}`} />
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${outputs.valveA ? 'bg-emerald-900 text-emerald-300 border border-emerald-500' : 'bg-gray-800 text-gray-400'}`}>
              VALVE A
            </span>
          </div>

          {/* Inlet Pipe B */}
          <div className="absolute top-2 right-16 flex flex-col items-center">
            <div className={`w-4 h-12 ${outputs.valveB ? 'bg-amber-500 animate-pulse' : 'bg-gray-600'}`} />
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${outputs.valveB ? 'bg-emerald-900 text-emerald-300 border border-emerald-500' : 'bg-gray-800 text-gray-400'}`}>
              VALVE B
            </span>
          </div>

          {/* Agitator Motor Top */}
          <div className="absolute top-6 z-10 flex flex-col items-center">
            <div className={`w-12 h-10 rounded-t-md border border-gray-600 flex items-center justify-center ${outputs.agitator ? 'bg-emerald-900/60 border-emerald-500' : 'bg-industrial-800'}`}>
              <RotateCw className={`w-5 h-5 ${outputs.agitator ? 'text-emerald-400 animate-spin' : 'text-gray-500'}`} />
            </div>
            <div className="w-2 h-16 bg-gray-400" />
          </div>

          {/* Tank Outer Shell */}
          <div className="relative w-64 h-72 border-4 border-gray-500 rounded-b-3xl bg-industrial-900/50 overflow-hidden flex flex-col justify-end shadow-inner mt-12">
            {/* Liquid Mass */}
            <div
              className="w-full bg-gradient-to-t from-cyan-600/80 via-blue-500/70 to-indigo-400/60 transition-all duration-300 flex items-center justify-center relative"
              style={{ height: `${fillHeightPercent}%` }}
            >
              {outputs.agitator && fillHeightPercent > 5 && (
                <div className="absolute inset-0 bg-white/10 animate-pulse flex items-center justify-center">
                  <span className="text-[11px] font-mono text-cyan-100 font-semibold">MIXING...</span>
                </div>
              )}
            </div>

            {/* Heating / Cooling Jacket Overlay */}
            <div className={`absolute inset-0 border-r-8 border-l-8 pointer-events-none ${outputs.heater ? 'border-rose-500/60 bg-rose-500/10' : outputs.coolingValve ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-transparent'}`} />
          </div>

          {/* Drain Valve Bottom */}
          <div className="absolute bottom-2 flex flex-col items-center">
            <div className={`w-4 h-10 ${outputs.drainValve ? 'bg-cyan-400 animate-pulse' : 'bg-gray-600'}`} />
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${outputs.drainValve ? 'bg-emerald-900 text-emerald-300 border border-emerald-500' : 'bg-gray-800 text-gray-400'}`}>
              DRAIN VALVE
            </span>
          </div>
        </div>

        {/* Process Indicators Panel */}
        <div className="bg-industrial-950 border border-industrial-800 rounded-lg p-4 flex flex-col justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-300 border-b border-industrial-800 pb-1">Live Process Instrumentation</h3>
          
          {/* Temperature Gauge */}
          <div className="bg-industrial-900 p-3 rounded border border-industrial-800 flex items-center gap-3">
            <Thermometer className={`w-8 h-8 ${inputs.temperature > 70 ? 'text-rose-400' : 'text-cyan-400'}`} />
            <div>
              <div className="text-xs text-gray-400">Reactor Temp</div>
              <div className="text-xl font-mono font-bold text-gray-100">{inputs.temperature.toFixed(1)} °C</div>
            </div>
          </div>

          {/* Level Gauge */}
          <div className="bg-industrial-900 p-3 rounded border border-industrial-800 flex items-center gap-3">
            <Droplets className="w-8 h-8 text-cyan-400" />
            <div>
              <div className="text-xs text-gray-400">Liquid Volume</div>
              <div className="text-xl font-mono font-bold text-gray-100">{inputs.level.toFixed(0)} L</div>
            </div>
          </div>

          {/* Pressure Gauge */}
          <div className="bg-industrial-900 p-3 rounded border border-industrial-800 flex items-center gap-3">
            <Gauge className="w-8 h-8 text-amber-400" />
            <div>
              <div className="text-xs text-gray-400">Vessel Pressure</div>
              <div className="text-xl font-mono font-bold text-gray-100">{inputs.pressure.toFixed(2)} bar</div>
            </div>
          </div>

          {/* Actuator Status Indicators */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-industrial-800">
            <div className={`p-2 rounded border flex items-center gap-1.5 ${outputs.heater ? 'bg-rose-950 border-rose-600 text-rose-300' : 'bg-industrial-900 border-industrial-800 text-gray-500'}`}>
              <Flame className="w-3.5 h-3.5" /> HEATER
            </div>
            <div className={`p-2 rounded border flex items-center gap-1.5 ${outputs.coolingValve ? 'bg-cyan-950 border-cyan-600 text-cyan-300' : 'bg-industrial-900 border-industrial-800 text-gray-500'}`}>
              <Snowflake className="w-3.5 h-3.5" /> COOLING
            </div>
            <div className={`p-2 rounded border flex items-center gap-1.5 ${outputs.agitator ? 'bg-emerald-950 border-emerald-600 text-emerald-300' : 'bg-industrial-900 border-industrial-800 text-gray-500'}`}>
              <RotateCw className="w-3.5 h-3.5" /> AGITATOR
            </div>
            <div className={`p-2 rounded border flex items-center gap-1.5 ${outputs.drainValve ? 'bg-amber-950 border-amber-600 text-amber-300' : 'bg-industrial-900 border-industrial-800 text-gray-500'}`}>
              <ArrowDown className="w-3.5 h-3.5" /> DRAIN
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
