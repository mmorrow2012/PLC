import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { usePlcStore } from '../store/usePlcStore';

interface CodeViewerProps {
  stCode: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ stCode }) => {
  const { inputs, outputs, systemFault, scanTimeMs, cycleCount } = usePlcStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(stCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
      {/* Code Header Bar */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs px-2.5 py-1 rounded font-bold">
            IEC 61131-3 ST
          </div>
          <span className="font-mono text-sm text-slate-200 font-semibold">
            src/plc/conveyorLogic.st
          </span>
        </div>

        <div className="flex items-center gap-4 font-mono text-xs text-slate-400">
          <div>
            Scan Time: <span className="text-emerald-400 font-bold">{scanTimeMs} ms</span>
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

      {/* Monaco Editor & Real-time Tag Inspector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 flex-1 overflow-hidden">
        {/* Monaco Editor Container */}
        <div className="lg:col-span-2 h-full bg-slate-950 border-r border-slate-800">
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

        {/* Live IEC Tag Value Inspector */}
        <div className="p-4 bg-slate-900 overflow-y-auto font-mono text-xs flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
            Live Tag Memory Register Monitor
          </h3>

          {/* Input Registers Table */}
          <div>
            <div className="text-cyan-400 font-bold mb-2 uppercase text-[11px]">VAR_INPUT Memory Image</div>
            <div className="bg-slate-950 border border-slate-800 rounded divide-y divide-slate-800/60">
              <div className="flex justify-between p-2">
                <span className="text-slate-400">E_Stop (NC)</span>
                <span className={inputs.E_Stop ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold animate-pulse'}>
                  {inputs.E_Stop ? 'TRUE (Normal)' : 'FALSE (TRIPPED)'}
                </span>
              </div>
              <div className="flex justify-between p-2">
                <span className="text-slate-400">Reset_PB</span>
                <span className={inputs.Reset_PB ? 'text-cyan-400 font-bold' : 'text-slate-500'}>
                  {inputs.Reset_PB ? 'TRUE' : 'FALSE'}
                </span>
              </div>
              <div className="flex justify-between p-2">
                <span className="text-slate-400">Sensor_PartDetect</span>
                <span className={inputs.Sensor_PartDetect ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {inputs.Sensor_PartDetect ? 'TRUE' : 'FALSE'}
                </span>
              </div>
              <div className="flex justify-between p-2">
                <span className="text-slate-400">Sensor_Color</span>
                <span className="text-amber-400 font-bold">
                  {inputs.Sensor_Color} ({inputs.Sensor_Color === 1 ? 'Red' : inputs.Sensor_Color === 2 ? 'Green' : inputs.Sensor_Color === 3 ? 'Blue' : 'None'})
                </span>
              </div>
              <div className="flex justify-between p-2">
                <span className="text-slate-400">Sensor_Weight</span>
                <span className="text-amber-400 font-bold">{inputs.Sensor_Weight.toFixed(2)} kg</span>
              </div>
            </div>
          </div>

          {/* Output Registers Table */}
          <div>
            <div className="text-emerald-400 font-bold mb-2 uppercase text-[11px]">VAR_OUTPUT Memory Image</div>
            <div className="bg-slate-950 border border-slate-800 rounded divide-y divide-slate-800/60">
              <div className="flex justify-between p-2">
                <span className="text-slate-400">VFD_Run</span>
                <span className={outputs.VFD_Run ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {outputs.VFD_Run ? 'TRUE' : 'FALSE'}
                </span>
              </div>
              <div className="flex justify-between p-2">
                <span className="text-slate-400">VFD_Speed_Ref</span>
                <span className="text-cyan-400 font-bold">{outputs.VFD_Speed_Ref.toFixed(1)} %</span>
              </div>
              <div className="flex justify-between p-2">
                <span className="text-slate-400">Actuator_Diverter</span>
                <span className={outputs.Actuator_Diverter ? 'text-yellow-400 font-bold' : 'text-slate-500'}>
                  {outputs.Actuator_Diverter ? 'TRUE' : 'FALSE'}
                </span>
              </div>
              <div className="flex justify-between p-2">
                <span className="text-slate-400">Alarm_Tower</span>
                <span className="text-purple-400 font-bold">0x{outputs.Alarm_Tower.toString(16).toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* System Flags */}
          <div>
            <div className="text-slate-400 font-bold mb-2 uppercase text-[11px]">Internal State Latch</div>
            <div className="bg-slate-950 p-2 rounded border border-slate-800 flex justify-between">
              <span className="text-slate-400">System_Fault</span>
              <span className={systemFault ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                {systemFault ? 'TRUE (LATCHED)' : 'FALSE (NORMAL)'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
