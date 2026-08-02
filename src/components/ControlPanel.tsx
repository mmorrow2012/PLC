import React from 'react';
import { usePLC } from '../context/PLCContext';
import { Play, Square, RotateCcw, AlertOctagon, Sliders, ShieldAlert, Thermometer, Droplet, RefreshCw } from 'lucide-react';

export const ControlPanel: React.FC = () => {
  const {
    inputs,
    outputs,
    memory,
    faultReason,
    manualMode,
    toggleManualMode,
    pressStart,
    pressStop,
    pressReset,
    toggleEStop,
    toggleAgitatorHealth,
    updateRecipe,
    refillRawTanks,
    emptyProductTank,
    setManualOutput,
    simulateOverheat,
    simulatepHDisturbance
  } = usePLC();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl flex flex-col space-y-4 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-cyan-400" />
          <h2 className="font-bold text-slate-100 text-sm tracking-wide uppercase">
            HMI Control Panel & Recipe Management
          </h2>
        </div>
        <button
          onClick={toggleManualMode}
          className={`px-3 py-1 rounded text-xs font-bold transition ${ 
            manualMode 
              ? 'bg-amber-500 text-slate-950 font-extrabold shadow-[0_0_10px_rgba(245,158,11,0.4)]' 
              : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
          }`}
        >
          {manualMode ? 'MANUAL OVERRIDE ACTIVE' : 'AUTO MODE'}
        </button>
      </div>

      {/* Fault / Alarm Banner */}
      {faultReason && (
        <div className="bg-red-950/80 border-2 border-red-500 rounded-lg p-3 text-red-200 flex items-center justify-between animate-pulse shadow-lg">
          <div className="flex items-center space-x-2">
            <AlertOctagon className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <div className="font-bold text-xs text-red-400 uppercase tracking-wider">SYSTEM FAULT / ALARM TRIP</div>
              <div className="text-xs font-bold text-white">{faultReason}</div>
            </div>
          </div>
          <button
            onClick={pressReset}
            className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded text-xs transition shadow border border-red-400 shrink-0 ml-2"
          >
            ACK / RESET
          </button>
        </div>
      )}

      {/* Physical Hardware Pushbuttons & E-Stop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* START BATCH */}
        <button
          onClick={pressStart}
          disabled={memory.M_BatchState === 99}
          className="bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white font-bold p-3 rounded-lg shadow-md border border-emerald-400 flex flex-col items-center justify-center space-y-1 disabled:opacity-40 transition active:scale-95"
        >
          <Play className="w-5 h-5 fill-current" />
          <span className="text-xs">START BATCH (%I0.1)</span>
        </button>

        {/* STOP / PAUSE */}
        <button
          onClick={pressStop}
          className="bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-bold p-3 rounded-lg shadow-md border border-slate-600 flex flex-col items-center justify-center space-y-1 transition active:scale-95"
        >
          <Square className="w-5 h-5 fill-current text-amber-400" />
          <span className="text-xs">PAUSE BATCH (%I0.2)</span>
        </button>

        {/* RESET FAULT */}
        <button
          onClick={pressReset}
          className="bg-gradient-to-b from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-bold p-3 rounded-lg shadow-md border border-blue-400 flex flex-col items-center justify-center space-y-1 transition active:scale-95"
        >
          <RotateCcw className="w-5 h-5" />
          <span className="text-xs">RESET FAULT (%I0.3)</span>
        </button>

        {/* HARDWARE E-STOP TOGGLE */}
        <button
          onClick={toggleEStop}
          className={`p-3 rounded-lg shadow-md font-bold flex flex-col items-center justify-center space-y-1 border transition active:scale-95 ${ 
            inputs.I_EStop_NC 
              ? 'bg-gradient-to-b from-red-700 to-red-900 border-red-500 text-white hover:from-red-600 hover:to-red-800' 
              : 'bg-red-500 border-white text-slate-950 font-black animate-bounce'
          }`}
        >
          <AlertOctagon className="w-5 h-5" />
          <span className="text-xs">{inputs.I_EStop_NC ? 'TRIP E-STOP (%I0.0)' : 'E-STOP TRIPPED!'}</span>
        </button>
      </div>

      {/* Recipe Setpoint Sliders */}
      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-3">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Recipe Parameters & Setpoints (%MW Memory)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Target Ratio Chemical A */}
          <div className="space-y-1 bg-slate-900 p-2.5 rounded border border-slate-800">
            <div className="flex justify-between text-slate-300 font-bold">
              <span>Chemical A Volume (%MW2):</span>
              <span className="text-cyan-400">{memory.M_RecipeRatioA} L</span>
            </div>
            <input
              type="range"
              min="100"
              max="800"
              step="50"
              value={memory.M_RecipeRatioA}
              onChange={(e) => updateRecipe('M_RecipeRatioA', Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Target Ratio Chemical B */}
          <div className="space-y-1 bg-slate-900 p-2.5 rounded border border-slate-800">
            <div className="flex justify-between text-slate-300 font-bold">
              <span>Chemical B Volume (%MW4):</span>
              <span className="text-purple-400">{memory.M_RecipeRatioB} L</span>
            </div>
            <input
              type="range"
              min="100"
              max="800"
              step="50"
              value={memory.M_RecipeRatioB}
              onChange={(e) => updateRecipe('M_RecipeRatioB', Number(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>

          {/* Target Temperature */}
          <div className="space-y-1 bg-slate-900 p-2.5 rounded border border-slate-800">
            <div className="flex justify-between text-slate-300 font-bold">
              <span>Target Temperature (%MW6):</span>
              <span className="text-amber-400">{memory.M_TargetTemp} °C</span>
            </div>
            <input
              type="range"
              min="30"
              max="85"
              step="2.5"
              value={memory.M_TargetTemp}
              onChange={(e) => updateRecipe('M_TargetTemp', Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Target pH */}
          <div className="space-y-1 bg-slate-900 p-2.5 rounded border border-slate-800">
            <div className="flex justify-between text-slate-300 font-bold">
              <span>Target Neutral pH (%MW8):</span>
              <span className="text-emerald-400">{memory.M_TargetpH} pH</span>
            </div>
            <input
              type="range"
              min="5.0"
              max="9.0"
              step="0.1"
              value={memory.M_TargetpH}
              onChange={(e) => updateRecipe('M_TargetpH', Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Fault Injection & Maintenance Utilities */}
      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span>Simulations & Fault Injections</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={toggleAgitatorHealth}
            className={`px-3 py-1.5 rounded font-bold border transition ${ 
              inputs.I_AgitatorHealth 
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' 
                : 'bg-red-600 text-white border-red-400 animate-pulse'
            }`}
          >
            Trip Agitator Overload (%I0.7)
          </button>
          <button
            onClick={simulateOverheat}
            className="bg-slate-800 hover:bg-amber-900/50 text-amber-300 border border-amber-700 px-3 py-1.5 rounded font-bold flex items-center space-x-1 transition"
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>Inject Overheat (&gt;90°C)</span>
          </button>
          <button
            onClick={() => simulatepHDisturbance('acid')}
            className="bg-slate-800 hover:bg-rose-900/50 text-rose-300 border border-rose-700 px-3 py-1.5 rounded font-bold flex items-center space-x-1 transition"
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>Spike Acid (pH 4.8)</span>
          </button>
          <button
            onClick={() => simulatepHDisturbance('base')}
            className="bg-slate-800 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-700 px-3 py-1.5 rounded font-bold flex items-center space-x-1 transition"
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>Spike Base (pH 9.2)</span>
          </button>
          <button
            onClick={emptyProductTank}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded font-bold flex items-center space-x-1 transition ml-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Empty Product Tank</span>
          </button>
        </div>
      </div>
    </div>
  );
};
