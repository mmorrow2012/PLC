import React from 'react';
import { PlcState, BatchState } from '../types/plc';
import { Play, Square, RefreshCw, AlertOctagon, Sliders, ShieldAlert, Wrench, RotateCcw } from 'lucide-react';

interface ControlPanelProps {
  plcState: PlcState;
  onStartBatch: () => void;
  onStopBatch: () => void;
  onResetFault: () => void;
  onToggleEStop: () => void;
  onUpdateRecipe: (key: 'M_RecipeRatioA' | 'M_RecipeRatioB' | 'M_TargetTemp' | 'M_TargetpH', value: number) => void;
  onTriggerFault: (type: 'overheat' | 'overflow' | 'agitator') => void;
  onRefillRawTanks: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  plcState,
  onStartBatch,
  onStopBatch,
  onResetFault,
  onToggleEStop,
  onUpdateRecipe,
  onTriggerFault,
  onRefillRawTanks
}) => {
  const { memory, inputs } = plcState;

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-slate-100">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* OPERATOR COMMAND CENTER & E-STOP */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <AlertOctagon className="w-5 h-5 text-rose-500" />
            <h3 className="font-bold text-sm text-slate-100 tracking-wide">OPERATOR CONTROL CONSOLE</h3>
          </div>

          {/* Hardware Mushroom E-Stop Button */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
            <button
              onClick={onToggleEStop}
              className={`w-28 h-28 rounded-full border-4 shadow-2xl flex flex-col items-center justify-center transition-all active:scale-95 ${inputs.I_EStop_NC ? 'bg-gradient-to-b from-rose-600 to-rose-800 border-rose-400 hover:from-rose-500 hover:to-rose-700 text-white shadow-rose-900/50' : 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse ring-4 ring-rose-500/50'}`}
            >
              <AlertOctagon className="w-10 h-10 stroke-[2.5]" />
              <span className="font-mono font-bold text-[11px] tracking-tight mt-1">EMERGENCY</span>
              <span className="font-mono font-bold text-[10px]">STOP (%I0.0)</span>
            </button>
            <p className="text-[11px] font-mono text-slate-400 text-center">
              STATUS: <span className={inputs.I_EStop_NC ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{inputs.I_EStop_NC ? 'NORMAL (CLOSED 24V)' : 'TRIPPED (OPEN CIRCUIT)'}</span>
            </p>
          </div>

          {/* Operator Pushbuttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={onStartBatch}
              disabled={memory.M_BatchState !== BatchState.IDLE}
              className="p-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg font-mono font-bold text-xs flex flex-col items-center gap-1 shadow-lg active:scale-95 transition-all"
            >
              <Play className="w-4 h-4" />
              START (%I0.1)
            </button>

            <button
              onClick={onStopBatch}
              className="p-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-mono font-bold text-xs flex flex-col items-center gap-1 shadow-lg active:scale-95 transition-all"
            >
              <Square className="w-4 h-4" />
              PAUSE (%I0.2)
            </button>

            <button
              onClick={onResetFault}
              className="p-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-mono font-bold text-xs flex flex-col items-center gap-1 shadow-lg active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              RESET (%I0.3)
            </button>
          </div>
        </div>

        {/* RECIPE SETPOINT CONFIGURATION (%MW MEMORY) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-sm text-slate-100 tracking-wide">PLC RECIPE PARAMETERS (%MW MEMORY WORDS)</h3>
            </div>
            <button
              onClick={onRefillRawTanks}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono text-xs rounded border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> REFILL RAW TANKS (1000L)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chemical A Target Volume %MW2 */}
            <div className="space-y-2 bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400 font-bold">CHEMICAL A VOLUME (%MW2)</span>
                <span className="text-cyan-400 font-bold text-sm">{memory.M_RecipeRatioA} L</span>
              </div>
              <input
                type="range"
                min="100"
                max="800"
                step="50"
                value={memory.M_RecipeRatioA}
                onChange={e => onUpdateRecipe('M_RecipeRatioA', parseFloat(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 rounded h-2 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 font-mono">Dosing Target for Raw Storage Tank A</p>
            </div>

            {/* Chemical B Target Volume %MW4 */}
            <div className="space-y-2 bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400 font-bold">CHEMICAL B VOLUME (%MW4)</span>
                <span className="text-purple-400 font-bold text-sm">{memory.M_RecipeRatioB} L</span>
              </div>
              <input
                type="range"
                min="100"
                max="800"
                step="50"
                value={memory.M_RecipeRatioB}
                onChange={e => onUpdateRecipe('M_RecipeRatioB', parseFloat(e.target.value))}
                className="w-full accent-purple-500 bg-slate-800 rounded h-2 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 font-mono">Dosing Target for Raw Storage Tank B</p>
            </div>

            {/* Target Temperature %MW6 */}
            <div className="space-y-2 bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400 font-bold">BATCH TARGET TEMP (%MW6)</span>
                <span className="text-amber-400 font-bold text-sm">{memory.M_TargetTemp}°C</span>
              </div>
              <input
                type="range"
                min="30"
                max="85"
                step="1"
                value={memory.M_TargetTemp}
                onChange={e => onUpdateRecipe('M_TargetTemp', parseFloat(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 rounded h-2 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 font-mono">Thermal Jacket Cutoff Setpoint (Max 85°C)</p>
            </div>

            {/* Target pH Setpoint %MW8 */}
            <div className="space-y-2 bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400 font-bold">NEUTRAL pH SETPOINT (%MW8)</span>
                <span className="text-emerald-400 font-bold text-sm">{memory.M_TargetpH.toFixed(1)} pH</span>
              </div>
              <input
                type="range"
                min="5.0"
                max="9.0"
                step="0.1"
                value={memory.M_TargetpH}
                onChange={e => onUpdateRecipe('M_TargetpH', parseFloat(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 rounded h-2 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 font-mono">Closed-loop pH Pulse Dosing Target</p>
            </div>
          </div>

          {/* SIMULATED FAULT INJECTION CONTROLS */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold">
              <Wrench className="w-4 h-4" /> INDUSTRIAL HARDWARE FAULT INJECTION TESTER
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <button
                onClick={() => onTriggerFault('overheat')}
                className="p-2.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 rounded flex items-center justify-center gap-2 active:scale-95 transition-all font-bold"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" /> OVERHEAT (&gt; 90°C)
              </button>
              <button
                onClick={() => onTriggerFault('overflow')}
                className="p-2.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 rounded flex items-center justify-center gap-2 active:scale-95 transition-all font-bold"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" /> HIGH FLOAT GUARD TRIP
              </button>
              <button
                onClick={() => onTriggerFault('agitator')}
                className="p-2.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 rounded flex items-center justify-center gap-2 active:scale-95 transition-all font-bold"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" /> AGITATOR OVERLOAD
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
