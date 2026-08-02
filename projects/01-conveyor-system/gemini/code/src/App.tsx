import React from 'react';
import CodeViewer from './components/CodeViewer';
import Visualizer from './components/Visualizer';
import ControlPanel from './components/ControlPanel';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
          Industrial PLC Network Demonstrator
        </h1>
        <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
          SYSTEM READY
        </span>
      </header>
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <ControlPanel />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Visualizer />
          <CodeViewer />
        </div>
      </main>
    </div>
  );
};

export default App;
