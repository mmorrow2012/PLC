import React, { useState } from 'react';
import { PlcState, BatchState } from '../types/plc';
import { Cpu, Code, Play, Check, ShieldAlert, Zap } from 'lucide-react';

interface CodeViewerProps {
  plcState: PlcState;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ plcState }) => {
  const [subTab, setSubTab] = useState<'ld' | 'st'>('ld');
  const { inputs, analogs, outputs, memory, lastFaultReason } = plcState;

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-slate-100">
      {/* Top Header & Sub-tab Selector */}
      <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="font-bold text-sm text-slate-100">IEC 61131-3 PROGRAM EXECUTION MONITOR</h2>
            <p className="text-xs text-slate-400">EcoStruxure Control Expert (Unity Pro) Target: Modicon M580 PLC</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono text-xs">
          <button
            onClick={() => setSubTab('ld')}
            className={`px-3 py-1.5 rounded font-bold transition-all ${subTab === 'ld' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Ladder Diagram & FBD
          </button>
          <button
            onClick={() => setSubTab('st')}
            className={`px-3 py-1.5 rounded font-bold transition-all ${subTab === 'st' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Structured Text (.ST)
          </button>
        </div>
      </div>

      {subTab === 'ld' ? (
        <div className="space-y-6">
          {/* LADDER DIAGRAM (24V POWER RAIL MONITOR) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl font-mono text-xs space-y-8 relative overflow-x-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-cyan-400 font-bold tracking-wider">LADDER LOGIC RUNG MONITOR (LIVE 24V POWER FLOW)</span>
              <span className="text-slate-500 text-[11px]">CYCLES: {plcState.scanCount} | SCAN: {plcState.scanTimeMs}ms</span>
            </div>

            {/* RUNG 1: Safety Interlock Circuit */}
            <div className="space-y-2">
              <div className="text-slate-400 font-bold flex items-center justify-between text-[11px]">
                <span>RUNG 1: FB_SafetyInterlock Master E-Stop & High Level Guards</span>
                <span className={inputs.I_EStop_NC ? 'text-emerald-400' : 'text-rose-400'}>{inputs.I_EStop_NC ? 'POWER FLOW ENERGIZED' : 'TRIPPED'}</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-4 min-w-[700px]">
                {/* Left Power Rail */}
                <div className="w-2 h-16 bg-emerald-500 rounded shadow-lg shadow-emerald-500/50" />
                
                {/* Contacts */}
                <div className={`px-3 py-2 border rounded font-bold ${inputs.I_EStop_NC ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-rose-950 border-rose-500 text-rose-300'}`}>
                  I_EStop_NC [%I0.0]
                </div>
                <div className="w-8 h-0.5 bg-emerald-500" />
                
                <div className={`px-3 py-2 border rounded font-bold ${!inputs.I_LSH_Reactor ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-rose-950 border-rose-500 text-rose-300'}`}>
                  NOT I_LSH_Reactor [%I0.6]
                </div>
                <div className="w-8 h-0.5 bg-emerald-500" />

                <div className={`px-3 py-2 border rounded font-bold ${analogs.AI_TT_Reactor <= 90.0 ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-rose-950 border-rose-500 text-rose-300'}`}>
                  AI_TT_Reactor &lt; 90.0°C
                </div>
                <div className="flex-1 h-0.5 bg-emerald-500" />

                {/* Coil */}
                <div className={`px-4 py-2 border rounded-full font-bold shadow-md ${outputs.Q_AlarmBeacon ? 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                  ( Q_AlarmBeacon [%Q0.7] )
                </div>
                
                {/* Right Power Rail */}
                <div className="w-2 h-16 bg-blue-500 rounded" />
              </div>
            </div>

            {/* RUNG 2: FB_BatchBlend State 1 (Dosing Chemical A) */}
            <div className="space-y-2">
              <div className="text-slate-400 font-bold flex items-center justify-between text-[11px]">
                <span>RUNG 2: FB_BatchBlend - Chemical Feed Pump A & Valve Modulation</span>
                <span className={outputs.Q_PumpA_Run ? 'text-cyan-400 font-bold' : 'text-slate-500'}>{outputs.Q_PumpA_Run ? 'ACTIVE (PUMP RUNNING)' : 'INACTIVE'}</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-4 min-w-[700px]">
                <div className="w-2 h-16 bg-emerald-500 rounded" />
                
                <div className={`px-3 py-2 border rounded font-bold ${memory.M_BatchState === BatchState.DOSING_A ? 'bg-cyan-950 border-cyan-500 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                  M_BatchState == 1 (DOSING_A)
                </div>
                <div className={`w-8 h-0.5 ${memory.M_BatchState === BatchState.DOSING_A ? 'bg-cyan-400' : 'bg-slate-800'}`} />

                <div className={`px-3 py-2 border rounded font-bold ${analogs.AI_LT_TankA > 2.0 ? 'bg-cyan-950 border-cyan-500 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                  AI_LT_TankA &gt; 2.0 L
                </div>
                <div className={`flex-1 h-0.5 ${outputs.Q_PumpA_Run ? 'bg-cyan-400' : 'bg-slate-800'}`} />

                <div className={`px-4 py-2 border rounded-full font-bold ${outputs.Q_PumpA_Run ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/30' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                  ( Q_PumpA_Run [%Q0.0] )
                </div>
                
                <div className="w-2 h-16 bg-blue-500 rounded" />
              </div>
            </div>

            {/* RUNG 3: FB_TempControl Heating Jacket Control */}
            <div className="space-y-2">
              <div className="text-slate-400 font-bold flex items-center justify-between text-[11px]">
                <span>RUNG 3: FB_TempControl - Thermal Jacket & Scorch Prevention Agitator</span>
                <span className={outputs.Q_HeaterJacket_On ? 'text-amber-400 font-bold' : 'text-slate-500'}>{outputs.Q_HeaterJacket_On ? 'HEATER ENERGIZED' : 'HEATER OFF'}</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-4 min-w-[700px]">
                <div className="w-2 h-16 bg-emerald-500 rounded" />
                
                <div className={`px-3 py-2 border rounded font-bold ${memory.M_BatchState === BatchState.HEATING_MIXING ? 'bg-amber-950 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                  M_BatchState == 3 (HEATING)
                </div>
                <div className={`w-8 h-0.5 ${memory.M_BatchState === BatchState.HEATING_MIXING ? 'bg-amber-400' : 'bg-slate-800'}`} />

                <div className={`px-3 py-2 border rounded font-bold ${analogs.AI_TT_Reactor < memory.M_TargetTemp ? 'bg-amber-950 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                  AI_TT_Reactor ({analogs.AI_TT_Reactor.toFixed(1)}°C) &lt; {memory.M_TargetTemp}°C
                </div>
                <div className={`flex-1 h-0.5 ${outputs.Q_HeaterJacket_On ? 'bg-amber-400' : 'bg-slate-800'}`} />

                <div className={`px-4 py-2 border rounded-full font-bold ${outputs.Q_HeaterJacket_On ? 'bg-amber-950 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/30' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                  ( Q_HeaterJacket_On [%Q0.3] )
                </div>
                
                <div className="w-2 h-16 bg-blue-500 rounded" />
              </div>
            </div>
          </div>

          {/* FUNCTION BLOCKS MONITORS (FBD VIEW) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FB_BatchBlend Block Monitor */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl font-mono text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-cyan-400">FB_BatchBlend (FUNCTION BLOCK)</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">IEC 61131-3 FBD</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <p className="text-slate-500">INPUTS:</p>
                    <p className="text-slate-300">IN_State: <span className="text-cyan-400 font-bold">{memory.M_BatchState}</span></p>
                    <p className="text-slate-300">IN_VolReactor: <span className="text-cyan-400 font-bold">{analogs.AI_LT_Reactor.toFixed(1)} L</span></p>
                    <p className="text-slate-300">SP_RatioA: <span className="text-cyan-400 font-bold">{memory.M_RecipeRatioA} L</span></p>
                    <p className="text-slate-300">SP_RatioB: <span className="text-cyan-400 font-bold">{memory.M_RecipeRatioB} L</span></p>
                  </div>
                  <div>
                    <p className="text-slate-500">OUTPUTS:</p>
                    <p className="text-slate-300">OUT_PumpA: <span className={outputs.Q_PumpA_Run ? 'text-emerald-400 font-bold' : 'text-slate-600'}>{outputs.Q_PumpA_Run ? 'TRUE' : 'FALSE'}</span></p>
                    <p className="text-slate-300">OUT_PumpB: <span className={outputs.Q_PumpB_Run ? 'text-emerald-400 font-bold' : 'text-slate-600'}>{outputs.Q_PumpB_Run ? 'TRUE' : 'FALSE'}</span></p>
                    <p className="text-slate-300">AQ_ValveA: <span className="text-cyan-400 font-bold">{plcState.analogOutputs.AQ_V1_RatioA}%</span></p>
                    <p className="text-slate-300">AQ_ValveB: <span className="text-cyan-400 font-bold">{plcState.analogOutputs.AQ_V2_RatioB}%</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* FB_pHBalancing Block Monitor */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl font-mono text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-emerald-400">FB_pHBalancing (FUNCTION BLOCK)</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">IEC 61131-3 FBD</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <p className="text-slate-500">INPUTS:</p>
                    <p className="text-slate-300">IN_pHT: <span className="text-emerald-400 font-bold">{analogs.AI_pHT_Reactor.toFixed(2)} pH</span></p>
                    <p className="text-slate-300">SP_pH: <span className="text-emerald-400 font-bold">{memory.M_TargetpH.toFixed(1)} pH</span></p>
                    <p className="text-slate-300">TOLERANCE: <span className="text-slate-400 font-bold">± 0.15 pH</span></p>
                  </div>
                  <div>
                    <p className="text-slate-500">OUTPUTS:</p>
                    <p className="text-slate-300">OUT_AcidDose: <span className={outputs.Q_PumpAcid_Dose ? 'text-rose-400 font-bold' : 'text-slate-600'}>{outputs.Q_PumpAcid_Dose ? 'TRUE' : 'FALSE'}</span></p>
                    <p className="text-slate-300">OUT_BaseDose: <span className={outputs.Q_PumpBase_Dose ? 'text-blue-400 font-bold' : 'text-slate-600'}>{outputs.Q_PumpBase_Dose ? 'TRUE' : 'FALSE'}</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* STRUCTURED TEXT CODE VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl font-mono text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-cyan-400 font-bold tracking-wider">MODICON M580 STRUCTURED TEXT SOURCE (`.ST`)</span>
            <span className="text-slate-500 text-[11px]">LANGUAGE: IEC 61131-3 ST</span>
          </div>

          <pre className="bg-slate-950 p-5 rounded-lg border border-slate-800 overflow-x-auto text-slate-300 leading-relaxed font-mono">
{`(* ============================================================= *)
(* MODICON M580 / SCHNEIDER ECOSTRUXURE BATCH REACTOR CODE       *)
(* PROGRAM: PRG_ChemicalBatchControl                              *)
(* DATE: 2026-08-02                                              *)
(* ============================================================= *)

VAR
  (* Hardware Inputs *)
  I_EStop_NC         AT %I0.0 : BOOL; (* Master E-Stop 24V NC *)
  I_StartBatch_PB    AT %I0.1 : BOOL; (* Operator Start Pushbutton *)
  I_StopBatch_PB     AT %I0.2 : BOOL; (* Operator Stop/Pause PB *)
  I_ResetFault_PB    AT %I0.3 : BOOL; (* Fault Reset Pushbutton *)
  I_LSH_Reactor      AT %I0.6 : BOOL; (* High Float Guard Reactor *)
  I_AgitatorHealth   AT %I0.7 : BOOL; (* Agitator Overload Relay *)

  (* Hardware Analog Inputs *)
  AI_LT_TankA        AT %IW100 : REAL; (* Litres *)
  AI_LT_TankB        AT %IW102 : REAL; (* Litres *)
  AI_LT_Reactor      AT %IW104 : REAL; (* Litres *)
  AI_TT_Reactor      AT %IW106 : REAL; (* Temp °C *)
  AI_pHT_Reactor     AT %IW108 : REAL; (* pH Sensor *)

  (* Hardware Digital Outputs *)
  Q_PumpA_Run        AT %Q0.0 : BOOL;
  Q_PumpB_Run        AT %Q0.1 : BOOL;
  Q_Agitator_Run     AT %Q0.2 : BOOL;
  Q_HeaterJacket_On  AT %Q0.3 : BOOL;
  Q_PumpAcid_Dose    AT %Q0.4 : BOOL;
  Q_PumpBase_Dose    AT %Q0.5 : BOOL;
  Q_Valve_Product    AT %Q0.6 : BOOL;
  Q_AlarmBeacon      AT %Q0.7 : BOOL;

  (* Memory Allocation *)
  M_BatchState       AT %MW0  : INT;  (* State Machine *)
  M_RecipeRatioA     AT %MW2  : REAL; (* Default 600.0 L *)
  M_RecipeRatioB     AT %MW4  : REAL; (* Default 400.0 L *)
  M_TargetTemp       AT %MW6  : REAL; (* Default 65.0 °C *)
  M_TargetpH         AT %MW8  : REAL; (* Default 7.0 pH *)
END_VAR

(* ------------------------------------------------------------- *)
(* 1. SAFETY INTERLOCK FUNCTION BLOCK                             *)
(* ------------------------------------------------------------- *)
IF NOT I_EStop_NC OR I_LSH_Reactor OR NOT I_AgitatorHealth OR (AI_TT_Reactor > 90.0) THEN
    M_BatchState := 99; (* FAULT STATE *)
    Q_AlarmBeacon := TRUE;
    Q_PumpA_Run := FALSE;
    Q_PumpB_Run := FALSE;
    Q_Agitator_Run := FALSE;
    Q_HeaterJacket_On := FALSE;
    Q_PumpAcid_Dose := FALSE;
    Q_PumpBase_Dose := FALSE;
    Q_Valve_Product := FALSE;
END_IF;

(* ------------------------------------------------------------- *)
(* 2. BATCH STATE MACHINE EXECUTION                               *)
(* ------------------------------------------------------------- *)
CASE M_BatchState OF
    0: (* IDLE *)
        IF I_StartBatch_PB THEN
            M_BatchState := 1; (* Move to DOSING_A *)
        END_IF;

    1: (* DOSING_A *)
        Q_PumpA_Run := TRUE;
        IF AI_LT_Reactor >= M_RecipeRatioA THEN
            Q_PumpA_Run := FALSE;
            M_BatchState := 2; (* Move to DOSING_B *)
        END_IF;

    2: (* DOSING_B *)
        Q_PumpB_Run := TRUE;
        IF AI_LT_Reactor >= (M_RecipeRatioA + M_RecipeRatioB) THEN
            Q_PumpB_Run := FALSE;
            M_BatchState := 3; (* Move to HEATING_MIXING *)
        END_IF;

    3: (* HEATING_MIXING *)
        Q_Agitator_Run := TRUE;
        Q_HeaterJacket_On := (AI_TT_Reactor < M_TargetTemp);
        IF AI_TT_Reactor >= M_TargetTemp THEN
            Q_HeaterJacket_On := FALSE;
            M_BatchState := 4; (* Move to PH_BALANCING *)
        END_IF;

    4: (* PH_BALANCING *)
        Q_Agitator_Run := TRUE;
        IF AI_pHT_Reactor > (M_TargetpH + 0.15) THEN
            Q_PumpAcid_Dose := TRUE;
            Q_PumpBase_Dose := FALSE;
        ELSIF AI_pHT_Reactor < (M_TargetpH - 0.15) THEN
            Q_PumpAcid_Dose := FALSE;
            Q_PumpBase_Dose := TRUE;
        ELSE
            Q_PumpAcid_Dose := FALSE;
            Q_PumpBase_Dose := FALSE;
            M_BatchState := 5; (* Move to DRAINING *)
        END_IF;

    5: (* DRAINING *)
        Q_Agitator_Run := FALSE;
        Q_Valve_Product := TRUE;
        IF AI_LT_Reactor <= 5.0 THEN
            Q_Valve_Product := FALSE;
            M_BatchState := 0; (* Return to IDLE *)
        END_IF;
END_CASE;`} 
          </pre>
        </div>
      )}
    </div>
  );
};
