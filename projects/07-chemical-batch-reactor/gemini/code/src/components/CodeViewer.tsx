import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Code2, FileCode } from 'lucide-react';

const defaultCode = `(* ========================================================================= *)
(* CHEMICAL BATCH REACTOR CONTROL PROGRAM                                    *)
(* Standard: IEC 61131-3 Structured Text (ST)                              *)
(* Project: 07-chemical-batch-reactor / Gemini Demonstrator                   *)
(* ========================================================================= *)

PROGRAM BatchReactorControl
VAR_INPUT
    DI_START_PB    : BOOL; (* Start Pushbutton *)
    DI_STOP_PB     : BOOL; (* Stop Pushbutton *)
    DI_ESTOP       : BOOL; (* Emergency Stop Active *)
    AI_TEMP        : REAL; (* Temperature Sensor (°C) *)
    AI_LEVEL       : REAL; (* Reactor Level Sensor (Liters) *)
END_VAR

VAR_OUTPUT
    DO_VALVE_A     : BOOL; (* Charge Valve A *)
    DO_VALVE_B     : BOOL; (* Charge Valve B *)
    DO_DRAIN_VALVE : BOOL; (* Drain Valve *)
    DO_AGITATOR    : BOOL; (* Agitator Motor *)
    DO_HEATER      : BOOL; (* Heater Relay *)
    DO_COOLING     : BOOL; (* Cooling Jacket Valve *)
END_VAR

VAR
    ePhase         : INT := 0;
    rSetTemp       : REAL := 85.0;
END_VAR

IF DI_ESTOP THEN
    DO_VALVE_A := FALSE;
    DO_VALVE_B := FALSE;
    DO_HEATER := FALSE;
    DO_COOLING := TRUE;
    RETURN;
END_IF;

CASE ePhase OF
    0: (* IDLE *)
        IF DI_START_PB THEN ePhase := 1; END_IF;
    1: (* CHARGING A *)
        DO_VALVE_A := TRUE;
        IF AI_LEVEL >= 400.0 THEN ePhase := 2; END_IF;
END_CASE;
END_PROGRAM`;

export const CodeViewer: React.FC = () => {
  const [code, setCode] = useState(defaultCode);

  return (
    <div className="bg-industrial-900 border border-industrial-700 rounded-lg p-5 shadow-xl flex flex-col h-full">
      <div className="flex justify-between items-center mb-3 border-b border-industrial-700 pb-2">
        <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
          <Code2 className="text-cyan-400 w-5 h-5" /> IEC 61131-3 Structured Text Code Editor
        </h2>
        <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-industrial-950 px-2.5 py-1 rounded border border-industrial-800">
          <FileCode className="w-3.5 h-3.5 text-cyan-400" /> batchReactorLogic.st
        </div>
      </div>

      <div className="flex-1 min-h-[350px] border border-industrial-800 rounded overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="pascal"
          theme="vs-dark"
          value={code}
          onChange={(v) => setCode(v || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'JetBrains Mono, Consolas, monospace',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            lineNumbers: 'on',
          }}
        />
      </div>
    </div>
  );
};
