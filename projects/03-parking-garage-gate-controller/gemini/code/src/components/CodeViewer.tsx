import React, { useState } from 'react';
import { usePlcStore } from '../store/usePlcStore';

export const CodeViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ld' | 'st'>('ld');
  const { inputs, outputs } = usePlcStore();

  // Evaluate rung power flow states
  const rung1Power = inputs.entryLoop && inputs.ticketTaken;
  const rung2Power = !inputs.entryLoop && !inputs.entryGateCloseLS && !inputs.safetyPhotocell;
  const rung3Power = inputs.entryLoop && inputs.ticketButton && !inputs.ticketTaken;
  const rung4Power = inputs.exitLoop && !inputs.safetyPhotocell;
  const rung5Power = !inputs.exitLoop && !inputs.exitGateCloseLS && !inputs.safetyPhotocell;
  const rung6Power = inputs.entryGateOpenLS;
  const rung7Power = inputs.exitGateOpenLS;
  const rung8Power = inputs.safetyPhotocell;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-full flex flex-col gap-4 shadow-2xl">
      {/* Header Bar with View Toggle Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold text-sm font-mono uppercase tracking-wide">
            PLC Logic Engine Monitor
          </span>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono text-xs">
          <button
            onClick={() => setActiveTab('ld')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all ${
              activeTab === 'ld'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Live Ladder Diagram (LD)
          </button>
          <button
            onClick={() => setActiveTab('st')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all ${
              activeTab === 'st'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
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

            {/* RUNG 1: ENTRY MOTOR OPEN */}
            <RungCard
              rungNumber={1}
              title="Entry Gate Motor Open"
              powerFlow={rung1Power}
              elements={[
                { type: 'NO', label: 'I_EntryLoop', state: inputs.entryLoop },
                { type: 'NO', label: 'I_TicketTaken', state: inputs.ticketTaken },
                { type: 'COIL', label: 'Q_EntryMotorOpen', state: outputs.entryGateMotorOpen },
              ]}
            />

            {/* RUNG 2: ENTRY MOTOR CLOSE */}
            <RungCard
              rungNumber={2}
              title="Entry Gate Motor Close"
              powerFlow={rung2Power}
              elements={[
                { type: 'NC', label: 'I_EntryLoop', state: !inputs.entryLoop },
                { type: 'NC', label: 'I_EntryGateCloseLS', state: !inputs.entryGateCloseLS },
                { type: 'NC', label: 'I_SafetyPhotocell', state: !inputs.safetyPhotocell },
                { type: 'COIL', label: 'Q_EntryMotorClose', state: outputs.entryGateMotorClose },
              ]}
            />

            {/* RUNG 3: TICKET DISPENSER */}
            <RungCard
              rungNumber={3}
              title="Ticket Dispenser Kiosk"
              powerFlow={rung3Power}
              elements={[
                { type: 'NO', label: 'I_EntryLoop', state: inputs.entryLoop },
                { type: 'NO', label: 'I_TicketButton', state: inputs.ticketButton },
                { type: 'NC', label: 'I_TicketTaken', state: !inputs.ticketTaken },
                { type: 'COIL', label: 'Q_DispenseTicket', state: outputs.dispenseTicket },
              ]}
            />

            {/* RUNG 4: EXIT MOTOR OPEN */}
            <RungCard
              rungNumber={4}
              title="Exit Gate Motor Open"
              powerFlow={rung4Power}
              elements={[
                { type: 'NO', label: 'I_ExitLoop', state: inputs.exitLoop },
                { type: 'NC', label: 'I_SafetyPhotocell', state: !inputs.safetyPhotocell },
                { type: 'COIL', label: 'Q_ExitMotorOpen', state: outputs.exitGateMotorOpen },
              ]}
            />

            {/* RUNG 5: EXIT MOTOR CLOSE */}
            <RungCard
              rungNumber={5}
              title="Exit Gate Motor Close"
              powerFlow={rung5Power}
              elements={[
                { type: 'NC', label: 'I_ExitLoop', state: !inputs.exitLoop },
                { type: 'NC', label: 'I_ExitGateCloseLS', state: !inputs.exitGateCloseLS },
                { type: 'NC', label: 'I_SafetyPhotocell', state: !inputs.safetyPhotocell },
                { type: 'COIL', label: 'Q_ExitMotorClose', state: outputs.exitGateMotorClose },
              ]}
            />

            {/* RUNG 6: ENTRY TRAFFIC SIGNAL */}
            <RungCard
              rungNumber={6}
              title="Entry Traffic Light (Green)"
              powerFlow={rung6Power}
              elements={[
                { type: 'NO', label: 'I_EntryGateOpenLS', state: inputs.entryGateOpenLS },
                { type: 'COIL', label: 'Q_EntryGreenLight', state: outputs.entryGreenLight },
              ]}
            />

            {/* RUNG 7: EXIT TRAFFIC SIGNAL */}
            <RungCard
              rungNumber={7}
              title="Exit Traffic Light (Green)"
              powerFlow={rung7Power}
              elements={[
                { type: 'NO', label: 'I_ExitGateOpenLS', state: inputs.exitGateOpenLS },
                { type: 'COIL', label: 'Q_ExitGreenLight', state: outputs.exitGreenLight },
              ]}
            />

            {/* RUNG 8: SAFETY ALARM */}
            <RungCard
              rungNumber={8}
              title="Safety Barrier Obstacle Alarm"
              powerFlow={rung8Power}
              elements={[
                { type: 'NO', label: 'I_SafetyPhotocell', state: inputs.safetyPhotocell },
                { type: 'COIL', label: 'Q_Alarm', state: outputs.alarm },
              ]}
            />
          </div>
        ) : (
          /* Structured Text View */
          <div className="space-y-2 text-slate-300">
            <div className="text-slate-500">// IEC 61131-3 Structured Text - Parking Gate Controller</div>
            <div className="text-emerald-400 font-bold">PROGRAM ParkingGateController</div>
            <div className="pl-4 text-cyan-300">VAR_INPUT</div>
            <div className="pl-8 text-slate-400">
              I_EntryLoop : BOOL; (* Vehicle detected on entry loop *)<br />
              I_TicketButton : BOOL; (* Kiosk pushbutton *)<br />
              I_TicketTaken : BOOL; (* Ticket removed by driver *)<br />
              I_EntryGateOpenLS : BOOL; (* Entry limit open *)<br />
              I_EntryGateCloseLS : BOOL; (* Entry limit close *)<br />
              I_ExitLoop : BOOL; (* Vehicle detected on exit loop *)<br />
              I_ExitGateOpenLS : BOOL; (* Exit limit open *)<br />
              I_ExitGateCloseLS : BOOL; (* Exit limit close *)<br />
              I_SafetyPhotocell : BOOL; (* Anti-crush beam *)
            </div>
            <div className="pl-4 text-cyan-300">END_VAR</div>

            <div className="pl-4 text-cyan-300 mt-3">VAR_OUTPUT</div>
            <div className="pl-8 text-slate-400">
              Q_EntryMotorOpen : BOOL;<br />
              Q_EntryMotorClose : BOOL;<br />
              Q_ExitMotorOpen : BOOL;<br />
              Q_ExitMotorClose : BOOL;<br />
              Q_DispenseTicket : BOOL;<br />
              Q_EntryGreenLight : BOOL;<br />
              Q_ExitGreenLight : BOOL;<br />
              Q_Alarm : BOOL;
            </div>
            <div className="pl-4 text-cyan-300">END_VAR</div>

            <div className="pl-4 text-emerald-400 font-bold mt-4">(* Execution Logic *)</div>
            <div className="pl-4 text-slate-300">
              Q_EntryMotorOpen := I_EntryLoop AND I_TicketTaken AND NOT I_EntryGateOpenLS;<br />
              Q_EntryMotorClose := NOT I_EntryLoop AND NOT I_EntryGateCloseLS AND NOT I_SafetyPhotocell;<br />
              Q_ExitMotorOpen := I_ExitLoop AND NOT I_ExitGateOpenLS;<br />
              Q_ExitMotorClose := NOT I_ExitLoop AND NOT I_ExitGateCloseLS AND NOT I_SafetyPhotocell;<br />
              Q_DispenseTicket := I_EntryLoop AND I_TicketButton AND NOT I_TicketTaken;<br />
              Q_EntryGreenLight := I_EntryGateOpenLS;<br />
              Q_ExitGreenLight := I_ExitGateOpenLS;<br />
              Q_Alarm := I_SafetyPhotocell AND (Q_EntryMotorClose OR Q_ExitMotorClose);
            </div>
            <div className="text-emerald-400 font-bold mt-2">END_PROGRAM</div>
          </div>
        )}
      </div>
    </div>
  );
};

interface RungElement {
  type: 'NO' | 'NC' | 'COIL';
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

      {/* Ladder Rung Graphic Wire Diagram */}
      <div className="flex items-center w-full py-2 px-1 select-none overflow-x-auto">
        {/* Left 24V Power Rail (L1) */}
        <div className="flex flex-col items-center shrink-0">
          <div className="w-1.5 h-12 bg-cyan-500 shadow-[0_0_8px_#06b6d4]" />
          <span className="text-[9px] text-cyan-400 font-bold mt-0.5">24V</span>
        </div>

        {/* Lead Wire from L1 Rail */}
        <div className={`h-1 w-6 shrink-0 ${elements[0]?.state ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-slate-700'}`} />

        {/* Contacts and Coils */}
        <div className="flex items-center gap-1 flex-1 min-w-[280px]">
          {elements.map((el, i) => {
            const isLast = i === elements.length - 1;
            return (
              <React.Fragment key={i}>
                {el.type === 'COIL' ? (
                  /* Output Coil Component -( )- */
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
                    <span
                      className={`text-[10px] mt-1 font-semibold ${
                        el.state ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {el.label}
                    </span>
                  </div>
                ) : (
                  /* Contact Component -| |- or -|/|- */
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

                {/* Connecting Wire between contacts */}
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

        {/* Trail Wire to GND Rail */}
        <div className={`h-1 w-6 shrink-0 ${powerFlow ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-slate-700'}`} />

        {/* Right Neutral GND Rail (N) */}
        <div className="flex flex-col items-center shrink-0">
          <div className="w-1.5 h-12 bg-slate-600" />
          <span className="text-[9px] text-slate-400 font-bold mt-0.5">GND</span>
        </div>
      </div>
    </div>
  );
};
