import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { usePlcStore } from '../store/usePlcStore';

interface CodeViewerProps {
  code?: string;
  onChange?: (val: string | undefined) => void;
}

const defaultCode = `(* IEC 61131-3 Structured Text - UK Railway Signaling Controller *)
PROGRAM RailwayNetworkInterlocking
VAR_INPUT
    DI_ESTOP_NC        : BOOL; (* Master Railway E-Stop *)
    DI_MASTER_RUN      : BOOL; (* Plant / Timetable Run Command *)
    DI_RESET_FAULT     : BOOL; (* Signal & Interlock Fault Reset *)
    DI_AXLE_LONDON     : BOOL; (* London Block Occupancy Sensor *)
    DI_AXLE_BRUM       : BOOL; (* Birmingham Block Occupancy Sensor *)
    DI_AXLE_MANCHESTER : BOOL; (* Manchester Block Occupancy Sensor *)
    DI_AXLE_EDINBURGH  : BOOL; (* Edinburgh Block Occupancy Sensor *)
    DI_POINT_ALIGN_MAIN: BOOL; (* Point Switch Alignment Limit *)
    AI_TRACTION_SPEED1 : REAL; (* Actual Train 1 Speed (km/h) *)
    AI_TRACTION_SPEED2 : REAL; (* Actual Train 2 Speed (km/h) *)
END_VAR

VAR_OUTPUT
    DO_SIGNAL_LONDON   : BOOL; (* London Aspect Green *)
    DO_SIGNAL_BRUM     : BOOL; (* Birmingham Aspect Green *)
    DO_SIGNAL_MANCH    : BOOL; (* Manchester Aspect Green *)
    DO_SIGNAL_SCOTLAND : BOOL; (* Scotland Border Aspect Green *)
    DO_POINT_MAIN      : BOOL; (* Main Line Point Motor *)
    DO_POINT_BRANCH    : BOOL; (* Branch Line Point Motor *)
    DO_PLATFORM_BUZZER : BOOL; (* Station Platform Chime *)
    DO_SAFETY_RELAY    : BOOL; (* Overhead Catenary Power *)
    AQ_VFD_SPEED1      : REAL; (* Train 1 Speed Reference (%) *)
    AQ_VFD_SPEED2      : REAL; (* Train 2 Speed Reference (%) *)
END_VAR

VAR
    fbSpeedSupervision : FB_SpeedSupervision;
    fbBlockInterlock   : FB_TrackBlockInterlock;
    fbTimetable        : FB_TimetableManager;
    fbSafety           : FB_SafetyInterlock;
END_VAR

(* Safety Interlock Supervision *)
fbSafety(EStop := DI_ESTOP_NC, PointMisaligned := NOT DI_POINT_ALIGN_MAIN);

IF fbSafety.Trip THEN
    DO_SAFETY_RELAY := FALSE;
    AQ_VFD_SPEED1 := 0.0;
    AQ_VFD_SPEED2 := 0.0;
    RETURN;
END_IF;

DO_SAFETY_RELAY := TRUE;
END_PROGRAM
`;

export const CodeViewer: React.FC<CodeViewerProps> = ({ code = defaultCode, onChange }) => {
  const [activeTab, setActiveTab] = useState<'ld' | 'st'>('ld');
  const { inputs, outputs, trains, pointSwitchPosition } = usePlcStore();

  const isEStopActive = inputs.eStop;
  const isCatenaryOn = outputs.masterSafetyRelay;
  const train1 = trains[0];
  const train2 = trains[1];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-2xl h-full">
      {/* Header Bar with View Toggle Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-sky-400 font-bold text-sm font-mono uppercase tracking-wide">
            PLC Railway Interlocking Engine Monitor
          </span>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono text-xs">
          <button
            onClick={() => setActiveTab('ld')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all ${
              activeTab === 'ld'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Live Ladder Diagram (LD) & FBs
          </button>
          <button
            onClick={() => setActiveTab('st')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all ${
              activeTab === 'st'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📄 Structured Text (ST)
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 bg-slate-950 rounded-lg p-4 font-mono text-xs overflow-auto border border-slate-800/80 min-h-[350px]">
        {activeTab === 'ld' ? (
          <div className="flex flex-col gap-5">
            {/* Legend */}
            <div className="flex items-center gap-4 text-[11px] text-slate-400 pb-2 border-b border-slate-800/60">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-300 font-semibold">POWER ENERGIZED (TRUE)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-700" />
                <span>POWER OFF (FALSE)</span>
              </div>
            </div>

            {/* Rung 1: FB_SpeedSupervision - Train 1 VFD Speed Control */}
            <RungCard
              rungNumber={1}
              title="FB_SpeedSupervision: Train 1 VFD Traction Motor Acceleration (%QW100)"
              powerFlow={!isEStopActive && isCatenaryOn && (train1?.speedKmH > 0)}
              elements={[
                { type: 'NC', label: 'E_STOP', state: !isEStopActive },
                { type: 'NO', label: 'Catenary_25kV', state: isCatenaryOn },
                { type: 'FB', label: 'FB_SpeedSupervision', state: (train1?.speedKmH > 0) },
                { type: 'COIL', label: `VFD_Speed1 (${train1?.speedKmH.toFixed(0)} km/h)`, state: (train1?.speedKmH > 0) },
              ]}
            />

            {/* Rung 2: FB_TrackBlockInterlock - Signal Head Aspect Control */}
            <RungCard
              rungNumber={2}
              title="FB_TrackBlockInterlock: London & Birmingham Axle Counter Interlocking"
              powerFlow={outputs.signalLondonGreen}
              elements={[
                { type: 'NC', label: 'E_STOP', state: !isEStopActive },
                { type: 'NO', label: 'London_Block_Clear', state: outputs.signalLondonGreen },
                { type: 'FB', label: 'FB_TrackBlockInterlock', state: outputs.signalLondonGreen },
                { type: 'COIL', label: 'Signal_London_Green (%Q0.0)', state: outputs.signalLondonGreen },
              ]}
            />

            {/* Rung 3: Point Switch Alignment Motor */}
            <RungCard
              rungNumber={3}
              title="Motorized Point Switch Interlocking (Main Line vs Branch Line)"
              powerFlow={pointSwitchPosition === 'MAIN'}
              elements={[
                { type: 'NC', label: 'E_STOP', state: !isEStopActive },
                { type: 'NO', label: 'Point_Main_LS', state: pointSwitchPosition === 'MAIN' },
                { type: 'COIL', label: 'Point_Motor_Main (%Q0.4)', state: pointSwitchPosition === 'MAIN' },
              ]}
            />

            {/* Rung 4: FB_TimetableManager - Platform Boarding PIS Chime */}
            <RungCard
              rungNumber={4}
              title="FB_TimetableManager: Station Platform Departure Chime (%Q0.6)"
              powerFlow={!isEStopActive}
              elements={[
                { type: 'NO', label: 'Train_Boarding', state: true },
                { type: 'FB', label: 'FB_TimetableManager', state: true },
                { type: 'COIL', label: 'Platform_Buzzer (%Q0.6)', state: false },
              ]}
            />

            {/* Rung 5: Safety Interlock Catenary Relay */}
            <RungCard
              rungNumber={5}
              title="FB_SafetyInterlock: Master Overhead Catenary Power Relay (%Q0.7)"
              powerFlow={isCatenaryOn}
              elements={[
                { type: 'NC', label: 'E_STOP', state: !isEStopActive },
                { type: 'NO', label: 'Signal_Interlock_OK', state: isCatenaryOn },
                { type: 'FB', label: 'FB_SafetyInterlock', state: isCatenaryOn },
                { type: 'COIL', label: 'Catenary_Relay (%Q0.7)', state: isCatenaryOn },
              ]}
            />
          </div>
        ) : (
          /* Structured Text View */
          <div className="h-full border border-slate-800 rounded overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="pascal"
              theme="vs-dark"
              value={code}
              onChange={onChange}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

interface RungElement {
  type: 'NO' | 'NC' | 'COIL' | 'FB';
  label: string;
  state: boolean;
}

const RungCard: React.FC<{
  rungNumber: number;
  title: string;
  powerFlow: boolean;
  elements: RungElement[];
}> = ({ rungNumber, title, powerFlow, elements }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800/80 pb-1.5">
        <span>RUNG {rungNumber}: <strong className="text-slate-200">{title}</strong></span>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            powerFlow
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              : 'bg-slate-800 text-slate-500'
          }`}
        >
          {powerFlow ? 'ENERGIZED' : 'DE-ENERGIZED'}
        </span>
      </div>

      <div className="flex items-center w-full py-2 px-1 select-none overflow-x-auto">
        <div className="flex flex-col items-center shrink-0">
          <div className="w-1.5 h-12 bg-sky-500 shadow-[0_0_8px_#0284c7]" />
          <span className="text-[9px] text-sky-400 font-bold mt-0.5">24V</span>
        </div>

        <div className={`h-1 w-6 shrink-0 ${elements[0]?.state ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-slate-700'}`} />

        <div className="flex items-center gap-1 flex-1 min-w-[280px]">
          {elements.map((el, i) => {
            const isLast = i === elements.length - 1;
            return (
              <React.Fragment key={i}>
                {el.type === 'COIL' ? (
                  <div className="flex flex-col items-center mx-2 shrink-0">
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-[10px] transition-all ${
                        el.state
                          ? 'bg-emerald-950 border-emerald-400 text-emerald-300 shadow-[0_0_12px_#10b981] animate-pulse'
                          : 'bg-slate-950 border-slate-700 text-slate-500'
                      }`}
                    >
                      ( )
                    </div>
                    <span className={`text-[10px] mt-1 font-semibold ${el.state ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {el.label}
                    </span>
                  </div>
                ) : el.type === 'FB' ? (
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className={`px-3 py-1.5 rounded border text-[11px] font-bold font-mono transition-all ${
                        el.state
                          ? 'bg-sky-950/80 border-sky-400 text-sky-300 shadow-[0_0_8px_#38bdf8]'
                          : 'bg-slate-950 border-slate-700 text-slate-500'
                      }`}
                    >
                      [FB: {el.label}]
                    </div>
                    <span className="text-[9px] text-sky-400 font-semibold mt-1">
                      FUNC BLOCK
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className={`px-2.5 py-1.5 rounded border text-[11px] font-bold font-mono transition-all ${
                        el.state
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_8px_#10b981]'
                          : 'bg-slate-950 border-slate-700 text-slate-500'
                      }`}
                    >
                      {el.type === 'NO' ? `[ ${el.label} ]` : `[/ ${el.label} /]`}
                    </div>
                    <span className="text-[9px] text-slate-500 mt-1">
                      {el.type === 'NO' ? 'N.O.' : 'N.C.'}
                    </span>
                  </div>
                )}

                {!isLast && (
                  <div
                    className={`h-1 flex-1 min-w-[16px] transition-colors ${
                      el.state ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-slate-700'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className={`h-1 w-6 shrink-0 ${powerFlow ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-slate-700'}`} />

        <div className="flex flex-col items-center shrink-0">
          <div className="w-1.5 h-12 bg-slate-600" />
          <span className="text-[9px] text-slate-400 font-bold mt-0.5">GND</span>
        </div>
      </div>
    </div>
  );
};
