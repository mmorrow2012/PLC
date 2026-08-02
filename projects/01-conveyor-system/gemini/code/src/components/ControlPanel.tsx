import React from 'react';
import { usePlcStore } from '../store/usePlcStore';

export const ControlPanel: React.FC = () => {
  const { inputs, outputs, isRunning, setRunning, updateInputs } = usePlcStore();

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-800 p-4">
      <div className="mb-3 border-b border-slate-800 pb-2 flex justify-between items-center">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
          Operator Panel & Signals
        </h2>
        <button
          onClick={() => setRunning(!isRunning)}
          className={`px-2 py-1 rounded text-xs font-mono font-bold ${
            isRunning ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
          }`}
        >
          PLC: {isRunning ? 'RUN' : 'STOP'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1">
        {/* Push Buttons / Inputs */}
        <div className="bg-slate-950/60 p-3 rounded border border-slate-800/80">
          <h3 className="text-xs font-mono text-slate-400 mb-3 uppercase">Digital Inputs</h3>
          <div className="space-y-2">
            <button
              onMouseDown={() => updateInputs({ startPB: true })}
              onMouseUp={() => updateInputs({ startPB: false })}
              className={`w-full py-2 px-3 rounded font-mono text-xs font-semibold flex items-center justify-between border transition-all ${
                inputs.startPB ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <span>START_PB (NO)</span>
              <span className={`w-2 h-2 rounded-full ${inputs.startPB ? 'bg-white' : 'bg-slate-600'}`} />
            </button>

            <button
              onClick={() => updateInputs({ stopPB: !inputs.stopPB })}
              className={`w-full py-2 px-3 rounded font-mono text-xs font-semibold flex items-center justify-between border transition-all ${
                !inputs.stopPB ? 'bg-rose-900 text-rose-200 border-rose-700' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <span>STOP_PB (NC)</span>
              <span className={`w-2 h-2 rounded-full ${inputs.stopPB ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            </button>

            <button
              onClick={() => updateInputs({ estop: !inputs.estop })}
              className={`w-full py-2 px-3 rounded font-mono text-xs font-semibold flex items-center justify-between border transition-all ${
                !inputs.estop ? 'bg-red-600 text-white border-red-500 font-bold animate-pulse' : 'bg-red-950/60 text-red-300 border-red-900/60 hover:bg-red-900/40'
              }`}
            >
              <span>E-STOP (NC)</span>
              <span className={`w-2 h-2 rounded-full ${inputs.estop ? 'bg-emerald-400' : 'bg-red-500'}`} />
            </button>

            <button
              onClick={() => updateInputs({ itemSensor: !inputs.itemSensor })}
              className={`w-full py-2 px-3 rounded font-mono text-xs font-semibold flex items-center justify-between border transition-all ${
                inputs.itemSensor ? 'bg-cyan-900/80 text-cyan-200 border-cyan-700' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <span>SENSOR_01</span>
              <span className={`w-2 h-2 rounded-full ${inputs.itemSensor ? 'bg-cyan-400' : 'bg-slate-600'}`} />
            </button>
          </div>
        </div>

        {/* Status Indicators / Outputs */}
        <div className="bg-slate-950/60 p-3 rounded border border-slate-800/80">
          <h3 className="text-xs font-mono text-slate-400 mb-3 uppercase">Digital Outputs</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-xs font-mono text-slate-300">MOTOR_RUN</span>
              <span className={`w-3 h-3 rounded-full ${outputs.motorRun ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-700'}`} />
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-xs font-mono text-slate-300">RUNNING_LIGHT</span>
              <span className={`w-3 h-3 rounded-full ${outputs.runningLight ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-700'}`} />
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-xs font-mono text-slate-300">ALARM_LIGHT</span>
              <span className={`w-3 h-3 rounded-full ${outputs.alarmLight ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-slate-700'}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
