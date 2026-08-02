import React, { useEffect, useRef } from 'react';
import { usePlcStore } from '../store/usePlcStore';

export const Visualizer: React.FC = () => {
  const {
    inputs,
    outputs,
    systemFault,
    parts,
    triggerReset,
    partCountAccept,
    partCountReject,
  } = usePlcStore();

  const isGreenOn = (outputs.Alarm_Tower & 0x01) !== 0;
  const isYellowOn = (outputs.Alarm_Tower & 0x02) !== 0;
  const isRedOn = (outputs.Alarm_Tower & 0x04) !== 0;

  // Ref for conveyor roller animation phase
  const animationRef = useRef<number>(0);
  const rollerAngleRef = useRef<number>(0);

  useEffect(() => {
    const animate = () => {
      if (outputs.VFD_Run) {
        rollerAngleRef.current = (rollerAngleRef.current + outputs.VFD_Speed_Ref * 0.1) % 360;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, [outputs.VFD_Run, outputs.VFD_Speed_Ref]);

  const getPartColorHex = (colorCode: number) => {
    switch (colorCode) {
      case 1:
        return '#ef4444'; // Red (Reject)
      case 2:
        return '#22c55e'; // Green (Accept)
      case 3:
        return '#3b82f6'; // Blue (Special)
      default:
        return '#9ca3af';
    }
  };

  return (
    <div className="relative w-full bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl flex flex-col gap-6 overflow-hidden">
      {/* Top SCADA Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-lg font-bold text-slate-100 tracking-wide uppercase font-mono">
            Modicon M580 Conveyor Visualizer
          </h2>
        </div>

        {/* Light Tower Beacon Simulation */}
        <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
          <span className="text-xs text-slate-400 font-mono uppercase">Beacon Status</span>
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded border border-slate-700">
            {/* Red Light */}
            <div
              className={`w-4 h-4 rounded-full transition-all duration-200 ${`
                ${isRedOn ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-red-950 opacity-40'}
              `}`}
              title="Bit 2: Red Fault"
            />
            {/* Yellow Light */}
            <div
              className={`w-4 h-4 rounded-full transition-all duration-200 ${`
                ${isYellowOn ? 'bg-yellow-400 shadow-[0_0_12px_#facc15]' : 'bg-yellow-950 opacity-40'}
              `}`}
              title="Bit 1: Yellow Warning"
            />
            {/* Green Light */}
            <div
              className={`w-4 h-4 rounded-full transition-all duration-200 ${`
                ${isGreenOn ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]' : 'bg-emerald-950 opacity-40'}
              `}`}
              title="Bit 0: Green Run"
            />
          </div>
        </div>
      </div>

      {/* Interactive SVG Conveyor Line */}
      <div className="relative w-full h-80 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center p-4">
        {/* E-STOP Full Visual Overlay */}
        {!inputs.E_Stop && (
          <div className="absolute inset-0 bg-red-950/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3 animate-pulse">
            <div className="bg-red-600 text-white px-6 py-2 rounded-md font-extrabold text-xl tracking-wider shadow-2xl border-2 border-red-300 uppercase">
              EMERGENCY STOP TRIPPED
            </div>
            <p className="text-red-200 font-mono text-sm">
              Hardware E_Stop Loop Open. Release E-Stop & Press Manual Reset.
            </p>
          </div>
        )}

        {/* Latched Fault Overlay when E-Stop recovered but not Reset */}
        {inputs.E_Stop && systemFault && (
          <div className="absolute inset-0 bg-amber-950/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-3">
            <div className="bg-amber-600 text-slate-950 px-6 py-2 rounded-md font-bold text-lg tracking-wider shadow-xl border border-amber-300 uppercase">
              SYSTEM FAULT LATCHED
            </div>
            <button
              onClick={triggerReset}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-sm rounded-lg shadow-lg border border-cyan-400 transition-all active:scale-95"
            >
              PUSH MANUAL RESET (Reset_PB)
            </button>
          </div>
        )}

        {/* Main Conveyor SVG Graphics */}
        <svg className="w-full h-full text-slate-400 select-none" viewBox="0 0 1000 320">
          <defs>
            {/* Linear Gradient for Conveyor Belt */}
            <linearGradient id="beltGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            {/* Pattern for Moving Belt Texture */}
            <pattern
              id="beltPattern"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${outputs.VFD_Run ? (rollerAngleRef.current * 0.5) % 20 : 0}, 0)`}
            >
              <line x1="0" y1="0" x2="0" y2="20" stroke="#475569" strokeWidth="4" />
            </pattern>
          </defs>

          {/* Main Conveyor Structural Bed */}
          <rect x="50" y="150" width="900" height="40" fill="url(#beltGrad)" rx="6" stroke="#475569" strokeWidth="2" />
          <rect x="50" y="152" width="900" height="36" fill="url(#beltPattern)" opacity="0.6" />

          {/* Main Conveyor Rollers */}
          {Array.from({ length: 19 }).map((_, idx) => {
            const cx = 70 + idx * 48;
            return (
              <g key={idx} transform={`translate(${cx}, 170)`}>
                <circle r="14" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
                <line
                  x1="0"
                  y1="-14"
                  x2="0"
                  y2="14"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  transform={`rotate(${outputs.VFD_Run ? rollerAngleRef.current : 0})`}
                />
              </g>
            );
          })}

          {/* Reject Diverter Off-Ramp Chute */}
          <g transform="translate(500, 170)">
            <path
              d="M 0 20 L 120 110 L 140 110 L 20 20 Z"
              fill="#1e293b"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            <text x="80" y="80" fill="#f59e0b" fontSize="12" fontFamily="monospace" fontWeight="bold">
              REJECT LANE
            </text>
          </g>

          {/* Photoelectric Sensor Station Tower */}
          <g transform="translate(450, 60)">
            {/* Sensor Support Post */}
            <line x1="0" y1="0" x2="0" y2="90" stroke="#64748b" strokeWidth="4" />
            <line x1="0" y1="0" x2="40" y2="0" stroke="#64748b" strokeWidth="4" />
            <rect x="35" y="-10" width="20" height="20" rx="4" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
            {/* Sensor Light Beam */}
            <line
              x1="45"
              y1="10"
              x2="45"
              y2="90"
              stroke={inputs.Sensor_PartDetect ? '#ef4444' : '#06b6d4'}
              strokeWidth={inputs.Sensor_PartDetect ? '3' : '1'}
              strokeDasharray={inputs.Sensor_PartDetect ? '0' : '3 3'}
              className="transition-colors duration-150"
            />
            <text x="-40" y="-15" fill="#38bdf8" fontSize="11" fontFamily="monospace" fontWeight="bold">
              Sensor_PartDetect
            </text>
          </g>

          {/* Solenoid Diverter Arm */}
          <g transform="translate(470, 130)">
            {/* Pivot Axis */}
            <circle cx="0" cy="0" r="8" fill="#475569" stroke="#94a3b8" strokeWidth="2" />
            {/* Diverter Arm Blade */}
            <rect
              x="0"
              y="-6"
              width="70"
              height="12"
              rx="3"
              fill="#eab308"
              stroke="#ca8a04"
              strokeWidth="2"
              transform={`rotate(${outputs.Actuator_Diverter ? 45 : 0})`}
              className="transition-transform duration-300 ease-in-out origin-left"
            />
          </g>

          {/* Conveyor Moving Parts Simulation */}
          {parts.map((part) => {
            // Map part.x (0 to 100) to SVG pixel width (50 to 950)
            const partX = 50 + (part.x / 100) * 850;
            const divertOffsetY = part.diverted ? part.divertProgress * 90 : 0;
            const divertOffsetX = part.diverted ? part.divertProgress * 110 : 0;

            return (
              <g
                key={part.id}
                transform={`translate(${partX + divertOffsetX}, ${135 + divertOffsetY})`}
                className="transition-transform duration-75 ease-linear"
              >
                {/* Box Shape */}
                <rect
                  x="-16"
                  y="-16"
                  width="32"
                  height="32"
                  rx="4"
                  fill={getPartColorHex(part.color)}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="shadow-lg"
                />
                {/* Weight Tag on Box */}
                <text
                  x="0"
                  y="4"
                  fill="#ffffff"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {part.weight}k
                </text>
              </g>
            );
          })}

          {/* Start and End Direction Markers */}
          <text x="60" y="225" fill="#64748b" fontSize="12" fontFamily="monospace">
            INFEED ▶
          </text>
          <text x="870" y="225" fill="#64748b" fontSize="12" fontFamily="monospace">
            OUTFEED (ACCEPT)
          </text>
        </svg>
      </div>

      {/* Step-by-Step Demo Instructions Panel */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold text-xs font-mono tracking-wider uppercase">📋 Step-by-Step Demo Instructions</span>
          </div>
          <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">Interactive Guide</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-cyan-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
            <div>
              <p className="font-semibold text-slate-200">Verify System Safety Interlock</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Ensure E-Stop is normal (NC). If in latched fault, click <strong className="text-cyan-300">PUSH MANUAL RESET</strong> in the visualizer overlay.</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-cyan-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
            <div>
              <p className="font-semibold text-slate-200">Adjust Conveyor Speed VFD</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Drag the <strong className="text-cyan-300">Target Speed Slider</strong> (0-100%) in the Control Panel to regulate motor frequency.</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-cyan-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
            <div>
              <p className="font-semibold text-slate-200">Spawn & Sort Conveyor Packages</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Click <strong className="text-emerald-400">Green (Accept)</strong> or <strong className="text-red-400">Red (Reject)</strong> spawn buttons to send items down the belt.</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
            <span className="bg-cyan-600 text-white font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
            <div>
              <p className="font-semibold text-slate-200">Observe Sorting Actuator & Counters</p>
              <p className="text-slate-400 text-[11px] mt-0.5">As items trigger <span className="text-cyan-300">Sensor_PartDetect</span>, watch the diverter arm route rejected items into the chute and update metrics.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Visualizer Bottom Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="text-xs text-slate-400 font-mono">VFD Status</div>
          <div className="flex items-center gap-2 mt-1">
            <div
              className={`w-3 h-3 rounded-full ${`
                ${outputs.VFD_Run ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}
              `}`}
            />
            <span className="font-mono font-bold text-slate-100">
              {outputs.VFD_Run ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="text-xs text-slate-400 font-mono">VFD Speed Ref</div>
          <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
            {outputs.VFD_Speed_Ref.toFixed(1)} %
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="text-xs text-slate-400 font-mono font-semibold text-emerald-400">Accepted Parts</div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{partCountAccept}</div>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="text-xs text-slate-400 font-mono font-semibold text-amber-400">Rejected Parts</div>
          <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">{partCountReject}</div>
        </div>
      </div>
    </div>
  );
};
