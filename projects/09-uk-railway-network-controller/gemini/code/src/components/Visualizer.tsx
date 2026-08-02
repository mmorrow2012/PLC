import React, { useState } from 'react';
import { usePlcStore } from '../store/usePlcStore';
import { Train, Radio, Info, ChevronRight, Gauge, Clock, Navigation, Zap } from 'lucide-react';

export const Visualizer: React.FC = () => {
  const { stations, trains, timetable, pointSwitchPosition, outputs, inputs } = usePlcStore();
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

  // Map station coordinates for SVG SCADA mimic
  const stationCoords: Record<string, { x: number; y: number; code: string }> = {
    'London Euston': { x: 260, y: 310, code: 'EUS' },
    'Coventry': { x: 220, y: 240, code: 'COV' },
    'Birmingham New St': { x: 190, y: 220, code: 'BHM' },
    'Bristol Temple Meads': { x: 150, y: 290, code: 'BRI' },
    'Liverpool Lime St': { x: 170, y: 160, code: 'LIV' },
    'Manchester Piccadilly': { x: 210, y: 150, code: 'MAN' },
    'Leeds': { x: 240, y: 130, code: 'LDS' },
    'Glasgow Central': { x: 160, y: 50, code: 'GLC' },
    'Edinburgh Waverley': { x: 200, y: 40, code: 'EDB' },
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
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" /> SYSTEM ACTIVE
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

      {/* Main Grid: UK Railway SCADA Map & Live Station Timetable Board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: 2D UK Railway Map graphic (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center relative min-h-[380px]">
          <div className="absolute top-3 left-3 flex items-center gap-2 text-xs font-mono text-sky-400 bg-slate-900/90 px-2.5 py-1 rounded border border-slate-800">
            <Navigation className="w-3.5 h-3.5" /> UK Mainline Network SCADA Mimic
          </div>

          {/* SVG Map */}
          <svg viewBox="0 0 420 360" className="w-full h-full max-h-[360px]">
            {/* Track Network Lines */}
            {/* London ➔ Coventry ➔ Birmingham */}
            <line x1="260" y1="310" x2="220" y2="240" stroke="#334155" strokeWidth="4" strokeDasharray="6,4" />
            <line x1="220" y1="240" x2="190" y2="220" stroke="#334155" strokeWidth="4" strokeDasharray="6,4" />

            {/* Birmingham ➔ Bristol */}
            <line x1="190" y1="220" x2="150" y2="290" stroke="#334155" strokeWidth="4" strokeDasharray="6,4" />

            {/* Birmingham ➔ Liverpool / Manchester */}
            <line x1="190" y1="220" x2="170" y2="160" stroke="#334155" strokeWidth="4" strokeDasharray="6,4" />
            <line x1="190" y1="220" x2="210" y2="150" stroke="#334155" strokeWidth="4" strokeDasharray="6,4" />

            {/* Liverpool ➔ Manchester ➔ Leeds */}
            <line x1="170" y1="160" x2="210" y2="150" stroke="#334155" strokeWidth="4" strokeDasharray="6,4" />
            <line x1="210" y1="150" x2="240" y2="130" stroke="#334155" strokeWidth="4" strokeDasharray="6,4" />

            {/* Manchester/Leeds ➔ Glasgow / Edinburgh */}
            <line x1="210" y1="150" x2="160" y2="50" stroke="#334155" strokeWidth="4" strokeDasharray="6,4" />
            <line x1="240" y1="130" x2="200" y2="40" stroke="#334155" strokeWidth="4" strokeDasharray="6,4" />
            <line x1="160" y1="50" x2="200" y2="40" stroke="#334155" strokeWidth="4" strokeDasharray="6,4" />

            {/* Signal Aspects (LED Head Indicator Rings) */}
            <g transform="translate(235, 270)">
              <circle cx="0" cy="0" r="7" fill="#020617" stroke="#475569" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="4" fill={outputs.signalLondonGreen ? '#10b981' : '#f43f5e'} className="animate-pulse" />
            </g>
            <g transform="translate(180, 200)">
              <circle cx="0" cy="0" r="7" fill="#020617" stroke="#475569" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="4" fill={outputs.signalBrumGreen ? '#10b981' : '#f43f5e'} className="animate-pulse" />
            </g>
            <g transform="translate(200, 130)">
              <circle cx="0" cy="0" r="7" fill="#020617" stroke="#475569" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="4" fill={outputs.signalManchesterGreen ? '#10b981' : '#f43f5e'} className="animate-pulse" />
            </g>

            {/* Motorized Point Switch Graphic */}
            <g transform="translate(195, 185)">
              <rect x="-14" y="-8" width="28" height="16" rx="3" fill="#0f172a" stroke="#0284c7" strokeWidth="1" />
              <text x="0" y="3" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                PT:{pointSwitchPosition}
              </text>
            </g>

            {/* Stations Rendering */}
            {Object.entries(stationCoords).map(([name, pos]) => (
              <g key={name} transform={`translate(${pos.x}, ${pos.y})`}>
                <circle cx="0" cy="0" r="6" fill="#0284c7" stroke="#f8fafc" strokeWidth="2" />
                <rect x="-24" y="-20" width="48" height="12" rx="2" fill="#0f172a" stroke="#1e293b" />
                <text x="0" y="-11" textAnchor="middle" fill="#f8fafc" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
                  {pos.code}
                </text>
              </g>
            ))}

            {/* Active Moving Train Markers */}
            {trains.map((train, idx) => {
              const startName = stations[train.currentStationIndex];
              const nextName = stations[(train.currentStationIndex + 1) % stations.length];
              const p1 = stationCoords[startName] || { x: 200, y: 200 };
              const p2 = stationCoords[nextName] || { x: 200, y: 200 };

              const trainX = p1.x + (p2.x - p1.x) * train.progressBetweenStations;
              const trainY = p1.y + (p2.y - p1.y) * train.progressBetweenStations;

              const isTrain1 = idx === 0;

              return (
                <g key={train.id} transform={`translate(${trainX}, ${trainY})`}>
                  <rect
                    x="-18"
                    y="-10"
                    width="36"
                    height="20"
                    rx="4"
                    fill={isTrain1 ? '#0284c7' : '#0d9488'}
                    stroke="#f8fafc"
                    strokeWidth="1.5"
                    className="shadow-lg"
                  />
                  <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
                    T{idx + 1}:{train.speedKmH.toFixed(0)}k
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right Column: Station PIS Live Timetable Board (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Clock className="w-4 h-4 text-amber-400" /> Station PIS Live Timetable Board
            </h3>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              NETWORK SCHED
            </span>
          </div>

          {/* Timetable Entries */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[320px] font-mono">
            {timetable.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-2.5 flex flex-col gap-1 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-100">
                  <span className="text-sky-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-sky-400" /> {item.trainName}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
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
                  <span className="text-slate-400 text-[10px]">{item.platform}</span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/60 pt-1 mt-0.5">
                  <span>Next: {item.nextStation}</span>
                  <span>
                    Sch: {item.scheduledTime} | Est: <strong className="text-slate-300">{item.estimatedTime}</strong>
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
