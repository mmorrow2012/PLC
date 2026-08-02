import React, { useState } from 'react';
import { PlcState, BatchState } from '../types/plc';
import { Play, Flame, Gauge, Zap, ChevronRight, HelpCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface VisualizerProps {
  plcState: PlcState;
  onStartBatch: () => void;
  onTriggerFault: (type: 'overheat' | 'overflow' | 'agitator' | 'estop') => void;
}

export const Visualizer: React.FC<VisualizerProps> = ({ plcState, onStartBatch, onTriggerFault }) => {
  const [demoStep, setDemoStep] = useState<number>(1);
  const { physical, outputs, memory, inputs } = plcState;

  // Percentage calculations
  const tankAPct = Math.min(100, Math.max(0, (physical.tankALevel / 1000.0) * 100));
  const tankBPct = Math.min(100, Math.max(0, (physical.tankBLevel / 1000.0) * 100));
  const reactorPct = Math.min(100, Math.max(0, (physical.reactorLevel / 2000.0) * 100));
  const productPct = Math.min(100, Math.max(0, (physical.productTankLevel / 3000.0) * 100));

  // Color calculation for reactor blend based on pH
  const getReactorLiquidColor = () => {
    if (physical.reactorLevel <= 10) return 'rgba(71, 85, 105, 0.2)';
    const ph = physical.reactorpH;
    if (ph < 5.5) return 'rgba(239, 68, 68, 0.85)'; // Red Acidic
    if (ph > 8.5) return 'rgba(168, 85, 247, 0.85)'; // Purple Alkaline
    return 'rgba(16, 185, 129, 0.85)'; // Green Neutral
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-slate-100">
      {/* Top SCADA Process Indicator Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-slate-400 font-medium uppercase">RAW TANK A (%IW100)</p>
            <p className="text-lg font-mono font-bold text-cyan-400">{physical.tankALevel.toFixed(1)} <span className="text-xs text-slate-400">L</span></p>
          </div>
          <div className="w-2 h-10 bg-slate-800 rounded-full overflow-hidden flex flex-col justify-end">
            <div className="bg-cyan-500 w-full transition-all duration-300" style={{ height: `${tankAPct}%` }} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-slate-400 font-medium uppercase">RAW TANK B (%IW102)</p>
            <p className="text-lg font-mono font-bold text-purple-400">{physical.tankBLevel.toFixed(1)} <span className="text-xs text-slate-400">L</span></p>
          </div>
          <div className="w-2 h-10 bg-slate-800 rounded-full overflow-hidden flex flex-col justify-end">
            <div className="bg-purple-500 w-full transition-all duration-300" style={{ height: `${tankBPct}%` }} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-slate-400 font-medium uppercase">REACTOR TEMP (%IW106)</p>
            <p className={`text-lg font-mono font-bold ${physical.reactorTemp > 85 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
              {physical.reactorTemp.toFixed(1)} <span className="text-xs text-slate-400">°C</span>
            </p>
          </div>
          <Flame className={`w-6 h-6 ${outputs.Q_HeaterJacket_On ? 'text-amber-500 animate-bounce' : 'text-slate-700'}`} />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-slate-400 font-medium uppercase">BLEND pH (%IW108)</p>
            <p className="text-lg font-mono font-bold text-emerald-400">{physical.reactorpH.toFixed(2)} <span className="text-xs text-slate-400">pH</span></p>
          </div>
          <Gauge className="w-6 h-6 text-emerald-500" />
        </div>
      </div>

      {/* Main Interactive SCADA SVG Visualizer Area */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative overflow-hidden min-h-[520px]">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded border border-slate-800 font-mono text-xs">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-slate-300 font-semibold">LIVE SCADA PROCESS FLOW DIAGRAM</span>
        </div>

        <svg viewBox="0 0 950 480" className="w-full h-auto max-h-[520px]">
          <defs>
            {/* Tank Liquid Gradients */}
            <linearGradient id="tankAGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="tankBGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#9333ea" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="jacketGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={outputs.Q_HeaterJacket_On ? '0.8' : '0.15'} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={outputs.Q_HeaterJacket_On ? '0.9' : '0.15'} />
            </linearGradient>
            <linearGradient id="productGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* PIPING INFRASTRUCTURE */}
          {/* Pipe A: Tank A -> Reactor Top */}
          <path d="M 100 220 L 100 110 L 370 110 L 370 150" fill="none" stroke="#334155" strokeWidth="8" />
          {outputs.Q_PumpA_Run && (
            <path d="M 100 220 L 100 110 L 370 110 L 370 150" fill="none" stroke="#06b6d4" strokeWidth="5" className="animate-flow" />
          )}

          {/* Pipe B: Tank B -> Reactor Top */}
          <path d="M 250 220 L 250 130 L 390 130 L 390 150" fill="none" stroke="#334155" strokeWidth="8" />
          {outputs.Q_PumpB_Run && (
            <path d="M 250 220 L 250 130 L 390 130 L 390 150" fill="none" stroke="#a855f7" strokeWidth="5" className="animate-flow" />
          )}

          {/* Acid Dosing Line */}
          <path d="M 330 60 L 330 150" fill="none" stroke="#334155" strokeWidth="5" />
          {outputs.Q_PumpAcid_Dose && (
            <path d="M 330 60 L 330 150" fill="none" stroke="#ef4444" strokeWidth="3" className="animate-flow" />
          )}

          {/* Base Dosing Line */}
          <path d="M 510 60 L 510 150" fill="none" stroke="#334155" strokeWidth="5" />
          {outputs.Q_PumpBase_Dose && (
            <path d="M 510 60 L 510 150" fill="none" stroke="#3b82f6" strokeWidth="3" className="animate-flow" />
          )}

          {/* Discharge Pipe: Reactor -> Product Tank */}
          <path d="M 420 370 L 420 420 L 750 420 L 750 360" fill="none" stroke="#334155" strokeWidth="10" />
          {outputs.Q_Valve_ProductDrain && (
            <path d="M 420 370 L 420 420 L 750 420 L 750 360" fill="none" stroke="#10b981" strokeWidth="6" className="animate-flow" />
          )}

          {/* RAW TANK A */}
          <rect x="50" y="180" width="100" height="160" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="3" />
          <rect x="54" y={336 - (152 * tankAPct / 100)} width="92" height={152 * tankAPct / 100} fill="url(#tankAGrad)" rx="2" />
          <text x="100" y="200" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="bold">TANK A</text>
          <text x="100" y="260" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold" fontFamily="monospace">{physical.tankALevel.toFixed(0)} L</text>
          {/* Float Switch Guard A */}
          <circle cx="138" cy="195" r="6" fill={inputs.I_LSH_TankA ? '#ef4444' : '#22c55e'} />
          <text x="138" y="182" textAnchor="middle" fill="#94a3b8" fontSize="9">LSH-101</text>

          {/* RAW TANK B */}
          <rect x="200" y="180" width="100" height="160" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="3" />
          <rect x="204" y={336 - (152 * tankBPct / 100)} width="92" height={152 * tankBPct / 100} fill="url(#tankBGrad)" rx="2" />
          <text x="250" y="200" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="bold">TANK B</text>
          <text x="250" y="260" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold" fontFamily="monospace">{physical.tankBLevel.toFixed(0)} L</text>
          {/* Float Switch Guard B */}
          <circle cx="288" cy="195" r="6" fill={inputs.I_LSH_TankB ? '#ef4444' : '#22c55e'} />
          <text x="288" y="182" textAnchor="middle" fill="#94a3b8" fontSize="9">LSH-102</text>

          {/* FEED PUMP A & B GRAPHICS */}
          <circle cx="100" cy="150" r="14" fill={outputs.Q_PumpA_Run ? '#06b6d4' : '#334155'} stroke="#cbd5e1" strokeWidth="2" />
          <text x="100" y="154" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">PA</text>
          <circle cx="250" cy="150" r="14" fill={outputs.Q_PumpB_Run ? '#a855f7' : '#334155'} stroke="#cbd5e1" strokeWidth="2" />
          <text x="250" y="154" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">PB</text>

          {/* HEATED MIXING REACTOR (CENTER VESSEL) */}
          {/* Outer Heating Jacket Outer Ring */}
          <rect x="335" y="160" width="170" height="215" rx="14" fill="url(#jacketGrad)" stroke={outputs.Q_HeaterJacket_On ? '#f97316' : '#475569'} strokeWidth="3" className={outputs.Q_HeaterJacket_On ? 'animate-pulse' : ''} />
          {/* Main Vessel Body */}
          <rect x="345" y="165" width="150" height="200" rx="10" fill="#0f172a" stroke="#64748b" strokeWidth="3" />
          {/* Liquid Fill */}
          <rect x="349" y={361 - (192 * reactorPct / 100)} width="142" height={192 * reactorPct / 100} fill={getReactorLiquidColor()} rx="4" className="transition-all duration-300" />

          {/* Agitator Mixer Shaft & Rotor Blades */}
          <rect x="417" y="110" width="6" height="200" fill="#94a3b8" />
          <g className={outputs.Q_Agitator_Run ? 'animate-agitator' : ''} style={{ transformOrigin: '420px 300px' }}>
            <path d="M 380 300 L 460 300 M 390 292 L 450 308 M 390 308 L 450 292" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
          </g>
          {/* Mixer Motor Top Hood */}
          <rect x="400" y="85" width="40" height="25" rx="4" fill={outputs.Q_Agitator_Run ? '#10b981' : '#475569'} stroke="#f8fafc" strokeWidth="1.5" />
          <text x="420" y="101" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">MIXER</text>

          {/* Floating pH Probe Sensor */}
          <rect x="470" y="200" width="8" height="80" fill="#e2e8f0" rx="2" />
          <circle cx="474" cy="280" r="6" fill="#38bdf8" />
          <text x="474" y="190" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">pH PROBE</text>

          {/* High Level Float Guard (LSH-103) */}
          <circle cx="362" cy="180" r="6" fill={inputs.I_LSH_Reactor ? '#ef4444' : '#22c55e'} />
          <text x="362" y="170" textAnchor="middle" fill="#94a3b8" fontSize="8">LSH-103</text>

          {/* Reactor Labels & Telemetry Readout Box */}
          <rect x="360" y="220" width="120" height="55" rx="6" fill="rgba(15, 23, 42, 0.85)" stroke="#334155" strokeWidth="1.5" />
          <text x="420" y="236" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">BATCH REACTOR</text>
          <text x="420" y="252" textAnchor="middle" fill="#38bdf8" fontSize="11" fontFamily="monospace">VOL: {physical.reactorLevel.toFixed(0)} L</text>
          <text x="420" y="267" textAnchor="middle" fill="#f59e0b" fontSize="11" fontFamily="monospace">TEMP: {physical.reactorTemp.toFixed(1)}°C</text>

          {/* ACID / BASE DOSING MICRO PUMPS */}
          <rect x="310" y="30" width="40" height="30" rx="4" fill={outputs.Q_PumpAcid_Dose ? '#ef4444' : '#334155'} stroke="#cbd5e1" strokeWidth="1.5" />
          <text x="330" y="48" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">ACID</text>
          <rect x="490" y="30" width="40" height="30" rx="4" fill={outputs.Q_PumpBase_Dose ? '#3b82f6' : '#334155'} stroke="#cbd5e1" strokeWidth="1.5" />
          <text x="510" y="48" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">BASE</text>

          {/* PRODUCT HOLDING TANK */}
          <rect x="700" y="200" width="130" height="180" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="3" />
          <rect x="704" y={376 - (172 * productPct / 100)} width="122" height={172 * productPct / 100} fill="url(#productGrad)" rx="3" />
          <text x="765" y="225" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="bold">PRODUCT TANK</text>
          <text x="765" y="290" textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="bold" fontFamily="monospace">{physical.productTankLevel.toFixed(0)} L</text>

          {/* PRODUCT DRAIN VALVE (DRAIN) */}
          <polygon points="410,380 430,380 420,395" fill={outputs.Q_Valve_ProductDrain ? '#10b981' : '#64748b'} />
          <polygon points="410,410 430,410 420,395" fill={outputs.Q_Valve_ProductDrain ? '#10b981' : '#64748b'} />
          <text x="445" y="398" fill="#cbd5e1" fontSize="10" fontWeight="bold">V_DRAIN (%Q0.6)</text>
        </svg>
      </div>

      {/* DEMO STEP-BY-STEP WALKTHROUGH PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-slate-100 text-sm tracking-wide">INDUSTRIAL SIMULATION GUIDED DEMO</h3>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
            <span>STEP {demoStep} OF 4</span>
          </div>
        </div>

        {demoStep === 1 && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="space-y-1">
              <p className="text-xs font-bold font-mono text-cyan-400">STEP 1: BATCH INITIALIZATION & SAFETY INTERLOCK</p>
              <p className="text-xs text-slate-300">
                Verify E-Stop switch (%I0.0) is Closed (24V) and float switches are clear. Click <strong>Start Batch PB</strong> to initiate recipe ratio dosing.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onStartBatch}
                disabled={memory.M_BatchState !== BatchState.IDLE}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono font-bold text-xs rounded shadow flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> START BATCH (%I0.1)
              </button>
              <button onClick={() => setDemoStep(2)} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded text-slate-200 flex items-center gap-1 font-mono">
                NEXT <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {demoStep === 2 && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="space-y-1">
              <p className="text-xs font-bold font-mono text-purple-400">STEP 2: SEQUENTIAL CHEMICAL DOSING (A ➔ B)</p>
              <p className="text-xs text-slate-300">
                PLC activates Feed Pump A (%Q0.0) and modulates Proportional Valve A (%QW100) until 600L is loaded, then switches automatically to Chemical B (400L).
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setDemoStep(1)} className="px-3 py-2 bg-slate-800 text-xs rounded text-slate-300 font-mono">PREV</button>
              <button onClick={() => setDemoStep(3)} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded text-slate-200 flex items-center gap-1 font-mono">
                NEXT <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {demoStep === 3 && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="space-y-1">
              <p className="text-xs font-bold font-mono text-amber-400">STEP 3: THERMAL AGITATION & SCORCH PREVENT</p>
              <p className="text-xs text-slate-300">
                High-shear Agitator Motor (%Q0.2) runs simultaneously with Thermal Heating Jacket (%Q0.3) until batch reaches setpoint 65.0°C.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setDemoStep(2)} className="px-3 py-2 bg-slate-800 text-xs rounded text-slate-300 font-mono">PREV</button>
              <button onClick={() => setDemoStep(4)} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded text-slate-200 flex items-center gap-1 font-mono">
                NEXT <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {demoStep === 4 && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="space-y-1">
              <p className="text-xs font-bold font-mono text-emerald-400">STEP 4: CLOSED-LOOP pH NEUTRALIZATION & DISCHARGE</p>
              <p className="text-xs text-slate-300">
                FB_pHBalancing pulse-doses Acid/Base pumps until pH stabilizes within 6.95 - 7.05, then opens Discharge Valve (%Q0.6) to feed Product Holding Tank.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setDemoStep(3)} className="px-3 py-2 bg-slate-800 text-xs rounded text-slate-300 font-mono">PREV</button>
              <button onClick={() => setDemoStep(1)} className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-xs text-white rounded font-mono font-bold">RESTART TUTORIAL</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
