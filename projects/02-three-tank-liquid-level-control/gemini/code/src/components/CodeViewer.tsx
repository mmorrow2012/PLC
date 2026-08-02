import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { usePlcStore } from '../store/usePlcStore';

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
    Valve2_Open : BOOL;
    Valve3_Open : BOOL;
END_VAR

IF AutoMode THEN
    Pump1_Run := Tank1_Level < 70.0;
    Valve1_Open := Tank1_Level > 15.0 AND Tank2_Level < 50.0;
    Valve2_Open := Tank2_Level > 15.0 AND Tank3_Level < 30.0;
    Valve3_Open := Tank3_Level > 25.0;
END_IF;
END_PROGRAM
`;

export const CodeViewer: React.FC<CodeViewerProps> = ({ code = defaultCode, onChange }) => {
  const [activeTab, setActiveTab] = useState<'ld' | 'st'>('ld');
  const { autoMode, tanks, pumps, valves } = usePlcStore();

  const p1Run = pumps.P1?.isRunning ?? false;
  const v1Open = valves.V1?.isOpen ?? false;
  const v2Open = valves.V2?.isOpen ?? false;
  const v3Open = valves.V3?.isOpen ?? false;

  const t1Low = tanks.tank1 ? tanks.tank1.level < 70 : false;
  const t1High = tanks.tank1 ? tanks.tank1.level > 15 : false;
  const t2High = tanks.tank2 ? tanks.tank2.level > 15 : false;
  const t3High = tanks.tank3 ? tanks.tank3.level > 25 : false;

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
            ⚡ Live Ladder Diagram (LD)
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

            {/* Rung 1: Pump P1 Inlet Fill */}
            <RungCard
              rungNumber={1}
              title="Inlet Pump P1 (Fill Tank 1 < 70%)"
              powerFlow={autoMode && t1Low}
              elements={[
                { type: 'NO', label: 'AUTO_MODE', state: autoMode },
                { type: 'NO', label: 'Tank1 < 70%', state: t1Low },
                { type: 'COIL', label: 'P1_Run', state: p1Run },
              ]}
            />

            {/* Rung 2: Valve V1 Cascade Out */}
            <RungCard
              rungNumber={2}
              title="Cascade Valve V1 (Tank 1 -> Tank 2)"
              powerFlow={autoMode && t1High}
              elements={[
                { type: 'NO', label: 'AUTO_MODE', state: autoMode },
                { type: 'NO', label: 'Tank1 > 15%', state: t1High },
                { type: 'COIL', label: 'V1_Open', state: v1Open },
              ]}
            />

            {/* Rung 3: Valve V2 Cascade Out */}
            <RungCard
              rungNumber={3}
              title="Cascade Valve V2 (Tank 2 -> Tank 3)"
              powerFlow={autoMode && t2High}
              elements={[
                { type: 'NO', label: 'AUTO_MODE', state: autoMode },
                { type: 'NO', label: 'Tank2 > 15%', state: t2High },
                { type: 'COIL', label: 'V2_Open', state: v2Open },
              ]}
            />

            {/* Rung 4: Valve V3 Drain Solenoid */}
            <RungCard
              rungNumber={4}
              title="Process Outlet Valve V3 (Drain Tank 3)"
              powerFlow={autoMode && t3High}
              elements={[
                { type: 'NO', label: 'AUTO_MODE', state: autoMode },
                { type: 'NO', label: 'Tank3 > 25%', state: t3High },
                { type: 'COIL', label: 'V3_Open', state: v3Open },
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
  type: 'NO' | 'NC' | 'COIL';
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
