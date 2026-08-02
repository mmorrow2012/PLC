import React, { useState } from 'react';
import { PLCSystemState } from '../types/plc';
import { Waves, Droplet, Gauge, Wind, AlertCircle, Info, ChevronRight, Check } from 'lucide-react';

interface VisualizerProps {
  plcState: PLCSystemState;
  onStepClick?: (stepNumber: number) => void;
}

export const Visualizer: React.FC<VisualizerProps> = ({ plcState }) => {
  const { analogInputs, outputs, analogOutputs, simulation, fbState } = plcState;
  const [activeStep, setActiveStep] = useState<number>(1);

  // Calculate visual heights dynamically
  const eqLevelHeightPct = Math.min(100, Math.max(5, (analogInputs.AI_LT_EqBasin / 10.0) * 100));
  const aerationALevelPct = Math.min(100, Math.max(5, (analogInputs.AI_LT_AerationA / 6.0) * 100));
  const doLevelWidthPct = Math.min(100, (analogInputs.AI_DO_AerationA / 10.0) * 100);

  const steps = [
    {
      num: 1,
      title: 'Equalization Influent',
      desc: 'Fill basin above 3.0m to engage Lead Influent Pump (%Q0.0/%Q0.1) and trigger VFD modulation.',
    },
    {
      num: 2,
      title: 'Aeration & Oxygenation',
      desc: 'Blower Diffusers (%Q0.2) run and Modulation Valve (%QW102) adjusts to reach 2.5 mg/L Target DO.',
    },
    {
      num: 3,
      title: 'Clarification & Coagulation',
      desc: 'Coagulant Dosing Pump (%Q0.5) reduces turbidity; RAS Pump (%Q0.4) recycles activated sludge.',
    },
    {
      num: 4,
      title: 'Effluent Weir Sluice Gate',
      desc: 'When turbidity < 15 NTU, Motorized Weir Gate (%Q0.6) opens for safe municipal discharge.',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-5">
      {/* Visualizer Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-cyan-400" />
          <h2 className="font-bold text-slate-100 text-sm uppercase tracking-wider">2D Process SCADA Flow Mimic</h2>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-slate-300">Influent Inflow: <strong className="text-cyan-400">{simulation.simulatedInfluentInflowRate} m³/h</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-slate-300">Turbidity: <strong className={analogInputs.AI_Turbidity_Effluent > 15 ? 'text-rose-400' : 'text-emerald-400'}>{analogInputs.AI_Turbidity_Effluent.toFixed(1)} NTU</strong></span>
          </div>
        </div>
      </div>

      {/* Interactive Walkthrough Card */}
      <div className="bg-slate-950/80 border border-cyan-900/40 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Info className="w-4 h-4 text-cyan-400" /> Guided Interactive Demonstration Walkthrough
          </span>
          <span className="text-[11px] font-mono text-slate-400">Step {activeStep} of 4</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          {steps.map((step) => (
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
                  <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${activeStep === step.num ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
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

      {/* SVG SCADA Diagram */}
      <div className="relative w-full overflow-hidden bg-slate-950 rounded-xl border border-slate-800 p-4 min-h-[380px] flex flex-col justify-between bg-grid-pattern">
        <svg className="w-full h-[340px]" viewBox="0 0 900 320" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="aerationGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="clarifierGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Piping Connections with Animated Flow */}
          {/* Influent to Eq Basin */}
          <path d="M 20 120 L 70 120 L 70 180" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
          <path d="M 20 120 L 70 120 L 70 180" stroke="#06b6d4" strokeWidth="4" className="animate-flow" />

          {/* Eq Basin to Aeration A */}
          <path d="M 190 230 L 250 230 C 270 230 270 180 290 180" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
          {(outputs.Q_Pump_RawInfluent1 || outputs.Q_Pump_RawInfluent2) && (
            <path d="M 190 230 L 250 230 C 270 230 270 180 290 180" stroke="#38bdf8" strokeWidth="4" className="animate-flow" />
          )}

          {/* Aeration A to Aeration B */}
          <path d="M 410 200 L 470 200" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
          {plcState.memory.M_PlantState >= 2 && (
            <path d="M 410 200 L 470 200" stroke="#38bdf8" strokeWidth="4" className="animate-flow" />
          )}

          {/* Aeration B to Secondary Clarifier */}
          <path d="M 590 200 L 650 200" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
          {plcState.memory.M_PlantState >= 3 && (
            <path d="M 590 200 L 650 200" stroke="#60a5fa" strokeWidth="4" className="animate-flow" />
          )}

          {/* Effluent Discharge Line */}
          <path d="M 770 180 L 870 180" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
          {fbState.FB_WeirGateControl.allowDischarge && simulation.weirGatePositionPct > 20 && (
            <path d="M 770 180 L 870 180" stroke="#10b981" strokeWidth="4" className="animate-flow" />
          )}

          {/* BASIN 1: Equalization Basin */}
          <g transform="translate(70, 140)">
            <rect x="0" y="0" width="120" height="140" fill="#0f172a" stroke="#334155" strokeWidth="3" rx="4" />
            <rect
              x="4"
              y={136 - (132 * (eqLevelHeightPct / 100))}
              width="112"
              height={132 * (eqLevelHeightPct / 100)}
              fill="url(#waterGrad)"
              rx="2"
            />
            {/* Sensor Line */}
            <line x1="60" y1="0" x2="60" y2="136" stroke="#06b6d4" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="60" cy={136 - (132 * (eqLevelHeightPct / 100))} r="4" fill="#22d3ee" />
            <text x="60" y="-10" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">Equalization Basin</text>
            <text x="60" y="25" fill="#e2e8f0" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">{analogInputs.AI_LT_EqBasin.toFixed(2)}m</text>
          </g>

          {/* BASIN 2: Aeration Basin A */}
          <g transform="translate(290, 140)">
            <rect x="0" y="0" width="120" height="140" fill="#0f172a" stroke="#334155" strokeWidth="3" rx="4" />
            <rect
              x="4"
              y={136 - (132 * (aerationALevelPct / 100))}
              width="112"
              height={132 * (aerationALevelPct / 100)}
              fill="url(#aerationGrad)"
              rx="2"
            />
            {/* Blower Diffuser Bubbles */}
            {outputs.Q_Blower_AerationA && (
              <g>
                <circle cx="30" cy="110" r="3" fill="#ffffff" className="bubble" />
                <circle cx="60" cy="120" r="4" fill="#ffffff" className="bubble" />
                <circle cx="90" cy="105" r="3" fill="#ffffff" className="bubble" />
              </g>
            )}
            <text x="60" y="-10" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">Aeration Basin A</text>
            <text x="60" y="25" fill="#e2e8f0" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">DO: {analogInputs.AI_DO_AerationA.toFixed(2)} mg/L</text>
          </g>

          {/* BASIN 3: Aeration Basin B */}
          <g transform="translate(470, 140)">
            <rect x="0" y="0" width="120" height="140" fill="#0f172a" stroke="#334155" strokeWidth="3" rx="4" />
            <rect
              x="4"
              y={136 - (132 * (aerationALevelPct / 100))}
              width="112"
              height={132 * (aerationALevelPct / 100)}
              fill="url(#aerationGrad)"
              rx="2"
            />
            {outputs.Q_Blower_AerationB && (
              <g>
                <circle cx="30" cy="115" r="3.5" fill="#ffffff" className="bubble" />
                <circle cx="60" cy="105" r="4" fill="#ffffff" className="bubble" />
                <circle cx="85" cy="125" r="3" fill="#ffffff" className="bubble" />
              </g>
            )}
            <text x="60" y="-10" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">Aeration Basin B</text>
            <text x="60" y="25" fill="#e2e8f0" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">{analogInputs.AI_LT_AerationB.toFixed(2)}m</text>
          </g>

          {/* BASIN 4: Secondary Clarifier & Weir */}
          <g transform="translate(650, 140)">
            <polygon points="0,0 120,0 100,140 20,140" fill="#0f172a" stroke="#334155" strokeWidth="3" />
            <polygon points="4,4 116,4 97,136 23,136" fill="url(#clarifierGrad)" />
            <text x="60" y="-10" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">Secondary Clarifier</text>
            <text x="60" y="25" fill="#e2e8f0" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">Turb: {analogInputs.AI_Turbidity_Effluent.toFixed(1)} NTU</text>
            
            {/* Motorized Effluent Weir Sluice Gate Graphic */}
            <g transform="translate(110, 20)">
              <rect x="0" y="0" width="12" height="60" fill="#334155" stroke="#64748b" />
              {/* Moving Gate Plate */}
              <rect
                x="2"
                y={(100 - simulation.weirGatePositionPct) * 0.4}
                width="8"
                height="24"
                fill={fbState.FB_WeirGateControl.allowDischarge ? '#10b981' : '#f43f5e'}
                rx="1"
              />
              <text x="6" y="-8" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">GATE ({simulation.weirGatePositionPct.toFixed(0)}%)</text>
            </g>
          </g>
        </svg>

        {/* Live Hardware Component Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-slate-800 pt-3 text-xs font-mono">
          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
            <span className="text-slate-400">Influent VFD (%QW100):</span>
            <span className="text-cyan-400 font-bold">{analogOutputs.AQ_VFD_InfluentSpeed.toFixed(1)} %</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
            <span className="text-slate-400">Air Valve (%QW102):</span>
            <span className="text-cyan-400 font-bold">{analogOutputs.AQ_AirValve_Aeration.toFixed(1)} %</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
            <span className="text-slate-400">RAS Pump (%Q0.4):</span>
            <span className={outputs.Q_Pump_RAS ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {outputs.Q_Pump_RAS ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
            <span className="text-slate-400">Coagulant (%Q0.5):</span>
            <span className={outputs.Q_Pump_Coagulant ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {outputs.Q_Pump_Coagulant ? 'DOSING' : 'OFF'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};