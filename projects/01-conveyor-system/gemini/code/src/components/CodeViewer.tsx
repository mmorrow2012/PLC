import React from 'react';
import { usePlcStore } from '../store/usePlcStore';

export const CodeViewer: React.FC = () => {
  const { stCode, setStCode } = usePlcStore();

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
          PLC Logic Editor (Structured Text)
        </span>
        <span className="text-xs text-slate-400 font-mono">conveyorLogic.st</span>
      </div>
      <div className="flex-1 p-3 font-mono text-sm overflow-auto">
        <textarea
          value={stCode}
          onChange={(e) => setStCode(e.target.value)}
          className="w-full h-full bg-transparent text-slate-200 resize-none focus:outline-none font-mono text-sm leading-relaxed"
          spellCheck={false}
        />
      </div>
    </div>
  );
};
