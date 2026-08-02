import React from 'react';
import { PLCProvider } from './context/PLCContext';
import { Header } from './components/Header';
import { Visualizer } from './components/Visualizer';
import { CodeViewer } from './components/CodeViewer';
import { ControlPanel } from './components/ControlPanel';
import { TrendChart } from './components/TrendChart';

export const App: React.FC = () => {
  return (
    <PLCProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
        {/* Header Navigation & PLC Status */}
        <Header />

        {/* Main Dashboard Grid */}
        <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-[1800px] w-full mx-auto">
          {/* Left Column: 2D SCADA Twin Visualizer (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <Visualizer />
            <TrendChart />
          </div>

          {/* Right Column: HMI Control Panel & IEC Code Monitor (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <ControlPanel />
            <CodeViewer />
          </div>
        </main>
      </div>
    </PLCProvider>
  );
};

export default App;
