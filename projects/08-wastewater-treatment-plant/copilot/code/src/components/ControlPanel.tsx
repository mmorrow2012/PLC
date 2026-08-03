import { Play, Square } from 'lucide-react';
import { usePlcStore } from '../store/usePlcStore';

export function ControlPanel() {
  const isRunning = usePlcStore((state) => state.isRunning);
  const scanTimeMs = usePlcStore((state) => state.scanTimeMs);
  const setRunning = usePlcStore((state) => state.setRunning);

  return (
    <section className="rounded border border-industrial-700 bg-industrial-800 p-4">
      <h2 className="mb-3 text-lg font-medium">Control Panel</h2>
      <div className="space-y-3 text-sm text-slate-300">
        <p>Soft PLC status: <span className="font-semibold text-slate-100">{isRunning ? 'Running' : 'Stopped'}</span></p>
        <p>Configured scan time: <span className="font-semibold text-slate-100">{scanTimeMs} ms</span></p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRunning(true)}
            className="inline-flex items-center gap-2 rounded bg-industrial-ok px-3 py-2 font-medium text-slate-950"
          >
            <Play className="h-4 w-4" />
            Start
          </button>
          <button
            type="button"
            onClick={() => setRunning(false)}
            className="inline-flex items-center gap-2 rounded bg-industrial-alarm px-3 py-2 font-medium text-white"
          >
            <Square className="h-4 w-4" />
            Stop
          </button>
        </div>
      </div>
    </section>
  );
}
