import React from 'react';

export const CodeViewer: React.FC = () => {
  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg flex flex-col flex-1">
      <h2 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-2">
        <span>Structured Text PLC Logic</span>
      </h2>
      <div className="flex-1 bg-slate-950 p-4 font-mono text-xs overflow-auto rounded border border-slate-800 text-emerald-400">
        <pre>{`// SoftPLC Program Skeleton\nPROGRAM Main\nVAR\n  bStart : BOOL;\n  bStop : BOOL;\n  bSystemActive : BOOL;\nEND_VAR\n\nIF bStart AND NOT bStop THEN\n  bSystemActive := TRUE;\nELSIF bStop THEN\n  bSystemActive := FALSE;\nEND_IF;`}</pre>
      </div>
    </div>
  );
};

export default CodeViewer;
