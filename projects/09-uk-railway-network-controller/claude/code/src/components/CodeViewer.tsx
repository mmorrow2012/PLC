import type { FC } from 'react'
import Editor from '@monaco-editor/react'

const CodeViewer: FC = () => {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">PLC Structured Text</h2>
      <div className="overflow-hidden rounded border border-slate-800">
        <Editor
          height="320px"
          defaultLanguage="pascal"
          defaultValue=""
          options={{
            minimap: { enabled: false },
            readOnly: true,
            scrollBeyondLastLine: false,
          }}
          theme="vs-dark"
        />
      </div>
    </section>
  )
}

export default CodeViewer
