import { FileCode2 } from 'lucide-react';

export function CodeViewer() {
  return (
    <section className="rounded border border-industrial-700 bg-industrial-800 p-4">
      <div className="mb-2 flex items-center gap-2">
        <FileCode2 className="h-5 w-5 text-industrial-accent" />
        <h2 className="text-lg font-medium">Code Viewer</h2>
      </div>
      <p className="text-sm text-slate-300">
        Structured Text editor and scan diagnostics will be added in later stages.
      </p>
    </section>
  );
}
