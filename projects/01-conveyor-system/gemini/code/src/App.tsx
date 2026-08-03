import React, { useEffect } from 'react';
import { startSoftPlcEngine, stopSoftPlcEngine } from './plc/softPlcEngine';
import { Visualizer } from './components/Visualizer';
import { ControlPanel } from './components/ControlPanel';
import { CodeViewer } from './components/CodeViewer';

const stCodeContent = `(*
 * Schneider Electric Modicon M580 (BMEP582040) Structured Text Logic
 * EcoStruxure Control Expert (Unity Pro) Compatible Program
 * Application: Automated Sorting Conveyor System with Safety Interlock
 * Standard: IEC 61131-3 ST
 *)

PROGRAM Conveyor_Sorting_Control
VAR_INPUT
    E_Stop            : BOOL := TRUE;  (* NC Hardware Safety Switch (FALSE = Active E-STOP) *)
    Reset_PB          : BOOL := FALSE; (* Manual Fault Reset Pushbutton Pulse *)
    Sensor_PartDetect : BOOL := FALSE; (* Photoelectric Part Presence Sensor *)
    Sensor_Color      : INT  := 0;     (* 1 = Red/Reject, 2 = Green/Accept, 3 = Blue/Special *)
    Sensor_Weight     : REAL := 0.0;   (* Load cell reading in Kilograms *)
    Target_Speed      : REAL := 75.0;  (* Desired VFD Speed Reference (0.0 to 100.0%) *)
END_VAR

VAR_OUTPUT
    VFD_Run           : BOOL := FALSE; (* VFD Main Contact & Motor Run Command *)
    VFD_Speed_Ref     : REAL := 0.0;   (* Motor Speed Reference Percentage (0.0 - 100.0%) *)
    Actuator_Diverter : BOOL := FALSE; (* Pneumatic Diverter Arm Solenoid *)
    Alarm_Tower       : DWORD := 16#00000004; (* Bit 0: Green, Bit 1: Yellow, Bit 2: Red *)
END_VAR

VAR
    System_Fault      : BOOL := TRUE;  (* Safety Interlock Latch State *)
    Part_Count_Total  : DINT := 0;
    Part_Count_Reject : DINT := 0;
    Part_Count_Accept : DINT := 0;
    
    MIN_WEIGHT_KG     : REAL := 0.5;
    MAX_WEIGHT_KG     : REAL := 5.0;
    COLOR_REJECT_CODE : INT  := 1;
END_VAR

// 1. SAFETY INTERLOCK & TRIP LOGIC
IF NOT E_Stop THEN
    System_Fault      := TRUE;
    VFD_Run           := FALSE;
    VFD_Speed_Ref     := 0.0;
    Actuator_Diverter := FALSE;
    Alarm_Tower       := 16#00000004; // Red Beacon
ELSIF Reset_PB AND System_Fault THEN
    System_Fault      := FALSE;
END_IF;

// 2. MAIN CONVEYOR & SORTING CONTROL SCAN
IF NOT System_Fault THEN
    VFD_Run := TRUE;
    VFD_Speed_Ref := Target_Speed;

    // 3. AUTOMATED PART SORTING EVALUATION
    IF Sensor_PartDetect THEN
        IF (Sensor_Color = COLOR_REJECT_CODE) OR 
           (Sensor_Weight < MIN_WEIGHT_KG) OR 
           (Sensor_Weight > MAX_WEIGHT_KG) THEN
            Actuator_Diverter := TRUE;
            Alarm_Tower       := 16#00000003; // Green + Yellow Warning
        ELSE
            Actuator_Diverter := FALSE;
            Alarm_Tower       := 16#00000001; // Green
        END_IF;
    ELSE
        Actuator_Diverter := FALSE;
        Alarm_Tower       := 16#00000001; // Green
    END_IF;
ELSE
    VFD_Run           := FALSE;
    VFD_Speed_Ref     := 0.0;
    Actuator_Diverter := FALSE;
    Alarm_Tower       := 16#00000004;
END_IF;
END_PROGRAM`;

export const App: React.FC = () => {
  useEffect(() => {
    startSoftPlcEngine();
    return () => stopSoftPlcEngine();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* Main Dashboard Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 font-mono font-bold text-xl">
              M580
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-wide font-mono text-slate-100">
                Schneider Modicon M580 Conveyor Sorting Soft-PLC
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                IEC 61131-3 Structured Text Soft-PLC & Dynamic Interactive Visualizer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-300">
              PLC Model: <strong className="text-cyan-400">BMEP582040</strong>
            </span>
            <span className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-300">
              IDE: <strong className="text-emerald-400">EcoStruxure Expert</strong>
            </span>
          </div>
        </header>

        {/* Main Content Layout Grid */}
        <main className="flex flex-col gap-6">
          {/* Conveyor Visualizer */}
          <Visualizer />

          {/* Control Panel */}
          <ControlPanel />

          {/* Monaco Editor & PLC Code Inspection */}
          <CodeViewer stCode={stCodeContent} />
        </main>

        {/* Dashboard Footer */}
        <footer className="text-center font-mono text-xs text-slate-600 py-4 border-t border-slate-900">
          Industrial Automation Soft-PLC Simulation System • Modicon M580 IEC 61131-3 Implementation
        </footer>
      </div>
    </div>
  );
};

export default App;
