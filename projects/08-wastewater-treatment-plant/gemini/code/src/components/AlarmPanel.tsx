import React from 'react';
import { PLCSystemState } from '../types/plc';
import { AlertTriangle, CheckCircle, ShieldAlert, Radio } from 'lucide-react';

interface AlarmPanelProps {
  plcState: PLCSystemState;
}

export const AlarmPanel: React.FC<AlarmPanelProps> = ({ plcState }) => {
  const { alarms, fbState } = plcState;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <h2 className="font-bold text-slate-100 text-sm uppercase tracking-wider">Active Safety Alarm Matrix</h2>
        </div>
        <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${ 
          alarms.activeAlarmsCount > 0
            ? 'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse'
            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
        }`}>
          {alarms.activeAlarmsCount} ACTIVE TRIPS
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
        {/* E-Stop Trip Status */}
        <div className={`p-3 rounded-lg border flex items-center justify-between transition-all ${ 
          alarms.eStopTripped
            ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
            : 'bg-slate-950 border-slate-800 text-slate-400'
        }`}>
          <div className="space-y-0.5">
            <p className="font-bold uppercase">%I0.0 E-Stop Switch</p>
            <p className="text-[10px] text-slate-500">Hardware NC Contact</p>
          </div>
          {alarms.eStopTripped ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-500/60" />
          )}
        </div>

        {/* High-High Equalization Basin Overflow Guard */}
        <div className={`p-3 rounded-lg border flex items-center justify-between transition-all ${ 
          alarms.equalizationHighHigh
            ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
            : 'bg-slate-950 border-slate-800 text-slate-400'
        }`}>
          <div className="space-y-0.5">
            <p className="font-bold uppercase">%I0.4 LSH Equalization</p>
            <p className="text-[10px] text-slate-500">Overflow Guard Float</p>
          </div>
          {alarms.equalizationHighHigh ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-500/60" />
          )}
        </div>

        {/* High Turbidity Contamination Trip */}
        <div className={`p-3 rounded-lg border flex items-center justify-between transition-all ${ 
          alarms.highTurbidityTrip
            ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
            : 'bg-slate-950 border-slate-800 text-slate-400'
        }`}>
          <div className="space-y-0.5">
            <p className="font-bold uppercase">%IW108 High Turbidity</p>
            <p className="text-[10px] text-slate-500">Critical &gt; 25.0 NTU</p>
          </div>
          {alarms.highTurbidityTrip ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-500/60" />
          )}
        </div>
      </div>

      {fbState.FB_SafetyInterlock.tripped && (
        <div className="bg-rose-950/90 border border-rose-500/80 rounded-lg p-3 text-rose-200 text-xs font-mono flex items-center gap-2.5 shadow-md animate-pulse">
          <Radio className="w-4 h-4 text-rose-400 shrink-0" />
          <div>
            <span className="font-bold uppercase">Safety Interlock Tripped: </span>
            <span>{fbState.FB_SafetyInterlock.tripReason}. Press Fault Reset Pushbutton (%I0.3) after clearing fault.</span>
          </div>
        </div>
      )}
    </div>
  );
};