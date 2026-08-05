import Editor, { type Monaco, type OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useEffect, useRef, useState, type FC } from 'react'
import wastewaterLogicSource from '../plc/wastewaterLogic.st?raw'
import { ST_AERATION_ACTIVE, ST_CLARIFYING } from '../plc/types'
import { usePlcStore } from '../store/usePlcStore'
import LadderDiagram from './LadderDiagram'

type RegionName = 'safety' | 'leadlag' | 'aeration' | 'weir' | 'program'

/**
 * The ST source marks each POU with `(* #REGION name *)` / `(* #ENDREGION name *)`
 * comments. Parsing them at load time keeps the live-execution highlight in
 * sync with the file automatically instead of hard-coding line numbers that
 * silently rot the moment a comment is edited.
 */
function parseRegions(source: string): Partial<Record<RegionName, { start: number; end: number }>> {
  const regions: Partial<Record<RegionName, { start: number; end: number }>> = {}
  const open: Partial<Record<RegionName, number>> = {}
  source.split('\n').forEach((line, index) => {
    const end = /#ENDREGION\s+(\w+)/.exec(line)
    if (end) {
      const name = end[1] as RegionName
      const from = open[name]
      if (from !== undefined) {
        regions[name] = { start: from, end: index + 1 }
      }
      return
    }
    const start = /#REGION\s+(\w+)/.exec(line)
    if (start) {
      open[start[1] as RegionName] = index + 1
    }
  })
  return regions
}

const REGIONS = parseRegions(wastewaterLogicSource)

const CodeViewer: FC = () => {
  const [tab, setTab] = useState<'ladder' | 'st'>('ladder')
  const monacoRef = useRef<Monaco | null>(null)
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null)

  const outputs = usePlcStore((s) => s.outputs)
  const internal = usePlcStore((s) => s.internal)
  const engineRunning = usePlcStore((s) => s.engineRunning)
  const scanCount = usePlcStore((s) => s.metrics.scanCount)
  const lastCycleTimeMs = usePlcStore((s) => s.metrics.lastCycleTimeMs)

  const handleMount: OnMount = (editorInstance, monacoInstance) => {
    monacoRef.current = monacoInstance
    decorationsRef.current = editorInstance.createDecorationsCollection([])
  }

  // Live "currently executing" highlight over the ST view, driven straight off
  // the process image — the same information the LD monitor animates.
  useEffect(() => {
    const monacoInstance = monacoRef.current
    const collection = decorationsRef.current
    if (!monacoInstance || !collection) return

    const active: Array<{ region?: { start: number; end: number }; className: string }> = [
      {
        region: REGIONS.safety,
        className: internal.M_SafetyTrip ? 'st-exec-fault' : 'st-exec-scan',
      },
    ]
    if (internal.M_LeadPumpCall || internal.M_LagPumpCall) {
      active.push({ region: REGIONS.leadlag, className: 'st-exec-run' })
    }
    if (internal.M_PlantState >= ST_AERATION_ACTIVE && !internal.M_SafetyTrip) {
      active.push({ region: REGIONS.aeration, className: 'st-exec-run' })
    }
    if (outputs.Q_Motor_WeirOpen || outputs.Q_Motor_WeirClose) {
      active.push({ region: REGIONS.weir, className: 'st-exec-run' })
    }
    if (internal.M_PlantState >= ST_CLARIFYING && !internal.M_SafetyTrip) {
      active.push({ region: REGIONS.program, className: 'st-exec-scan' })
    }

    collection.set(
      active
        .filter((entry): entry is { region: { start: number; end: number }; className: string } =>
          Boolean(entry.region),
        )
        .map(({ region, className }) => ({
          range: new monacoInstance.Range(region.start, 1, region.end, 1),
          options: {
            isWholeLine: true,
            className,
            linesDecorationsClassName: `${className}-gutter`,
          },
        })),
    )
  }, [internal, outputs, tab])

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Program Monitor
          </h2>
          <div className="inline-flex overflow-hidden rounded border border-slate-700">
            <button
              type="button"
              onClick={() => setTab('ladder')}
              className={
                tab === 'ladder'
                  ? 'bg-cyan-500/20 px-3 py-1 text-xs font-medium text-cyan-200'
                  : 'bg-slate-950 px-3 py-1 text-xs font-medium text-slate-400 hover:text-slate-200'
              }
            >
              Ladder / FBD
            </button>
            <button
              type="button"
              onClick={() => setTab('st')}
              className={
                tab === 'st'
                  ? 'bg-cyan-500/20 px-3 py-1 text-xs font-medium text-cyan-200'
                  : 'bg-slate-950 px-3 py-1 text-xs font-medium text-slate-400 hover:text-slate-200'
              }
            >
              Structured Text (.ST)
            </button>
          </div>
        </div>
        <span
          className={
            engineRunning
              ? 'inline-flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300'
              : 'inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400'
          }
        >
          <span
            className={
              engineRunning
                ? 'h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400'
                : 'h-1.5 w-1.5 rounded-full bg-slate-500'
            }
          />
          {engineRunning
            ? `MAST scanning · #${scanCount} · ${lastCycleTimeMs.toFixed(0)} ms`
            : 'PLC halted'}
        </span>
      </div>

      <style>{`
        .st-exec-fault { background-color: rgba(239, 68, 68, 0.16); }
        .st-exec-fault-gutter { border-left: 3px solid #ef4444; }
        .st-exec-run { background-color: rgba(16, 185, 129, 0.12); }
        .st-exec-run-gutter { border-left: 3px solid #10b981; }
        .st-exec-scan { background-color: rgba(56, 189, 248, 0.10); }
        .st-exec-scan-gutter { border-left: 3px solid #38bdf8; }
      `}</style>

      {tab === 'ladder' ? (
        <div className="max-h-[680px] overflow-y-auto pr-1">
          <LadderDiagram />
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-slate-800">
          <Editor
            height="620px"
            defaultLanguage="pascal"
            defaultValue={wastewaterLogicSource}
            onMount={handleMount}
            options={{
              minimap: { enabled: false },
              readOnly: true,
              domReadOnly: true,
              scrollBeyondLastLine: false,
              fontSize: 12.5,
              fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
              renderLineHighlight: 'none',
            }}
            theme="vs-dark"
          />
        </div>
      )}
    </section>
  )
}

export default CodeViewer
