import type { FC, ReactNode } from 'react'
import {
  DEFAULT_MAX_TURBIDITY,
  DEFAULT_TARGET_DO,
  PLANT_STATE_LABEL,
  TAG_ADDRESS,
  TAG_UNIT,
  TRIP_LABEL,
  TURBIDITY_TRIP_NTU,
} from '../plc/types'
import {
  FORCEABLE_INPUTS,
  FORCEABLE_OUTPUTS,
  usePlcStore,
  type ForceableTag,
} from '../store/usePlcStore'

const Panel: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <div className="rounded border border-slate-800 bg-slate-950 p-3">
    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {title}
    </div>
    {children}
  </div>
)

interface LampProps {
  label: string
  tag: string
  on: boolean
  tone?: 'green' | 'amber' | 'cyan' | 'magenta'
}

const Lamp: FC<LampProps> = ({ label, tag, on, tone = 'green' }) => {
  const colors = {
    green: 'bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]',
    amber: 'bg-amber-400 shadow-[0_0_8px_2px_rgba(251,191,36,0.6)]',
    cyan: 'bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.6)]',
    magenta: 'bg-fuchsia-400 shadow-[0_0_8px_2px_rgba(232,121,249,0.6)]',
  } as const
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${on ? colors[tone] : 'bg-slate-700'}`} />
      <span className="truncate text-[11px] text-slate-300">{label}</span>
      <span className="ml-auto shrink-0 font-mono text-[10px] text-slate-500">{tag}</span>
    </div>
  )
}

interface SliderProps {
  label: string
  address: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (value: number) => void
  hint?: string
}

const Slider: FC<SliderProps> = ({ label, address, value, min, max, step, unit, onChange, hint }) => (
  <label className="block py-1.5">
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] text-slate-300">{label}</span>
      <span className="font-mono text-[11px] text-cyan-300">
        {value.toFixed(step < 1 ? 1 : 0)} {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="mt-1 w-full accent-cyan-500"
    />
    <div className="flex justify-between text-[9.5px] text-slate-600">
      <span className="font-mono">{address}</span>
      {hint && <span>{hint}</span>}
    </div>
  </label>
)

const ControlPanel: FC = () => {
  const inputs = usePlcStore((s) => s.inputs)
  const outputs = usePlcStore((s) => s.outputs)
  const internal = usePlcStore((s) => s.internal)
  const plant = usePlcStore((s) => s.plant)
  const commands = usePlcStore((s) => s.commands)
  const disturbances = usePlcStore((s) => s.disturbances)
  const metrics = usePlcStore((s) => s.metrics)
  const forces = usePlcStore((s) => s.forces)

  const setEStopHealthy = usePlcStore((s) => s.setEStopHealthy)
  const pressPushbutton = usePlcStore((s) => s.pressPushbutton)
  const setTargetDO = usePlcStore((s) => s.setTargetDO)
  const setMaxTurbidity = usePlcStore((s) => s.setMaxTurbidity)
  const swapLeadPump = usePlcStore((s) => s.swapLeadPump)
  const setWeirManualMode = usePlcStore((s) => s.setWeirManualMode)
  const setWeirJog = usePlcStore((s) => s.setWeirJog)
  const setRawInflowPct = usePlcStore((s) => s.setRawInflowPct)
  const injectTurbidityShock = usePlcStore((s) => s.injectTurbidityShock)
  const setBypassDrain = usePlcStore((s) => s.setBypassDrain)
  const setForce = usePlcStore((s) => s.setForce)
  const clearForce = usePlcStore((s) => s.clearForce)
  const systemReset = usePlcStore((s) => s.systemReset)

  const estopTripped = !inputs.I_EStop_NC
  const forceableTags: ForceableTag[] = [...FORCEABLE_INPUTS, ...FORCEABLE_OUTPUTS]

  return (
    <aside className="space-y-3">
      {/* --- Master controls --------------------------------------------- */}
      <Panel title="Master Control">
        <button
          type="button"
          onClick={() => setEStopHealthy(estopTripped)}
          className={
            estopTripped
              ? 'w-full rounded-full border-4 border-rose-300 bg-rose-600 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-inner transition hover:bg-rose-500'
              : 'w-full rounded-full border-4 border-rose-900 bg-rose-700 px-4 py-3 text-sm font-bold uppercase tracking-wide text-rose-100 transition hover:bg-rose-600'
          }
          title="%I0.0 I_EStop_NC — normally closed chain"
        >
          {estopTripped ? 'E-Stop Latched · Twist to Release' : 'Emergency Stop'}
        </button>
        <div className="mt-1 text-center font-mono text-[10px] text-slate-500">
          %I0.0 = {inputs.I_EStop_NC ? '1 (healthy)' : '0 (chain open)'}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => pressPushbutton('I_PlantStart_PB')}
            disabled={internal.M_PlantRun || internal.M_SafetyTrip}
            className="rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Plant Start
            <span className="block font-mono text-[9px] font-normal opacity-70">%I0.1</span>
          </button>
          <button
            type="button"
            onClick={() => pressPushbutton('I_PlantStop_PB')}
            disabled={!internal.M_PlantRun}
            className="rounded bg-slate-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Plant Stop
            <span className="block font-mono text-[9px] font-normal opacity-70">%I0.2</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => pressPushbutton('I_ResetFault_PB')}
          className="mt-2 w-full rounded bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-500"
        >
          Reset Fault / Acknowledge Alarm
          <span className="ml-1 font-mono text-[9px] font-normal opacity-70">%I0.3</span>
        </button>

        <div
          className={
            internal.M_SafetyTrip
              ? 'mt-3 rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-200'
              : 'mt-3 rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-400'
          }
        >
          {internal.M_SafetyTrip ? TRIP_LABEL[internal.M_AlarmCode] : 'No active alarm'}
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Operating state</span>
          <span className="font-mono text-cyan-300">
            {internal.M_PlantState} · {PLANT_STATE_LABEL[internal.M_PlantState]}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">MAST scan</span>
          <span className="font-mono text-slate-300">
            {metrics.configuredCycleTimeMs} ms · #{metrics.scanCount}
          </span>
        </div>
      </Panel>

      {/* --- Setpoints ---------------------------------------------------- */}
      <Panel title="Setpoints (%MW)">
        <Slider
          label="Dissolved oxygen target"
          address={TAG_ADDRESS.M_TargetDO}
          value={internal.M_TargetDO}
          min={0.5}
          max={6}
          step={0.1}
          unit={TAG_UNIT.M_TargetDO}
          onChange={setTargetDO}
          hint={`default ${DEFAULT_TARGET_DO.toFixed(1)}`}
        />
        <Slider
          label="Max discharge turbidity"
          address={TAG_ADDRESS.M_MaxTurbidity}
          value={internal.M_MaxTurbidity}
          min={5}
          max={24}
          step={0.5}
          unit={TAG_UNIT.M_MaxTurbidity}
          onChange={setMaxTurbidity}
          hint={`default ${DEFAULT_MAX_TURBIDITY.toFixed(1)}`}
        />
        <div className="mt-2 flex items-center justify-between rounded border border-slate-800 bg-slate-900 px-2 py-1.5">
          <div>
            <div className="text-[11px] text-slate-300">Lead influent pump</div>
            <div className="font-mono text-[9.5px] text-slate-500">
              {TAG_ADDRESS.M_LeadPumpToggle} = {internal.M_LeadPumpToggle}
            </div>
          </div>
          <button
            type="button"
            onClick={swapLeadPump}
            className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-200 transition hover:bg-cyan-500/20"
          >
            Pump {internal.M_LeadPumpToggle} → Pump {internal.M_LeadPumpToggle === 1 ? 2 : 1}
          </button>
        </div>
      </Panel>

      {/* --- Weir gate ---------------------------------------------------- */}
      <Panel title="Motorised Weir Sluice Gate">
        <div className="mb-2 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Position</span>
          <span className="font-mono text-cyan-300">{plant.weirPosition.toFixed(0)} % open</span>
        </div>
        <div className="mb-2 h-2 w-full overflow-hidden rounded bg-slate-800">
          <div
            className="h-full rounded bg-cyan-500 transition-[width] duration-100"
            style={{ width: `${plant.weirPosition}%` }}
          />
        </div>
        <label className="mb-2 flex items-center gap-2 text-[11px] text-slate-300">
          <input
            type="checkbox"
            checked={commands.Cmd_WeirManualMode}
            onChange={(event) => setWeirManualMode(event.target.checked)}
            className="accent-cyan-500"
          />
          Manual mode (bypass AUTO discharge permit)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['open', 'close'] as const).map((direction) => (
            <button
              key={direction}
              type="button"
              disabled={!commands.Cmd_WeirManualMode}
              onMouseDown={() => setWeirJog(direction, true)}
              onMouseUp={() => setWeirJog(direction, false)}
              onMouseLeave={() => setWeirJog(direction, false)}
              onTouchStart={() => setWeirJog(direction, true)}
              onTouchEnd={() => setWeirJog(direction, false)}
              className={
                direction === 'open'
                  ? 'rounded bg-emerald-700 px-2 py-2 text-[11px] font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-30'
                  : 'rounded bg-orange-700 px-2 py-2 text-[11px] font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-30'
              }
            >
              Jog {direction === 'open' ? 'Open' : 'Close'}
              <span className="block font-mono text-[9px] font-normal opacity-70">
                {direction === 'open' ? '%Q0.6' : '%Q0.7'}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-2 space-y-0.5">
          <Lamp label="Fully open limit switch" tag="%I0.7" on={inputs.I_WeirOpenLS} />
          <Lamp label="AUTO discharge permit" tag="%M17" on={internal.M_WeirOpenCmd} tone="cyan" />
        </div>
      </Panel>

      {/* --- Field simulation --------------------------------------------- */}
      <Panel title="Field Simulation (plant model)">
        <Slider
          label="Raw catchment influent"
          address="simulation"
          value={disturbances.rawInflowPct}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={setRawInflowPct}
          hint="storm loading"
        />
        <button
          type="button"
          onClick={() => injectTurbidityShock(28)}
          className="mt-1 w-full rounded border border-rose-500/40 bg-rose-500/10 px-2 py-2 text-[11px] font-medium text-rose-200 transition hover:bg-rose-500/20"
        >
          Inject storm / toxic shock (+28 NTU)
        </button>
        <label className="mt-2 flex items-start gap-2 text-[11px] text-slate-300">
          <input
            type="checkbox"
            checked={disturbances.bypassDrainOpen}
            onChange={(event) => setBypassDrain(event.target.checked)}
            className="mt-0.5 accent-amber-500"
          />
          <span>
            Manual storm bypass penstock
            <span className="block text-[9.5px] text-slate-500">
              Hand-wound in the field — the only way to drain the equalization basin while a trip
              inhibits the influent pumps. Use it to recover from a %I0.4 flooding trip.
            </span>
          </span>
        </label>
        <div className="mt-2 grid grid-cols-2 gap-x-3 text-[11px]">
          <span className="text-slate-400">Turbidity</span>
          <span
            className={
              plant.turbidity >= TURBIDITY_TRIP_NTU
                ? 'text-right font-mono text-rose-300'
                : plant.turbidity >= internal.M_MaxTurbidity
                  ? 'text-right font-mono text-amber-300'
                  : 'text-right font-mono text-emerald-300'
            }
          >
            {plant.turbidity.toFixed(1)} NTU
          </span>
          <span className="text-slate-400">Discharged</span>
          <span className="text-right font-mono text-slate-300">
            {plant.dischargedVolume.toFixed(1)} m³
          </span>
        </div>
      </Panel>

      {/* --- Live process image ------------------------------------------- */}
      <Panel title="Analog Process Image">
        <div className="space-y-1">
          {(
            [
              ['AI_LT_EqBasin', plant.eqBasinLevel],
              ['AI_LT_AerationA', plant.aerationALevel],
              ['AI_LT_AerationB', plant.aerationBLevel],
              ['AI_DO_AerationA', plant.dissolvedOxygen],
              ['AI_Turbidity_Effluent', plant.turbidity],
              ['AQ_VFD_InfluentSpeed', outputs.AQ_VFD_InfluentSpeed],
              ['AQ_AirValve_Aeration', outputs.AQ_AirValve_Aeration],
            ] as Array<[string, number]>
          ).map(([tag, value]) => (
            <div key={tag} className="flex items-baseline gap-2 text-[11px]">
              <span className="w-14 shrink-0 font-mono text-[10px] text-slate-500">
                {TAG_ADDRESS[tag]}
              </span>
              <span className="truncate text-slate-300">{tag}</span>
              <span className="ml-auto shrink-0 font-mono text-cyan-300">
                {value.toFixed(2)} {TAG_UNIT[tag]}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Discrete Outputs">
        <Lamp label="Influent pump 1" tag="%Q0.0" on={outputs.Q_Pump_RawInfluent1} />
        <Lamp label="Influent pump 2" tag="%Q0.1" on={outputs.Q_Pump_RawInfluent2} />
        <Lamp label="Blower basin A" tag="%Q0.2" on={outputs.Q_Blower_AerationA} tone="cyan" />
        <Lamp label="Blower basin B" tag="%Q0.3" on={outputs.Q_Blower_AerationB} tone="cyan" />
        <Lamp label="RAS pump" tag="%Q0.4" on={outputs.Q_Pump_RAS} />
        <Lamp label="Coagulant dosing" tag="%Q0.5" on={outputs.Q_Pump_Coagulant} tone="magenta" />
        <Lamp label="Weir gate open" tag="%Q0.6" on={outputs.Q_Motor_WeirOpen} />
        <Lamp label="Weir gate close" tag="%Q0.7" on={outputs.Q_Motor_WeirClose} tone="amber" />
        <div className="mt-2 border-t border-slate-800 pt-2">
          <Lamp label="HH float — equalization" tag="%I0.4" on={inputs.I_LSH_Equalization} tone="amber" />
          <Lamp label="High float — basin A" tag="%I0.5" on={inputs.I_LSH_AerationA} tone="amber" />
          <Lamp label="High float — basin B" tag="%I0.6" on={inputs.I_LSH_AerationB} tone="amber" />
        </div>
      </Panel>

      {/* --- Animation-table style forcing --------------------------------- */}
      <Panel title="Forced I/O (animation table)">
        <p className="mb-2 text-[10.5px] leading-snug text-slate-500">
          Overrides the process image before the logic executes, exactly like a Control Expert
          force. Forced tags are highlighted; clear a force to return the channel to the field.
        </p>
        <div className="space-y-1">
          {forceableTags.map((tag) => {
            const forced = tag in forces
            const value = forced ? forces[tag] : undefined
            return (
              <div key={tag} className="flex items-center gap-1.5">
                <span className="w-12 shrink-0 font-mono text-[10px] text-slate-500">
                  {TAG_ADDRESS[tag]}
                </span>
                <span
                  className={
                    forced
                      ? 'truncate text-[10.5px] text-amber-300'
                      : 'truncate text-[10.5px] text-slate-400'
                  }
                >
                  {tag}
                </span>
                <div className="ml-auto flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setForce(tag, true)}
                    className={
                      forced && value
                        ? 'rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] text-white'
                        : 'rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-slate-700'
                    }
                  >
                    1
                  </button>
                  <button
                    type="button"
                    onClick={() => setForce(tag, false)}
                    className={
                      forced && !value
                        ? 'rounded bg-rose-600 px-1.5 py-0.5 text-[10px] text-white'
                        : 'rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-slate-700'
                    }
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => clearForce(tag)}
                    disabled={!forced}
                    className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 transition hover:bg-slate-700 disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <button
          type="button"
          onClick={systemReset}
          className="mt-3 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-[11px] font-medium text-slate-200 transition hover:bg-slate-700"
        >
          Cold restart (reset plant &amp; retentive memory)
        </button>
      </Panel>
    </aside>
  )
}

export default ControlPanel
