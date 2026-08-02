import React, { useState } from 'react';
import { usePlcStore } from '../store/usePlcStore';

export const ControlPanel: React.FC = () => {
  const {
    inputs,
    outputs,
    forces,
    setInput,
    setForce,
    toggleEStop,
    triggerReset,
    spawnPart,
    clearStats,
    toggleScanEngine,
    isScanRunning,
  } = usePlcStore();

  const [customWeight, setCustomWeight] = useState<number>(2.5);
  const [activeTab, setActiveTab] = useState<'hmi' | 'forces'>('hmi');

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl flex flex-col gap-6">
      {/* Panel Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('hmi')}
            className={`px-4 py-2 text-xs font-mono font-bold rounded-lg transition-all ${`
              ${activeTab === 'hmi' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
            `}`}
          >
            OPERATOR HMI PANEL
          </button>
          <button
            onClick={() => setActiveTab('forces')}
            className={`px-4 py-2 text-xs font-mono font-bold rounded-lg transition-all ${`
              ${activeTab === 'forces' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
            `}`}
          >
            PLC I/O FORCE TABLE
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleScanEngine}
            className={`px-3 py-1.5 font-mono text-xs rounded border transition-colors ${`
              ${isScanRunning ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-amber-950 text-amber-300 border-amber-800'}
            `}`}
          >
            Soft-PLC Engine: {isScanRunning ? 'RUNNING (50ms)' : 'PAUSED'}
          </button>
        </div>
      </div>

      {activeTab === 'hmi' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Hardware Control Column (E-Stop & Reset) */}
          <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 flex flex-col gap-4 justify-between">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider mb-4">
                Safety & Interlock Station
              </h3>

              {/* Big Red Physical E-STOP Push Button */}
              <div className="flex flex-col items-center gap-3 py-2">
                <button
                  onClick={toggleEStop}
                  className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center font-mono font-extrabold text-white shadow-2xl transition-all active:scale-95 ${`
                    ${inputs.E_Stop ? 'bg-red-600 hover:bg-red-500 border-yellow-400 shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'bg-red-900 border-red-500 ring-4 ring-red-500/50 scale-95'}
                  `}`}
                >
                  <span className="text-lg uppercase tracking-wider">E-STOP</span>
                  <span className="text-[10px] font-normal opacity-80 mt-1">
                    {inputs.E_Stop ? 'NC CLOSED (SAFE)' : 'TRIPPED (OPEN)'}
                  </span>
                </button>
                <span className="text-xs font-mono text-slate-400 text-center">
                  Click to toggle physical hardware loop
                </span>
              </div>
            </div>

            {/* Blue Manual Reset PB */}
            <button
              onClick={triggerReset}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-sm rounded-lg shadow-lg border border-blue-400 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-blue-200 animate-ping" />
              MANUAL RESET PUSHBUTTON (Reset_PB)
            </button>
          </div>

          {/* 2. Part Spawner & Simulation Control */}
          <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 flex flex-col gap-4">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider">
              Item Injection Generator
            </h3>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-mono text-slate-300">
                Part Weight Setpoint: <span className="text-cyan-400 font-bold">{customWeight} kg</span>
              </label>
              <input
                type="range"
                min="0.2"
                max="6.0"
                step="0.1"
                value={customWeight}
                onChange={(e) => setCustomWeight(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 rounded h-2 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0.2kg (Too Light)</span>
                <span>0.5 - 5.0kg (Valid)</span>
                <span>6.0kg (Overweight)</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2">
              <button
                onClick={() => spawnPart(2, customWeight)} // Green (Accept)
                className="p-3 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-500 text-emerald-200 font-mono text-xs rounded-lg font-bold flex flex-col items-center gap-1 transition-all active:scale-95"
              >
                <div className="w-4 h-4 rounded bg-emerald-500" />
                Spawn Green
                <span className="text-[9px] opacity-75">(Accept Spec)</span>
              </button>

              <button
                onClick={() => spawnPart(1, customWeight)} // Red (Reject)
                className="p-3 bg-red-900/60 hover:bg-red-800 border border-red-500 text-red-200 font-mono text-xs rounded-lg font-bold flex flex-col items-center gap-1 transition-all active:scale-95"
              >
                <div className="w-4 h-4 rounded bg-red-500" />
                Spawn Red
                <span className="text-[9px] opacity-75">(Color Reject)</span>
              </button>

              <button
                onClick={() => spawnPart(3, customWeight)} // Blue
                className="p-3 bg-blue-900/60 hover:bg-blue-800 border border-blue-500 text-blue-200 font-mono text-xs rounded-lg font-bold flex flex-col items-center gap-1 transition-all active:scale-95"
              >
                <div className="w-4 h-4 rounded bg-blue-500" />
                Spawn Blue
                <span className="text-[9px] opacity-75">(Special Item)</span>
              </button>
            </div>

            <button
              onClick={clearStats}
              className="mt-auto py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded border border-slate-700 transition-colors"
            >
              Clear Counters & Conveyor Items
            </button>
          </div>

          {/* 3. VFD Motor Speed Reference Potentiometer */}
          <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 flex flex-col gap-4 justify-between">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider mb-2">
                VFD Speed Reference Setpoint
              </h3>
              <div className="text-3xl font-extrabold font-mono text-cyan-400 my-2">
                {inputs.Target_Speed.toFixed(1)} %
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={inputs.Target_Speed}
                onChange={(e) => setInput('Target_Speed', parseFloat(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 rounded h-3 cursor-pointer my-2"
              />
            </div>

            <div className="bg-slate-900 p-3 rounded border border-slate-800 font-mono text-xs flex flex-col gap-2">
              <div className="flex justify-between text-slate-400">
                <span>Motor Output Command:</span>
                <span className={outputs.VFD_Run ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {outputs.VFD_Run ? 'VFD_Run := TRUE' : 'VFD_Run := FALSE'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Actual Speed Reference:</span>
                <span className="text-cyan-400 font-bold">{outputs.VFD_Speed_Ref.toFixed(1)} %</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* PLC Tag Force Overrides Table */}
        <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold uppercase text-amber-400 tracking-wider">
              PLC Direct I/O Override & Force Table
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Overrides memory read/write during soft-PLC scan cycle
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs text-left text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900">
                  <th className="p-3">Tag Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Current Live Value</th>
                  <th className="p-3">Force Active</th>
                  <th className="p-3">Forced Value Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {[
                  { name: 'E_Stop', type: 'BOOL (Input)', live: String(inputs.E_Stop) },
                  { name: 'Sensor_PartDetect', type: 'BOOL (Input)', live: String(inputs.Sensor_PartDetect) },
                  { name: 'Sensor_Color', type: 'INT (Input)', live: String(inputs.Sensor_Color) },
                  { name: 'Sensor_Weight', type: 'REAL (Input)', live: `${inputs.Sensor_Weight.toFixed(2)} kg` },
                  { name: 'VFD_Run', type: 'BOOL (Output)', live: String(outputs.VFD_Run) },
                  { name: 'Actuator_Diverter', type: 'BOOL (Output)', live: String(outputs.Actuator_Diverter) },
                ].map((tag) => {
                  const forceState = forces[tag.name] || { isForced: false, forcedValue: false };
                  return (
                    <tr key={tag.name} className="hover:bg-slate-900/50">
                      <td className="p-3 font-bold text-slate-200">{tag.name}</td>
                      <td className="p-3 text-slate-400">{tag.type}</td>
                      <td className="p-3 text-cyan-400 font-bold">{tag.live}</td>
                      <td className="p-3">
                        <button
                          onClick={() => setForce(tag.name, !forceState.isForced, forceState.forcedValue)}
                          className={`px-3 py-1 rounded border font-bold ${`
                            ${forceState.isForced ? 'bg-amber-500/20 text-amber-400 border-amber-500' : 'bg-slate-800 text-slate-500 border-slate-700'}
                          `}`}
                        >
                          {forceState.isForced ? 'FORCED' : 'NORMAL'}
                        </button>
                      </td>
                      <td className="p-3">
                        {tag.type.includes('BOOL') ? (
                          <button
                            disabled={!forceState.isForced}
                            onClick={() => setForce(tag.name, true, !forceState.forcedValue)}
                            className={`px-3 py-1 rounded border ${`
                              ${!forceState.isForced ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700' : forceState.forcedValue ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-red-600 text-white border-red-500'}
                            `}`}
                          >
                            {forceState.forcedValue ? 'FORCE TRUE' : 'FORCE FALSE'}
                          </button>
                        ) : (
                          <input
                            type="number"
                            disabled={!forceState.isForced}
                            value={forceState.forcedValue || 0}
                            onChange={(e) => setForce(tag.name, true, parseFloat(e.target.value) || 0)}
                            className="bg-slate-900 border border-slate-700 text-white px-2 py-1 rounded w-24 disabled:opacity-40"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
