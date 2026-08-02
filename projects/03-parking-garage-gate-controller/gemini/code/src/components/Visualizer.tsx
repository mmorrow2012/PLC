import React from 'react';
import { usePlcStore } from '../store/usePlcStore';

export const Visualizer: React.FC = () => {
  const {
    inputs,
    outputs,
    availableSpots,
    totalCapacity,
    entryGatePos,
    exitGatePos,
    carProgress,
    carDirection,
    isSimulating,
    runCarSequence,
  } = usePlcStore();

  // 2D Arm visual rotation angles:
  // CLOSED (0% pos) = 90deg (PERPENDICULAR across lane - BLOCKED!)
  // OPEN (100% pos) = 0deg (FLUSH along median curb - CLEAR LANE!)
  const entryArmVisualAngle = 90 - (entryGatePos / 100) * 90;
  const exitArmVisualAngle = 90 - (exitGatePos / 100) * 90;

  // Entry Car X position (Top Lane: Left -> Right into garage)
  let entryCarX = -200;
  if (carDirection === 'entry') {
    entryCarX = 50 + (carProgress / 100) * 850;
  } else if (inputs.entryLoop) {
    entryCarX = 220; // Stopped at entry loop & kiosk
  }

  // Exit Car X position (Bottom Lane: Right -> Left out into street)
  let exitCarX = -200;
  if (carDirection === 'exit') {
    exitCarX = 900 - (carProgress / 100) * 850;
  } else if (inputs.exitLoop) {
    exitCarX = 680; // Stopped at exit loop
  }

  const getGateStatusBadge = (isOpenLS: boolean, isCloseLS: boolean, pos: number) => {
    const text = isOpenLS ? 'OPEN' : isCloseLS ? 'CLOSED' : pos > 0 && pos < 100 ? 'MOVING...' : 'CLOSED';
    return (
      <span
        className={`font-bold px-2 py-0.5 rounded text-[11px] font-mono ${
          isOpenLS
            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
            : isCloseLS
            ? 'bg-rose-950 text-rose-400 border border-rose-800'
            : 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
        }`}
      >
        {text} ({pos.toFixed(0)}%)
      </span>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-5 shadow-2xl">
      {/* SCADA Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-lg font-bold text-slate-100 font-mono tracking-wide uppercase">
            Garage Dual-Lane Independent Barrier SCADA
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Capacity Display Badge */}
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-xs flex items-center gap-2">
            <span className="text-slate-400">SPOTS:</span>
            <span className={`font-bold ${availableSpots > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {availableSpots} / {totalCapacity}
            </span>
          </div>

          {/* Entry Gate Badge */}
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs flex items-center gap-2">
            <span className="text-slate-400 font-mono">ENTRY:</span>
            {getGateStatusBadge(inputs.entryGateOpenLS, inputs.entryGateCloseLS, entryGatePos)}
          </div>

          {/* Exit Gate Badge */}
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs flex items-center gap-2">
            <span className="text-slate-400 font-mono">EXIT:</span>
            {getGateStatusBadge(inputs.exitGateOpenLS, inputs.exitGateCloseLS, exitGatePos)}
          </div>
        </div>
      </div>

      {/* Quick Automated Sequence Simulator Buttons */}
      <div className="flex flex-wrap gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
        <span className="text-xs font-mono text-slate-400 flex items-center font-bold">1-Click Auto Simulation:</span>
        <button
          onClick={() => runCarSequence('entry')}
          disabled={isSimulating}
          className={`px-4 py-2 rounded-md font-mono text-xs font-bold flex items-center gap-2 transition-all ${
            isSimulating && carDirection === 'entry'
              ? 'bg-emerald-600 text-white animate-pulse shadow-lg shadow-emerald-500/20'
              : 'bg-emerald-700 hover:bg-emerald-600 text-white active:scale-95'
          } ${isSimulating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          🚗 ENTRY CAR (Cyan Car ➔ Top Lane ➔ Open Entry Barrier ONLY ➔ Enter Garage)
        </button>

        <button
          onClick={() => runCarSequence('exit')}
          disabled={isSimulating}
          className={`px-4 py-2 rounded-md font-mono text-xs font-bold flex items-center gap-2 transition-all ${
            isSimulating && carDirection === 'exit'
              ? 'bg-amber-600 text-white animate-pulse shadow-lg shadow-amber-500/20'
              : 'bg-amber-700 hover:bg-amber-600 text-white active:scale-95'
          } ${isSimulating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          🏎️ EXIT CAR (Orange Car ➔ Bottom Lane ➔ Open Exit Barrier ONLY ➔ Exit to Street)
        </button>
      </div>

      {/* 2D SVG Interactive SCADA Dual-Lane Environment */}
      <div className="relative w-full h-88 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center p-2">
        <svg className="w-full h-full select-none" viewBox="0 0 1000 360">
          <defs>
            {/* Asphalt Road Pattern */}
            <linearGradient id="roadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Red & White Reflector Stripes for Barrier Arm */}
            <pattern id="barrierStripe" width="20" height="10" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="10" height="10" fill="#ef4444" />
              <rect x="10" y="0" width="10" height="10" fill="#ffffff" />
            </pattern>
          </defs>

          {/* DUAL ROADWAY LANES */}
          {/* Top Entry Lane (Left -> Right) */}
          <rect x="20" y="30" width="960" height="120" fill="url(#roadGrad)" rx="8" stroke="#334155" strokeWidth="2" />
          {/* Bottom Exit Lane (Right -> Left) */}
          <rect x="20" y="210" width="960" height="120" fill="url(#roadGrad)" rx="8" stroke="#334155" strokeWidth="2" />

          {/* Central Concrete Divider Median Island */}
          <rect x="20" y="150" width="960" height="60" fill="#334155" stroke="#475569" strokeWidth="2" />
          <line x1="20" y1="180" x2="980" y2="180" stroke="#f59e0b" strokeWidth="2" strokeDasharray="12 8" />
          <text x="500" y="184" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            CENTRAL MEDIAN ISLAND
          </text>

          {/* Lane Directional Labels */}
          <text x="60" y="55" fill="#38bdf8" fontSize="11" fontFamily="monospace" fontWeight="bold">
            ENTRY LANE ➔ (INTO GARAGE)
          </text>
          <text x="940" y="315" fill="#f97316" fontSize="11" fontFamily="monospace" textAnchor="end" fontWeight="bold">
            ◄ EXIT LANE (OUT TO STREET)
          </text>

          {/* 1. ENTRY INDUCTIVE LOOP COIL (Top Lane) */}
          <g transform="translate(200, 45)">
            <rect
              x="0"
              y="0"
              width="90"
              height="90"
              rx="6"
              fill={inputs.entryLoop ? 'rgba(16, 185, 129, 0.25)' : 'none'}
              stroke={inputs.entryLoop ? '#10b981' : '#475569'}
              strokeWidth={inputs.entryLoop ? '3' : '2'}
              strokeDasharray={inputs.entryLoop ? '0' : '4 3'}
              className="transition-all duration-200"
            />
            <text x="45" y="50" fill={inputs.entryLoop ? '#34d399' : '#64748b'} fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              Entry Loop
            </text>
          </g>

          {/* 2. EXIT INDUCTIVE LOOP COIL (Bottom Lane) */}
          <g transform="translate(650, 225)">
            <rect
              x="0"
              y="0"
              width="90"
              height="90"
              rx="6"
              fill={inputs.exitLoop ? 'rgba(16, 185, 129, 0.25)' : 'none'}
              stroke={inputs.exitLoop ? '#10b981' : '#475569'}
              strokeWidth={inputs.exitLoop ? '3' : '2'}
              strokeDasharray={inputs.exitLoop ? '0' : '4 3'}
              className="transition-all duration-200"
            />
            <text x="45" y="50" fill={inputs.exitLoop ? '#34d399' : '#64748b'} fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              Exit Loop
            </text>
          </g>

          {/* 3. SAFETY PHOTOCELL SENSOR BEAM ACROSS LANES */}
          <g transform="translate(480, 30)">
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="300"
              stroke={inputs.safetyPhotocell ? '#ef4444' : '#38bdf8'}
              strokeWidth={inputs.safetyPhotocell ? '4' : '2'}
              strokeDasharray={inputs.safetyPhotocell ? '0' : '4 4'}
              className={inputs.safetyPhotocell ? 'animate-pulse' : 'opacity-70'}
            />
            <circle cx="0" cy="0" r="5" fill={inputs.safetyPhotocell ? '#ef4444' : '#0284c7'} />
            <circle cx="0" cy="300" r="5" fill={inputs.safetyPhotocell ? '#ef4444' : '#0284c7'} />
            <text x="-48" y="150" fill={inputs.safetyPhotocell ? '#f87171' : '#38bdf8'} fontSize="9" fontFamily="monospace" fontWeight="bold">
              Photocell
            </text>
          </g>

          {/* 4. TICKET DISPENSER KIOSK (Top Entry Lane Side) */}
          <g transform="translate(290, 0)">
            <rect x="0" y="0" width="36" height="30" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
            <rect x="6" y="4" width="24" height="10" rx="2" fill="#0284c7" />
            <text x="18" y="11" fill="#ffffff" fontSize="7" fontFamily="monospace" textAnchor="middle">
              TICKET
            </text>
            <circle cx="18" cy="21" r="3" fill={inputs.ticketButton ? '#38bdf8' : '#0369a1'} stroke="#e0f2fe" strokeWidth="1" />
            {outputs.dispenseTicket && (
              <g transform="translate(10, 24)">
                <rect x="0" y="0" width="16" height="18" rx="1" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" className="animate-bounce" />
                <line x1="3" y1="5" x2="13" y2="5" stroke="#854d0e" strokeWidth="1" />
              </g>
            )}
            <text x="18" y="-4" fill="#38bdf8" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              Kiosk
            </text>
          </g>

          {/* 5. TRAFFIC LIGHT BEACON SIGNAL POST (Central Median) */}
          <g transform="translate(430, 155)">
            <rect x="0" y="0" width="22" height="50" rx="4" fill="#090d16" stroke="#334155" strokeWidth="2" />
            {/* Entry Red / Green Light */}
            <circle
              cx="11"
              cy="12"
              r="6"
              fill={outputs.entryGreenLight ? '#10b981' : '#ef4444'}
              className={outputs.entryGreenLight ? 'shadow-[0_0_12px_#10b981]' : 'shadow-[0_0_12px_#ef4444]'}
            />
            <text x="11" y="24" fill="#64748b" fontSize="6" fontFamily="monospace" textAnchor="middle">
              IN
            </text>
            {/* Exit Red / Green Light */}
            <circle
              cx="11"
              cy="38"
              r="6"
              fill={outputs.exitGreenLight ? '#10b981' : '#ef4444'}
              className={outputs.exitGreenLight ? 'shadow-[0_0_12px_#10b981]' : 'shadow-[0_0_12px_#ef4444]'}
            />
          </g>

          {/* 6. INDEPENDENT BARRIER GATE PEDESTALS & ARMS */}

          {/* TOP ENTRY BARRIER GATE */}
          <g transform="translate(480, 150)">
            <rect x="-10" y="-15" width="20" height="25" rx="3" fill="#334155" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="0" cy="-5" r="5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
            {/* Entry Arm rotates 90deg (ACROSS LANE = CLOSED) -> 0deg (PARALLEL CURB = OPEN) */}
            <g transform={`rotate(${-entryArmVisualAngle}, 0, -5)`} className="transition-transform duration-100 ease-linear">
              <rect x="0" y="-4" width="135" height="7" rx="2" fill="url(#barrierStripe)" stroke="#1e293b" strokeWidth="1" />
              <circle cx="130" cy="-0.5" r="3" fill={outputs.entryGateMotorOpen ? '#38bdf8' : '#ef4444'} />
            </g>
            <text x="0" y="-20" fill="#38bdf8" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              Entry Arm ({inputs.entryGateOpenLS ? 'OPEN' : 'CLOSED'})
            </text>
          </g>

          {/* BOTTOM EXIT BARRIER GATE */}
          <g transform="translate(480, 210)">
            <rect x="-10" y="-10" width="20" height="25" rx="3" fill="#334155" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="0" cy="5" r="5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
            {/* Exit Arm rotates 90deg (ACROSS LANE = CLOSED) -> 0deg (PARALLEL CURB = OPEN) */}
            <g transform={`rotate(${exitArmVisualAngle}, 0, 5)`} className="transition-transform duration-100 ease-linear">
              <rect x="0" y="-3" width="135" height="7" rx="2" fill="url(#barrierStripe)" stroke="#1e293b" strokeWidth="1" />
              <circle cx="130" cy="0.5" r="3" fill={outputs.exitGateMotorOpen ? '#38bdf8' : '#ef4444'} />
            </g>
            <text x="0" y="28" fill="#fbbf24" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              Exit Arm ({inputs.exitGateOpenLS ? 'OPEN' : 'CLOSED'})
            </text>
          </g>

          {/* 7. ENTRY CAR (CYAN / BLUE HATCHBACK - TOP LANE LEFT TO RIGHT) */}
          {entryCarX > -150 && (
            <g transform={`translate(${entryCarX}, 65)`} className="transition-transform duration-100 ease-linear">
              {/* Shadow */}
              <ellipse cx="40" cy="30" rx="42" ry="5" fill="#000000" opacity="0.5" />
              {/* Body */}
              <rect x="0" y="8" width="75" height="18" rx="5" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
              <path d="M 20 8 L 30 0 L 50 0 L 60 8 Z" fill="#0369a1" stroke="#38bdf8" strokeWidth="2" />
              <polygon points="32,2 48,2 55,8 26,8" fill="#e0f2fe" opacity="0.85" />
              {/* Headlights pointing right */}
              <circle cx="73" cy="15" r="3" fill="#fef08a" className="shadow-[0_0_8px_#fef08a]" />
              {/* Wheels */}
              <circle cx="18" cy="26" r="6" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="58" cy="26" r="6" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
              <text x="37" y="-6" fill="#38bdf8" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                ENTRY CAR ➔
              </text>
            </g>
          )}

          {/* 8. EXIT CAR (AMBER / ORANGE ESTATE CAR - BOTTOM LANE RIGHT TO LEFT) */}
          {exitCarX > -150 && (
            <g transform={`translate(${exitCarX}, 245)`} className="transition-transform duration-100 ease-linear">
              {/* Shadow */}
              <ellipse cx="40" cy="30" rx="42" ry="5" fill="#000000" opacity="0.5" />
              {/* Body */}
              <rect x="0" y="8" width="75" height="18" rx="5" fill="#d97706" stroke="#f59e0b" strokeWidth="2" />
              <path d="M 15 8 L 25 0 L 55 0 L 60 8 Z" fill="#b45309" stroke="#f59e0b" strokeWidth="2" />
              <polygon points="27,2 53,2 57,8 22,8" fill="#ffedd5" opacity="0.85" />
              {/* Headlights pointing left */}
              <circle cx="2" cy="15" r="3" fill="#fef08a" className="shadow-[0_0_8px_#fef08a]" />
              {/* Wheels */}
              <circle cx="18" cy="26" r="6" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="58" cy="26" r="6" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
              <text x="37" y="-6" fill="#fbbf24" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                ◄ EXIT CAR
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Step-by-Step Demo Instructions Panel */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold text-xs font-mono tracking-wider uppercase">📋 Step-by-Step Demo Instructions</span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">Interactive Guide</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-emerald-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
            <div>
              <p className="font-semibold text-slate-200">1-Click Vehicle Entry Simulation</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Click <strong className="text-emerald-400">🚗 ENTRY CAR</strong> above to watch a cyan car arrive on the top lane, press & take a ticket, open the Entry Barrier ONLY, drive into the garage, and lower the Entry Barrier back to <strong className="text-rose-400">CLOSED</strong>.</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-amber-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
            <div>
              <p className="font-semibold text-slate-200">1-Click Vehicle Exit Simulation</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Click <strong className="text-amber-400">🏎️ EXIT CAR</strong> above to watch an orange car drive out on the bottom lane, automatically triggering the Exit Barrier ONLY to raise, exit to the street, and return to <strong className="text-rose-400">CLOSED</strong>.</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-emerald-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
            <div>
              <p className="font-semibold text-slate-200">Manual Entry Sequence</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Click <strong className="text-slate-300">1. Entry Loop</strong> ➔ click <strong className="text-slate-300">2. Press Ticket PB</strong> ➔ click <strong className="text-amber-400">3. TAKE TICKET 🎟️</strong> to raise the Entry Barrier arm.</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-emerald-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
            <div>
              <p className="font-semibold text-slate-200">Test Anti-Crush Photocell</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Click <strong className="text-rose-400">Safety Photocell</strong> while a gate is lowering to verify obstacle reversing logic.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
