import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { usePlcStore, ProcessState } from '../store/usePlcStore';
import { Code, Terminal, Cpu, CheckCircle } from 'lucide-react';

const stCode = `(*
 * Schneider Electric Modicon M580 Structured Text Program
 * Execution Loop: 50ms Cyclic Task (EcoStruxure Control Expert)
 *)

IF NOT E_Stop THEN
    E_Stop_Latched := TRUE;
END_IF;

Overflow_Detected := (LT_TankA >= 100.0) OR (LT_TankB >= 100.0) OR LSH_TankA OR LSH_TankB;

IF Overflow_Detected THEN
    Alarm_Overflow := TRUE;
END_IF;

IF Reset_Trig THEN
    IF E_Stop AND NOT Overflow_Detected THEN
        Alarm_Overflow := FALSE;
        E_Stop_Latched := FALSE;
        IF CurrentState = E_ProcessState#ALARM_STATE THEN
            CurrentState := E_ProcessState#IDLE;
        END_IF;
    END_IF;
END_IF;

IF E_Stop_Latched OR Alarm_Overflow THEN
    CurrentState := E_ProcessState#ALARM_STATE;
    Pump_Fill_A := FALSE;
    Pump_Transfer_AB := FALSE;
    Valve_Drain_BC_Pos := 0.0;
ELSE
    CASE CurrentState OF
        E_ProcessState#IDLE:
            Pump_Fill_A := FALSE;
            Pump_Transfer_AB := FALSE;
            Valve_Drain_BC_Pos := 0.0;
            IF Start_Trig THEN CurrentState := E_ProcessState#FILLING_A; END_IF;

        E_ProcessState#FILLING_A:
            Pump_Fill_A := TRUE;
            Pump_Transfer_AB := FALSE;
            Valve_Drain_BC_Pos := 0.0;
            IF Stop_PB THEN CurrentState := E_ProcessState#IDLE;
            ELSIF LT_TankA >= SP_LevelA_High THEN CurrentState := E_ProcessState#TRANSFERRING_AB; END_IF;

        E_ProcessState#TRANSFERRING_AB:
            Pump_Fill_A := FALSE;
            Pump_Transfer_AB := TRUE;
            IF LT_TankB > SP_LevelB_Target THEN
                Valve_Drain_BC_Pos := (LT_TankB - SP_LevelB_Target) * Kp_Drain;
            ELSE Valve_Drain_BC_Pos := 0.0; END_IF;
            IF Stop_PB THEN CurrentState := E_ProcessState#IDLE;
            ELSIF LT_TankA <= 3.0 OR LT_TankB >= SP_LevelB_High THEN CurrentState := E_ProcessState#DRAINING_BC; END_IF;

        E_ProcessState#DRAINING_BC:
            Pump_Fill_A := FALSE;
            Pump_Transfer_AB := FALSE;
            Valve_Drain_BC_Pos := 100.0;
            IF Stop_PB THEN CurrentState := E_ProcessState#IDLE;
            ELSIF LT_TankB <= 2.0 THEN CurrentState := E_ProcessState#IDLE; END_IF;
    END_CASE;
END_IF;`;

export const CodeViewer: React.FC = () => {
  const { outputs, inputs, setpoints } = usePlcStore();
  const [activeTab, setActiveTab] = useState<'st' | 'memory'>('st');

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[480px]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <Code className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold text-slate-200 text-sm tracking-wide">
            Schneider Modicon M580 — IEC 61131-3 ST Viewer
          </h3>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={() => setActiveTab('st')}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTab === 'st'
                ? 'bg-indigo-600 text-white font-semibold shadow'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Structured Text (.ST)
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTab === 'memory'
                ? 'bg-indigo-600 text-white font-semibold shadow'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            I/O Memory Image Table
          </button>
        </div>
      </div>

      {/* Editor or Memory Table View */}
      {activeTab === 'st' ? (
        <div className="relative flex-1 bg-[#1e1e1e]">
          <div className="absolute top-2 right-4 z-10 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-md text-xs font-mono text-slate-300 flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>
              Active Execution Block:{' '}
              <strong className="text-cyan-400">
                {ProcessState[outputs.State_Display]}
              </strong>
            </span>
          </div>
          <Editor
            height="100%"
            defaultLanguage="pascal"
            theme="vs-dark"
            value={stCode}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              fontFamily: 'Fira Code, monospace',
            }}
          />
        </div>
      ) : (
        <div className="p-4 overflow-y-auto flex-1 font-mono text-xs text-slate-300 bg-slate-950 space-y-4">
          {/* Section: Discrete Inputs */}
          <div>
            <h4 className="text-slate-400 font-bold mb-2 uppercase text-[11px] tracking-wider text-indigo-400 border-b border-slate-800 pb-1">
              Discrete Inputs (Digital Memory Map %I)
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between">
                <span>%I0.0 E_Stop (NC):</span>
                <span className={inputs.E_Stop ? 'text-emerald-400' : 'text-red-400 font-bold'}>
                  {inputs.E_Stop ? 'TRUE (OK)' : 'FALSE (TRIPPED)'}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between">
                <span>%I0.1 Start_PB:</span>
                <span className={inputs.Start_PB ? 'text-emerald-400' : 'text-slate-500'}>
                  {inputs.Start_PB ? 'TRUE' : 'FALSE'}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between">
                <span>%I0.2 Stop_PB:</span>
                <span className={inputs.Stop_PB ? 'text-red-400' : 'text-slate-500'}>
                  {inputs.Stop_PB ? 'TRUE' : 'FALSE'}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between">
                <span>%I0.3 LSH_TankA:</span>
                <span className={inputs.LSH_TankA ? 'text-red-400 font-bold' : 'text-slate-500'}>
                  {inputs.LSH_TankA ? 'TRUE (FLOAT OVERFLOW)' : 'FALSE'}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between">
                <span>%I0.4 LSH_TankB:</span>
                <span className={inputs.LSH_TankB ? 'text-red-400 font-bold' : 'text-slate-500'}>
                  {inputs.LSH_TankB ? 'TRUE (FLOAT OVERFLOW)' : 'FALSE'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Analog Inputs */}
          <div>
            <h4 className="text-slate-400 font-bold mb-2 uppercase text-[11px] tracking-wider text-indigo-400 border-b border-slate-800 pb-1">
              Analog Transmitters (Scaled Registers %IW)
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between">
                <span>%IW1.0 LT_TankA:</span>
                <span className="text-cyan-400 font-bold">{inputs.LT_TankA.toFixed(2)} %</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between">
                <span>%IW1.1 LT_TankB:</span>
                <span className="text-cyan-400 font-bold">{inputs.LT_TankB.toFixed(2)} %</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between">
                <span>%IW1.2 LT_TankC:</span>
                <span className="text-cyan-400 font-bold">{inputs.LT_TankC.toFixed(2)} %</span>
              </div>
            </div>
          </div>

          {/* Section: Discrete & Analog Outputs */}
          <div>
            <h4 className="text-slate-400 font-bold mb-2 uppercase text-[11px] tracking-wider text-indigo-400 border-b border-slate-800 pb-1">
              Process Outputs (%Q / %QW)
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between">
                <span>%Q0.0 Pump_Fill_A:</span>
                <span className={outputs.Pump_Fill_A ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {outputs.Pump_Fill_A ? 'TRUE' : 'FALSE'}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between">
                <span>%Q0.1 Pump_Transfer_AB:</span>
                <span className={outputs.Pump_Transfer_AB ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {outputs.Pump_Transfer_AB ? 'TRUE' : 'FALSE'}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between">
                <span>%Q0.2 Alarm_Overflow:</span>
                <span className={outputs.Alarm_Overflow ? 'text-red-400 font-bold' : 'text-slate-500'}>
                  {outputs.Alarm_Overflow ? 'TRUE (ALARM)' : 'FALSE'}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between">
                <span>%QW1.0 Valve_Drain_BC_Pos:</span>
                <span className="text-amber-400 font-bold">{outputs.Valve_Drain_BC_Pos.toFixed(2)} %</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between">
                <span>%MW100 Alarm_Tower Bitmask:</span>
                <span className="text-slate-200 font-bold">0x0{outputs.Alarm_Tower.toString(16)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
