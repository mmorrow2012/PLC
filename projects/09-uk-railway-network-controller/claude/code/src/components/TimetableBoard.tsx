import { memo, useEffect, useMemo, useState, type FC } from 'react'
import { Clock3, MonitorSpeaker } from 'lucide-react'
import {
  STATIONS,
  STATION_BY_CODE,
  formatClock,
  formatMinutes,
} from '../plc/types'
import type {
  StationCode,
  TimetableEntry,
  TimetableRegister,
  TimetableStatus,
} from '../plc/types'
import { usePlcStore } from '../store/usePlcStore'

/** PIS boards refresh far slower than the 20 Hz MAST task. */
const BOARD_REFRESH_MS = 250

const STATUS_STYLE: Record<TimetableStatus, string> = {
  'ON TIME': 'text-emerald-300',
  BOARDING: 'text-cyan-300',
  DEPARTED: 'text-slate-500',
  DELAYED: 'text-amber-300',
  ARRIVED: 'text-slate-400',
  CANCELLED: 'text-rose-400',
}

/**
 * Split-flap cell. Each character is keyed by its own value, so React only
 * remounts — and therefore only re-runs the flap keyframes on — the characters
 * that actually changed, exactly like a real Solari board.
 */
const Flap: FC<{ text: string; tone?: 'amber' | 'cyan'; className?: string }> = memo(
  ({ text, tone = 'amber', className }) => (
    <span className={`${tone === 'cyan' ? 'flap-cyan' : 'flap-amber'} ${className ?? ''}`}>
      {text.split('').map((char, index) => (
        <span key={`${index}-${char}`} className="flap-cell">
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </span>
  ),
)
Flap.displayName = 'Flap'

interface BoardSnapshot {
  timetable: TimetableEntry[]
  registers: TimetableRegister[]
  clockSeconds: number
}

function takeSnapshot(): BoardSnapshot {
  const state = usePlcStore.getState()
  return {
    timetable: state.timetable,
    registers: state.registers,
    clockSeconds: state.internal.M_ClockSeconds,
  }
}

const TimetableBoard: FC = () => {
  const [snapshot, setSnapshot] = useState<BoardSnapshot>(takeSnapshot)
  const [station, setStation] = useState<StationCode | 'ALL'>('LON')
  const [kind, setKind] = useState<'departure' | 'arrival'>('departure')

  useEffect(() => {
    const id = window.setInterval(() => setSnapshot(takeSnapshot()), BOARD_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [])

  const rows = useMemo(
    () =>
      snapshot.timetable
        .filter((entry) => entry.kind === kind)
        .filter((entry) => station === 'ALL' || entry.station === station)
        .filter((entry) => entry.status !== 'DEPARTED' && entry.status !== 'ARRIVED')
        .slice(0, 9),
    [snapshot.timetable, station, kind],
  )

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
          <MonitorSpeaker size={15} className="text-amber-300" />
          Passenger Information System — Live {kind === 'departure' ? 'Departures' : 'Arrivals'}
        </h2>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded border border-slate-700">
            {(['departure', 'arrival'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setKind(option)}
                className={
                  kind === option
                    ? 'bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-200'
                    : 'bg-slate-950 px-3 py-1 text-xs font-medium text-slate-400 hover:text-slate-200'
                }
              >
                {option === 'departure' ? 'Departures' : 'Arrivals'}
              </button>
            ))}
          </div>
          <span className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[11px] text-amber-200">
            <Clock3 size={12} />
            {formatClock(snapshot.clockSeconds)}
          </span>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {(['ALL', ...STATIONS.map((s) => s.code)] as Array<StationCode | 'ALL'>).map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setStation(code)}
            className={
              station === code
                ? 'rounded border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-200'
                : 'rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-400 hover:text-slate-200'
            }
          >
            {code === 'ALL' ? 'All stations' : STATION_BY_CODE[code].city}
          </button>
        ))}
      </div>

      <div className="flap-board overflow-x-auto rounded border border-slate-800 p-3">
        <table className="w-full min-w-[720px] border-collapse font-mono text-[12px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-slate-500">
              <th className="pb-2 pr-3 font-medium">Time</th>
              <th className="pb-2 pr-3 font-medium">
                {kind === 'departure' ? 'Destination' : 'Origin'}
              </th>
              {station === 'ALL' && <th className="pb-2 pr-3 font-medium">Station</th>}
              <th className="pb-2 pr-3 font-medium">Plat</th>
              <th className="pb-2 pr-3 font-medium">Expected</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[11px] text-slate-600">
                  No services currently advertised — start the timetable service to populate the board.
                </td>
              </tr>
            )}
            {rows.map((entry) => (
              <tr key={entry.id} className="border-t border-slate-800/70 align-top">
                <td className="py-2 pr-3">
                  <Flap text={formatMinutes(entry.scheduledMin)} tone={entry.live ? 'cyan' : 'amber'} />
                </td>
                <td className="py-2 pr-3">
                  <Flap
                    text={entry.counterparty.toUpperCase()}
                    tone={entry.live ? 'cyan' : 'amber'}
                    className="tracking-wide"
                  />
                  <div className="text-[10px] normal-case text-slate-500">
                    {entry.headcode} · {entry.operator} · {entry.via}
                  </div>
                </td>
                {station === 'ALL' && (
                  <td className="py-2 pr-3 text-[11px] text-slate-400">
                    {STATION_BY_CODE[entry.station].city}
                  </td>
                )}
                <td className="py-2 pr-3">
                  <Flap text={String(entry.platform)} tone={entry.live ? 'cyan' : 'amber'} />
                </td>
                <td className="py-2 pr-3">
                  <Flap
                    text={
                      Math.round(entry.expectedMin) === Math.round(entry.scheduledMin)
                        ? 'ON TIME'
                        : formatMinutes(entry.expectedMin)
                    }
                    tone={entry.live ? 'cyan' : 'amber'}
                  />
                </td>
                <td className={`py-2 ${STATUS_STYLE[entry.status]}`}>
                  <span className="inline-flex items-center gap-1.5">
                    {entry.status === 'BOARDING' && (
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                    )}
                    {entry.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="mt-3 rounded border border-slate-800 bg-slate-950">
        <summary className="cursor-pointer px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Timetable register table %MW10 – %MW50 ({snapshot.registers.length} frames × 5 words)
        </summary>
        <div className="overflow-x-auto px-3 pb-3">
          <table className="w-full min-w-[520px] border-collapse font-mono text-[11px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-slate-500">
                <th className="py-1 pr-3 font-medium">Base</th>
                <th className="py-1 pr-3 font-medium">+0 Station</th>
                <th className="py-1 pr-3 font-medium">+1 Sched</th>
                <th className="py-1 pr-3 font-medium">+2 Expected</th>
                <th className="py-1 pr-3 font-medium">+3 Platform</th>
                <th className="py-1 font-medium">+4 Status</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {snapshot.registers.map((register) => (
                <tr key={register.address} className="border-t border-slate-800/70">
                  <td className="py-1 pr-3 text-cyan-300">{register.address}</td>
                  <td className="py-1 pr-3">{register.station}</td>
                  <td className="py-1 pr-3">{register.scheduledMin}</td>
                  <td className="py-1 pr-3">{register.expectedMin}</td>
                  <td className="py-1 pr-3">{register.platform}</td>
                  <td className="py-1">{register.statusCode}</td>
                </tr>
              ))}
              {snapshot.registers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-center text-slate-600">
                    Register table empty — FB_TimetableManager has not published a frame yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}

export default TimetableBoard
