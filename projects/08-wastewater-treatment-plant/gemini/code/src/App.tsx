import React, { useState, useEffect, useRef } from 'react';
import { createInitialPLCState, executePLCScan } from './services/plcEngine';
import { PLCSystemState } from './types/plc';
import { Header } from './components/Header';
import { Visualizer } from './components/Visualizer';
import { CodeViewer } from './components/CodeViewer';
import { ControlPanel } from './components/ControlPanel';
import { AlarmPanel } from './components/AlarmPanel';

export default function App() {
  const [plcState, setPlcState] = useState<PLCSystemState>(createInitialPLCState());
  const plcRef = useRef<PLCSystemState>(plcState);
  plcRef.current = plcState;

  // Soft PLC Scan Loop Interval (50ms)
  useEffect(() => {
    const interval = setInterval(() => {
      if (plcRef.current.isRunning) {
        setPlcState((prevState) => executePLCScan(prevState));
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const toggleScan = () => {
    setPlcState((prev) => ({
      ...prev,
      isRunning: !prev.isRunning,
    }));
  };

  const handleUpdateInputs = (newInputs: Partial<PLCSystemState['inputs']>) => {
    setPlcState((prev) => {
      const updated = {
        ...prev,
        inputs: { ...prev.inputs, ...newInputs },
      };
      return executePLCScan(updated);
    });
  };

  const handleUpdateAnalogInputs = (newAnalogs: Partial<PLCSystemState['analogInputs']>) => {
    setPlcState((prev) => {
      const updated = {
        ...prev,
        analogInputs: { ...prev.analogInputs, ...newAnalogs },
      };
      return executePLCScan(updated);
    });
  };

  const handleUpdateMemory = (newMemory: Partial<PLCSystemState['memory']>) => {
    setPlcState((prev) => {
      const updated = {
        ...prev,
        memory: { ...prev.memory, ...newMemory },
      };
      return executePLCScan(updated);
    });
  };

  const handleUpdateSimulation = (newSim: Partial<PLCSystemState['simulation']>) => {
    setPlcState((prev) => ({
      ...prev,
      simulation: { ...prev.simulation, ...newSim },
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Header plcState={plcState} onToggleScan={toggleScan} />

      <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto space-y-6">
        <AlarmPanel plcState={plcState} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Visualizer plcState={plcState} />
          <ControlPanel
            plcState={plcState}
            onUpdateInputs={handleUpdateInputs}
            onUpdateAnalogInputs={handleUpdateAnalogInputs}
            onUpdateMemory={handleUpdateMemory}
            onUpdateSimulation={handleUpdateSimulation}
          />
        </div>

        <CodeViewer plcState={plcState} />
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500 font-mono">
        Municipal Wastewater Treatment Plant Control SCADA • Schneider Modicon M580 / EcoStruxure Standard • IEC 61131-3 Logic Runtime Engine
      </footer>
    </div>
  );
}