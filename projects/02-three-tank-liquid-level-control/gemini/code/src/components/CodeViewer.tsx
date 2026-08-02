import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeViewerProps {
  code?: string;
  onChange?: (val: string | undefined) => void;
}

const defaultCode = `(* IEC 61131-3 Structured Text - Three-Tank Control *)
PROGRAM ThreeTankControl
VAR_INPUT
    AutoMode : BOOL;
    Tank1_Level : REAL;
    Tank2_Level : REAL;
    Tank3_Level : REAL;
END_VAR

VAR_OUTPUT
    Pump1_Run : BOOL;
    Pump2_Run : BOOL;
    Valve1_Open : BOOL;
END_VAR

IF AutoMode THEN
    Pump1_Run := Tank1_Level < 70.0;
END_IF;
END_PROGRAM
`;

export const CodeViewer: React.FC<CodeViewerProps> = ({ code = defaultCode, onChange }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col h-full">
      <h2 className="text-lg font-semibold text-slate-200 mb-4 border-b border-slate-700 pb-2 flex items-center justify-between">
        <span>Structured Text (ST) Logic Editor</span>
        <span className="text-xs font-mono text-sky-400 bg-sky-950 border border-sky-800 px-2 py-0.5 rounded">
          IEC 61131-3
        </span>
      </h2>
      <div className="flex-1 min-h-[250px] border border-slate-700 rounded overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="pascal"
          theme="vs-dark"
          value={code}
          onChange={onChange}
          options={{
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
