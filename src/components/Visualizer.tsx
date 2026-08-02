import React from 'react';
import { usePlcStore } from '../store/usePlcStore';
import { AlertTriangle, ShieldAlert, Volume2, OctagonAlert } from 'lucide-react';

export const Visualizer: React.FC = () => {
  const {
    inputs,
    outputs,
    gateAngle,
    vehiclePos,
    isVehicleInLane,
    gateState,
    watchdogTimeMs,
    autoCloseTimeMs,
  } = usePlcStore();

  const isEStopActive = !inputs.E_Stop;
  const isObstruction = inputs.Sensor_Obstruction;
  const isStuckAlarm = outputs.Alarm_StuckGate;

  const vehicleSvgX = 370 + (vehiclePos / 100) * 320;

  return (
    <div className="relative w-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
            M580 GATESIM-01
          </span>
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            Automated Barrier Gate
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 shadow-inner ${
              gateState === 'FAULT'
                ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse'
                : gateState === 'OPENING' || gateState === 'CLOSING'
                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                : gateState === 'OPEN'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            {gateState === 'FAULT' && <OctagonAlert className="w-3.5 h-3.5" />}
            STATE: {gateState}
          </span>
        </div>
      </div>

      {/* Main SVG Simulation Canvas */}
      <div className="relative w-full aspect-[16/9] max-h-[460px] bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center overflow-hidden">
        <svg
          viewBox="0 0 800 450"
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="roadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            <linearGradient id="armGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="25%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#f87171" />
              <stop offset="75%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>

            <linearGradient id="cabinetGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            <filter id="glowRed" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowGreen" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowYellow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Sky / Wall */}
          <rect x="0" y="0" width="800" height="230" fill="#090d16" />
          <path d="M0,230 L800,230" stroke="#334155" strokeWidth="2" />
          <path d="M0,120 L800,120" stroke="#1e293b" strokeWidth="1" strokeDasharray="10,10" />

          {/* Road / Asphalt */}
          <rect x="0" y="230" width="800" height="220" fill="url(#roadGrad)" />
          
          {/* Curb lines */}
          <rect x="0" y="225" width="800" height="10" fill="#475569" />
          <rect x="0" y="415" width="800" height="10" fill="#334155" />

          {/* Yellow Lane Center Stripes */}
          <line x1="20" y1="325" x2="120" y2="325" stroke="#eab308" strokeWidth="4" strokeDasharray="15,10" opacity="0.8" />
          <line x1="160" y1="325" x2="300" y2="325" stroke="#eab308" strokeWidth="4" strokeDasharray="15,10" opacity="0.8" />
          <line x1="450" y1="325" x2="600" y2="325" stroke="#eab308" strokeWidth="4" strokeDasharray="15,10" opacity="0.8" />
          <line x1="640" y1="325" x2="780" y2="325" stroke="#eab308" strokeWidth="4" strokeDasharray="15,10" opacity="0.8" />

          {/* Inductive Vehicle Detector Loop (In Ground) */}
          <rect
            x="310"
            y="260"
            width="120"
            height="130"
            rx="8"
            fill="none"
            stroke={inputs.Sensor_VehiclePresence ? '#10b981' : '#64748b'}
            strokeWidth={inputs.Sensor_VehiclePresence ? '4' : '2'}
            strokeDasharray={inputs.Sensor_VehiclePresence ? 'none' : '6,4'}
            className="transition-all duration-300"
          />
          <text x="370" y="380" textAnchor="middle" fill={inputs.Sensor_VehiclePresence ? '#34d399' : '#64748b'} fontSize="10" fontFamily="monospace" fontWeight="bold">
            INDUCTIVE LOOP {inputs.Sensor_VehiclePresence ? '[DETECTED]' : ''}
          </text>

          {/* Safety Photoeye Beam Path */}
          <line
            x1="390"
            y1="230"
            x2="390"
            y2="415"
            stroke={isObstruction ? '#ef4444' : '#0ea5e9'}
            strokeWidth={isObstruction ? '3' : '1'}
            strokeDasharray={isObstruction ? 'none' : '4,4'}
            opacity={isObstruction ? '0.9' : '0.4'}
          />
          <circle cx="390" cy="230" r="4" fill="#0ea5e9" />
          <circle cx="390" cy="415" r="4" fill="#0ea5e9" />

          {/* Simulated Vehicle */}
          {isVehicleInLane && (
            <g transform={`translate(${vehicleSvgX - 60}, 275)`}>
              <rect x="5" y="55" width="110" height="12" rx="6" fill="#000000" opacity="0.6" />
              <rect x="0" y="20" width="120" height="38" rx="8" fill="#2563eb" stroke="#1d4ed8" strokeWidth="2" />
              <path d="M25,20 L45,5 L85,5 L100,20 Z" fill="#1e40af" stroke="#1d4ed8" strokeWidth="1.5" />
              <path d="M30,18 L47,8 L65,8 L65,18 Z" fill="#93c5fd" opacity="0.8" />
              <path d="M70,8 L83,8 L95,18 L70,18 Z" fill="#93c5fd" opacity="0.8" />
              <circle cx="25" cy="55" r="10" fill="#0f172a" stroke="#475569" strokeWidth="3" />
              <circle cx="95" cy="55" r="10" fill="#0f172a" stroke="#475569" strokeWidth="3" />
              <circle cx="116" cy="30" r="4" fill="#fef08a" filter="url(#glowYellow)" />
              <text x="60" y="38" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
                TEST CAR
              </text>
            </g>
          )}

          {/* Gate Mechanism Cabinet */}
          <rect x="420" y="170" width="45" height="100" rx="4" fill="url(#cabinetGrad)" stroke="#1e3a8a" strokeWidth="2" />
          <rect x="428" y="180" width="29" height="18" rx="2" fill="#0f172a" />
          <line x1="425" y1="205" x2="460" y2="205" stroke="#1d4ed8" strokeWidth="1" />
          <circle cx="452" cy="235" r="2" fill="#94a3b8" />

          {/* Gate Pivot Hub & Arm Group */}
          <g transform="translate(442, 190)">
            <g transform={`rotate(${-gateAngle})`}>
              <rect x="-240" y="-8" width="240" height="16" rx="4" fill="url(#armGrad)" stroke="#b91c1c" strokeWidth="1" />
              <rect x="-220" y="-8" width="20" height="16" fill="#ef4444" />
              <rect x="-160" y="-8" width="20" height="16" fill="#ef4444" />
              <rect x="-100" y="-8" width="20" height="16" fill="#ef4444" />
              <rect x="-40" y="-8" width="20" height="16" fill="#ef4444" />
              <circle cx="-230" cy="0" r="3" fill="#fef08a" />
            </g>
            <circle cx="0" cy="0" r="14" fill="#334155" stroke="#0f172a" strokeWidth="3" />
            <circle cx="0" cy="0" r="6" fill="#94a3b8" />
          </g>

          {/* Traffic Light Structure */}
          <g transform="translate(485, 110)">
            <rect x="18" y="70" width="8" height="100" fill="#475569" />
            <rect x="5" y="0" width="34" height="70" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="2" />
            <circle
              cx="22"
              cy="20"
              r="11"
              fill={outputs.Light_Red ? '#ef4444' : '#451a1a'}
              stroke="#7f1d1d"
              strokeWidth="1.5"
              filter={outputs.Light_Red ? 'url(#glowRed)' : undefined}
            />
            <circle
              cx="22"
              cy="50"
              r="11"
              fill={outputs.Light_Green ? '#10b981' : '#064e3b'}
              stroke="#065f46"
              strokeWidth="1.5"
              filter={outputs.Light_Green ? 'url(#glowGreen)' : undefined}
            />
          </g>

          {/* Audible Buzzer Sound Waves */}
          {outputs.Buzzer && (
            <g transform="translate(442, 150)" className="animate-pulse">
              <circle cx="0" cy="0" r="18" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.8" />
              <circle cx="0" cy="0" r="28" fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.5" />
              <circle cx="0" cy="0" r="38" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.3" />
            </g>
          )}

          {/* Limit Switch Badges */}
          <g transform="translate(20, 20)">
            <rect x="0" y="0" width="130" height="26" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <circle cx="15" cy="13" r="5" fill={inputs.Sensor_GateClosedLimit ? '#10b981' : '#475569'} />
            <text x="28" y="17" fill="#cbd5e1" fontSize="10" fontFamily="monospace">
              CLOSED_LIMIT
            </text>
          </g>

          <g transform="translate(160, 20)">
            <rect x="0" y="0" width="130" height="26" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <circle cx="15" cy="13" r="5" fill={inputs.Sensor_GateOpenLimit ? '#10b981' : '#475569'} />
            <text x="28" y="17" fill="#cbd5e1" fontSize="10" fontFamily="monospace">
              OPEN_LIMIT
            </text>
          </g>

          {/* Motor Contactor Active Badges */}
          {(outputs.Motor_GateUp || outputs.Motor_GateDown) && (
            <g transform="translate(300, 20)">
              <rect x="0" y="0" width="160" height="26" rx="4" fill="#1e1b4b" stroke="#4338ca" strokeWidth="1" />
              <text x="12" y="17" fill="#818cf8" fontSize="11" fontFamily="monospace" fontWeight="bold">
                MOTOR: {outputs.Motor_GateUp ? 'RAISING (UP)' : 'LOWERING (DOWN)'}
              </text>
            </g>
          )}
        </svg>

        {/* Warning Overlays */}
        {isEStopActive && (
          <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-pulse">
            <ShieldAlert className="w-16 h-16 text-red-500 mb-2" />
            <h3 className="text-2xl font-black text-red-100 tracking-wider">HARDWARE EMERGENCY STOP ACTIVE</h3>
            <p className="text-red-300 max-w-md text-sm mt-1">
              Safety circuit broken (E_Stop = FALSE). Motors immediately de-energized. Release E-Stop and issue RESET to clear.
            </p>
          </div>
        )}

        {isStuckAlarm && !isEStopActive && (
          <div className="absolute inset-0 bg-amber-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mb-2 animate-bounce" />
            <h3 className="text-2xl font-black text-amber-100 tracking-wider">ALARM: STUCK GATE WATCHDOG</h3>
            <p className="text-amber-200 max-w-md text-sm mt-1">
              Gate travel exceeded watchdog limit (8s) without reaching expected limit switch. Motors halted.
            </p>
          </div>
        )}
      </div>

      {/* Real-time Status Overlay Bar */}
      <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
          <span className="text-slate-400">Gate Angle:</span>
          <span className="font-bold text-amber-400">{Math.round(gateAngle)}°</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
          <span className="text-slate-400">Watchdog Timer:</span>
          <span className="font-bold text-slate-200">{(watchdogTimeMs / 1000).toFixed(1)}s / 8.0s</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
          <span className="text-slate-400">Auto-Close Timer:</span>
          <span className="font-bold text-slate-200">{(autoCloseTimeMs / 1000).toFixed(1)}s / 5.0s</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
          <span className="text-slate-400">Audible Alarm:</span>
          <span className={`font-bold flex items-center gap-1 ${outputs.Buzzer ? 'text-amber-400' : 'text-slate-500'}`}>
            <Volume2 className="w-3.5 h-3.5" />
            {outputs.Buzzer ? 'ACTIVE' : 'OFF'}
          </span>
        </div>
      </div>
    </div>
  );
};
