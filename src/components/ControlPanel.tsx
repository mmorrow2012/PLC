import React from 'react';
import { usePlcStore, ProcessState } from '../store/usePlcStore';
import {
  Play,
  Square,
  RotateCcw,
  Octagon,
  Sliders,
  FastForward,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';

export const ControlPanel: React.FC = () => {
  const {
    inputs,
    outputs,
    setpoints,
    forcedInputs,
    simulationSpeed,
    eStopLatched,
    toggleEStop,
    pressStart,
    releaseStart,
    pressStop,
    releaseStop,
    triggerReset,
    setInput,
    setSetpoint,
    setForceInput,
    clearAllForces,
    setSimulationSpeed,
  } = usePlcStore();

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-2xl space-y-6 text-slate-100">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <h2 className="font-bold text-lg text-slate-100 tracking-wide">
            HMI Control Desk & Command Panel
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-mono">Sim Speed:</span>
          {[0, 1, 2, 5].map((spd) => (
            <button
              key={spd}
              onClick={() => setSimulationSpeed(spd)}
              className={`px-2.5 py-1 text-xs font-mono rounded font-semibold transition-all ${
                simulationSpeed === spd
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {spd === 0 ? 'Pause' : `${spd}x`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Pushbuttons Section */}
      <div className="grid grid-cols-4 gap-4">
        {/* Large Industrial E-Stop Pushbutton */}
        <button
          onClick={toggleEStop}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border-4 transition-all shadow-lg ${
            !inputs.E_Stop
              ? 'bg-red-600 border-red-400 text-white ring-4 ring-red-900 animate-pulse'
              : 'bg-red-950/80 border-red-700 text-red-200 hover:bg-red-900'
          }`}
        >
          <Octagon className="w-8 h-8 mb-1" />
          <span className="font-bold text-xs uppercase tracking-wider">
            {!inputs.E_Stop ? 'E-STOP TRIPPED' : 'E-STOP SWITCH'}
          </span>
          <span className="text-[10px] font-mono mt-0.5 opacity-80">
            {!inputs.E_Stop ? 'Click to Restore' : 'NC Safety Circuit'}
          </span>
        </button>

        {/* Start Pushbutton */}
        <button
          onMouseDown={pressStart}
          onMouseUp={releaseStart}
          onMouseLeave={releaseStart}
          disabled={!inputs.E_Stop || outputs.Alarm_Overflow || eStopLatched}
          className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-emerald-600 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
        >
          <Play className="w-8 h-8 mb-1 fill-emerald-400 text-emerald-400" />
          <span className="font-bold text-xs uppercase tracking-wider">START PB</span>
          <span className="text-[10px] font-mono mt-0.5 opacity-80">Pulse Start</span>
        </button>

        {/* Stop Pushbutton */}
        <button
          onMouseDown={pressStop}
          onMouseUp={releaseStop}
          onMouseLeave={releaseStop}
          className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all shadow-md active:scale-95"
        >
          <Square className="w-8 h-8 mb-1 fill-slate-300 text-slate-300" />
          <span className="font-bold text-xs uppercase tracking-wider">STOP PB</span>
          <span className="text-[10px] font-mono mt-0.5 opacity-80">Hold Stop</span>
        </button>

        {/* Alarm Reset Pushbutton */}
        <button
          onClick={triggerReset}
          className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-amber-600 bg-amber-950/80 hover:bg-amber-900 text-amber-200 transition-all shadow-md active:scale-95"
        >
          <RotateCcw className="w-8 h-8 mb-1 text-amber-400" />
          <span className="font-bold text-xs uppercase tracking-wider">ALARM RESET</span>
          <span className="text-[10px] font-mono mt-0.5 opacity-80">Ack & Reset</span>
        </button>
      </div>

      {/* Process Setpoint Tuning */}
      <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
        <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider border-b border-slate-800 pb-2">
          <SlidersHorizontal className="w-4 h-4" />
          <span>Internal Setpoints & Cascade Parameters</span>
        </div>

        <div className="grid grid-cols-3 gap-4 text-xs font-mono">
          {/* SP_LevelA_High */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>SP_LevelA_High (Fill Cutoff):</span>
              <span className="text-cyan-400 font-bold">{setpoints.SP_LevelA_High}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="95"
              step="1"
              value={setpoints.SP_LevelA_High}
              onChange={(e) => setSetpoint('SP_LevelA_High', parseFloat(e.target.value))}
              className="w-full accent-indigo-500 bg-slate-800 rounded h-1.5 cursor-pointer"
            />
          </div>

          {/* SP_LevelB_Target */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>SP_LevelB_Target (Cascade):</span>
              <span className="text-cyan-400 font-bold">{setpoints.SP_LevelB_Target}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="75"
              step="1"
              value={setpoints.SP_LevelB_Target}
              onChange={(e) => setSetpoint('SP_LevelB_Target', parseFloat(e.target.value))}
              className="w-full accent-indigo-500 bg-slate-800 rounded h-1.5 cursor-pointer"
            />
          </div>

          {/* Kp_Drain Gain */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Kp_Drain (Valve Gain):</span>
              <span className="text-amber-400 font-bold">{setpoints.Kp_Drain}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={setpoints.Kp_Drain}
              onChange={(e) => setSetpoint('Kp_Drain', parseFloat(e.target.value))}
              className="w-full accent-indigo-500 bg-slate-800 rounded h-1.5 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Manual Level Nudge & Fault Simulation */}
      <div className="grid grid-cols-2 gap-4">
        {/* Analog Level Overrides */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Manual Analog Level Control
            </span>
            {Object.keys(forcedInputs).length > 0 && (
              <button
                onClick={clearAllForces}
                className="text-[10px] text-red-400 hover:underline font-mono"
              >
                Clear All Forces
              </button>
            )}
          </div>

          <div className="space-y-2 text-xs font-mono">
            {/* Tank A Level Slider */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Tank A Level (LT_TankA):</span>
                <span className="text-cyan-400">{inputs.LT_TankA.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={inputs.LT_TankA}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setInput('LT_TankA', val);
                  setForceInput('LT_TankA', val);
                }}
                className="w-full accent-cyan-500 bg-slate-800 rounded h-1.5 cursor-pointer"
              />
            </div>

            {/* Tank B Level Slider */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Tank B Level (LT_TankB):</span>
                <span className="text-cyan-400">{inputs.LT_TankB.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={inputs.LT_TankB}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setInput('LT_TankB', val);
                  setForceInput('LT_TankB', val);
                }}
                className="w-full accent-cyan-500 bg-slate-800 rounded h-1.5 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Hardwired Safety Switch Fault Injection */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-red-400 font-bold text-xs uppercase tracking-wider border-b border-slate-800 pb-2">
            <ShieldAlert className="w-4 h-4" />
            <span>Hardwired Safety Float Switch Overrides</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 text-xs font-mono">
            <button
              onClick={() => {
                const nextVal = !inputs.LSH_TankA;
                setInput('LSH_TankA', nextVal);
                setForceInput('LSH_TankA', nextVal ? true : undefined);
              }}
              className={`p-2.5 rounded border transition-all ${
                inputs.LSH_TankA
                  ? 'bg-red-950 border-red-500 text-red-200 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Trip Float Switch LSH_TankA [{inputs.LSH_TankA ? 'TRIPPED' : 'NORMAL'}]
            </button>

            <button
              onClick={() => {
                const nextVal = !inputs.LSH_TankB;
                setInput('LSH_TankB', nextVal);
                setForceInput('LSH_TankB', nextVal ? true : undefined);
              }}
              className={`p-2.5 rounded border transition-all ${
                inputs.LSH_TankB
                  ? 'bg-red-950 border-red-500 text-red-200 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Trip Float Switch LSH_TankB [{inputs.LSH_TankB ? 'TRIPPED' : 'NORMAL'}]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
