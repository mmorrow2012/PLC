import type { Monaco } from '@monaco-editor/react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { type FC, useEffect, useRef } from 'react'
import parkingGateLogicSource from '../plc/parkingGateLogic.st?raw'
import { ST_CLOSING, ST_OPENING } from '../plc/types'
import { usePlcStore } from '../store/usePlcStore'

// Line ranges (1-indexed, inclusive) of each rung block in
// parkingGateLogic.st, used to drive the live "currently executing"
// highlight below.
const SECTIONS = {
  safety: { start: 92, end: 110 },
  timers: { start: 112, end: 122 },
  sequencer: { start: 124, end: 191 },
  watchdog: { start: 193, end: 202 },
  recovery: { start: 204, end: 231 },
  interlock: { start: 242, end: 252 },
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
        active.push({ range: SECTIONS.interlock, className: 'st-exec-fault' })
      }
      if (state.internal.GateState === ST_OPENING || state.internal.GateState === ST_CLOSING) {
        active.push({ range: SECTIONS.timers, className: 'st-exec-scan' })
      }
      active.push({ range: SECTIONS.sequencer, className: 'st-exec-run' })
      if (state.outputs.Alarm_StuckGate) {
        active.push({ range: SECTIONS.watchdog, className: 'st-exec-fault' })
        active.push({ range: SECTIONS.recovery, className: 'st-exec-fault' })
      }

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
          PLC Structured Text — <span className="font-mono normal-case text-slate-500">parkingGateLogic.st</span>
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
          .st-exec-scan { background-color: rgba(56, 189, 248, 0.10); }
          .st-exec-scan-gutter { border-left: 3px solid #38bdf8; }
        `}</style>
        <Editor
          height="420px"
          defaultLanguage="pascal"
          defaultValue={parkingGateLogicSource}
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
