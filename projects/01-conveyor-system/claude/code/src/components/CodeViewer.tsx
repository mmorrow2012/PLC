import type { Monaco } from '@monaco-editor/react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { type FC, useEffect, useRef } from 'react'
import conveyorLogicSource from '../plc/conveyorLogic.st?raw'
import { usePlcStore } from '../store/usePlcStore'

// Line ranges (1-indexed, inclusive) of each rung block in conveyorLogic.st,
// used to drive the live "currently executing" highlight below.
const SECTIONS = {
  safety: { start: 83, end: 110 },
  speed: { start: 112, end: 129 },
  sorting: { start: 131, end: 156 },
  annunciation: { start: 158, end: 172 },
} as const

const CodeViewer: FC = () => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null)

  const handleMount: OnMount = (editorInstance, monacoInstance) => {
    editorRef.current = editorInstance
    monacoRef.current = monacoInstance
    decorationsRef.current = editorInstance.createDecorationsCollection([])
  }

  useEffect(() => {
    const unsubscribe = usePlcStore.subscribe((state) => {
      const monacoInstance = monacoRef.current
      const collection = decorationsRef.current
      if (!monacoInstance || !collection) return

      const active: Array<{ range: { start: number; end: number }; className: string }> = []
      if (!state.inputs.E_Stop || state.internal.EStopFaultLatched) {
        active.push({ range: SECTIONS.safety, className: 'st-exec-fault' })
      }
      if (state.outputs.VFD_Run) {
        active.push({ range: SECTIONS.speed, className: 'st-exec-run' })
      }
      if (state.outputs.Actuator_Diverter) {
        active.push({ range: SECTIONS.sorting, className: 'st-exec-run' })
      }
      active.push({ range: SECTIONS.annunciation, className: 'st-exec-scan' })

      collection.set(
        active.map(({ range, className }) => ({
          range: new monacoInstance.Range(range.start, 1, range.end, 1),
          options: {
            isWholeLine: true,
            className,
            linesDecorationsClassName: `${className}-gutter`,
          },
        })),
      )
    })
    return unsubscribe
  }, [])

  const engineRunning = usePlcStore((s) => s.engineRunning)
  const scanCount = usePlcStore((s) => s.metrics.scanCount)

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          PLC Structured Text — <span className="font-mono normal-case text-slate-500">conveyorLogic.st</span>
        </h2>
        <span
          className={
            engineRunning
              ? 'inline-flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300'
              : 'inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400'
          }
        >
          <span className={engineRunning ? 'h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400' : 'h-1.5 w-1.5 rounded-full bg-slate-500'} />
          {engineRunning ? `Scanning (#${scanCount})` : 'Idle'}
        </span>
      </div>
      <div className="overflow-hidden rounded border border-slate-800">
        <style>{`
          .st-exec-fault { background-color: rgba(239, 68, 68, 0.16); }
          .st-exec-fault-gutter { border-left: 3px solid #ef4444; }
          .st-exec-run { background-color: rgba(16, 185, 129, 0.12); }
          .st-exec-run-gutter { border-left: 3px solid #10b981; }
          .st-exec-scan { background-color: rgba(56, 189, 248, 0.06); }
          .st-exec-scan-gutter { border-left: 3px solid #38bdf8; }
        `}</style>
        <Editor
          height="360px"
          defaultLanguage="pascal"
          defaultValue={conveyorLogicSource}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            readOnly: true,
            domReadOnly: true,
            scrollBeyondLastLine: false,
            fontSize: 13,
            fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
            renderLineHighlight: 'none',
          }}
          theme="vs-dark"
        />
      </div>
    </section>
  )
}

export default CodeViewer
