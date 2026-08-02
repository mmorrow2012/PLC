import React from 'react';
import { usePlcStore, ProcessState } from '../store/usePlcStore';
import { AlertTriangle, ShieldAlert, Activity, CheckCircle2 } from 'lucide-react';

export const Visualizer: React.FC = () => {
  const { inputs, outputs, eStopLatched } = usePlcStore();

  const isAlarm = outputs.Alarm_Overflow || !inputs.E_Stop || eStopLatched;

  // Helper calculation for SVG tank heights (Tank SVG box height = 140px)
  const getFillY = (level: number) => {
    const maxHeight = 120;
    const height = (Math.min(100, Math.max(0, level)) / 100) * maxHeight;
    return {
      y: 150 - height,
      height,
    };
  };

  const fillA = getFillY(inputs.LT_TankA);
  const fillB = getFillY(inputs.LT_TankB);
  const fillC = getFillY(inputs.LT_TankC);

  // Status Tower LED colors
  const isRedOn = (outputs.Alarm_Tower & 0x04) !== 0;
  const isYellowOn = (outputs.Alarm_Tower & 0x02) !== 0;
  const isGreenOn = (outputs.Alarm_Tower & 0x01) !== 0;

  return (
    <div className="relative bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-2xl flex flex-col justify-between overflow-hidden text-slate-100 min-h-[520px]">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 z-10">
        <div className="flex items-center space-x-3">
          <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h2 className="font-bold text-lg text-slate-100 tracking-wide">
            Process Visualizer — Dynamic Cascade Tanks
          </h2>
        </div>
        <div className="flex items-center space-x-4">
          {/* Active State Badge */}
          <span className="text-xs uppercase font-mono px-3 py-1 rounded-full border bg-slate-800 border-slate-700 text-slate-300">
            State:{' '}
            <strong
              className={
                outputs.State_Display === ProcessState.ALARM_STATE
                  ? 'text-red-400'
                  : outputs.State_Display === ProcessState.IDLE
                  ? 'text-yellow-400'
                  : 'text-emerald-400'
              }
            >
              {ProcessState[outputs.State_Display]}
            </strong>
          </span>

          {/* Hardware Alarm Tower Stacklight */}
          <div className="flex items-center bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 space-x-2 shadow-inner">
            <span className="text-[10px] uppercase font-mono text-slate-400 mr-1">Tower:</span>
            <div
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                isRedOn ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-red-950 opacity-40'
              }`}
              title="Red Alarm Beacon"
            />
            <div
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                isYellowOn ? 'bg-yellow-400 shadow-[0_0_10px_#facc15]' : 'bg-yellow-950 opacity-40'
              }`}
              title="Yellow Standby Beacon"
            />
            <div
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                isGreenOn ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-emerald-950 opacity-40'
              }`}
              title="Green Auto Running Beacon"
            />
          </div>
        </div>
      </div>

      {/* Alarm Warning Flasher Overlay */}
      {isAlarm && (
        <div className="absolute top-14 left-0 right-0 z-20 bg-red-900/90 border-y border-red-500 px-6 py-2 flex items-center justify-between backdrop-blur-sm animate-pulse shadow-lg">
          <div className="flex items-center space-x-3 text-red-200 font-bold text-sm">
            <ShieldAlert className="w-6 h-6 text-red-400 animate-bounce" />
            <span>
              {!inputs.E_Stop
                ? 'EMERGENCY STOP LOSS (E-STOP TRIPPED) — SAFETY INTERLOCK LOCKOUT'
                : outputs.Alarm_Overflow
                ? 'CRITICAL OVERFLOW ALARM DETECTED — PUMPS ISOLATED'
                : 'SAFETY FAULT TRIP ACTIVE'}
            </span>
          </div>
          <span className="text-xs font-mono bg-red-950 border border-red-700 text-red-300 px-2 py-1 rounded">
            RESET REQUIRED
          </span>
        </div>
      )}

      {/* Primary Cascade Process SVG Diagram */}
      <div className="relative w-full h-[400px] my-2 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center justify-center p-2">
        <svg viewBox="0 0 850 380" className="w-full h-full text-slate-300 font-mono text-xs">
          <defs>
            {/* Liquid Fill Gradient */}
            <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.95" />
            </linearGradient>

            {/* Overflow Liquid Gradient */}
            <linearGradient id="overflowWaterGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#991b1b" stopOpacity="0.95" />
            </linearGradient>

            {/* Pipe Flow Animation Marker */}
            <pattern id="flowPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="10" r="2.5" fill="#38bdf8" className="animate-ping" />
            </pattern>
          </defs>

          {/* ================================================================= */}
          {/* PIPELINE NETWORK                                                  */}
          {/* ================================================================= */}
          
          {/* Supply Inlet Pipe -> Tank A */}
          <path d="M 30 50 L 100 50 L 100 80" fill="none" stroke="#334155" strokeWidth="12" strokeLinecap="round" />
          {outputs.Pump_Fill_A && (
            <path d="M 30 50 L 100 50 L 100 80" fill="none" stroke="#0284c7" strokeWidth="6" strokeDasharray="8 4" className="animate-pulse" />
          )}

          {/* Pipe Tank A -> Transfer Pump AB -> Tank B */}
          <path d="M 180 200 L 260 200 L 260 130 L 370 130 L 370 160" fill="none" stroke="#334155" strokeWidth="12" strokeLinejoin="round" />
          {outputs.Pump_Transfer_AB && (
            <path d="M 180 200 L 260 200 L 260 130 L 370 130 L 370 160" fill="none" stroke="#0284c7" strokeWidth="6" strokeDasharray="8 4" className="animate-pulse" />
          )}

          {/* Pipe Tank B -> Drain Valve BC -> Tank C */}
          <path d="M 450 280 L 530 280 L 530 210 L 640 210 L 640 240" fill="none" stroke="#334155" strokeWidth="12" strokeLinejoin="round" />
          {outputs.Valve_Drain_BC_Pos > 0 && (
            <path d="M 450 280 L 530 280 L 530 210 L 640 210 L 640 240" fill="none" stroke="#0284c7" strokeWidth="6" strokeDasharray="8 4" className="animate-pulse" />
          )}

          {/* Pipe Tank C Outflow Drain */}
          <path d="M 720 360 L 810 360" fill="none" stroke="#334155" strokeWidth="12" strokeLinecap="round" />
          {inputs.LT_TankC > 0 && (
            <path d="M 720 360 L 810 360" fill="none" stroke="#0284c7" strokeWidth="6" strokeDasharray="8 4" className="animate-pulse" />
          )}

          {/* ================================================================= */}
          {/* TANK A (TOP LEFT)                                                 */}
          {/* ================================================================= */}
          <g transform="translate(80, 80)">
            {/* Liquid Fill */}
            <rect
              x="2"
              y={fillA.y}
              width="96"
              height={fillA.height}
              fill={inputs.LT_TankA >= 95 ? 'url(#overflowWaterGradient)' : 'url(#waterGradient)'}
              rx="2"
              className="transition-all duration-300"
            />
            {/* Tank Shell */}
            <rect x="0" y="0" width="100" height="120" fill="none" stroke="#94a3b8" strokeWidth="4" rx="4" />
            
            {/* Level Ticks */}
            <line x1="90" y1="30" x2="100" y2="30" stroke="#64748b" strokeWidth="2" />
            <line x1="90" y1="60" x2="100" y2="60" stroke="#64748b" strokeWidth="2" />
            <line x1="90" y1="90" x2="100" y2="90" stroke="#64748b" strokeWidth="2" />

            {/* Tank Label */}
            <text x="50" y="-10" textAnchor="middle" fill="#e2e8f0" fontWeight="bold" fontSize="13">
              TANK A (Auto-Fill)
            </text>

            {/* Float Switch LSH_TankA */}
            <circle
              cx="10"
              cy="15"
              r="6"
              fill={inputs.LSH_TankA ? '#ef4444' : '#22c55e'}
              stroke="#0f172a"
              strokeWidth="2"
            />
            <text x="22" y="18" fill="#94a3b8" fontSize="9">LSH_A</text>

            {/* Level Tag Overlay */}
            <rect x="15" y="45" width="70" height="22" fill="#020617" opacity="0.85" rx="3" stroke="#334155" />
            <text x="50" y="60" textAnchor="middle" fill="#38bdf8" fontWeight="bold" fontSize="11">
              {inputs.LT_TankA.toFixed(1)}%
            </text>
          </g>

          {/* ================================================================= */}
          {/* TANK B (MIDDLE CASCADE)                                           */}
          {/* ================================================================= */}
          <g transform="translate(350, 160)">
            {/* Liquid Fill */}
            <rect
              x="2"
              y={fillB.y}
              width="96"
              height={fillB.height}
              fill={inputs.LT_TankB >= 95 ? 'url(#overflowWaterGradient)' : 'url(#waterGradient)'}
              rx="2"
              className="transition-all duration-300"
            />
            {/* Tank Shell */}
            <rect x="0" y="0" width="100" height="120" fill="none" stroke="#94a3b8" strokeWidth="4" rx="4" />

            {/* Cascade Target Line (SP_LevelB_Target = 50%) */}
            <line x1="0" y1="60" x2="100" y2="60" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />
            <text x="105" y="63" fill="#f59e0b" fontSize="9">SP Target (50%)</text>

            {/* Tank Label */}
            <text x="50" y="-10" textAnchor="middle" fill="#e2e8f0" fontWeight="bold" fontSize="13">
              TANK B (Cascade)
            </text>

            {/* Float Switch LSH_TankB */}
            <circle
              cx="10"
              cy="15"
              r="6"
              fill={inputs.LSH_TankB ? '#ef4444' : '#22c55e'}
              stroke="#0f172a"
              strokeWidth="2"
            />
            <text x="22" y="18" fill="#94a3b8" fontSize="9">LSH_B</text>

            {/* Level Tag Overlay */}
            <rect x="15" y="45" width="70" height="22" fill="#020617" opacity="0.85" rx="3" stroke="#334155" />
            <text x="50" y="60" textAnchor="middle" fill="#38bdf8" fontWeight="bold" fontSize="11">
              {inputs.LT_TankB.toFixed(1)}%
            </text>
          </g>

          {/* ================================================================= */}
          {/* TANK C (BOTTOM DISCHARGE)                                         */}
          {/* ================================================================= */}
          <g transform="translate(620, 240)">
            {/* Liquid Fill */}
            <rect
              x="2"
              y={fillC.y}
              width="96"
              height={fillC.height}
              fill="url(#waterGradient)"
              rx="2"
              className="transition-all duration-300"
            />
            {/* Tank Shell */}
            <rect x="0" y="0" width="100" height="120" fill="none" stroke="#94a3b8" strokeWidth="4" rx="4" />

            {/* Tank Label */}
            <text x="50" y="-10" textAnchor="middle" fill="#e2e8f0" fontWeight="bold" fontSize="13">
              TANK C (Drain Reservoir)
            </text>

            {/* Level Tag Overlay */}
            <rect x="15" y="45" width="70" height="22" fill="#020617" opacity="0.85" rx="3" stroke="#334155" />
            <text x="50" y="60" textAnchor="middle" fill="#38bdf8" fontWeight="bold" fontSize="11">
              {inputs.LT_TankC.toFixed(1)}%
            </text>
          </g>

          {/* ================================================================= */}
          {/* ACTUATORS & VALVES                                                */}
          {/* ================================================================= */}

          {/* Inlet Fill Pump A */}
          <g transform="translate(45, 35)">
            <circle cx="15" cy="15" r="16" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
            <path
              d="M 15 5 L 22 22 L 8 22 Z"
              fill={outputs.Pump_Fill_A ? '#10b981' : '#475569'}
              className={outputs.Pump_Fill_A ? 'animate-spin transform origin-[15px_15px]' : ''}
            />
            <text x="15" y="42" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">
              Pump_Fill_A [{outputs.Pump_Fill_A ? 'ON' : 'OFF'}]
            </text>
          </g>

          {/* Transfer Pump AB */}
          <g transform="translate(245, 185)">
            <circle cx="15" cy="15" r="16" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
            <path
              d="M 15 5 L 22 22 L 8 22 Z"
              fill={outputs.Pump_Transfer_AB ? '#10b981' : '#475569'}
              className={outputs.Pump_Transfer_AB ? 'animate-spin transform origin-[15px_15px]' : ''}
            />
            <text x="15" y="42" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">
              Pump_AB [{outputs.Pump_Transfer_AB ? 'ON' : 'OFF'}]
            </text>
          </g>

          {/* Proportional Drain Valve BC */}
          <g transform="translate(515, 265)">
            <polygon points="0,5 30,25 0,25 30,5" fill={outputs.Valve_Drain_BC_Pos > 0 ? '#38bdf8' : '#475569'} />
            <rect x="11" y="-5" width="8" height="12" fill="#94a3b8" />
            <text x="15" y="42" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">
              Valve_BC ({outputs.Valve_Drain_BC_Pos.toFixed(0)}%)
            </text>
          </g>
        </svg>
      </div>

      {/* Dynamic Process Diagnostics Footer */}
      <div className="grid grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs font-mono">
        <div className="bg-slate-950 p-2 rounded border border-slate-800 flex flex-col">
          <span className="text-slate-400">Inlet Pump A:</span>
          <span className={outputs.Pump_Fill_A ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
            {outputs.Pump_Fill_A ? 'ACTIVE (FILLING)' : 'STOPPED'}
          </span>
        </div>
        <div className="bg-slate-950 p-2 rounded border border-slate-800 flex flex-col">
          <span className="text-slate-400">Transfer Pump AB:</span>
          <span className={outputs.Pump_Transfer_AB ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
            {outputs.Pump_Transfer_AB ? 'ACTIVE (TRANSFERRING)' : 'STOPPED'}
          </span>
        </div>
        <div className="bg-slate-950 p-2 rounded border border-slate-800 flex flex-col">
          <span className="text-slate-400">Drain Valve BC Position:</span>
          <span className="text-cyan-400 font-bold">
            {outputs.Valve_Drain_BC_Pos.toFixed(1)} %
          </span>
        </div>
        <div className="bg-slate-950 p-2 rounded border border-slate-800 flex flex-col">
          <span className="text-slate-400">Safety Status:</span>
          <span className={isAlarm ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold flex items-center space-x-1'}>
            {isAlarm ? 'FAULT LOCKOUT' : 'ALL INTERLOCKS OK'}
          </span>
        </div>
      </div>
    </div>
  );
};
