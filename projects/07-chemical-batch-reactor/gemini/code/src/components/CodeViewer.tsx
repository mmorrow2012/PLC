import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { usePlcStore } from '../store/usePlcStore';

interface CodeViewerProps {
  code?: string;
  onChange?: (val: string | undefined) => void;
}

const defaultCode = `(* IEC 61131-3 Structured Text - Chemical Batch Reactor *)
PROGRAM BatchReactorControl
VAR_INPUT
    DI_START_PB    : BOOL; (* Start Pushbutton *)
    DI_STOP_PB     : BOOL; (* Stop Pushbutton *)
    DI_ESTOP       : BOOL; (* Emergency Stop NC *)
    AI_TEMP        : REAL; (* Temperature (°C) *)
    AI_LEVEL       : REAL; (* Volume (Liters) *)
END_VAR

VAR_OUTPUT
    DO_VALVE_A     : BOOL; (* Charge Valve A *)
    DO_VALVE_B     : BOOL; (* Charge Valve B *)
    DO_AGITATOR    : BOOL; (* Mixer Motor *)
    DO_HEATER      : BOOL; (* Thermal Jacket *)
    DO_COOLING     : BOOL; (* Cooling Valve *)
    DO_DRAIN_VALVE : BOOL; (* Discharge Valve *)
END_VAR

VAR
    fbBlend        : FB_BatchBlend;
    fbTemp         : FB_TempControl;
    fbSafety       : FB_SafetyInterlock;
END_VAR

(* Execute Function Blocks *)
fbSafety(EStop := DI_ESTOP, OverTemp := AI_TEMP > 90.0);
IF NOT fbSafety.Trip THEN
    fbBlend(Start := DI_START_PB, Level := AI_LEVEL, ValveA => DO_VALVE_A, ValveB => DO_VALVE_B);
    fbTemp(Level := AI_LEVEL, Temp := AI_TEMP, Heater => DO_HEATER, Agitator => DO_AGITATOR, Cooling => DO_COOLING);
END_IF;
END_PROGRAM
`;

export const CodeViewer: React.FC<CodeViewerProps> = ({ code = defaultCode, onChange }) => {
  const [activeTab, setActiveTab] = useState<'ld' | 'st'>('ld');
  const { inputs, outputs, phase } = usePlcStore();

  const isEStopActive = inputs.estop;
  const isStart = inputs.startPb || phase !== 'IDLE';

  const vAOn = outputs.valveA;
  const vBOn = outputs.valveB;
  const agitatorOn = outputs.agitator;
  const heaterOn = outputs.heater;
  const coolingOn = outputs.coolingValve;
  const drainOn = outputs.drainValve;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-2xl h-full">
      {/* Header Bar with View Toggle Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-sky-400 font-bold text-sm font-mono uppercase tracking-wide">
            PLC Process Logic Engine Monitor
          </span>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono text-xs">
          <button
            onClick={() => setActiveTab('ld')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all ${
              activeTab === 'ld'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Live Ladder Diagram (LD) & FBs
          </button>
          <button
            onClick={() => setActiveTab('st')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all ${
              activeTab === 'st'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📄 Structured Text (ST)
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 bg-slate-950 rounded-lg p-4 font-mono text-xs overflow-auto border border-slate-800/80 min-h-[350px]">
        {activeTab === 'ld' ? (
          <div className="flex flex-col gap-5">
            {/* Legend */}
            <div className="flex items-center gap-4 text-[11px] text-slate-400 pb-2 border-b border-slate-800/60">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-300 font-semibold">POWER ENERGIZED (TRUE)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-700" />
                <span>POWER OFF (FALSE)</span>
              </div>
            </div>

            {/* Rung 1: FB_BatchBlend - Chemical A Feed */}
            <RungCard
              rungNumber={1}
              title="FB_BatchBlend: Raw Chemical A Feed Valve (%Q0.0)"
              powerFlow={!isEStopActive && isStart && phase === 'CHARGING_A'}
              elements={[
                { type: 'NC', label: 'E_STOP', state: !isEStopActive },
                { type: 'NO', label: 'START_PB', state: isStart },
                { type: 'FB', label: 'FB_BatchBlend (Chem A)', state: phase === 'CHARGING_A' },
                { type: 'COIL', label: 'Valve_A (%Q0.0)', state: vAOn },
              ]}
            />

            {/* Rung 2: FB_BatchBlend - Chemical B Feed */}
            <RungCard
              rungNumber={2}
              title="FB_BatchBlend: Raw Chemical B Feed Valve (%Q0.1)"
              powerFlow={!isEStopActive && phase === 'CHARGING_B'}
              elements={[
                { type: 'NC', label: 'E_STOP', state: !isEStopActive },
                { type: 'NO', label: 'TargetA_Reached', state: phase === 'CHARGING_B' },
                { type: 'FB', label: 'FB_BatchBlend (Chem B)', state: phase === 'CHARGING_B' },
                { type: 'COIL', label: 'Valve_B (%Q0.1)', state: vBOn },
              ]}
            />

            {/* Rung 3: FB_TempControl - Agitator & Heater */}
            <RungCard
              rungNumber={3}
              title="FB_TempControl: Agitator Mixer (%Q0.2) & Heating Jacket (%Q0.3)"
              powerFlow={!isEStopActive && (phase === 'HEATING' || phase === 'REACTION')}
              elements={[
                { type: 'NC', label: 'E_STOP', state: !isEStopActive },
                { type: 'NO', label: 'Blend_Full (700L)', state: phase === 'HEATING' || phase === 'REACTION' },
                { type: 'FB', label: 'FB_TempControl (85°C)', state: heaterOn || agitatorOn },
                { type: 'COIL', label: 'Heater & Agitator', state: heaterOn || agitatorOn },
              ]}
            />

            {/* Rung 4: FB_SafetyInterlock - Cooling Valve */}
            <RungCard
              rungNumber={4}
              title="FB_SafetyInterlock: Thermal Stabilization Cooling Valve (%Q0.5)"
              powerFlow={coolingOn || inputs.temperature > 85}
              elements={[
                { type: 'NO', label: 'Temp > 85°C', state: inputs.temperature > 85 },
                { type: 'FB', label: 'FB_SafetyInterlock', state: coolingOn },
                { type: 'COIL', label: 'Cooling_Valve (%Q0.5)', state: coolingOn },
              ]}
            />

            {/* Rung 5: Product Discharge Drain */}
            <RungCard
              rungNumber={5}
              title="Product Batch Discharge Bottom Drain Valve (%Q0.6)"
              powerFlow={phase === 'DRAINING'}
              elements={[
                { type: 'NC', label: 'E_STOP', state: !isEStopActive },
                { type: 'NO', label: 'Reaction_Complete', state: phase === 'DRAINING' },
                { type: 'COIL', label: 'Drain_Valve (%Q0.6)', state: drainOn },
              ]}
            />
          </div>
        ) : (
          /* Structured Text View */
          <div className="h-full border border-slate-800 rounded overflow-hidden">
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
        )}
      </div>
    </div>
  );
};

interface RungElement {
  type: 'NO' | 'NC' | 'COIL' | 'FB';
  label: string;
  state: boolean;
}

const RungCard: React.FC<{
  rungNumber: number;
  title: string;
  powerFlow: boolean;
  elements: RungElement[];
}> = ({ rungNumber, title, powerFlow, elements }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800/80 pb-1.5">
        <span>RUNG {rungNumber}: <strong className="text-slate-200">{title}</strong></span>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            powerFlow
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              : 'bg-slate-800 text-slate-500'
          }`}
        >
          {powerFlow ? 'ENERGIZED' : 'DE-ENERGIZED'}
        </span>
      </div>

      <div className="flex items-center w-full py-2 px-1 select-none overflow-x-auto">
        <div className="flex flex-col items-center shrink-0">
          <div className="w-1.5 h-12 bg-sky-500 shadow-[0_0_8px_#0284c7]" />
          <span className="text-[9px] text-sky-400 font-bold mt-0.5">24V</span>
        </div>

        <div className={`h-1 w-6 shrink-0 ${elements[0]?.state ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-slate-700'}`} />

        <div className="flex items-center gap-1 flex-1 min-w-[280px]">
          {elements.map((el, i) => {
            const isLast = i === elements.length - 1;
            return (
              <React.Fragment key={i}>
                {el.type === 'COIL' ? (
                  <div className="flex flex-col items-center mx-2 shrink-0">
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-[10px] transition-all ${
                        el.state
                          ? 'bg-emerald-950 border-emerald-400 text-emerald-300 shadow-[0_0_12px_#10b981] animate-pulse'
                          : 'bg-slate-950 border-slate-700 text-slate-500'
                      }`}
                    >
                      ( )
                    </div>
                    <span className={`text-[10px] mt-1 font-semibold ${el.state ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {el.label}
                    </span>
                  </div>
                ) : el.type === 'FB' ? (
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className={`px-3 py-1.5 rounded border text-[11px] font-bold font-mono transition-all ${
                        el.state
                          ? 'bg-sky-950/80 border-sky-400 text-sky-300 shadow-[0_0_8px_#38bdf8]'
                          : 'bg-slate-950 border-slate-700 text-slate-500'
                      }`}
                    >
                      [FB: {el.label}]
                    </div>
                    <span className="text-[9px] text-sky-400 font-semibold mt-1">
                      FUNC BLOCK
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className={`px-2.5 py-1.5 rounded border text-[11px] font-bold font-mono transition-all ${
                        el.state
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_8px_#10b981]'
                          : 'bg-slate-950 border-slate-700 text-slate-500'
                      }`}
                    >
                      {el.type === 'NO' ? `[ ${el.label} ]` : `[/ ${el.label} /]`}
                    </div>
                    <span className="text-[9px] text-slate-500 mt-1">
                      {el.type === 'NO' ? 'N.O.' : 'N.C.'}
                    </span>
                  </div>
                )}

                {!isLast && (
                  <div
                    className={`h-1 flex-1 min-w-[16px] transition-colors ${
                      el.state ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-slate-700'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className={`h-1 w-6 shrink-0 ${powerFlow ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-slate-700'}`} />

        <div className="flex flex-col items-center shrink-0">
          <div className="w-1.5 h-12 bg-slate-600" />
          <span className="text-[9px] text-slate-400 font-bold mt-0.5">GND</span>
        </div>
      </div>
    </div>
  );
};
