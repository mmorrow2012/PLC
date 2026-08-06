import Editor from '@monaco-editor/react';
import type { FC } from 'react';
import { useState } from 'react';
import conveyorLogicSource from '../plc/conveyorLogicSource';
import { usePlcStore } from '../store/usePlcStore';

const CodeViewer: FC = () => {
  const [viewMode, setViewMode] = useState<'ladder' | 'st'>('ladder');
  const { ladderRungs } = usePlcStore();

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">PLC Logic Monitor</h2>
        <div className="inline-flex rounded border border-slate-700 bg-slate-950">
          <button
            type="button"
            onClick={() => setViewMode('ladder')}
            className={`px-3 py-1 text-xs font-medium transition ${
              viewMode === 'ladder'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Ladder Diagram
          </button>
          <button
            type="button"
            onClick={() => setViewMode('st')}
            className={`px-3 py-1 text-xs font-medium transition ${
              viewMode === 'st'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Structured Text
          </button>
        </div>
      </div>

      {viewMode === 'ladder' ? (
        <div className="overflow-hidden rounded border border-slate-800 bg-black p-4">
          <div className="font-mono text-xs">
            <div className="mb-3 text-slate-500">
              {/* Power rails */}
              <span className="text-amber-400">24V</span> ──────────────────────────────────── <span className="text-blue-400">0V</span>
            </div>
            
            {/* Rung 1: Safety E-Stop Interlock */}
            <LadderRung
              rungId="rung1"
              description="Safety E-Stop Interlock"
              energized={ladderRungs.find(r => r.id === 'rung1')?.energized || false}
            >
              <span className={ladderRungs.find(r => r.id === 'rung1')?.energized ? 'text-cyan-400' : 'text-slate-600'}>
                ──┤E_Stop├──┤/Safety_Latched├──
              </span>
            </LadderRung>

            {/* Rung 2: VFD Run Enable */}
            <LadderRung
              rungId="rung2"
              description="VFD Run Enable"
              energized={ladderRungs.find(r => r.id === 'rung2')?.energized || false}
            >
              <span className={ladderRungs.find(r => r.id === 'rung2')?.energized ? 'text-cyan-400' : 'text-slate-600'}>
                ──┤E_Stop├──┤/Safety_Latched├──┤PLC_Run├──( VFD_Run )──
              </span>
            </LadderRung>

            {/* Rung 3: Part Detection */}
            <LadderRung
              rungId="rung3"
              description="Part Detection & Inspection"
              energized={ladderRungs.find(r => r.id === 'rung3')?.energized || false}
            >
              <span className={ladderRungs.find(r => r.id === 'rung3')?.energized ? 'text-cyan-400' : 'text-slate-600'}>
                ──┤Sensor_PartDetect├──( Part_InspectionActive )──
              </span>
            </LadderRung>

            {/* Rung 4: Reject Diverter Logic */}
            <LadderRung
              rungId="rung4"
              description="Reject Diverter Logic"
              energized={ladderRungs.find(r => r.id === 'rung4')?.energized || false}
            >
              <span className={ladderRungs.find(r => r.id === 'rung4')?.energized ? 'text-cyan-400' : 'text-slate-600'}>
                ──┤Sensor_PartDetect├──┤Color=1 OR Weight&gt;2.0├──( Actuator_Diverter )──
              </span>
            </LadderRung>

            {/* Rung 5: Speed Reference */}
            <LadderRung
              rungId="rung5"
              description="Speed Reference Output"
              energized={ladderRungs.find(r => r.id === 'rung5')?.energized || false}
            >
              <span className={ladderRungs.find(r => r.id === 'rung5')?.energized ? 'text-cyan-400' : 'text-slate-600'}>
                ──┤VFD_Run├──( VFD_Speed_Ref := Speed_Setpoint )──
              </span>
            </LadderRung>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-slate-800">
          <Editor
            height="320px"
            defaultLanguage="pascal"
            value={conveyorLogicSource}
            options={{
              minimap: { enabled: false },
              readOnly: true,
              scrollBeyondLastLine: false,
              fontSize: 12,
            }}
            theme="vs-dark"
          />
        </div>
      )}
    </section>
  );
};

interface LadderRungProps {
  rungId: string;
  description: string;
  energized: boolean;
  children: React.ReactNode;
}

const LadderRung: FC<LadderRungProps> = ({ description, energized, children }) => {
  return (
    <div className="mb-2 group">
      <div className="flex items-start gap-2">
        <div className={`min-w-fit px-2 py-0.5 rounded text-[10px] font-medium ${
          energized 
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
            : 'bg-slate-800/50 text-slate-500 border border-slate-700/30'
        }`}>
          {energized ? '●' : '○'}
        </div>
        <div className="flex-1">
          {children}
          <div className="mt-0.5 text-[10px] text-slate-500">{description}</div>
        </div>
      </div>
    </div>
  );
};

export default CodeViewer;
