import { Play, RotateCcw, Square } from 'lucide-react';
import { usePlcStore, type ReactorStage } from '../store/usePlcStore';

const STAGES: ReactorStage[] = ['IDLE', 'CHARGE', 'REACT', 'DRAIN'];

export function ControlPanel() {
  const { isRunning, stage, setRunning, setStage, applyScan } = usePlcStore();

  const resetProcess = () => {
    setRunning(false);
    setStage('IDLE');
    applyScan({ batchLevel: 0, temperatureC: 24, stage: 'IDLE' });
  };

  return (
    <section className="rounded-lg border border-industrial-700 bg-industrial-900 p-4 shadow-lg">
      <h2 className="mb-4 text-lg font-semibold text-white">Control Panel</h2>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-industrial-accent px-3 py-2 text-sm font-medium text-slate-950"
          onClick={() => setRunning(true)}
        >
          <Play className="h-4 w-4" />
          Start
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-industrial-700 px-3 py-2 text-sm font-medium text-slate-200"
          onClick={() => setRunning(false)}
        >
          <Square className="h-4 w-4" />
          Stop
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-industrial-700 px-3 py-2 text-sm font-medium text-slate-200"
          onClick={resetProcess}
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {STAGES.map((entry) => (
          <button
            key={entry}
            type="button"
            className={`rounded-md border px-3 py-2 text-left text-sm ${
              stage === entry
                ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300'
                : 'border-industrial-700 bg-industrial-800 text-slate-300'
            }`}
            onClick={() => setStage(entry)}
          >
            {entry}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-slate-400">Runtime state: {isRunning ? 'RUNNING' : 'STOPPED'}</p>
    </section>
  );
}
