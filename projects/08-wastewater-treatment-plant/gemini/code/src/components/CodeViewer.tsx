import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeViewerProps {
  code?: string;
}

const defaultStCode = `(* Wastewater Treatment Plant PLC Control Program *)
PROGRAM MainControl
VAR
    InfluentLevel AT %IW0 : REAL; (* Level % *)
    DO_Sensor AT %IW1     : REAL; (* Dissolved Oxygen mg/L *)
    
    Blower_Cmd AT %QX0.0  : BOOL; (* Blower Motor Relay *)
    InflowPump AT %QX0.1  : BOOL; (* Influent Pump Relay *)
    Alarm_HighDO AT %QX1.0: BOOL; (* High Oxygen Alarm *)
END_VAR

IF InfluentLevel > 80.0 THEN
    InflowPump := TRUE;
ELSIF InfluentLevel < 20.0 THEN
    InflowPump := FALSE;
END_IF;

IF DO_Sensor < 2.0 THEN
    Blower_Cmd := TRUE;
ELSIF DO_Sensor > 4.0 THEN
    Blower_Cmd := FALSE;
END_IF;

Alarm_HighDO := DO_Sensor > 5.0;

END_PROGRAM
`;

export const CodeViewer: React.FC<CodeViewerProps> = ({ code = defaultStCode }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-[400px] flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold text-cyan-400">Structured Text (IEC 61131-3) Logic Editor</h2>
        <span className="text-xs text-slate-400 font-mono">wastewaterLogic.st</span>
      </div>
      <div className="flex-1 border border-slate-800 rounded overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="pascal"
          theme="vs-dark"
          value={code}
          options={{
            readOnly: false,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
};