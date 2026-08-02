import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { usePlcStore } from '../store/usePlcStore';
import { Code2, Cpu } from 'lucide-react';

const ST_CODE = `(*
 * ============================================================================
 * SCHNEIDER ELECTRIC MODICON M580 / ECOSTRUXURE CONTROL EXPERT
 * PROGRAM: Gate_Controller_Main
 * FILE: parkingGateLogic.st
 * STANDARD: IEC 61131-3 Structured Text
 * SYSTEM: Parking Garage Gate Controller
 * ============================================================================
 *)

TYPE
    E_GateState : (STATE_IDLE, STATE_OPENING, STATE_OPEN, STATE_CLOSING, STATE_CLOSED, STATE_FAULT);
END_TYPE

VAR_GLOBAL
    // Hardware Inputs (M580 Digital Input Module)
    E_Stop                  : BOOL := TRUE;  // NC Hardware E-Stop Switch
    Sensor_VehiclePresence  : BOOL := FALSE; // Inductive Loop Sensor
    Sensor_GateOpenLimit    : BOOL := FALSE; // Limit Switch Gate Fully Open
    Sensor_GateClosedLimit  : BOOL := TRUE;  // Limit Switch Gate Fully Closed
    Sensor_Obstruction      : BOOL := FALSE; // Safety Photoeye/Edge
    PB_ManualOpen           : BOOL := FALSE; // Operator Manual Open Pushbutton
    PB_ManualClose          : BOOL := FALSE; // Operator Manual Close Pushbutton
    PB_Reset                : BOOL := FALSE; // Operator Fault Reset Pushbutton

    // Hardware Outputs (M580 Digital Output Module)
    Motor_GateUp            : BOOL := FALSE; // Contactor Gate Raise Motor
    Motor_GateDown          : BOOL := FALSE; // Contactor Gate Lower Motor
    Light_Green             : BOOL := FALSE; // Traffic Light Go (Green)
    Light_Red               : BOOL := TRUE;  // Traffic Light Stop (Red)
    Alarm_StuckGate         : BOOL := FALSE; // Latched Fault Indicator
    Buzzer                  : BOOL := FALSE; // Movement Audible Alarm

    // Internal State & Timers
    CurrentState            : E_GateState := STATE_IDLE;
    TON_Watchdog            : TON;           // Gate travel timeout timer
    TON_AutoClose           : TON;           // Delay timer after vehicle clears
    
    // Configurable Parameters
    T_WatchdogTimeout       : TIME := T#8S;  // Maximum travel duration
    T_AutoCloseDelay        : TIME := T#5S;  // Pause before closing
END_VAR

PROGRAM Main_Gate_Control
VAR
    Watchdog_ET : TIME;
    AutoClose_ET: TIME;
END_VAR

    // ------------------------------------------------------------------------
    // 1. EMERGENCY STOP & SAFETY INTERLOCK (HIGHEST PRIORITY)
    // ------------------------------------------------------------------------
    IF NOT E_Stop THEN
        Motor_GateUp   := FALSE;
        Motor_GateDown := FALSE;
        Buzzer         := FALSE;
        Light_Green    := FALSE;
        Light_Red      := TRUE;
        CurrentState   := STATE_FAULT;
        RETURN;
    END_IF;

    // Fault Reset Handling
    IF PB_Reset THEN
        Alarm_StuckGate := FALSE;
        IF CurrentState = STATE_FAULT THEN
            IF Sensor_GateClosedLimit THEN
                CurrentState := STATE_CLOSED;
            ELSIF Sensor_GateOpenLimit THEN
                CurrentState := STATE_OPEN;
            ELSE
                CurrentState := STATE_IDLE;
            END_IF;
        END_IF;
    END_IF;

    // Interlock check for active fault
    IF Alarm_StuckGate THEN
        Motor_GateUp   := FALSE;
        Motor_GateDown := FALSE;
        Buzzer         := FALSE;
        Light_Green    := FALSE;
        Light_Red      := TRUE;
        CurrentState   := STATE_FAULT;
        RETURN;
    END_IF;

    // ------------------------------------------------------------------------
    // 2. STATE MACHINE LOGIC
    // ------------------------------------------------------------------------
    CASE CurrentState OF

        STATE_IDLE:
            Motor_GateUp   := FALSE;
            Motor_GateDown := FALSE;
            Buzzer         := FALSE;
            Light_Green    := FALSE;
            Light_Red      := TRUE;

            IF Sensor_GateClosedLimit THEN
                CurrentState := STATE_CLOSED;
            ELSIF Sensor_GateOpenLimit THEN
                CurrentState := STATE_OPEN;
            ELSIF Sensor_VehiclePresence OR PB_ManualOpen THEN
                CurrentState := STATE_OPENING;
            ELSIF PB_ManualClose THEN
                CurrentState := STATE_CLOSING;
            END_IF;

        STATE_CLOSED:
            Motor_GateUp   := FALSE;
            Motor_GateDown := FALSE;
            Buzzer         := FALSE;
            Light_Green    := FALSE;
            Light_Red      := TRUE;

            IF Sensor_VehiclePresence OR PB_ManualOpen THEN
                CurrentState := STATE_OPENING;
            END_IF;

        STATE_OPENING:
            Motor_GateUp   := TRUE;
            Motor_GateDown := FALSE;
            Buzzer         := TRUE;
            Light_Green    := FALSE;
            Light_Red      := TRUE;

            IF Sensor_GateOpenLimit THEN
                Motor_GateUp := FALSE;
                Buzzer       := FALSE;
                CurrentState := STATE_OPEN;
            END_IF;

        STATE_OPEN:
            Motor_GateUp   := FALSE;
            Motor_GateDown := FALSE;
            Buzzer         := FALSE;
            Light_Green    := TRUE;
            Light_Red      := FALSE;

            IF PB_ManualClose THEN
                CurrentState := STATE_CLOSING;
            END_IF;

            IF TON_AutoClose.Q THEN
                CurrentState := STATE_CLOSING;
            END_IF;

        STATE_CLOSING:
            Motor_GateUp   := FALSE;
            Motor_GateDown := TRUE;
            Buzzer         := TRUE;
            Light_Green    := FALSE;
            Light_Red      := TRUE;

            // OBSTRUCTION SAFETY INTERLOCK
            IF Sensor_Obstruction OR Sensor_VehiclePresence THEN
                Motor_GateDown := FALSE;
                CurrentState   := STATE_OPENING;
            ELSIF PB_ManualOpen THEN
                Motor_GateDown := FALSE;
                CurrentState   := STATE_OPENING;
            ELSIF Sensor_GateClosedLimit THEN
                Motor_GateDown := FALSE;
                Buzzer         := FALSE;
                CurrentState   := STATE_CLOSED;
            END_IF;

        STATE_FAULT:
            Motor_GateUp   := FALSE;
            Motor_GateDown := FALSE;
            Buzzer         := FALSE;
            Light_Green    := FALSE;
            Light_Red      := TRUE;

    END_CASE;

    // ------------------------------------------------------------------------
    // 3. TIMERS & WATCHDOG EVALUATION
    // ------------------------------------------------------------------------
    TON_AutoClose(
        IN := (CurrentState = STATE_OPEN) AND NOT Sensor_VehiclePresence,
        PT := T_AutoCloseDelay
    );

    TON_Watchdog(
        IN := (CurrentState = STATE_OPENING) OR (CurrentState = STATE_CLOSING),
        PT := T_WatchdogTimeout
    );

    IF TON_Watchdog.Q THEN
        Alarm_StuckGate := TRUE;
        Motor_GateUp    := FALSE;
        Motor_GateDown  := FALSE;
        Buzzer          := FALSE;
        CurrentState    := STATE_FAULT;
    END_IF;

END_PROGRAM
`;

export const CodeViewer: React.FC = () => {
  const { inputs, outputs, gateState, watchdogTimeMs, autoCloseTimeMs, scanCount, lastScanDurationMs } = usePlcStore();
  const [activeTab, setActiveTab] = useState<'st' | 'registers'>('st');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
      {/* Top Bar */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Code2 className="w-5 h-5 text-blue-400" />
          <span className="text-xs font-mono font-bold text-slate-200">
            parkingGateLogic.st (IEC 61131-3 Structured Text)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('st')}
            className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
              activeTab === 'st'
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Structured Text Code
          </button>
          <button
            onClick={() => setActiveTab('registers')}
            className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
              activeTab === 'registers'
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Variable Table
          </button>
        </div>
      </div>

      {/* Editor or Variable Table Content */}
      <div className="flex-1 relative bg-slate-950">
        {activeTab === 'st' ? (
          <Editor
            height="100%"
            defaultLanguage="pascal"
            value={ST_CODE}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fontFamily: 'JetBrains Mono, Fira Code, monospace',
            }}
          />
        ) : (
          <div className="p-4 overflow-y-auto h-full space-y-4 text-xs font-mono">
            <div>
              <h4 className="text-slate-400 font-bold mb-2 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1">
                Inputs (%I0.1.0 - %I0.1.7)
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(inputs).map(([key, val]) => (
                  <div key={key} className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-300">{key}:</span>
                    <span className={val ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                      {val ? 'TRUE (1)' : 'FALSE (0)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-slate-400 font-bold mb-2 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1">
                Outputs (%Q0.2.0 - %Q0.2.5)
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(outputs).map(([key, val]) => (
                  <div key={key} className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-300">{key}:</span>
                    <span className={val ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                      {val ? 'TRUE (1)' : 'FALSE (0)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-slate-400 font-bold mb-2 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1">
                Timers & Internal State
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-300">CurrentState:</span>
                  <span className="text-blue-400 font-bold">{gateState}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-300">TON_Watchdog.ET:</span>
                  <span className="text-purple-400 font-bold">{Math.round(watchdogTimeMs)} ms</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-300">TON_AutoClose.ET:</span>
                  <span className="text-purple-400 font-bold">{Math.round(autoCloseTimeMs)} ms</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-300">PLC Scan Count:</span>
                  <span className="text-slate-200">{scanCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Execution Diagnostics Footer */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Cpu className="w-4 h-4" />
            M580 RACK 0 SLOT 1
          </span>
          <span>|</span>
          <span>Cyclic Task: 50ms</span>
          <span>|</span>
          <span>Last Scan: {lastScanDurationMs.toFixed(2)}ms</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-slate-300">Active State:</span>
          <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
            {gateState}
          </span>
        </div>
      </div>
    </div>
  );
};
