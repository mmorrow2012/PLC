import React from 'react';
import { usePlcStore } from '../store/usePlcStore';
import { Power, RotateCcw, GitBranch, ArrowUpRight, ArrowDownRight, AlertOctagon, Sliders, ShieldAlert, Radio, Volume2, Gauge } from 'lucide-react';

export const ControlPanel: React.FC = () => {
  const {
    plcRunning,
    togglePlc,
    inputs,
    outputs,
    setEstop,
    trains,
    setTrainSpeed,
    accelerateTrain,
    decelerateTrain,
    pointSwitchPosition,
    togglePointSwitch,
    signalOverrides,
    toggleSignalOverride,
    toggleTsr,
    reassignPlatform,
    triggerReset,
    scanTimeMs,
    cycleCount,
  } = usePlcStore();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-5">
      {/* Header & PLC Run State */}
      <div className="flex flex-wrap justify-between items-center border-b border-slate-800 pb-3 gap-3">
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Sliders className="text-sky-400 w-5 h-5" /> Human Network Controller Console (M580 HMI)
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={togglePlc}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              plcRunning
                ? 'bg-emerald-950 border border-emerald-500 text-emerald-300 shadow-[0_0_12px_#10b98133]'
                : 'bg-slate-800 border border-slate-700 text-slate-400'
            }`}
          >
            <Power className="w-3.5 h-3.5" /> {plcRunning ? 'PLC RUNNING' : 'PLC PAUSED'}
          </button>
        </div>
      </div>

      {/* 5 Trains VFD Traction Motor Speed Control Grid */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-sky-400" /> Individual Train VFD Traction Speed Controllers (5 Trains)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {trains.map((train, idx) => (
            <div
              key={train.id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-xs font-bold font-mono" style={{ color: train.color }}>
                  T{idx + 1}: {train.name.split('#')[0]}
                </span>
                <span className="text-xs font-mono font-bold text-slate-100">{train.speedKmH.toFixed(0)} km/h</span>
              </div>

              {/* Target Speed Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>VFD Target</span>
                  <span>{train.targetSpeedKmH} km/h</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={train.targetSpeedKmH}
                  onChange={(e) => setTrainSpeed(train.id, Number(e.target.value))}
                  className="w-full bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                  style={{ accentColor: train.color }}
                />
              </div>

              {/* Speed Buttons & Platform Selector */}
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                <button
                  onClick={() => accelerateTrain(train.id)}
                  className="bg-sky-950/80 hover:bg-sky-900 border border-sky-600 text-sky-300 py-1 rounded font-bold flex items-center justify-center gap-0.5 active:scale-95"
                >
                  <ArrowUpRight className="w-3 h-3" /> +20
                </button>
                <button
                  onClick={() => decelerateTrain(train.id)}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 py-1 rounded font-bold flex items-center justify-center gap-0.5 active:scale-95"
                >
                  <ArrowDownRight className="w-3 h-3 text-amber-400" /> -20
                </button>
                {/* Platform Reassignment Dropdown */}
                <select
                  value={train.platform}
                  onChange={(e) => reassignPlatform(train.id, e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-1 text-[10px] font-bold text-center"
                >
                  <option value="Plat 1">Plat 1</option>
                  <option value="Plat 2">Plat 2</option>
                  <option value="Plat 3">Plat 3</option>
                  <option value="Plat 4">Plat 4</option>
                  <option value="Plat 5">Plat 5</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Human Network Controller Interlock Overrides */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wide font-mono flex items-center gap-1.5">
          <Radio className="w-4 h-4 text-amber-400" /> Network Signal Aspects & TSR Speed Restriction Overrides
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-xs">
          {/* Signal Override: London */}
          <button
            onClick={() => toggleSignalOverride('London')}
            className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
              signalOverrides.London
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
                : 'bg-rose-950/80 border-rose-500 text-rose-300 font-bold animate-pulse'
            }`}
          >
            <span>London Signal</span>
            <span className="text-[10px] uppercase">{signalOverrides.London ? 'GREEN (PROCEED)' : 'RED (STOP/HOLD)'}</span>
          </button>

          {/* Signal Override: Birmingham */}
          <button
            onClick={() => toggleSignalOverride('Brum')}
            className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
              signalOverrides.Brum
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
                : 'bg-rose-950/80 border-rose-500 text-rose-300 font-bold animate-pulse'
            }`}
          >
            <span>Birmingham Signal</span>
            <span className="text-[10px] uppercase">{signalOverrides.Brum ? 'GREEN (PROCEED)' : 'RED (STOP/HOLD)'}</span>
          </button>

          {/* Signal Override: Manchester */}
          <button
            onClick={() => toggleSignalOverride('Manch')}
            className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
              signalOverrides.Manch
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
                : 'bg-rose-950/80 border-rose-500 text-rose-300 font-bold animate-pulse'
            }`}
          >
            <span>Manchester Signal</span>
            <span className="text-[10px] uppercase">{signalOverrides.Manch ? 'GREEN (PROCEED)' : 'RED (STOP/HOLD)'}</span>
          </button>

          {/* Signal Override: Scotland */}
          <button
            onClick={() => toggleSignalOverride('Scotland')}
            className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
              signalOverrides.Scotland
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
                : 'bg-rose-950/80 border-rose-500 text-rose-300 font-bold animate-pulse'
            }`}
          >
            <span>Scotland Signal</span>
            <span className="text-[10px] uppercase">{signalOverrides.Scotland ? 'GREEN (PROCEED)' : 'RED (STOP/HOLD)'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Temporary Speed Restriction (TSR 50 km/h) */}
          <button
            onClick={toggleTsr}
            className={`p-3 rounded-xl border flex items-center justify-between transition-all font-mono text-xs font-bold ${
              inputs.tsrActive
                ? 'bg-amber-950 border-amber-500 text-amber-300 shadow-[0_0_12px_#f59e0b44] animate-pulse'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Temporary Speed Restriction
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-200">
              {inputs.tsrActive ? 'TSR: 50 km/h' : 'TSR: OFF'}
            </span>
          </button>

          {/* Point Switch Motor Toggle */}
          <button
            onClick={togglePointSwitch}
            className={`p-3 rounded-xl border flex items-center justify-between transition-all font-mono text-xs font-bold ${
              pointSwitchPosition === 'MAIN'
                ? 'bg-sky-950/60 border-sky-600 text-sky-300'
                : 'bg-indigo-950/60 border-indigo-600 text-indigo-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" /> Point Switch Motor
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-200">
              {pointSwitchPosition} LINE
            </span>
          </button>

          {/* E-Stop Trip Button */}
          <button
            onClick={() => setEstop(!inputs.eStop)}
            className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all font-mono text-xs font-bold ${
              inputs.eStop
                ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_16px_#f43f5e] animate-pulse'
                : 'bg-rose-950/80 hover:bg-rose-900 border-rose-700 text-rose-300'
            }`}
          >
            <AlertOctagon className="w-4 h-4" /> {inputs.eStop ? 'CATENARY TRIPPED' : '25kV CATENARY TRIP'}
          </button>
        </div>
      </div>

      {/* Soft-PLC Diagnostics Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
        <div>
          Scan Time: <strong className="text-sky-400">{scanTimeMs.toFixed(1)} ms</strong>
        </div>
        <div>
          Cycle Count: <strong className="text-slate-200">{cycleCount}</strong>
        </div>
        <div>
          Overhead Line: <strong className={outputs.masterSafetyRelay ? 'text-emerald-400' : 'text-rose-400'}>{outputs.masterSafetyRelay ? '25kV CATENARY ENERGIZED' : 'TRIPPED'}</strong>
        </div>
      </div>
    </div>
  );
};
