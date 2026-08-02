import React, { useState } from 'react';
import { usePLC } from '../context/PLCContext';
import { BatchState } from '../types/plc';
import { Code, GitCommit, Layers, Terminal } from 'lucide-react';

export const CodeViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'LD' | 'FBD' | 'ST'>('LD');
  const {
    inputs,
    analogInputs,
    outputs,
    analogOutputs,
    memory
  } = usePLC();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl flex flex-col h-full">
      {/* Tabs Bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Code className="w-5 h-5 text-cyan-400" />
          <h2 className="font-mono font-bold text-slate-100 text-sm tracking-wide uppercase">
            IEC 61131-3 PLC Execution Logic Monitor
          </h2>
        </div>
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('LD')}
            className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors ${ 
              activeTab === 'LD' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>LADDER (LD)</span>
          </button>
          <button
            onClick={() => setActiveTab('FBD')}
            className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors ${ 
              activeTab === 'FBD' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>FUNCTION BLOCK (FBD)</span>
          </button>
          <button
            onClick={() => setActiveTab('ST')}
            className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors ${ 
              activeTab === 'ST' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>STRUCTURED TEXT (.ST)</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 bg-slate-950 rounded-lg p-4 border border-slate-800 font-mono text-xs overflow-y-auto space-y-4 max-h-[480px]">
        {activeTab === 'LD' && (
          <div className="space-y-6">
            {/* Rung 1: Safety Interlock Master */}
            <div className="bg-slate-900/80 p-3 rounded border border-slate-800 space-y-2">
              <div className="text-[11px] text-slate-400 font-bold flex justify-between">
                <span>RUNG 0001: Master Safety Interlock Permissive</span>
                <span className={inputs.I_EStop_NC && inputs.I_AgitatorHealth ? 'text-emerald-400' : 'text-red-400'}>
                  {inputs.I_EStop_NC && inputs.I_AgitatorHealth ? '[ENERGIZED]' : '[TRIPPED]'}
                </span>
              </div>
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded stroke-2 overflow-x-auto">
                {/* 24V Rail Left */}
                <div className="w-2 h-10 bg-emerald-500 rounded-sm shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                
                <div className="flex-1 flex items-center justify-around px-4">
                  {/* Contact %I0.0 */}
                  <div className={`px-2 py-1 border rounded flex flex-col items-center ${ 
                    inputs.I_EStop_NC ? 'border-emerald-500 text-emerald-400 bg-emerald-950/40' : 'border-red-500 text-red-400 bg-red-950/40'
                  }`}>
                    <span>| | %I0.0</span>
                    <span className="text-[9px]">I_EStop_NC</span>
                  </div>
                  <div className={`h-0.5 flex-1 ${inputs.I_EStop_NC ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                  
                  {/* Contact %I0.7 */}
                  <div className={`px-2 py-1 border rounded flex flex-col items-center ${ 
                    inputs.I_AgitatorHealth ? 'border-emerald-500 text-emerald-400 bg-emerald-950/40' : 'border-red-500 text-red-400 bg-red-950/40'
                  }`}>
                    <span>| | %I0.7</span>
                    <span className="text-[9px]">AgitatorHealth</span>
                  </div>
                  <div className={`h-0.5 flex-1 ${inputs.I_EStop_NC && inputs.I_AgitatorHealth ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                  
                  {/* Coil Internal Interlock */}
                  <div className={`px-3 py-1 rounded-full border flex flex-col items-center font-bold ${ 
                    inputs.I_EStop_NC && inputs.I_AgitatorHealth ? 'border-emerald-500 text-emerald-400 bg-emerald-500/20' : 'border-slate-700 text-slate-500'
                  }`}>
                    <span>( ) M_SafetyOK</span>
                  </div>
                </div>

                {/* Neutral Rail Right */}
                <div className="w-2 h-10 bg-cyan-500 rounded-sm shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
              </div>
            </div>

            {/* Rung 2: Dosing A Pump Relay */}
            <div className="bg-slate-900/80 p-3 rounded border border-slate-800 space-y-2">
              <div className="text-[11px] text-slate-400 font-bold flex justify-between">
                <span>RUNG 0002: Raw Chemical Feed Pump A Control</span>
                <span className={outputs.Q_PumpA_Run ? 'text-emerald-400' : 'text-slate-500'}>
                  {outputs.Q_PumpA_Run ? '[ACTIVE]' : '[OFF]'}
                </span>
              </div>
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded overflow-x-auto">
                <div className={`w-2 h-10 ${memory.M_BatchState === BatchState.DOSING_A ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                <div className="flex-1 flex items-center justify-around px-4">
                  <div className={`px-2 py-1 border rounded flex flex-col items-center ${ 
                    memory.M_BatchState === BatchState.DOSING_A ? 'border-emerald-500 text-emerald-400 bg-emerald-950/40' : 'border-slate-700 text-slate-500'
                  }`}>
                    <span>| | DOSING_A</span>
                    <span className="text-[9px]">State == 1</span>
                  </div>
                  <div className={`h-0.5 flex-1 ${outputs.Q_PumpA_Run ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                  <div className={`px-3 py-1 rounded-full border flex flex-col items-center font-bold ${ 
                    outputs.Q_PumpA_Run ? 'border-cyan-400 text-cyan-300 bg-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'border-slate-700 text-slate-500'
                  }`}>
                    <span>( ) %Q0.0</span>
                    <span className="text-[9px]">Q_PumpA_Run</span>
                  </div>
                </div>
                <div className="w-2 h-10 bg-cyan-500 rounded-sm" />
              </div>
            </div>

            {/* Rung 3: Thermal Heater Jacket */}
            <div className="bg-slate-900/80 p-3 rounded border border-slate-800 space-y-2">
              <div className="text-[11px] text-slate-400 font-bold flex justify-between">
                <span>RUNG 0003: Reactor Thermal Heating Contactor</span>
                <span className={outputs.Q_HeaterJacket_On ? 'text-amber-400 animate-pulse' : 'text-slate-500'}>
                  {outputs.Q_HeaterJacket_On ? '[HEATING ON]' : '[OFF]'}
                </span>
              </div>
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded overflow-x-auto">
                <div className={`w-2 h-10 ${outputs.Q_HeaterJacket_On ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-700'}`} />
                <div className="flex-1 flex items-center justify-around px-4">
                  <div className={`px-2 py-1 border rounded flex flex-col items-center ${ 
                    memory.M_BatchState === BatchState.HEATING_MIXING ? 'border-amber-500 text-amber-400 bg-amber-950/40' : 'border-slate-700 text-slate-500'
                  }`}>
                    <span>| | HEAT_MIX</span>
                    <span className="text-[9px]">State == 3</span>
                  </div>
                  <div className={`h-0.5 flex-1 ${outputs.Q_HeaterJacket_On ? 'bg-amber-500' : 'bg-slate-700'}`} />
                  <div className={`px-2 py-1 border rounded flex flex-col items-center ${ 
                    analogInputs.AI_TT_Reactor < memory.M_TargetTemp ? 'border-amber-500 text-amber-400 bg-amber-950/40' : 'border-slate-700 text-slate-500'
                  }`}>
                    <span>|/| Temp_SP_Reached</span>
                    <span className="text-[9px]">{analogInputs.AI_TT_Reactor.toFixed(1)} &lt; {memory.M_TargetTemp}°C</span>
                  </div>
                  <div className={`h-0.5 flex-1 ${outputs.Q_HeaterJacket_On ? 'bg-amber-500' : 'bg-slate-700'}`} />
                  <div className={`px-3 py-1 rounded-full border flex flex-col items-center font-bold ${ 
                    outputs.Q_HeaterJacket_On ? 'border-amber-400 text-amber-300 bg-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'border-slate-700 text-slate-500'
                  }`}>
                    <span>( ) %Q0.3</span>
                    <span className="text-[9px]">Q_HeaterJacket_On</span>
                  </div>
                </div>
                <div className="w-2 h-10 bg-cyan-500 rounded-sm" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'FBD' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FB 1: FB_BatchBlend */}
            <div className="bg-slate-900 p-3 rounded border border-slate-800">
              <div className="bg-cyan-950/60 border border-cyan-800 text-cyan-300 px-2 py-1 rounded text-[11px] font-bold mb-2 flex justify-between">
                <span>FB_BatchBlend</span>
                <span className="text-slate-400">IEC 61131-3</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-400"><span>AI_LT_TankA:</span><span className="text-cyan-400 font-bold">{Math.round(analogInputs.AI_LT_TankA)} L</span></div>
                <div className="flex justify-between text-slate-400"><span>AI_LT_TankB:</span><span className="text-cyan-400 font-bold">{Math.round(analogInputs.AI_LT_TankB)} L</span></div>
                <div className="flex justify-between text-slate-400"><span>Target Ratio A (%MW2):</span><span className="text-slate-200">{memory.M_RecipeRatioA} L</span></div>
                <div className="flex justify-between text-slate-400"><span>Target Ratio B (%MW4):</span><span className="text-slate-200">{memory.M_RecipeRatioB} L</span></div>
                <div className="pt-2 border-t border-slate-800 flex justify-between">
                  <span>AQ_V1_RatioA (%QW100):</span>
                  <span className="text-emerald-400 font-bold">{Math.round(analogOutputs.AQ_V1_RatioA)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>AQ_V2_RatioB (%QW102):</span>
                  <span className="text-emerald-400 font-bold">{Math.round(analogOutputs.AQ_V2_RatioB)}%</span>
                </div>
              </div>
            </div>

            {/* FB 2: FB_TempControl */}
            <div className="bg-slate-900 p-3 rounded border border-slate-800">
              <div className="bg-amber-950/60 border border-amber-800 text-amber-300 px-2 py-1 rounded text-[11px] font-bold mb-2 flex justify-between">
                <span>FB_TempControl</span>
                <span className="text-slate-400">PID Thermal</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-400"><span>AI_TT_Reactor (%IW106):</span><span className="text-amber-400 font-bold">{analogInputs.AI_TT_Reactor.toFixed(1)} °C</span></div>
                <div className="flex justify-between text-slate-400"><span>M_TargetTemp (%MW6):</span><span className="text-slate-200">{memory.M_TargetTemp} °C</span></div>
                <div className="pt-2 border-t border-slate-800 flex justify-between">
                  <span>Q_HeaterJacket_On (%Q0.3):</span>
                  <span className={outputs.Q_HeaterJacket_On ? 'text-amber-400 font-bold' : 'text-slate-500'}>{outputs.Q_HeaterJacket_On ? 'TRUE' : 'FALSE'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Q_Agitator_Run (%Q0.2):</span>
                  <span className={outputs.Q_Agitator_Run ? 'text-emerald-400 font-bold' : 'text-slate-500'}>{outputs.Q_Agitator_Run ? 'TRUE' : 'FALSE'}</span>
                </div>
              </div>
            </div>

            {/* FB 3: FB_pHBalancing */}
            <div className="bg-slate-900 p-3 rounded border border-slate-800">
              <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-2 py-1 rounded text-[11px] font-bold mb-2 flex justify-between">
                <span>FB_pHBalancing</span>
                <span className="text-slate-400">Pulse Dosing</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-400"><span>AI_pHT_Reactor (%IW108):</span><span className="text-emerald-400 font-bold">{analogInputs.AI_pHT_Reactor.toFixed(2)} pH</span></div>
                <div className="flex justify-between text-slate-400"><span>M_TargetpH (%MW8):</span><span className="text-slate-200">{memory.M_TargetpH} pH</span></div>
                <div className="pt-2 border-t border-slate-800 flex justify-between">
                  <span>Q_PumpAcid_Dose (%Q0.4):</span>
                  <span className={outputs.Q_PumpAcid_Dose ? 'text-rose-400 font-bold' : 'text-slate-500'}>{outputs.Q_PumpAcid_Dose ? 'TRUE' : 'FALSE'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Q_PumpBase_Dose (%Q0.5):</span>
                  <span className={outputs.Q_PumpBase_Dose ? 'text-emerald-400 font-bold' : 'text-slate-500'}>{outputs.Q_PumpBase_Dose ? 'TRUE' : 'FALSE'}</span>
                </div>
              </div>
            </div>

            {/* FB 4: FB_SafetyInterlock */}
            <div className="bg-slate-900 p-3 rounded border border-slate-800">
              <div className="bg-red-950/60 border border-red-800 text-red-300 px-2 py-1 rounded text-[11px] font-bold mb-2 flex justify-between">
                <span>FB_SafetyInterlock</span>
                <span className="text-slate-400">SIL-2 Guard</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-400"><span>I_EStop_NC (%I0.0):</span><span className={inputs.I_EStop_NC ? 'text-emerald-400' : 'text-red-400 font-bold'}>{inputs.I_EStop_NC ? 'OK (TRUE)' : 'TRIPPED'}</span></div>
                <div className="flex justify-between text-slate-400"><span>I_AgitatorHealth (%I0.7):</span><span className={inputs.I_AgitatorHealth ? 'text-emerald-400' : 'text-red-400 font-bold'}>{inputs.I_AgitatorHealth ? 'OK (TRUE)' : 'OVERLOAD'}</span></div>
                <div className="flex justify-between text-slate-400"><span>High Temp Cutoff (&gt;90°C):</span><span className={analogInputs.AI_TT_Reactor > 90 ? 'text-red-400 font-bold' : 'text-emerald-400'}>{analogInputs.AI_TT_Reactor > 90 ? 'ALARM' : 'OK'}</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ST' && (
          <div className="bg-slate-950 p-3 rounded border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed whitespace-pre">
            <p className="text-slate-500">(* Modicon M580 Chemical Batch Logic — Structured Text *)</p>
            <p><span className="text-purple-400">PROGRAM</span> Main_Batch_Control</p>
            <p><span className="text-purple-400">VAR</span></p>
            <p>  M_BatchState <span className="text-cyan-400">AT %MW0</span> : INT := 0;</p>
            <p>  M_RecipeRatioA <span className="text-cyan-400">AT %MW2</span> : REAL := 600.0;</p>
            <p>  M_RecipeRatioB <span className="text-cyan-400">AT %MW4</span> : REAL := 400.0;</p>
            <p>  M_TargetTemp <span className="text-cyan-400">AT %MW6</span> : REAL := 65.0;</p>
            <p>  M_TargetpH <span className="text-cyan-400">AT %MW8</span> : REAL := 7.0;</p>
            <p><span className="text-purple-400">END_VAR</span></p>
            <br />
            <p><span className="text-slate-500">(* 1. Safety Interlock Execution *)</span></p>
            <p><span className="text-purple-400">IF</span> NOT I_EStop_NC OR NOT I_AgitatorHealth OR AI_TT_Reactor &gt; 90.0 <span className="text-purple-400">THEN</span></p>
            <p>  M_BatchState := 99; <span className="text-slate-500">(* FAULT *)</span></p>
            <p>  Q_PumpA_Run := FALSE;</p>
            <p>  Q_PumpB_Run := FALSE;</p>
            <p>  Q_HeaterJacket_On := FALSE;</p>
            <p>  Q_AlarmBeacon := TRUE;</p>
            <p><span className="text-purple-400">END_IF;</span></p>
            <br />
            <p><span className="text-slate-500">(* Current Active State Comment *)</span></p>
            <p className="text-cyan-400 font-bold">&gt;&gt; ACTIVE STATE: {memory.M_BatchState} ({BatchState[memory.M_BatchState]})</p>
          </div>
        )}
      </div>
    </div>
  );
};
