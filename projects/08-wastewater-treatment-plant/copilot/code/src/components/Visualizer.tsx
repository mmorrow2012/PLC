import { Waves } from 'lucide-react';
import { usePlcStore } from '../store/usePlcStore';

export function Visualizer() {
  const basins = usePlcStore((state) => state.basins);

  return (
    <section className="rounded border border-industrial-700 bg-industrial-800 p-4 lg:col-span-2">
      <div className="mb-4 flex items-center gap-2">
        <Waves className="h-5 w-5 text-industrial-basin" />
        <h2 className="text-lg font-medium">Process Visualizer</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {basins.map((basin) => (
          <article key={basin.id} className="rounded border border-industrial-700 bg-industrial-900 p-3">
            <h3 className="text-sm font-semibold text-slate-100">{basin.label}</h3>
            <p className="mt-2 text-2xl font-bold text-industrial-basin">{basin.levelPercent}%</p>
            <p className="text-xs uppercase tracking-wide text-slate-400">{basin.status}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
