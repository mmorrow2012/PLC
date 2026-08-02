import React from 'react';
import { usePlcStore } from '../store/usePlcStore';
import { Power, Gauge, RotateCcw, GitBranch, ArrowUpRight, ArrowDownRight, AlertOctagon, Sliders } from 'lucide-react';

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
    triggerReset,
    scanTimeMs,
    cycleCount,
  } = usePlcStore();

  const train1 = trains[0];
  const train2 = trains[1];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-5">
      {/* Header & PLC Run State */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Sliders className="text-sky-400 w-5 h-5" /> Railway Master HMI & Speed Control Console
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

      {/* Speed Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Train 1 Speed Controls */}
        {train1 && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-sky-400 font-mono">{train1.name}</span>
              <span className="text-xs font-mono font-bold text-slate-200">{train1.speedKmH.toFixed(0)} km/h</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Target VFD Traction Speed</span>
                <span>{train1.targetSpeedKmH} km/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                step="5"
                value={train1.targetSpeedKmH}
                onChange={(e) => setTrainSpeed(train1.id, Number(e.target.value))}
                className="w-full accent-sky-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => accelerateTrain(train1.id)}
                className="bg-sky-950/80 hover:bg-sky-900 border border-sky-600 text-sky-300 py-1.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <ArrowUpRight className="w-4 h-4 text-sky-400" /> Speed Up (+20)
              </button>
              <button
                onClick={() => decelerateTrain(train1.id)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 py-1.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <ArrowDownRight className="w-4 h-4 text-amber-400" /> Slow Down (-20)
              </button>
            </div>
          </div>
        )}

        {/* Train 2 Speed Controls */}
        {train2 && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-teal-400 font-mono">{train2.name}</span>
              <span className="text-xs font-mono font-bold text-slate-200">{train2.speedKmH.toFixed(0)} km/h</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Target VFD Traction Speed</span>
                <span>{train2.targetSpeedKmH} km/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                step="5"
                value={train2.targetSpeedKmH}
                onChange={(e) => setTrainSpeed(train2.id, Number(e.target.value))}
                className="w-full accent-teal-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => accelerateTrain(train2.id)}
                className="bg-teal-950/80 hover:bg-teal-900 border border-teal-600 text-teal-300 py-1.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <ArrowUpRight className="w-4 h-4 text-teal-400" /> Speed Up (+20)
              </button>
              <button
                onClick={() => decelerateTrain(train2.id)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 py-1.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <ArrowDownRight className="w-4 h-4 text-amber-400" /> Slow Down (-20)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Network Controls & Safety Interlocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
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

        {/* E-Stop Button */}
        <button
          onClick={() => setEstop(!inputs.eStop)}
          className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all font-mono text-xs font-bold ${
            inputs.eStop
              ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_16px_#f43f5e] animate-pulse'
              : 'bg-rose-950/80 hover:bg-rose-900 border-rose-700 text-rose-300'
          }`}
        >
          <AlertOctagon className="w-4 h-4" /> {inputs.eStop ? 'E-STOP TRIPPED' : 'TRIP E-STOP'}
        </button>

        {/* Reset Fault Button */}
        <button
          onClick={triggerReset}
          className="p-3 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-900 text-slate-200 flex items-center justify-center gap-2 transition-all font-mono text-xs font-bold active:scale-95"
        >
          <RotateCcw className="w-4 h-4 text-sky-400" /> Fault Reset Pulse
        </button>
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
          Catenary Relay: <strong className={outputs.masterSafetyRelay ? 'text-emerald-400' : 'text-rose-400'}>{outputs.masterSafetyRelay ? '25kV ON' : 'TRIPPED'}</strong>
        </div>
      </div>
    </div>
  );
};
