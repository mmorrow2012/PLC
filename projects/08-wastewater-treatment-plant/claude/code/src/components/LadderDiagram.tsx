import { Fragment, memo, useEffect, useState, type FC, type ReactElement } from 'react'
import {
  NETWORKS,
  evaluateNode,
  evaluateRung,
  formatTagValue,
  tagAddress,
  type LadderBlock,
  type LadderCoil,
  type LadderNetwork,
  type LadderNode,
  type LadderRung,
  type TagMap,
} from '../plc/ladderProgram'
import { buildTagMap } from '../plc/tagMap'
import { PLANT_STATE_LABEL, type PlantState } from '../plc/types'
import { usePlcStore } from '../store/usePlcStore'

// --- Geometry ---------------------------------------------------------------
const RAIL_X = 16
const CELL_W = 156
const ROW_H = 62
const COIL_COL_W = 128
const TOP_PAD = 30

// --- Palette ----------------------------------------------------------------
const WIRE_LIVE = '#22d3ee'
const WIRE_DEAD = '#3f4d63'
const ELEM_LIVE = '#34d399'
const ELEM_DEAD = '#64748b'
const TEXT_LIVE = '#a7f3d0'
const TEXT_DEAD = '#94a3b8'

/** Column span an element occupies inside a rung. */
function nodeSpan(node: LadderNode): number {
  if (node.kind !== 'parallel') return 1
  return Math.max(1, ...node.branches.map((branch) => branch.length))
}

function rungColumns(rung: LadderRung): number {
  return rung.nodes.reduce((sum, node) => sum + nodeSpan(node), 0)
}

function rungRows(rung: LadderRung): number {
  return Math.max(
    1,
    ...rung.nodes.map((node) => (node.kind === 'parallel' ? node.branches.length : 1)),
    rung.coils.length,
  )
}

const colX = (col: number) => RAIL_X + col * CELL_W
const rowY = (row: number) => TOP_PAD + row * ROW_H

interface WireProps {
  x1: number
  y1: number
  x2: number
  y2: number
  live: boolean
}

const Wire: FC<WireProps> = ({ x1, y1, x2, y2, live }) => (
  <line
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    stroke={live ? WIRE_LIVE : WIRE_DEAD}
    strokeWidth={live ? 2.4 : 1.6}
    strokeLinecap="round"
    filter={live ? 'url(#ld-glow)' : undefined}
  />
)

interface ElementProps {
  node: LadderNode
  cx: number
  cy: number
  conducting: boolean
  tags: TagMap
}

const LadderElement: FC<ElementProps> = ({ node, cx, cy, conducting, tags }) => {
  const stroke = conducting ? ELEM_LIVE : ELEM_DEAD
  const textColor = conducting ? TEXT_LIVE : TEXT_DEAD

  if (node.kind === 'compare') {
    const w = 118
    const h = 30
    const refLabel = typeof node.ref === 'number' ? node.ref.toFixed(1) : node.ref
    return (
      <g filter={conducting ? 'url(#ld-glow)' : undefined}>
        <rect
          x={cx - w / 2}
          y={cy - h / 2}
          width={w}
          height={h}
          rx={4}
          fill={conducting ? 'rgba(52,211,153,0.12)' : 'rgba(15,23,42,0.6)'}
          stroke={stroke}
          strokeWidth={1.6}
        />
        <text x={cx} y={cy - 3} textAnchor="middle" fontSize={9.5} fill={textColor} fontFamily="monospace">
          {node.tag}
        </text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize={10} fill={stroke} fontFamily="monospace">
          {node.op} {refLabel}
        </text>
        <text x={cx} y={cy + 24} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="monospace">
          {formatTagValue(node.tag, tags)}
        </text>
      </g>
    )
  }

  if (node.kind === 'contact') {
    const gap = 9
    const half = 11
    return (
      <g filter={conducting ? 'url(#ld-glow)' : undefined}>
        <text x={cx} y={cy - 18} textAnchor="middle" fontSize={9.5} fill={textColor} fontFamily="monospace">
          {node.tag}
        </text>
        <line x1={cx - gap} y1={cy - half} x2={cx - gap} y2={cy + half} stroke={stroke} strokeWidth={2.4} />
        <line x1={cx + gap} y1={cy - half} x2={cx + gap} y2={cy + half} stroke={stroke} strokeWidth={2.4} />
        {node.variant === 'NC' && (
          <line x1={cx - gap - 3} y1={cy + half} x2={cx + gap + 3} y2={cy - half} stroke={stroke} strokeWidth={1.8} />
        )}
        {node.variant === 'P' && (
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fill={stroke} fontFamily="monospace">
            P
          </text>
        )}
        <text x={cx} y={cy + 24} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="monospace">
          {tagAddress(node.tag) || '—'} = {formatTagValue(node.tag, tags)}
        </text>
      </g>
    )
  }

  return null
}

interface CoilProps {
  coil: LadderCoil
  cx: number
  cy: number
  tags: TagMap
}

const Coil: FC<CoilProps> = ({ coil, cx, cy, tags }) => {
  const raw = tags[coil.tag]
  const energised = typeof raw === 'number' ? raw !== 0 : Boolean(raw)
  const stroke = energised ? ELEM_LIVE : ELEM_DEAD
  const textColor = energised ? TEXT_LIVE : TEXT_DEAD
  const marker = coil.variant === 'set' ? 'S' : coil.variant === 'reset' ? 'R' : ''

  return (
    <g filter={energised ? 'url(#ld-glow)' : undefined}>
      <text x={cx} y={cy - 18} textAnchor="middle" fontSize={9.5} fill={textColor} fontFamily="monospace">
        {coil.tag}
      </text>
      {coil.variant === 'analog' ? (
        <>
          <rect
            x={cx - 26}
            y={cy - 13}
            width={52}
            height={26}
            rx={4}
            fill={energised ? 'rgba(52,211,153,0.12)' : 'rgba(15,23,42,0.6)'}
            stroke={stroke}
            strokeWidth={1.6}
          />
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize={10} fill={stroke} fontFamily="monospace">
            MOVE
          </text>
        </>
      ) : (
        <>
          <path
            d={`M ${cx - 12} ${cy - 12} A 14 14 0 0 0 ${cx - 12} ${cy + 12}`}
            fill="none"
            stroke={stroke}
            strokeWidth={2.4}
          />
          <path
            d={`M ${cx + 12} ${cy - 12} A 14 14 0 0 1 ${cx + 12} ${cy + 12}`}
            fill="none"
            stroke={stroke}
            strokeWidth={2.4}
          />
          {marker && (
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fill={stroke} fontFamily="monospace">
              {marker}
            </text>
          )}
        </>
      )}
      <text x={cx} y={cy + 26} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="monospace">
        {tagAddress(coil.tag) || '—'} = {formatTagValue(coil.tag, tags)}
      </text>
    </g>
  )
}

interface RungProps {
  rung: LadderRung
  tags: TagMap
}

const Rung: FC<RungProps> = ({ rung, tags }) => {
  const cols = rungColumns(rung)
  const rows = rungRows(rung)
  const width = colX(cols) + COIL_COL_W + RAIL_X + 20
  const height = rowY(rows - 1) + 46
  const rightRailX = width - RAIL_X
  const coilX = colX(cols) + COIL_COL_W / 2
  const mainY = rowY(0)

  const drawings: ReactElement[] = []
  let key = 0
  let col = 0
  let power = true

  for (const node of rung.nodes) {
    const span = nodeSpan(node)
    const xStart = colX(col)
    const xEnd = colX(col + span)

    if (node.kind === 'parallel') {
      const branchOutputs: boolean[] = []
      node.branches.forEach((branch, branchIndex) => {
        const y = rowY(branchIndex)
        let branchPower = power
        // Drop / rise wire from the main rail into this branch row.
        if (branchIndex > 0) {
          drawings.push(
            <Wire key={`vin-${key++}`} x1={xStart} y1={mainY} x2={xStart} y2={y} live={power} />,
          )
        }
        branch.forEach((child, childIndex) => {
          const cx = colX(col + childIndex) + CELL_W / 2
          drawings.push(
            <Wire
              key={`w-${key++}`}
              x1={colX(col + childIndex)}
              y1={y}
              x2={cx - 30}
              y2={y}
              live={branchPower}
            />,
          )
          drawings.push(
            <LadderElement
              key={`e-${key++}`}
              node={child}
              cx={cx}
              cy={y}
              conducting={branchPower && evaluateNode(child, tags)}
              tags={tags}
            />,
          )
          branchPower = branchPower && evaluateNode(child, tags)
          drawings.push(
            <Wire
              key={`w-${key++}`}
              x1={cx + 30}
              y1={y}
              x2={colX(col + childIndex + 1)}
              y2={y}
              live={branchPower}
            />,
          )
        })
        // Pad a short branch out to the parallel node's exit column.
        const usedEnd = colX(col + branch.length)
        if (usedEnd < xEnd) {
          drawings.push(
            <Wire key={`pad-${key++}`} x1={usedEnd} y1={y} x2={xEnd} y2={y} live={branchPower} />,
          )
        }
        if (branchIndex > 0) {
          drawings.push(
            <Wire key={`vout-${key++}`} x1={xEnd} y1={y} x2={xEnd} y2={mainY} live={branchPower} />,
          )
        }
        branchOutputs.push(branchPower)
      })
      power = branchOutputs.some(Boolean)
    } else {
      const cx = xStart + CELL_W / 2
      drawings.push(
        <Wire key={`w-${key++}`} x1={xStart} y1={mainY} x2={cx - 30} y2={mainY} live={power} />,
      )
      const conducting: boolean = power && evaluateNode(node, tags)
      drawings.push(
        <LadderElement
          key={`e-${key++}`}
          node={node}
          cx={cx}
          cy={mainY}
          conducting={conducting}
          tags={tags}
        />,
      )
      power = conducting
      drawings.push(<Wire key={`w-${key++}`} x1={cx + 30} y1={mainY} x2={xEnd} y2={mainY} live={power} />)
    }

    col += span
  }

  const rungLive = evaluateRung(rung, tags)

  return (
    <div className="mb-1">
      <div className="flex items-baseline gap-2 px-1 pt-2 text-[11px]">
        <span
          className={
            rungLive
              ? 'rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-emerald-300'
              : 'rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-500'
          }
        >
          Rung {rung.id}
        </span>
        <span className="text-slate-400">{rung.comment}</span>
      </div>
      <div className="overflow-x-auto">
        <svg width={width} height={height} role="img" aria-label={`Ladder rung ${rung.id}`}>
          {/* 24 V power rails */}
          <line x1={RAIL_X} y1={6} x2={RAIL_X} y2={height - 6} stroke="#f87171" strokeWidth={2.5} />
          <line
            x1={rightRailX}
            y1={6}
            x2={rightRailX}
            y2={height - 6}
            stroke="#64748b"
            strokeWidth={2.5}
          />
          {drawings}
          {/* Coil column */}
          {rung.coils.map((coil, index) => {
            const y = rowY(index)
            return (
              <Fragment key={coil.tag + coil.variant + index}>
                {index > 0 && (
                  <Wire x1={colX(cols)} y1={mainY} x2={colX(cols)} y2={y} live={rungLive} />
                )}
                <Wire x1={colX(cols)} y1={y} x2={coilX - 16} y2={y} live={rungLive} />
                <Wire x1={coilX + 16} y1={y} x2={rightRailX} y2={y} live={rungLive} />
                <Coil coil={coil} cx={coilX} cy={y} tags={tags} />
              </Fragment>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

interface BlockProps {
  block: LadderBlock
  tags: TagMap
}

const FunctionBlock: FC<BlockProps> = ({ block, tags }) => {
  const raw = tags[block.enableTag]
  const active = typeof raw === 'number' ? raw !== 0 : Boolean(raw)
  const pinRows = Math.max(block.inputs.length, block.outputs.length)
  const height = 44 + pinRows * 22
  const width = 470
  const boxX = 150
  const boxW = 180

  const pinValue = (tag: string) => formatTagValue(tag, tags)
  const pinLive = (tag: string) => {
    const value = tags[tag]
    return typeof value === 'number' ? value !== 0 : Boolean(value)
  }

  return (
    <div className="overflow-x-auto px-1 pb-2">
      <svg width={width} height={height} role="img" aria-label={`Function block ${block.name}`}>
        <rect
          x={boxX}
          y={10}
          width={boxW}
          height={height - 20}
          rx={6}
          fill={active ? 'rgba(34,211,238,0.10)' : 'rgba(15,23,42,0.7)'}
          stroke={active ? '#22d3ee' : '#475569'}
          strokeWidth={active ? 2.2 : 1.4}
          filter={active ? 'url(#ld-glow)' : undefined}
        />
        <text
          x={boxX + boxW / 2}
          y={28}
          textAnchor="middle"
          fontSize={12}
          fontFamily="monospace"
          fill={active ? '#67e8f9' : '#94a3b8'}
        >
          {block.name}
        </text>
        <line
          x1={boxX}
          y1={36}
          x2={boxX + boxW}
          y2={36}
          stroke={active ? '#22d3ee' : '#475569'}
          strokeWidth={1}
        />
        {block.inputs.map((pin, index) => {
          const y = 54 + index * 22
          const live = pinLive(pin.tag)
          return (
            <Fragment key={`in-${pin.name}`}>
              <line
                x1={8}
                y1={y}
                x2={boxX}
                y2={y}
                stroke={live ? WIRE_LIVE : WIRE_DEAD}
                strokeWidth={live ? 2.2 : 1.4}
                filter={live ? 'url(#ld-glow)' : undefined}
              />
              <text x={10} y={y - 5} fontSize={9} fontFamily="monospace" fill={live ? TEXT_LIVE : TEXT_DEAD}>
                {pin.tag} = {pinValue(pin.tag)}
              </text>
              <text x={boxX + 7} y={y + 3.5} fontSize={10} fontFamily="monospace" fill="#cbd5e1">
                {pin.name}
              </text>
            </Fragment>
          )
        })}
        {block.outputs.map((pin, index) => {
          const y = 54 + index * 22
          const live = pinLive(pin.tag)
          return (
            <Fragment key={`out-${pin.name}`}>
              <line
                x1={boxX + boxW}
                y1={y}
                x2={boxX + boxW + 60}
                y2={y}
                stroke={live ? ELEM_LIVE : WIRE_DEAD}
                strokeWidth={live ? 2.2 : 1.4}
                filter={live ? 'url(#ld-glow)' : undefined}
              />
              <text
                x={boxX + boxW - 7}
                y={y + 3.5}
                fontSize={10}
                textAnchor="end"
                fontFamily="monospace"
                fill="#cbd5e1"
              >
                {pin.name}
              </text>
              <text
                x={boxX + boxW + 64}
                y={y + 3.5}
                fontSize={9}
                fontFamily="monospace"
                fill={live ? TEXT_LIVE : TEXT_DEAD}
              >
                {pin.tag} = {pinValue(pin.tag)}
              </text>
            </Fragment>
          )
        })}
      </svg>
    </div>
  )
}

interface NetworkProps {
  network: LadderNetwork
  tags: TagMap
}

const Network: FC<NetworkProps> = ({ network, tags }) => {
  const anyLive = network.rungs.some((rung) => evaluateRung(rung, tags))
  return (
    <section
      className={
        anyLive
          ? 'rounded-lg border border-emerald-500/30 bg-slate-950/60 transition-colors'
          : 'rounded-lg border border-slate-800 bg-slate-950/60 transition-colors'
      }
    >
      <header className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className={
              anyLive
                ? 'h-2 w-2 animate-pulse rounded-full bg-emerald-400'
                : 'h-2 w-2 rounded-full bg-slate-600'
            }
          />
          <h3 className="text-sm font-semibold text-slate-200">{network.title}</h3>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{network.comment}</p>
      </header>
      {network.block && <FunctionBlock block={network.block} tags={tags} />}
      <div className="px-1 pb-2">
        {network.rungs.map((rung) => (
          <Rung key={rung.id} rung={rung} tags={tags} />
        ))}
      </div>
    </section>
  )
}

/**
 * Refresh period of the LD monitor. The MAST task scans at 50 ms, but a
 * ladder network carries a few hundred SVG nodes and no operator can read a
 * 20 Hz animation anyway — a real online monitor polls the CPU at a similar
 * rate. Sampling here (rather than subscribing to every scan) keeps the
 * diagram off the 20 Hz render path that the SCADA mimic genuinely needs.
 */
const MONITOR_REFRESH_MS = 100

interface LadderViewProps {
  tags: TagMap
  plantState: PlantState
}

const LadderView: FC<LadderViewProps> = ({ tags, plantState }) => (
  <div className="space-y-3">
    {/* 0x0 wrapper is the standard SVG-defs pattern — `display:none` here
        would stop the filter resolving in Firefox. */}
    <svg
      aria-hidden
      focusable="false"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        <filter id="ld-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>

    <div className="flex flex-wrap items-center gap-3 rounded border border-slate-800 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-400">
      <span className="font-medium text-slate-300">Online monitor legend:</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-6 rounded bg-cyan-400" /> power flow
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-6 rounded bg-emerald-400" /> element conducting / coil energised
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-6 rounded bg-slate-600" /> de-energised
      </span>
      <span className="ml-auto font-mono text-slate-300">
        %MW0 = {plantState} ({PLANT_STATE_LABEL[plantState]})
      </span>
    </div>

    {NETWORKS.map((network) => (
      <Network key={network.id} network={network} tags={tags} />
    ))}
  </div>
)

const MemoLadderView = memo(LadderView)

/**
 * Samples the process image on its own timer instead of subscribing to the
 * store, so a scan that only moves a basin level by a millimetre does not
 * force the whole ladder to reconcile.
 */
const LadderDiagram: FC = () => {
  const [snapshot, setSnapshot] = useState(() => {
    const s = usePlcStore.getState()
    return { tags: buildTagMap(s.inputs, s.outputs, s.internal, s.plant), plantState: s.internal.M_PlantState }
  })

  useEffect(() => {
    const id = window.setInterval(() => {
      const s = usePlcStore.getState()
      setSnapshot({
        tags: buildTagMap(s.inputs, s.outputs, s.internal, s.plant),
        plantState: s.internal.M_PlantState,
      })
    }, MONITOR_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [])

  return <MemoLadderView tags={snapshot.tags} plantState={snapshot.plantState} />
}

export default LadderDiagram
