import React, { useState } from 'react';
import { usePlcStore } from '../store/usePlcStore';
import { Train, Radio, Info, ChevronRight, Clock, Navigation, Zap } from 'lucide-react';

export const Visualizer: React.FC = () => {
  const { trains, timetable, pointSwitchPosition, outputs } = usePlcStore();
  const [activeStep, setActiveStep] = useState<number>(1);

  const demoSteps = [
    {
      num: 1,
      title: 'VFD Speed Control & Acceleration',
      desc: 'Use Speed Control Sliders or Speed Up / Slow Down buttons to modulate VFD traction motor setpoints (0-200 km/h) between stations.',
    },
    {
      num: 2,
      title: 'Track Block Interlocking & Signals',
      desc: 'Axle counter sensors detect train presence in track blocks, automatically switching signal heads (Green ➔ Red) to maintain safe braking distance.',
    },
    {
      num: 3,
      title: 'Motorized Point Switch Routing',
      desc: 'Toggle the motorized point switch between MAIN line and BRANCH line to route trains via West Coast / TransPennine corridors.',
    },
    {
      num: 4,
      title: 'Station PIS Live Timetable Board',
      desc: 'Monitor real-time arrivals & departures across London, Coventry, Birmingham, Bristol, Liverpool, Manchester, Leeds, Glasgow & Edinburgh.',
    },
  ];

  // Precise UK Geographical SVG Station Coordinates (600x480 ViewBox)
  const stationCoords: Record<string, { x: number; y: number; code: string; labelX: number; labelY: number }> = {
    'London Euston': { x: 380, y: 420, code: 'EUS', labelX: 380, labelY: 445 },
    'Bristol Temple Meads': { x: 160, y: 410, code: 'BRI', labelX: 160, labelY: 435 },
    'Coventry': { x: 310, y: 320, code: 'COV', labelX: 345, labelY: 320 },
    'Birmingham New St': { x: 240, y: 280, code: 'BHM', labelX: 180, labelY: 280 },
    'Liverpool Lime St': { x: 170, y: 190, code: 'LIV', labelX: 120, labelY: 190 },
    'Manchester Piccadilly': { x: 260, y: 170, code: 'MAN', labelX: 305, labelY: 170 },
    'Leeds': { x: 370, y: 140, code: 'LDS', labelX: 410, labelY: 140 },
    'Glasgow Central': { x: 190, y: 60, code: 'GLC', labelX: 140, labelY: 60 },
    'Edinburgh Waverley': { x: 320, y: 50, code: 'EDB', labelX: 365, labelY: 50 },
  };

  // Official Network Rail Mainline Colors
  const lineColors = {
    wcml: '#ef4444', // Red - West Coast Main Line
    ecml: '#0284c7', // Blue - East Coast Main Line
    gwml: '#22c55e', // Green - Great Western Main Line
    tpe: '#a855f7',  // Purple - TransPennine Express
    xc: '#ec4899',   // Pink - CrossCountry Route
    scot: '#f59e0b', // Amber - ScotRail Express
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-5">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Train className="text-sky-400 w-5 h-5" /> UK Railway Intercity SCADA & Signaling Visualizer
        </h2>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-950 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" /> SCHNEIDER M580 ONLINE
          </span>
        </div>
      </div>

      {/* Guided Walkthrough Card */}
      <div className="bg-slate-950/80 border border-sky-900/40 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-sky-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Info className="w-4 h-4 text-sky-400" /> Guided Railway Demonstration Walkthrough
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
                  ? 'bg-sky-950/60 border-sky-500 text-slate-100 ring-1 ring-sky-500/50'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      activeStep === step.num ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    STEP {step.num}
                  </span>
                  {activeStep === step.num && <ChevronRight className="w-3.5 h-3.5 text-sky-400" />}
                </div>
                <p className="font-bold text-xs text-slate-200 mt-1">{step.title}</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Network Rail Official Color Legend */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex flex-wrap items-center justify-between text-xs font-mono text-slate-300 gap-2">
        <span className="text-slate-400 font-bold uppercase text-[11px]">Network Rail Mainline Corridors:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span>West Coast (WCML)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-sky-500" />
          <span>East Coast (ECML)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Great Western (GWML)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-purple-500" />
          <span>TransPennine (TPE)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-pink-500" />
          <span>CrossCountry (XC)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span>ScotRail Express</span>
        </div>
      </div>

      {/* Main Grid: UK SCADA Map (7 cols) & Station PIS Timetable (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: 2D SCADA SVG Map */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center relative min-h-[460px]">
          <div className="absolute top-3 left-3 flex items-center gap-2 text-xs font-mono text-sky-400 bg-slate-900/90 px-2.5 py-1 rounded border border-slate-800 z-10">
            <Navigation className="w-3.5 h-3.5" /> Network Rail Intercity Mimic
          </div>

          {/* SVG Map (600x480 ViewBox) */}
          <svg viewBox="0 0 600 480" className="w-full h-full max-h-[460px]">
            {/* Background Grid Accent Lines */}
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.5" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="600" height="480" fill="url(#grid)" />

            {/* Official Color-Coded Track Lines */}

            {/* 1. West Coast Main Line (WCML - Red): London ➔ Coventry ➔ Brum ➔ Liverpool ➔ Manch ➔ Glasgow */}
            <path
              d="M 380 420 L 310 320 L 240 280 L 170 190 L 260 170 L 190 60"
              stroke={lineColors.wcml}
              strokeWidth="6"
              fill="none"
              opacity="0.85"
            />
            <path
              d="M 380 420 L 310 320 L 240 280 L 170 190 L 260 170 L 190 60"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeDasharray="6,6"
              fill="none"
            />

            {/* 2. East Coast Main Line (ECML - Blue): London ➔ Leeds ➔ Edinburgh */}
            <path
              d="M 380 420 L 370 140 L 320 50"
              stroke={lineColors.ecml}
              strokeWidth="6"
              fill="none"
              opacity="0.85"
            />
            <path
              d="M 380 420 L 370 140 L 320 50"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeDasharray="6,6"
              fill="none"
            />

            {/* 3. Great Western Main Line (GWML - Green): London ➔ Bristol */}
            <path
              d="M 380 420 L 160 410"
              stroke={lineColors.gwml}
              strokeWidth="6"
              fill="none"
              opacity="0.85"
            />
            <path
              d="M 380 420 L 160 410"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeDasharray="6,6"
              fill="none"
            />

            {/* 4. TransPennine Express (TPE - Purple): Liverpool ➔ Manchester ➔ Leeds */}
            <path
              d="M 170 190 L 260 170 L 370 140"
              stroke={lineColors.tpe}
              strokeWidth="6"
              fill="none"
              opacity="0.85"
            />

            {/* 5. CrossCountry Route (XC - Pink): Bristol ➔ Birmingham ➔ Leeds */}
            <path
              d="M 160 410 L 240 280 L 370 140"
              stroke={lineColors.xc}
              strokeWidth="4"
              strokeDasharray="5,5"
              fill="none"
              opacity="0.8"
            />

            {/* 6. ScotRail Inter-City Express (Amber): Glasgow ↔ Edinburgh */}
            <path
              d="M 190 60 L 320 50"
              stroke={lineColors.scot}
              strokeWidth="5"
              strokeDasharray="4,4"
              fill="none"
              opacity="0.9"
            />

            {/* Signal Gantry Masts (Physical Signal Heads beside track junctions) */}
            {/* Gantry 1: London Euston North Approach */}
            <g transform="translate(365, 380)">
              <line x1="0" y1="0" x2="0" y2="16" stroke="#475569" strokeWidth="2.5" />
              <rect x="-8" y="-12" width="16" height="24" rx="3" fill="#020617" stroke="#475569" strokeWidth="1.5" />
              <circle cx="0" cy="-4" fill={outputs.signalLondonGreen ? '#10b981' : '#f43f5e'} r="4" className="animate-pulse" />
              <circle cx="0" cy="4" fill={outputs.signalLondonGreen ? '#1e293b' : '#f59e0b'} r="4" />
            </g>

            {/* Gantry 2: Birmingham New St Approach */}
            <g transform="translate(225, 310)">
              <line x1="0" y1="0" x2="0" y2="16" stroke="#475569" strokeWidth="2.5" />
              <rect x="-8" y="-12" width="16" height="24" rx="3" fill="#020617" stroke="#475569" strokeWidth="1.5" />
              <circle cx="0" cy="-4" fill={outputs.signalBrumGreen ? '#10b981' : '#f43f5e'} r="4" className="animate-pulse" />
              <circle cx="0" cy="4" fill={outputs.signalBrumGreen ? '#1e293b' : '#f59e0b'} r="4" />
            </g>

            {/* Gantry 3: Manchester Piccadilly Approach */}
            <g transform="translate(245, 195)">
              <line x1="0" y1="0" x2="0" y2="16" stroke="#475569" strokeWidth="2.5" />
              <rect x="-8" y="-12" width="16" height="24" rx="3" fill="#020617" stroke="#475569" strokeWidth="1.5" />
              <circle cx="0" cy="-4" fill={outputs.signalManchesterGreen ? '#10b981' : '#f43f5e'} r="4" className="animate-pulse" />
              <circle cx="0" cy="4" fill={outputs.signalManchesterGreen ? '#1e293b' : '#f59e0b'} r="4" />
            </g>

            {/* Motorized Point Switch Turnout Graphic at Birmingham Hub */}
            <g transform="translate(220, 260)">
              <rect x="-20" y="-10" width="40" height="20" rx="4" fill="#0f172a" stroke="#0284c7" strokeWidth="1.5" />
              <text x="0" y="3" textAnchor="middle" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">
                PT:{pointSwitchPosition}
              </text>
            </g>

            {/* Station Nodes & Clean Non-Overlapping Labels */}
            {Object.entries(stationCoords).map(([name, pos]) => (
              <g key={name}>
                {/* Station Location Ring */}
                <g transform={`translate(${pos.x}, ${pos.y})`}>
                  <circle cx="0" cy="0" r="9" fill="#0284c7" stroke="#f8fafc" strokeWidth="2.5" className="shadow-lg" />
                  <circle cx="0" cy="0" r="3.5" fill="#f8fafc" />
                </g>

                {/* Station Label Badge */}
                <g transform={`translate(${pos.labelX}, ${pos.labelY})`}>
                  <rect
                    x="-42"
                    y="-10"
                    width="84"
                    height="20"
                    rx="4"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    {name.split(' ')[0]} ({pos.code})
                  </text>
                </g>
              </g>
            ))}

            {/* Active Moving Train Markers (Guaranteed 100% On-Track) */}
            {trains.map((train, idx) => {
              const startName = train.route[train.routeStepIndex];
              const nextName = train.route[(train.routeStepIndex + 1) % train.route.length];
              const p1 = stationCoords[startName] || { x: 200, y: 200 };
              const p2 = stationCoords[nextName] || { x: 200, y: 200 };

              const trainX = p1.x + (p2.x - p1.x) * train.progressBetweenStations;
              const trainY = p1.y + (p2.y - p1.y) * train.progressBetweenStations;

              const isTrain1 = idx === 0;

              return (
                <g key={train.id} transform={`translate(${trainX}, ${trainY})`}>
                  <rect
                    x="-24"
                    y="-13"
                    width="48"
                    height="26"
                    rx="5"
                    fill={isTrain1 ? '#0284c7' : '#0d9488'}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="shadow-2xl"
                  />
                  <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace">
                    T{idx + 1}:{train.speedKmH.toFixed(0)}k
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right Column: Station PIS Live Timetable Board (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Clock className="w-4 h-4 text-amber-400" /> Station PIS Live Timetable Board
            </h3>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              NETWORK SCHED
            </span>
          </div>

          {/* Timetable Entries */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[380px] font-mono">
            {timetable.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-3 flex flex-col gap-1.5 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-100">
                  <span className="text-sky-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-sky-400" /> {item.trainName}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.status === 'ON TIME'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : item.status === 'BOARDING'
                        ? 'bg-sky-950 text-sky-300 border border-sky-800 animate-pulse'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-300 pt-0.5">
                  <span>
                    {item.origin} ➔ <strong className="text-slate-100">{item.destination}</strong>
                  </span>
                  <span className="text-slate-400 text-[10px] font-bold px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800">
                    {item.platform}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/60 pt-1 mt-0.5">
                  <span>Next Stop: <strong className="text-slate-300">{item.nextStation}</strong></span>
                  <span>
                    Sch: {item.scheduledTime} | Est: <strong className="text-slate-200">{item.estimatedTime}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
