import React from 'react';
import { usePLC } from '../context/PLCContext';
import { BatchState } from '../types/plc';
import { Info, Play, RefreshCw, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const Visualizer: React.FC = () => {
  const {
    analogInputs,
    outputs,
    analogOutputs,
    memory,
    productTankLevel,
    batchProgress,
    pressStart,
    refillRawTanks,
    pressReset
  } = usePLC();

  // Calculated heights for SVG (Tank A: 0-1000L, Tank B: 0-1000L, Reactor: 0-2000L, Product: 0-3000L)
  const hTankA = Math.min(100, (analogInputs.AI_LT_TankA / 1000.0) * 100);
  const hTankB = Math.min(100, (analogInputs.AI_LT_TankB / 1000.0) * 100);
  const hReactor = Math.min(130, (analogInputs.AI_LT_Reactor / 2000.0) * 130);
  const hProduct = Math.min(110, (productTankLevel / 3000.0) * 110);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl flex flex-col h-full">
      {/* Visualizer Top Bar */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <h2 className="font-mono font-bold text-slate-100 text-sm tracking-wide uppercase">
            2D SCADA Process Overview & Digital Twin
          </h2>
        </div>
        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Batch Progress:</span>
            <span className="text-cyan-400 font-bold">{Math.round(batchProgress)}%</span>
          </div>
          <div className="w-32 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
              style={{ width: `${batchProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main SVG Process Flow Diagram */}
      <div className="relative flex-1 bg-slate-950 rounded-lg p-2 border border-slate-800/80 overflow-hidden min-h-[420px] flex items-center justify-center">
        <svg className="w-full h-full max-h-[500px]" viewBox="0 0 900 480" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Tank Chemical Gradients */}
            <linearGradient id="chemA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="chemB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#7e22ce" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="chemBlend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0f766e" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="jacketHeat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* PIPES NETWORK */}
          {/* Pipe Tank A to Reactor */}
          <path d="M 130 150 L 130 200 L 370 200" stroke={outputs.Q_PumpA_Run ? '#38bdf8' : '#334155'} strokeWidth="6" fill="none" strokeDasharray={outputs.Q_PumpA_Run ? '8 4' : 'none'} className={outputs.Q_PumpA_Run ? 'animate-[dash_1s_linear_infinite]' : ''} />
          
          {/* Pipe Tank B to Reactor */}
          <path d="M 270 150 L 270 220 L 370 220" stroke={outputs.Q_PumpB_Run ? '#a855f7' : '#334155'} strokeWidth="6" fill="none" strokeDasharray={outputs.Q_PumpB_Run ? '8 4' : 'none'} className={outputs.Q_PumpB_Run ? 'animate-[dash_1s_linear_infinite]' : ''} />

          {/* Acid Dosing Pipe */}
          <path d="M 420 80 L 420 130" stroke={outputs.Q_PumpAcid_Dose ? '#f43f5e' : '#334155'} strokeWidth="4" fill="none" strokeDasharray={outputs.Q_PumpAcid_Dose ? '4 2' : 'none'} />
          
          {/* Base Dosing Pipe */}
          <path d="M 480 80 L 480 130" stroke={outputs.Q_PumpBase_Dose ? '#10b981' : '#334155'} strokeWidth="4" fill="none" strokeDasharray={outputs.Q_PumpBase_Dose ? '4 2' : 'none'} />

          {/* Discharge Pipe Reactor to Product Holding Tank */}
          <path d="M 450 330 L 450 380 L 730 380 L 730 320" stroke={outputs.Q_Valve_ProductDrain ? '#2dd4bf' : '#334155'} strokeWidth="8" fill="none" strokeDasharray={outputs.Q_Valve_ProductDrain ? '8 4' : 'none'} className={outputs.Q_Valve_ProductDrain ? 'animate-[dash_1s_linear_infinite]' : ''} />

          {/* VESSEL 1: RAW CHEMICAL TANK A */}
          <g transform="translate(80, 50)">
            {/* Tank Shell */}
            <rect x="0" y="0" width="100" height="120" rx="6" fill="#0f172a" stroke="#475569" strokeWidth="3" />
            {/* Liquid Fill */}
            <rect x="4" y={116 - hTankA} width="92" height={hTankA} rx="2" fill="url(#chemA)" transition="height 0.3s ease, y 0.3s ease" />
            {/* Float Switch LSH */}
            <circle cx="85" cy="15" r="6" fill={analogInputs.AI_LT_TankA >= 980 ? '#ef4444' : '#22c55e'} />
            <text x="50" y="-10" textAnchor="middle" fill="#cbd5e1" className="text-[11px] font-mono font-bold">TANK A (RAW A)</text>
            <text x="50" y="65" textAnchor="middle" fill="#ffffff" className="text-xs font-mono font-bold drop-shadow">
              {Math.round(analogInputs.AI_LT_TankA)} L
            </text>
          </g>

          {/* PUMP A & VALVE 1 */}
          <g transform="translate(130, 185)">
            <circle cx="0" cy="15" r="12" fill={outputs.Q_PumpA_Run ? '#0284c7' : '#1e293b'} stroke="#38bdf8" strokeWidth="2" className={outputs.Q_PumpA_Run ? 'animate-spin' : ''} />
            <text x="0" y="19" textAnchor="middle" fill="#ffffff" className="text-[9px] font-mono font-bold">P-A</text>
            <text x="40" y="10" fill="#38bdf8" className="text-[10px] font-mono font-bold">
              V1: {Math.round(analogOutputs.AQ_V1_RatioA)}%
            </text>
          </g>

          {/* VESSEL 2: RAW CHEMICAL TANK B */}
          <g transform="translate(220, 50)">
            <rect x="0" y="0" width="100" height="120" rx="6" fill="#0f172a" stroke="#475569" strokeWidth="3" />
            <rect x="4" y={116 - hTankB} width="92" height={hTankB} rx="2" fill="url(#chemB)" transition="height 0.3s ease, y 0.3s ease" />
            <circle cx="85" cy="15" r="6" fill={analogInputs.AI_LT_TankB >= 980 ? '#ef4444' : '#22c55e'} />
            <text x="50" y="-10" textAnchor="middle" fill="#cbd5e1" className="text-[11px] font-mono font-bold">TANK B (RAW B)</text>
            <text x="50" y="65" textAnchor="middle" fill="#ffffff" className="text-xs font-mono font-bold drop-shadow">
              {Math.round(analogInputs.AI_LT_TankB)} L
            </text>
          </g>

          {/* PUMP B & VALVE 2 */}
          <g transform="translate(270, 205)">
            <circle cx="0" cy="15" r="12" fill={outputs.Q_PumpB_Run ? '#7e22ce' : '#1e293b'} stroke="#a855f7" strokeWidth="2" className={outputs.Q_PumpB_Run ? 'animate-spin' : ''} />
            <text x="0" y="19" textAnchor="middle" fill="#ffffff" className="text-[9px] font-mono font-bold">P-B</text>
            <text x="40" y="10" fill="#a855f7" className="text-[10px] font-mono font-bold">
              V2: {Math.round(analogOutputs.AQ_V2_RatioB)}%
            </text>
          </g>

          {/* ACID / BASE DOSING MICRO-PUMPS */}
          <g transform="translate(400, 30)">
            <rect x="0" y="0" width="40" height="40" rx="4" fill="#1e293b" stroke={outputs.Q_PumpAcid_Dose ? '#f43f5e' : '#475569'} strokeWidth="2" />
            <text x="20" y="24" textAnchor="middle" fill="#f43f5e" className="text-[10px] font-mono font-bold">ACID</text>
            {outputs.Q_PumpAcid_Dose && <circle cx="20" cy="8" r="4" fill="#f43f5e" className="animate-ping" />}
          </g>
          <g transform="translate(460, 30)">
            <rect x="0" y="0" width="40" height="40" rx="4" fill="#1e293b" stroke={outputs.Q_PumpBase_Dose ? '#10b981' : '#475569'} strokeWidth="2" />
            <text x="20" y="24" textAnchor="middle" fill="#10b981" className="text-[10px] font-mono font-bold">BASE</text>
            {outputs.Q_PumpBase_Dose && <circle cx="20" cy="8" r="4" fill="#10b981" className="animate-ping" />}
          </g>

          {/* VESSEL 3: HEATED MIXING REACTOR */}
          <g transform="translate(370, 160)">
            {/* Heating Jacket Outer Frame */}
            <rect x="-10" y="30" width="180" height="120" rx="10" fill="#020617" stroke={outputs.Q_HeaterJacket_On ? '#ef4444' : '#334155'} strokeWidth={outputs.Q_HeaterJacket_On ? '4' : '2'} className={outputs.Q_HeaterJacket_On ? 'animate-pulse' : ''} />
            {outputs.Q_HeaterJacket_On && (
              <rect x="-8" y="32" width="176" height="116" rx="8" fill="url(#jacketHeat)" />
            )}
            
            {/* Reactor Tank Vessel */}
            <rect x="0" y="0" width="160" height="140" rx="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="3" />
            
            {/* Liquid Blend Level */}
            <rect x="4" y={136 - hReactor} width="152" height={hReactor} rx="4" fill="url(#chemBlend)" transition="height 0.3s ease, y 0.3s ease" />

            {/* Agitator Shaft & Blades */}
            <line x1="80" y1="-20" x2="80" y2="110" stroke="#94a3b8" strokeWidth="4" />
            <g transform="translate(80, 105)" className={outputs.Q_Agitator_Run ? 'animate-spin origin-center' : ''}>
              <rect x="-30" y="-4" width="60" height="8" rx="2" fill="#e2e8f0" />
              <rect x="-20" y="-8" width="40" height="16" rx="2" fill="#cbd5e1" opacity="0.6" />
            </g>
            {/* Agitator Motor Header */}
            <rect x="65" y="-35" width="30" height="20" rx="3" fill={outputs.Q_Agitator_Run ? '#22c55e' : '#334155'} stroke="#64748b" />
            <text x="80" y="-22" textAnchor="middle" fill="#ffffff" className="text-[8px] font-mono font-bold">MIX</text>

            {/* High Level Float Guard */}
            <circle cx="145" cy="15" r="6" fill={analogInputs.AI_LT_Reactor >= 1950 ? '#ef4444' : '#22c55e'} />
            <text x="80" y="-45" textAnchor="middle" fill="#38bdf8" className="text-xs font-mono font-bold uppercase tracking-wider">
              BATCH REACTOR VESSEL
            </text>

            {/* Telemetry Display Overlay inside Reactor */}
            <g transform="translate(15, 45)">
              <rect x="0" y="0" width="130" height="52" rx="4" fill="#020617" fillOpacity="0.85" stroke="#1e293b" />
              <text x="10" y="16" fill="#38bdf8" className="text-[11px] font-mono font-bold">
                VOL: {Math.round(analogInputs.AI_LT_Reactor)} / 2000 L
              </text>
              <text x="10" y="32" fill={analogInputs.AI_TT_Reactor > 80 ? '#ef4444' : '#f59e0b'} className="text-[11px] font-mono font-bold">
                TEMP: {analogInputs.AI_TT_Reactor.toFixed(1)} °C {outputs.Q_HeaterJacket_On ? '🔥' : ''}
              </text>
              <text x="10" y="47" fill="#10b981" className="text-[11px] font-mono font-bold">
                pH: {analogInputs.AI_pHT_Reactor.toFixed(2)} pH
              </text>
            </g>
          </g>

          {/* BOTTOM DISCHARGE VALVE */}
          <g transform="translate(450, 345)">
            <polygon points="-12,-8 12,-8 0,0 -12,8 12,8 0,0" fill={outputs.Q_Valve_ProductDrain ? '#2dd4bf' : '#475569'} stroke="#cbd5e1" />
            <text x="20" y="4" fill="#2dd4bf" className="text-[10px] font-mono font-bold">
              DRAIN V3 {outputs.Q_Valve_ProductDrain ? '(OPEN)' : '(CLOSED)'}
            </text>
          </g>

          {/* VESSEL 4: PRODUCT HOLDING TANK */}
          <g transform="translate(660, 200)">
            <rect x="0" y="0" width="140" height="120" rx="8" fill="#0f172a" stroke="#10b981" strokeWidth="3" />
            <rect x="4" y={116 - hProduct} width="132" height={hProduct} rx="4" fill="#10b981" fillOpacity="0.85" transition="height 0.3s ease, y 0.3s ease" />
            <text x="70" y="-10" textAnchor="middle" fill="#10b981" className="text-[11px] font-mono font-bold">
              PRODUCT HOLDING TANK
            </text>
            <text x="70" y="65" textAnchor="middle" fill="#ffffff" className="text-xs font-mono font-bold drop-shadow">
              {Math.round(productTankLevel)} / 3000 L
            </text>
          </g>
        </svg>
      </div>

      {/* Step-by-Step Interactive Demo Instructions Panel Card */}
      <div className="mt-3 bg-slate-950/90 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 shadow-inner flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-cyan-400 font-bold shrink-0">
          <Info className="w-4 h-4" />
          <span>OPERATOR WALKTHROUGH:</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full">
          <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-start space-x-2">
            <span className="bg-cyan-500/20 text-cyan-400 font-bold px-1.5 py-0.5 rounded text-[10px]">1</span>
            <span>Check Raw Tanks (A/B) have sufficient chemical volume.</span>
          </div>
          <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-start space-x-2">
            <span className="bg-cyan-500/20 text-cyan-400 font-bold px-1.5 py-0.5 rounded text-[10px]">2</span>
            <span>Configure Recipe ratios, Temp (65°C), and Target pH (7.0).</span>
          </div>
          <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-start space-x-2">
            <span className="bg-cyan-500/20 text-cyan-400 font-bold px-1.5 py-0.5 rounded text-[10px]">3</span>
            <span>Click <strong className="text-emerald-400">START BATCH</strong> on HMI to execute PLC scan loop.</span>
          </div>
          <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-start space-x-2">
            <span className="bg-cyan-500/20 text-cyan-400 font-bold px-1.5 py-0.5 rounded text-[10px]">4</span>
            <span>Test Interlocks (E-Stop or Overheat) to trigger FAULT 99.</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0 self-end md:self-auto">
          <button
            onClick={pressStart}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded flex items-center space-x-1 transition shadow"
          >
            <Play className="w-3.5 h-3.5" />
            <span>START</span>
          </button>
          <button
            onClick={refillRawTanks}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-1.5 rounded flex items-center space-x-1 border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>REFILL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
