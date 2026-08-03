import Editor from '@monaco-editor/react';

const plcSnippet = `PROGRAM BatchReactor\nVAR\n    StartCmd : BOOL;\n    MixerOn : BOOL;\n    ReactorTemp : REAL;\nEND_VAR\n\n(* Batch logic scaffold placeholder *)`;

export function CodeViewer() {
  return (
    <section className="rounded-lg border border-industrial-700 bg-industrial-900 p-4 shadow-lg">
      <h2 className="mb-4 text-lg font-semibold text-white">PLC Logic Viewer</h2>
      <div className="overflow-hidden rounded-md border border-industrial-700">
        <Editor
          defaultLanguage="pascal"
          height="320px"
          options={{ minimap: { enabled: false }, readOnly: true }}
          theme="vs-dark"
          value={plcSnippet}
        />
      </div>
    </section>
  );
}
