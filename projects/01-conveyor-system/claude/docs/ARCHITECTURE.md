# Architecture — Automated Conveyor Belt System

This document describes how the browser-based demonstrator reproduces a
Schneider Electric Modicon M580 soft-PLC scan cycle, and how the React UI
layers observe and drive that simulated PLC.

## 1. System Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│ UI Layer (React)                                                    │
│   ControlPanel.tsx   Visualizer.tsx   CodeViewer.tsx                │
│        │                   │                │                      │
│        └───────────────────┴────────────────┘                      │
│                        usePlcStore (Zustand)                        │
│              I/O memory image · forces · scan metrics               │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ getState() / applyScan()
┌───────────────────────────────┴───────────────────────────────────┐
│ Soft-PLC Layer                                                      │
│   softPlcEngine.ts   →  window.setInterval(tick, 50ms)              │
│        │                                                            │
│        ├─ beltSimulation.ts   (physical process model)              │
│        └─ plcLogic.ts         (TypeScript mirror of conveyorLogic.st)│
└─────────────────────────────────────────────────────────────────────┘
```

`conveyorLogic.st` (`src/plc/conveyorLogic.st`) is the reference control
program that would be downloaded to the M580 CPU via EcoStruxure Control
Expert. `src/plc/plcLogic.ts` is a line-for-line TypeScript port of that
same rung logic, executed in the browser so the demonstrator behaves
identically to the target hardware without requiring a physical PLC.

## 2. Scan Loop Timing

`SoftPlcEngine` (`src/plc/softPlcEngine.ts`) drives a fixed-period cyclic
task via `window.setInterval`, defaulting to **50 ms**, matching a typical
MAST task period for a discrete sorting/interlock application on an M580.
Each tick performs the four classic IEC 61131-3 scan phases:

| Phase | What happens |
|---|---|
| **1. Read Inputs** | `beltSimulation.advanceParts()` moves every part along the belt using the *previous* scan's `VFD_Speed_Ref` output (real scan-cycle causality: this scan's inputs are the result of last scan's outputs acting on the process). `findSensorCrossing()` determines whether a part is under the photoeye/color/weight station this tick, producing `Sensor_PartDetect` / `Sensor_Color` / `Sensor_Weight`. Momentary HMI command pulses (`Cmd_Start`, `Cmd_Stop`, `Cmd_ManualReset`) are latched in from the store and immediately cleared (`consumeCommandPulses()`), mirroring a momentary pushbutton contact that is only true for the scan it was pressed. |
| **2. Execute Logic** | `plcLogic.runConveyorLogic()` evaluates the safety interlock, speed ramp, sorting decision, and alarm annunciation — identical rule order to `conveyorLogic.st`. |
| **3. Write Outputs** | Discharged parts are tallied (accepted / rejected / special) and the entire input image, output image, internal state, part list, and scan metrics are committed to the Zustand store in a single `applyScan()` call, with any active forces applied last (highest priority, matching a Control Expert animation-table force). |
| **4. Idle** | The engine waits for the next `setInterval` tick. Actual wall-clock cycle time is measured with `performance.now()` and surfaced in the HMI as a scan-time diagnostic, separate from the fixed 50 ms step used for deterministic physics/logic math. |

The scan engine starts automatically when `ControlPanel` mounts and stops
on unmount, so the whole simulation is only "live" while the app is open —
there is no persistence between page loads by design (a fresh PLC memory
image on cold-start).

## 3. State Diagram — Safety / Run State

```
        ┌────────────────────────────────────────────────────────────┐
        │                                                              │
        ▼                                                              │
  ┌───────────┐   E_Stop = FALSE    ┌───────────────┐   Cmd_ManualReset │
  │  READY    │ ───────────────────▶│  FAULT         │   (rising edge)  │
  │ (SystemReady│                    │ (EStopFaultLatched=TRUE)         │
  │  = TRUE)  │◀────────────────────│                │───────────────────┘
  └─────┬─────┘   AND E_Stop=TRUE   └───────┬────────┘
        │ Cmd_Start                          │ E_Stop = FALSE (any time)
        ▼                                    │ forces VFD_Run := FALSE
  ┌───────────┐   Cmd_Stop OR                │  in the SAME scan
  │  RUNNING  │──── NOT SystemReady ─────────┘
  │ (VFD_Run) │
  └───────────┘
```

* **FAULT** is entered the instant `E_Stop` reads `FALSE` — `VFD_Run` is
  forced `FALSE` unconditionally, in the same scan, before any Start/Stop
  seal-in logic runs (see rung block 1 in `conveyorLogic.st`).
* **FAULT → READY** requires the safety circuit to already be healthy
  (`E_Stop = TRUE`) **and** a rising edge on `Cmd_ManualReset` — resetting
  "through" an active trip is explicitly rejected.
* **READY → RUNNING** requires an explicit `Cmd_Start` while
  `SystemReady = TRUE`.
* **RUNNING → READY** on `Cmd_Stop` or loss of `SystemReady` (which
  includes a fresh E-Stop trip).

`VFD_Speed_Ref` ramps linearly from 0% to `Speed_Setpoint` over 2 seconds
after `VFD_Run` becomes `TRUE` (soft-start), and drops to 0% immediately
when `VFD_Run` goes `FALSE` (no coast-down modeled, matching a VFD
configured for fast-stop on interlock loss).

## 4. Part Sorting / Diverter Timing

* The photoeye/color/weight sensor station is modeled at belt position
  60% of travel (`BELT_SENSOR_POSITION`).
* On the scan a part crosses that position, `Sensor_Color` /
  `Sensor_Weight` are evaluated once (rising-edge latched, exactly like
  the `R_TRIG` in `conveyorLogic.st`) against the reject thresholds.
* `Actuator_Diverter` energizes for a fixed 750 ms dwell
  (`DIVERTER_DWELL_TIME`) per rejected part — this models solenoid
  energization time, not belt transit time. The demonstrator intentionally
  decouples the diverter arm's visual swing (driven directly by the
  `Actuator_Diverter` output tag) from the simulated part's lateral exit
  path (driven by the part's `rejected` flag once it passes belt position
  78%), since perfectly synchronizing solenoid dwell time against belt
  transit time across the full 0–100% speed range is not meaningful for a
  visualization. See `docs/journal.md` for the full trade-off rationale.

## 5. Data Flow Summary

* **`usePlcStore`** is the single source of truth — the real-time I/O
  memory image (`inputs`, `outputs`), operator command pulses
  (`commands`), internal control state (`internal`), the simulated part
  list (`parts`), production counters, scan metrics, and the forced I/O
  override table (`forces`).
* **UI components never compute control logic.** `ControlPanel` only
  dispatches operator intents (`setEStop`, `pulseStart`, `spawnPart`, …).
  `Visualizer` and `CodeViewer` are purely reactive to store state.
* **`softPlcEngine.ts`** is the only writer of `outputs`, `internal`,
  `parts`, and `metrics` — enforced by routing all writes through the
  single `applyScan()` action.
