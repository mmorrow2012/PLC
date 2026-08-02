import React from 'react';
import { PlcState } from '../types/plc';
import { AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';

interface AlarmBannerProps {
  plcState: PlcState;
  onResetFault: () => void;
}

export const AlarmBanner: React.FC<AlarmBannerProps> = ({ plcState, onResetFault }) => {
  const unackAlarms = plcState.alarms.filter(a => !a.acknowledged);
  const hasFault = plcState.memory.M_BatchState === 99 || !plcState.inputs.I_EStop_NC || plcState.lastFaultReason !== null;

  if (!hasFault && unackAlarms.length === 0) return null;

  return (
    <div className={`px-6 py-2.5 flex items-center justify-between border-b shadow-md transition-all ${hasFault ? 'bg-rose-950 border-rose-700 text-rose-100' : 'bg-amber-950/80 border-amber-700 text-amber-100'}`}>
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded bg-rose-900/80 animate-bounce">
          <AlertTriangle className="w-5 h-5 text-rose-300" />
        </div>
        <div>
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-rose-300">
            <span>PLC SAFETY ALARM & INTERLOCK TRIP</span>
            {plcState.lastFaultReason && <span className="bg-rose-900 px-2 py-0.5 rounded text-[10px] text-rose-200">CODE: %MW0=99</span>}
          </div>
          <p className="text-xs font-mono text-slate-200 font-semibold mt-0.5">
            {plcState.lastFaultReason || (unackAlarms.length > 0 ? unackAlarms[0].message : 'Warning condition active')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onResetFault}
          className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs rounded border border-rose-400 shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <CheckCircle className="w-3.5 h-3.5" /> ACK & RESET ALARMS (%I0.3)
        </button>
      </div>
    </div>
  );
};
