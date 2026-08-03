import { Activity } from 'lucide-react';

export function Visualizer() {
  return (
    <section className="rounded-lg border border-industrial-700 bg-industrial-800 p-4 shadow-lg">
      <div className="mb-3 flex items-center gap-2 text-slate-100">
        <Activity className="h-5 w-5 text-industrial-accent" />
        <h2 className="text-lg font-semibold">Network Visualizer</h2>
      </div>
      <div className="flex min-h-[240px] items-center justify-center rounded border border-dashed border-industrial-600 bg-industrial-900/60 text-sm text-slate-400">
        Track topology and signaling visualization placeholder
      </div>
    </section>
  );
}

export default Visualizer;
