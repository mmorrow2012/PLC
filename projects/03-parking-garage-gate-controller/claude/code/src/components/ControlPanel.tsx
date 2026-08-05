import { type FC, useEffect, useRef } from 'react'
import { plcEngine } from '../plc/softPlcEngine'
import { GATE_STATE_LABEL, type GateState } from '../plc/types'
import { type ForceableTag, usePlcStore } from '../store/usePlcStore'

/** Minimum time a manual pushbutton stays asserted after release, so a fast
 * click (mousedown+mouseup faster than one ~50ms scan) still guarantees the
 * soft-PLC observes at least one scan with the contact closed - exactly
 * like real pushbutton contact bounce/dwell outlasting a single scan. */
const MIN_PB_HOLD_MS = 80

const FORCEABLE_TAGS: ForceableTag[] = [
  'Sensor_GateOpenLimit',
  'Sensor_GateClosedLimit',
  'Motor_GateUp',
  'Motor_GateDown',
  'Light_Green',
  'Light_Red',
]

const ControlPanel: FC = () => {
  const inputs = usePlcStore((s) => s.inputs)
  const internal = usePlcStore((s) => s.internal)
  const outputs = usePlcStore((s) => s.outputs)
  const metrics = usePlcStore((s) => s.metrics)
  const forces = usePlcStore((s) => s.forces)
  const engineRunning = usePlcStore((s) => s.engineRunning)
  const gateJammed = usePlcStore((s) => s.gateJammed)

  const setEStop = usePlcStore((s) => s.setEStop)
  const setVehiclePresence = usePlcStore((s) => s.setVehiclePresence)
  const setObstruction = usePlcStore((s) => s.setObstruction)
  const setGateJammed = usePlcStore((s) => s.setGateJammed)
  const setManualOpen = usePlcStore((s) => s.setManualOpen)
  const setManualClose = usePlcStore((s) => s.setManualClose)
  const setForce = usePlcStore((s) => s.setForce)
  const clearForce = usePlcStore((s) => s.clearForce)
  const systemReset = usePlcStore((s) => s.systemReset)

  useEffect(() => {
    plcEngine.start()
    return () => plcEngine.stop()
  }, [])

  const manualOpenReleaseTimer = useRef<number | null>(null)
  const manualCloseReleaseTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (manualOpenReleaseTimer.current !== null) window.clearTimeout(manualOpenReleaseTimer.current)
      if (manualCloseReleaseTimer.current !== null) window.clearTimeout(manualCloseReleaseTimer.current)
    },
    [],
  )

  const pressManualOpen = () => {
    if (manualOpenReleaseTimer.current !== null) {
      window.clearTimeout(manualOpenReleaseTimer.current)
      manualOpenReleaseTimer.current = null
    }
    setManualOpen(true)
  }
  const releaseManualOpen = () => {
    manualOpenReleaseTimer.current = window.setTimeout(() => setManualOpen(false), MIN_PB_HOLD_MS)
  }
  const pressManualClose = () => {
    if (manualCloseReleaseTimer.current !== null) {
      window.clearTimeout(manualCloseReleaseTimer.current)
      manualCloseReleaseTimer.current = null
    }
    setManualClose(true)
  }
  const releaseManualClose = () => {
    manualCloseReleaseTimer.current = window.setTimeout(() => setManualClose(false), MIN_PB_HOLD_MS)
  }

  const faultLatched = internal.EStopFaultLatched
  const stuckGate = outputs.Alarm_StuckGate
  const stateLabel = GATE_STATE_LABEL[internal.GateState as GateState]

  return (
    <aside className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">HMI Control Panel</h2>

      <div className="space-y-5">
        {/* Scan engine status */}
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Soft-PLC Scan Engine</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className={engineRunning ? 'text-lg font-semibold text-emerald-400' : 'text-lg font-semibold text-slate-400'}>
              {engineRunning ? 'RUNNING' : 'STOPPED'}
            </span>
            <span className="text-xs text-slate-500">{metrics.configuredCycleTimeMs} ms target</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Actual: {metrics.lastCycleTimeMs.toFixed(1)} ms · Scan #{metrics.scanCount}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            GateState: <span className="font-mono text-cyan-300">{stateLabel}</span>
          </div>
        </div>

        {/* E-Stop */}
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Safety Circuit</div>
          <button
            type="button"
            onClick={() => setEStop(!inputs.E_Stop)}
            disabled={'E_Stop' in forces}
            className={
              inputs.E_Stop
                ? 'w-full rounded border border-emerald-600 bg-emerald-600/20 px-4 py-3 text-sm font-bold uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-50'
                : 'w-full animate-pulse rounded border border-rose-500 bg-rose-600 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-rose-500'
            }
          >
            {inputs.E_Stop ? 'E-Stop: Healthy (click to trip)' : 'E-STOP TRIPPED — click to restore'}
          </button>
        </div>

        {/* Vehicle / obstruction simulation */}
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Field Simulation</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVehiclePresence(!inputs.Sensor_VehiclePresence)}
              disabled={'Sensor_VehiclePresence' in forces}
              className={
                inputs.Sensor_VehiclePresence
                  ? 'rounded border border-cyan-500 bg-cyan-500/20 px-3 py-2 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50'
                  : 'rounded border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50'
              }
            >
              Vehicle {inputs.Sensor_VehiclePresence ? 'Present' : 'Arrive'}
            </button>
            <button
              type="button"
              onClick={() => setObstruction(!inputs.Sensor_Obstruction)}
              disabled={'Sensor_Obstruction' in forces}
              className={
                inputs.Sensor_Obstruction
                  ? 'rounded border border-rose-500 bg-rose-500/20 px-3 py-2 text-xs font-medium text-rose-200 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50'
                  : 'rounded border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50'
              }
            >
              Obstruction {inputs.Sensor_Obstruction ? 'Active' : 'Simulate'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setGateJammed(!gateJammed)}
            className={
              gateJammed
                ? 'mt-2 w-full rounded border border-amber-500 bg-amber-500/20 px-3 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-500/30'
                : 'mt-2 w-full rounded border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-500'
            }
          >
            Mechanical Jam {gateJammed ? 'Active (watchdog will trip)' : '(simulate stuck gate)'}
          </button>
        </div>

        {/* Manual overrides */}
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Manual Override (hold to jog)</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onMouseDown={pressManualOpen}
              onMouseUp={releaseManualOpen}
              onMouseLeave={releaseManualOpen}
              onTouchStart={pressManualOpen}
              onTouchEnd={releaseManualOpen}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 active:bg-emerald-700"
            >
              Manual Open
            </button>
            <button
              type="button"
              onMouseDown={pressManualClose}
              onMouseUp={releaseManualClose}
              onMouseLeave={releaseManualClose}
              onTouchStart={pressManualClose}
              onTouchEnd={releaseManualClose}
              className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500 active:bg-rose-700"
            >
              Manual Close
            </button>
          </div>
          {(faultLatched || stuckGate) && (
            <p className="mt-2 text-[11px] text-amber-300">
              {faultLatched && 'E-Stop fault latched — press either button (while healthy) to reset. '}
              {stuckGate && 'Gate stuck — hold Manual Open/Close to jog to a limit switch and clear the alarm.'}
            </p>
          )}
        </div>

        {/* Forced overrides */}
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Forced I/O Overrides</div>
          <div className="space-y-1.5">
            {FORCEABLE_TAGS.map((tag) => {
              const isForced = tag in forces
              const tagValues: Record<string, boolean> = { ...inputs, ...outputs }
              const currentValue = tagValues[tag]
              return (
                <div key={tag} className="flex items-center justify-between text-[11px]">
                  <span className={isForced ? 'font-mono text-amber-300' : 'font-mono text-slate-400'}>{tag}</span>
                  <button
                    type="button"
                    onClick={() => (isForced ? clearForce(tag) : setForce(tag, !currentValue))}
                    className={
                      isForced
                        ? 'rounded border border-amber-500 bg-amber-500/20 px-2 py-0.5 text-amber-200'
                        : 'rounded border border-slate-700 px-2 py-0.5 text-slate-400 hover:border-slate-500'
                    }
                  >
                    {isForced ? 'Unforce' : 'Force'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={systemReset}
          className="w-full rounded border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
        >
          System Reset (clear simulation)
        </button>
      </div>
    </aside>
  )
}

export default ControlPanel
