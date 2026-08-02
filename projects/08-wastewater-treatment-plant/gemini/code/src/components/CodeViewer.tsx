import React, { useState } from 'react';
import { PLCSystemState } from '../types/plc';
import { Code, Cpu, Activity, Zap, Terminal } from 'lucide-react';

interface CodeViewerProps {
  plcState: PLCSystemState;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ plcState }) => {
  const [activeTab, setActiveTab] = useState<'ladder' | 'st'>('ladder');
  const { inputs, outputs, analogInputs, analogOutputs, fbState, memory } = plcState;

  // Generate dynamic Structured Text representation
  const stCode = `
(* ========================================================================= *)
(* MODICON M580 / SIEMENS S7-1500 STRUCTURED TEXT PROGRAM (MAIN_WWTP.ST)    *)
(* Executed in 50ms Scan Loop Cycle                                          *)
(* ========================================================================= *)

PROGRAM Main_WWTP_Control
VAR_INPUT
    I_EStop_NC            : BOOL; (* %I0.0 - Hardware E-Stop (NC) *)
    I_PlantStart_PB       : BOOL; (* %I0.1 - Master Start *)
    I_PlantStop_PB        : BOOL; (* %I0.2 - Master Stop *)
    I_LSH_Equalization    : BOOL; (* %I0.4 - High-High Level Guard *)
    AI_LT_EqBasin         : REAL; (* %IW100 - Equalization Level (m) *)
    AI_DO_AerationA       : REAL; (* %IW106 - Dissolved Oxygen (mg/L) *)
    AI_Turbidity_Effluent : REAL; (* %IW108 - Effluent Turbidity (NTU) *)
END_VAR

VAR_OUTPUT
    Q_Pump_RawInfluent1   : BOOL; (* %Q0.0 *)
    Q_Pump_RawInfluent2   : BOOL; (* %Q0.1 *)
    Q_Blower_AerationA    : BOOL; (* %Q0.2 *)
    Q_Motor_WeirOpen      : BOOL; (* %Q0.6 *)
    AQ_VFD_InfluentSpeed  : REAL; (* %QW100 *)
    AQ_AirValve_Aeration  : REAL; (* %QW102 *)
END_VAR

VAR
    fb_LeadLag : FB_LeadLagPump;
    fb_DO      : FB_AerationDO;
    fb_Weir    : FB_WeirGateControl;
    fb_Safety  : FB_SafetyInterlock;
END_VAR

// 1. SAFETY INTERLOCK FUNCTION BLOCK
fb_Safety(EStop:= I_EStop_NC, HighLevelGuard:= I_LSH_Equalization, Turbidity:= AI_Turbidity_Effluent);
IF fb_Safety.Tripped THEN
    M_PlantState := 99;
    Q_Pump_RawInfluent1 := FALSE;
    Q_Pump_RawInfluent2 := FALSE;
    AQ_VFD_InfluentSpeed := 0.0;
    RETURN;
END_IF;

// 2. LEAD-LAG INFLUENT PUMP AUTOMATION
fb_LeadLag(Level:= AI_LT_EqBasin, DutyToggle:= M_LeadPumpToggle);
Q_Pump_RawInfluent1 := fb_LeadLag.Pump1_Cmd; // Current: ${outputs.Q_Pump_RawInfluent1}
Q_Pump_RawInfluent2 := fb_LeadLag.Pump2_Cmd; // Current: ${outputs.Q_Pump_RawInfluent2}
AQ_VFD_InfluentSpeed := fb_LeadLag.VFDSpeed; // Current: ${analogOutputs.AQ_VFD_InfluentSpeed.toFixed(1)}%

// 3. DISSOLVED OXYGEN MODULATION LOOP
fb_DO(DO_Actual:= AI_DO_AerationA, TargetDO:= M_TargetDO);
Q_Blower_AerationA := fb_DO.BlowerCmd;        // Current: ${outputs.Q_Blower_AerationA}
AQ_AirValve_Aeration := fb_DO.AirValvePosition;// Current: ${analogOutputs.AQ_AirValve_Aeration.toFixed(1)}%

// 4. MOTORIZED EFFLUENT WEIR SLUICE GATE CONTROL
fb_Weir(Turbidity:= AI_Turbidity_Effluent, MaxAllowed:= M_MaxTurbidity);
Q_Motor_WeirOpen := fb_Weir.OpenCmd;           // Current: ${outputs.Q_Motor_WeirOpen}
Q_Motor_WeirClose := fb_Weir.CloseCmd;         // Current: ${outputs.Q_Motor_WeirClose}

END_PROGRAM
`.trim();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
      {/* Header and Tab Selection */}
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-cyan-400" />
          <h2 className="font-bold text-slate-100 text-sm uppercase tracking-wider">Live IEC 61131-3 Execution Monitor</h2>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono text-xs">
          <button
            onClick={() => setActiveTab('ladder')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 font-semibold ${ 
              activeTab === 'ladder'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> Live Ladder Diagram (LD)
          </button>
          <button
            onClick={() => setActiveTab('st')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 font-semibold ${ 
              activeTab === 'st'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Structured Text (.ST)
          </button>
        </div>
      </div>

      {activeTab === 'ladder' ? (
        <div className="space-y-4 font-mono text-xs">
          {/* RUNG 1: Safety Interlock */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 relative">
            <div className="flex justify-between items-center text-[11px] text-slate-400 mb-2 border-b border-slate-800 pb-1.5">
              <span className="text-cyan-400 font-bold">RUNG 001: Safety Interlock & E-Stop</span>
              <span>FB_SafetyInterlock</span>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto py-2">
              {/* Power Rail Left */}
              <div className="w-2 h-16 bg-cyan-500 rounded-full shadow-[0_0_8px_#06b6d4]" />
              <div className="h-0.5 w-6 bg-cyan-400 shadow-[0_0_5px_#06b6d4]" />

              {/* Contact: I_EStop_NC */}
              <div className={`border px-3 py-2 rounded text-center min-w-[100px] transition-all ${ 
                inputs.I_EStop_NC ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'border-rose-600 bg-rose-950/60 text-rose-300'
              }`}>
                <p className="text-[10px] text-slate-400">%I0.0</p>
                <p className="font-bold">I_EStop_NC</p>
                <span className="text-[9px] uppercase">{inputs.I_EStop_NC ? '[ NC CLOSED ]' : '[ OPEN / TRIP ]'}</span>
              </div>

              <div className={`h-0.5 w-6 ${inputs.I_EStop_NC ? 'bg-cyan-400 shadow-[0_0_5px_#06b6d4]' : 'bg-slate-700'}`} />

              {/* Contact: NOT I_LSH_Equalization */}
              <div className={`border px-3 py-2 rounded text-center min-w-[120px] transition-all ${ 
                !inputs.I_LSH_Equalization ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'border-rose-600 bg-rose-950/60 text-rose-300'
              }`}>
                <p className="text-[10px] text-slate-400">%I0.4</p>
                <p className="font-bold">NOT LSH_Eq</p>
                <span className="text-[9px] uppercase">{!inputs.I_LSH_Equalization ? '[ NORMAL OK ]' : '[ OVERFLOW ]'}</span>
              </div>

              <div className={`h-0.5 w-6 ${fbState.FB_SafetyInterlock.healthy ? 'bg-cyan-400 shadow-[0_0_5px_#06b6d4]' : 'bg-slate-700'}`} />

              {/* Safety Interlock Output Coil */}
              <div className={`border-2 px-4 py-2 rounded-lg text-center min-w-[130px] font-bold transition-all ${ 
                fbState.FB_SafetyInterlock.healthy ? 'border-emerald-400 bg-emerald-950/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'border-rose-500 bg-rose-950/80 text-rose-300'
              }`}>
                <p className="text-[10px] text-slate-400">( M_SafetyOK )</p>
                <p>{fbState.FB_SafetyInterlock.healthy ? 'SAFETY HEALTHY' : 'SAFETY TRIP'}</p>
              </div>

              <div className="h-0.5 flex-1 bg-slate-700" />
              {/* Power Rail Right */}
              <div className="w-2 h-16 bg-slate-700 rounded-full" />
            </div>
          </div>

          {/* RUNG 2: FB_LeadLagPump Function Block */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 relative">
            <div className="flex justify-between items-center text-[11px] text-slate-400 mb-2 border-b border-slate-800 pb-1.5">
              <span className="text-cyan-400 font-bold">RUNG 002: Influent Pump Duty Control (FB_LeadLagPump)</span>
              <span>Level Trigger: Lead ≥ 3.0m | Lag ≥ 6.0m</span>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto py-2">
              <div className="w-2 h-20 bg-cyan-500 rounded-full shadow-[0_0_8px_#06b6d4]" />
              <div className="h-0.5 w-6 bg-cyan-400 shadow-[0_0_5px_#06b6d4]" />

              {/* Function Block Box */}
              <div className="border-2 border-cyan-500 bg-slate-900 rounded-lg p-3 min-w-[280px] shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <div className="border-b border-slate-800 pb-1 font-bold text-cyan-400 flex justify-between text-xs">
                  <span>FB_LeadLagPump</span>
                  <span className="text-[10px] text-slate-400">Duty Duty: P{memory.M_LeadPumpToggle} Lead</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] mt-2 font-mono">
                  <div className="text-slate-400 space-y-1">
                    <p>IN_Level: <strong className="text-slate-200">{analogInputs.AI_LT_EqBasin.toFixed(2)}m</strong></p>
                    <p>IN_Toggle: <strong className="text-slate-200">{memory.M_LeadPumpToggle}</strong></p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className={outputs.Q_Pump_RawInfluent1 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>Q1_Influent: {outputs.Q_Pump_RawInfluent1 ? 'ON' : 'OFF'}</p>
                    <p className={outputs.Q_Pump_RawInfluent2 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>Q2_Influent: {outputs.Q_Pump_RawInfluent2 ? 'ON' : 'OFF'}</p>
                    <p className="text-cyan-400 font-bold">AQ_VFD: {analogOutputs.AQ_VFD_InfluentSpeed.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              <div className={`h-0.5 flex-1 ${(outputs.Q_Pump_RawInfluent1 || outputs.Q_Pump_RawInfluent2) ? 'bg-cyan-400 shadow-[0_0_5px_#06b6d4]' : 'bg-slate-700'}`} />
              <div className="w-2 h-20 bg-slate-700 rounded-full" />
            </div>
          </div>

          {/* RUNG 3: FB_AerationDO Function Block */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 relative">
            <div className="flex justify-between items-center text-[11px] text-slate-400 mb-2 border-b border-slate-800 pb-1.5">
              <span className="text-cyan-400 font-bold">RUNG 003: Dissolved Oxygen Aeration Control (FB_AerationDO)</span>
              <span>Target DO: {memory.M_TargetDO.toFixed(1)} mg/L</span>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto py-2">
              <div className="w-2 h-20 bg-cyan-500 rounded-full shadow-[0_0_8px_#06b6d4]" />
              <div className="h-0.5 w-6 bg-cyan-400 shadow-[0_0_5px_#06b6d4]" />

              <div className="border-2 border-cyan-500 bg-slate-900 rounded-lg p-3 min-w-[280px] shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <div className="border-b border-slate-800 pb-1 font-bold text-cyan-400 flex justify-between text-xs">
                  <span>FB_AerationDO</span>
                  <span className="text-[10px] text-slate-400">DO Error: {fbState.FB_AerationDO.doError.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] mt-2 font-mono">
                  <div className="text-slate-400 space-y-1">
                    <p>DO_Sensor: <strong className="text-slate-200">{analogInputs.AI_DO_AerationA.toFixed(2)} mg/L</strong></p>
                    <p>Target_DO: <strong className="text-slate-200">{memory.M_TargetDO.toFixed(1)} mg/L</strong></p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className={outputs.Q_Blower_AerationA ? 'text-emerald-400 font-bold' : 'text-slate-500'}>Q_Blower: {outputs.Q_Blower_AerationA ? 'RUNNING' : 'STOPPED'}</p>
                    <p className="text-cyan-400 font-bold">AQ_AirValve: {analogOutputs.AQ_AirValve_Aeration.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              <div className={`h-0.5 flex-1 ${outputs.Q_Blower_AerationA ? 'bg-cyan-400 shadow-[0_0_5px_#06b6d4]' : 'bg-slate-700'}`} />
              <div className="w-2 h-20 bg-slate-700 rounded-full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-cyan-300 overflow-x-auto max-h-[420px]">
          <pre className="leading-relaxed">{stCode}</pre>
        </div>
      )}
    </div>
  );
};