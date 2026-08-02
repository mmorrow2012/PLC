import React from 'react';

export const CodeViewer: React.FC = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <h2 className="text-lg font-semibold text-slate-100">PLC Logic Editor (IEC 61131-3)</h2>
        <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2 py-1 rounded">
          parkingGateLogic.st
        </span>
      </div>
      <div className="flex-1 bg-slate-950 rounded p-4 font-mono text-sm text-slate-300 overflow-auto border border-slate-800/60">
        <p className="text-slate-500">// Structured Text Logic Code Viewer Placeholder</p>
        <pre className="mt-2 text-emerald-400">PROGRAM ParkingGateLogic</pre>
        <pre className="pl-4 text-slate-400">...</pre>
        <pre className="text-emerald-400">END_PROGRAM</pre>
      </div>
    </div>
  );
};
