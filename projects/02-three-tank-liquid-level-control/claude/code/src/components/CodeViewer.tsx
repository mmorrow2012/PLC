import { useEffect, useRef, type FC } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import { usePlcStore } from '../store/usePlcStore'
import threeTankLogicSource from '../plc/threeTankLogic.st?raw'

const STATE_LINE_MARKERS: Record<string, string> = {
  IDLE: 'CASE State OF',
  FILLING_A: 'Pump_Fill_A := TRUE;',
  TRANSFERRING_AB: 'Pump_Transfer_AB := TRUE;',
  DRAINING_BC: 'Valve_Drain_BC_Pos := 100.0;',
}

const sourceLines = threeTankLogicSource.split('\n')

const findLineNumber = (needle: string): number => {
  const index = sourceLines.findIndex((line) => line.includes(needle))
  return index >= 0 ? index + 1 : 0
}

const CodeViewer: FC = () => {
  const { state, outputs, inputs } = usePlcStore()
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const decorationsRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null)

  const alarmed = outputs.alarmOverflow || !inputs.eStop
  const activeLineNumber = alarmed
    ? findLineNumber(inputs.eStop ? 'Alarm_Overflow := TRUE;' : 'closed while the E-Stop circuit is broken.')
    : findLineNumber(STATE_LINE_MARKERS[state] ?? '')

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor
    decorationsRef.current = editor.createDecorationsCollection([])
  }

  useEffect(() => {
    const editor = editorRef.current
    const decorations = decorationsRef.current
    if (!editor || !decorations || activeLineNumber <= 0) {
      return
    }

    decorations.set([
      {
        range: {
          startLineNumber: activeLineNumber,
          startColumn: 1,
          endLineNumber: activeLineNumber,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: alarmed ? 'st-line-alarm' : 'st-line-active',
          linesDecorationsClassName: alarmed ? 'st-line-alarm-margin' : 'st-line-active-margin',
        },
      },
    ])
    editor.revealLineInCenter(activeLineNumber)
  }, [activeLineNumber, alarmed])

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <style>{`
        .st-line-active { background-color: rgba(16, 185, 129, 0.16); }
        .st-line-active-margin { background-color: #10b981; width: 4px !important; margin-left: 3px; }
        .st-line-alarm { background-color: rgba(244, 63, 94, 0.18); }
        .st-line-alarm-margin { background-color: #f43f5e; width: 4px !important; margin-left: 3px; }
      `}</style>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">PLC Structured Text</h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">threeTankLogic.st</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-medium ${
              alarmed
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${alarmed ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'}`} />
            {alarmed ? 'Interlocked' : `Executing: ${state}`}
          </span>
        </div>
      </div>
      <div className="overflow-hidden rounded border border-slate-800">
        <Editor
          height="420px"
          defaultLanguage="pascal"
          value={threeTankLogicSource}
          options={{
            minimap: { enabled: false },
            readOnly: true,
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineNumbers: 'on',
          }}
          theme="vs-dark"
          onMount={handleMount}
        />
      </div>
    </section>
  )
}

export default CodeViewer
