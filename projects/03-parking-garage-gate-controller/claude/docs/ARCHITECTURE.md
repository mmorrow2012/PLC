# Architecture — Parking Garage Gate Controller

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
│        ├─ gateSimulation.ts   (physical gate-arm process model)     │
│        └─ gateLogic.ts        (TypeScript mirror of                 │
│                                 parkingGateLogic.st)                 │
└─────────────────────────────────────────────────────────────────────┘
```

`parkingGateLogic.st` (`src/plc/parkingGateLogic.st`) is the reference
control program that would be downloaded to the M580 CPU via EcoStruxure
Control Expert. `src/plc/gateLogic.ts` is a line-for-line TypeScript port
of that same rung logic (section numbers in the two files match), executed
in the browser so the demonstrator behaves identically to the target
hardware without requiring physical gate hardware.

## 2. Scan Loop Timing

`SoftPlcEngine` (`src/plc/softPlcEngine.ts`) drives a fixed-period cyclic
task via `window.setInterval`, defaulting to **50 ms**, matching a typical
MAST task period for a discrete access-control/interlock application on an
M580. Each tick performs the four classic IEC 61131-3 scan phases:

| Phase | What happens |
|---|---|
| **1. Read Inputs** | `gateSimulation.advanceGateAngle()` moves the simulated gate arm using the *previous* scan's `Motor_GateUp`/`Motor_GateDown` outputs (real scan-cycle causality: this scan's inputs are the result of last scan's outputs acting on the process). `Sensor_GateOpenLimit`/`Sensor_GateClosedLimit` are derived from the resulting arm angle. `E_Stop`, `Sensor_VehiclePresence`, and `Sensor_Obstruction` are read as-is from the HMI-driven store state. `PB_ManualOpen`/`PB_ManualClose` are read as held-contact levels (see §4). |
| **2. Execute Logic** | `gateLogic.runParkingGateLogic()` evaluates the safety interlock, the gate sequencer, obstruction safety, the stuck-gate watchdog, and the manual-jog recovery path — identical rule order to `parkingGateLogic.st`. |
| **3. Write Outputs** | The entire input image, output image, internal state, simulated gate angle, and scan metrics are committed to the Zustand store in a single `applyScan()` call, with any active forces applied last (highest priority, matching a Control Expert animation-table force). |
| **4. Idle** | The engine waits for the next `setInterval` tick. Actual wall-clock cycle time is measured with `performance.now()` and surfaced in the HMI as a scan-time diagnostic, separate from the fixed 50 ms step used for deterministic physics/logic math. |

The scan engine starts automatically when `ControlPanel` mounts and stops
on unmount, so the whole simulation is only "live" while the app is open —
there is no persistence between page loads by design (a fresh PLC memory
image on cold-start).

## 3. State Diagram — Gate Sequencer

```
                 Sensor_VehiclePresence
                 OR PB_ManualOpen (edge)
        ┌───────────────────────────────────┐
        │                                    ▼
   ┌─────────┐                        ┌────────────┐   Sensor_GateOpenLimit   ┌──────┐
   │  IDLE   │                        │  OPENING   │ ────────────────────────▶│ OPEN │
   └────┬────┘                        └─────┬──────┘                         └──┬───┘
        ▲                                    ▲                                   │
        │                                     \  Sensor_Obstruction               │ AutoClose timer elapsed
        │ (no guard)                           \  (reverses CLOSING → OPENING)     │ OR PB_ManualClose (edge)
   ┌────┴────┐    Sensor_GateClosedLimit   ┌─────┴──────┐                          │
   │ CLOSED  │◀────────────────────────────│  CLOSING   │◀─────────────────────────┘
   └─────────┘                             └────────────┘
```

* **IDLE → OPENING**: `Sensor_VehiclePresence = TRUE` or a rising edge on
  `PB_ManualOpen`. `Motor_GateUp := TRUE`, `Light_Red := TRUE`,
  `Buzzer := TRUE`.
* **OPENING → OPEN**: `Sensor_GateOpenLimit = TRUE`. `Motor_GateUp` and
  `Buzzer` drop, `Light_Green := TRUE`.
* **OPEN → CLOSING**: the `Tmr_AutoClose` `TON` (`T_AutoCloseDelay`, 5 s)
  elapses while `Sensor_VehiclePresence = FALSE`, or a rising edge on
  `PB_ManualClose`. `Motor_GateDown := TRUE`, `Light_Red := TRUE`,
  `Buzzer := TRUE`.
* **CLOSING → OPENING (obstruction)**: `Sensor_Obstruction = TRUE` stops
  `Motor_GateDown` and drives `Motor_GateUp` in the same scan.
* **CLOSING → CLOSED → IDLE**: `Sensor_GateClosedLimit = TRUE`. `CLOSED` is
  a one-scan transient state (motors off, `Light_Red` held) that falls
  through to `IDLE` unconditionally on the very next scan, matching the
  unconditional `CLOSED → IDLE` arrow in the prompt's state machine.

Two independent `TON` watchdog timers (`Tmr_WatchdogOpen`,
`Tmr_WatchdogClose`), each gated on `GateState = OPENING` /
`GateState = CLOSING` respectively, guard the travel time. If the relevant
limit switch isn't reached before `T_WatchdogTimeout` (8 s) elapses, both
motors are forced off and `Alarm_StuckGate` latches — see §5.

## 4. Safety Interlock & Stuck-Gate Recovery

* **E-Stop** (`E_Stop = FALSE`, safety-high logic) unconditionally forces
  both motor outputs off in the same scan and latches
  `EStopFaultLatched`. Clearing it requires a rising edge on *either*
  manual pushbutton while `E_Stop` is currently healthy — resetting
  "through" an active trip is rejected. This mirrors the equivalent rule
  in the sibling `01-conveyor-system` project's `Cmd_ManualReset` /
  `EStopFaultLatched` pattern.
* **Stuck-gate watchdog**: once `Alarm_StuckGate` latches, both motors are
  held off and the sequencer state is frozen. Recovery requires the
  operator to *hold* `PB_ManualOpen` (or `PB_ManualClose`) — a jog
  command drives the corresponding motor directly until the matching
  limit switch is reached, at which point the alarm clears and the
  sequencer resumes from `OPEN` or `IDLE` respectively.
* `PB_ManualOpen`/`PB_ManualClose` are modeled in `usePlcStore` as a held
  contact (`true` while pressed), not a single-scan pulse, because the
  stuck-gate jog needs the contact to remain closed across many scans.
  `ControlPanel.tsx` asserts the contact on `mousedown`/`touchstart` and
  releases it after a minimum ~80 ms hold on `mouseup`/`touchend`
  (`MIN_PB_HOLD_MS`), so a fast UI click still guarantees at least one
  50 ms scan observes the contact closed — the same reason a real pushbutton's
  contact bounce/dwell normally outlasts a single PLC scan.

## 5. Gate-Arm Physical Simulation

* `gateSimulation.ts` models the arm as an angle from `0°` (closed) to
  `90°` (open), advancing at a constant rate that completes a full
  0→90° travel in **3 seconds** (`GATE_TRAVEL_MS_NOMINAL`) under a healthy
  motor command — comfortably inside the 8 s watchdog window.
  `Sensor_GateOpenLimit`/`Sensor_GateClosedLimit` are derived directly
  from that angle each scan; this is plant simulation, not control logic.
* A separate, simulation-only `gateJammed` flag (toggled from
  `ControlPanel`'s "Mechanical Jam" control) freezes the arm angle
  regardless of motor command, letting an operator demonstrate the
  watchdog timeout and stuck-gate recovery path without waiting on a
  hardware failure. It is not a PLC I/O tag — see `docs/journal.md` for
  the full trade-off rationale.

## 6. Data Flow Summary

* **`usePlcStore`** is the single source of truth — the real-time I/O
  memory image (`inputs`, `outputs`), operator pushbutton contacts
  (`commands`), internal control state (`internal`), the simulated gate
  angle (`gateAngle`), the jam flag (`gateJammed`), scan metrics, and the
  forced I/O override table (`forces`).
* **UI components never compute control logic.** `ControlPanel` only
  dispatches operator intents (`setEStop`, `setVehiclePresence`,
  `setManualOpen`, …). `Visualizer` and `CodeViewer` are purely reactive
  to store state.
* **`softPlcEngine.ts`** is the only writer of `outputs`, `internal`,
  `gateAngle`, and `metrics` — enforced by routing all writes through the
  single `applyScan()` action.
