import React, { useState } from 'react';
import { usePlcStore } from '../store/usePlcStore';
import { Flame, Snowflake, RotateCw, ArrowDown, Droplets, Gauge, Thermometer, Info, ChevronRight } from 'lucide-react';

export const Visualizer: React.FC = () => {
  const { inputs, outputs, phase } = usePlcStore();
  const [activeStep, setActiveStep] = useState<number>(1);

  const maxCapacity = 1000; // Liters
  const fillHeightPercent = Math.min(100, (inputs.level / maxCapacity) * 100);

  const demoSteps = [
    {
      num: 1,
      title: 'Raw Chemical Dosing (A & B)',
      desc: 'Charge Vessel with Chemical A (Valve A / %Q0.0) up to 400L, then Chemical B (Valve B / %Q0.1) up to 700L.',
    },
    {
      num: 2,
      title: 'Heated Reaction & Agitation',
      desc: 'Engage High-Shear Agitator Mixer (%Q0.2) and Heating Jacket (%Q0.3) to heat chemical blend to 85.0°C.',
    },
    {
      num: 3,
      title: 'Thermal Stabilization & Cooling',
      desc: 'Regulate reaction temperature using Cooling Valve (%Q0.5) to stabilize the chemical batch.',
    },
    {
      num: 4,
      title: 'Product Batch Discharge',
      desc: 'Open Bottom Discharge Drain Valve (%Q0.6) to transfer finished chemical product to holding tank.',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-5">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Droplets className="text-cyan-400 w-5 h-5" /> Chemical Reactor Vessel Visualizer
        </h2>
        <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-950 text-cyan-400 border border-cyan-500/30">
          BATCH PHASE: {phase}
        </span>
      </div>

      {/* Guided Walkthrough Card */}
      <div className="bg-slate-950/80 border border-cyan-900/40 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Info className="w-4 h-4 text-cyan-400" /> Guided Interactive Demonstration Walkthrough
          </span>
          <span className="text-[11px] font-mono text-slate-400">Step {activeStep} of 4</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          {demoSteps.map((step) => (
            <button
              key={step.num}
              onClick={() => setActiveStep(step.num)}
              className={`text-left p-3 rounded-lg border text-xs transition-all flex flex-col justify-between ${
                activeStep === step.num
                  ? 'bg-cyan-950/60 border-cyan-500 text-slate-100 ring-1 ring-cyan-500/50'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      activeStep === step.num ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    STEP {step.num}
                  </span>
                  {activeStep === step.num && <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <p className="font-bold text-xs text-slate-200 mt-1">{step.title}</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Visualizer SCADA Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 items-stretch">
        {/* Main Vessel Graphic */}
        <div className="lg:col-span-3 relative bg-slate-950 border border-slate-800 rounded-xl p-6 flex items-center justify-center min-h-[380px]">
          {/* Inlet Pipe A */}
          <div className="absolute top-2 left-16 flex flex-col items-center">
            <div className={`w-4 h-12 ${outputs.valveA ? 'bg-cyan-500 animate-pulse' : 'bg-slate-700'}`} />
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${outputs.valveA ? 'bg-emerald-950 text-emerald-300 border border-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
              VALVE A (%Q0.0)
            </span>
          </div>

          {/* Inlet Pipe B */}
          <div className="absolute top-2 right-16 flex flex-col items-center">
            <div className={`w-4 h-12 ${outputs.valveB ? 'bg-amber-500 animate-pulse' : 'bg-slate-700'}`} />
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${outputs.valveB ? 'bg-emerald-950 text-emerald-300 border border-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
              VALVE B (%Q0.1)
            </span>
          </div>

          {/* Agitator Motor Top */}
          <div className="absolute top-6 z-10 flex flex-col items-center">
            <div className={`w-12 h-10 rounded-t-md border flex items-center justify-center ${outputs.agitator ? 'bg-emerald-950/80 border-emerald-500 shadow-[0_0_12px_#10b981]' : 'bg-slate-900 border-slate-700'}`}>
              <RotateCw className={`w-5 h-5 ${outputs.agitator ? 'text-emerald-400 animate-spin' : 'text-slate-500'}`} />
            </div>
            <div className="w-2 h-16 bg-slate-500" />
          </div>

          {/* Tank Outer Shell */}
          <div className="relative w-64 h-72 border-4 border-slate-600 rounded-b-3xl bg-slate-900/50 overflow-hidden flex flex-col justify-end shadow-inner mt-12">
            {/* Liquid Mass */}
            <div
              className="w-full bg-gradient-to-t from-cyan-600/80 via-blue-500/70 to-indigo-400/60 transition-all duration-300 flex items-center justify-center relative"
              style={{ height: `${fillHeightPercent}%` }}
            >
              {outputs.agitator && fillHeightPercent > 5 && (
                <div className="absolute inset-0 bg-white/10 animate-pulse flex items-center justify-center">
                  <span className="text-[11px] font-mono text-cyan-100 font-bold tracking-wider">MIXING IN PROGRESS...</span>
                </div>
              )}
            </div>

            {/* Heating / Cooling Jacket Overlay */}
            <div className={`absolute inset-0 border-r-8 border-l-8 pointer-events-none ${outputs.heater ? 'border-rose-500/60 bg-rose-500/10' : outputs.coolingValve ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-transparent'}`} />
          </div>

          {/* Drain Valve Bottom */}
          <div className="absolute bottom-2 flex flex-col items-center">
            <div className={`w-4 h-10 ${outputs.drainValve ? 'bg-cyan-400 animate-pulse' : 'bg-slate-700'}`} />
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${outputs.drainValve ? 'bg-emerald-950 text-emerald-300 border border-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
              DRAIN VALVE (%Q0.6)
            </span>
          </div>
        </div>

        {/* Process Indicators Panel */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
          <h3 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-1.5 uppercase tracking-wide">Live Instrumentation</h3>
          
          {/* Temperature Gauge */}
          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex items-center gap-3">
            <Thermometer className={`w-7 h-7 ${inputs.temperature > 70 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`} />
            <div>
              <div className="text-[11px] text-slate-400 font-mono">Reactor Temp</div>
              <div className="text-lg font-mono font-bold text-slate-100">{inputs.temperature.toFixed(1)} °C</div>
            </div>
          </div>

          {/* Level Gauge */}
          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex items-center gap-3">
            <Droplets className="w-7 h-7 text-cyan-400" />
            <div>
              <div className="text-[11px] text-slate-400 font-mono">Liquid Volume</div>
              <div className="text-lg font-mono font-bold text-slate-100">{inputs.level.toFixed(0)} L</div>
            </div>
          </div>

          {/* Pressure Gauge */}
          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex items-center gap-3">
            <Gauge className="w-7 h-7 text-amber-400" />
            <div>
              <div className="text-[11px] text-slate-400 font-mono">Vessel Pressure</div>
              <div className="text-lg font-mono font-bold text-slate-100">{inputs.pressure.toFixed(2)} bar</div>
            </div>
          </div>

          {/* Actuator Status Indicators */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-2 border-t border-slate-800">
            <div className={`p-2 rounded border flex items-center gap-1.5 ${outputs.heater ? 'bg-rose-950 border-rose-600 text-rose-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
              <Flame className="w-3.5 h-3.5" /> HEATER
            </div>
            <div className={`p-2 rounded border flex items-center gap-1.5 ${outputs.coolingValve ? 'bg-cyan-950 border-cyan-600 text-cyan-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
              <Snowflake className="w-3.5 h-3.5" /> COOLING
            </div>
            <div className={`p-2 rounded border flex items-center gap-1.5 ${outputs.agitator ? 'bg-emerald-950 border-emerald-600 text-emerald-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
              <RotateCw className="w-3.5 h-3.5" /> AGITATOR
            </div>
            <div className={`p-2 rounded border flex items-center gap-1.5 ${outputs.drainValve ? 'bg-amber-950 border-amber-600 text-amber-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
              <ArrowDown className="w-3.5 h-3.5" /> DRAIN
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
