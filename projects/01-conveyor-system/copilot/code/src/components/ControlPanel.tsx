import type { FC } from 'react';
import { useState } from 'react';
import { AlertTriangle, Play, Square, RotateCcw, PackagePlus } from 'lucide-react';
import { usePlcStore } from '../store/usePlcStore';

const ControlPanel: FC = () => {
  const {
    plcRunning,
    inputs,
    outputs,
    safetyLatched,
    speedSetpoint,
    forceTable,
    startPlc,
    stopPlc,
    resetSafety,
    setSpeedSetpoint,
    spawnPart,
    setInput,
    setForce,
  } = usePlcStore();

  const [showForceTable, setShowForceTable] = useState(false);

  const handleEStopToggle = () => {
    setInput('E_Stop', !inputs.E_Stop);
  };

  return (
    <aside className="space-y-4">
      {/* PLC Control */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">PLC Control</h2>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startPlc}
              disabled={plcRunning}
              className="flex flex-1 items-center justify-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Start
            </button>
            <button
              type="button"
              onClick={stopPlc}
              disabled={!plcRunning}
              className="flex flex-1 items-center justify-center gap-2 rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          </div>
          
          <div className={`rounded border p-3 text-center text-xs font-medium ${
            plcRunning 
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-slate-700 bg-slate-800 text-slate-400'
          }`}>
            {plcRunning ? '● RUNNING' : '○ STOPPED'}
          </div>
        </div>
      </div>

      {/* Safety Controls */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">Safety</h2>
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleEStopToggle}
            className={`w-full rounded border-2 px-4 py-3 text-sm font-bold transition ${
              !inputs.E_Stop
                ? 'border-red-500 bg-red-600 text-white hover:bg-red-500'
                : 'border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600'
            }`}
          >
            {inputs.E_Stop ? 'E-STOP (SAFE)' : 'E-STOP (ACTIVE)'}
          </button>
          
          {safetyLatched && (
            <div className="flex items-center gap-2 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              Safety Latched
            </div>
          )}
          
          <button
            type="button"
            onClick={resetSafety}
            disabled={!safetyLatched || !inputs.E_Stop}
            className="flex w-full items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      {/* VFD Speed Control */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">VFD Speed</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Setpoint:</span>
            <span className="font-semibold text-slate-200">{speedSetpoint.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={speedSetpoint}
            onChange={(e) => setSpeedSetpoint(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Output:</span>
            <span className={`font-semibold ${outputs.VFD_Run ? 'text-emerald-300' : 'text-slate-500'}`}>
              {outputs.VFD_Speed_Ref.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Part Spawning */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">Spawn Parts</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => spawnPart(2)}
            className="flex items-center justify-center gap-1 rounded bg-green-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-green-500"
          >
            <PackagePlus className="h-3 w-3" />
            Green
          </button>
          <button
            type="button"
            onClick={() => spawnPart(1)}
            className="flex items-center justify-center gap-1 rounded bg-red-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-500"
          >
            <PackagePlus className="h-3 w-3" />
            Red
          </button>
          <button
            type="button"
            onClick={() => spawnPart(3)}
            className="col-span-2 flex items-center justify-center gap-1 rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-500"
          >
            <PackagePlus className="h-3 w-3" />
            Blue
          </button>
        </div>
      </div>

      {/* Force Table */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Force Table</h2>
          <button
            type="button"
            onClick={() => setShowForceTable(!showForceTable)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {showForceTable ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showForceTable && (
          <div className="space-y-2">
            <div className="text-xs text-slate-500">
              Active Forces: {Object.keys(forceTable).length}
            </div>
            
            <div className="space-y-1">
              <ForceButton
                label="Force E_Stop TRUE"
                isActive={forceTable.E_Stop === true}
                onToggle={() => setForce('E_Stop', forceTable.E_Stop === true ? null : true)}
              />
              <ForceButton
                label="Force E_Stop FALSE"
                isActive={forceTable.E_Stop === false}
                onToggle={() => setForce('E_Stop', forceTable.E_Stop === false ? null : false)}
              />
              <ForceButton
                label="Force VFD_Run TRUE"
                isActive={forceTable.VFD_Run === true}
                onToggle={() => setForce('VFD_Run', forceTable.VFD_Run === true ? null : true)}
              />
            </div>
            
            {Object.keys(forceTable).length > 0 && (
              <button
                type="button"
                onClick={() => Object.keys(forceTable).forEach(k => setForce(k, null))}
                className="w-full rounded bg-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-600"
              >
                Clear All Forces
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

interface ForceButtonProps {
  label: string;
  isActive: boolean;
  onToggle: () => void;
}

const ForceButton: FC<ForceButtonProps> = ({ label, isActive, onToggle }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full rounded px-2 py-1 text-left text-xs transition ${
        isActive
          ? 'bg-amber-600 text-white'
          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
      }`}
    >
      {isActive ? '● ' : '○ '}{label}
    </button>
  );
};

export default ControlPanel;
