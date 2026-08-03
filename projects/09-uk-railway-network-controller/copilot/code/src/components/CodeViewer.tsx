import Editor from '@monaco-editor/react';

export function CodeViewer() {
  return (
    <section className="flex min-h-[320px] flex-col rounded-lg border border-industrial-700 bg-industrial-800 p-4 shadow-lg">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Railway Logic Viewer</h2>
        <span className="rounded bg-industrial-700 px-2 py-1 text-xs text-slate-300">Structured Text</span>
      </header>
      <div className="min-h-[240px] overflow-hidden rounded border border-industrial-700">
        <Editor
          height="240px"
          defaultLanguage="plaintext"
          value="// PLC Structured Text placeholder\n"
          options={{ minimap: { enabled: false }, readOnly: true }}
          theme="vs-dark"
        />
      </div>
    </section>
  );
}

export default CodeViewer;
