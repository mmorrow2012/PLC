import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { usePlcStore } from '../store/usePlcStore';

interface CodeViewerProps {
  stCode: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ stCode }) => {
  const { inputs, outputs, systemFault, scanTimeMs, cycleCount } = usePlcStore();
  const [activeTab, setActiveTab] = useState<'ld' | 'st'>('ld');
  const [copied, setCopied] = useState(false);
  const formattedScanTime = scanTimeMs.toFixed(2);

  const handleCopy = () => {
    navigator.clipboard.writeText(stCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rung1Power = inputs.E_Stop && !systemFault;
  const rung2Power = outputs.VFD_Run;
  const rung3Power = inputs.Sensor_PartDetect && outputs.Actuator_Diverter;
  const rung4Power = systemFault;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[560px]">
      {/* Header Bar with View Toggle Tabs */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs px-2.5 py-1 rounded font-bold">
            PLC Logic Engine Monitor
          </div>
          <span className="font-mono text-sm text-slate-200 font-semibold">
            src/plc/conveyorLogic.st
          </span>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 font-mono text-xs shrink-0">
          <button
            onClick={() => setActiveTab('ld')}
            className={`px-3 py-1 rounded-md font-bold transition-all ${
              activeTab === 'ld'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Live Ladder Diagram (LD)
          </button>
          <button
            onClick={() => setActiveTab('st')}
            className={`px-3 py-1 rounded-md font-bold transition-all ${
              activeTab === 'st'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📄 Structured Text (ST)
          </button>
        </div>

        <div className="flex items-center gap-4 font-mono text-xs text-slate-400 shrink-0">
          <div>
            Scan:{' '}
            <span className="inline-block min-w-[7ch] text-right tabular-nums text-emerald-400 font-bold">
              {formattedScanTime} ms
            </span>
          </div>
          <div>
            Cycles: <span className="text-cyan-400 font-bold">{cycleCount}</span>
          </div>
          <button
            onClick={handleCopy}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded border border-slate-700 transition-colors active:scale-95"
          >
            {copied ? 'Copied!' : 'Copy Logic'}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 bg-slate-950 overflow-auto p-4 font-mono text-xs">
        {activeTab === 'ld' ? (
          <div className="flex flex-col gap-4">
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

            {/* Rung 1: Safety Interlock */}
            <RungCard
              rungNumber={1}
              title="System Safety Interlock & Fault Latch"
              powerFlow={rung1Power}
              elements={[
                { type: 'NO', label: 'E_Stop (NC)', state: inputs.E_Stop },
                { type: 'NC', label: 'System_Fault', state: !systemFault },
                { type: 'COIL', label: 'Safety_Permissive', state: rung1Power },
              ]}
            />

            {/* Rung 2: VFD Conveyor Belt Run */}
            <RungCard
              rungNumber={2}
              title="Conveyor Motor VFD Run Output"
              powerFlow={rung2Power}
              elements={[
                { type: 'NO', label: 'Safety_Permissive', state: rung1Power },
                { type: 'COIL', label: 'VFD_Run', state: outputs.VFD_Run },
              ]}
            />

            {/* Rung 3: Pneumatic Diverter Actuator */}
            <RungCard
              rungNumber={3}
              title="Sorting Actuator Diverter Solenoid"
              powerFlow={rung3Power}
              elements={[
                { type: 'NO', label: 'Sensor_PartDetect', state: inputs.Sensor_PartDetect },
                { type: 'NO', label: 'Reject_Part_Detected', state: outputs.Actuator_Diverter },
                { type: 'COIL', label: 'Actuator_Diverter', state: outputs.Actuator_Diverter },
              ]}
            />

            {/* Rung 4: Safety Fault Alarm */}
            <RungCard
              rungNumber={4}
              title="E-Stop Fault Latch Alarm"
              powerFlow={rung4Power}
              elements={[
                { type: 'NC', label: 'E_Stop (NC)', state: !inputs.E_Stop },
                { type: 'COIL', label: 'System_Fault', state: systemFault },
              ]}
            />
          </div>
        ) : (
          /* Structured Text View */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            <div className="lg:col-span-2 h-full bg-slate-950 rounded border border-slate-800 overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="pascal"
                theme="vs-dark"
                value={stCode}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  renderLineHighlight: 'all',
                  fontFamily: 'Consolas, "Fira Code", Monaco, monospace',
                }}
              />
            </div>

            <div className="p-4 bg-slate-900 overflow-y-auto rounded border border-slate-800 flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
                Live Memory Register Monitor
              </h3>

              <div>
                <div className="text-cyan-400 font-bold mb-2 uppercase text-[11px]">VAR_INPUT Image</div>
                <div className="bg-slate-950 border border-slate-800 rounded divide-y divide-slate-800/60">
                  <div className="flex justify-between p-2">
                    <span className="text-slate-400">E_Stop (NC)</span>
                    <span className={inputs.E_Stop ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold animate-pulse'}>
                      {inputs.E_Stop ? 'TRUE' : 'FALSE (TRIPPED)'}
                    </span>
                  </div>
                  <div className="flex justify-between p-2">
                    <span className="text-slate-400">Sensor_PartDetect</span>
                    <span className={inputs.Sensor_PartDetect ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                      {inputs.Sensor_PartDetect ? 'TRUE' : 'FALSE'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-emerald-400 font-bold mb-2 uppercase text-[11px]">VAR_OUTPUT Image</div>
                <div className="bg-slate-950 border border-slate-800 rounded divide-y divide-slate-800/60">
                  <div className="flex justify-between p-2">
                    <span className="text-slate-400">VFD_Run</span>
                    <span className={outputs.VFD_Run ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                      {outputs.VFD_Run ? 'TRUE' : 'FALSE'}
                    </span>
                  </div>
                  <div className="flex justify-between p-2">
                    <span className="text-slate-400">Actuator_Diverter</span>
                    <span className={outputs.Actuator_Diverter ? 'text-yellow-400 font-bold' : 'text-slate-500'}>
                      {outputs.Actuator_Diverter ? 'TRUE' : 'FALSE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
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
          <div className="w-1.5 h-12 bg-cyan-500 shadow-[0_0_8px_#06b6d4]" />
          <span className="text-[9px] text-cyan-400 font-bold mt-0.5">24V</span>
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
