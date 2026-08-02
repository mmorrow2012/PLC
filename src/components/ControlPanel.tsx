import React from 'react';
import { usePlcStore } from '../store/usePlcStore';
import {
  ShieldAlert,
  Car,
  RotateCcw,
  Power,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Radio,
} from 'lucide-react';

export const ControlPanel: React.FC = () => {
  const {
    inputs,
    outputs,
    vehiclePos,
    autoDriveVehicle,
    setInput,
    toggleInput,
    setVehicleInLane,
    setVehiclePos,
    setAutoDriveVehicle,
    resetSimulation,
  } = usePlcStore();

  const handleApproachVehicle = () => {
    setVehicleInLane(true);
    setVehiclePos(-100);
    setInput('Sensor_VehiclePresence', false);
  };

  const handleClearVehicle = () => {
    setVehicleInLane(false);
    setVehiclePos(-100);
    setInput('Sensor_VehiclePresence', false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl flex flex-col space-y-4">
      {/* Panel Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Radio className="w-5 h-5 text-amber-500 animate-pulse" />
          <h3 className="text-sm font-bold text-slate-100 tracking-wider uppercase">
            HMI Control Panel & Field Simulator
          </h3>
        </div>
        <button
          onClick={resetSimulation}
          className="px-2.5 py-1 text-xs font-mono font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Section 1: Emergency & Safety Interlocks */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col space-y-3">
          <div className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
            <ShieldAlert className="w-4 h-4" />
            Safety Interlocks
          </div>

          {/* E-STOP Switch */}
          <div className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-800">
            <div>
              <div className="text-xs font-bold text-slate-200">Emergency Stop (NC)</div>
              <div className="text-[10px] text-slate-400 font-mono">
                {inputs.E_Stop ? 'NORMAL (TRUE)' : 'TRIPPED (FALSE)'}
              </div>
            </div>
            <button
              onClick={() => toggleInput('E_Stop')}
              className={`px-3 py-1.5 text-xs font-bold font-mono rounded shadow transition-all ${
                inputs.E_Stop
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-red-950 text-red-300 border border-red-700 animate-pulse'
              }`}
            >
              {inputs.E_Stop ? 'TRIP E-STOP' : 'RELEASE E-STOP'}
            </button>
          </div>

          {/* Obstruction Beam Trigger */}
          <div className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-800">
            <div>
              <div className="text-xs font-bold text-slate-200">Safety Obstruction</div>
              <div className="text-[10px] text-slate-400 font-mono">
                {inputs.Sensor_Obstruction ? 'BLOCKED' : 'CLEAR'}
              </div>
            </div>
            <button
              onClick={() => toggleInput('Sensor_Obstruction')}
              className={`px-3 py-1.5 text-xs font-bold font-mono rounded transition-all ${
                inputs.Sensor_Obstruction
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {inputs.Sensor_Obstruction ? 'CLEAR BEAM' : 'BLOCK BEAM'}
            </button>
          </div>
        </div>

        {/* Section 2: Vehicle Presence Simulation */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col space-y-3">
          <div className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
            <Car className="w-4 h-4" />
            Vehicle Traffic Sim
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleApproachVehicle}
              className="px-3 py-2 text-xs font-bold font-mono bg-blue-600 hover:bg-blue-500 text-white rounded shadow transition flex items-center justify-center gap-1.5"
            >
              <Car className="w-3.5 h-3.5" />
              Approach Car
            </button>

            <button
              onClick={handleClearVehicle}
              className="px-3 py-2 text-xs font-bold font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition"
            >
              Clear Lane
            </button>
          </div>

          <div className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-800 text-xs">
            <span className="text-slate-300">Auto Drive Through:</span>
            <button
              onClick={() => setAutoDriveVehicle(!autoDriveVehicle)}
              className={`px-2.5 py-1 font-mono text-[11px] font-bold rounded ${
                autoDriveVehicle ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {autoDriveVehicle ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <div className="text-[10px] text-slate-400 font-mono">
            Vehicle Pos: {Math.round(vehiclePos)} | Loop Sensor: {inputs.Sensor_VehiclePresence ? 'ON' : 'OFF'}
          </div>
        </div>

        {/* Section 3: Operator Manual Pushbuttons */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col space-y-3">
          <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
            <Power className="w-4 h-4" />
            Manual Override PB
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onMouseDown={() => setInput('PB_ManualOpen', true)}
              onMouseUp={() => setInput('PB_ManualOpen', false)}
              onMouseLeave={() => setInput('PB_ManualOpen', false)}
              className="px-3 py-2 text-xs font-bold font-mono bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-500 text-white rounded transition flex items-center justify-center gap-1"
            >
              <ChevronUp className="w-4 h-4" />
              PB_OPEN
            </button>

            <button
              onMouseDown={() => setInput('PB_ManualClose', true)}
              onMouseUp={() => setInput('PB_ManualClose', false)}
              onMouseLeave={() => setInput('PB_ManualClose', false)}
              className="px-3 py-2 text-xs font-bold font-mono bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded transition flex items-center justify-center gap-1"
            >
              <ChevronDown className="w-4 h-4" />
              PB_CLOSE
            </button>
          </div>

          <button
            onClick={() => {
              setInput('PB_Reset', true);
              setTimeout(() => setInput('PB_Reset', false), 300);
            }}
            className="w-full py-2 text-xs font-bold font-mono bg-amber-600 hover:bg-amber-500 text-white rounded transition flex items-center justify-center gap-1.5 shadow"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            FAULT RESET (PB_Reset)
          </button>
        </div>
      </div>

      {/* Live Output Indicators Bar */}
      <div className="pt-2 border-t border-slate-800">
        <div className="text-[11px] font-mono text-slate-400 mb-2 uppercase font-semibold">
          Hardware Output Status
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs font-mono">
          <div
            className={`p-2 rounded border text-center font-bold transition-all ${
              outputs.Motor_GateUp
                ? 'bg-emerald-950 text-emerald-400 border-emerald-700 animate-pulse'
                : 'bg-slate-950 text-slate-600 border-slate-800'
            }`}
          >
            Motor Up
          </div>
          <div
            className={`p-2 rounded border text-center font-bold transition-all ${
              outputs.Motor_GateDown
                ? 'bg-emerald-950 text-emerald-400 border-emerald-700 animate-pulse'
                : 'bg-slate-950 text-slate-600 border-slate-800'
            }`}
          >
            Motor Down
          </div>
          <div
            className={`p-2 rounded border text-center font-bold transition-all ${
              outputs.Light_Green
                ? 'bg-emerald-950 text-emerald-400 border-emerald-700 shadow-md shadow-emerald-900/50'
                : 'bg-slate-950 text-slate-600 border-slate-800'
            }`}
          >
            Light Green
          </div>
          <div
            className={`p-2 rounded border text-center font-bold transition-all ${
              outputs.Light_Red
                ? 'bg-red-950 text-red-400 border-red-700 shadow-md shadow-red-900/50'
                : 'bg-slate-950 text-slate-600 border-slate-800'
            }`}
          >
            Light Red
          </div>
          <div
            className={`p-2 rounded border text-center font-bold transition-all ${
              outputs.Alarm_StuckGate
                ? 'bg-red-950 text-red-400 border-red-700 animate-bounce'
                : 'bg-slate-950 text-slate-600 border-slate-800'
            }`}
          >
            Stuck Alarm
          </div>
          <div
            className={`p-2 rounded border text-center font-bold transition-all ${
              outputs.Buzzer
                ? 'bg-amber-950 text-amber-400 border-amber-700 animate-pulse'
                : 'bg-slate-950 text-slate-600 border-slate-800'
            }`}
          >
            Buzzer
          </div>
        </div>
      </div>
    </div>
  );
};
