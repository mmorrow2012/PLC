import type { FC } from 'react';
import { Package, Activity, AlertCircle } from 'lucide-react';
import { usePlcStore } from '../store/usePlcStore';

const Visualizer: FC = () => {
  const {
    plcRunning,
    outputs,
    inputs,
    parts,
    partCountTotal,
    partCountAccept,
    partCountReject,
    scanCount,
    cycleTimeMs,
  } = usePlcStore();

  return (
    <section className="space-y-4">
      {/* Demo Instructions */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-300">
          <Activity className="h-4 w-4" />
          Interactive Demo - 4 Steps
        </h3>
        <ol className="space-y-1 text-xs text-blue-200">
          <li>1. Click <strong>Start</strong> in PLC Control to begin the scan loop</li>
          <li>2. Use <strong>Spawn Parts</strong> buttons to add Green (accept) or Red (reject) packages</li>
          <li>3. Watch parts move along the belt, get inspected by sensors, and sorted by the diverter</li>
          <li>4. Try the <strong>E-STOP</strong> button to trigger safety interlock (requires Reset to resume)</li>
        </ol>
      </div>

      {/* Main Visualizer */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">Conveyor Visualizer</h2>
        
        {/* Conveyor Belt Animation */}
        <div className="relative mb-6 h-48 overflow-hidden rounded border border-slate-700 bg-slate-950">
          {/* Belt background */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900">
            {/* Belt lines (moving if VFD running) */}
            <div className={`absolute inset-0 ${outputs.VFD_Run ? 'animate-conveyor' : ''}`}>
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute h-[2px] w-full bg-slate-700"
                  style={{ top: `${i * 10}%` }}
                />
              ))}
            </div>
          </div>

          {/* Sensor zone indicator */}
          <div className="absolute left-[72%] top-0 h-full w-[6%] border-x border-dashed border-amber-500/30 bg-amber-500/5">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-amber-400">
              Sensor
            </div>
            {inputs.Sensor_PartDetect && (
              <div className="absolute left-1/2 top-1/2 h-full w-1 -translate-x-1/2 -translate-y-1/2 bg-amber-400 opacity-50 blur-sm" />
            )}
          </div>

          {/* Diverter zone indicator */}
          <div className="absolute left-[82%] top-0 h-full w-[6%] border-x border-dashed border-purple-500/30 bg-purple-500/5">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-purple-400">
              Diverter
            </div>
            {outputs.Actuator_Diverter && (
              <div className="absolute left-1/2 top-0 h-1/2 w-2 -translate-x-1/2 rounded-b bg-purple-500" />
            )}
          </div>

          {/* Parts on belt */}
          {parts.map((part) => (
            <div
              key={part.id}
              className="absolute transition-all duration-75"
              style={{
                left: `${part.position}%`,
                top: part.diverted ? '75%' : '40%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <Package
                className={`h-6 w-6 ${
                  part.color === 1
                    ? 'text-red-500'
                    : part.color === 2
                    ? 'text-green-500'
                    : 'text-blue-500'
                }`}
              />
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-slate-500">
                #{part.id}
              </div>
            </div>
          ))}

          {/* Belt direction arrow */}
          <div className="absolute bottom-2 left-2 text-xs text-slate-600">
            → Direction of travel
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            label="VFD Status"
            value={outputs.VFD_Run ? 'Running' : 'Stopped'}
            className={outputs.VFD_Run ? 'text-emerald-400' : 'text-slate-400'}
          />
          <StatusCard
            label="Motor Speed"
            value={`${outputs.VFD_Speed_Ref.toFixed(1)}%`}
            className="text-slate-200"
          />
          <StatusCard
            label="Scan Cycle"
            value={`${cycleTimeMs} ms`}
            subValue={`#${scanCount}`}
            className="text-slate-200"
          />
          <StatusCard
            label="Parts on Belt"
            value={parts.length}
            className="text-slate-200"
          />
        </div>

        {/* Counters */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <CounterCard
            label="Total Inspected"
            value={partCountTotal}
            color="blue"
          />
          <CounterCard
            label="Accepted"
            value={partCountAccept}
            color="green"
          />
          <CounterCard
            label="Rejected"
            value={partCountReject}
            color="red"
          />
        </div>

        {/* Sensor Readings */}
        <div className="mt-4 rounded border border-slate-800 bg-slate-950 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Live Sensor Data</h3>
          <div className="grid gap-2 text-xs sm:grid-cols-3">
            <div>
              <span className="text-slate-500">Part Detect:</span>{' '}
              <span className={inputs.Sensor_PartDetect ? 'font-semibold text-amber-400' : 'text-slate-600'}>
                {inputs.Sensor_PartDetect ? 'TRUE' : 'FALSE'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Color:</span>{' '}
              <span className={inputs.Sensor_Color > 0 ? 'font-semibold text-amber-400' : 'text-slate-600'}>
                {inputs.Sensor_Color === 1 ? 'Red' : inputs.Sensor_Color === 2 ? 'Green' : inputs.Sensor_Color === 3 ? 'Blue' : 'None'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Weight:</span>{' '}
              <span className={inputs.Sensor_Weight > 0 ? 'font-semibold text-amber-400' : 'text-slate-600'}>
                {inputs.Sensor_Weight.toFixed(2)} kg
              </span>
            </div>
          </div>
        </div>

        {/* Alarm Status */}
        {outputs.Alarm_Tower > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4" />
            <span className="font-semibold">ALARM ACTIVE</span>
            <span className="ml-auto font-mono">0x{outputs.Alarm_Tower.toString(16).toUpperCase().padStart(4, '0')}</span>
          </div>
        )}
      </div>
    </section>
  );
};

interface StatusCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  className?: string;
}

const StatusCard: FC<StatusCardProps> = ({ label, value, subValue, className }) => {
  return (
    <div className="rounded border border-slate-800 bg-slate-950 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${className}`}>{value}</div>
      {subValue && <div className="text-xs text-slate-600">{subValue}</div>}
    </div>
  );
};

interface CounterCardProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'red';
}

const CounterCard: FC<CounterCardProps> = ({ label, value, color }) => {
  const colorClasses = {
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    green: 'border-green-500/30 bg-green-500/10 text-green-300',
    red: 'border-red-500/30 bg-red-500/10 text-red-300',
  };

  return (
    <div className={`rounded border p-3 ${colorClasses[color]}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
};

export default Visualizer;
