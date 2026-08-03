import { usePlcStore } from '../store/usePlcStore';

export function Visualizer() {
  const { batchLevel, temperatureC, stage } = usePlcStore();

  return (
    <section className="rounded-lg border border-industrial-700 bg-industrial-900 p-4 shadow-lg">
      <h2 className="mb-4 text-lg font-semibold text-white">Process Visualizer</h2>
      <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
        <div className="rounded-md border border-industrial-700 bg-industrial-800 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Stage</p>
          <p className="mt-2 text-xl font-semibold text-cyan-400">{stage}</p>
        </div>
        <div className="rounded-md border border-industrial-700 bg-industrial-800 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Level</p>
          <p className="mt-2 text-xl font-semibold text-white">{batchLevel}%</p>
        </div>
        <div className="rounded-md border border-industrial-700 bg-industrial-800 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Temperature</p>
          <p className="mt-2 text-xl font-semibold text-white">{temperatureC.toFixed(1)}°C</p>
        </div>
      </div>
    </section>
  );
}
