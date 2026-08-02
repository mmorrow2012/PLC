import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AlarmBanner } from './components/AlarmBanner';
import { Visualizer } from './components/Visualizer';
import { CodeViewer } from './components/CodeViewer';
import { ControlPanel } from './components/ControlPanel';
import { createInitialPlcState, tickPlc } from './services/softPlc';
import { PlcState } from './types/plc';

export function App() {
  const [plcState, setPlcState] = useState<PlcState>(createInitialPlcState);
  const [activeTab, setActiveTab] = useState<'scada' | 'logic' | 'hmi'>('scada');

  // Soft-PLC Scan Loop Execution (100ms interval tick)
  useEffect(() => {
    const interval = setInterval(() => {
      setPlcState(prevState => tickPlc(prevState, 100));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleStartBatch = () => {
    setPlcState(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.inputs.I_StartBatch_PB = true;
      return next;
    });
    setTimeout(() => {
      setPlcState(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        next.inputs.I_StartBatch_PB = false;
        return next;
      });
    }, 300);
  };

  const handleStopBatch = () => {
    setPlcState(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.inputs.I_StopBatch_PB = true;
      return next;
    });
    setTimeout(() => {
      setPlcState(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        next.inputs.I_StopBatch_PB = false;
        return next;
      });
    }, 300);
  };

  const handleResetFault = () => {
    setPlcState(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.inputs.I_ResetFault_PB = true;
      next.physical.reactorTemp = Math.min(next.physical.reactorTemp, 80.0);
      next.inputs.I_AgitatorHealth = true;
      return next;
    });
    setTimeout(() => {
      setPlcState(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        next.inputs.I_ResetFault_PB = false;
        return next;
      });
    }, 300);
  };

  const handleToggleEStop = () => {
    setPlcState(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.inputs.I_EStop_NC = !next.inputs.I_EStop_NC;
      return next;
    });
  };

  const handleUpdateRecipe = (key: 'M_RecipeRatioA' | 'M_RecipeRatioB' | 'M_TargetTemp' | 'M_TargetpH', value: number) => {
    setPlcState(prev => ({
      ...prev,
      memory: {
        ...prev.memory,
        [key]: value
      }
    }));
  };

  const handleTriggerFault = (type: 'overheat' | 'overflow' | 'agitator' | 'estop') => {
    setPlcState(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (type === 'overheat') {
        next.physical.reactorTemp = 95.0;
      } else if (type === 'overflow') {
        next.physical.reactorLevel = 1950.0;
      } else if (type === 'agitator') {
        next.inputs.I_AgitatorHealth = false;
      } else if (type === 'estop') {
        next.inputs.I_EStop_NC = false;
      }
      return next;
    });
  };

  const handleRefillRawTanks = () => {
    setPlcState(prev => ({
      ...prev,
      physical: {
        ...prev.physical,
        tankALevel: 950.0,
        tankBLevel: 950.0
      }
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col">
      <Header plcState={plcState} activeTab={activeTab} setActiveTab={setActiveTab} />
      <AlarmBanner plcState={plcState} onResetFault={handleResetFault} />

      <main className="flex-1">
        {activeTab === 'scada' && (
          <Visualizer
            plcState={plcState}
            onStartBatch={handleStartBatch}
            onTriggerFault={handleTriggerFault}
          />
        )}

        {activeTab === 'logic' && (
          <CodeViewer plcState={plcState} />
        )}

        {activeTab === 'hmi' && (
          <ControlPanel
            plcState={plcState}
            onStartBatch={handleStartBatch}
            onStopBatch={handleStopBatch}
            onResetFault={handleResetFault}
            onToggleEStop={handleToggleEStop}
            onUpdateRecipe={handleUpdateRecipe}
            onTriggerFault={handleTriggerFault}
            onRefillRawTanks={handleRefillRawTanks}
          />
        )}
      </main>
    </div>
  );
}

export default App;
