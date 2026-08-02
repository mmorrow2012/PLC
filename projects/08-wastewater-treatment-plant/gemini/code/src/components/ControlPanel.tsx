import React from 'react';
import { PLCSystemState } from '../types/plc';
import { Power, RotateCcw, Sliders, ShieldAlert, ArrowUpDown, AlertCircle } from 'lucide-react';

interface ControlPanelProps {
  plcState: PLCSystemState;
  onUpdateInputs: (inputs: Partial<PLCSystemState['inputs']>) => void;
  onUpdateAnalogInputs: (analogs: Partial<PLCSystemState['analogInputs']>) => void;
  onUpdateMemory: (memory: Partial<PLCSystemState['memory']>) => void;
  onUpdateSimulation: (sim: Partial<PLCSystemState['simulation']>) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  plcState,
  onUpdateInputs,
  onUpdateAnalogInputs,
  onUpdateMemory,
  onUpdateSimulation,
}) => {
  const { inputs, analogInputs, memory, simulation } = plcState;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-5">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Sliders className="w-5 h-5 text-cyan-400" />
        <h2 className="font-bold text-slate-100 text-sm uppercase tracking-wider">Operator HMI Command Panel</h2>
      </div>

      {/* Plant Start / Stop / E-Stop Switches */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => {
            onUpdateInputs({ I_PlantStart_PB: true, I_PlantStop_PB: false });
            setTimeout(() => onUpdateInputs({ I_PlantStart_PB: false }), 200);
          }}
          className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all border border-emerald-400 text-xs uppercase tracking-wider"
        >
          <Power className="w-4 h-4" /> Master Start Plant (%I0.1)
        </button>

        <button
          onClick={() => {
            onUpdateInputs({ I_PlantStop_PB: true, I_PlantStart_PB: false });
            setTimeout(() => onUpdateInputs({ I_PlantStop_PB: false }), 200);
          }}
          className="bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-700 text-xs uppercase tracking-wider shadow-md"
        >
          <Power className="w-4 h-4 text-slate-400" /> Master Stop Plant (%I0.2)
        </button>

        <button
          onClick={() => onUpdateInputs({ I_EStop_NC: !inputs.I_EStop_NC })}
          className={`font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-lg transition-all border ${ 
            !inputs.I_EStop_NC
              ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
              : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-800/80'
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> HARDWARE E-STOP (%I0.0)
        </button>
      </div>

      {/* Duty Rotation and Fault Ack */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => {
            onUpdateMemory({ M_LeadPumpToggle: memory.M_LeadPumpToggle === 1 ? 2 : 1 });
          }}
          className="bg-slate-950 border border-slate-800 hover:border-cyan-500/50 p-3 rounded-lg flex items-center justify-between text-xs font-mono font-medium transition-all"
        >
          <span className="text-slate-300 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-cyan-400" /> Influent Duty Rotation (%MW6):
          </span>
          <span className="bg-cyan-950 border border-cyan-800 text-cyan-300 px-2.5 py-1 rounded font-bold uppercase">
            Pump {memory.M_LeadPumpToggle} Lead
          </span>
        </button>

        <button
          onClick={() => {
            onUpdateInputs({ I_ResetFault_PB: true });
            setTimeout(() => onUpdateInputs({ I_ResetFault_PB: false }), 200);
          }}
          className="bg-slate-950 border border-slate-800 hover:border-emerald-500/50 p-3 rounded-lg flex items-center justify-between text-xs font-mono font-medium transition-all text-slate-300 hover:text-emerald-300"
        >
          <span className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-emerald-400" /> Fault Reset / Ack Pushbutton (%I0.3)
          </span>
          <span className="text-slate-500 text-[10px]">[ MOMENTARY ]</span>
        </button>
      </div>

      {/* Analog Control Sliders & Setpoints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs">
        {/* Equalization Level Override */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-slate-300">
            <span>Equalization Basin Level (%IW100):</span>
            <span className="text-cyan-400 font-bold">{analogInputs.AI_LT_EqBasin.toFixed(2)} m</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="10.0"
            step="0.1"
            value={analogInputs.AI_LT_EqBasin}
            onChange={(e) => onUpdateAnalogInputs({ AI_LT_EqBasin: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 bg-slate-800 rounded h-2 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0.0m (Empty)</span>
            <span>3.0m (Lead Start)</span>
            <span>6.0m (Lag Start)</span>
            <span>10.0m (High-High)</span>
          </div>
        </div>

        {/* Dissolved Oxygen Target Setpoint */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-slate-300">
            <span>Target DO Setpoint (%MW2):</span>
            <span className="text-cyan-400 font-bold">{memory.M_TargetDO.toFixed(1)} mg/L</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="6.0"
            step="0.1"
            value={memory.M_TargetDO}
            onChange={(e) => onUpdateMemory({ M_TargetDO: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 bg-slate-800 rounded h-2 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0.5 mg/L</span>
            <span>2.5 mg/L (Default)</span>
            <span>6.0 mg/L</span>
          </div>
        </div>

        {/* Effluent Turbidity Sensor Simulation */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-slate-300">
            <span>Effluent Turbidity (%IW108):</span>
            <span className={analogInputs.AI_Turbidity_Effluent > 25 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {analogInputs.AI_Turbidity_Effluent.toFixed(1)} NTU
            </span>
          </div>
          <input
            type="range"
            min="2.0"
            max="50.0"
            step="0.5"
            value={analogInputs.AI_Turbidity_Effluent}
            onChange={(e) => onUpdateAnalogInputs({ AI_Turbidity_Effluent: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 bg-slate-800 rounded h-2 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>2.0 NTU (Clean)</span>
            <span>15.0 NTU (Discharge Limit)</span>
            <span>25.0 NTU (Emergency Trip)</span>
          </div>
        </div>

        {/* Simulation Rate Control */}
        <div className="space-y-2 flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-300">
            <span>Simulated Inflow Rate:</span>
            <span className="text-cyan-400 font-bold">{simulation.simulatedInfluentInflowRate} m³/h</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={simulation.simulatedInfluentInflowRate}
            onChange={(e) => onUpdateSimulation({ simulatedInfluentInflowRate: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 bg-slate-800 rounded h-2 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0 m³/h</span>
            <span>35 m³/h (Normal)</span>
            <span>100 m³/h (Peak Storm)</span>
          </div>
        </div>
      </div>
    </div>
  );
};