import { usePlcStore } from '../store/usePlcStore';

export function ControlPanel() {
  const { isRunning, cycleTimeMs, toggleRunning } = usePlcStore();

  return (
    <section className="rounded-lg border border-industrial-700 bg-industrial-800 p-4 shadow-lg">
      <h2 className="mb-3 text-lg font-semibold text-slate-100">Control Panel</h2>
      <div className="space-y-3 text-sm text-slate-300">
        <div className="flex items-center justify-between rounded bg-industrial-900/60 px-3 py-2">
          <span>Controller state</span>
          <span className={isRunning ? 'text-green-400' : 'text-amber-400'}>
            {isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
        <div className="flex items-center justify-between rounded bg-industrial-900/60 px-3 py-2">
          <span>Cycle time</span>
          <span>{cycleTimeMs} ms</span>
        </div>
        <button
          type="button"
          onClick={toggleRunning}
          className="w-full rounded bg-industrial-accent px-3 py-2 font-medium text-white transition hover:opacity-90"
        >
          Toggle Run State
        </button>
      </div>
    </section>
  );
}

export default ControlPanel;
