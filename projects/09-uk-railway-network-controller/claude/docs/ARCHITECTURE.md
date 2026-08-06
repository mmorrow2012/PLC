# Architecture — UK Intercity Railway Network & Signalling Controller

A browser-hosted soft-PLC demonstrator of a SIL4 railway interlocking. The
application is not an animation of a railway: it is a cyclic IEC 61131-3 scan
engine driving a physics model, with the SCADA mimic, the passenger information
boards and the ladder monitor all rendered from the same solved process image.

---

## 1. Target system

| Item | Value |
| --- | --- |
| Controller | Siemens S7-1500F / Schneider Modicon M580 Safety |
| Safety integrity | SIL4 railway interlocking CPU, PROFIsafe / Safety Ethernet remote I/O |
| Languages | Function Block Diagram (FBD) + Ladder Diagram (LD), with Structured Text POUs |
| Task | `MAST`, cyclic, **50 ms**, watchdog 150 ms |
| Network | 9 stations, 19 axle-counter blocks, 2 tracked intercity services |
| Field bus | Hard-wired 24 VDC for the four fringe axle counters and the E-Stop loop; remote evaluator telegrams for the remaining sections |

The two operator-tracked services are:

| Headcode | Service | Booked calling pattern |
| --- | --- | --- |
| `1S47` | Caledonian Intercity Express (Train 1) | London Euston → Coventry → Birmingham New Street → Manchester Piccadilly → Glasgow Central → Edinburgh Waverley |
| `1E23` | Western Crossrail Highland (Train 2) | Bristol Temple Meads → Birmingham New Street → Leeds City → Edinburgh Waverley |

`1S47` can be diverted at **Birmingham North Junction** onto the branch via
Liverpool Lime Street, rejoining the main line at Manchester.

---

## 2. Scan cycle

`SoftPlcEngine` (`src/plc/softPlcEngine.ts`) re-creates a real MAST scan every
50 ms. The ordering matters: the plant is integrated with **last** scan's
output image, so a coil written this scan can only influence the railway on the
next one — the same causality a physical CPU has.

```
┌─ every 50 ms ──────────────────────────────────────────────────────────┐
│ 1. Drive the point machine from last scan's %Q0.4 / %Q0.5 contactors    │
│ 2. advanceNetwork()  — integrate train movement with last scan's %QW    │
│ 3. READ INPUTS       — axle counters, tachos, ATP telegram → %I / %IW   │
│ 4. Apply HMI forces to the INPUT image (forces are seen by the logic)   │
│ 5. runRailwayLogic() — the port of railwayLogic.st                      │
│      FB_SafetyInterlock → FB_TrackBlockInterlock →                      │
│      FB_SpeedSupervision → FB_TimetableManager → FB_PointMachine        │
│ 6. Apply HMI forces to the OUTPUT image                                 │
│ 7. WRITE OUTPUTS     — publish %Q / %QW / %M / %MW to the Zustand store │
│ 8. Release momentary pushbuttons (one full scan of pulse width)         │
└────────────────────────────────────────────────────────────────────────┘
```

Simulated time is compressed **120:1** (`TIME_COMPRESSION`): one real second
advances the network clock by two simulated minutes, so the ~736 km
London–Edinburgh diagram completes in a little over two minutes of demo time
while the CPU still scans at a genuine 20 Hz.

---

## 3. Module map

```
src/
├── plc/
│   ├── types.ts              I/O image types, network topology, constants,
│   │                         station/block/service tables, %-address map
│   ├── networkSimulation.ts  Plant model — train dynamics, dwells, block
│   │                         occupancy, turnarounds. Never called by the logic.
│   ├── railwayLogic.ts       Pure port of railwayLogic.st. One call = one scan.
│   ├── railwayLogic.st       The IEC 61131-3 source of record (#REGION tagged)
│   ├── timetable.ts          Booked-plan generator, delay grading, PIS rows,
│   │                         %MW10–%MW50 register packing
│   ├── ladderProgram.ts      Declarative LD/FBD networks + rung evaluator
│   ├── tagMap.ts             Process image → flat tag dictionary for the monitor
│   └── softPlcEngine.ts      Cyclic scan engine + point-machine model
├── store/usePlcStore.ts      Single Zustand process-image store + HMI commands
└── components/
    ├── ControlPanel.tsx      Signalling desk: run/E-Stop/reset, speed faceplates,
    │                         point request, station stop override, I/O forces
    ├── Visualizer.tsx        SVG UK mimic + train telemetry + 4-step demo card
    ├── TimetableBoard.tsx    Split-flap PIS board + %MW register dump
    ├── LadderDiagram.tsx     Live 24 V power-flow LD/FBD monitor
    └── CodeViewer.tsx        Ladder ⇄ Structured Text tabs, live region highlight
```

### Separation of concerns

The single most important boundary is between `railwayLogic.ts` and
`networkSimulation.ts`. The logic module is **pure**: it receives the process
image plus a read-only view of the plant and returns a new output image. It has
no timers of its own beyond the accumulators it carries in `%M`/`%MD`, no access
to React, and no ability to move a train. Everything the trains do is a
consequence of `%QW100`, `%QW102` and `%Q0.7`.

That purity is what lets three very different views agree with each other: the
mimic, the ladder monitor and the ST highlight are all reading the same solved
state rather than three parallel approximations of it.

---

## 4. State ownership

| Data | Owner | Notes |
| --- | --- | --- |
| `%I`, `%IW` input image | engine (step 3) | Derived from the plant + latched pushbuttons |
| `%Q`, `%QW` output image | `runRailwayLogic` | The only writer |
| `%M`, `%MW` internal image | `runRailwayLogic` | Retentive latches live here |
| Train positions, dwells, occupancy | `advanceNetwork` | Plant, not PLC |
| Operator setpoints & requests | store `commands` | HMI faceplate values, not addresses |
| I/O forces | store `forces` | Applied to both images each scan |

Momentary pushbuttons (`%I0.1`, `%I0.2`) are set TRUE by the HMI and cleared by
`consumePulses()` after the scan that observed them, giving exactly one scan of
pulse width — the same contract a real edge-triggered rung expects.

---

## 5. Rendering strategy

The store updates 20 times a second, which is right for the mimic (trains have
to move smoothly) and wrong for everything else. Two components therefore
sample the store on their own timers instead of subscribing to it:

* `LadderDiagram` — 100 ms, because a rung carries a few hundred SVG nodes and
  no operator reads a 20 Hz ladder animation anyway.
* `TimetableBoard` — 250 ms, matching how often a real PIS controller refreshes.

The split-flap board keys each character cell by its own value, so React only
remounts — and therefore only re-runs the flap keyframes on — the characters
that actually changed. A row whose platform number is unchanged does not flap.

---

## 6. Failure modes modelled

| Failure | Mechanism | Result |
| --- | --- | --- |
| Emergency signal trip | `%I0.0` NC loop opens (or a broken wire) | `M_SafetyTrip` latches, `%Q0.7` drops, emergency brake, `%MW0 = 99` |
| Point detection failure | `%I0.7` FALSE for > 4 s | Same trip path, `M_PointDetectFault` set |
| Block occupied ahead | Axle counter TRUE (real or forced) | Protecting signal to danger, trailing service braked on the ATP curve, held at the block joint |
| Route pulled under a train | Reverse request while the junction block holds counts | Request refused by the route lock until the block clears |
| Diversion via the branch | Points reversed before `1S47` leaves Birmingham | Extra mileage + unbooked call → the PIS boards flip to `DELAYED` |

---

## 7. Build

```bash
npm install
npm run dev      # Vite dev server
npm run build    # tsc --noEmit strict pass, then a production bundle
```

TypeScript runs in `strict` mode with `noUnusedLocals` and
`noUnusedParameters`. Tailwind CSS v3 is wired through PostCSS using the
standard `@tailwind base/components/utilities` directives.
