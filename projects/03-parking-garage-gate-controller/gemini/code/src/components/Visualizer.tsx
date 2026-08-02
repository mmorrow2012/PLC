import React from 'react';
import { usePlcStore } from '../store/usePlcStore';

export const Visualizer: React.FC = () => {
  const {
    inputs,
    outputs,
    availableSpots,
    totalCapacity,
    gatePosition,
    carProgress,
    carDirection,
    isSimulating,
    runCarSequence,
  } = usePlcStore();

  // Arm rotation angle: 0deg = horizontal (CLOSED), 80deg = vertical (OPEN)
  const armAngle = (gatePosition / 100) * 80;

  // Car X position in SVG viewBox (0 to 1000 width)
  // Entry: moves from 50 (left) to 900 (right into garage)
  // Exit: moves from 900 (right inside garage) out to 50 (left street)
  let carX = -200; // Off-screen by default if no car
  if (carDirection === 'entry') {
    carX = 50 + (carProgress / 100) * 850;
  } else if (carDirection === 'exit') {
    carX = 900 - (carProgress / 100) * 850;
  } else if (inputs.entryLoop) {
    carX = 220; // Stopped at entry loop
  } else if (inputs.exitLoop) {
    carX = 680; // Stopped at exit loop
  }

  const gateStatusText = inputs.gateOpenLS
    ? 'OPEN'
    : inputs.gateCloseLS
    ? 'CLOSED'
    : outputs.gateMotorOpen
    ? 'RAISING...'
    : outputs.gateMotorClose
    ? 'LOWERING...'
    : 'PARTIAL';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-5 shadow-2xl">
      {/* SCADA Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-lg font-bold text-slate-100 font-mono tracking-wide uppercase">
            Garage Barrier Gate SCADA Visualizer
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Capacity Display Badge */}
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-xs flex items-center gap-2">
            <span className="text-slate-400">GARAGE SPOTS:</span>
            <span className={`font-bold ${availableSpots > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {availableSpots} / {totalCapacity} {availableSpots === 0 && '(FULL)'}
            </span>
          </div>

          {/* Gate Status Badge */}
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-xs flex items-center gap-2">
            <span className="text-slate-400">GATE:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                inputs.gateOpenLS
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : inputs.gateCloseLS
                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
              }`}
            >
              {gateStatusText} ({gatePosition.toFixed(0)}%)
            </span>
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
          🚗 SIMULATE VEHICLE ENTRY (Arrive ➔ Ticket ➔ Open ➔ Enter ➔ Close)
        </button>

        <button
          onClick={() => runCarSequence('exit')}
          disabled={isSimulating}
          className={`px-4 py-2 rounded-md font-mono text-xs font-bold flex items-center gap-2 transition-all ${
            isSimulating && carDirection === 'exit'
              ? 'bg-sky-600 text-white animate-pulse shadow-lg shadow-sky-500/20'
              : 'bg-sky-700 hover:bg-sky-600 text-white active:scale-95'
          } ${isSimulating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          🏎️ SIMULATE VEHICLE EXIT (Approach ➔ Auto Open ➔ Exit ➔ Close)
        </button>
      </div>

      {/* 2D SVG Interactive SCADA Environment */}
      <div className="relative w-full h-80 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center p-2">
        <svg className="w-full h-full select-none" viewBox="0 0 1000 320">
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

          {/* Garage Driveway Road */}
          <rect x="20" y="160" width="960" height="110" fill="url(#roadGrad)" rx="8" stroke="#334155" strokeWidth="2" />
          
          {/* Double Center Road Line */}
          <line x1="20" y1="215" x2="980" y2="215" stroke="#f59e0b" strokeWidth="3" strokeDasharray="12 8" opacity="0.7" />

          {/* Road Markings & Directional Arrows */}
          <text x="60" y="245" fill="#64748b" fontSize="12" fontFamily="monospace" fontWeight="bold">
            STREET INFEED ▶
          </text>
          <text x="760" y="245" fill="#64748b" fontSize="12" fontFamily="monospace" fontWeight="bold">
            GARAGE INTERIOR 🏢
          </text>

          {/* 1. ENTRY INDUCTIVE LOOP COIL IN ROAD */}
          <g transform="translate(200, 175)">
            <rect
              x="0"
              y="0"
              width="90"
              height="80"
              rx="6"
              fill={inputs.entryLoop ? 'rgba(16, 185, 129, 0.25)' : 'none'}
              stroke={inputs.entryLoop ? '#10b981' : '#475569'}
              strokeWidth={inputs.entryLoop ? '3' : '2'}
              strokeDasharray={inputs.entryLoop ? '0' : '4 3'}
              className="transition-all duration-200"
            />
            <text x="45" y="45" fill={inputs.entryLoop ? '#34d399' : '#64748b'} fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              Entry Loop
            </text>
          </g>

          {/* 2. EXIT INDUCTIVE LOOP COIL IN ROAD */}
          <g transform="translate(650, 175)">
            <rect
              x="0"
              y="0"
              width="90"
              height="80"
              rx="6"
              fill={inputs.exitLoop ? 'rgba(16, 185, 129, 0.25)' : 'none'}
              stroke={inputs.exitLoop ? '#10b981' : '#475569'}
              strokeWidth={inputs.exitLoop ? '3' : '2'}
              strokeDasharray={inputs.exitLoop ? '0' : '4 3'}
              className="transition-all duration-200"
            />
            <text x="45" y="45" fill={inputs.exitLoop ? '#34d399' : '#64748b'} fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              Exit Loop
            </text>
          </g>

          {/* 3. SAFETY PHOTOCELL SENSOR BEAM */}
          <g transform="translate(480, 160)">
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="110"
              stroke={inputs.safetyPhotocell ? '#ef4444' : '#38bdf8'}
              strokeWidth={inputs.safetyPhotocell ? '4' : '2'}
              strokeDasharray={inputs.safetyPhotocell ? '0' : '4 4'}
              className={inputs.safetyPhotocell ? 'animate-pulse' : 'opacity-70'}
            />
            <circle cx="0" cy="0" r="4" fill={inputs.safetyPhotocell ? '#ef4444' : '#0284c7'} />
            <circle cx="0" cy="110" r="4" fill={inputs.safetyPhotocell ? '#ef4444' : '#0284c7'} />
            <text x="-45" y="55" fill={inputs.safetyPhotocell ? '#f87171' : '#38bdf8'} fontSize="9" fontFamily="monospace" fontWeight="bold">
              Photocell
            </text>
          </g>

          {/* 4. TICKET DISPENSER KIOSK */}
          <g transform="translate(290, 70)">
            {/* Kiosk Post & Body */}
            <rect x="0" y="0" width="36" height="90" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
            {/* Screen */}
            <rect x="6" y="10" width="24" height="16" rx="2" fill="#0284c7" />
            <text x="18" y="22" fill="#ffffff" fontSize="8" fontFamily="monospace" textAnchor="middle">
              TICKET
            </text>
            {/* Pushbutton */}
            <circle
              cx="18"
              cy="40"
              r="6"
              fill={inputs.ticketButton ? '#38bdf8' : '#0369a1'}
              stroke="#e0f2fe"
              strokeWidth="1.5"
            />
            {/* Dispensed Ticket Slot & Paper */}
            {outputs.dispenseTicket && (
              <g transform="translate(10, 55)">
                <rect x="0" y="0" width="16" height="24" rx="1" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" className="animate-bounce" />
                <line x1="3" y1="6" x2="13" y2="6" stroke="#854d0e" strokeWidth="1" />
                <line x1="3" y1="12" x2="13" y2="12" stroke="#854d0e" strokeWidth="1" />
              </g>
            )}
            <text x="18" y="-8" fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              Kiosk
            </text>
          </g>

          {/* 5. TRAFFIC LIGHT BEACON SIGNAL POST */}
          <g transform="translate(430, 50)">
            <line x1="12" y1="40" x2="12" y2="110" stroke="#475569" strokeWidth="4" />
            {/* Signal Box */}
            <rect x="0" y="0" width="24" height="46" rx="4" fill="#090d16" stroke="#334155" strokeWidth="2" />
            {/* Red Light */}
            <circle
              cx="12"
              cy="12"
              r="8"
              fill={outputs.redLight ? '#ef4444' : '#450a0a'}
              className={outputs.redLight ? 'shadow-[0_0_12px_#ef4444]' : 'opacity-40'}
            />
            {/* Green Light */}
            <circle
              cx="12"
              cy="34"
              r="8"
              fill={outputs.greenLight ? '#10b981' : '#064e3b'}
              className={outputs.greenLight ? 'shadow-[0_0_12px_#10b981]' : 'opacity-40'}
            />
          </g>

          {/* 6. BARRIER GATE PEDESTAL & ROTATING GATE ARM */}
          <g transform="translate(480, 165)">
            {/* Heavy Duty Gate Pedestal Housing */}
            <rect x="-14" y="-45" width="28" height="45" rx="4" fill="#334155" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="0" cy="-30" r="7" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />

            {/* Rotating Barrier Arm (Pivot around cx=0, cy=-30) */}
            <g transform={`rotate(${-armAngle}, 0, -30)`} className="transition-transform duration-100 ease-linear">
              {/* Main Arm Blade */}
              <rect x="0" y="-35" width="180" height="10" rx="3" fill="url(#barrierStripe)" stroke="#1e293b" strokeWidth="1.5" />
              {/* Tip Reflector Light */}
              <circle cx="175" cy="-30" r="4" fill={outputs.gateMotorOpen ? '#38bdf8' : '#ef4444'} />
            </g>
            <text x="0" y="15" fill="#e2e8f0" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              Barrier Arm
            </text>
          </g>

          {/* 7. ANIMATED VEHICLE / SEDAN GRAPHIC */}
          {(carX > -150) && (
            <g transform={`translate(${carX}, 185)`} className="transition-transform duration-100 ease-linear">
              {/* Car Shadow */}
              <ellipse cx="40" cy="32" rx="45" ry="6" fill="#000000" opacity="0.5" />

              {/* Car Body Base */}
              <rect x="0" y="10" width="80" height="20" rx="6" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
              {/* Car Roof Cabin */}
              <path d="M 20 10 L 30 0 L 55 0 L 65 10 Z" fill="#0369a1" stroke="#38bdf8" strokeWidth="2" />
              {/* Windows */}
              <polygon points="32,2 52,2 60,10 26,10" fill="#e0f2fe" opacity="0.8" />

              {/* Headlights */}
              <circle cx="78" cy="18" r="3" fill="#fef08a" className="shadow-[0_0_8px_#fef08a]" />

              {/* Wheels */}
              <circle cx="18" cy="30" r="7" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="62" cy="30" r="7" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />

              <text x="40" y="-8" fill="#ffffff" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                VEHICLE
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
              <p className="font-semibold text-slate-200">1-Click Auto Vehicle Simulation</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Click <strong className="text-emerald-400">🚗 SIMULATE VEHICLE ENTRY</strong> above to watch a sedan arrive, take a ticket, open the gate, drive in, and lower the gate back to <strong className="text-rose-400">CLOSED</strong>.</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-emerald-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
            <div>
              <p className="font-semibold text-slate-200">Manual Entry Sequence</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Click <strong className="text-slate-300">1. Entry Loop</strong> ➔ click <strong className="text-slate-300">2. Press Ticket PB</strong> ➔ click <strong className="text-amber-400">3. TAKE TICKET 🎟️</strong> to raise the gate arm.</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-emerald-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
            <div>
              <p className="font-semibold text-slate-200">Drive Through & Close Gate</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Clear Entry Loop and toggle <strong className="text-slate-300">4. Exit Loop</strong> to simulate car passing. When both loops clear, gate automatically lowers to <strong className="text-rose-400">CLOSED</strong>.</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-emerald-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
            <div>
              <p className="font-semibold text-slate-200">Test Anti-Crush Photocell</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Click <strong className="text-rose-400">Safety Photocell</strong> while gate is lowering to verify obstacle reversing logic.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
