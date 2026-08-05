# Architecture — Three-Tank Liquid Level Control

## Overview

This project is a browser-based soft-PLC simulator for a three-tank cascade
level control process: Tank A auto-fills, transfers into Tank B, and Tank B
gravity-drains through a proportional valve into Tank C. It targets a
Schneider Electric Modicon M580 running EcoStruxure Control Expert, and pairs
a literal IEC 61131-3 Structured Text program (`src/plc/threeTankLogic.st`)
with a TypeScript re-implementation of the same logic (`src/plc/softPlcEngine.ts`)
that drives a live React/SVG HMI.

```
┌─────────────────────────────────────────────────────────────┐
│                          Browser (React)                      │
│                                                                 │
│  ControlPanel.tsx  ──dispatch──▶  usePlcStore (Zustand)        │
│  (E-Stop, Start/Stop,                 ▲     │                  │
│   LSH toggles, level                  │     │ read              │
│   nudges/forces, reset)               │     ▼                  │
│                                   SoftPlcEngine                │
│                                   (window.setInterval, 50 ms)  │
│                                        │                        │
│                          ┌─────────────┴─────────────┐         │
│                          │  evaluateScan()            │         │
│                          │  (control logic — mirrors  │         │
│                          │   threeTankLogic.st)       │         │
│                          └─────────────┬─────────────┘         │
│                                        │                        │
│                          ┌─────────────┴─────────────┐         │
│                          │  simulatePlant()            │        │
│                          │  (linear tank model, no     │        │
│                          │   physical process exists)  │        │
│                          └─────────────┬─────────────┘         │
│                                        │ applyScan()            │
│                                        ▼                        │
│  Visualizer.tsx  ◀──subscribe──  usePlcStore (Zustand)          │
│  CodeViewer.tsx  ◀──subscribe──                                 │
└─────────────────────────────────────────────────────────────┘
```

## Scan Loop Timing

`SoftPlcEngine` (`src/plc/softPlcEngine.ts`) models a Modicon M580 MAST task
running at a fixed cyclic period:

- **Cycle time:** 50 ms (`SoftPlcEngine` constructor default, matches
  `usePlcStore.cycleTimeMs`), driven by `window.setInterval`.
- **The scan loop itself never stops.** Exactly like a real MAST task, the
  engine starts once when the app mounts (`App.tsx` `useEffect`) and runs
  continuously for the lifetime of the page. `Start_PB` / `Stop_PB` only
  affect the *sequencer state* (`IDLE` vs. actively running) — they do not
  start or stop the scan itself. `systemRunning` in the store is derived as
  `state !== 'IDLE'`, not a switch that gates the interval.
- **Per-scan sequence**, mirroring a real PLC scan (read inputs → execute
  logic → write outputs), executed inside each `setInterval` tick:
  1. Consume any pending `Start_PB` / `Stop_PB` one-shot pulses (momentary
     pushbuttons, cleared after being read once — see `startPbPulse` /
     `stopPbPulse` in the store).
  2. `evaluateScan()` — pure control-logic function: overflow latch →
     E-Stop interlock → sequencer → output mapping → tower-light bitmask.
     This function has no side effects and is a 1:1 port of
     `threeTankLogic.st`, so the two can be diffed against each other.
  3. `simulatePlant()` — integrates a simple linear tank model
     (see below) using the outputs just computed, advancing
     `LT_TankA` / `LT_TankB` / `LT_TankC` by `dt = cycleTimeMs / 1000`
     seconds of simulated flow.
  4. `store.applyScan(...)` commits the new state, outputs, and levels in a
     single Zustand update, which re-renders `Visualizer` and `ControlPanel`.
- **UI smoothing:** level bars use a CSS `transition` (180 ms) on the SVG
  fill rectangle rather than redrawing discretely every 50 ms tick, so the
  20 Hz scan rate reads as a smooth rise/fall on screen.

## Plant Simulation (not part of the PLC logic)

There is no physical process behind this demo, so `softPlcEngine.ts`
includes a small, clearly-separated `simulatePlant()` function that treats
the three analog levels as state variables integrated from the pump/valve
outputs each scan (equal-capacity tanks assumed for simplicity):

| Flow | Rate | Condition |
|---|---|---|
| Tank A fill | 8.0 %/s | `Pump_Fill_A = TRUE` |
| A → B transfer | 6.0 %/s | `Pump_Transfer_AB = TRUE` |
| B → C gravity drain | up to 5.0 %/s | scaled by `Valve_Drain_BC_Pos / 100` |
| Tank C downstream draw | 1.5 %/s constant | always (keeps the demo cycling instead of Tank C growing unbounded) |

Any analog level tag with its **Force** checkbox enabled in the Control
Panel is excluded from this integration and holds its operator-set value
(mirrors Control Expert I/O forcing) — this is how the HMI's "manually
nudge analog level inputs for testing" requirement is satisfied without the
simulation immediately overwriting a forced test value.

## State Diagram

```
                    ┌────────────────────────────────────────────┐
                    │                                              │
                    ▼                                              │
              ┌───────────┐   LT_TankA >= SP_LevelA_High     ┌─────────────────┐
   Start_PB   │           │ ─────────────────────────────▶  │                  │
  ──────────▶ │   IDLE    │                                  │   FILLING_A      │
              │(Standby)  │ ◀───────────── Stop_PB ─────────  │ Pump_Fill_A=TRUE │
              └───────────┘                                  └────────┬─────────┘
                    ▲                                                  │
                    │                                    LT_TankA >= SP_LevelA_High
      LT_TankB <= TANK_B_DRAINED_THRESHOLD                             │
                    │                                                  ▼
              ┌───────────┐                                  ┌──────────────────────┐
              │           │  ◀──────────── Stop_PB ───────── │  TRANSFERRING_AB       │
              │DRAINING_BC│                                  │  Pump_Transfer_AB=TRUE │
              │Valve=100% │ ◀──────────────────────────────  │  Valve = P-control on  │
              └───────────┘   LT_TankB >= SP_LevelB_High     │  LT_TankB vs. Target    │
                                                               └───────────────────────┘
```

Overlaid on every state, evaluated first each scan and taking priority over
the sequencer above:

- **Overflow protection** — `LT_TankA >= 100.0 OR LT_TankB >= 100.0 OR
  LSH_TankA OR LSH_TankB` latches `Alarm_Overflow`, forces both pumps off,
  and drives the BC valve fully **open** (protective relief of Tank B
  toward Tank C — see `PLC_LOGIC.md` for why this deviates from a literal
  "force everything off" reading). Reset requires the field condition to
  clear **and** a `Start_PB` press, which returns the sequencer to `IDLE`
  (a further `Start_PB` press is needed to resume filling).
- **Safety interlock** — `E_Stop = FALSE` forces the sequencer to `IDLE`,
  both pumps off, and the BC valve fully **closed**, every scan, for as
  long as the E-Stop circuit is broken. Restoring `E_Stop` does not
  auto-resume; the next `Start_PB` press re-arms the sequencer from `IDLE`.

## Component Responsibilities

| File | Responsibility |
|---|---|
| `src/store/usePlcStore.ts` | Zustand memory image: inputs, outputs, setpoints, force table, one-shot pushbutton pulses, and the `applyScan` reducer the engine writes through. |
| `src/plc/threeTankLogic.st` | Production-ready IEC 61131-3 ST source, the canonical logic definition. |
| `src/plc/softPlcEngine.ts` | `evaluateScan()` (ST port) + `simulatePlant()` (demo-only physics) + `SoftPlcEngine` (the 50 ms interval driver). |
| `src/components/ControlPanel.tsx` | HMI operator controls: E-Stop, Start/Stop, LSH float-switch simulation, level nudge/force, alarm reset. |
| `src/components/Visualizer.tsx` | Animated SVG cascade view, pump/valve indicators, tower light, alarm overlay. |
| `src/components/CodeViewer.tsx` | Read-only Monaco view of `threeTankLogic.st` with a live decoration highlighting the line corresponding to the current scan's outcome. |
